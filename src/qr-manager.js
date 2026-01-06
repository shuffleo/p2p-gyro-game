// QR Code Manager - Generate and scan QR codes
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';

export class QRManager {
  constructor() {
    this.scanner = null;
    this.isScanning = false;
  }

  async generateQRCode(roomCode, containerElement) {
    try {
      // Clear container
      containerElement.innerHTML = '';
      
      // Generate QR code
      const qrDataURL = await QRCode.toDataURL(roomCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Create img element
      const img = document.createElement('img');
      img.src = qrDataURL;
      img.alt = `QR Code for room: ${roomCode}`;
      img.className = 'w-full h-auto';
      
      containerElement.appendChild(img);
      
      return qrDataURL;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      throw error;
    }
  }

  async startQRScanner(videoElement, onScan) {
    if (this.isScanning) {
      return;
    }

    try {
      this.scanner = new QrScanner(
        videoElement,
        (result) => {
          this.stopQRScanner();
          // Result is a string when returnDetailedScanResult is false
          onScan(result);
        },
        {
          returnDetailedScanResult: false,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      await this.scanner.start();
      this.isScanning = true;
    } catch (error) {
      console.error('Failed to start QR scanner:', error);
      throw error;
    }
  }

  stopQRScanner() {
    if (this.scanner) {
      this.scanner.stop();
      this.scanner.destroy();
      this.scanner = null;
      this.isScanning = false;
    }
  }

  isScannerActive() {
    return this.isScanning;
  }
}

