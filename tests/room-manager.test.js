// Room Manager Tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RoomManager } from '../src/room-manager.js';

describe('RoomManager', () => {
  let roomManager;
  let originalLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      data: {},
      getItem: (key) => global.localStorage.data[key] || null,
      setItem: (key, value) => { global.localStorage.data[key] = value; },
      removeItem: (key) => { delete global.localStorage.data[key]; },
      clear: () => { global.localStorage.data = {}; }
    };
    
    roomManager = new RoomManager();
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  describe('generateRoomCode', () => {
    it('should generate a room code within specified length range', () => {
      const code = roomManager.generateRoomCode(8, 24);
      expect(code.length).toBeGreaterThanOrEqual(8);
      expect(code.length).toBeLessThanOrEqual(24);
    });

    it('should generate alphanumeric codes', () => {
      const code = roomManager.generateRoomCode(10, 10);
      expect(code).toMatch(/^[A-Z0-9]+$/i);
    });

    it('should generate different codes on subsequent calls', () => {
      const code1 = roomManager.generateRoomCode(8, 8);
      const code2 = roomManager.generateRoomCode(8, 8);
      // Very unlikely to be the same (1/36^8 chance)
      expect(code1).not.toBe(code2);
    });
  });

  describe('validateRoomCode', () => {
    it('should validate correct room codes', () => {
      expect(roomManager.validateRoomCode('ABC12345')).toBe(true);
      expect(roomManager.validateRoomCode('12345678')).toBe(true);
      expect(roomManager.validateRoomCode('ABCDEFGHIJKLMNOPQRSTUVWX')).toBe(true); // 24 chars
    });

    it('should reject codes that are too short', () => {
      expect(roomManager.validateRoomCode('ABC1234')).toBe(false); // 7 chars
    });

    it('should reject codes that are too long', () => {
      expect(roomManager.validateRoomCode('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(false); // 26 chars
    });

    it('should reject codes with special characters', () => {
      expect(roomManager.validateRoomCode('ABC-1234')).toBe(false);
      expect(roomManager.validateRoomCode('ABC 1234')).toBe(false);
      expect(roomManager.validateRoomCode('ABC@1234')).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(roomManager.validateRoomCode(null)).toBe(false);
      expect(roomManager.validateRoomCode(undefined)).toBe(false);
      expect(roomManager.validateRoomCode('')).toBe(false);
    });
  });

  describe('canJoinRoom', () => {
    it('should allow joining empty room', () => {
      const result = roomManager.canJoinRoom('TEST1234', { isMobile: false });
      expect(result.allowed).toBe(true);
    });

    it('should reject invalid room codes', () => {
      const result = roomManager.canJoinRoom('SHORT', { isMobile: false });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Invalid room code format');
    });

    it('should reject when room is full (3 devices)', () => {
      const code = 'FULLROOM';
      const deviceInfo = { isMobile: false, id: 'device1' };
      
      // Add 3 devices
      roomManager.joinRoom(code, deviceInfo);
      roomManager.joinRoom(code, { ...deviceInfo, id: 'device2' });
      roomManager.joinRoom(code, { ...deviceInfo, id: 'device3' });
      
      const result = roomManager.canJoinRoom(code, { ...deviceInfo, id: 'device4' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Room is full');
    });

    it('should reject second mobile device', () => {
      const code = 'MOBILEROOM';
      const mobileDevice = { isMobile: true, id: 'mobile1' };
      const desktopDevice = { isMobile: false, id: 'desktop1' };
      
      roomManager.joinRoom(code, mobileDevice);
      
      const result = roomManager.canJoinRoom(code, { ...mobileDevice, id: 'mobile2' });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('already has a mobile device');
    });

    it('should allow desktop device when mobile exists', () => {
      const code = 'MIXEDROOM';
      const mobileDevice = { isMobile: true, id: 'mobile1' };
      const desktopDevice = { isMobile: false, id: 'desktop1' };
      
      roomManager.joinRoom(code, mobileDevice);
      
      const result = roomManager.canJoinRoom(code, desktopDevice);
      expect(result.allowed).toBe(true);
    });
  });

  describe('joinRoom', () => {
    it('should create new room if it does not exist', () => {
      const code = 'NEWROOM1'; // 8 characters
      const deviceInfo = { isMobile: false, id: 'device1' };
      
      const { room, device } = roomManager.joinRoom(code, deviceInfo);
      
      expect(room).toBeDefined();
      expect(room.code).toBe(code);
      expect(room.devices).toHaveLength(1);
      expect(device.id).toBe('device1');
    });

    it('should add device to existing room', () => {
      const code = 'EXISTING';
      const device1 = { isMobile: false, id: 'device1' };
      const device2 = { isMobile: false, id: 'device2' };
      
      roomManager.joinRoom(code, device1);
      const { room } = roomManager.joinRoom(code, device2);
      
      expect(room.devices).toHaveLength(2);
    });

    it('should throw error if room constraints violated', () => {
      const code = 'FULLROOM';
      const deviceInfo = { isMobile: false, id: 'device1' };
      
      // Fill room
      roomManager.joinRoom(code, deviceInfo);
      roomManager.joinRoom(code, { ...deviceInfo, id: 'device2' });
      roomManager.joinRoom(code, { ...deviceInfo, id: 'device3' });
      
      expect(() => {
        roomManager.joinRoom(code, { ...deviceInfo, id: 'device4' });
      }).toThrow('Room is full');
    });

    it('should generate device ID if not provided', () => {
      const code = 'AUTOROOM';
      const deviceInfo = { isMobile: false };
      
      const { device } = roomManager.joinRoom(code, deviceInfo);
      expect(device.id).toBeDefined();
      expect(device.id).toContain('device_');
    });
  });

  describe('leaveRoom', () => {
    it('should remove device from room', () => {
      const code = 'LEAVEROOM';
      const device1 = { isMobile: false, id: 'device1' };
      const device2 = { isMobile: false, id: 'device2' };
      
      roomManager.joinRoom(code, device1);
      roomManager.joinRoom(code, device2);
      
      roomManager.leaveRoom(code, 'device1');
      
      const room = roomManager.getRoom(code);
      expect(room.devices).toHaveLength(1);
      expect(room.devices[0].id).toBe('device2');
    });

    it('should delete room when last device leaves', () => {
      const code = 'EMPTYROOM';
      const deviceInfo = { isMobile: false, id: 'device1' };
      
      roomManager.joinRoom(code, deviceInfo);
      roomManager.leaveRoom(code, 'device1');
      
      const room = roomManager.getRoom(code);
      expect(room).toBeUndefined();
    });

    it('should handle leaving non-existent room gracefully', () => {
      expect(() => {
        roomManager.leaveRoom('NONEXISTENT', 'device1');
      }).not.toThrow();
    });
  });

  describe('localStorage persistence', () => {
    it('should save and retrieve room code', () => {
      const code = 'SAVEDCODE';
      roomManager.saveRoomCode(code);
      
      const retrieved = roomManager.getStoredRoomCode();
      expect(retrieved).toBe(code);
    });

    it('should clear room code', () => {
      roomManager.saveRoomCode('TESTCODE');
      roomManager.clearRoomCode();
      
      const retrieved = roomManager.getStoredRoomCode();
      expect(retrieved).toBeNull();
    });

    it('should persist rooms to localStorage', () => {
      const code = 'PERSISTROOM';
      const deviceInfo = { isMobile: false, id: 'device1' };
      
      roomManager.joinRoom(code, deviceInfo);
      
      // Create new instance to test loading
      const newManager = new RoomManager();
      const room = newManager.getRoom(code);
      
      expect(room).toBeDefined();
      expect(room.devices).toHaveLength(1);
    });
  });
});

