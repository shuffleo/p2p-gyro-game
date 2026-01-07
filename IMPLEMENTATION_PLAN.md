# P2P Lightsaber Game - Implementation Plan

This document reflects the **actual implementation** of the P2P Lightsaber Game.

## Overview

A peer-to-peer lightsaber game where mobile devices act as controllers, sending gyroscope, motion, and microphone data to desktop devices that visualize a 3D lightsaber using Three.js.

## Key Implementation Details

### Peer ID System
**Implementation**: Keyphrase-based peer IDs using niceware library
- Format: 6 words + 3 random numbers (e.g., "word1 word2 word3 word4 word5 word6 123")
- Auto-generated on page load
- Easy to share verbally or via copy-paste
- PeerJS compatibility: spaces converted to hyphens for WebRTC

### Connection Flow
**Implementation**:
1. Page loads → Auto-generate peer ID keyphrase
2. Display peer ID with copy button
3. User enters other device's peer ID
4. Click "Connect" → WebRTC establishes direct connection
5. Once connected → Show game screen with visualization
6. Mobile: Initialize sensors (gyroscope, motion, microphone)
7. Desktop: Initialize lightsaber visualization

### Data Protocol

```javascript
// Gyroscope Data
{
  type: 'gyro_data',
  timestamp: number,
  alpha: number,  // Z-axis rotation (0-360)
  beta: number,   // X-axis rotation (-180 to 180)
  gamma: number,  // Y-axis rotation (-90 to 90)
  deviceId: string
}

// Motion Data
{
  type: 'motion_data',
  timestamp: number,
  acceleration: { x, y, z },
  velocity: { x, y, z },
  speed: number,
  rotationRate: { alpha, beta, gamma },
  deviceId: string
}

// Audio Data
{
  type: 'audio_data',
  timestamp: number,
  volume: number,  // 0-1 normalized
  deviceId: string
}
```

### Component Architecture

#### App (main.js)
- **Responsibilities**: 
  - Orchestrates all components
  - Handles user interactions
  - Manages application lifecycle
  - Coordinates WebRTC, sensors, and visualization
- **Key Methods**:
  - `initializeRoom()` - Auto-generates peer ID, initializes WebRTC
  - `connectToPeer()` - Connects to another peer via keyphrase
  - `initializeMobileSensors()` - Sets up gyroscope, motion, microphone
  - `initializeVisualization()` - Sets up Three.js lightsaber scene
  - `handleDataReceived()` - Routes data to visualization
  - `disconnect()` - Cleanup all resources

#### WebRTCManager (webrtc-manager.js)
- **Implementation**:
  - Uses PeerJS cloud signaling (0.peerjs.com)
  - STUN servers: Google public servers
  - Peer ID format: keyphrase with spaces → hyphens
  - Reliable data channels
  - Connection state tracking
- **Key Features**:
  - Direct peer-to-peer connections (no room-based discovery)
  - Connection quality monitoring (RTT, quality levels)
  - Error recovery and connection cleanup
  - Data transmission with error handling

#### GyroscopeHandler (gyroscope-handler.js)
- **Implementation**:
  - Auto-request permission on mobile
  - Throttled data transmission (60fps = 16ms interval)
  - Data normalization (handles null values)
- **Key Features**:
  - iOS 13+ permission handling
  - Chrome permission auto-grant
  - Event listener management

#### MotionHandler (motion-handler.js)
- **Implementation**:
  - DeviceMotionEvent API for acceleration/velocity
  - Calculates speed from velocity magnitude
  - Rotation rate detection
- **Key Features**:
  - Motion permission handling
  - Velocity integration from acceleration
  - Speed calculation for dynamic responsiveness

#### MicrophoneHandler (microphone-handler.js)
- **Implementation**:
  - MediaDevices API for microphone access
  - AudioContext + AnalyserNode for volume detection
  - Frequency analysis for volume calculation
- **Key Features**:
  - Microphone permission handling
  - Real-time volume level (0-1 normalized)
  - Throttled transmission (30fps = 33ms interval)

#### LightsaberVisualization (lightsaber-visualization.js)
- **Implementation**:
  - Three.js WebGL renderer
  - Lightsaber hilt (dark metallic cylinder with details)
  - Lightsaber blade (multiple layers for glow effect):
    - Inner core (bright, opaque)
    - Outer glow 1 (semi-transparent)
    - Outer glow 2 (more transparent)
  - Smooth rotation interpolation
  - Dynamic blade length based on microphone volume
- **Key Features**:
  - Ambient + point lighting
  - Smooth animation loop
  - Coordinate system mapping: alpha→Y, beta→X, gamma→Z
  - Blade length: base length + (volume × max extension)

