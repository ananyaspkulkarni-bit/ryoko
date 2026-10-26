import * as THREE from 'three';
import { MOCK_DESTINATIONS, getDestinationData } from '../../data/destinations';
import { WORLD_COUNTRIES, findCountryAtLatLng, type CountryGeoData } from '../../data/countriesGeo';
import type { Destination } from '../../types';
import type { GlobeTravelPhase, GlobeControllerOptions } from './globe.types';

export class GlobeController {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private globeMesh!: THREE.Mesh;
  private atmosphereMesh!: THREE.Mesh;
  private graticuleGroup!: THREE.Group;
  private markersGroup!: THREE.Group;

  private earthCanvas!: HTMLCanvasElement;
  private earthCtx!: CanvasRenderingContext2D | null;
  private earthTexture!: THREE.CanvasTexture;

  private hoveredCountry: CountryGeoData | null = null;
  private selectedCountry: CountryGeoData | null = null;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private isDestroyed = false;
  private animFrameId: number | null = null;

  // Rotation & Travel State
  private targetRotationY = 0;
  private targetRotationX = 0;
  private currentRotationY = 0;
  private currentRotationX = 0;
  private rotationSpeed = 0.0012;

  // Zoom State
  private targetCameraZ = 6.2;
  private currentCameraZ = 6.2;

  private travelPhase: GlobeTravelPhase = 'idle';
  private _targetDestination: Destination | null = null;
  private reducedMotion = false;

  private onPhaseChange?: (phase: GlobeTravelPhase) => void;
  private onDestinationClick?: (destination: Destination) => void;
  private onCountryHover?: (country: CountryGeoData | null, clientX: number, clientY: number) => void;
  private timeouts: number[] = [];

  constructor(
    container: HTMLElement,
    options?: GlobeControllerOptions
  ) {
    this.container = container;
    this.reducedMotion = !!options?.reducedMotion;
    this.onPhaseChange = options?.onPhaseChange;
    this.onDestinationClick = options?.onDestinationClick;
    this.onCountryHover = options?.onCountryHover;

    // 1. Scene Setup
    this.scene = new THREE.Scene();

    // 2. Camera Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = this.currentCameraZ;

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 4. Build Globe World Objects
    this.initLighting();
    this.initGlobeSphere();
    this.initAtmosphereGlow();
    this.initGraticuleGrid();
    this.initDestinationMarkers();

    // 5. Setup Pointer Interaction
    this.setupInteractionEvents();

    // 6. Window Resize Handler & Initial Sizing
    window.addEventListener('resize', this.onWindowResize);
    this.onWindowResize();

    // 7. Start Render Loop
    this.animate();
  }

  private initLighting() {
    // Ambient Warm Light
    const ambient = new THREE.AmbientLight(0xfce9ab, 0.95);
    this.scene.add(ambient);

    // Main Directional Sun Light
    const dirLight = new THREE.DirectionalLight(0xffec8e, 1.15);
    dirLight.position.set(5, 4, 5);
    this.scene.add(dirLight);

    // Soft Blue Ocean Backlight
    const rimLight = new THREE.DirectionalLight(0x3e8bb3, 0.65);
    rimLight.position.set(-5, -2, -4);
    this.scene.add(rimLight);
  }

