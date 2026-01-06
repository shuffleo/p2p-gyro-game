// Room Management System
export class RoomManager {
  constructor() {
    this.activeRooms = new Map(); // In-memory room state
    this.loadRoomsFromStorage();
  }

  generateRoomCode(minLength = 8, maxLength = 24) {
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }

  validateRoomCode(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }
    
    const alphanumericRegex = /^[A-Z0-9]+$/i;
    const length = code.length;
    
    return length >= 8 && length <= 24 && alphanumericRegex.test(code);
  }

  canJoinRoom(roomCode, deviceInfo) {
    if (!this.validateRoomCode(roomCode)) {
      return {
        allowed: false,
        reason: 'Invalid room code format. Must be 8-24 alphanumeric characters.'
      };
    }

    const room = this.activeRooms.get(roomCode);
    
    // Check if room exists and is full
    if (room) {
      if (room.devices.length >= 3) {
        return {
          allowed: false,
          reason: 'Room is full. Maximum 3 devices allowed.'
        };
      }
      
      // Check if mobile device already exists
      if (deviceInfo.isMobile) {
        const hasMobile = room.devices.some(d => d.isMobile);
        if (hasMobile) {
          return {
            allowed: false,
            reason: 'Room already has a mobile device. Maximum 1 mobile device allowed.'
          };
        }
      }
    }

    return { allowed: true };
  }

  joinRoom(roomCode, deviceInfo) {
    const canJoin = this.canJoinRoom(roomCode, deviceInfo);
    if (!canJoin.allowed) {
      throw new Error(canJoin.reason);
    }

    if (!this.activeRooms.has(roomCode)) {
      this.activeRooms.set(roomCode, {
        code: roomCode,
        devices: [],
        createdAt: Date.now(),
      });
    }

    const room = this.activeRooms.get(roomCode);
    const device = {
      id: deviceInfo.id || this.generateDeviceId(),
      type: deviceInfo.isMobile ? 'Mobile' : 'Desktop',
      isMobile: deviceInfo.isMobile,
      joinedAt: Date.now(),
    };

    room.devices.push(device);
    this.saveRoomsToStorage();
    
    return { room, device };
  }

  leaveRoom(roomCode, deviceId) {
    const room = this.activeRooms.get(roomCode);
    if (!room) {
      return;
    }

    room.devices = room.devices.filter(d => d.id !== deviceId);
    
    // Clean up empty rooms
    if (room.devices.length === 0) {
      this.activeRooms.delete(roomCode);
    }
    
    this.saveRoomsToStorage();
  }

  getRoom(roomCode) {
    return this.activeRooms.get(roomCode);
  }

  generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // localStorage persistence
  saveRoomCode(code) {
    try {
      localStorage.setItem('lastRoomCode', code);
    } catch (e) {
      console.warn('Failed to save room code to localStorage:', e);
    }
  }

  getStoredRoomCode() {
    try {
      return localStorage.getItem('lastRoomCode') || null;
    } catch (e) {
      console.warn('Failed to read room code from localStorage:', e);
      return null;
    }
  }

  clearRoomCode() {
    try {
      localStorage.removeItem('lastRoomCode');
    } catch (e) {
      console.warn('Failed to clear room code from localStorage:', e);
    }
  }

  saveRoomsToStorage() {
    try {
      const roomsData = Array.from(this.activeRooms.entries()).map(([code, room]) => ({
        code,
        devices: room.devices,
        createdAt: room.createdAt,
      }));
      localStorage.setItem('activeRooms', JSON.stringify(roomsData));
    } catch (e) {
      console.warn('Failed to save rooms to localStorage:', e);
    }
  }

  loadRoomsFromStorage() {
    try {
      const roomsData = localStorage.getItem('activeRooms');
      if (roomsData) {
        const rooms = JSON.parse(roomsData);
        rooms.forEach(({ code, devices, createdAt }) => {
          this.activeRooms.set(code, {
            code,
            devices,
            createdAt,
          });
        });
      }
    } catch (e) {
      console.warn('Failed to load rooms from localStorage:', e);
    }
  }
}

