# Phase 1 & 2 Testing Checklist

## Setup Complete ✅
- [x] Code pushed to GitHub: https://github.com/shuffleo/p2p-gyro-game
- [x] Dependencies installed (npm install)
- [x] Dev server running (npm run dev)

## Phase 1: Project Setup & Basic UI

### Landing Screen Tests
- [ ] Page loads without errors
- [ ] "Generate Code" button creates an 8-24 digit alphanumeric code
- [ ] Generated code appears in input field
- [ ] Can manually enter a custom room code (8-24 alphanumeric)
- [ ] "Join Room" button is clickable
- [ ] UI is responsive on mobile viewport (< 768px)
- [ ] UI is responsive on desktop viewport (> 1024px)
- [ ] Tailwind CSS styles are applied correctly

### Room Code Validation Tests
- [ ] Entering code < 8 characters shows error
- [ ] Entering code > 24 characters shows error
- [ ] Entering non-alphanumeric characters shows error
- [ ] Valid code (8-24 alphanumeric) allows joining

### Screen Navigation Tests
- [ ] Clicking "Join Room" with valid code shows waiting room (desktop) or mobile game screen (mobile)
- [ ] Screen transitions work smoothly
- [ ] Only one screen is visible at a time

## Phase 2: Room Management System

### Room Creation Tests
- [ ] Generated room code is unique
- [ ] Room code is saved to localStorage
- [ ] Page refresh preserves room code in input field

### Room Joining Tests (Desktop)
- [ ] Can join room with valid code
- [ ] Waiting room screen shows correct room code
- [ ] "Copy" button copies room code to clipboard
- [ ] Connection status indicator shows "Connecting..."
- [ ] Device list shows current device
- [ ] "Exit Room" button returns to landing screen

### Room Joining Tests (Mobile)
- [ ] Mobile device shows mobile game screen
- [ ] Permission request section is visible
- [ ] Room code is displayed correctly
- [ ] "Exit Room" button returns to landing screen

### Constraint Tests
- [ ] Attempting to join with 4th device shows error: "Room is full. Maximum 3 devices allowed."
- [ ] Attempting to add 2nd mobile device shows error: "Room already has a mobile device. Maximum 1 mobile device allowed."
- [ ] Error messages include copy-to-clipboard functionality

### localStorage Tests
- [ ] Room code persists after page refresh
- [ ] Room code can be cleared
- [ ] Device ID persists across sessions

### Device Detection Tests
- [ ] Desktop device is detected correctly
- [ ] Mobile device is detected correctly
- [ ] Gyroscope capability is checked (may show false on desktop, which is expected)

## Browser Compatibility
- [ ] Tested in Chrome (latest version)
- [ ] No console errors
- [ ] No network errors

## Manual Testing Steps

1. **Open in Chrome**: Navigate to `http://localhost:3000`
2. **Test Landing Screen**:
   - Click "Generate Code" - verify code appears
   - Enter custom code - verify validation
   - Click "Join Room" - verify navigation

3. **Test Desktop Flow**:
   - Join a room
   - Verify waiting room screen appears
   - Check room code display
   - Test copy button
   - Test exit button

4. **Test Mobile Flow** (or use Chrome DevTools mobile emulation):
   - Open DevTools > Toggle device toolbar
   - Select a mobile device (e.g., iPhone 12)
   - Join a room
   - Verify mobile game screen appears
   - Check permission request UI

5. **Test Constraints**:
   - Open 3 browser tabs/windows
   - Join same room from all 3
   - Try to join from 4th tab - should show error
   - Try to join with 2nd mobile device - should show error

6. **Test localStorage**:
   - Join a room
   - Refresh page
   - Verify room code is still in input field

## Expected Behavior

### Working Features
- ✅ Room code generation and validation
- ✅ Screen navigation
- ✅ Device detection
- ✅ Room constraint validation
- ✅ localStorage persistence
- ✅ Error handling with copy functionality
- ✅ Responsive UI

### Not Yet Working (Expected)
- ⏳ WebRTC connections (Phase 3)
- ⏳ Gyroscope data collection (Phase 4)
- ⏳ 3D visualization (Phase 5)
- ⏳ Real-time device list updates (Phase 3)
- ⏳ Connection status updates (Phase 3)

## Notes
- The app should work for room creation/joining and UI navigation
- WebRTC, gyroscope, and visualization features are placeholders for later phases
- All error messages should include copy-to-clipboard functionality
- Connection status indicators show UI but don't reflect real connections yet

