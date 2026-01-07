// WebRTC Manager using PeerJS
import Peer from 'peerjs';

export class WebRTCManager {
  constructor() {
    this.peer = null;
    this.peerId = null;
    this.connections = new Map(); // Map of peerId -> DataConnection
    this.connectionQuality = new Map(); // Map of peerId -> quality metrics
    this.dataCallbacks = [];
    this.connectionStateCallbacks = [];
    this.connectionQualityCallbacks = [];
    this.connectionStatus = 'disconnected';
    this.discoveryInterval = null;
    this.reconnectAttempts = new Map(); // Map of peerId -> attempt count
    this.reconnectTimers = new Map(); // Map of peerId -> timeout ID
    
    // STUN servers for NAT traversal
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };
  }

  async initializePeer(peerIdKeyphrase) {
    // Use the keyphrase directly as peer ID
    // PeerJS accepts alphanumeric and some special chars, but keyphrases use spaces
    // Convert spaces to hyphens for PeerJS compatibility
    // Also store the original keyphrase for display
    this.peerIdKeyphrase = peerIdKeyphrase;
    const peerId = peerIdKeyphrase.replace(/\s+/g, '-').toLowerCase();
    
    console.log('Initializing peer with keyphrase:', peerIdKeyphrase);
    console.log('Converted peer ID:', peerId);
    
    return new Promise((resolve, reject) => {
      try {
        // Initialize PeerJS peer
        // Note: PeerJS may assign a different ID if the requested one is taken
        this.peer = new Peer(peerId, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          config: this.config,
          debug: 2, // Enable debug logging
        });

        this.peer.on('open', (id) => {
          // PeerJS may return a different ID than requested
          this.peerId = id;
          this.connectionStatus = 'connected';
          this.updateConnectionStatus('connected', 'Peer initialized');
          console.log('PeerJS peer opened with ID:', id);
          console.log('Requested peer ID was:', peerId);
          
          // If the ID is different, log it
          if (id !== peerId) {
            console.warn('PeerJS assigned different ID. Requested:', peerId, 'Got:', id);
          }
          
          resolve(id);
        });

        this.peer.on('connection', (dataConnection) => {
          this.handleIncomingConnection(dataConnection);
        });

        this.peer.on('error', (error) => {
          console.error('PeerJS error:', error);
          this.connectionStatus = 'error';
          this.updateConnectionStatus('error', `Connection error: ${error.message}`);
          
          // Provide detailed error for debugging
          const errorMsg = `WebRTC Error: ${error.type}\nMessage: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
          this.notifyError(errorMsg);
          reject(error);
        });

        this.peer.on('close', () => {
          console.log('PeerJS peer closed');
          this.connectionStatus = 'disconnected';
          this.updateConnectionStatus('disconnected', 'Connection closed');
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.peerId) {
            const error = new Error('Peer initialization timeout');
            this.connectionStatus = 'error';
            this.updateConnectionStatus('error', 'Connection timeout');
            reject(error);
          }
        }, 10000);
      } catch (error) {
        console.error('Failed to initialize PeerJS:', error);
        this.connectionStatus = 'error';
        this.updateConnectionStatus('error', `Initialization failed: ${error.message}`);
        reject(error);
      }
    });
  }

  async connectToPeer(peerIdKeyphrase) {
    // Normalize keyphrase: convert spaces to hyphens for PeerJS compatibility
    const peerId = peerIdKeyphrase.replace(/\s+/g, '-').toLowerCase();
    
    console.log('Connecting to peer with keyphrase:', peerIdKeyphrase);
    console.log('Converted peer ID:', peerId);
    
    if (!this.peer) {
      throw new Error('Peer not initialized. Please wait for peer to initialize.');
    }
    
    if (!this.peer.open) {
      throw new Error('Peer not open yet. Please wait for peer to be ready.');
    }

    if (this.connections.has(peerId)) {
      console.log('Already connected to peer:', peerId);
      return this.connections.get(peerId);
    }

    return new Promise((resolve, reject) => {
      let connectionTimeout;
      let hasResolved = false;
      
      try {
        console.log('Creating data connection to:', peerId);
        
        // Create data connection
        const dataConnection = this.peer.connect(peerId, {
          reliable: true, // Use reliable data channel
          serialization: 'json', // Use JSON serialization
        });

        if (!dataConnection) {
          reject(new Error('Failed to create data connection'));
          return;
        }
        
        console.log('Data connection object created, waiting for open event...');

        dataConnection.on('open', () => {
          if (hasResolved) return;
          hasResolved = true;
          clearTimeout(connectionTimeout);
          
          console.log('Data connection opened to:', peerId);
          this.connections.set(peerId, dataConnection);
          this.reconnectAttempts.delete(peerId); // Reset reconnect attempts on success
          this.updateConnectionStatus('connected', `Connected to ${peerId.slice(-8)}`);
          
          // Start monitoring connection quality
          this.startQualityMonitoring(peerId, dataConnection);
          
          // Send pending pong if any
          if (this.pendingPongs && this.pendingPongs.has(peerId)) {
            const pongMessage = this.pendingPongs.get(peerId);
            try {
              dataConnection.send(JSON.stringify(pongMessage));
              this.pendingPongs.delete(peerId);
            } catch (error) {
              console.error('Failed to send pending pong:', error);
            }
          }
          
          resolve(dataConnection);
        });

        dataConnection.on('data', (data) => {
          this.handleDataReceived(peerId, data);
        });

        dataConnection.on('close', () => {
          console.log('Data connection closed to:', peerId);
          this.connections.delete(peerId);
          this.connectionQuality.delete(peerId);
          this.stopQualityMonitoring(peerId);
          this.updateConnectionStatus('disconnected', `Disconnected from ${peerId.slice(-8)}`);
          
          // Attempt reconnection
          this.attemptReconnection(peerId);
        });

        dataConnection.on('error', (error) => {
          console.error('Data connection error:', error);
          clearTimeout(connectionTimeout);
          
          if (!hasResolved) {
            hasResolved = true;
            this.connections.delete(peerId);
            const errorMsg = `Connection error to ${peerId}: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
            this.notifyError(errorMsg);
            reject(error);
          }
        });

        // Timeout after 15 seconds (increased from 10)
        connectionTimeout = setTimeout(() => {
          if (!hasResolved && !this.connections.has(peerId)) {
            hasResolved = true;
            console.error('Connection timeout to:', peerId);
            reject(new Error(`Connection timeout to ${peerId}. The peer may not be online or may have a different ID.`));
          }
        }, 15000);
      } catch (error) {
        console.error('Failed to connect to peer:', error);
        reject(error);
      }
    });
  }

  handleIncomingConnection(dataConnection) {
    const peerId = dataConnection.peer;
    
    dataConnection.on('open', () => {
      console.log('Incoming data connection opened from:', peerId);
      this.connections.set(peerId, dataConnection);
      this.reconnectAttempts.delete(peerId); // Reset reconnect attempts on success
      this.updateConnectionStatus('connected', `Connected to ${peerId.slice(-8)}`);
      
      // Start monitoring connection quality
      this.startQualityMonitoring(peerId, dataConnection);
    });

    dataConnection.on('data', (data) => {
      this.handleDataReceived(peerId, data);
    });

    dataConnection.on('close', () => {
      console.log('Incoming data connection closed from:', peerId);
      this.connections.delete(peerId);
      this.connectionQuality.delete(peerId);
      this.stopQualityMonitoring(peerId);
      this.updateConnectionStatus('disconnected', `Disconnected from ${peerId.slice(-8)}`);
      
      // Attempt reconnection
      this.attemptReconnection(peerId);
    });

    dataConnection.on('error', (error) => {
      console.error('Incoming data connection error:', error);
      this.connections.delete(peerId);
    });
  }

  sendData(data) {
    if (this.connections.size === 0) {
      console.warn('No connections available to send data');
      return false;
    }

    const dataString = JSON.stringify(data);
    let successCount = 0;
    let failCount = 0;

    this.connections.forEach((connection, peerId) => {
      if (connection && connection.open) {
        try {
          connection.send(dataString);
          successCount++;
        } catch (error) {
          console.error(`Failed to send data to ${peerId}:`, error);
          failCount++;
          // Remove failed connection
          this.connections.delete(peerId);
        }
      } else {
        failCount++;
        // Remove closed connection
        if (connection && !connection.open) {
          this.connections.delete(peerId);
        }
      }
    });

    if (failCount > 0 && successCount === 0) {
      console.error('Failed to send data to any peer');
      this.updateConnectionStatus('error', 'No active connections');
      return false;
    }

    return true;
  }

  handleDataReceived(peerId, data) {
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Discovery messages removed - using direct peer-to-peer connections
      
      // Handle quality ping/pong
      if (parsedData.type === 'quality_ping') {
        this.handleQualityPing(parsedData, peerId);
        return;
      }
      
      if (parsedData.type === 'quality_pong') {
        this.handleQualityPong(parsedData, peerId);
        return;
      }
      
      // Notify all registered callbacks
      this.dataCallbacks.forEach(callback => {
        try {
          callback(parsedData, peerId);
        } catch (error) {
          console.error('Error in data callback:', error);
        }
      });
    } catch (error) {
      console.error('Failed to parse received data:', error);
    }
  }
  
  // Automatic peer discovery
  startAutomaticDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    // Broadcast discovery ping every 2 seconds
    this.discoveryInterval = setInterval(() => {
      this.broadcastDiscoveryPing();
    }, 2000);
    
    // Also try to discover peers by attempting connections to potential peer IDs
    this.attemptPeerDiscovery();
  }
  
  stopAutomaticDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }
  
  broadcastDiscoveryPing() {
    if (!this.peer || !this.peer.open) {
      return;
    }
    
    // Send ping to all connected peers
    const pingMessage = {
      type: 'discovery_ping',
      roomCode: this.roomCode,
      peerId: this.peerId,
      deviceId: this.deviceId,
      timestamp: Date.now(),
    };
    
    this.sendData(pingMessage);
  }
  
  handleDiscoveryPing(data, senderPeerId) {
    // Check if ping is from same room
    if (data.roomCode !== this.roomCode) {
      return; // Ignore pings from different rooms
    }
    
    // If not already connected, attempt to connect
    if (!this.connections.has(senderPeerId) && data.peerId && data.peerId !== this.peerId) {
      console.log(`Auto-connecting to peer from discovery ping: ${data.peerId}`);
      this.connectToPeer(data.peerId).catch(err => {
        console.warn(`Failed to auto-connect to ${data.peerId}:`, err);
      });
    }
    
    // Respond with pong
    const pongMessage = {
      type: 'discovery_pong',
      roomCode: this.roomCode,
      peerId: this.peerId,
      deviceId: this.deviceId,
      timestamp: Date.now(),
    };
    
    // Send pong directly to the sender (if connected) or attempt connection first
    const connection = this.connections.get(senderPeerId);
    if (connection && connection.open) {
      try {
        connection.send(JSON.stringify(pongMessage));
      } catch (error) {
        console.error('Failed to send discovery pong:', error);
      }
    } else if (data.peerId && data.peerId !== this.peerId) {
      // Not connected yet, pong will be sent after connection is established
      // Store pong to send later
      if (!this.pendingPongs) {
        this.pendingPongs = new Map();
      }
      this.pendingPongs.set(data.peerId, pongMessage);
    }
  }
  
  handleDiscoveryPong(data, senderPeerId) {
    // Check if pong is from same room
    if (data.roomCode !== this.roomCode) {
      return; // Ignore pongs from different rooms
    }
    
    // Pong received - connection should be established
    console.log('Discovery pong received from:', senderPeerId);
    
    // If not already connected, attempt to connect
    if (!this.connections.has(senderPeerId) && data.peerId && data.peerId !== this.peerId) {
      console.log(`Auto-connecting to peer from discovery pong: ${data.peerId}`);
      this.connectToPeer(data.peerId).catch(err => {
        console.warn(`Failed to auto-connect to ${data.peerId}:`, err);
      });
    }
  }
  
  async attemptPeerDiscovery(roomDevices) {
    if (!this.roomCode || !this.peer || !this.peer.open) {
      return;
    }
    
    // Try to connect to peers based on room device information
    if (roomDevices && Array.isArray(roomDevices)) {
      for (const device of roomDevices) {
        // Skip self
        if (device.id === this.deviceId) {
          continue;
        }
        
        // Construct peer ID: roomCode_deviceIdSuffix
        const deviceIdSuffix = device.id.slice(-8);
        const potentialPeerId = `${this.roomCode}_${deviceIdSuffix}`;
        
        // Skip if already connected
        if (this.connections.has(potentialPeerId)) {
          continue;
        }
        
        // Attempt connection
        try {
          await this.connectToPeer(potentialPeerId);
          console.log(`Auto-discovered and connected to peer: ${potentialPeerId}`);
        } catch (error) {
          // Connection failed - peer might not be ready yet or ID doesn't match
          // This is expected and not an error
          console.debug(`Could not connect to potential peer ${potentialPeerId}:`, error.message);
        }
      }
    }
  }
  
  // Connection quality monitoring
  startQualityMonitoring(peerId, connection) {
    // Monitor connection quality every 2 seconds
    const qualityInterval = setInterval(() => {
      this.updateConnectionQuality(peerId, connection);
    }, 2000);
    
    // Store interval ID for cleanup
    if (!this.qualityIntervals) {
      this.qualityIntervals = new Map();
    }
    this.qualityIntervals.set(peerId, qualityInterval);
  }
  
  stopQualityMonitoring(peerId) {
    if (this.qualityIntervals && this.qualityIntervals.has(peerId)) {
      clearInterval(this.qualityIntervals.get(peerId));
      this.qualityIntervals.delete(peerId);
    }
  }
  
  updateConnectionQuality(peerId, connection) {
    // Simplified quality assessment based on connection state
    // PeerJS doesn't expose RTCPeerConnection directly, so we use heuristics
    
    const quality = {
      peerId,
      timestamp: Date.now(),
      state: connection.open ? 'connected' : 'disconnected',
      quality: 'unknown',
      rtt: null,
      packetLoss: null,
    };
    
    if (connection.open) {
      // Measure RTT using a simple ping mechanism
      if (!this.qualityPings) {
        this.qualityPings = new Map();
      }
      
      const pingStart = Date.now();
      const pingId = `${peerId}_${pingStart}`;
      
      // Send a quality ping
      try {
        const pingMessage = {
          type: 'quality_ping',
          pingId,
          timestamp: pingStart,
        };
        connection.send(JSON.stringify(pingMessage));
        
        // Store ping for RTT calculation
        this.qualityPings.set(pingId, {
          peerId,
          startTime: pingStart,
          timeout: setTimeout(() => {
            // Timeout - assume poor connection
            this.qualityPings.delete(pingId);
            quality.quality = 'poor';
            quality.rtt = null;
            this.connectionQuality.set(peerId, quality);
            this.notifyQualityUpdate(peerId, quality);
          }, 1000)
        });
      } catch (error) {
        // Failed to send - poor connection
        quality.quality = 'poor';
        this.connectionQuality.set(peerId, quality);
        this.notifyQualityUpdate(peerId, quality);
      }
    } else {
      quality.quality = 'poor';
      this.connectionQuality.set(peerId, quality);
      this.notifyQualityUpdate(peerId, quality);
    }
  }
  
  handleQualityPong(data, peerId) {
    // Handle quality pong response
    if (data.type === 'quality_pong' && this.qualityPings) {
      const pingData = this.qualityPings.get(data.pingId);
      if (pingData && pingData.peerId === peerId) {
        clearTimeout(pingData.timeout);
        this.qualityPings.delete(data.pingId);
        
        const rtt = Date.now() - pingData.startTime;
        const quality = {
          peerId,
          timestamp: Date.now(),
          state: 'connected',
          rtt,
          quality: rtt < 50 ? 'excellent' : rtt < 100 ? 'good' : rtt < 200 ? 'fair' : 'poor',
        };
        
        this.connectionQuality.set(peerId, quality);
        this.notifyQualityUpdate(peerId, quality);
      }
    }
  }
  
  handleQualityPing(data, peerId) {
    // Respond to quality ping
    if (data.type === 'quality_ping') {
      const pongMessage = {
        type: 'quality_pong',
        pingId: data.pingId,
        timestamp: Date.now(),
      };
      
      const connection = this.connections.get(peerId);
      if (connection && connection.open) {
        try {
          connection.send(JSON.stringify(pongMessage));
        } catch (error) {
          console.error('Failed to send quality pong:', error);
        }
      }
    }
  }
  
  notifyQualityUpdate(peerId, quality) {
    this.connectionQualityCallbacks.forEach(callback => {
      try {
        callback(peerId, quality);
      } catch (error) {
        console.error('Error in quality callback:', error);
      }
    });
  }
  
  onConnectionQualityChange(callback) {
    this.connectionQualityCallbacks.push(callback);
  }
  
  getConnectionQuality(peerId) {
    return this.connectionQuality.get(peerId) || null;
  }
  
  getAllConnectionQuality() {
    return Array.from(this.connectionQuality.entries()).map(([peerId, quality]) => ({
      peerId,
      ...quality
    }));
  }
  
  // Reconnection logic
  attemptReconnection(peerId) {
    // Don't reconnect if we're closing intentionally
    if (!this.peer || !this.peer.open) {
      return;
    }
    
    // Get current attempt count
    const attempts = this.reconnectAttempts.get(peerId) || 0;
    
    // Max 5 reconnection attempts
    if (attempts >= 5) {
      console.log(`Max reconnection attempts reached for ${peerId}`);
      this.reconnectAttempts.delete(peerId);
      return;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, attempts), 16000);
    
    console.log(`Attempting to reconnect to ${peerId} (attempt ${attempts + 1}) in ${delay}ms`);
    
    const timerId = setTimeout(async () => {
      try {
        this.reconnectAttempts.set(peerId, attempts + 1);
        await this.connectToPeer(peerId);
        // If successful, reconnectAttempts will be cleared in the 'open' handler
      } catch (error) {
        console.error(`Reconnection attempt ${attempts + 1} failed:`, error);
        // Will retry on next interval if not at max
        if (attempts + 1 < 5) {
          this.attemptReconnection(peerId);
        }
      }
    }, delay);
    
    this.reconnectTimers.set(peerId, timerId);
  }
  
  cancelReconnection(peerId) {
    const timerId = this.reconnectTimers.get(peerId);
    if (timerId) {
      clearTimeout(timerId);
      this.reconnectTimers.delete(peerId);
    }
    this.reconnectAttempts.delete(peerId);
  }

  onDataReceived(callback) {
    this.dataCallbacks.push(callback);
  }

  onConnectionStateChange(callback) {
    this.connectionStateCallbacks.push(callback);
  }

  updateConnectionStatus(status, message) {
    this.connectionStatus = status;
    
    // Notify all registered callbacks
    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback(status, message);
      } catch (error) {
        console.error('Error in connection state callback:', error);
      }
    });
  }

  notifyError(errorMsg) {
    // This will be handled by the main app to show error with copy
    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback('error', errorMsg);
      } catch (error) {
        console.error('Error in error notification callback:', error);
      }
    });
  }

  closeConnection() {
    // Stop automatic discovery
    this.stopAutomaticDiscovery();
    
    // Cancel all reconnection attempts
    this.reconnectTimers.forEach((timerId, peerId) => {
      clearTimeout(timerId);
      this.cancelReconnection(peerId);
    });
    this.reconnectTimers.clear();
    
    // Stop all quality monitoring
    if (this.qualityIntervals) {
      this.qualityIntervals.forEach((intervalId, peerId) => {
        clearInterval(intervalId);
      });
      this.qualityIntervals.clear();
    }
    
    // Clear quality pings
    if (this.qualityPings) {
      this.qualityPings.forEach((pingData) => {
        clearTimeout(pingData.timeout);
      });
      this.qualityPings.clear();
    }
    
    // Close all data connections
    this.connections.forEach((connection, peerId) => {
      try {
        connection.close();
      } catch (error) {
        console.error(`Error closing connection to ${peerId}:`, error);
      }
    });
    this.connections.clear();
    this.connectionQuality.clear();

    // Close peer
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (error) {
        console.error('Error destroying peer:', error);
      }
      this.peer = null;
    }

    this.peerId = null;
    this.connectionStatus = 'disconnected';
    this.updateConnectionStatus('disconnected', 'Connection closed');
  }

  getConnectionState() {
    return this.connectionStatus;
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  getConnectedPeers() {
    return Array.from(this.connections.keys());
  }

  getConnectionCount() {
    return this.connections.size;
  }

  isConnected() {
    return this.connectionStatus === 'connected' && this.connections.size > 0;
  }
}
