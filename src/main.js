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
    this.recentPeers = this.loadRecentPeers();
    
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
      
      // Initialize visualization (for desktop, will show after connection)
      const deviceInfo = this.deviceDetector.getDeviceInfo();
      if (!deviceInfo.isMobile) {
        // Desktop: initialize visualization container
        const container = document.getElementById('game-screen');
        if (container) {
          // Visualization will be initialized after connection
        }
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
      
      // Initialize peer with keyphrase
      console.log('Initializing WebRTC with keyphrase:', this.peerIdKeyphrase);
      const peerId = await this.webrtcManager.initializePeer(this.peerIdKeyphrase);
      
      console.log('WebRTC initialized with peer ID:', peerId);
      
      // Update display with actual peer ID (might be different from keyphrase)
      // But we'll keep showing the keyphrase for user reference
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
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
      // Ensure WebRTC is initialized
      if (!this.webrtcManager || !this.webrtcManager.peer || !this.webrtcManager.peer.open) {
        console.log('WebRTC not ready, waiting for initialization...');
        // Wait a bit for peer to be ready
        let waitCount = 0;
        while ((!this.webrtcManager || !this.webrtcManager.peer || !this.webrtcManager.peer.open) && waitCount < 20) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitCount++;
        }
        
        if (!this.webrtcManager || !this.webrtcManager.peer || !this.webrtcManager.peer.open) {
          throw new Error('WebRTC peer not ready. Please wait a moment and try again.');
        }
      }
      
      // Connect to peer
      console.log('Attempting connection...');
      await this.webrtcManager.connectToPeer(normalizedKeyphrase);
      
      // Save to recent peers
      this.addToRecentPeers(normalizedKeyphrase);
      
      // Wait a moment for connection to establish
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize sensors and visualization based on device type
      const deviceInfo = this.deviceDetector.getDeviceInfo();
      
      if (deviceInfo.isMobile) {
        // Mobile: initialize gyroscope, motion, and microphone
        await this.initializeMobileSensors();
      } else {
        // Desktop: initialize visualization
        await this.initializeVisualization();
      }
      
      // Show game screen
      this.showGameScreen();
      
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
      const container = document.getElementById('game-screen');
      if (!container) {
        console.error('Game screen container not found');
        return;
      }
      
      this.visualization = new LightsaberVisualization();
      this.visualization.initScene(container, 'three-canvas');
      
      console.log('Visualization initialized');
    } catch (error) {
      console.error('Failed to initialize visualization:', error);
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
    if (this.visualization) {
      this.visualization.updateRotation(data.alpha, data.beta, data.gamma);
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
    
    // Dispose visualization
    if (this.visualization) {
      this.visualization.dispose();
      this.visualization = null;
    }
    
    // Reset state
    this.isConnected = false;
    
    // Show homepage
    const homepage = document.getElementById('homepage-screen');
    const gameScreen = document.getElementById('game-screen');
    
    if (homepage) {
      homepage.classList.remove('hidden');
    }
    
    if (gameScreen) {
      gameScreen.classList.add('hidden');
    }
    
    // Reinitialize room
    this.initializeRoom();
  }

  loadRecentPeers() {
    try {
      const stored = localStorage.getItem('recentPeers');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load recent peers:', error);
    }
    return [];
  }

  saveRecentPeers() {
    try {
      localStorage.setItem('recentPeers', JSON.stringify(this.recentPeers));
    } catch (error) {
      console.error('Failed to save recent peers:', error);
    }
  }

  addToRecentPeers(peerIdKeyphrase) {
    // Remove if already exists
    this.recentPeers = this.recentPeers.filter(p => p !== peerIdKeyphrase);
    
    // Add to beginning
    this.recentPeers.unshift(peerIdKeyphrase);
    
    // Keep only last 10
    if (this.recentPeers.length > 10) {
      this.recentPeers = this.recentPeers.slice(0, 10);
    }
    
    this.saveRecentPeers();
    this.updateRecentPeersList();
  }

  updateRecentPeersList() {
    const recentPeersList = document.getElementById('recent-peers-list');
    if (!recentPeersList) return;

    if (this.recentPeers.length === 0) {
      recentPeersList.innerHTML = '<p class="text-xs text-gray-400 text-center py-2">No recent peers</p>';
      return;
    }

    recentPeersList.innerHTML = this.recentPeers.map(peerId => `
      <div class="flex items-center gap-2 p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer group" data-peer-id="${peerId}">
        <div class="flex-1 min-w-0">
          <p class="text-xs font-mono text-gray-300 truncate" title="${peerId}">${peerId}</p>
        </div>
        <button
          class="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs bg-primary-600 hover:bg-primary-700 rounded transition-all"
          data-peer-id="${peerId}"
          title="Connect to this peer"
        >
          Connect
        </button>
      </div>
    `).join('');

    // Add click handlers
    recentPeersList.querySelectorAll('[data-peer-id]').forEach(element => {
      element.addEventListener('click', async (e) => {
        const peerId = element.getAttribute('data-peer-id');
        if (peerId) {
          // Set the peer ID in the input field
          const peerIdInput = document.getElementById('peer-id-input');
          if (peerIdInput) {
            peerIdInput.value = peerId;
          }
          // Trigger connection
          await this.connectToPeer();
        }
      });
    });
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