  private renderEarthTextureOnCanvas() {
    if (!this.earthCtx) return;
    const ctx = this.earthCtx;
    const width = this.earthCanvas.width;
    const height = this.earthCanvas.height;

    // 1. PRIMARY OCEAN BASE — EXACT #3E8BB3
    ctx.fillStyle = '#3E8BB3';
    ctx.fillRect(0, 0, width, height);

    // Soft spherical ocean depth gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
    oceanGrad.addColorStop(0, '#499AC3');
    oceanGrad.addColorStop(0.4, '#3E8BB3');
    oceanGrad.addColorStop(0.8, '#357B9F');
    oceanGrad.addColorStop(1, '#2E6D8E');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle atmospheric ocean waves / lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let y = 100; y < height; y += 220) {
      ctx.beginPath();
      ctx.ellipse(width / 2, y, width * 0.46, 50, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const toX = (lng: number) => ((lng + 180) / 360) * width;
    const toY = (lat: number) => ((90 - lat) / 180) * height;

    // 2. DRAW REAL WORLD COUNTRIES (PRIMARY LAND #103A0B)
    WORLD_COUNTRIES.forEach((country) => {
      const isHovered = this.hoveredCountry?.id === country.id;
      const isSelected = this.selectedCountry?.id === country.id;

      // Color Palette Hierarchy
      let fillStyle = '#103A0B'; // Base Land
      let strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Soft subtle boundary
      let lineWidth = 1;

      if (isSelected) {
        fillStyle = '#24731B'; // Luminous destination green
        strokeStyle = '#FCE9AB'; // Soft warm highlight
        lineWidth = 2.5;
      } else if (isHovered) {
        fillStyle = '#1B5E14'; // Brightened hover green
        strokeStyle = '#8BA610'; // Gentle highlight border
        lineWidth = 2;
      }

      country.polygons.forEach((polygon) => {
        if (polygon.length < 3) return;

        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;

        ctx.beginPath();
        const startX = toX(polygon[0][0]);
        const startY = toY(polygon[0][1]);
        ctx.moveTo(startX, startY);

        for (let i = 1; i < polygon.length; i++) {
          const ptX = toX(polygon[i][0]);
          const ptY = toY(polygon[i][1]);
          ctx.lineTo(ptX, ptY);
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    });

    // NOTE: NO PERMANENT TEXT LABELS ARE DRAWN ON THE GLOBE TEXTURE
  }

  private initGlobeSphere() {
    this.earthCanvas = document.createElement('canvas');
    this.earthCanvas.width = 2048;
    this.earthCanvas.height = 1024;
    this.earthCtx = this.earthCanvas.getContext('2d');

    this.renderEarthTextureOnCanvas();

    this.earthTexture = new THREE.CanvasTexture(this.earthCanvas);
    this.earthTexture.wrapS = THREE.RepeatWrapping;
    this.earthTexture.wrapT = THREE.ClampToEdgeWrapping;

    const geometry = new THREE.SphereGeometry(2.2, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      map: this.earthTexture,
      emissive: 0x3e8bb3,
      emissiveIntensity: 0.08,
      specular: 0xffec8e,
      shininess: 8,
      flatShading: false,
    });

    this.globeMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.globeMesh);
  }

  private initAtmosphereGlow() {
    const geometry = new THREE.SphereGeometry(2.36, 48, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0x3e8bb3,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    this.atmosphereMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.atmosphereMesh);
  }

  private initGraticuleGrid() {
    this.graticuleGroup = new THREE.Group();
    const radius = 2.21;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x3e8bb3,
      transparent: true,
      opacity: 0.18,
    });

    for (let lat = -60; lat <= 60; lat += 20) {
      const phi = (90 - lat) * (Math.PI / 180);
      const r = radius * Math.sin(phi);
      const y = radius * Math.cos(phi);
      const points: THREE.Vector3[] = [];

      for (let lon = 0; lon <= 360; lon += 5) {
        const theta = lon * (Math.PI / 180);
        points.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const ring = new THREE.Line(geom, lineMaterial);
      this.graticuleGroup.add(ring);
    }

    for (let lon = 0; lon < 360; lon += 30) {
      const points: THREE.Vector3[] = [];
      const theta = lon * (Math.PI / 180);

      for (let lat = -90; lat <= 90; lat += 5) {
        const phi = (90 - lat) * (Math.PI / 180);
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        points.push(new THREE.Vector3(x, y, z));
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const ring = new THREE.Line(geom, lineMaterial);
      this.graticuleGroup.add(ring);
    }

    this.scene.add(this.graticuleGroup);
  }

  private latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }

  private initDestinationMarkers() {
    this.markersGroup = new THREE.Group();
    const radius = 2.23;

    MOCK_DESTINATIONS.forEach((dest) => {
      const pos = this.latLngToVector3(dest.coordinates.lat, dest.coordinates.lng, radius);
      
      const isParis = dest.id === 'paris';
      const dotGeom = new THREE.SphereGeometry(isParis ? 0.07 : 0.045, 16, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        color: isParis ? 0xd9828d : 0x8ba610,
      });
      const dotMesh = new THREE.Mesh(dotGeom, dotMat);
      dotMesh.position.copy(pos);

      const ringGeom = new THREE.RingGeometry(0.06, isParis ? 0.12 : 0.08, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isParis ? 0xd9828d : 0xfce9ab,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isParis ? 0.88 : 0.65,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(0, 0, 0);

      this.markersGroup.add(dotMesh);
      this.markersGroup.add(ringMesh);
    });

    this.scene.add(this.markersGroup);
  }

  private setupInteractionEvents() {
    const domElement = this.renderer.domElement;

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = domElement.getBoundingClientRect();
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.globeMesh);

      if (intersects.length > 0 && intersects[0].uv) {
        const uv = intersects[0].uv;
        const lng = uv.x * 360 - 180;
        const lat = uv.y * 180 - 90;

        const foundCountry = findCountryAtLatLng(lat, lng);

        if (foundCountry?.id !== this.hoveredCountry?.id) {
          this.hoveredCountry = foundCountry;
          this.container.style.cursor = foundCountry ? 'pointer' : 'default';

          this.renderEarthTextureOnCanvas();
          this.earthTexture.needsUpdate = true;
        }

        if (this.onCountryHover) {
          this.onCountryHover(this.hoveredCountry, clientX, clientY);
        }
      } else {
        if (this.hoveredCountry !== null) {
          this.hoveredCountry = null;
          this.container.style.cursor = 'default';

          this.renderEarthTextureOnCanvas();
          this.earthTexture.needsUpdate = true;
        }
        if (this.onCountryHover) {
          this.onCountryHover(null, clientX, clientY);
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (this.travelPhase !== 'idle') return;
      updatePointer(e.clientX, e.clientY);
    };

    const handlePointerLeave = () => {
      if (this.hoveredCountry !== null) {
        this.hoveredCountry = null;
        this.container.style.cursor = 'default';
        this.renderEarthTextureOnCanvas();
        this.earthTexture.needsUpdate = true;
      }
      if (this.onCountryHover) {
        this.onCountryHover(null, 0, 0);
      }
    };

    const handlePointerClick = (e: PointerEvent) => {
      if (this.travelPhase !== 'idle') return;

      const rect = domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.globeMesh);

      if (intersects.length > 0 && intersects[0].uv) {
        const uv = intersects[0].uv;
        const lng = uv.x * 360 - 180;
        const lat = uv.y * 180 - 90;

        const clickedCountry = findCountryAtLatLng(lat, lng);

        if (clickedCountry) {
          this.selectedCountry = clickedCountry;
          this.renderEarthTextureOnCanvas();
          this.earthTexture.needsUpdate = true;

          // Map country to destination object
          const dest = getDestinationData({
            id: clickedCountry.id.toLowerCase(),
            name: clickedCountry.name,
            country: clickedCountry.name,
            region: clickedCountry.continent,
            coordinates: { lat: clickedCountry.lat, lng: clickedCountry.lng },
            description: `Discover ${clickedCountry.name} with Aan.`,
            category: 'cultural',
            tags: ['explore', clickedCountry.name.toLowerCase()],
            rating: 4.9,
          });

          if (this.onDestinationClick) {
            this.onDestinationClick(dest);
          } else {
            this.travelToDestination(dest);
          }
        }
      }
    };

    domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerleave', handlePointerLeave);
    domElement.addEventListener('click', handlePointerClick);
  }

