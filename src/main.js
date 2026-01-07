// Main application entry point - Lightsaber Game
import './styles.css';
import { DeviceDetector } from './device-detector.js';
import { WebRTCManager } from './webrtc-manager.js';
import { GyroscopeHandler } from './gyroscope-handler.js';
import { MotionHandler } from './motion-handler.js';
import { MicrophoneHandler } from './microphone-handler.js';
import { LightsaberVisualization } from './lightsaber-visualization.js';
import { generateKeyphrase, normalizeKeyphrase } from './keyphrase-generator.js';
import { copyToClipboard, showErrorWithCopy } from './utils.js';

class App {
  constructor() {
    this.deviceDetector = new DeviceDetector();
    this.webrtcManager = null;
    this.gyroscopeHandler = null;
    this.motionHandler = null;
    this.microphoneHandler = null;
    this.visualization = null;
    
    this.peerIdKeyphrase = null;
    this.currentDeviceId = null;
    this.isConnected = false;
    
    this.init();
  }

  init() {
    // Auto-create room and generate peer ID on load
    this.initializeRoom();
    this.setupEventListeners();
  }

  async initializeRoom() {
    try {
      // Generate peer ID keyphrase
      console.log('Generating peer ID keyphrase...');
      this.peerIdKeyphrase = generateKeyphrase();
      console.log('Generated peer ID:', this.peerIdKeyphrase);
      
      if (!this.peerIdKeyphrase) {
        throw new Error('Failed to generate peer ID keyphrase');
      }
      
      this.currentDeviceId = this.deviceDetector.getDeviceInfo().id;
      
      // Display peer ID in UI immediately (before WebRTC init)
      console.log('Updating peer ID display...');
      this.updatePeerIdDisplay();
      
      // Initialize WebRTC
      await this.initializeWebRTC();
      
      // Initialize visualization for desktop on page load
      const deviceInfo = this.deviceDetector.getDeviceInfo();
      if (!deviceInfo.isMobile) {
        // Desktop: show game screen and initialize visualization immediately
        // This shows the lightsaber from the start (static until data arrives)
        this.showGameScreenForDesktop();
        // Wait a bit for DOM to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.initializeVisualization();
      }
    } catch (error) {
      console.error('Failed to initialize room:', error);
      showErrorWithCopy(`Failed to initialize: ${error.message}`);
    }
  }

