// Device Detection and Capabilities
export class DeviceDetector {
  constructor() {
    this.deviceInfo = this.detectDevice();
  }

  detectDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    
    // More accurate mobile detection using screen size and touch capability
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;
    const isMobileDevice = isMobile || (hasTouchScreen && isSmallScreen);

    return {
      isMobile: isMobileDevice,
      hasGyroscope: this.hasGyroscope(),
      userAgent: userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      id: this.generateDeviceId(),
    };
  }

  hasGyroscope() {
    // Check if DeviceOrientationEvent is supported
    return 'DeviceOrientationEvent' in window;
  }

  getDeviceInfo() {
    return this.deviceInfo;
  }

  isMobile() {
    return this.deviceInfo.isMobile;
  }

  canActAsController() {
    return this.deviceInfo.isMobile && this.deviceInfo.hasGyroscope;
  }

  generateDeviceId() {
    // Try to get a persistent ID from localStorage, or generate one
    try {
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    } catch (e) {
      // Fallback if localStorage is not available
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
}