  public getTargetDestination(): Destination | null {
    return this._targetDestination;
  }

  private clearTimeouts() {
    this.timeouts.forEach((t) => window.clearTimeout(t));
    this.timeouts = [];
  }

  public travelToDestination(destination: Destination) {
    this._targetDestination = destination;
    this.clearTimeouts();

    // Match country geo for selection highlight
    const matchingGeo = WORLD_COUNTRIES.find(
      (c) => c.name.toLowerCase() === destination.country.toLowerCase() || c.name.toLowerCase() === destination.name.toLowerCase()
    );
    this.selectedCountry = matchingGeo || null;
    this.renderEarthTextureOnCanvas();
    this.earthTexture.needsUpdate = true;

    // Reduced Motion shortcut
    if (this.reducedMotion) {
      this.travelPhase = 'arrived';
      if (this.onPhaseChange) this.onPhaseChange('arrived');
      return;
    }

    // Dynamic target angle coordinates for ANY selected country
    const latRad = destination.coordinates.lat * (Math.PI / 180);
    const lngRad = destination.coordinates.lng * (Math.PI / 180);

    this.targetRotationY = -lngRad - Math.PI / 2;
    this.targetRotationX = latRad;

    // 0ms: selected
    this.travelPhase = 'selected';
    if (this.onPhaseChange) this.onPhaseChange('selected');

    // 500ms: aan-reacting (Aan speech bubble animates "Destination? Excellent choice.")
    this.timeouts.push(window.setTimeout(() => {
      if (this.isDestroyed) return;
      this.travelPhase = 'aan-reacting';
      if (this.onPhaseChange) this.onPhaseChange('aan-reacting');
    }, 500));

    // 1500ms: flying (globe accelerates & orients to country)
    this.timeouts.push(window.setTimeout(() => {
      if (this.isDestroyed) return;
      this.travelPhase = 'flying';
      if (this.onPhaseChange) this.onPhaseChange('flying');
    }, 1500));

    // 3000ms: zooming (camera zooms in toward destination)
    this.timeouts.push(window.setTimeout(() => {
      if (this.isDestroyed) return;
      this.travelPhase = 'zooming';
      this.targetCameraZ = 2.1;
      if (this.onPhaseChange) this.onPhaseChange('zooming');
    }, 3000));

    // 4500ms: arriving (destination scene starts fading in)
    this.timeouts.push(window.setTimeout(() => {
      if (this.isDestroyed) return;
      this.travelPhase = 'arriving';
      if (this.onPhaseChange) this.onPhaseChange('arriving');
    }, 4500));

    // 5800ms: arrived (Full destination screen active)
    this.timeouts.push(window.setTimeout(() => {
      if (this.isDestroyed) return;
      this.travelPhase = 'arrived';
      if (this.onPhaseChange) this.onPhaseChange('arrived');
    }, 5800));
  }

