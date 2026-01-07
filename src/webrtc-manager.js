// WebRTC Manager using PeerJS - Redesigned for reliability
import Peer from 'peerjs';

export class WebRTCManager {
  constructor() {
    this.peer = null;
    this.peerId = null;
    this.displayKeyphrase = null; // User-friendly keyphrase for display
    this.connections = new Map(); // Map of peerId -> DataConnection
    this.connectionQuality = new Map(); // Map of peerId -> quality metrics
    this.dataCallbacks = [];
    this.connectionStateCallbacks = [];
    this.connectionQualityCallbacks = [];
    this.connectionStatus = 'disconnected';
    this.isReady = false; // Whether peer is ready to accept connections
    this.reconnectAttempts = new Map(); // Map of peerId -> attempt count
    this.reconnectTimers = new Map(); // Map of peerId -> timeout ID
    this.pendingConnections = new Map(); // Map of peerId -> connection promise
    this.connectionHandshakes = new Map(); // Map of peerId -> handshake state
    
    // Enhanced ICE servers with TURN for better NAT traversal
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // TURN servers (free public servers)
        { 
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        { 
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
      ],
      iceCandidatePoolSize: 10, // Pre-gather more candidates
    };
  }

  /**
   * Generate a short random peer ID for PeerJS (alphanumeric, 8-12 chars)
   * Keep the keyphrase for display purposes
   */
  generateShortPeerId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const length = 8 + Math.floor(Math.random() * 5); // 8-12 characters
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash a keyphrase to create a consistent, shorter peer ID
   */
  async hashKeyphrase(keyphrase) {
    // Use Web Crypto API to create a hash
    const encoder = new TextEncoder();
    const data = encoder.encode(keyphrase);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Take first 16 characters and convert to alphanumeric
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i += 2) {
      const byte = parseInt(hashHex.substr(i, 2), 16);
      result += chars[byte % chars.length];
    }
    
