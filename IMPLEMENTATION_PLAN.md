# P2P Gyroscope Game - Implementation Plan

## 0. Key Decisions Summary

**Technology Choices:**
- **WebRTC Signaling**: PeerJS with free cloud signaling service (works with GitHub Pages)
- **CSS Framework**: Tailwind CSS
- **Build Tool**: npm + Vite
- **3D Visualization**: Three.js with simple rectangular box
- **Room Codes**: Generate by default, allow custom entry (8-24 alphanumeric)
- **Room Persistence**: localStorage
- **Permission Handling**: Auto-request with fallback button
- **Error Handling**: Simple alert() dialogs with copy-to-clipboard button
- **Connection Status**: Visual indicators for connection states
- **Browser Support**: Chrome only
- **Repository**: https://github.com/shuffleo/p2p-gyro-game.git

## 1. Project Overview

A peer-to-peer (P2P) gyroscope-based game where:
- Mobile devices act as controllers, sending gyroscope data
- Desktop/other devices receive and visualize the data in 3D using Three.js
- Communication happens via WebRTC for real-time, low-latency data transfer
- Game rooms are created using 8-24 digit alphanumeric codes
- Hosted as a static page on GitHub Pages

## 2. Technology Stack

### Core Technologies
- **HTML5/CSS3/JavaScript (ES6+)**: Core web technologies
- **WebRTC**: Peer-to-peer communication
  - **PeerJS**: WebRTC library with free cloud-based signaling service (works with GitHub Pages)
  - **STUN/TURN servers**: Google and Mozilla public STUN servers for NAT traversal
- **Three.js**: 3D graphics visualization
- **DeviceOrientationEvent API**: Access to gyroscope data on mobile devices
- **CSS Framework**: 
  - **Tailwind CSS**: Utility-first CSS framework for responsive UI

### Build Tools
- **npm**: Package management
- **Vite**: Modern build tool and dev server (faster than Webpack)

### Additional Libraries
- **UUID Generator**: For generating unique room codes
- **Connection status indicators**: Visual feedback for WebRTC connection states

## 3. Architecture Design

### 3.1 System Architecture

```
┌─────────────┐
│  Mobile     │  (Gyroscope Controller)
│  Device     │  ───────┐
└─────────────┘         │
                        │ WebRTC
┌─────────────┐         │ P2P Connection
│  Desktop    │  ◄──────┼───┐
│  Device 1   │         │   │
└─────────────┘         │   │
                        │   │
┌─────────────┐         │   │
│  Desktop    │  ◄──────┼───┘
│  Device 2   │         │
└─────────────┘         │
                        │
              ┌─────────┴─────────┐
              │  Signaling Server │
              │  (STUN/TURN)      │
              └───────────────────┘
```

### 3.2 Data Flow

1. **Room Creation**: User enters code → Validates → Creates/Joins room
2. **Device Registration**: Device connects → Identifies as mobile/desktop → Registers in room
3. **P2P Connection**: Devices exchange WebRTC offers/answers via signaling
4. **Data Transmission**: Mobile device sends gyroscope data → Desktop devices receive → Render in 3D

## 4. Project Structure

```
p2p-gyro-game/
├── index.html                 # Main entry point
├── src/
│   ├── main.js               # Application entry point
│   ├── room-manager.js       # Room creation/joining logic
│   ├── webrtc-manager.js     # WebRTC connection handling (PeerJS)
│   ├── gyroscope-handler.js  # Mobile gyroscope data collection
│   ├── visualization.js      # Three.js 3D visualization
│   ├── device-detector.js    # Detect mobile vs desktop
│   ├── ui-manager.js         # UI state management
│   └── utils.js              # Utility functions
├── dist/                      # Build output (for GitHub Pages)
├── assets/
│   └── (optional assets)
├── README.md
├── IMPLEMENTATION_PLAN.md
├── package.json
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── .gitignore
```

## 5. Implementation Components

### Project Setup & Basic UI

1. **Initialize Project**
   - Set up npm project with package.json
   - Install and configure Vite as build tool
   - Install and configure Tailwind CSS
   - Set up project structure (src/, dist/)
   - Configure GitHub Pages deployment

