// Three.js Visualization - 3D scene with rectangular box
import * as THREE from 'three';
import { degToRad, lerp } from './utils.js';

export class Visualization {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.box = null;
    this.container = null;
    this.animationId = null;
    
    // Target rotation (for smooth interpolation)
    this.targetRotation = { x: 0, y: 0, z: 0 };
    this.currentRotation = { x: 0, y: 0, z: 0 };
    
    // Smoothing factor (0-1, higher = smoother but slower)
    this.smoothingFactor = 0.1;
  }

  initScene(container, canvasId = null) {
    this.container = container;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);
    
    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.z = 5;
    
    // Find or create canvas
    let canvas = null;
    if (canvasId) {
      canvas = document.getElementById(canvasId);
    } else {
      // Try default canvas IDs
      canvas = document.getElementById('three-canvas') || 
               document.getElementById('waiting-room-three-canvas') ||
               document.getElementById('mobile-three-canvas');
    }
    
    // Create canvas if not found
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'w-full h-full';
      container.appendChild(canvas);
    }
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      canvas: canvas
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Create box
    this.createBox();
    
    // Add lighting
    this.setupLighting();
    
    // Handle window resize
    window.addEventListener('resize', () => this.resize());
    
    // Start animation loop
    this.animate();
  }

  createBox() {
    // Create simple rectangular box geometry
    const geometry = new THREE.BoxGeometry(2, 3, 0.5);
    
    // Create material with color
    const material = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9, // Primary blue color
      metalness: 0.3,
      roughness: 0.7,
    });
    
    // Create mesh
    this.box = new THREE.Mesh(geometry, material);
    
    // Add edges for better visibility
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
    );
    this.box.add(line);
    
    // Add to scene
    this.scene.add(this.box);
    
    // Reset rotation
    this.targetRotation = { x: 0, y: 0, z: 0 };
    this.currentRotation = { x: 0, y: 0, z: 0 };
  }

  setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light for shadows and depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
    
    // Additional light from opposite side
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-5, -5, -5);
    this.scene.add(directionalLight2);
  }

  updateRotation(alpha, beta, gamma) {
    // Convert degrees to radians
    // Note: DeviceOrientationEvent provides:
    // - alpha: rotation around z-axis (0-360)
    // - beta: rotation around x-axis (-180 to 180)
    // - gamma: rotation around y-axis (-90 to 90)
    
    // Convert to radians and adjust for Three.js coordinate system
    // We'll map: alpha -> Y rotation, beta -> X rotation, gamma -> Z rotation
    this.targetRotation.x = degToRad(beta || 0);
    this.targetRotation.y = degToRad(alpha || 0);
    this.targetRotation.z = -degToRad(gamma || 0); // Negative for correct orientation
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    // Smooth interpolation of rotation
    this.currentRotation.x = lerp(
      this.currentRotation.x,
      this.targetRotation.x,
      this.smoothingFactor
    );
    this.currentRotation.y = lerp(
      this.currentRotation.y,
      this.targetRotation.y,
      this.smoothingFactor
    );
    this.currentRotation.z = lerp(
      this.currentRotation.z,
      this.targetRotation.z,
      this.smoothingFactor
    );
    
    // Apply rotation to box
    if (this.box) {
      this.box.rotation.x = this.currentRotation.x;
      this.box.rotation.y = this.currentRotation.y;
      this.box.rotation.z = this.currentRotation.z;
    }
    
    // Render scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize() {
    if (!this.container || !this.camera || !this.renderer) {
      return;
    }

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  dispose() {
    // Stop animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Remove event listeners
    window.removeEventListener('resize', () => this.resize());
    
    // Dispose of Three.js objects
    if (this.box) {
      this.box.geometry.dispose();
      if (Array.isArray(this.box.material)) {
        this.box.material.forEach(material => material.dispose());
      } else {
        this.box.material.dispose();
      }
      this.scene.remove(this.box);
      this.box = null;
    }
    
    // Dispose of scene
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      this.scene = null;
    }
    
    // Dispose of renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    
    this.camera = null;
    this.container = null;
  }
}
