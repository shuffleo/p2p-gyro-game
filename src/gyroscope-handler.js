// Gyroscope Handler - Device orientation data collection
import { normalizeGyroData, throttle } from './utils.js';

export class GyroscopeHandler {
  constructor() {
    this.isListening = false;
    this.callback = null;
    this.deviceId = null;
    this.lastData = null;
    this.permissionGranted = false;
    
    // Throttle data transmission to ~60fps (16ms interval)
    this.throttledSend = throttle((data) => {
      if (this.callback) {
        this.callback(data);
      }
    }, 16);
  }

  async requestPermission() {
    // Check if DeviceOrientationEvent is supported
    if (!window.DeviceOrientationEvent) {
      throw new Error('DeviceOrientationEvent is not supported in this browser');
    }

    // iOS 13+ requires user gesture to request permission
    // Try to request permission
    try {
      // Request permission (works in some browsers)
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          this.permissionGranted = true;
          return true;
        } else {
          this.permissionGranted = false;
          return false;
        }
      } else {
        // Permission not required (Chrome, most browsers)
        // Check if we can access orientation data
        this.permissionGranted = true;
        return true;
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      this.permissionGranted = false;
      return false;
    }
  }

  startListening(callback, deviceId) {
    if (this.isListening) {
      console.warn('Gyroscope is already listening');
      return;
    }

    if (!this.permissionGranted) {
      throw new Error('Permission not granted. Call requestPermission() first.');
    }

    this.callback = callback;
    this.deviceId = deviceId;
    this.isListening = true;

    // Listen to deviceorientation events
    window.addEventListener('deviceorientation', this.handleOrientation.bind(this), true);
    
    console.log('✅ Gyroscope event listener added');
    console.log('📡 Waiting for deviceorientation events...');
  }

  stopListening() {
    if (!this.isListening) {
      return;
    }

    window.removeEventListener('deviceorientation', this.handleOrientation.bind(this), true);
    
    this.isListening = false;
    this.callback = null;
    this.lastData = null;
    
    console.log('Gyroscope listening stopped');
  }

  handleOrientation(event) {
    if (!this.isListening) {
      return;
    }

    // Extract orientation data
    const { alpha, beta, gamma } = event;
    
    // Check if data is valid
    if (alpha === null && beta === null && gamma === null) {
      console.warn('⚠️ Received null orientation data');
      return;
    }
    
    // Normalize data
    const normalizedData = normalizeGyroData(alpha, beta, gamma);
    
    // Format data for transmission
    const data = this.formatDataForTransmission(normalizedData);
    
    // Store last data
    this.lastData = data;
    
    // Log first few events to verify they're firing
    if (!this._eventCount) {
      this._eventCount = 0;
    }
    this._eventCount++;
    if (this._eventCount <= 3) {
      console.log(`📱 Gyroscope event #${this._eventCount}:`, { alpha, beta, gamma });
    }
    
    // Throttle transmission to avoid overwhelming network
    this.throttledSend(data);
  }

  normalizeData(alpha, beta, gamma) {
    return normalizeGyroData(alpha, beta, gamma);
  }

  formatDataForTransmission(data) {
    return {
      type: 'gyro_data',
      timestamp: Date.now(),
      alpha: data.alpha,
      beta: data.beta,
      gamma: data.gamma,
      deviceId: this.deviceId,
    };
  }

  getLastData() {
    return this.lastData;
  }

  isPermissionGranted() {
    return this.permissionGranted;
  }

  getListeningState() {
    return this.isListening;
  }
}
