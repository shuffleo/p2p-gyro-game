// Three.js Lightsaber Visualization
import * as THREE from 'three';
import { degToRad, lerp } from './utils.js';

export class LightsaberVisualization {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.lightsaber = null;
    this.blade = null;
    this.hilt = null;
    this.container = null;
    this.animationId = null;
    
    // Target rotation (for smooth interpolation)
    this.targetRotation = { x: 0, y: 0, z: 0 };
    this.currentRotation = { x: 0, y: 0, z: 0 };
    
    // Blade properties
    this.baseBladeLength = 2.0; // Base length in Three.js units
    this.currentBladeLength = this.baseBladeLength;
    this.targetBladeLength = this.baseBladeLength;
    this.maxBladeLength = 5.0; // Maximum length when volume is high
    
    // Smoothing factors
    this.rotationSmoothing = 0.15;
    this.lengthSmoothing = 0.1;
    
    // Blade color (can be customized)
    this.bladeColor = new THREE.Color(0x00ffff); // Cyan
  }

  initScene(container, canvasId = 'three-canvas') {
    console.log('LightsaberVisualization.initScene called');
    console.log('Container:', container);
    console.log('Container clientWidth:', container.clientWidth);
    console.log('Container clientHeight:', container.clientHeight);
    
    this.container = container;
    
    // Ensure container has dimensions
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      console.warn('Container has zero dimensions, using window size');
      // Use window size as fallback
      const width = window.innerWidth;
      const height = window.innerHeight;
      container.style.width = width + 'px';
      container.style.height = height + 'px';
    }
    
    // Create scene with dark background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Create camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);
    
    // Find or create canvas
    let canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.log('Canvas not found, creating new one');
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      canvas.className = 'w-full h-full';
      canvas.style.display = 'block';
      container.appendChild(canvas);
    } else {
      console.log('Found existing canvas:', canvas);
    }
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      canvas: canvas,
      alpha: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    console.log('Renderer created, size:', width, 'x', height);
    
    // Create lightsaber
    this.createLightsaber();
    console.log('Lightsaber created:', this.lightsaber);
    
    // Add lighting
    this.setupLighting();
    
    // Handle window resize
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
    
    // Start animation loop
    this.animate();
    console.log('Animation loop started');
  }

  createLightsaber() {
    console.log('Creating lightsaber...');
    
    // Create a group to hold hilt and blade
    this.lightsaber = new THREE.Group();
    
    // Create hilt (handle)
    this.createHilt();
    console.log('Hilt created');
    
    // Create blade
    this.createBlade();
    console.log('Blade created');
    
    // Add to scene
    if (this.scene) {
      this.scene.add(this.lightsaber);
      console.log('Lightsaber added to scene');
    } else {
      console.error('Scene is null, cannot add lightsaber');
    }
    
    // Reset rotation
    this.targetRotation = { x: 0, y: 0, z: 0 };
    this.currentRotation = { x: 0, y: 0, z: 0 };
  }

  createHilt() {
    // Hilt is a dark cylinder
    const hiltGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 16);
    const hiltMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
    });
    
    this.hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
    this.hilt.position.y = -0.75; // Position at bottom
    this.lightsaber.add(this.hilt);
    
    // Add some details to hilt
    const detailGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16);
    const detailMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.9,
      roughness: 0.1,
    });
    
    // Add details at top and bottom of hilt
    const topDetail = new THREE.Mesh(detailGeometry, detailMaterial);
    topDetail.position.y = 0.75;
    this.hilt.add(topDetail);
    
    const bottomDetail = new THREE.Mesh(detailGeometry, detailMaterial);
    bottomDetail.position.y = -0.75;
    this.hilt.add(bottomDetail);
  }

  createBlade() {
    // Create blade group
    const bladeGroup = new THREE.Group();
    
    // Inner bright core (main blade)
    const coreGeometry = new THREE.CylinderGeometry(0.05, 0.05, this.currentBladeLength, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: this.bladeColor,
      transparent: true,
      opacity: 1.0,
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = this.currentBladeLength / 2 + 0.75; // Position above hilt
    bladeGroup.add(core);
    
    // Outer glow (larger, semi-transparent)
    const glowGeometry = new THREE.CylinderGeometry(0.12, 0.12, this.currentBladeLength, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.bladeColor,
      transparent: true,
      opacity: 0.3,
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = this.currentBladeLength / 2 + 0.75;
    bladeGroup.add(glow);
    
    // Outer glow 2 (even larger, more transparent)
    const glow2Geometry = new THREE.CylinderGeometry(0.18, 0.18, this.currentBladeLength, 16);
    const glow2Material = new THREE.MeshBasicMaterial({
      color: this.bladeColor,
      transparent: true,
      opacity: 0.15,
    });
    
    const glow2 = new THREE.Mesh(glow2Geometry, glow2Material);
    glow2.position.y = this.currentBladeLength / 2 + 0.75;
    bladeGroup.add(glow2);
    
    this.blade = bladeGroup;
    this.lightsaber.add(this.blade);
  }

  updateBladeLength(newLength) {
    // Normalize volume (0-1) to blade length
    // Volume 0 = base length, Volume 1 = max length
    this.targetBladeLength = this.baseBladeLength + (newLength * (this.maxBladeLength - this.baseBladeLength));
  }

  updateBladeGeometry() {
    if (!this.blade) return;
    
    // Smooth interpolation of blade length
    this.currentBladeLength = lerp(
      this.currentBladeLength,
      this.targetBladeLength,
      this.lengthSmoothing
    );
    
    // Update all blade components
    this.blade.children.forEach((child, index) => {
      if (child.geometry) {
        // Update geometry height
        child.geometry.dispose();
        
        let radius = 0.05;
        if (index === 1) radius = 0.12;
        if (index === 2) radius = 0.18;
        
        child.geometry = new THREE.CylinderGeometry(radius, radius, this.currentBladeLength, 16);
        child.position.y = this.currentBladeLength / 2 + 0.75;
      }
    });
  }

  setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    // Point light from lightsaber blade (glow effect)
    const bladeLight = new THREE.PointLight(this.bladeColor, 2, 10);
    bladeLight.position.set(0, 2, 0);
    this.scene.add(bladeLight);
    
    // Directional light for hilt
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
  }

  updateRotation(alpha, beta, gamma) {
    // Convert degrees to radians
    // Map device orientation to lightsaber rotation
    // We want the lightsaber to swing naturally with phone movement
    // 
    // Device orientation mapping:
    // - alpha: rotation around z-axis (0-360°), compass direction
    // - beta: front-to-back tilt (-180 to 180°)
    // - gamma: left-to-right tilt (-90 to 90°)
    //
    // Lightsaber rotation mapping:
    // - x: pitch (beta) - tilt forward/back
    // - y: yaw (alpha) - rotate around vertical axis
    // - z: roll (gamma) - tilt left/right
    
    const alphaRad = degToRad(alpha || 0);
    const betaRad = degToRad(beta || 0);
    const gammaRad = degToRad(gamma || 0);
    
    // Map to lightsaber rotation
    // Beta (front-back tilt) -> X rotation (pitch)
    // Alpha (compass) -> Y rotation (yaw)
    // Gamma (left-right tilt) -> Z rotation (roll, inverted)
    this.targetRotation.x = betaRad;
    this.targetRotation.y = alphaRad;
    this.targetRotation.z = -gammaRad;
    
    console.log('🔄 Rotation updated:', {
      input: { alpha, beta, gamma },
      target: this.targetRotation,
      current: this.currentRotation
    });
  }

  updateMotion(motionData) {
    // Use motion data to add more dynamic movement
    // Speed affects how quickly the lightsaber responds
    if (motionData && motionData.speed !== undefined) {
      // Higher speed = less smoothing (more responsive)
      // Clamp smoothing between 0.05 and 0.2
      const speedFactor = Math.min(motionData.speed / 10, 1); // Normalize speed
      this.rotationSmoothing = Math.max(0.05, Math.min(0.2, 0.2 - (speedFactor * 0.15)));
      
      console.log('⚡ Motion update:', {
        speed: motionData.speed,
        smoothing: this.rotationSmoothing
      });
    }
    
    // Also use rotation rate if available for more responsive movement
    if (motionData && motionData.rotationRate) {
      const { alpha, beta, gamma } = motionData.rotationRate;
      if (alpha !== undefined || beta !== undefined || gamma !== undefined) {
        // Add rotation rate to current rotation for more dynamic movement
        const rateAlpha = degToRad(alpha || 0) * 0.1;
        const rateBeta = degToRad(beta || 0) * 0.1;
        const rateGamma = degToRad(gamma || 0) * 0.1;
        
        this.targetRotation.x += rateBeta;
        this.targetRotation.y += rateAlpha;
        this.targetRotation.z -= rateGamma;
      }
    }
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    // Smooth interpolation of rotation
    this.currentRotation.x = lerp(
      this.currentRotation.x,
      this.targetRotation.x,
      this.rotationSmoothing
    );
    this.currentRotation.y = lerp(
      this.currentRotation.y,
      this.targetRotation.y,
      this.rotationSmoothing
    );
    this.currentRotation.z = lerp(
      this.currentRotation.z,
      this.targetRotation.z,
      this.rotationSmoothing
    );
    
    // Apply rotation to lightsaber
    if (this.lightsaber) {
      this.lightsaber.rotation.x = this.currentRotation.x;
      this.lightsaber.rotation.y = this.currentRotation.y;
      this.lightsaber.rotation.z = this.currentRotation.z;
    }
    
    // Update blade length
    this.updateBladeGeometry();
    
    // Render scene
    if (this.renderer && this.scene && this.camera) {
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.error('Error rendering scene:', error);
      }
    } else {
      if (!this.renderer) console.warn('Renderer is null');
      if (!this.scene) console.warn('Scene is null');
      if (!this.camera) console.warn('Camera is null');
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
    if (this.lightsaber) {
      this.lightsaber.traverse((object) => {
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
      this.scene.remove(this.lightsaber);
      this.lightsaber = null;
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

