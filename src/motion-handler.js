// Motion Handler - Detects speed and acceleration from device motion
import { throttle } from './utils.js';

export class MotionHandler {
  constructor() {
    this.isListening = false;
    this.callback = null;
    this.deviceId = null;
    this.lastAcceleration = { x: 0, y: 0, z: 0 };
    this.lastVelocity = { x: 0, y: 0, z: 0 };
    this.lastTimestamp = null;
    
    // Throttle data transmission to ~60fps (16ms interval)
    this.throttledSend = throttle((data) => {
      if (this.callback) {
        this.callback(data);
      }
    }, 16);
  }

  async requestPermission() {
    console.log('🔄 Requesting DeviceMotionEvent permission...');
    console.log('DeviceMotionEvent available:', typeof DeviceMotionEvent !== 'undefined');
    
    // First, check permission status using navigator.permissions.query() if available
    if (navigator.permissions && navigator.permissions.query) {
      try {
        console.log('🔍 Checking permission status via navigator.permissions.query()...');
        // Try different permission names that might be supported
        const permissionStatus = await navigator.permissions.query({ name: 'accelerometer' }).catch(() => null) ||
                                 await navigator.permissions.query({ name: 'gyroscope' }).catch(() => null) ||
                                 await navigator.permissions.query({ name: 'magnetometer' }).catch(() => null) ||
                                 await navigator.permissions.query({ name: 'device-motion' }).catch(() => null);
        
        if (permissionStatus) {
          console.log('📊 Permission status:', permissionStatus.state);
          if (permissionStatus.state === 'granted') {
            console.log('✅ Permission already granted');
            return true;
          } else if (permissionStatus.state === 'denied') {
            console.error('❌ Permission denied');
            return false;
          }
          // If 'prompt', continue to request permission
        }
      } catch (error) {
        console.log('⚠️ navigator.permissions.query() not supported or failed:', error.message);
        // Continue with DeviceMotionEvent.requestPermission()
      }
    }
    
    console.log('DeviceMotionEvent.requestPermission available:', typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function');
    
    // DeviceMotionEvent permission (iOS 13+)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        console.log('📱 iOS detected - requesting permission via DeviceMotionEvent.requestPermission()');
        const permission = await DeviceMotionEvent.requestPermission();
        console.log('📱 Permission result:', permission);
        if (permission === 'granted') {
          console.log('✅ DeviceMotionEvent permission granted');
          return true;
        } else {
          console.error('❌ DeviceMotionEvent permission denied:', permission);
          return false;
        }
      } catch (error) {
        console.error('❌ Motion permission request failed:', error);
        return false;
      }
    }
    // Permission not required in most browsers
    console.log('✅ Permission not required (Chrome/Android)');
    return true;
  }

  startListening(callback, deviceId) {
    if (this.isListening) {
      console.warn('Motion handler is already listening');
      return;
    }

    this.callback = callback;
    this.deviceId = deviceId;
    this.isListening = true;
    this.lastTimestamp = Date.now();

    // Listen to devicemotion events
    window.addEventListener('devicemotion', this.handleMotion.bind(this), true);
    
    console.log('✅ Motion event listener added');
    console.log('📡 Waiting for devicemotion events...');
  }

  stopListening() {
    if (!this.isListening) {
      return;
    }

    window.removeEventListener('devicemotion', this.handleMotion.bind(this), true);
    
    this.isListening = false;
    this.callback = null;
    this.lastAcceleration = { x: 0, y: 0, z: 0 };
    this.lastVelocity = { x: 0, y: 0, z: 0 };
    this.lastTimestamp = null;
    
    console.log('Motion listening stopped');
  }

  handleMotion(event) {
    if (!this.isListening) {
      return;
    }

    const now = Date.now();
    const deltaTime = (now - this.lastTimestamp) / 1000; // Convert to seconds
    this.lastTimestamp = now;

    // Get acceleration (with gravity removed if available)
    const acceleration = event.accelerationIncludingGravity || event.acceleration || { x: 0, y: 0, z: 0 };
    
    // Check if acceleration data is valid
    if (!acceleration || (acceleration.x === null && acceleration.y === null && acceleration.z === null)) {
      console.warn('⚠️ Received null acceleration data');
      return;
    }
    
    // Log first few events to verify they're firing
    if (!this._eventCount) {
      this._eventCount = 0;
    }
    this._eventCount++;
    if (this._eventCount <= 3) {
      console.log(`🏃 Motion event #${this._eventCount}:`, { acceleration, rotationRate: event.rotationRate });
    }
    
    // Calculate velocity (integrate acceleration)
    const velocity = {
      x: this.lastVelocity.x + acceleration.x * deltaTime,
      y: this.lastVelocity.y + acceleration.y * deltaTime,
      z: this.lastVelocity.z + acceleration.z * deltaTime,
    };

    // Calculate speed (magnitude of velocity)
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);

    // Calculate rotation rate if available
    const rotationRate = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 };

    // Store current values for next calculation
    this.lastAcceleration = acceleration;
    this.lastVelocity = velocity;

    // Format data for transmission
    const data = {
      type: 'motion_data',
      timestamp: now,
      acceleration: {
        x: acceleration.x || 0,
        y: acceleration.y || 0,
        z: acceleration.z || 0,
      },
      velocity: {
        x: velocity.x,
        y: velocity.y,
        z: velocity.z,
      },
      speed: speed,
      rotationRate: {
        alpha: rotationRate.alpha || 0,
        beta: rotationRate.beta || 0,
        gamma: rotationRate.gamma || 0,
      },
      deviceId: this.deviceId,
    };

    // Throttle transmission
    this.throttledSend(data);
  }

  getListeningState() {
    return this.isListening;
  }
}