2. **Create UI Components**
   - Room code input screen (with generate/custom entry options)
   - Waiting room screen
   - Game visualization screen
   - Connection status indicators
   - Mobile permission request UI (auto-request with fallback button)

3. **Responsive Design with Tailwind**
   - Mobile-first approach using Tailwind utilities
   - Touch-friendly buttons on mobile (min 44x44px)
   - Desktop-optimized layout
   - Chrome-only optimizations

### Room Management System

1. **Room Code System**
   - Generate random 8-24 digit alphanumeric codes by default
   - Allow custom code entry (validate format)
   - Validate room codes (alphanumeric, 8-24 characters)
   - Room state management (active rooms, device counts)
   - Store room codes in localStorage for persistence

2. **Device Registration**
   - Detect device type (mobile vs desktop) - Chrome only
   - Enforce constraints:
     - Max 3 devices per room
     - Max 1 mobile device per room
   - Device role assignment (controller vs viewer)
   - Show clear error messages when constraints violated

3. **Room State Management**
   - Track connected devices
   - Handle device disconnections
   - Room cleanup when empty
   - Persist room state in localStorage

### WebRTC Integration

1. **Signaling Setup with PeerJS**
   - Integrate PeerJS library (uses free cloud signaling service)
   - Configure PeerJS with room code as peer ID
   - Set up STUN servers (Google, Mozilla public servers)
   - Implement peer discovery and connection
   - Handle offer/answer exchange automatically (PeerJS handles this)

2. **P2P Connection Management**
   - Establish mesh connections between all devices in room
   - Handle connection failures with retry logic
   - Implement connection state monitoring
   - Display connection status indicators (connecting, connected, disconnected, error)
   - Handle ICE connection state changes

3. **Data Channel Setup**
   - Create reliable data channels via PeerJS
   - Implement message protocol for gyroscope data
   - Error handling with alert dialogs (include copy button for error messages)
   - Retry logic for failed transmissions

### Gyroscope Data Collection

1. **Permission Handling**
   - Auto-request device orientation permission on room join (Chrome)
   - Fallback to manual button if auto-request fails (iOS 13+ requirement)
   - Handle permission denial gracefully with clear instructions
   - Show error alerts with copy button for debugging

2. **Data Collection**
   - Listen to `deviceorientation` events (Chrome mobile)
   - Extract alpha, beta, gamma values
   - Normalize and filter data
   - Throttle data transmission (60fps max to avoid network overload)

3. **Data Format**
   ```javascript
   {
     type: 'gyro',
     timestamp: Date.now(),
     alpha: number,  // Z-axis rotation
     beta: number,   // X-axis rotation
     gamma: number,  // Y-axis rotation
     deviceId: string
   }
   ```

### Three.js Visualization

1. **Scene Setup**
   - Initialize Three.js scene, camera, renderer
   - Responsive canvas sizing (full viewport on desktop)
   - Lighting setup (ambient + directional light)
   - Background/environment (simple gradient or solid color)

2. **3D Object Representation**
   - Create simple rectangular box (BoxGeometry) representing mobile device
   - Apply gyroscope rotations (alpha, beta, gamma) to the box
   - Smooth interpolation for visual continuity (lerp rotations)
   - Add basic materials and colors for visual appeal

3. **Real-time Updates**
   - Receive gyroscope data via WebRTC data channels
   - Apply rotations to 3D box object
   - Optimize rendering performance (requestAnimationFrame)
   - Handle data loss/network issues gracefully (freeze last known position)

### Integration & Polish

1. **End-to-End Testing**
   - Test room creation/joining (generated and custom codes)
   - Test P2P connections via PeerJS
   - Test gyroscope data flow (mobile to desktop)
   - Test on multiple devices simultaneously (max 3, max 1 mobile)
   - Test localStorage persistence
   - Chrome-only testing

2. **Error Handling**
   - Network failures (alert with copy button)
   - Device disconnections (alert with copy button)
   - Permission denials (alert with copy button + instructions)
   - Invalid room codes (alert with copy button)
   - Room capacity exceeded (alert with copy button)
   - All error dialogs include copy-to-clipboard functionality

