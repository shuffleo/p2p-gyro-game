// UI State Management
export class UIManager {
  constructor() {
    this.screens = {
      landing: document.getElementById('landing-screen'),
      waitingRoom: document.getElementById('waiting-room-screen'),
      gameDesktop: document.getElementById('game-screen-desktop'),
      gameMobile: document.getElementById('game-screen-mobile'),
    };
  }

  showLandingScreen() {
    this.hideAllScreens();
    this.screens.landing?.classList.remove('hidden');
  }

  showWaitingRoom(roomCode) {
    this.hideAllScreens();
    this.screens.waitingRoom?.classList.remove('hidden');
    
    const codeDisplay = document.getElementById('room-code-display');
    if (codeDisplay) {
      codeDisplay.value = roomCode;
    }
    
    this.updateConnectionStatus('connecting', 'Connecting to peers...');
  }

  showDesktopGameScreen(roomCode) {
    this.hideAllScreens();
    this.screens.gameDesktop?.classList.remove('hidden');
    
    const gameRoomCode = document.getElementById('game-room-code');
    if (gameRoomCode) {
      gameRoomCode.textContent = roomCode;
    }
    
    this.updateGameConnectionStatus('connecting', 'Connecting...');
  }

  showMobileGameScreen(roomCode) {
    this.hideAllScreens();
    this.screens.gameMobile?.classList.remove('hidden');
    
    const mobileRoomCode = document.getElementById('mobile-room-code');
    if (mobileRoomCode) {
      mobileRoomCode.textContent = roomCode;
    }
    
    // Show permission request initially (will be handled in Phase 4)
    const permissionRequest = document.getElementById('permission-request');
    const permissionGranted = document.getElementById('permission-granted');
    
    if (permissionRequest) {
      permissionRequest.classList.remove('hidden');
    }
    if (permissionGranted) {
      permissionGranted.classList.add('hidden');
    }
    
    this.updateMobileConnectionStatus('connecting', 'Connecting...');
  }

  hideAllScreens() {
    Object.values(this.screens).forEach(screen => {
      screen?.classList.add('hidden');
    });
  }

  updateConnectionStatus(status, text) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (indicator) {
      indicator.className = 'w-2 h-2 rounded-full';
      switch (status) {
        case 'connecting':
          indicator.classList.add('bg-yellow-500');
          break;
        case 'connected':
          indicator.classList.add('bg-green-500');
          break;
        case 'disconnected':
          indicator.classList.add('bg-gray-500');
          break;
        case 'error':
          indicator.classList.add('bg-red-500');
          break;
        default:
          indicator.classList.add('bg-gray-500');
      }
    }
    
    if (statusText) {
      statusText.textContent = text || status;
    }
  }

  updateGameConnectionStatus(status, text) {
    const indicator = document.getElementById('game-status-indicator');
    const statusText = document.getElementById('game-status-text');
    
    if (indicator) {
      indicator.className = 'w-2 h-2 rounded-full';
      switch (status) {
        case 'connecting':
          indicator.classList.add('bg-yellow-500');
          break;
        case 'connected':
          indicator.classList.add('bg-green-500');
          break;
        case 'disconnected':
          indicator.classList.add('bg-gray-500');
          break;
        case 'error':
          indicator.classList.add('bg-red-500');
          break;
        default:
          indicator.classList.add('bg-gray-500');
      }
    }
    
    if (statusText) {
      statusText.textContent = text || status;
    }
  }

  updateMobileConnectionStatus(status, text) {
    const indicator = document.getElementById('mobile-status-indicator');
    const statusText = document.getElementById('mobile-status-text');
    
    if (indicator) {
      indicator.className = 'w-2 h-2 rounded-full';
      switch (status) {
        case 'connecting':
          indicator.classList.add('bg-yellow-500');
          break;
        case 'connected':
          indicator.classList.add('bg-green-500');
          break;
        case 'disconnected':
          indicator.classList.add('bg-gray-500');
          break;
        case 'error':
          indicator.classList.add('bg-red-500');
          break;
        default:
          indicator.classList.add('bg-gray-500');
      }
    }
    
    if (statusText) {
      statusText.textContent = text || status;
    }
  }

  updateDevicesList(devices) {
    const devicesList = document.getElementById('devices-list');
    const gameDevicesList = document.getElementById('game-devices-list');
    
    const renderDevice = (device) => {
      const deviceEl = document.createElement('div');
      deviceEl.className = 'flex items-center gap-2 text-sm';
      const statusColor = device.isMobile ? 'bg-blue-500' : 'bg-gray-500';
      const deviceName = device.type || (device.isMobile ? 'Mobile' : 'Desktop');
      deviceEl.innerHTML = `
        <span class="w-2 h-2 rounded-full ${statusColor}"></span>
        <span>${deviceName} (${device.id ? device.id.slice(0, 8) : 'unknown'})</span>
      `;
      return deviceEl;
    };
    
    if (devicesList) {
      devicesList.innerHTML = '';
      if (devices.length === 0) {
        devicesList.innerHTML = '<p class="text-sm text-gray-500">No devices connected</p>';
      } else {
        devices.forEach(device => {
          devicesList.appendChild(renderDevice(device));
        });
      }
    }
    
    if (gameDevicesList) {
      gameDevicesList.innerHTML = '';
      if (devices.length === 0) {
        gameDevicesList.innerHTML = '<p class="text-xs text-gray-500">No devices</p>';
      } else {
        devices.forEach(device => {
          gameDevicesList.appendChild(renderDevice(device));
        });
      }
    }
  }

  showPermissionGranted() {
    const permissionRequest = document.getElementById('permission-request');
    const permissionGranted = document.getElementById('permission-granted');
    
    if (permissionRequest) {
      permissionRequest.classList.add('hidden');
    }
    if (permissionGranted) {
      permissionGranted.classList.remove('hidden');
    }
  }
}