  public resetToGlobalView() {
    this.clearTimeouts();
    this.travelPhase = 'idle';
    this.targetCameraZ = 6.2;
    this._targetDestination = null;
    this.selectedCountry = null;
    this.renderEarthTextureOnCanvas();
    this.earthTexture.needsUpdate = true;
    if (this.onPhaseChange) this.onPhaseChange('idle');
  }

  private onWindowResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = () => {
    if (this.isDestroyed) return;

    this.animFrameId = requestAnimationFrame(this.animate);

    // 1. Rotation Easing per Stage
    if (this.travelPhase === 'idle' && !this.reducedMotion) {
      this.currentRotationY += this.rotationSpeed;
    } else if (this.travelPhase === 'selected' || this.travelPhase === 'aan-reacting') {
      this.currentRotationY += this.rotationSpeed * 3.5;
    } else if (this.travelPhase === 'flying' || this.travelPhase === 'zooming' || this.travelPhase === 'arriving' || this.travelPhase === 'arrived') {
      // Smooth camera orientation toward target country
      this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.065;
      this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.065;
    }

    // Apply Rotation
    this.globeMesh.rotation.y = this.currentRotationY;
    this.globeMesh.rotation.x = this.currentRotationX;
    this.graticuleGroup.rotation.y = this.currentRotationY;
    this.graticuleGroup.rotation.x = this.currentRotationX;
    this.markersGroup.rotation.y = this.currentRotationY;
    this.markersGroup.rotation.x = this.currentRotationX;

    // 2. Camera Depth Zoom Interpolation
    this.currentCameraZ += (this.targetCameraZ - this.currentCameraZ) * 0.06;
    this.camera.position.z = this.currentCameraZ;

    // 3. Render
    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    this.isDestroyed = true;
    this.clearTimeouts();
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);

    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