3. **UI/UX Improvements**
   - Loading states for connections
   - Connection status indicators (visual feedback)
   - Smooth transitions between screens
   - Help/instructions for first-time users
   - Copy button in all error alerts

4. **Performance Optimization**
   - Vite build optimization (minification, tree-shaking)
   - Asset optimization
   - Code splitting if needed
   - Debouncing/throttling for gyroscope data

### Deployment

1. **GitHub Pages Setup**
   - Configure repository: https://github.com/shuffleo/p2p-gyro-game.git
   - Set up Vite build process (output to dist/)
   - Configure GitHub Pages to serve from dist/ directory
   - Set up GitHub Actions for automatic deployment
   - Test deployment and verify HTTPS (required for WebRTC)

2. **Documentation**
   - Update README with setup instructions
   - Add usage guide
   - Document Chrome-only requirement
   - Document known limitations (GitHub Pages constraints, PeerJS free tier limits)

## 6. Detailed Component Specifications

### 6.1 Room Manager (`room-manager.js`)

**Responsibilities:**
- Generate unique room codes (8-24 alphanumeric)
- Validate room codes
- Track active rooms and connected devices
- Enforce room constraints (max 3 devices, max 1 mobile)

**Key Functions:**
```javascript
class RoomManager {
  generateRoomCode(minLength, maxLength)
  validateRoomCode(code)
  createRoom(code)
  joinRoom(code, deviceInfo)
  leaveRoom(code, deviceId)
  getRoomInfo(code)
  isRoomFull(code)
  canAddMobileDevice(code)
}
```

### 6.2 WebRTC Manager (`webrtc-manager.js`)

**Responsibilities:**
- Establish P2P connections using PeerJS
- Handle peer discovery via PeerJS cloud signaling
- Manage data channels
- Handle connection lifecycle
- Monitor and report connection status

**Key Functions:**
```javascript
class WebRTCManager {
  initializePeer(roomCode)
  connectToPeer(peerId)
  sendData(data)
  onDataReceived(callback)
  onConnectionStateChange(callback)
  closeConnection()
  getConnectionState()
  getConnectionStatus() // Returns: 'connecting', 'connected', 'disconnected', 'error'
}
```

**Implementation:**
- Uses **PeerJS** with free cloud signaling service
- Each device creates a Peer with room code as identifier
- Devices discover each other via PeerJS signaling
- Data channels established automatically by PeerJS

### 6.3 Gyroscope Handler (`gyroscope-handler.js`)

**Responsibilities:**
- Request device orientation permission
- Collect gyroscope data
- Normalize and format data
- Send data via WebRTC

**Key Functions:**
```javascript
class GyroscopeHandler {
  requestPermission()
  startListening(callback)
  stopListening()
  normalizeData(alpha, beta, gamma)
  formatDataForTransmission(data)
}
```

**Data Collection:**
- Use `DeviceOrientationEvent` API
- Fallback to `DeviceMotionEvent` if needed
- Handle iOS 13+ permission requirements
- Throttle to ~60fps to avoid overwhelming network

### 6.4 Visualization (`visualization.js`)

**Responsibilities:**
- Initialize Three.js scene
- Create simple rectangular box (BoxGeometry)
- Update box rotations based on gyroscope data
- Handle responsive resizing
- Smooth interpolation for visual continuity

**Key Functions:**
```javascript
class Visualization {
  initScene(container)
  createBox() // Creates simple rectangular box
  updateRotation(alpha, beta, gamma)
  animate()
  resize(width, height)
  dispose()
}
```

**3D Model:**
- Simple rectangular box (BoxGeometry) representing mobile device
- Basic materials (MeshStandardMaterial or MeshPhongMaterial)
- Smooth rotation interpolation using lerp

### 6.5 Device Detector (`device-detector.js`)

**Responsibilities:**
- Detect if device is mobile or desktop
- Check for gyroscope support
- Identify device capabilities

