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
      console.error('❌ DeviceOrientationEvent is not supported in this browser');
      throw new Error('DeviceOrientationEvent is not supported in this browser');
    }

    console.log('🔄 Requesting DeviceOrientationEvent permission...');
    
    // First, check permission status using navigator.permissions.query() if available
    if (navigator.permissions && navigator.permissions.query) {
      try {
        console.log('🔍 Checking permission status via navigator.permissions.query()...');
        // Note: 'device-orientation' might not be supported in all browsers
        // Some browsers use 'accelerometer', 'gyroscope', or 'magnetometer'
        const permissionStatus = await navigator.permissions.query({ name: 'accelerometer' }).catch(() => null) ||
                                 await navigator.permissions.query({ name: 'gyroscope' }).catch(() => null) ||
                                 await navigator.permissions.query({ name: 'device-orientation' }).catch(() => null);
        
        if (permissionStatus) {
          console.log('📊 Permission status:', permissionStatus.state);
          if (permissionStatus.state === 'granted') {
            this.permissionGranted = true;
            console.log('✅ Permission already granted');
            return true;
          } else if (permissionStatus.state === 'denied') {
            this.permissionGranted = false;
            console.error('❌ Permission denied');
            return false;
          }
          // If 'prompt', continue to request permission
        }
      } catch (error) {
        console.log('⚠️ navigator.permissions.query() not supported or failed:', error.message);
        // Continue with DeviceOrientationEvent.requestPermission()
      }
    }

    console.log('DeviceOrientationEvent.requestPermission available:', typeof DeviceOrientationEvent.requestPermission === 'function');

    // iOS 13+ requires user gesture to request permission
    // Try to request permission using DeviceOrientationEvent.requestPermission()
    try {
      // Request permission (works in some browsers, especially iOS)
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        console.log('📱 iOS detected - requesting permission via DeviceOrientationEvent.requestPermission()');
        const permission = await DeviceOrientationEvent.requestPermission();
        console.log('📱 Permission result:', permission);
        if (permission === 'granted') {
          this.permissionGranted = true;
          console.log('✅ DeviceOrientationEvent permission granted');
          return true;
        } else {
          this.permissionGranted = false;
          console.error('❌ DeviceOrientationEvent permission denied:', permission);
          return false;
        }
      } else {
        // Permission not required (Chrome, most browsers)
        // Check if we can access orientation data
        console.log('✅ Permission not required (Chrome/Android)');
        this.permissionGranted = true;
        return true;
      }
    } catch (error) {
      console.error('❌ Permission request failed:', error);
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