  async initializeWebRTC() {
    try {
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
      
      // Initialize peer with keyphrase (for display)
      console.log('Initializing WebRTC with keyphrase:', this.peerIdKeyphrase);
      
      // Update UI to show initializing state
      this.updateReadyState();
      
      const peerId = await this.webrtcManager.initializePeer(this.peerIdKeyphrase);
      
      console.log('WebRTC initialized with peer ID:', peerId);
      console.log('Peer is ready:', this.webrtcManager.isPeerReady());
      
      // Update UI to show ready state
      this.updateReadyState();
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  }

  updateReadyState() {
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    const statusDiv = document.getElementById('connection-status');
    const readyHint = document.getElementById('ready-hint');
    const connectBtn = document.getElementById('connect-peer-btn');
    
    if (this.webrtcManager && this.webrtcManager.isPeerReady()) {
      if (statusDiv) {
        statusDiv.classList.remove('hidden');
      }
      if (statusText) {
        statusText.textContent = 'Ready to connect';
      }
      if (statusIndicator) {
        statusIndicator.className = 'w-2 h-2 rounded-full bg-green-500';
      }
      if (readyHint) {
        readyHint.textContent = 'You can now connect to another device';
        readyHint.className = 'text-xs text-green-400 mt-1';
      }
      if (connectBtn) {
        connectBtn.disabled = false;
      }
    } else {
      if (statusText) {
        statusText.textContent = 'Initializing...';
      }
      if (statusIndicator) {
        statusIndicator.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
      }
      if (readyHint) {
        readyHint.textContent = 'Wait for "Ready to connect" before attempting connection';
        readyHint.className = 'text-xs text-gray-400 mt-1';
      }
      if (connectBtn) {
        connectBtn.disabled = true;
      }
    }
  }

  setupEventListeners() {
    // Copy Peer ID button
    const copyPeerIdBtn = document.getElementById('copy-peer-id-btn');
    copyPeerIdBtn?.addEventListener('click', async () => {
      if (this.peerIdKeyphrase) {
        try {
          await copyToClipboard(this.peerIdKeyphrase);
          // Show feedback
          const originalHTML = copyPeerIdBtn.innerHTML;
          copyPeerIdBtn.innerHTML = `
            <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          `;
          setTimeout(() => {
            copyPeerIdBtn.innerHTML = originalHTML;
          }, 2000);
        } catch (error) {
          console.error('Failed to copy peer ID:', error);
        }
      }
    });

    // Regenerate Peer ID button
    const regeneratePeerIdBtn = document.getElementById('regenerate-peer-id-btn');
    regeneratePeerIdBtn?.addEventListener('click', async () => {
      console.log('Regenerate button clicked');
      
      // Only allow regeneration if not connected
      if (this.isConnected) {
        if (!confirm('You are currently connected. Regenerating will disconnect you. Continue?')) {
          return;
        }
        this.disconnect();
      }
      
      try {
        // Generate new peer ID
        console.log('Regenerating peer ID keyphrase...');
        this.peerIdKeyphrase = generateKeyphrase();
        console.log('New peer ID:', this.peerIdKeyphrase);
        
        if (!this.peerIdKeyphrase) {
          throw new Error('Failed to generate new peer ID keyphrase');
        }
        
        // Update display immediately
        this.updatePeerIdDisplay();
        
        // Close existing WebRTC connection if any
        if (this.webrtcManager) {
          this.webrtcManager.closeConnection();
          this.webrtcManager = null;
        }
        
        // Initialize with new peer ID
        await this.initializeWebRTC();
      } catch (error) {
        console.error('Failed to regenerate peer ID:', error);
        showErrorWithCopy(`Failed to regenerate peer ID: ${error.message}`);
      }
    });

    // Connect button
    const connectBtn = document.getElementById('connect-peer-btn');
    const peerIdInput = document.getElementById('peer-id-input');
    
    connectBtn?.addEventListener('click', async () => {
      await this.connectToPeer();
    });
    
    // Allow Ctrl+Enter or Cmd+Enter to connect (since it's now a textarea)
    peerIdInput?.addEventListener('keydown', async (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        await this.connectToPeer();
      }
    });

    // Test connection button
    const testConnectionBtn = document.getElementById('test-connection-btn');
    testConnectionBtn?.addEventListener('click', () => {
      this.testConnection();
    });

    // Exit game button
    const exitGameBtn = document.getElementById('exit-game-btn');
    exitGameBtn?.addEventListener('click', () => {
      this.disconnect();
    });
  }