**Key Functions:**
```javascript
class DeviceDetector {
  isMobile()
  hasGyroscope()
  getDeviceInfo()
  canActAsController()
}
```

## 7. Data Protocol

### 7.1 Message Types

```javascript
// Room Management Messages
{
  type: 'room_join',
  roomCode: string,
  deviceId: string,
  deviceType: 'mobile' | 'desktop',
  timestamp: number
}

{
  type: 'room_leave',
  roomCode: string,
  deviceId: string
}

// Gyroscope Data Messages
{
  type: 'gyro_data',
  alpha: number,
  beta: number,
  gamma: number,
  timestamp: number,
  deviceId: string
}

// Control Messages
{
  type: 'connection_ready',
  deviceId: string
}

{
  type: 'error',
  message: string,
  code: string
}
```

## 8. UI/UX Design Considerations

### 8.1 Screen Flow

1. **Landing Screen**
   - Room code input field
   - "Create Room" button (generates code)
   - "Join Room" button (uses entered code)
   - Instructions/help link

2. **Waiting Room Screen**
   - Room code display (with copy button)
   - Connected devices list
   - "Start Game" button (when ready)
   - QR code for easy sharing (optional)

3. **Game Screen (Desktop)**
   - 3D visualization canvas (fullscreen or large)
   - Connection status indicator
   - Device list sidebar
   - Exit room button

4. **Game Screen (Mobile)**
   - Permission request overlay
   - Connection status
   - "Stop Sending" button
   - Exit room button

### 8.2 Responsive Breakpoints

- **Mobile**: < 768px
  - Single column layout
  - Large touch targets (44x44px minimum)
  - Full-width inputs

- **Tablet**: 768px - 1024px
  - Two-column layout possible
  - Medium-sized touch targets

- **Desktop**: > 1024px
  - Multi-column layout
  - Hover states
  - Keyboard navigation

## 9. Constraints & Edge Cases

### 9.1 Room Constraints
- **Max 3 devices**: Reject 4th device with clear error message
- **Max 1 mobile**: Reject 2nd mobile device with clear error message
- **Room code validation**: Only alphanumeric, 8-24 characters

### 9.2 Network Constraints
- **NAT/Firewall issues**: Use STUN servers (Google, Mozilla public servers) via PeerJS
- **Connection failures**: Retry logic with exponential backoff, show error alerts with copy button
- **Data loss**: Implement sequence numbers for data integrity (optional for MVP)
- **Latency**: Optimize data transmission frequency (throttle to 60fps)
- **PeerJS free tier limits**: May have connection limits, document in README

### 9.3 Device Constraints
- **No gyroscope**: Show error alert with copy button, suggest using different device
- **Permission denied**: Clear instructions in alert, fallback button for manual request
- **iOS 13+**: Auto-request on room join, fallback to button if needed
- **Browser compatibility**: Chrome only - document requirement clearly
- **Chrome-specific features**: Use Chrome-only APIs, no cross-browser fallbacks needed

## 10. Testing Strategy

### 10.1 Unit Tests
- Room code generation/validation
- Device detection logic
- Data normalization functions
- Message protocol handling

### 10.2 Integration Tests
- Room creation/joining flow
- WebRTC connection establishment
- Data transmission end-to-end
- Device constraint enforcement

### 10.3 Manual Testing Scenarios
1. Create room on desktop, join on mobile
2. Create room on mobile, join on desktop
3. Multiple desktop devices joining same room
4. Attempt to add 4th device (should fail)
5. Attempt to add 2nd mobile (should fail)
6. Mobile device disconnects (desktop should handle gracefully)
7. Network interruption recovery
8. Permission denial handling

## 11. Deployment Checklist

- [ ] Code minified and optimized
- [ ] All assets optimized
- [ ] GitHub repository created
- [ ] GitHub Pages enabled
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled (required for WebRTC)
- [ ] Cross-browser testing completed
- [ ] Mobile device testing completed
- [ ] README updated with instructions
- [ ] Error handling tested
- [ ] Performance tested

## 12. Future Enhancements (Post-MVP)

