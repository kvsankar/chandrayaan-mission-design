/**
 * MoonGlobeView - Interactive Moon globe for landing site selection
 *
 * Features:
 * - NASA/USGS Moon texture
 * - South pole default view
 * - Rotate/zoom via OrbitControls
 * - Crosshair at viewport center
 * - Adaptive lat/lon grid
 */

import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import type { PresetSite } from './SiteMarkers.js';
import { getSubSolarPoint } from '../calculations/sunElevation.js';

const MOON_RADIUS = 50;  // Visual size in scene units
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export interface MoonGlobeOptions {
    container: HTMLElement;
    onCrosshairMove?: (lat: number, lon: number) => void;
    presetSites?: PresetSite[];
}

export interface CrosshairPosition {
    latitude: number;   // -90 to +90
    longitude: number;  // -180 to +180
    valid: boolean;     // true if looking at near side
}

export class MoonGlobeView {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: TrackballControls;
    private moonGroup: THREE.Group;  // Container for moon mesh, grid, and markers
    private moon: THREE.Mesh;
    private gridLines: THREE.Group;
    private siteMarkers: THREE.Group;
    private crosshair: HTMLElement | null = null;
    private directionalLight: THREE.DirectionalLight | null = null;

    private onCrosshairMove?: (lat: number, lon: number) => void;
    private presetSites: PresetSite[] = [];
    private animationFrameId: number | null = null;
    private disposed = false;

    constructor(options: MoonGlobeOptions) {
        this.container = options.container;
        this.onCrosshairMove = options.onCrosshairMove;
        this.presetSites = options.presetSites || [];

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a14);