#### KeyphraseGenerator (keyphrase-generator.js)
- **Implementation**:
  - Uses niceware library for word generation
  - Generates 12 random bytes → 6 words
  - Adds 3 random digits (100-999)
- **Key Features**:
  - Memorable keyphrases (easier to share than random strings)
  - Validation and normalization functions
  - Format: "word1 word2 word3 word4 word5 word6 123"

#### DeviceDetector (device-detector.js)
- **Implementation**:
  - Multi-factor mobile detection (UA + touch + screen size)
  - Persistent device ID in localStorage
  - Gyroscope capability detection
- **Key Features**:
  - Fallback device ID generation
  - Screen dimension tracking

### UI Flow

1. **Homepage Screen**: 
   - Auto-generates peer ID on load
   - Displays peer ID with copy button
   - Input field for entering other peer ID
   - "Connect" button
   - Connection status indicator

2. **Game Screen (Desktop)**: 
   - Full-screen 3D canvas with lightsaber
   - Status overlay with:
     - Connection status
     - RTT (Round Trip Time)
     - Quality level (excellent/good/fair/poor)
     - Connected peers count
     - Peer ID display
   - Disconnect button

3. **Game Screen (Mobile)**: 
   - Permission requests (gyroscope, motion, microphone)
   - Connection status
   - Peer ID display
   - Disconnect button

### Connection Quality Monitoring

**Implementation**: RTT-based quality measurement
- Sends quality ping every 2 seconds
- Calculates RTT from ping to pong response
- Quality levels:
  - **Excellent**: RTT < 50ms 🟢
  - **Good**: RTT < 100ms 🟢
  - **Fair**: RTT < 200ms 🟡
  - **Poor**: RTT >= 200ms 🔴

### Performance Optimizations

1. **Gyroscope Throttling**: 60fps limit (16ms interval)
2. **Motion Throttling**: 60fps limit (16ms interval)
3. **Audio Throttling**: 30fps limit (33ms interval)
4. **Rotation Smoothing**: Lerp interpolation (0.15 factor)
5. **Blade Length Smoothing**: Lerp interpolation (0.1 factor)
6. **Canvas Optimization**: Pixel ratio capped at 2
7. **Memory Management**: Proper cleanup on disconnect

### Known Limitations

1. **Direct Connections Only**: No automatic peer discovery (manual peer ID entry required)
2. **Browser Support**: Chrome only (as specified)
3. **PeerJS Free Tier**: May have connection limits
4. **NAT Traversal**: Some networks may block P2P (STUN helps but not 100%)
5. **iOS Permission**: Requires user gesture for permission requests
6. **Microphone Access**: Requires HTTPS (or localhost for development)

### Error Handling

- All errors use `showErrorWithCopy()` utility
- Automatically copies error details to clipboard
- Includes timestamp, browser info, and full error object
- Alert dialogs with copy functionality

### Connection Status States

1. `connecting` - Yellow indicator, "Connecting..."
2. `connected` - Green indicator, "Connected"
3. `disconnected` - Gray indicator, "Disconnected"
4. `error` - Red indicator, error message

## Technical Decisions

### Why Keyphrases Instead of Random Strings?
- **Shareability**: Easier to communicate verbally or via text
- **Memorability**: Words are easier to remember than random alphanumeric strings
- **User Experience**: More friendly and approachable

### Why Direct P2P Instead of Room-Based?
- **Simplicity**: No need for room management or discovery mechanisms
- **Flexibility**: Works with static hosting (GitHub Pages)
- **Direct Control**: Users explicitly choose who to connect to

### Why Three Layers for Lightsaber Blade?
- **Glow Effect**: Multiple semi-transparent layers create realistic glow
- **Visual Appeal**: More visually impressive than single cylinder
- **Performance**: Minimal performance impact with proper optimization

### Why Separate Motion Handler?
- **Additional Data**: Motion provides speed/acceleration not available from gyroscope
- **Dynamic Responsiveness**: Speed affects how quickly lightsaber responds
- **Future Extensibility**: Can add more motion-based features

## Future Enhancements

1. Multiple lightsaber colors/styles
2. Sound effects (swoosh, hum, clash)
3. Multiple lightsabers (multiplayer)
4. Enhanced connection quality metrics (packet loss, bandwidth)
5. Lightsaber trail effects
6. Haptic feedback on mobile
7. Gesture recognition (swing patterns)

## Testing Considerations

- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **Manual Tests**: Multi-device connection testing
- **Performance Tests**: Frame rate, latency, memory usage
