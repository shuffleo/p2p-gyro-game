// Main application entry point
import './styles.css';
import { UIManager } from './ui-manager.js';
import { RoomManager } from './room-manager.js';
import { DeviceDetector } from './device-detector.js';
import { WebRTCManager } from './webrtc-manager.js';
import { GyroscopeHandler } from './gyroscope-handler.js';
import { Visualization } from './visualization.js';
import { QRManager } from './qr-manager.js';
import { showErrorWithCopy as showError } from './utils.js';

class App {
  constructor() {
    this.uiManager = new UIManager();
    this.roomManager = new RoomManager();
    this.deviceDetector = new DeviceDetector();
    this.qrManager = new QRManager();
    this.webrtcManager = null;
    this.gyroscopeHandler = null;
    this.visualization = null;
    this.mobileVisualization = null;
    this.waitingRoomVisualization = null;
    this.currentDeviceId = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Start button - initialize WebRTC and get Peer ID
    const startBtn = document.getElementById('start-btn');
    startBtn?.addEventListener('click', async () => {
      await this.start();
    });

    // Copy Peer ID button
    const copyPeerIdBtn = document.getElementById('copy-peer-id-btn');
    copyPeerIdBtn?.addEventListener('click', () => {
      const peerId = document.getElementById('peer-id-display')?.value;
      if (peerId) {
        navigator.clipboard.writeText(peerId).then(() => {
          const originalText = copyPeerIdBtn.textContent;
          copyPeerIdBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyPeerIdBtn.textContent = originalText;
          }, 2000);
        });
      }
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

    // QR Code scanning
    const scanQrBtn = document.getElementById('scan-qr-btn');
    const qrScannerContainer = document.getElementById('qr-scanner-container');
    const qrVideo = document.getElementById('qr-video');
    const cancelScanBtn = document.getElementById('cancel-scan-btn');
    
    scanQrBtn?.addEventListener('click', async () => {
      await this.startQRScanning();
    });
    
    cancelScanBtn?.addEventListener('click', () => {
      this.stopQRScanning();
      // Clear any success messages
      const qrScannerContainer = document.getElementById('qr-scanner-container');
      if (qrScannerContainer) {
        const successMsg = qrScannerContainer.querySelector('.qr-scan-success');
        if (successMsg) {
          successMsg.remove();
        }
      }
    });

    // Force delete room buttons
    const forceDeleteRoomBtn = document.getElementById('force-delete-room-btn');
    const forceDeleteMobileBtn = document.getElementById('force-delete-mobile-btn');
    
    forceDeleteRoomBtn?.addEventListener('click', () => {
      this.forceDeleteRoom();
    });
    
    forceDeleteMobileBtn?.addEventListener('click', () => {
      this.forceDeleteRoom();
    });
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
      
      // Display peer ID in UI (both desktop and mobile)
      const peerIdDisplay = document.getElementById('your-peer-id');
      if (peerIdDisplay) {
        peerIdDisplay.textContent = peerId;
      }
      
      const mobilePeerIdDisplay = document.getElementById('mobile-peer-id');
      if (mobilePeerIdDisplay) {
        mobilePeerIdDisplay.textContent = peerId;
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
          this.uiManager.showDesktopGameScreen();
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
    
    try {
      // Parse JSON data if it's a string
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Handle gyroscope data for visualization
      if (parsed.type === 'gyro_data') {
        // Update all visualizations with gyroscope data
        if (this.visualization) {
          this.visualization.updateRotation(parsed.alpha, parsed.beta, parsed.gamma);
        }
        if (this.waitingRoomVisualization) {
          this.waitingRoomVisualization.updateRotation(parsed.alpha, parsed.beta, parsed.gamma);
        }
        if (this.mobileVisualization) {
          this.mobileVisualization.updateRotation(parsed.alpha, parsed.beta, parsed.gamma);
        }
      }
    } catch (error) {
      console.error('Failed to parse received data:', error);
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

  initializeWaitingRoomVisualization() {
    // Initialize visualization in waiting room for desktop
    const waitingRoom = document.getElementById('waiting-room-screen');
    if (!waitingRoom || waitingRoom.classList.contains('hidden')) {
      return;
    }

    try {
      // Create a canvas container in waiting room
      let canvasContainer = document.getElementById('waiting-room-canvas-container');
      if (!canvasContainer) {
        canvasContainer = document.createElement('div');
        canvasContainer.id = 'waiting-room-canvas-container';
        canvasContainer.className = 'w-full h-64 bg-gray-900 rounded-lg overflow-hidden mt-4';
        const canvas = document.createElement('canvas');
        canvas.id = 'waiting-room-three-canvas';
        canvas.className = 'w-full h-full';
        canvasContainer.appendChild(canvas);
        
        // Insert before exit button
        const exitBtn = document.getElementById('exit-room-btn');
        if (exitBtn && exitBtn.parentElement) {
          exitBtn.parentElement.insertBefore(canvasContainer, exitBtn);
        }
      }

      // Create visualization instance for waiting room
      this.waitingRoomVisualization = new Visualization();
      this.waitingRoomVisualization.initScene(canvasContainer, 'waiting-room-three-canvas');
      
      console.log('Waiting room visualization initialized');
    } catch (error) {
      console.error('Failed to initialize waiting room visualization:', error);
      // Don't show error, just log it
    }
  }

  initializeMobileVisualization() {
    // Initialize visualization for mobile device
    const container = document.getElementById('mobile-visualization-container');
    if (!container) {
      return;
    }

    try {
      // Show container
      container.classList.remove('hidden');
      
      // Create visualization instance for mobile
      this.mobileVisualization = new Visualization();
      this.mobileVisualization.initScene(container, 'mobile-three-canvas');
      
      console.log('Mobile visualization initialized');
    } catch (error) {
      console.error('Failed to initialize mobile visualization:', error);
      // Don't show error, just log it
    }
  }

  async generatePeerIDQRCode(peerId) {
    const qrDisplay = document.getElementById('qr-code-display');
    if (!qrDisplay) {
      return;
    }

    try {
      console.log('Generating QR code for Peer ID:', peerId);
      await this.qrManager.generateQRCode(peerId, qrDisplay);
      console.log('QR code generated successfully for Peer ID:', peerId);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      const errorMsg = `Failed to generate QR code: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
    }
  }

  async startQRScanning() {
    const qrScannerContainer = document.getElementById('qr-scanner-container');
    const qrVideo = document.getElementById('qr-video');
    
    if (!qrScannerContainer || !qrVideo) {
      return;
    }

    try {
      // Show scanner
      qrScannerContainer.classList.remove('hidden');
      
      // Start scanning
      await this.qrManager.startQRScanner(qrVideo, (scannedData) => {
        // Clean the scanned data - remove whitespace
        let peerId = scannedData.trim();
        
        console.log('QR Code scanned - Peer ID:', peerId);
        
        // Set the Peer ID in the input field
        const input = document.getElementById('peer-id-input');
        if (input) {
          input.value = peerId;
          // Trigger input event to ensure UI updates
          input.dispatchEvent(new Event('input', { bubbles: true }));
          // Focus the input to show the code was entered
          input.focus();
        }
        
        // Show success message
        const qrScannerContainer = document.getElementById('qr-scanner-container');
        if (qrScannerContainer) {
          // Add a success indicator
          let successMsg = qrScannerContainer.querySelector('.qr-scan-success');
          if (!successMsg) {
            successMsg = document.createElement('div');
            successMsg.className = 'qr-scan-success bg-green-600 text-white px-4 py-2 rounded-lg mt-2 text-center';
            qrScannerContainer.appendChild(successMsg);
          }
          successMsg.textContent = `Peer ID scanned! Click Connect to connect.`;
          successMsg.classList.remove('hidden');
          
          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            if (successMsg) {
              successMsg.classList.add('hidden');
            }
          }, 3000);
        }
        
        // Don't auto-connect - let user click Connect button
        // This gives them a chance to verify the Peer ID
      });
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      const errorMsg = `Failed to start QR scanner: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
      this.stopQRScanning();
    }
  }

  stopQRScanning() {
    this.qrManager.stopQRScanner();
    const qrScannerContainer = document.getElementById('qr-scanner-container');
    if (qrScannerContainer) {
      qrScannerContainer.classList.add('hidden');
    }
  }

  forceDeleteRoom() {
    if (!confirm('Disconnect and reset? This will close all connections.')) {
      return;
    }

    try {
      
      // Close all connections
      if (this.webrtcManager) {
        this.webrtcManager.closeConnection();
        this.webrtcManager = null;
      }
      
      // Stop gyroscope
      this.stopGyroscope();
      this.gyroscopeHandler = null;
      
      // Clean up visualizations
      if (this.visualization) {
        this.visualization.dispose();
        this.visualization = null;
      }
      if (this.mobileVisualization) {
        this.mobileVisualization.dispose();
        this.mobileVisualization = null;
      }
      if (this.waitingRoomVisualization) {
        this.waitingRoomVisualization.dispose();
        this.waitingRoomVisualization = null;
      }
      
      // Clear state
      this.currentDeviceId = null;
      
      // Return to landing screen
      this.uiManager.showLandingScreen();
      
      alert('Room deleted successfully');
    } catch (error) {
      console.error('Failed to force delete room:', error);
      const errorMsg = `Failed to delete room: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
      this.showErrorWithCopy(errorMsg);
    }
  }

  exitRoom() {
    // Close WebRTC connections
    if (this.webrtcManager) {
      this.webrtcManager.closeConnection();
      this.webrtcManager = null;
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
    this.currentDeviceId = null;
    
    // Clean up visualizations
    if (this.visualization) {
      this.visualization.dispose();
      this.visualization = null;
    }
    if (this.mobileVisualization) {
      this.mobileVisualization.dispose();
      this.mobileVisualization = null;
    }
    if (this.waitingRoomVisualization) {
      this.waitingRoomVisualization.dispose();
      this.waitingRoomVisualization = null;
    }
    
    // Stop QR scanning if active
    this.stopQRScanning();
    
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

