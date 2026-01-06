# P2P Gyroscope Game

A peer-to-peer (P2P) gyroscope-based game where mobile devices act as controllers, sending gyroscope data to desktop devices that visualize it in 3D using Three.js.

## Features

- **WebRTC P2P Communication**: Real-time data transfer using PeerJS
- **3D Visualization**: Three.js rendering of gyroscope data (visible in waiting room and game screen)
- **QR Code Support**: Generate QR codes for easy room joining, scan QR codes to join rooms
- **Room-based System**: Create/join rooms with 8-24 digit alphanumeric codes
- **Device Constraints**: Max 3 devices per room, max 1 mobile device
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Connection Quality Indicators**: Real-time connection quality monitoring
- **Automatic Peer Discovery**: Devices in the same room automatically discover and connect
- **Force Delete Room**: Clear room data to start fresh with the same room code
- **Chrome Optimized**: Built for Chrome browser

## Technology Stack

- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **PeerJS**: WebRTC library with cloud signaling
- **Three.js**: 3D graphics library
- **DeviceOrientationEvent API**: Gyroscope data access

## Development

### Prerequisites

- Node.js 18+ and npm
- Chrome browser (latest version)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open in Chrome: `http://localhost:3000`

### Build

Build for production:
```bash
npm run build
```

Output will be in the `dist/` directory.

## Deployment

This project uses GitHub Actions to automatically deploy to GitHub Pages.

### Automatic Deployment

The project is configured with GitHub Actions workflow (`.github/workflows/deploy.yml`) that:
- Automatically builds and deploys on every push to `main` branch
- Can be manually triggered from the Actions tab

### Setup GitHub Pages (One-time)

1. Go to repository Settings → Pages
2. Under "Source", select "GitHub Actions"
3. The workflow will automatically deploy on the next push to `main`

### Manual Deployment (Alternative)

If you prefer manual deployment:

1. Build the project: `npm run build`
2. The `dist/` directory contains the production build
3. Configure GitHub Pages to serve from the `dist/` directory

### Access the Deployed Site

Once deployed, the site will be available at:
**https://shuffleo.github.io/p2p-gyro-game/**

Repository: https://github.com/shuffleo/p2p-gyro-game.git

## Additional Features

### Force Delete Room

If you need to clear a room and start fresh (useful for reusing room codes):

1. While in a room (waiting room or game screen)
2. Click the "Force Delete" button
3. Confirm the deletion
4. All devices will be disconnected and room data will be cleared
5. You can now create a new room with the same code

### QR Code Management

- **Generating QR Codes**: QR codes are automatically generated when you create a room
- **QR Code Display**: QR codes are shown in the waiting room and remain available throughout the session
- **Scanning QR Codes**: Use the "Scan QR Code" button on the landing page to scan and join rooms
- **Camera Access**: QR scanning requires camera permissions - grant access when prompted

## Usage

### Mobile Device (Controller)

1. Open the app in Chrome on your mobile device
2. **Option A**: Enter the room code manually
   - Type the 8-24 digit alphanumeric room code
   - Click "Join Room"
3. **Option B**: Scan QR code (Recommended)
   - Click "Scan QR Code" button
   - Allow camera access when prompted
   - Point camera at the QR code displayed on desktop
   - Room will join automatically after scanning
4. Grant permission for device orientation access
5. The device will start sending gyroscope data automatically
6. Tilt and rotate your device to control the 3D box on desktop screens
7. Your Peer ID is displayed on the mobile screen for reference

### Desktop Device (Viewer)

1. Open the app in Chrome on your desktop
2. **Option A**: Create a new room
   - Click "Create Room" to generate a room code
   - Room will be created and QR code will be displayed automatically
3. **Option B**: Join existing room
   - Enter the room code manually, or
   - Scan the QR code using "Scan QR Code" button
4. Wait in the waiting room - 3D visualization starts immediately
5. Wait for mobile device to connect (automatic peer discovery)
6. Watch the 3D box rotate based on mobile device's gyroscope data
7. QR code remains available in the waiting room for other devices to scan

### Constraints

- Maximum 3 devices per room
- Maximum 1 mobile device per room

## Features

- ✅ Real-time P2P communication via WebRTC (PeerJS)
- ✅ Automatic peer discovery within rooms
- ✅ QR code generation and scanning for easy room joining
- ✅ Gyroscope data collection from mobile devices
- ✅ 3D visualization with Three.js (rectangular box)
  - Visualization starts in waiting room (desktop)
  - Visualization available on mobile devices
- ✅ Room-based system with constraints
- ✅ Connection quality indicators (RTT monitoring)
- ✅ Force delete room functionality
- ✅ Mobile Peer ID display
- ✅ Error handling with copy-to-clipboard for debugging
- ✅ Responsive mobile-first UI
- ✅ Automatic GitHub Pages deployment

## Browser Support

- **Chrome only** (latest version recommended)
- WebRTC and DeviceOrientationEvent APIs required

## Project Structure

```
p2p-gyro-game/
├── src/
│   ├── main.js              # Application entry point
│   ├── ui-manager.js        # UI state management
│   ├── room-manager.js      # Room management
│   ├── device-detector.js   # Device detection
│   ├── webrtc-manager.js    # WebRTC connection handling
│   ├── gyroscope-handler.js # Gyroscope data collection
│   ├── visualization.js     # Three.js 3D visualization
│   ├── qr-manager.js        # QR code generation and scanning
│   ├── utils.js             # Utility functions
│   └── styles.css           # Tailwind CSS
├── dist/                    # Build output
├── index.html               # Entry HTML
└── package.json
```

## Implementation Status

- ✅ Project Setup & Basic UI
- ✅ Room Management System
- ✅ WebRTC Integration (PeerJS)
- ✅ Gyroscope Data Collection
- ✅ Three.js Visualization
- ✅ Integration & Polish
- ✅ Deployment (GitHub Actions)

## License

MIT

