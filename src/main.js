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
    
    // Data stream status tracking
    this.dataStreamStatus = {
      audio: { lastUpdate: null, count: 0, rate: 0 },
      gyro: { lastUpdate: null, count: 0, rate: 0 },
      motion: { lastUpdate: null, count: 0, rate: 0 }
    };
    this.statusUpdateInterval = null;
    
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
      
      // Set connected state BEFORE initializing sensors (so they can send data)
      this.isConnected = true;
      console.log('✅ Connection established, isConnected = true');
      
      // For mobile, show game screen and initialize sensors
      // For desktop, visualization is already initialized on page load
      if (deviceInfo.isMobile) {
        // Mobile: show game screen and initialize gyroscope, motion, and microphone
        this.showGameScreen();
        
        // Wait a moment for DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Now initialize sensors (isConnected is already true)
        await this.initializeMobileSensors();
      } else {
        // Desktop: visualization already initialized, just hide homepage
        this.showGameScreen();
      }
      
      // Start status update interval
      this.startDataStreamStatusUpdates();
      
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
      console.log('📱 Initializing mobile sensors...');
      
      // Initialize gyroscope
      console.log('🔄 Requesting gyroscope permission...');
      this.gyroscopeHandler = new GyroscopeHandler();
      const gyroPermission = await this.gyroscopeHandler.requestPermission();
      
      if (gyroPermission) {
        console.log('✅ Gyroscope permission granted');
        this.gyroscopeHandler.startListening((data) => {
          console.log('📤 Sending gyro data:', data);
          this.sendData(data);
        }, this.currentDeviceId);
        console.log('✅ Gyroscope listening started');
      } else {
        console.error('❌ Gyroscope permission denied');
        alert('Gyroscope permission denied. Please allow access to device orientation in your browser settings.');
      }
      
      // Initialize motion handler
      console.log('🏃 Requesting motion permission...');
      this.motionHandler = new MotionHandler();
      const motionPermission = await this.motionHandler.requestPermission();
      
      if (motionPermission) {
        console.log('✅ Motion permission granted');
        this.motionHandler.startListening((data) => {
          console.log('📤 Sending motion data:', data);
          this.sendData(data);
        }, this.currentDeviceId);
        console.log('✅ Motion listening started');
      } else {
        console.error('❌ Motion permission denied');
        alert('Motion permission denied. Please allow access to device motion in your browser settings.');
      }
      
      // Initialize microphone
      console.log('🎤 Requesting microphone permission...');
      this.microphoneHandler = new MicrophoneHandler();
      const micPermission = await this.microphoneHandler.requestPermission();
      
      if (micPermission) {
        console.log('✅ Microphone permission granted');
        await this.microphoneHandler.startListening((data) => {
          console.log('📤 Sending audio data:', data);
          this.sendData(data);
        }, this.currentDeviceId);
        console.log('✅ Microphone listening started');
      } else {
        console.error('❌ Microphone permission denied');
        alert('Microphone permission denied. Please allow access to microphone in your browser settings.');
      }
      
      console.log('✅ All mobile sensors initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize mobile sensors:', error);
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
    if (!this.webrtcManager) {
      console.warn('⚠️ Cannot send data: WebRTC manager not initialized', data.type);
      return;
    }
    
    if (!this.isConnected) {
      console.warn('⚠️ Cannot send data: Not connected yet', {
        isConnected: this.isConnected,
        dataType: data.type
      });
      return;
    }
    
    try {
      console.log('📤 Sending data via WebRTC:', data.type);
      this.webrtcManager.sendData(data);
    } catch (error) {
      console.error('❌ Failed to send data:', error, data);
    }
  }

  handleDataReceived(data, peerId) {
    try {
      // Parse JSON if needed
      let parsedData = data;
      if (typeof data === 'string') {
        parsedData = JSON.parse(data);
      }
      
      // Skip handshake messages
      if (parsedData.type === 'handshake' || parsedData.type === 'connection_ack' || parsedData.type === 'connection_verify') {
        return;
      }
      
      // Skip quality ping/pong
      if (parsedData.type === 'quality_ping' || parsedData.type === 'quality_pong') {
        return;
      }
      
      console.log('📥 Received data:', parsedData.type, 'from:', peerId, parsedData);
      
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
    console.log('📱 Received gyro data:', data);
    
    // Update status
    this.updateDataStreamStatus('gyro');
    
    if (this.visualization) {
      // Check if values are valid numbers
      const alpha = typeof data.alpha === 'number' && !isNaN(data.alpha) ? data.alpha : 0;
      const beta = typeof data.beta === 'number' && !isNaN(data.beta) ? data.beta : 0;
      const gamma = typeof data.gamma === 'number' && !isNaN(data.gamma) ? data.gamma : 0;
      
      console.log('🎯 Updating rotation:', { alpha, beta, gamma });
      this.visualization.updateRotation(alpha, beta, gamma);
    } else {
      console.warn('⚠️ Visualization not initialized, cannot update rotation');
    }
  }

  handleMotionData(data) {
    console.log('🏃 Received motion data:', data);
    
    // Update status
    this.updateDataStreamStatus('motion');
    
    if (this.visualization) {
      this.visualization.updateMotion(data);
    } else {
      console.warn('⚠️ Visualization not initialized, cannot update motion');
    }
  }

  handleAudioData(data) {
    // Update status
    this.updateDataStreamStatus('audio');
    
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
    
    // Stop status updates
    this.stopDataStreamStatusUpdates();
    
    // Return to homepage
    this.showHomepage();
    
    // Reinitialize room (but keep visualization on desktop)
    this.initializeRoom();
  }

  updateDataStreamStatus(type) {
    const now = Date.now();
    const status = this.dataStreamStatus[type];
    
    if (status) {
      status.lastUpdate = now;
      status.count++;
    }
  }

  startDataStreamStatusUpdates() {
    // Clear any existing interval
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
    }
    
    // Update status display every 500ms
    this.statusUpdateInterval = setInterval(() => {
      this.updateDataStreamStatusDisplay();
    }, 500);
  }

  stopDataStreamStatusUpdates() {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
    
    // Reset status displays
    this.resetDataStreamStatusDisplay();
  }

  updateDataStreamStatusDisplay() {
    const now = Date.now();
    const timeout = 2000; // Consider inactive if no data for 2 seconds
    
    // Audio status
    const audioStatus = this.dataStreamStatus.audio;
    const audioElement = document.getElementById('audio-status');
    if (audioElement) {
      if (audioStatus.lastUpdate && (now - audioStatus.lastUpdate) < timeout) {
        const timeSinceUpdate = Math.round((now - audioStatus.lastUpdate) / 100) / 10;
        audioElement.textContent = `Active (${audioStatus.rate}/s)`;
        audioElement.className = 'text-xs font-mono text-green-400';
      } else {
        audioElement.textContent = 'Inactive';
        audioElement.className = 'text-xs font-mono text-gray-500';
      }
    }
    
    // Gyroscope status
    const gyroStatus = this.dataStreamStatus.gyro;
    const gyroElement = document.getElementById('gyro-status');
    if (gyroElement) {
      if (gyroStatus.lastUpdate && (now - gyroStatus.lastUpdate) < timeout) {
        const timeSinceUpdate = Math.round((now - gyroStatus.lastUpdate) / 100) / 10;
        gyroElement.textContent = `Active (${gyroStatus.rate}/s)`;
        gyroElement.className = 'text-xs font-mono text-green-400';
      } else {
        gyroElement.textContent = 'Inactive';
        gyroElement.className = 'text-xs font-mono text-gray-500';
      }
    }
    
    // Motion status
    const motionStatus = this.dataStreamStatus.motion;
    const motionElement = document.getElementById('motion-status');
    if (motionElement) {
      if (motionStatus.lastUpdate && (now - motionStatus.lastUpdate) < timeout) {
        const timeSinceUpdate = Math.round((now - motionStatus.lastUpdate) / 100) / 10;
        motionElement.textContent = `Active (${motionStatus.rate}/s)`;
        motionElement.className = 'text-xs font-mono text-green-400';
      } else {
        motionElement.textContent = 'Inactive';
        motionElement.className = 'text-xs font-mono text-gray-500';
      }
    }
    
    // Calculate rates (reset count every second)
    if (!this.lastRateCalculation || (now - this.lastRateCalculation) >= 1000) {
      this.lastRateCalculation = now;
      audioStatus.rate = audioStatus.count;
      gyroStatus.rate = gyroStatus.count;
      motionStatus.rate = motionStatus.count;
      audioStatus.count = 0;
      gyroStatus.count = 0;
      motionStatus.count = 0;
    }
  }

  resetDataStreamStatusDisplay() {
    const audioElement = document.getElementById('audio-status');
    const gyroElement = document.getElementById('gyro-status');
    const motionElement = document.getElementById('motion-status');
    
    if (audioElement) {
      audioElement.textContent = '-';
      audioElement.className = 'text-xs font-mono text-gray-500';
    }
    if (gyroElement) {
      gyroElement.textContent = '-';
      gyroElement.className = 'text-xs font-mono text-gray-500';
    }
    if (motionElement) {
      motionElement.textContent = '-';
      motionElement.className = 'text-xs font-mono text-gray-500';
    }
    
    // Reset status data
    this.dataStreamStatus = {
      audio: { lastUpdate: null, count: 0, rate: 0 },
      gyro: { lastUpdate: null, count: 0, rate: 0 },
      motion: { lastUpdate: null, count: 0, rate: 0 }
    };
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