- Multiple game modes (different visualizations)
- Multiple mobile controllers (increase limit)
- Game history/recordings
- Custom 3D models
- Sound effects
- Multi-room spectator mode
- Leaderboards
- Social sharing features

## 13. Known Limitations

1. **Signaling Server**: Using PeerJS free cloud service (may have rate limits)
2. **NAT Traversal**: Some networks may block P2P connections (STUN servers help but not 100%)
3. **Browser Support**: Chrome only - no cross-browser compatibility
4. **iOS Safari**: Requires user gesture for permission (handled with fallback button)
5. **Room Persistence**: Rooms stored in localStorage (per-device, not shared across devices)
6. **No Authentication**: Anyone with room code can join
7. **GitHub Pages**: Static hosting only - no server-side logic possible
8. **PeerJS Free Tier**: May have connection limits or rate limits
9. **Peer Discovery**: Manual peer ID entry required (no automatic discovery mechanism)

## 14. Actual Implementation Details

### Peer Discovery Mechanism
**Implementation**: Manual peer ID entry
- Each device generates peer ID: `{roomCode}_{deviceIdSuffix}`
- Peer IDs displayed in waiting room UI
- Users manually copy/paste peer IDs to connect
- **Note**: Simplified approach for static hosting compatibility

### Data Protocol (Actual)
```javascript
// Gyroscope Data
{
  type: 'gyro_data',
  timestamp: number,
  alpha: number,  // Z-axis (0-360)
  beta: number,   // X-axis (-180 to 180)
  gamma: number,  // Y-axis (-90 to 90)
  deviceId: string
}
```

### Component Implementation Details

#### App (main.js)
- Orchestrates all components
- Manages application lifecycle
- Coordinates WebRTC, gyroscope, and visualization
- Handles connection state changes
- Routes gyroscope data to visualization

#### RoomManager
- In-memory room storage (Map)
- localStorage persistence
- Device tracking with timestamps
- Automatic room cleanup

#### WebRTCManager
- PeerJS cloud signaling (0.peerjs.com)
- STUN servers: Google public servers
- Peer ID format: `{roomCode}_{deviceIdSuffix}`
- Reliable data channels
- Connection state tracking

#### GyroscopeHandler
- Auto-request permission on mobile join
- Fallback manual permission button
- Throttled transmission (60fps = 16ms)
- Data normalization (handles null values)

#### Visualization
- Three.js WebGL renderer
- BoxGeometry (2x3x0.5) representing device
- Smooth rotation interpolation (lerp 0.1 factor)
- Responsive canvas sizing
- Edge lines for visibility

### Testing
- **Test Framework**: Vitest
- **Test Environment**: happy-dom
- **Coverage**: Unit tests for core components
- **Test Files**: 
  - `tests/room-manager.test.js` - Room management tests
  - `tests/utils.test.js` - Utility function tests
  - `tests/device-detector.test.js` - Device detection tests
- **Test Status**: ✅ All 47 tests passing

## 14. Estimated Timeline

- **Project Setup**: 1-2 days (npm, Vite, Tailwind setup)
- **Room Management**: 2-3 days (Room management with localStorage)
- **WebRTC Integration**: 3-4 days (PeerJS integration)
- **Gyroscope Data Collection**: 2-3 days (Gyroscope with auto-request + fallback)
- **Three.js Visualization**: 3-4 days (Three.js box visualization)
- **Integration & Polish**: 2-3 days (Error handling with copy buttons, status indicators)
- **Deployment**: 1 day (GitHub Pages deployment)

**Total: 14-20 days** (assuming 1 developer, full-time)

## 15. Resources & References

- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [DeviceOrientationEvent API](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent)
- [Three.js Documentation](https://threejs.org/docs/)
- [PeerJS Documentation](https://peerjs.com/) - **Primary WebRTC library**
- [PeerJS GitHub](https://github.com/peers/peerjs)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Repository](https://github.com/shuffleo/p2p-gyro-game.git)

---

**Next Steps:**
1. Review and approve this plan
2. Set up project structure
3. Begin implementation
4. Iterate based on testing and feedback

