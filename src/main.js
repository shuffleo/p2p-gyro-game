// Main application entry point
import './styles.css';
import { UIManager } from './ui-manager.js';
import { RoomManager } from './room-manager.js';
import { DeviceDetector } from './device-detector.js';

class App {
  constructor() {
    this.uiManager = new UIManager();
    this.roomManager = new RoomManager();
    this.deviceDetector = new DeviceDetector();
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadStoredRoomCode();
  }

  setupEventListeners() {
    // Landing screen buttons
    const generateBtn = document.getElementById('generate-code-btn');
    const joinBtn = document.getElementById('join-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');

    generateBtn?.addEventListener('click', () => {
      const code = this.roomManager.generateRoomCode(8, 24);
      roomCodeInput.value = code;
      this.roomManager.saveRoomCode(code);
    });

    joinBtn?.addEventListener('click', () => {
      const code = roomCodeInput.value.trim();
      if (this.roomManager.validateRoomCode(code)) {
        this.joinRoom(code);
      } else {
        alert('Invalid room code. Please enter 8-24 alphanumeric characters.');
      }
    });

    // Room code input - allow Enter key
    roomCodeInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        joinBtn.click();
      }
    });

    // Waiting room buttons
    const copyCodeBtn = document.getElementById('copy-code-btn');
    copyCodeBtn?.addEventListener('click', () => {
      const code = document.getElementById('room-code-display').value;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = copyCodeBtn.textContent;
        copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyCodeBtn.textContent = originalText;
        }, 2000);
      });
    });

    const exitRoomBtn = document.getElementById('exit-room-btn');
    exitRoomBtn?.addEventListener('click', () => {
      this.exitRoom();
    });

    // Game screen buttons
    const exitGameBtn = document.getElementById('exit-game-btn');
    exitGameBtn?.addEventListener('click', () => {
      this.exitRoom();
    });

    // Mobile game screen buttons
    const requestPermissionBtn = document.getElementById('request-permission-btn');
    requestPermissionBtn?.addEventListener('click', () => {
      // Will be implemented in Phase 4
      console.log('Request permission clicked');
    });

    const stopSendingBtn = document.getElementById('stop-sending-btn');
    stopSendingBtn?.addEventListener('click', () => {
      // Will be implemented in Phase 4
      console.log('Stop sending clicked');
    });

    const exitMobileBtn = document.getElementById('exit-mobile-btn');
    exitMobileBtn?.addEventListener('click', () => {
      this.exitRoom();
    });
  }

  loadStoredRoomCode() {
    const storedCode = this.roomManager.getStoredRoomCode();
    if (storedCode) {
      const input = document.getElementById('room-code-input');
      if (input) {
        input.value = storedCode;
      }
    }
  }

  async joinRoom(code) {
    const deviceInfo = this.deviceDetector.getDeviceInfo();
    
    // Check if room can be joined
    const canJoin = this.roomManager.canJoinRoom(code, deviceInfo);
    
    if (!canJoin.allowed) {
      const errorMsg = `Cannot join room: ${canJoin.reason}\n\nError details (copy for debugging):\n${JSON.stringify(canJoin, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
      return;
    }

    try {
      // Join the room
      const { room, device } = this.roomManager.joinRoom(code, deviceInfo);
      
      // Save room code
      this.roomManager.saveRoomCode(code);
      
      // Update UI with connected devices
      this.uiManager.updateDevicesList(room.devices);
      
      // Show appropriate screen based on device type
      if (deviceInfo.isMobile) {
        this.uiManager.showMobileGameScreen(code);
      } else {
        this.uiManager.showWaitingRoom(code);
        // Will transition to game screen when connections are established (Phase 3)
      }
    } catch (error) {
      const errorMsg = `Failed to join room: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
    }
  }

  exitRoom() {
    // Get current room code if available
    const roomCode = this.roomManager.getStoredRoomCode();
    const deviceInfo = this.deviceDetector.getDeviceInfo();
    
    if (roomCode) {
      // Leave the room (will get device ID from room manager in Phase 3)
      // For now, just clear the stored code
      this.roomManager.clearRoomCode();
    }
    
    // Close WebRTC connections (Phase 3)
    // Stop gyroscope (Phase 4)
    // Clean up visualization (Phase 5)
    
    this.uiManager.showLandingScreen();
  }

  showErrorWithCopy(message) {
    const errorDetails = `Error Details:\n${message}\n\nClick OK, then copy this message for debugging.`;
    alert(errorDetails);
    
    // Create a temporary textarea to copy error details
    const textarea = document.createElement('textarea');
    textarea.value = message;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    document.body.removeChild(textarea);
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new App();
  });
} else {
  new App();
}

