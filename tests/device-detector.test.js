// Device Detector Tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeviceDetector } from '../src/device-detector.js';

describe('DeviceDetector', () => {
  let originalNavigator;
  let originalWindow;
  let originalLocalStorage;

  beforeEach(() => {
    // Save original values
    originalNavigator = global.navigator;
    originalWindow = global.window;
    originalLocalStorage = global.localStorage;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    global.window = originalWindow;
    global.localStorage = originalLocalStorage;
  });

  describe('detectDevice', () => {
    it('should detect mobile device from user agent', () => {
      global.navigator = {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        maxTouchPoints: 0
      };
      global.window = {
        innerWidth: 800,
        innerHeight: 600
      };

      const detector = new DeviceDetector();
      const info = detector.getDeviceInfo();
      
      expect(info.isMobile).toBe(true);
    });

    it('should detect desktop device', () => {
      global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        maxTouchPoints: 0
      };
      global.window = {
        innerWidth: 1920,
        innerHeight: 1080
      };

      const detector = new DeviceDetector();
      const info = detector.getDeviceInfo();
      
      expect(info.isMobile).toBe(false);
    });

    it('should detect mobile from touch capability and small screen', () => {
      global.navigator = {
        userAgent: 'Mozilla/5.0',
        maxTouchPoints: 5
      };
      global.window = {
        innerWidth: 375, // Small screen
        innerHeight: 667,
        ontouchstart: true
      };

      const detector = new DeviceDetector();
      const info = detector.getDeviceInfo();
      
      expect(info.isMobile).toBe(true);
    });
  });

  describe('hasGyroscope', () => {
    it('should detect gyroscope support', () => {
      global.window = {
        DeviceOrientationEvent: {}
      };

      const detector = new DeviceDetector();
      expect(detector.hasGyroscope()).toBe(true);
    });

    it('should return false when gyroscope not supported', () => {
      global.window = {};

      const detector = new DeviceDetector();
      expect(detector.hasGyroscope()).toBe(false);
    });
  });

  describe('generateDeviceId', () => {
    it('should generate persistent device ID', () => {
      const mockLocalStorage = {
        data: {},
        getItem: (key) => mockLocalStorage.data[key] || null,
        setItem: (key, value) => { mockLocalStorage.data[key] = value; }
      };
      global.localStorage = mockLocalStorage;

      const detector1 = new DeviceDetector();
      const id1 = detector1.getDeviceInfo().id;

      const detector2 = new DeviceDetector();
      const id2 = detector2.getDeviceInfo().id;

      expect(id1).toBe(id2);
      expect(id1).toContain('device_');
    });

    it('should generate new ID if localStorage fails', () => {
      const mockLocalStorage = {
        getItem: () => { throw new Error('Storage error'); },
        setItem: () => { throw new Error('Storage error'); }
      };
      global.localStorage = mockLocalStorage;

      const detector = new DeviceDetector();
      const id = detector.getDeviceInfo().id;

      expect(id).toBeDefined();
      expect(id).toContain('device_');
    });
  });

  describe('isMobile', () => {
    it('should return mobile status', () => {
      global.navigator = {
        userAgent: 'iPhone',
        maxTouchPoints: 0
      };
      global.window = {
        innerWidth: 375,
        innerHeight: 667
      };

      const detector = new DeviceDetector();
      expect(detector.isMobile()).toBe(true);
    });
  });

  describe('canActAsController', () => {
    it('should return true for mobile with gyroscope', () => {
      global.navigator = {
        userAgent: 'iPhone',
        maxTouchPoints: 0
      };
      global.window = {
        innerWidth: 375,
        innerHeight: 667,
        DeviceOrientationEvent: {}
      };

      const detector = new DeviceDetector();
      expect(detector.canActAsController()).toBe(true);
    });

    it('should return false for desktop', () => {
      global.navigator = {
        userAgent: 'Windows',
        maxTouchPoints: 0
      };
      global.window = {
        innerWidth: 1920,
        innerHeight: 1080,
        DeviceOrientationEvent: {}
      };

      const detector = new DeviceDetector();
      expect(detector.canActAsController()).toBe(false);
    });
  });
});

