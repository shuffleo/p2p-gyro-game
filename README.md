# P2P Gyroscope Game

A peer-to-peer (P2P) gyroscope-based game where mobile devices act as controllers, sending gyroscope data to desktop devices that visualize it in 3D using Three.js.

## Features

- **WebRTC P2P Communication**: Real-time data transfer using PeerJS
- **3D Visualization**: Three.js rendering of gyroscope data
- **Room-based System**: Create/join rooms with 8-24 digit alphanumeric codes
- **Device Constraints**: Max 3 devices per room, max 1 mobile device
- **Responsive Design**: Mobile-first UI with Tailwind CSS
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

This project is configured for GitHub Pages deployment:

1. Build the project: `npm run build`
2. Push the `dist/` directory to the `gh-pages` branch, or
3. Configure GitHub Pages to serve from the `dist/` directory

Repository: https://github.com/shuffleo/p2p-gyro-game.git

## Usage

1. **Create/Join Room**: Enter or generate an 8-24 digit alphanumeric room code
2. **Mobile Device**: Grant permission to access gyroscope, then start sending data
3. **Desktop Device**: View the 3D visualization of the mobile device's orientation
4. **Constraints**: Maximum 3 devices per room, maximum 1 mobile device

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
│   ├── webrtc-manager.js    # WebRTC (Phase 3)
│   ├── gyroscope-handler.js # Gyroscope (Phase 4)
│   ├── visualization.js    # Three.js (Phase 5)
│   ├── utils.js             # Utility functions
│   └── styles.css           # Tailwind CSS
├── dist/                    # Build output
├── index.html               # Entry HTML
└── package.json
```

## Implementation Status

- ✅ Phase 1: Project Setup & Basic UI
- ⏳ Phase 2: Room Management System
- ⏳ Phase 3: WebRTC Integration
- ⏳ Phase 4: Gyroscope Data Collection
- ⏳ Phase 5: Three.js Visualization
- ⏳ Phase 6: Integration & Polish
- ⏳ Phase 7: Deployment

## License

MIT

