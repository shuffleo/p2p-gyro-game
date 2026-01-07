# P2P Lightsaber Game

A peer-to-peer (P2P) lightsaber game where mobile devices act as controllers, sending gyroscope, motion, and microphone data to desktop devices that visualize a 3D lightsaber using Three.js.

## Features

- **WebRTC P2P Communication**: Real-time data transfer using PeerJS
- **3D Lightsaber Visualization**: Three.js rendering with glow effects
- **Keyphrase-based Peer IDs**: Easy-to-share 6-word keyphrases + 3 numbers (e.g., "word1 word2 word3 word4 word5 word6 123")
- **Motion Control**: Swing your phone to control the lightsaber movement
- **Voice Control**: Louder voice = longer lightsaber blade
- **Auto-connect Flow**: Automatically creates peer ID on page load
- **Connection Quality Indicators**: Real-time connection quality monitoring (RTT, quality levels)
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Chrome Optimized**: Built for Chrome browser

## Technology Stack

- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **PeerJS**: WebRTC library with cloud signaling
- **Three.js**: 3D graphics library
- **DeviceOrientationEvent API**: Gyroscope data access
- **DeviceMotionEvent API**: Motion/speed detection
- **MediaDevices API**: Microphone access for audio level detection
- **niceware**: Keyphrase generation library

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

### Access the Deployed Site

Once deployed, the site will be available at:
**https://shuffleo.github.io/p2p-gyro-game/**

Repository: https://github.com/shuffleo/p2p-gyro-game.git

## Usage

### Mobile Device (Controller)

1. Open the app in Chrome on your mobile device
2. The app automatically creates a peer ID (6-word keyphrase + 3 numbers)
3. Your peer ID is displayed with a copy button
4. Share your peer ID with the desktop user
5. When desktop user connects, grant permissions for:
   - Device orientation (gyroscope)
   - Device motion (acceleration/speed)
   - Microphone (audio level)
6. Swing your phone to control the lightsaber movement
7. Speak louder to make the lightsaber blade longer

### Desktop Device (Viewer)

1. Open the app in Chrome on your desktop
2. The app automatically creates a peer ID (6-word keyphrase + 3 numbers)
3. Your peer ID is displayed with a copy button
4. Share your peer ID with the mobile user, or enter their peer ID to connect
5. Enter the mobile device's peer ID in the input field
6. Click "Connect" to start pairing
7. Once connected, you'll see:
   - Connection status metrics (RTT, quality, connected peers)
   - 3D lightsaber visualization
   - Lightsaber responds to mobile device's motion
   - Lightsaber length responds to microphone volume

### How It Works

1. **Auto-creation**: Both devices automatically generate peer IDs on page load
2. **Connection**: Enter the other device's peer ID and click "Connect"
3. **Pairing**: WebRTC establishes a direct peer-to-peer connection
4. **Data Flow**: 
   - Mobile sends: gyroscope orientation, motion/speed data, microphone volume
   - Desktop receives: all data and renders the lightsaber
5. **Visualization**: 
   - Phone movement → lightsaber rotation/swing
   - Voice volume → lightsaber blade length

## Features

- ✅ Real-time P2P communication via WebRTC (PeerJS)
- ✅ Keyphrase-based peer IDs (6 words + 3 numbers) using niceware library
- ✅ Gyroscope data collection from mobile devices
- ✅ Motion/speed detection from device motion API
- ✅ Microphone audio level detection
- ✅ 3D lightsaber visualization with Three.js
  - Glowing blade with multiple layers for glow effect
  - Hilt with metallic details
  - Smooth rotation animation
  - Dynamic blade length based on microphone volume
- ✅ Connection quality indicators (RTT monitoring, quality levels)
- ✅ Auto-create peer ID on page load
- ✅ Copy-to-clipboard for peer IDs
- ✅ Error handling with copy-to-clipboard for debugging
- ✅ Responsive mobile-first UI
- ✅ Automatic GitHub Pages deployment

## Browser Support

- **Chrome only** (latest version recommended)
- WebRTC, DeviceOrientationEvent, DeviceMotionEvent, and MediaDevices APIs required

## Project Structure

```
p2p-gyro-game/
├── src/
│   ├── main.js                      # Application entry point
│   ├── device-detector.js           # Device detection
│   ├── webrtc-manager.js            # WebRTC connection handling
│   ├── gyroscope-handler.js         # Gyroscope data collection
│   ├── motion-handler.js            # Motion/speed detection
│   ├── microphone-handler.js        # Microphone audio level detection
│   ├── lightsaber-visualization.js  # Three.js lightsaber visualization
│   ├── keyphrase-generator.js       # Keyphrase generation (niceware)
│   ├── utils.js                     # Utility functions
│   └── styles.css                   # Tailwind CSS
├── dist/                             # Build output
├── index.html                        # Entry HTML
└── package.json
```

## Implementation Status

- ✅ Project Setup & Basic UI
- ✅ Keyphrase-based Peer ID System
- ✅ WebRTC Integration (PeerJS)
- ✅ Gyroscope Data Collection
- ✅ Motion/Speed Detection
- ✅ Microphone Audio Level Detection
- ✅ Three.js Lightsaber Visualization
- ✅ Integration & Polish
- ✅ Deployment (GitHub Actions)

## License

MIT
