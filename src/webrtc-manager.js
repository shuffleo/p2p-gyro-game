// WebRTC Manager using PeerJS
import Peer from 'peerjs';

export class WebRTCManager {
  constructor() {
    this.peer = null;
    this.peerId = null;
    this.connections = new Map(); // Map of peerId -> DataConnection
    this.dataCallbacks = [];
    this.connectionStateCallbacks = [];
    this.connectionStatus = 'disconnected';
    this.roomCode = null;
    
    // STUN servers for NAT traversal
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };
  }

  async initializePeer(roomCode, deviceId) {
    this.roomCode = roomCode;
    
    // Use room code + device ID as peer ID for uniqueness
    // PeerJS requires alphanumeric IDs, so we'll use the room code as base
    const peerId = `${roomCode}_${deviceId.slice(-8)}`;
    
    return new Promise((resolve, reject) => {
      try {
        // Initialize PeerJS peer
        this.peer = new Peer(peerId, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          config: this.config,
        });

        this.peer.on('open', (id) => {
          this.peerId = id;
          this.connectionStatus = 'connected';
          this.updateConnectionStatus('connected', 'Peer initialized');
          console.log('PeerJS peer opened with ID:', id);
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

  async connectToPeer(peerId) {
    if (!this.peer || !this.peer.open) {
      throw new Error('Peer not initialized');
    }

    if (this.connections.has(peerId)) {
      console.log('Already connected to peer:', peerId);
      return this.connections.get(peerId);
    }

    return new Promise((resolve, reject) => {
      try {
        // Create data connection
        const dataConnection = this.peer.connect(peerId, {
          reliable: true, // Use reliable data channel
        });

        if (!dataConnection) {
          reject(new Error('Failed to create data connection'));
          return;
        }

        dataConnection.on('open', () => {
          console.log('Data connection opened to:', peerId);
          this.connections.set(peerId, dataConnection);
          this.updateConnectionStatus('connected', `Connected to ${peerId.slice(-8)}`);
          resolve(dataConnection);
        });

        dataConnection.on('data', (data) => {
          this.handleDataReceived(peerId, data);
        });

        dataConnection.on('close', () => {
          console.log('Data connection closed to:', peerId);
          this.connections.delete(peerId);
          this.updateConnectionStatus('disconnected', `Disconnected from ${peerId.slice(-8)}`);
        });

        dataConnection.on('error', (error) => {
          console.error('Data connection error:', error);
          this.connections.delete(peerId);
          const errorMsg = `Connection error to ${peerId}: ${error.message}\n\nError details (copy for debugging):\n${JSON.stringify(error, null, 2)}`;
          this.notifyError(errorMsg);
          reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.connections.has(peerId)) {
            reject(new Error(`Connection timeout to ${peerId}`));
          }
        }, 10000);
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
      this.updateConnectionStatus('connected', `Connected to ${peerId.slice(-8)}`);
    });

    dataConnection.on('data', (data) => {
      this.handleDataReceived(peerId, data);
    });

    dataConnection.on('close', () => {
      console.log('Incoming data connection closed from:', peerId);
      this.connections.delete(peerId);
      this.updateConnectionStatus('disconnected', `Disconnected from ${peerId.slice(-8)}`);
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
    // Close all data connections
    this.connections.forEach((connection, peerId) => {
      try {
        connection.close();
      } catch (error) {
        console.error(`Error closing connection to ${peerId}:`, error);
      }
    });
    this.connections.clear();

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
