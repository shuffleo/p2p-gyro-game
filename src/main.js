// Main application entry point
import './styles.css';
import { UIManager } from './ui-manager.js';
import { RoomManager } from './room-manager.js';
import { DeviceDetector } from './device-detector.js';
import { WebRTCManager } from './webrtc-manager.js';
import { GyroscopeHandler } from './gyroscope-handler.js';
import { Visualization } from './visualization.js';
import { showErrorWithCopy as showError } from './utils.js';

class App {
  constructor() {
    this.uiManager = new UIManager();
    this.roomManager = new RoomManager();
    this.deviceDetector = new DeviceDetector();
    this.webrtcManager = null;
    this.gyroscopeHandler = null;
    this.visualization = null;
    this.currentRoomCode = null;
    this.currentDeviceId = null;
    this.peerDiscoveryInterval = null;
    
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

    // Peer connection button
    const connectPeerBtn = document.getElementById('connect-peer-btn');
    const peerIdInput = document.getElementById('peer-id-input');
    
    connectPeerBtn?.addEventListener('click', () => {
      const peerId = peerIdInput?.value.trim();
      if (peerId) {
        this.connectToKnownPeer(peerId);
        peerIdInput.value = '';
      }
    });

    peerIdInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        connectPeerBtn.click();
      }
    });

    // Game screen buttons
    const exitGameBtn = document.getElementById('exit-game-btn');
    exitGameBtn?.addEventListener('click', () => {
      this.exitRoom();
    });

    // Mobile game screen buttons
    const requestPermissionBtn = document.getElementById('request-permission-btn');
    requestPermissionBtn?.addEventListener('click', async () => {
      await this.requestGyroscopePermission();
    });

    const stopSendingBtn = document.getElementById('stop-sending-btn');
    stopSendingBtn?.addEventListener('click', () => {
      this.stopGyroscope();
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
      
      // Save room code and device ID
      this.currentRoomCode = code;
      this.currentDeviceId = device.id;
      this.roomManager.saveRoomCode(code);
      
      // Update UI with connected devices
      this.uiManager.updateDevicesList(room.devices);
      
      // Initialize WebRTC
      await this.initializeWebRTC(code, device.id);
      
      // Show appropriate screen based on device type
      if (deviceInfo.isMobile) {
        this.uiManager.showMobileGameScreen(code);
        this.uiManager.updateMobileConnectionStatus('connecting', 'Connecting to peers...');
        // Initialize gyroscope handler for mobile
        this.initializeGyroscope(device.id);
      } else {
        this.uiManager.showWaitingRoom(code);
        // Will transition to game screen when connections are established
      }
    } catch (error) {
      const errorMsg = `Failed to join room: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
    }
  }

  async initializeWebRTC(roomCode, deviceId) {
    try {
      // Create WebRTC manager
      this.webrtcManager = new WebRTCManager();
      
      // Set up connection state callbacks
      this.webrtcManager.onConnectionStateChange((status, message) => {
        this.handleConnectionStateChange(status, message);
      });
      
      // Set up data reception callback
      this.webrtcManager.onDataReceived((data, peerId) => {
        this.handleDataReceived(data, peerId);
      });
      
      // Set up connection quality callback
      this.webrtcManager.onConnectionQualityChange((peerId, quality) => {
        this.handleConnectionQualityChange(peerId, quality);
      });
      
      // Initialize peer
      const peerId = await this.webrtcManager.initializePeer(roomCode, deviceId);
      
      // Display peer ID in UI
      const peerIdDisplay = document.getElementById('your-peer-id');
      if (peerIdDisplay) {
        peerIdDisplay.textContent = peerId;
      }
      
      // Start peer discovery
      this.startPeerDiscovery(roomCode);
      
      // Attempt to discover peers from room devices
      const room = this.roomManager.getRoom(roomCode);
      if (room && room.devices) {
        // Wait a bit for peer to be fully initialized
        setTimeout(() => {
          this.webrtcManager.attemptPeerDiscovery(room.devices);
        }, 1000);
      }
      
      // Update connection count periodically
      this.startConnectionMonitoring();
      
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      const errorMsg = `WebRTC initialization failed: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
      throw error;
    }
  }

  startPeerDiscovery(roomCode) {
    // Automatic peer discovery is now handled by WebRTCManager
    // It uses a ping/pong mechanism to discover peers in the same room
    // Update connection status
    this.handleConnectionStateChange('connecting', 'Discovering peers automatically...');
    
    // Try to connect to known peers from room manager
    const room = this.roomManager.getRoom(roomCode);
    if (room && room.devices) {
      // Attempt connections to other devices in the room
      // Note: We need their device IDs to construct peer IDs
      // For now, automatic discovery relies on ping/pong mechanism
      // Manual connection is still available as fallback
    }
  }
  
  handleConnectionQualityChange(peerId, quality) {
    // Update UI with connection quality
    this.updateConnectionQualityUI(peerId, quality);
  }
  
  updateConnectionQualityUI(peerId, quality) {
    const qualityDisplay = document.getElementById('connection-quality-display');
    const gameQualityDisplay = document.getElementById('game-connection-quality');
    
    if (!qualityDisplay && !gameQualityDisplay) {
      return;
    }
    
    const qualityText = quality.quality || 'unknown';
    const qualityColor = {
      'excellent': 'text-green-400',
      'good': 'text-green-500',
      'fair': 'text-yellow-500',
      'poor': 'text-red-500',
      'unknown': 'text-gray-500'
    }[qualityText] || 'text-gray-500';
    
    const qualityIcon = {
      'excellent': '🟢',
      'good': '🟢',
      'fair': '🟡',
      'poor': '🔴',
      'unknown': '⚪'
    }[qualityText] || '⚪';
    
    const rttText = quality.rtt ? ` (${Math.round(quality.rtt)}ms)` : '';
    const qualityInfo = `${qualityIcon} ${peerId.slice(-8)}: ${qualityText}${rttText}`;
    
    if (qualityDisplay) {
      // Update waiting room quality display
      let existingEntry = qualityDisplay.querySelector(`[data-peer-id="${peerId}"]`);
      if (!existingEntry) {
        existingEntry = document.createElement('p');
        existingEntry.className = `text-xs ${qualityColor}`;
        existingEntry.setAttribute('data-peer-id', peerId);
        qualityDisplay.appendChild(existingEntry);
      }
      existingEntry.textContent = qualityInfo;
      existingEntry.className = `text-xs ${qualityColor}`;
    }
    
    if (gameQualityDisplay) {
      // Update game screen quality display
      let existingEntry = gameQualityDisplay.querySelector(`[data-peer-id="${peerId}"]`);
      if (!existingEntry) {
        existingEntry = document.createElement('div');
        existingEntry.className = `text-xs ${qualityColor}`;
        existingEntry.setAttribute('data-peer-id', peerId);
        gameQualityDisplay.appendChild(existingEntry);
      }
      existingEntry.textContent = qualityInfo;
      existingEntry.className = `text-xs ${qualityColor}`;
    }
  }

  handleConnectionStateChange(status, message) {
    // Update UI based on connection status
    if (this.deviceDetector.isMobile()) {
      this.uiManager.updateMobileConnectionStatus(status, message);
    } else {
      this.uiManager.updateConnectionStatus(status, message);
      this.uiManager.updateGameConnectionStatus(status, message);
      
      // Update connection count
      this.updateConnectionCount();
      
      // If connected and we have peers, show game screen
      if (status === 'connected' && this.webrtcManager && this.webrtcManager.getConnectionCount() > 0) {
        // Transition to game screen if we're in waiting room
        const waitingRoom = document.getElementById('waiting-room-screen');
        if (waitingRoom && !waitingRoom.classList.contains('hidden')) {
          this.uiManager.showDesktopGameScreen(this.currentRoomCode);
          // Initialize visualization
          this.initializeVisualization();
        }
      }
    }
  }

  startConnectionMonitoring() {
    // Update connection count every second
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }
    
    this.connectionMonitorInterval = setInterval(() => {
      this.updateConnectionCount();
    }, 1000);
  }

  updateConnectionCount() {
    if (this.webrtcManager) {
      const count = this.webrtcManager.getConnectionCount();
      const connectedCountEl = document.getElementById('connected-count');
      if (connectedCountEl) {
        connectedCountEl.textContent = count;
      }
    }
  }

  async initializeGyroscope(deviceId) {
    try {
      this.gyroscopeHandler = new GyroscopeHandler();
      
      // Try to auto-request permission
      const granted = await this.gyroscopeHandler.requestPermission();
      
      if (granted) {
        // Permission granted, start listening
        this.startGyroscope(deviceId);
        this.uiManager.showPermissionGranted();
      } else {
        // Permission denied, show manual request button
        const permissionRequest = document.getElementById('permission-request');
        if (permissionRequest) {
          permissionRequest.classList.remove('hidden');
        }
      }
    } catch (error) {
      console.error('Failed to initialize gyroscope:', error);
      const errorMsg = `Failed to initialize gyroscope: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
    }
  }

  async requestGyroscopePermission() {
    if (!this.gyroscopeHandler) {
      this.gyroscopeHandler = new GyroscopeHandler();
    }

    try {
      const granted = await this.gyroscopeHandler.requestPermission();
      
      if (granted) {
        this.uiManager.showPermissionGranted();
        this.startGyroscope(this.currentDeviceId);
      } else {
        const errorMsg = 'Gyroscope permission denied. Please enable device orientation in your browser settings.';
        this.showErrorWithCopy(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Failed to request permission: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
    }
  }

  startGyroscope(deviceId) {
    if (!this.gyroscopeHandler) {
      console.error('Gyroscope handler not initialized');
      return;
    }

    if (!this.webrtcManager) {
      console.error('WebRTC manager not initialized');
      return;
    }

    try {
      // Start listening to gyroscope data
      this.gyroscopeHandler.startListening((data) => {
        // Send data via WebRTC
        if (this.webrtcManager && this.webrtcManager.isConnected()) {
          this.webrtcManager.sendData(data);
        }
      }, deviceId);

      this.uiManager.updateMobileConnectionStatus('connected', 'Sending gyroscope data...');
    } catch (error) {
      console.error('Failed to start gyroscope:', error);
      const errorMsg = `Failed to start gyroscope: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
    }
  }

  stopGyroscope() {
    if (this.gyroscopeHandler) {
      this.gyroscopeHandler.stopListening();
      this.uiManager.updateMobileConnectionStatus('disconnected', 'Stopped sending data');
    }
  }

  handleDataReceived(data, peerId) {
    // Handle received data
    console.log('Data received from', peerId, ':', data);
    
    // Handle gyroscope data for visualization
    if (data.type === 'gyro_data') {
      // Update visualization with gyroscope data
      if (this.visualization) {
        this.visualization.updateRotation(data.alpha, data.beta, data.gamma);
      }
    }
  }

  async connectToKnownPeer(peerId) {
    if (!this.webrtcManager) {
      console.error('WebRTC manager not initialized');
      return;
    }

    try {
      await this.webrtcManager.connectToPeer(peerId);
      console.log('Connected to peer:', peerId);
    } catch (error) {
      console.error('Failed to connect to peer:', error);
      const errorMsg = `Failed to connect to peer ${peerId}: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
    }
  }

  initializeVisualization() {
    const canvasContainer = document.getElementById('game-screen-desktop');
    if (!canvasContainer) {
      console.error('Canvas container not found');
      return;
    }

    try {
      // Create visualization instance
      this.visualization = new Visualization();
      
      // Initialize scene
      this.visualization.initScene(canvasContainer);
      
      console.log('Visualization initialized');
    } catch (error) {
      console.error('Failed to initialize visualization:', error);
      const errorMsg = `Failed to initialize visualization: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
    }
  }

  exitRoom() {
    // Get current room code if available
    const roomCode = this.currentRoomCode || this.roomManager.getStoredRoomCode();
    const deviceId = this.currentDeviceId;
    
    // Close WebRTC connections
    if (this.webrtcManager) {
      this.webrtcManager.closeConnection();
      this.webrtcManager = null;
    }
    
    // Stop peer discovery
    if (this.peerDiscoveryInterval) {
      clearInterval(this.peerDiscoveryInterval);
      this.peerDiscoveryInterval = null;
    }
    
    // Stop connection monitoring
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
    
    // Leave the room
    if (roomCode && deviceId) {
      this.roomManager.leaveRoom(roomCode, deviceId);
    }
    
    // Stop gyroscope
    this.stopGyroscope();
    this.gyroscopeHandler = null;
    
    // Clear stored data
    this.roomManager.clearRoomCode();
    this.currentRoomCode = null;
    this.currentDeviceId = null;
    
    // Clean up visualization
    if (this.visualization) {
      this.visualization.dispose();
      this.visualization = null;
    }
    
    this.uiManager.showLandingScreen();
  }

  showErrorWithCopy(message, title = 'Error') {
    showError(message, title);
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