    return result;
  }

  async initializePeer(displayKeyphrase) {
    // Store display keyphrase for UI
    this.displayKeyphrase = displayKeyphrase;
    
    // Use hash of keyphrase as peer ID for consistency
    // This ensures the same keyphrase always maps to the same peer ID
    const shortPeerId = await this.hashKeyphrase(displayKeyphrase.toLowerCase().trim());
    
    console.log('Initializing peer with display keyphrase:', displayKeyphrase);
    console.log('Using hashed peer ID for PeerJS:', shortPeerId);
    
    return new Promise((resolve, reject) => {
      const initTimeout = setTimeout(() => {
        if (!this.peerId) {
          const error = new Error('Peer initialization timeout. Please check your internet connection.');
          this.connectionStatus = 'error';
          this.updateConnectionStatus('error', 'Initialization timeout');
          reject(error);
        }
      }, 15000); // Increased timeout to 15 seconds
      
      try {
        // Initialize PeerJS peer with short ID
        this.peer = new Peer(shortPeerId, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          config: this.config,
          debug: 1, // Reduced debug level
        });

        this.peer.on('open', (id) => {
          clearTimeout(initTimeout);
          this.peerId = id;
          this.isReady = true;
          this.connectionStatus = 'connected';
          this.updateConnectionStatus('connected', 'Ready to connect');
          console.log('PeerJS peer opened with ID:', id);
          
          // If the ID is different, log it
          if (id !== shortPeerId) {
            console.warn('PeerJS assigned different ID. Requested:', shortPeerId, 'Got:', id);
            this.peerId = id; // Use the assigned ID
          }
          
          resolve(id);
        });

        this.peer.on('connection', (dataConnection) => {
          console.log('Incoming connection from:', dataConnection.peer);
          this.handleIncomingConnection(dataConnection);
        });

        this.peer.on('error', (error) => {
          clearTimeout(initTimeout);
          console.error('PeerJS error:', error);
          
          // Handle specific error types
          if (error.type === 'peer-unavailable') {
            this.connectionStatus = 'error';
            this.updateConnectionStatus('error', 'Peer unavailable. Make sure the other device is online and ready.');
          } else if (error.type === 'network') {
            this.connectionStatus = 'error';
            this.updateConnectionStatus('error', 'Network error. Please check your internet connection.');
          } else {
            this.connectionStatus = 'error';
            this.updateConnectionStatus('error', `Connection error: ${error.message}`);
          }
          
          // Don't reject on all errors - some are recoverable
          if (error.type === 'peer-unavailable' || error.type === 'network') {
            // These are connection attempt errors, not initialization errors
            return;
          }
          
          const errorMsg = `WebRTC Error: ${error.type}\nMessage: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
          this.notifyError(errorMsg);
          
          if (!this.peerId) {
            // Only reject if we haven't initialized yet
            reject(error);
          }
        });

        this.peer.on('close', () => {
          console.log('PeerJS peer closed');
          this.connectionStatus = 'disconnected';
          this.isReady = false;
          this.updateConnectionStatus('disconnected', 'Connection closed');
        });

      } catch (error) {
        clearTimeout(initTimeout);
        console.error('Failed to initialize PeerJS:', error);
        this.connectionStatus = 'error';
        this.updateConnectionStatus('error', `Initialization failed: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Connect to a peer using their keyphrase
   * This will look up their short peer ID from a mapping
   * For now, we'll use a simple approach: both peers try to connect
   */
  async connectToPeer(peerIdKeyphrase, maxRetries = 3) {
    const normalizedKeyphrase = peerIdKeyphrase.toLowerCase().trim();
    
    console.log('Connecting to peer with keyphrase:', normalizedKeyphrase);
    
    if (!this.peer || !this.isReady) {
      throw new Error('Peer not ready. Please wait for peer to initialize.');
    }

    // For now, we'll use the keyphrase directly as peer ID
    // In a production system, you'd have a mapping service
    // But for P2P, we can use a hash or the keyphrase itself
    const targetPeerId = normalizedKeyphrase.replace(/[^a-z0-9-]/g, '').substring(0, 20);
    
    // Check if already connected
    if (this.connections.has(targetPeerId)) {
      console.log('Already connected to peer:', targetPeerId);
      return this.connections.get(targetPeerId);
    }

    // Check if connection is pending
    if (this.pendingConnections.has(targetPeerId)) {
      console.log('Connection already pending for:', targetPeerId);
      return this.pendingConnections.get(targetPeerId);
    }

    // Create connection promise
    const connectionPromise = this.attemptConnection(targetPeerId, maxRetries);
    this.pendingConnections.set(targetPeerId, connectionPromise);
    
    // Clean up pending connection after completion
    connectionPromise.finally(() => {
      this.pendingConnections.delete(targetPeerId);
    });

    return connectionPromise;
  }

  async attemptConnection(targetPeerId, maxRetries = 3) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      console.log(`Connection attempt ${attempt}/${maxRetries} to ${targetPeerId}`);
      
      try {
        const connection = await this.createConnection(targetPeerId);
        return connection;
      } catch (error) {
        console.warn(`Connection attempt ${attempt} failed:`, error.message);
        
        if (attempt >= maxRetries) {
          throw new Error(`Failed to connect after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Exponential backoff: wait 1s, 2s, 4s
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  createConnection(targetPeerId) {
    return new Promise((resolve, reject) => {
      let connectionTimeout;
      let hasResolved = false;
      let dataConnection = null;
      
      try {
        console.log('Creating data connection to:', targetPeerId);
        
        // Create data connection
        dataConnection = this.peer.connect(targetPeerId, {
          reliable: true,
          serialization: 'json',
        });

        if (!dataConnection) {
          reject(new Error('Failed to create data connection object'));
          return;
        }
        
        // Set up connection timeout (20 seconds)
        connectionTimeout = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            console.error('Connection timeout to:', targetPeerId);
            if (dataConnection) {
              dataConnection.close();
            }
            reject(new Error(`Connection timeout. The peer may not be online or may have a different ID.`));
          }
        }, 20000);

        // Connection opened successfully
        dataConnection.on('open', () => {
          if (hasResolved) return;
          hasResolved = true;
          clearTimeout(connectionTimeout);
          
          console.log('Data connection opened to:', targetPeerId);
          this.connections.set(targetPeerId, dataConnection);
          this.reconnectAttempts.delete(targetPeerId);
          this.updateConnectionStatus('connected', `Connected to peer`);
          
          // Start monitoring connection quality
          this.startQualityMonitoring(targetPeerId, dataConnection);
          
          // Send handshake message
          this.sendHandshake(targetPeerId, dataConnection);
          
          resolve(dataConnection);
        });

        // Handle incoming data
        dataConnection.on('data', (data) => {
          this.handleDataReceived(targetPeerId, data);
        });

        // Connection closed
        dataConnection.on('close', () => {
          clearTimeout(connectionTimeout);
          console.log('Data connection closed to:', targetPeerId);
          this.connections.delete(targetPeerId);
          this.connectionQuality.delete(targetPeerId);
          this.stopQualityMonitoring(targetPeerId);
          this.updateConnectionStatus('disconnected', `Disconnected from peer`);
          
          // Attempt reconnection if not manually closed
          if (!hasResolved) {
            this.attemptReconnection(targetPeerId);
          }
        });

        // Connection error
        dataConnection.on('error', (error) => {
          clearTimeout(connectionTimeout);
          console.error('Data connection error:', error);
          
          if (!hasResolved) {
            hasResolved = true;
            this.connections.delete(targetPeerId);
            reject(error);
          }
        });

      } catch (error) {
        clearTimeout(connectionTimeout);
        console.error('Failed to create connection:', error);
        reject(error);
      }
    });
  }

  sendHandshake(peerId, connection) {
    try {
      const handshake = {
        type: 'handshake',
        from: this.peerId,
        displayKeyphrase: this.displayKeyphrase,
        timestamp: Date.now(),
      };
      connection.send(JSON.stringify(handshake));
      console.log('Sent handshake to:', peerId);
    } catch (error) {
      console.error('Failed to send handshake:', error);
    }
  }

  handleIncomingConnection(dataConnection) {
    const peerId = dataConnection.peer;
    console.log('Handling incoming connection from:', peerId);
    
    // Set up data handler
    dataConnection.on('data', (data) => {
      this.handleDataReceived(peerId, data);
    });

    // Handle connection open
    dataConnection.on('open', () => {
      console.log('Incoming connection opened from:', peerId);
      this.connections.set(peerId, dataConnection);
      this.updateConnectionStatus('connected', `Connected to peer`);
      
      // Start monitoring connection quality
      this.startQualityMonitoring(peerId, dataConnection);
      
      // Send handshake response
      this.sendHandshake(peerId, dataConnection);
    });

    // Handle connection close
    dataConnection.on('close', () => {
      console.log('Incoming connection closed from:', peerId);
      this.connections.delete(peerId);
      this.connectionQuality.delete(peerId);
      this.stopQualityMonitoring(peerId);
      this.updateConnectionStatus('disconnected', `Disconnected from peer`);
    });

    // Handle connection error
    dataConnection.on('error', (error) => {
      console.error('Incoming connection error:', error);
      this.connections.delete(peerId);
    });
  }

  handleDataReceived(peerId, data) {
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Handle handshake
      if (parsedData.type === 'handshake') {
        console.log('Received handshake from:', peerId, 'Keyphrase:', parsedData.displayKeyphrase);
        // Trigger connection established callback
        this.updateConnectionStatus('connected', `Connected to ${parsedData.displayKeyphrase || peerId}`);
        return;
      }
      
      // Handle quality ping/pong
      if (parsedData.type === 'quality_ping') {
        this.handleQualityPing(parsedData, peerId);
        return;
      }
      
      if (parsedData.type === 'quality_pong') {
        this.handleQualityPong(parsedData, peerId);
        return;
      }
      
      // Forward to registered callbacks
      this.dataCallbacks.forEach(callback => {
        try {
          callback(parsedData, peerId);
        } catch (error) {
          console.error('Error in data callback:', error);
        }
      });
    } catch (error) {
      console.error('Failed to handle received data:', error);
    }
  }

  sendData(data) {
    if (!this.connections || this.connections.size === 0) {
      console.warn('No connections available to send data');
      return false;
    }

    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
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
        }
      } else {
        failCount++;
      }
    });

    if (failCount > 0 && successCount === 0) {
      console.error('Failed to send data to any peer');
      this.updateConnectionStatus('error', 'No active connections');
      return false;
    }

    return true;
  }

  startQualityMonitoring(peerId, connection) {
    if (!connection || !connection.open) {
      return;
    }

    const pingInterval = setInterval(() => {
      if (!this.connections.has(peerId)) {
        clearInterval(pingInterval);
        return;
      }

      const pingId = `${peerId}-${Date.now()}`;
      const pingMessage = {
        type: 'quality_ping',
        pingId: pingId,
        timestamp: Date.now(),
      };

      try {
        connection.send(JSON.stringify(pingMessage));
      } catch (error) {
        console.error('Failed to send quality ping:', error);
        clearInterval(pingInterval);
      }
    }, 2000); // Ping every 2 seconds

    // Store interval ID for cleanup
    if (!this.qualityIntervals) {
      this.qualityIntervals = new Map();
    }
    this.qualityIntervals.set(peerId, pingInterval);
  }

  stopQualityMonitoring(peerId) {
    if (this.qualityIntervals && this.qualityIntervals.has(peerId)) {
      clearInterval(this.qualityIntervals.get(peerId));
      this.qualityIntervals.delete(peerId);
    }
  }

  handleQualityPing(data, peerId) {
    const connection = this.connections.get(peerId);
    if (!connection || !connection.open) {
      return;
    }

    const pongMessage = {
      type: 'quality_pong',
      pingId: data.pingId,
      timestamp: Date.now(),
    };

    try {
      connection.send(JSON.stringify(pongMessage));
    } catch (error) {
      console.error('Failed to send quality pong:', error);
    }
  }

  handleQualityPong(data, peerId) {
    const connection = this.connections.get(peerId);
    if (!connection) {
      return;
    }

    const rtt = Date.now() - data.timestamp;
    this.updateConnectionQuality(peerId, connection, rtt);
  }

  updateConnectionQuality(peerId, connection, rtt) {
    let quality = 'poor';
    if (rtt < 50) {
      quality = 'excellent';
    } else if (rtt < 100) {
      quality = 'good';
    } else if (rtt < 200) {
      quality = 'fair';
    }

    const qualityData = {
      rtt: rtt,
      level: quality,
      timestamp: Date.now(),
    };

    this.connectionQuality.set(peerId, qualityData);

    // Notify callbacks
    this.connectionQualityCallbacks.forEach(callback => {
      try {
        callback(peerId, qualityData);
      } catch (error) {
        console.error('Error in quality callback:', error);
      }
    });
  }

  attemptReconnection(peerId) {
    const attempts = this.reconnectAttempts.get(peerId) || 0;
    const maxAttempts = 5;

    if (attempts >= maxAttempts) {
      console.log('Max reconnection attempts reached for:', peerId);
      return;
    }

    this.reconnectAttempts.set(peerId, attempts + 1);
    const delay = Math.min(1000 * Math.pow(2, attempts), 16000); // Exponential backoff

    console.log(`Scheduling reconnection attempt ${attempts + 1}/${maxAttempts} for ${peerId} in ${delay}ms`);

    const timeoutId = setTimeout(async () => {
      try {
        await this.connectToPeer(peerId, 1); // Single retry per reconnection attempt
      } catch (error) {
        console.error('Reconnection failed:', error);
        // Will retry again if max attempts not reached
      }
    }, delay);

    this.reconnectTimers.set(peerId, timeoutId);
  }

  cancelReconnection(peerId) {
    if (this.reconnectTimers.has(peerId)) {
      clearTimeout(this.reconnectTimers.get(peerId));
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

  onConnectionQualityChange(callback) {
    this.connectionQualityCallbacks.push(callback);
  }

  updateConnectionStatus(status, message) {
    this.connectionStatus = status;
    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback(status, message);
      } catch (error) {
        console.error('Error in connection state callback:', error);
      }
    });
  }

  notifyError(message) {
    // Error notification is handled by the app layer
    console.error(message);
  }

  getPeerId() {
    return this.peerId;
  }

  getDisplayKeyphrase() {
    return this.displayKeyphrase;
  }

  isPeerReady() {
    return this.isReady;
  }

  closeConnection() {
    // Cancel all reconnection attempts
    this.reconnectTimers.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.reconnectTimers.clear();
    this.reconnectAttempts.clear();
    this.pendingConnections.clear();

    // Close all connections
    this.connections.forEach((connection) => {
      try {
        connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    });
    this.connections.clear();

    // Stop all quality monitoring
    if (this.qualityIntervals) {
      this.qualityIntervals.forEach((interval) => {
        clearInterval(interval);
      });
      this.qualityIntervals.clear();
    }

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
    this.isReady = false;
    this.connectionStatus = 'disconnected';
  }
}
