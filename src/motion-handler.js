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
    // DeviceMotionEvent permission (iOS 13+)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Motion permission request failed:', error);
        return false;
      }
    }
    // Permission not required in most browsers
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
    
    console.log('Motion listening started');
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