  async connectToPeer() {
    const peerIdInput = document.getElementById('peer-id-input');
    const connectBtn = document.getElementById('connect-peer-btn');
    const statusDiv = document.getElementById('connection-status');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    
    const peerIdKeyphrase = peerIdInput?.value.trim();
    
    if (!peerIdKeyphrase) {
      alert('Please enter a Peer ID');
      return;
    }
    
    // Normalize keyphrase
    const normalizedKeyphrase = normalizeKeyphrase(peerIdKeyphrase);
    console.log('Connecting to normalized keyphrase:', normalizedKeyphrase);
    
    // Disable button and show loading
    if (connectBtn) {
      connectBtn.disabled = true;
      connectBtn.textContent = 'Connecting...';
    }
    
    if (statusDiv) {
      statusDiv.classList.remove('hidden');
    }
    if (statusText) {
      statusText.textContent = 'Connecting...';
    }
    if (statusIndicator) {
      statusIndicator.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
    }
    
    try {
      // Ensure WebRTC is initialized and ready
      if (!this.webrtcManager || !this.webrtcManager.isPeerReady()) {
        console.log('WebRTC not ready, waiting for initialization...');
        if (statusText) {
          statusText.textContent = 'Initializing...';
        }
        
        // Wait for peer to be ready
        let waitCount = 0;
        while ((!this.webrtcManager || !this.webrtcManager.isPeerReady()) && waitCount < 30) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitCount++;
        }
        
        if (!this.webrtcManager || !this.webrtcManager.isPeerReady()) {
          throw new Error('WebRTC peer not ready. Please refresh the page and try again.');
        }
      }
      
      // Update status
      if (statusText) {
        statusText.textContent = 'Connecting...';
      }
      if (statusIndicator) {
        statusIndicator.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
      }
      
      // Connect to peer with retries
      console.log('Attempting connection...');
      await this.webrtcManager.connectToPeer(normalizedKeyphrase, 3);
      
      // Wait a moment for connection to establish
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize sensors and visualization based on device type
      const deviceInfo = this.deviceDetector.getDeviceInfo();
      
      // For mobile, show game screen and initialize sensors
      // For desktop, visualization is already initialized on page load
      if (deviceInfo.isMobile) {
        // Mobile: show game screen and initialize gyroscope, motion, and microphone
        this.showGameScreen();
        
        // Wait a moment for DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await this.initializeMobileSensors();
      } else {
        // Desktop: visualization already initialized, just hide homepage
        this.showGameScreen();
      }
      
      this.isConnected = true;
      
    } catch (error) {
      console.error('Failed to connect:', error);
      showErrorWithCopy(`Connection failed: ${error.message}`);
      
      // Reset UI
      if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect';
      }
      if (statusText) {
        statusText.textContent = 'Connection failed';
      }
      if (statusIndicator) {
        statusIndicator.className = 'w-2 h-2 rounded-full bg-red-500';
      }
    }
  }

  async initializeMobileSensors() {
    try {
      // Initialize gyroscope
      this.gyroscopeHandler = new GyroscopeHandler();
      const gyroPermission = await this.gyroscopeHandler.requestPermission();
      
      if (gyroPermission) {
        this.gyroscopeHandler.startListening((data) => {
          this.sendData(data);
        }, this.currentDeviceId);
      } else {
        console.warn('Gyroscope permission denied');
      }
      
      // Initialize motion handler
      this.motionHandler = new MotionHandler();
      const motionPermission = await this.motionHandler.requestPermission();
      
      if (motionPermission) {
        this.motionHandler.startListening((data) => {
          this.sendData(data);
        }, this.currentDeviceId);
      } else {
        console.warn('Motion permission denied');
      }
      
      // Initialize microphone
      this.microphoneHandler = new MicrophoneHandler();
      const micPermission = await this.microphoneHandler.requestPermission();
      
      if (micPermission) {
        await this.microphoneHandler.startListening((data) => {
          this.sendData(data);
        }, this.currentDeviceId);
      } else {
        console.warn('Microphone permission denied');
      }
      
    } catch (error) {
      console.error('Failed to initialize mobile sensors:', error);
      showErrorWithCopy(`Failed to initialize sensors: ${error.message}`);
    }
  }

  async initializeVisualization() {
    try {
      // Wait for game screen to be visible
      const gameScreen = document.getElementById('game-screen');
      if (!gameScreen) {
        console.error('Game screen container not found');
        return;
      }
      
      // Get the canvas container (the relative div inside game-screen)
      // The structure is: game-screen > flex-1 relative > canvas
      const container = gameScreen.querySelector('.flex-1.relative');
      if (!container) {
        console.error('Canvas container not found in game screen');
        return;
      }
      
      console.log('🎨 Initializing visualization...');
      console.log('Container:', container);
      console.log('Container dimensions:', container.clientWidth, 'x', container.clientHeight);
      
      // Dispose existing visualization if any
      if (this.visualization) {
        console.log('Disposing existing visualization');
        this.visualization.dispose();
        this.visualization = null;
      }
      
      this.visualization = new LightsaberVisualization();
      
      // Wait a moment for DOM to update and ensure container has dimensions
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check container dimensions again
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        console.warn('Container has zero dimensions, forcing size');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.minHeight = '400px';
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.visualization.initScene(container, 'three-canvas');
      
      console.log('✅ Visualization initialized successfully');
      console.log('Scene:', this.visualization.scene);
      console.log('Lightsaber:', this.visualization.lightsaber);
      console.log('Renderer:', this.visualization.renderer);
    } catch (error) {
      console.error('❌ Failed to initialize visualization:', error);
      showErrorWithCopy(`Failed to initialize visualization: ${error.message}`);
    }
  }

  sendData(data) {
    if (this.webrtcManager && this.isConnected) {
      this.webrtcManager.sendData(data);
    }
  }

  handleDataReceived(data, peerId) {
    try {
      // Parse JSON if needed
      let parsedData = data;
      if (typeof data === 'string') {
        parsedData = JSON.parse(data);
      }
      
      // Handle different data types
      switch (parsedData.type) {
        case 'gyro_data':
          this.handleGyroData(parsedData);
          break;
        case 'motion_data':
          this.handleMotionData(parsedData);
          break;
        case 'audio_data':
          this.handleAudioData(parsedData);
          break;
        default:
          console.log('Unknown data type:', parsedData.type);
      }
    } catch (error) {
      console.error('Failed to handle received data:', error);
    }
  }

  handleGyroData(data) {
    console.log('Received gyro data:', data);
    if (this.visualization) {
      this.visualization.updateRotation(data.alpha, data.beta, data.gamma);
    } else {
      console.warn('Visualization not initialized, cannot update rotation');
    }
  }

  handleMotionData(data) {
    if (this.visualization) {
      this.visualization.updateMotion(data);
    }
  }

  handleAudioData(data) {
    if (this.visualization && data.volume !== undefined) {
      // Map volume (0-1) to blade length
      this.visualization.updateBladeLength(data.volume);
    }
  }

  handleConnectionStateChange(status, message) {
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    const gameStatusText = document.getElementById('game-status-text');
    const gameStatusIndicator = document.getElementById('game-status-indicator');
    
    if (statusText) {
      statusText.textContent = message || status;
    }
    
    if (statusIndicator) {
      const colorMap = {
        'connected': 'bg-green-500',
        'connecting': 'bg-yellow-500 animate-pulse',
        'disconnected': 'bg-gray-500',
        'error': 'bg-red-500',
      };
      statusIndicator.className = `w-2 h-2 rounded-full ${colorMap[status] || 'bg-gray-500'}`;
    }
    
    // Update game screen status
    if (gameStatusText) {
      gameStatusText.textContent = message || status;
    }
    
    if (gameStatusIndicator) {
      const colorMap = {
        'connected': 'bg-green-500',
        'connecting': 'bg-yellow-500 animate-pulse',
        'disconnected': 'bg-gray-500',
        'error': 'bg-red-500',
      };
      gameStatusIndicator.className = `w-2 h-2 rounded-full ${colorMap[status] || 'bg-gray-500'}`;
    }
  }

  handleConnectionQualityChange(peerId, quality) {
    const rttDisplay = document.getElementById('rtt-display');
    const qualityDisplay = document.getElementById('quality-display');
    const connectedCount = document.getElementById('connected-count');
    
    if (rttDisplay && quality.rtt !== undefined) {
      rttDisplay.textContent = Math.round(quality.rtt);
    }
    
    if (qualityDisplay && quality.level) {
      qualityDisplay.textContent = quality.level;
      // Color code quality
      const colorMap = {
        'excellent': 'text-green-400',
        'good': 'text-green-300',
        'fair': 'text-yellow-400',
        'poor': 'text-red-400',
      };
      qualityDisplay.className = colorMap[quality.level] || '';
    }
    
    if (connectedCount && this.webrtcManager) {
      connectedCount.textContent = this.webrtcManager.connections?.size || 0;
    }
  }

  updatePeerIdDisplay() {
    const peerIdDisplay = document.getElementById('your-peer-id-display');
    const gamePeerId = document.getElementById('game-peer-id');
    
    console.log('updatePeerIdDisplay called, peerIdKeyphrase:', this.peerIdKeyphrase);
    console.log('peerIdDisplay element:', peerIdDisplay);
    
    if (peerIdDisplay) {
      // For textarea, use value; for input, also use value
      peerIdDisplay.value = this.peerIdKeyphrase || '';
      console.log('Set peerIdDisplay.value to:', peerIdDisplay.value);
    } else {
      console.warn('peerIdDisplay element not found');
    }
    
    if (gamePeerId) {
      gamePeerId.textContent = this.peerIdKeyphrase || '-';
    }
  }

  showGameScreenForDesktop() {
    // For desktop, show game screen but keep homepage visible (overlay)
    const gameScreen = document.getElementById('game-screen');
    const homepage = document.getElementById('homepage-screen');
    
    if (gameScreen) {
      gameScreen.classList.remove('hidden');
    }
    
    // Make homepage overlay on desktop (positioned absolutely over game screen)
    if (homepage) {
      homepage.classList.add('absolute', 'inset-0', 'z-10');
      homepage.classList.remove('flex-1');
    }
  }

  showGameScreen() {
    const homepage = document.getElementById('homepage-screen');
    const gameScreen = document.getElementById('game-screen');
    
    if (homepage) {
      homepage.classList.add('hidden');
    }
    
    if (gameScreen) {
      gameScreen.classList.remove('hidden');
    }
  }

  showHomepage() {
    const homepage = document.getElementById('homepage-screen');
    const gameScreen = document.getElementById('game-screen');
    const deviceInfo = this.deviceDetector.getDeviceInfo();
    
    if (homepage) {
      homepage.classList.remove('hidden');
      // On desktop, keep it as overlay; on mobile, restore normal layout
      if (!deviceInfo.isMobile) {
        homepage.classList.add('absolute', 'inset-0', 'z-10');
        homepage.classList.remove('flex-1');
      } else {
        homepage.classList.remove('absolute', 'inset-0', 'z-10');
        homepage.classList.add('flex-1');
      }
    }
    
    // On mobile, hide game screen; on desktop, keep it visible
    if (deviceInfo.isMobile && gameScreen) {
      gameScreen.classList.add('hidden');
    }
  }

  async testConnection() {
    const peerIdInput = document.getElementById('peer-id-input');
    const peerIdKeyphrase = peerIdInput?.value.trim();
    
    if (!peerIdKeyphrase) {
      alert('Please enter a peer ID to test');
      return;
    }
    
    const normalizedKeyphrase = normalizeKeyphrase(peerIdKeyphrase);
    
    console.log('=== CONNECTION TEST ===');
    console.log('Input keyphrase:', peerIdKeyphrase);
    console.log('Normalized keyphrase:', normalizedKeyphrase);
    
    if (this.webrtcManager) {
      console.log('Our peer ID:', this.webrtcManager.getPeerId());
      console.log('Our display keyphrase:', this.webrtcManager.getDisplayKeyphrase());
      console.log('Peer is ready:', this.webrtcManager.isPeerReady());
      
      // Hash the target keyphrase to see what peer ID we'd connect to
      try {
        // We need to access the hashKeyphrase method - let's add it to the public API
        const targetHash = await this.webrtcManager.hashKeyphraseForTesting(normalizedKeyphrase);
        console.log('Target peer ID (hashed):', targetHash);
        console.log('Match?', targetHash === this.webrtcManager.getPeerId() ? 'YES (same device)' : 'NO (different device)');
      } catch (error) {
        console.error('Error hashing keyphrase:', error);
      }
    } else {
      console.log('WebRTC manager not initialized');
    }
    
    console.log('=== END TEST ===');
    
    // Show results in alert
    const results = [
      'Connection Test Results:',
      `Input: ${peerIdKeyphrase}`,
      `Our Peer ID: ${this.webrtcManager?.getPeerId() || 'Not initialized'}`,
      `Ready: ${this.webrtcManager?.isPeerReady() ? 'Yes' : 'No'}`,
      '',
      'Check browser console for detailed logs'
    ].join('\n');
    
    alert(results);
  }

  disconnect() {
    // Stop all sensors
    if (this.gyroscopeHandler) {
      this.gyroscopeHandler.stopListening();
      this.gyroscopeHandler = null;
    }
    
    if (this.motionHandler) {
      this.motionHandler.stopListening();
      this.motionHandler = null;
    }
    
    if (this.microphoneHandler) {
      this.microphoneHandler.stopListening();
      this.microphoneHandler = null;
    }
    
    // Close WebRTC connections
    if (this.webrtcManager) {
      this.webrtcManager.closeConnection();
      this.webrtcManager = null;
    }
    
    // Reset state
    this.isConnected = false;
    
    // For desktop, keep visualization running (just reset rotation)
    const deviceInfo = this.deviceDetector.getDeviceInfo();
    if (!deviceInfo.isMobile && this.visualization) {
      // Reset lightsaber to default position
      this.visualization.targetRotation = { x: 0, y: 0, z: 0 };
      this.visualization.currentRotation = { x: 0, y: 0, z: 0 };
      this.visualization.targetBladeLength = this.visualization.baseBladeLength;
      this.visualization.currentBladeLength = this.visualization.baseBladeLength;
      console.log('Reset lightsaber to default position');
    } else {
      // For mobile, dispose visualization
      if (this.visualization) {
        this.visualization.dispose();
        this.visualization = null;
      }
    }
    
    // Return to homepage
    this.showHomepage();
    
    // Reinitialize room (but keep visualization on desktop)
    this.initializeRoom();
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

