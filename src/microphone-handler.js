// Microphone Handler - Captures audio and calculates volume level
import { throttle } from './utils.js';

export class MicrophoneHandler {
  constructor() {
    this.isListening = false;
    this.callback = null;
    this.deviceId = null;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.volumeLevel = 0; // 0-1 normalized volume
    
    // Throttle data transmission to ~30fps (33ms interval) for audio
    this.throttledSend = throttle((data) => {
      if (this.callback) {
        this.callback(data);
      }
    }, 33);
  }

  async requestPermission() {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately (we'll create a new one in startListening)
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async startListening(callback, deviceId) {
    if (this.isListening) {
      console.warn('Microphone is already listening');
      return;
    }

    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      // Create data array for frequency data
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.callback = callback;
      this.deviceId = deviceId;
      this.isListening = true;

      // Start analyzing audio
      this.analyzeAudio();
      
      console.log('Microphone listening started');
    } catch (error) {
      console.error('Failed to start microphone:', error);
      throw error;
    }
  }

  analyzeAudio() {
    if (!this.isListening || !this.analyser) {
      return;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    
    // Normalize to 0-1 range (0-255 -> 0-1)
    this.volumeLevel = average / 255;

    // Format data for transmission
    const data = {
      type: 'audio_data',
      timestamp: Date.now(),
      volume: this.volumeLevel,
      deviceId: this.deviceId,
    };

    // Throttle transmission
    this.throttledSend(data);

    // Continue analyzing
    requestAnimationFrame(() => this.analyzeAudio());
  }

  stopListening() {
    if (!this.isListening) {
      return;
    }

    // Stop microphone stream
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.isListening = false;
    this.callback = null;
    this.volumeLevel = 0;
    
    console.log('Microphone listening stopped');
  }

  getVolumeLevel() {
    return this.volumeLevel;
  }

  getListeningState() {
    return this.isListening;
  }
}