        // Camera setup - Orthographic for proper hemisphere projection
        // With North at +Z, front view has camera on +Y axis
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = MOON_RADIUS * 2.2;  // Slightly larger than moon diameter
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2,  // left
            frustumSize * aspect / 2,   // right
            frustumSize / 2,            // top
            -frustumSize / 2,           // bottom
            0.1,
            1000
        );
        this.camera.position.set(0, 300, 0);
        this.camera.up.set(0, 0, 1);  // Z (North) is up
        this.camera.lookAt(0, 0, 0);  // Look at Moon center

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // TrackballControls - allows freeform rotation without gimbal lock
        this.controls = new TrackballControls(this.camera, this.renderer.domElement);
        this.controls.rotateSpeed = 0.8;
        this.controls.zoomSpeed = 0.5;
        this.controls.panSpeed = 0.3;
        this.controls.noZoom = false;
        this.controls.noPan = true;  // Disable panning, only rotate and zoom
        this.controls.staticMoving = false;
        this.controls.dynamicDampingFactor = 0.15;

        // Create container group for moon, grid, and markers
        this.moonGroup = new THREE.Group();
        this.scene.add(this.moonGroup);

        // Create Moon mesh
        this.moon = this.createMoon();
        this.moonGroup.add(this.moon);

        // Create grid lines
        this.gridLines = new THREE.Group();
        this.moonGroup.add(this.gridLines);
        this.updateGrid();

        // Create site markers
        this.siteMarkers = new THREE.Group();
        this.moonGroup.add(this.siteMarkers);
        this.createSiteMarkers();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.directionalLight.position.set(100, 50, 100);
        this.scene.add(this.directionalLight);

        // Create crosshair overlay
        this.createCrosshair();

        // Handle resize
        window.addEventListener('resize', this.handleResize);

        // Start animation loop
        this.animate();
    }

    private createMoon(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(MOON_RADIUS, 128, 128);

        const textureLoader = new THREE.TextureLoader();

        // Create material with realistic Moon appearance
        const material = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 1.0,
            metalness: 0.0
        });

        // Load NASA LROC Moon texture (local copy from NASA SVS CGI Moon Kit)
        // Source: https://svs.gsfc.nasa.gov/4720/
        textureLoader.load(
            './textures/moon_lroc_color.jpg',
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;

                // Standard texture wrapping
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                // Shift texture 90° east to align texture's 0° meridian with grid's 0°
                texture.offset.x = -0.25;

                material.map = texture;
                material.color.set(0xffffff);
                material.needsUpdate = true;
            },
            undefined,
            () => {
                // Fallback to procedural texture if local file fails
                console.warn('NASA LROC texture failed to load, using procedural fallback');
                this.applyProceduralMoonTexture(material);
            }
        );

        const mesh = new THREE.Mesh(geometry, material);

        // Rotate mesh to orient texture correctly (same as moon-mission project)
        // This rotation aligns the equirectangular texture with our Z-up coordinate system
        mesh.rotateX(Math.PI / 2);

        return mesh;
    }

    private applyProceduralMoonTexture(material: THREE.MeshStandardMaterial): void {
        // Simple gray fallback if NASA texture fails to load
        material.color.set(0x888888);
        material.needsUpdate = true;
    }

    private createCrosshair(): void {
        this.crosshair = document.createElement('div');
        this.crosshair.className = 'moon-globe-crosshair';
        this.crosshair.innerHTML = `
            <div class="crosshair-h"></div>
            <div class="crosshair-v"></div>
            <div class="crosshair-center"></div>
        `;
        this.container.appendChild(this.crosshair);
    }

    private updateGrid(): void {
        this.disposeGridChildren();

        const zoom = this.camera.zoom;
        const spacing = this.getGridSpacing(zoom);
        const labelScale = Math.max(0.6, Math.min(1.5, 1 / zoom));

        const materials = this.createGridMaterials();

        this.addLatitudeLines(spacing, labelScale, materials);
        this.addLongitudeLines(spacing, labelScale, materials);
        this.addEquatorAndMeridian(labelScale);
    }

    private disposeGridChildren(): void {
        while (this.gridLines.children.length > 0) {
            const child = this.gridLines.children[0];
            this.gridLines.remove(child);
            if (child instanceof THREE.Line) {
                child.geometry.dispose();
                if (child.material instanceof THREE.Material) child.material.dispose();
            }
            if (child instanceof THREE.Sprite) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        }
    }

    private getGridSpacing(zoom: number): number {
        if (zoom < 1) return 30;
        if (zoom < 1.5) return 15;
        if (zoom < 2.5) return 10;
        return 5;
    }

    private createGridMaterials(): { minor: THREE.LineBasicMaterial; major: THREE.LineBasicMaterial } {
        return {
            minor: new THREE.LineBasicMaterial({ color: 0x00ccee, transparent: true, opacity: 0.4 }),
            major: new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.75 })
        };
    }

    private addLatitudeLines(spacing: number, labelScale: number, materials: { minor: THREE.LineBasicMaterial; major: THREE.LineBasicMaterial }): void {
        for (let lat = -90 + spacing; lat < 90; lat += spacing) {
            const isMajor = lat % 30 === 0;
            const points = this.createLatitudeCircle(lat);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, isMajor ? materials.major.clone() : materials.minor.clone());
            this.gridLines.add(line);

            if (isMajor && lat !== 0) {
                const latLabel = lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`;
                this.gridLines.add(this.createGridLabel(latLabel, lat, 0, labelScale));
                this.gridLines.add(this.createGridLabel(latLabel, lat, 45, labelScale));
                this.gridLines.add(this.createGridLabel(latLabel, lat, -45, labelScale));
            }
        }
    }

    private addLongitudeLines(spacing: number, labelScale: number, materials: { minor: THREE.LineBasicMaterial; major: THREE.LineBasicMaterial }): void {
        for (let lon = -180; lon < 180; lon += spacing) {
            const isMajor = lon % 30 === 0;
            const points = this.createLongitudeArc(lon);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, isMajor ? materials.major.clone() : materials.minor.clone());
            this.gridLines.add(line);

            if (isMajor && lon !== 0 && lon !== 180 && lon !== -180) {
                const lonLabel = lon > 0 ? `${lon}°E` : `${Math.abs(lon)}°W`;
                this.gridLines.add(this.createGridLabel(lonLabel, 0, lon, labelScale));
                this.gridLines.add(this.createGridLabel(lonLabel, 30, lon, labelScale));
                this.gridLines.add(this.createGridLabel(lonLabel, -30, lon, labelScale));
            }
        }
    }

    private addEquatorAndMeridian(labelScale: number): void {
        const highlightMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 1.0 });

        const equatorPoints = this.createLatitudeCircle(0);
        const equatorLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(equatorPoints), highlightMaterial);
        this.gridLines.add(equatorLine);

        const meridianPoints = this.createLongitudeArc(0);
        const meridianLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(meridianPoints), highlightMaterial.clone());
        this.gridLines.add(meridianLine);

        this.gridLines.add(this.createGridLabel('0°', 45, 0, labelScale, 0xffff00));
        this.gridLines.add(this.createGridLabel('0°', -45, 0, labelScale, 0xffff00));
    }

    private createGridLabel(text: string, lat: number, lon: number, scale: number, color = 0xffffff): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 48;
        const ctx = canvas.getContext('2d')!;

        // Clear with transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Bold text with strong outline for readability
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Strong black outline for contrast
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.strokeText(text, canvas.width / 2, canvas.height / 2);

        // Text color
        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            sizeAttenuation: true
        });

        const sprite = new THREE.Sprite(material);

        // Position above surface
        const pos = this.latLonToPosition(lat, lon);
        sprite.position.copy(pos.multiplyScalar(1.06));

        // Scale based on camera distance
        const baseScale = 8;
        sprite.scale.set(baseScale * scale, baseScale * scale * 0.375, 1);

        return sprite;
    }

    private createLatitudeCircle(lat: number): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];
        const latRad = lat * DEG_TO_RAD;
        const z = MOON_RADIUS * Math.sin(latRad);
        const r = MOON_RADIUS * Math.cos(latRad);

        for (let i = 0; i <= 72; i++) {
            const lon = (i / 72) * 2 * Math.PI;
            const x = -r * Math.sin(lon);  // Match latLonToPosition
            const y = r * Math.cos(lon);   // Match latLonToPosition
            points.push(new THREE.Vector3(x, y, z));
        }
        return points;
    }

    private createLongitudeArc(lon: number): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];
        const lonRad = lon * DEG_TO_RAD;

        for (let i = 0; i <= 36; i++) {
            const lat = ((i / 36) - 0.5) * Math.PI;  // -90 to +90
            const z = MOON_RADIUS * Math.sin(lat);
            const r = MOON_RADIUS * Math.cos(lat);
            const x = -r * Math.sin(lonRad);  // Match latLonToPosition
            const y = r * Math.cos(lonRad);   // Match latLonToPosition
            points.push(new THREE.Vector3(x, y, z));
        }
        return points;
    }

    private createSiteMarkers(): void {
        // Clear existing markers
        while (this.siteMarkers.children.length > 0) {
            const child = this.siteMarkers.children[0];
            this.siteMarkers.remove(child);
        }

        for (const site of this.presetSites) {
            const marker = this.createSiteMarker(site);
            this.siteMarkers.add(marker);
        }
    }

    private createSiteMarker(site: PresetSite): THREE.Group {
        const group = new THREE.Group();

        // Position on Moon surface
        const pos = this.latLonToPosition(site.latitude, site.longitude);

        // Create marker dot (no labels - colors only, legend shows names)
        const dotGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const dotColor = site.isActualLanding ? 0x00ff88 : 0xffaa00;
        const dotMaterial = new THREE.MeshBasicMaterial({ color: dotColor });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.copy(pos);
        group.add(dot);

        // Add a subtle glow ring around the marker
        const ringGeometry = new THREE.RingGeometry(1.5, 2.2, 24);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: dotColor,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(pos);
        // Orient ring to face outward from Moon center
        ring.lookAt(pos.clone().multiplyScalar(2));
        group.add(ring);

        // Store site data for hit testing and visibility control
        group.userData = { site };
        group.name = `marker-${site.id}`;

        return group;
    }

    /**
     * Set visibility of a specific site marker
     */
    setMarkerVisibility(siteId: string, visible: boolean): void {
        const marker = this.siteMarkers.children.find(
            child => child.userData?.site?.id === siteId
        );
        if (marker) {
            marker.visible = visible;
        }
    }

    private latLonToPosition(lat: number, lon: number): THREE.Vector3 {
        const latRad = lat * DEG_TO_RAD;
        const lonRad = lon * DEG_TO_RAD;

        // Selenographic coordinates with North pole at +Z:
        // - North pole (+90° lat) at +Z
        // - South pole (-90° lat) at -Z
        // - 0° longitude at +Y (near side center, facing camera at +Y)
        // - East (+lon) at -X (RIGHT when viewing from +Y with Z up)
        // - West (-lon) at +X (LEFT when viewing from +Y with Z up)
        const z = MOON_RADIUS * Math.sin(latRad);           // North-South along Z
        const r = MOON_RADIUS * Math.cos(latRad);           // Radius at this latitude
        const x = -r * Math.sin(lonRad);                     // East at -X (right from +Y view)
        const y = r * Math.cos(lonRad);                      // Near side at +Y (facing +Y camera)

        return new THREE.Vector3(x, y, z);
    }

    private positionToLatLon(position: THREE.Vector3): { latitude: number; longitude: number } {
        const normalized = position.clone().normalize();
        const latitude = Math.asin(normalized.z) * RAD_TO_DEG;
        const longitude = Math.atan2(-normalized.x, normalized.y) * RAD_TO_DEG;
        return { latitude, longitude };
    }

    /**
     * Get the current crosshair position in lat/lon coordinates
     */
    getCrosshairPosition(): CrosshairPosition {
        // Cast a ray from camera through viewport center
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const intersects = raycaster.intersectObject(this.moon);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            const { latitude, longitude } = this.positionToLatLon(point);

            // Check if on near side (longitude between -90 and +90)
            const valid = Math.abs(longitude) <= 90;

            return { latitude, longitude, valid };
        }

        // No intersection (looking at space)
        return { latitude: 0, longitude: 0, valid: false };
    }

    /**
     * Update preset sites (e.g., after filtering by mission)
     */
    setPresetSites(sites: PresetSite[]): void {
        this.presetSites = sites;
        this.createSiteMarkers();
    }

    /**
     * Rotate to view a specific lat/lon on the Moon surface
     */
    lookAt(lat: number, lon: number): void {
        const targetPos = this.latLonToPosition(lat, lon);
        const direction = targetPos.clone().normalize();

        // Position camera along the direction from the target point
        const cameraDistance = 300;
        this.camera.position.copy(direction.multiplyScalar(cameraDistance));
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }

    /**
     * Set camera view from a vantage point defined by lat/lon
     * @param lat Latitude of camera position (-90 = south pole, 90 = north pole)
     * @param lon Longitude of camera position (0 = front/near side, 180 = far side)
     */
    setView(lat: number, lon: number): void {
        const cameraDistance = 300;
        const latRad = lat * DEG_TO_RAD;
        const lonRad = lon * DEG_TO_RAD;

        // Camera position uses same formula as latLonToPosition
        // This places camera to VIEW that longitude (looking at the opposite side)
        const z = cameraDistance * Math.sin(latRad);
        const r = cameraDistance * Math.cos(latRad);
        const x = -r * Math.sin(lonRad);
        const y = r * Math.cos(lonRad);

        this.camera.position.set(x, y, z);

        // Set appropriate up vector based on view
        // For polar views, use the direction toward 0° longitude as "up"
        if (Math.abs(lat) > 80) {
            // Polar views - Y points toward near side (0° longitude)
            // This prevents gimbal lock and gives intuitive rotation
            this.camera.up.set(0, 1, 0);
        } else {
            // Non-polar views - Z (North) is up
            this.camera.up.set(0, 0, 1);
        }

        this.camera.lookAt(0, 0, 0);

        // Reset TrackballControls to match new camera state
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    /**
     * Reset to front view (near side)
     */
    resetView(): void {
        this.setView(0, 0);
    }

    private handleResize = (): void => {
        if (this.disposed) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        const aspect = width / height;
        const frustumSize = MOON_RADIUS * 2.2;

        // Update orthographic camera frustum
        this.camera.left = -frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    };

    private lastZoom = 1;

    private animate = (): void => {
        if (this.disposed) return;

        this.animationFrameId = requestAnimationFrame(this.animate);

        this.controls.update();

        // Update grid if zoom changed significantly
        const zoom = this.camera.zoom;
        if (Math.abs(zoom - this.lastZoom) > 0.1) {
            this.updateGrid();
            this.lastZoom = zoom;
        }

        // Update crosshair position callback
        if (this.onCrosshairMove) {
            const pos = this.getCrosshairPosition();
            if (pos.valid) {
                this.onCrosshairMove(pos.latitude, pos.longitude);
            }
        }

        this.renderer.render(this.scene, this.camera);
    };

    /**
     * Update sun lighting direction based on a given date
     * @param date - The datetime to calculate sun position for
     */
    updateSunLighting(date: Date): void {
        if (!this.directionalLight) return;

        const subSolar = getSubSolarPoint(date);

        // Convert selenographic coords to Three.js direction
        // Position light in the direction FROM the Moon TO the Sun
        const sunPos = this.latLonToPosition(subSolar.latitude, subSolar.longitude);
        this.directionalLight.position.copy(sunPos.multiplyScalar(3));
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.disposed = true;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }

        window.removeEventListener('resize', this.handleResize);

        this.controls.dispose();
        this.renderer.dispose();

        if (this.crosshair && this.crosshair.parentElement) {
            this.crosshair.parentElement.removeChild(this.crosshair);
        }

        if (this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
    }
}
