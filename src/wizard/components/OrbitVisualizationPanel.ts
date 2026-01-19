/**
 * OrbitVisualizationPanel - Displays orbital visualization for the Mission Design Wizard
 *
 * Shows:
 * - Celestial sphere with Earth at center
 * - Equator plane
 * - Lunar orbit with Moon position
 * - Chandrayaan's transfer orbit with spacecraft position
 * - Orbital nodes (ascending/descending)
 *
 * Designed to be embedded in wizard steps (Step 4: LOI Date Selection)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Astronomy from 'astronomy-engine';
import {
    SPHERE_RADIUS,
    LUNAR_ORBIT_DISTANCE,
    SCALE_FACTOR,
    EARTH_RADIUS,
    COLORS,
    ORBIT_SEGMENTS_STANDARD,
    ORBIT_SEGMENTS_DETAILED
} from '../../constants.js';
import {
    getTrueAnomalyFromTime,
    calculateMoonPositionAtDate
} from '../../optimization.js';

// Timeline speed options (days per second)
const SPEED_OPTIONS = [
    { value: 0.041667, label: '1 hr/sec' },
    { value: 0.125, label: '3 hr/sec' },
    { value: 0.25, label: '6 hr/sec' },
    { value: 0.5, label: '12 hr/sec' },
    { value: 1, label: '1 day/sec' },
    { value: 2, label: '2 days/sec' }
];

export interface OrbitalParameters {
    // Chandrayaan orbit
    inclination: number;     // degrees
    raan: number;            // degrees (Right Ascension of Ascending Node)
    omega: number;           // degrees (Argument of Periapsis)
    perigeeAlt: number;      // km
    apogeeAlt: number;       // km
    trueAnomaly: number;     // degrees (position in orbit)
}

export interface LunarParameters {
    inclination: number;     // degrees
    raan: number;            // degrees
    moonRA: number;          // degrees (Moon's Right Ascension)
}

export type VisualizationMode = 'Explore' | 'Plan' | 'Game';

export interface TimelineConfig {
    tliDate: Date;           // Trans-Lunar Injection date
    loiDate: Date;           // Lunar Orbit Insertion date
    landingDate: Date;       // Landing date
    paddingDays?: number;    // Days before TLI and after landing (default: 5)
}

export interface OrbitVisualizationPanelOptions {
    container: HTMLElement;
    width?: number;
    height?: number;
    mode?: VisualizationMode;
    orbitalParams?: OrbitalParameters;
    lunarParams?: LunarParameters;
    currentDate?: Date;
    showControls?: boolean;
    timeline?: TimelineConfig;
    onTimeChange?: (date: Date) => void;
}

export class OrbitVisualizationPanel {
    private container: HTMLElement;
    private width: number;
    private height: number;
    private mode: VisualizationMode;

    // Three.js components
    private scene: THREE.Scene | null = null;
    private camera: THREE.PerspectiveCamera | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private controls: OrbitControls | null = null;
    private animationFrameId: number | null = null;
    private disposed = false;

    // Scene objects
    private celestialSphere: THREE.Mesh | null = null;
    private equator: THREE.Line | null = null;
    private lunarOrbit: THREE.Line | null = null;
    private lunarOrbitEllipse: THREE.Line | null = null;
    private chandrayaanOrbit: THREE.Line | null = null;
    private moon: THREE.Mesh | null = null;
    private spacecraft: THREE.Mesh | null = null;
    private earth: THREE.Mesh | null = null;
    private lunarAscendingNode: THREE.Mesh | null = null;
    private lunarDescendingNode: THREE.Mesh | null = null;
    private chandrayaanAscendingNode: THREE.Mesh | null = null;
    private chandrayaanDescendingNode: THREE.Mesh | null = null;
    private xAxis: THREE.Line | null = null;
    private yAxis: THREE.Line | null = null;
    private zAxis: THREE.Line | null = null;
    private ariesMarker: THREE.Sprite | null = null;

    // Orbital parameters
    private orbitalParams: OrbitalParameters;
    private lunarParams: LunarParameters;
    private currentDate: Date;

    // Timeline state
    private timeline: TimelineConfig | null = null;
    private timelineStartDate: Date | null = null;
    private timelineEndDate: Date | null = null;
    private timelineDaysElapsed = 0;
    private timelineTotalDays = 0;
    private isPlaying = false;
    private playbackSpeed = 0.25;  // days per second (6 hr/sec default)
    private lastFrameTime = 0;

    // Timeline UI elements
    private wrapper: HTMLElement | null = null;
    private timelineContainer: HTMLElement | null = null;
    private timelineSlider: HTMLInputElement | null = null;
    private playPauseBtn: HTMLButtonElement | null = null;
    private speedSelect: HTMLSelectElement | null = null;
    private currentDateDisplay: HTMLElement | null = null;
    private fullscreenBtn: HTMLButtonElement | null = null;
    private isFullscreen = false;

    // Callbacks
    private onTimeChange?: (date: Date) => void;

    constructor(options: OrbitVisualizationPanelOptions) {
        this.container = options.container;
        this.width = options.width || 400;
        this.height = options.height || 400;
        this.mode = options.mode || 'Plan';
        this.onTimeChange = options.onTimeChange;

        // Default orbital parameters (CY3-like)
        this.orbitalParams = options.orbitalParams || {
            inclination: 21.5,
            raan: 262,
            omega: 178,
            perigeeAlt: 180,
            apogeeAlt: 378029,
            trueAnomaly: 0
        };

        // Default lunar parameters
        this.lunarParams = options.lunarParams || {
            inclination: 23.44,
            raan: 0,
            moonRA: 0
        };

        this.currentDate = options.currentDate || new Date();

        // Initialize timeline if provided
        if (options.timeline) {
            this.timeline = options.timeline;
            const paddingDays = options.timeline.paddingDays ?? 5;
            this.timelineStartDate = new Date(options.timeline.tliDate.getTime() - paddingDays * 24 * 60 * 60 * 1000);
            this.timelineEndDate = new Date(options.timeline.landingDate.getTime() + paddingDays * 24 * 60 * 60 * 1000);
            this.timelineTotalDays = (this.timelineEndDate.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000);
            this.timelineDaysElapsed = 0;
            this.currentDate = new Date(this.timelineStartDate);
        }

        this.init();
    }

    private init(): void {
        // Create wrapper element
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'orbit-visualization-panel';
        this.wrapper.style.width = '100%';
        this.wrapper.style.height = '100%';
        this.wrapper.style.position = 'relative';
        this.container.appendChild(this.wrapper);

        // Create Three.js scene
        this.scene = new THREE.Scene();

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 10000);
        this.camera.position.set(180, 120, 180);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x0a0a1e, 1);
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = 'auto';
        this.wrapper.appendChild(this.renderer.domElement);

        // Orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 400;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        pointLight.position.set(150, 150, 150);
        this.scene.add(pointLight);

        // Create scene objects
        this.createCelestialSphere();
        this.createAxes();
        this.createAriesMarker();
        this.createEquator();
        this.createEarth();
        this.createLunarOrbit();
        this.createLunarNodes();
        this.createMoon();
        this.createChandrayaanOrbit();
        this.createChandrayaanNodes();
        this.createSpacecraft();

        // Update positions based on current date
        this.updateFromDate(this.currentDate);

        // Create timeline controls if timeline is configured
        if (this.timeline) {
            this.createTimelineControls();
        }

        // Fullscreen toggle
        this.createFullscreenButton();

        // Start animation loop
        this.animate();
    }

    private createTimelineControls(): void {
        if (!this.wrapper || this.timelineContainer) return;  // Already exists or no wrapper
        this.timelineContainer = document.createElement('div');
        this.timelineContainer.className = 'orbit-timeline-controls';

        // Current date display
        this.currentDateDisplay = document.createElement('div');
        this.currentDateDisplay.className = 'orbit-current-date';
        this.updateDateDisplay();
        this.timelineContainer.appendChild(this.currentDateDisplay);

        // Slider row
        const sliderRow = document.createElement('div');
        sliderRow.className = 'orbit-slider-row';

        this.timelineSlider = document.createElement('input');
        this.timelineSlider.type = 'range';
        this.timelineSlider.className = 'orbit-timeline-slider';
        this.timelineSlider.min = '0';
        this.timelineSlider.max = String(this.timelineTotalDays);
        this.timelineSlider.step = '0.01';
        this.timelineSlider.value = '0';
        this.timelineSlider.addEventListener('input', this.onSliderInput.bind(this));
        sliderRow.appendChild(this.timelineSlider);

        this.timelineContainer.appendChild(sliderRow);

        // Controls row
        const controlsRow = document.createElement('div');
        controlsRow.className = 'orbit-controls-row';

        // Play/Pause button
        this.playPauseBtn = document.createElement('button');
        this.playPauseBtn.className = 'orbit-play-btn';
        this.playPauseBtn.textContent = '▶ Play';
        this.playPauseBtn.addEventListener('click', this.togglePlayback.bind(this));
        controlsRow.appendChild(this.playPauseBtn);

        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.className = 'orbit-reset-btn';
        resetBtn.textContent = 'Reset';
        resetBtn.addEventListener('click', this.resetTimeline.bind(this));
        controlsRow.appendChild(resetBtn);

        // Speed selector
        this.speedSelect = document.createElement('select');
        this.speedSelect.className = 'orbit-speed-select';
        SPEED_OPTIONS.forEach(opt => {
            const option = document.createElement('option');
            option.value = String(opt.value);
            option.textContent = opt.label;
            if (opt.value === this.playbackSpeed) option.selected = true;
            this.speedSelect.appendChild(option);
        });
        this.speedSelect.addEventListener('change', this.onSpeedChange.bind(this));
        controlsRow.appendChild(this.speedSelect);

        this.timelineContainer.appendChild(controlsRow);

        // Add markers row showing TLI, LOI, Landing
        const markersRow = document.createElement('div');
        markersRow.className = 'orbit-markers-row';
        markersRow.innerHTML = this.createTimelineMarkers();
        this.timelineContainer.appendChild(markersRow);

        this.wrapper.appendChild(this.timelineContainer);
    }

    private createFullscreenButton(): void {
        if (!this.wrapper) return;
        this.fullscreenBtn = document.createElement('button');
        this.fullscreenBtn.className = 'orbit-fullscreen-btn';
        this.fullscreenBtn.title = 'Expand to full screen';
        this.fullscreenBtn.textContent = '⛶';
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.wrapper.appendChild(this.fullscreenBtn);
    }

    private createTimelineMarkers(): string {
        if (!this.timeline || !this.timelineStartDate || !this.timelineEndDate) return '';

        const totalMs = this.timelineEndDate.getTime() - this.timelineStartDate.getTime();

        const tliOffset = ((this.timeline.tliDate.getTime() - this.timelineStartDate.getTime()) / totalMs) * 100;
        const loiOffset = ((this.timeline.loiDate.getTime() - this.timelineStartDate.getTime()) / totalMs) * 100;
        const landingOffset = ((this.timeline.landingDate.getTime() - this.timelineStartDate.getTime()) / totalMs) * 100;

        return `
            <div class="orbit-marker tli-marker" style="left: ${tliOffset}%;" title="TLI">TLI</div>
            <div class="orbit-marker loi-marker" style="left: ${loiOffset}%;" title="LOI">LOI</div>
            <div class="orbit-marker landing-marker" style="left: ${landingOffset}%;" title="Landing">Land</div>
        `;
    }

    private onSliderInput(): void {
        if (!this.timelineSlider || !this.timelineStartDate) return;

        this.timelineDaysElapsed = parseFloat(this.timelineSlider.value);
        this.currentDate = new Date(
            this.timelineStartDate.getTime() + this.timelineDaysElapsed * 24 * 60 * 60 * 1000
        );

        this.updateDateDisplay();
        this.updateVisualizationForCurrentTime();
    }

    private togglePlayback(): void {
        this.isPlaying = !this.isPlaying;

        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = this.isPlaying ? '⏸ Pause' : '▶ Play';
        }

        if (this.isPlaying) {
            this.lastFrameTime = Date.now();
        }
    }

    private resetTimeline(): void {
        this.isPlaying = false;
        this.timelineDaysElapsed = 0;

        if (this.timelineSlider) {
            this.timelineSlider.value = '0';
        }

        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = '▶ Play';
        }

        if (this.timelineStartDate) {
            this.currentDate = new Date(this.timelineStartDate);
        }

        this.updateDateDisplay();
        this.updateVisualizationForCurrentTime();
    }

    private onSpeedChange(): void {
        if (this.speedSelect) {
            this.playbackSpeed = parseFloat(this.speedSelect.value);
        }
    }

    private updateDateDisplay(): void {
        if (!this.currentDateDisplay) return;

        const formatter = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        this.currentDateDisplay.textContent = formatter.format(this.currentDate);
    }

    private updateVisualizationForCurrentTime(): void {
        // Update Moon position from ephemeris
        this.updateFromDate(this.currentDate);

        // Update spacecraft position based on timeline
        if (this.timeline) {
            const trueAnomaly = this.calculateTrueAnomalyFromTime();
            this.orbitalParams.trueAnomaly = trueAnomaly;
            this.updateSpacecraftPosition();
        }

        if (this.onTimeChange) {
            this.onTimeChange(this.currentDate);
        }
    }

    /**
     * Calculate true anomaly using shared Kepler's equation solver
     */
    private calculateTrueAnomalyFromTime(): number {
        if (!this.timeline) return 0;

        const timeSinceTLI = (this.currentDate.getTime() - this.timeline.tliDate.getTime()) / 1000;  // seconds

        // Before TLI: spacecraft at perigee (true anomaly = 0)
        if (timeSinceTLI < 0) {
            return 0;
        }

        // Use shared function from optimization.ts
        return getTrueAnomalyFromTime(
            timeSinceTLI,
            this.orbitalParams.perigeeAlt,
            this.orbitalParams.apogeeAlt
        );
    }

    private createCelestialSphere(): void {
        const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0x1a1a2e,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            wireframe: false,
            depthWrite: false
        });
        this.celestialSphere = new THREE.Mesh(geometry, material);
        this.celestialSphere.renderOrder = 0;
        this.scene.add(this.celestialSphere);
    }

    private createAxes(): void {
        // X-axis (to First Point of Aries) - Red
        const xPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(SPHERE_RADIUS * 1.2, 0, 0)];
        const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
        const xMaterial = new THREE.LineDashedMaterial({
            color: COLORS.xAxis,
            dashSize: 3,
            gapSize: 2
        });
        this.xAxis = new THREE.Line(xGeometry, xMaterial);
        this.xAxis.computeLineDistances();
        this.scene.add(this.xAxis);

        // Y-axis (to RA=90°) - Green
        const yPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -SPHERE_RADIUS * 1.2)];
        const yGeometry = new THREE.BufferGeometry().setFromPoints(yPoints);
        const yMaterial = new THREE.LineDashedMaterial({
            color: COLORS.yAxis,
            dashSize: 3,
            gapSize: 2
        });
        this.yAxis = new THREE.Line(yGeometry, yMaterial);
        this.yAxis.computeLineDistances();
        this.scene.add(this.yAxis);

        // Z-axis (to North Celestial Pole) - Blue
        const zPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, SPHERE_RADIUS * 1.2, 0)];
        const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);
        const zMaterial = new THREE.LineDashedMaterial({
            color: COLORS.zAxis,
            dashSize: 3,
            gapSize: 2
        });
        this.zAxis = new THREE.Line(zGeometry, zMaterial);
        this.zAxis.computeLineDistances();
        this.scene.add(this.zAxis);
    }

    private createAriesMarker(): void {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 128;
        canvas.height = 128;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ff0000';
        context.font = 'Bold 80px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('♈', canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.ariesMarker = new THREE.Sprite(material);
        this.ariesMarker.position.set(SPHERE_RADIUS * 1.25, 0, 0);
        this.ariesMarker.scale.set(8, 8, 1);
        this.scene.add(this.ariesMarker);
    }

    private createEquator(): void {
        this.equator = this.createGreatCircle(SPHERE_RADIUS, COLORS.equator, 0, 0);
        this.scene.add(this.equator);
    }

    private createEarth(): void {
        // Small Earth at center for reference
        const geometry = new THREE.SphereGeometry(EARTH_RADIUS * SCALE_FACTOR, 32, 32);
        const material = new THREE.MeshPhongMaterial({ color: 0x4488ff });
        this.earth = new THREE.Mesh(geometry, material);
        this.scene.add(this.earth);
    }

    private createLunarOrbit(): void {
        // Circular representation on celestial sphere
        this.lunarOrbit = this.createGreatCircle(
            SPHERE_RADIUS,
            COLORS.lunarOrbitPlane,
            this.lunarParams.inclination,
            this.lunarParams.raan
        );
        this.scene.add(this.lunarOrbit);

        // Dashed ellipse showing actual lunar orbit (for Plan/Game modes)
        this.createLunarOrbitEllipse();
    }

    private createLunarOrbitEllipse(): void {
        // Moon's actual elliptical orbit
        const e = 0.0549;  // Moon's eccentricity
        const a = LUNAR_ORBIT_DISTANCE;  // Semi-major axis in km

        const segments = ORBIT_SEGMENTS_STANDARD;
        const omega = 0;  // Simplified
        const inc = THREE.MathUtils.degToRad(this.lunarParams.inclination);
        const raan = THREE.MathUtils.degToRad(this.lunarParams.raan);

        const points = Array.from({ length: segments + 1 }, (_, i) => {
            const theta = (i / segments) * Math.PI * 2;
            const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
            const point = new THREE.Vector3(
                r * SCALE_FACTOR * Math.cos(theta),
                0,
                -r * SCALE_FACTOR * Math.sin(theta)
            );

            point.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega);
            point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
            point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

            return point;
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: COLORS.moon,
            dashSize: 3,
            gapSize: 2
        });
        this.lunarOrbitEllipse = new THREE.Line(geometry, material);
        this.lunarOrbitEllipse.computeLineDistances();
        this.lunarOrbitEllipse.visible = this.mode === 'Plan' || this.mode === 'Game';
        this.scene.add(this.lunarOrbitEllipse);
    }

    private createLunarNodes(): void {
        const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);

        const ascMaterial = new THREE.MeshBasicMaterial({ color: COLORS.lunarAscending });
        this.lunarAscendingNode = new THREE.Mesh(nodeGeometry, ascMaterial);
        this.scene.add(this.lunarAscendingNode);

        const descMaterial = new THREE.MeshBasicMaterial({ color: COLORS.lunarDescending });
        this.lunarDescendingNode = new THREE.Mesh(nodeGeometry, descMaterial);
        this.scene.add(this.lunarDescendingNode);

        this.updateLunarNodePositions();
    }

    private updateLunarNodePositions(): void {
        const inc = THREE.MathUtils.degToRad(this.lunarParams.inclination);
        const raan = THREE.MathUtils.degToRad(this.lunarParams.raan);

        const ascendingPos = new THREE.Vector3(SPHERE_RADIUS, 0, 0);
        ascendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        ascendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
        this.lunarAscendingNode?.position.copy(ascendingPos);

        const descendingPos = new THREE.Vector3(-SPHERE_RADIUS, 0, 0);
        descendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        descendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
        this.lunarDescendingNode?.position.copy(descendingPos);
    }

    private createMoon(): void {
        const moonGeometry = new THREE.SphereGeometry(3, 32, 32);
        const moonMaterial = new THREE.MeshPhongMaterial({ color: COLORS.moon });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.scene.add(this.moon);
        this.updateMoonPosition();
    }

    private updateMoonPosition(): void {
        if (!this.moon) return;

        // In Game mode with timeline, use real Moon position from ephemeris
        if (this.mode === 'Game' && this.timeline) {
            try {
                // Get real Moon position in km (celestial coords)
                const moonPosKm = calculateMoonPositionAtDate(this.currentDate);

                // Convert celestial coords to Three.js coords and scale
                // Celestial (x, y, z) → Three.js (x, z, -y)
                const moonPos = new THREE.Vector3(
                    moonPosKm.x * SCALE_FACTOR,
                    moonPosKm.z * SCALE_FACTOR,
                    -moonPosKm.y * SCALE_FACTOR
                );

                this.moon.position.copy(moonPos);
                return;
            } catch (error) {
                console.warn('Could not get real Moon position:', error);
            }
        }

        // Fallback: position on celestial sphere using RA
        const inc = THREE.MathUtils.degToRad(this.lunarParams.inclination);
        const raan = THREE.MathUtils.degToRad(this.lunarParams.raan);
        const moonRA = THREE.MathUtils.degToRad(this.lunarParams.moonRA);

        // Calculate angle in orbit from RA
        const angleInOrbit = moonRA - raan;

        const moonPos = new THREE.Vector3(
            SPHERE_RADIUS * Math.cos(angleInOrbit),
            0,
            -SPHERE_RADIUS * Math.sin(angleInOrbit)
        );

        moonPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        moonPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

        this.moon.position.copy(moonPos);
    }

    private createChandrayaanOrbit(): void {
        this.updateChandrayaanOrbit();
    }

    private updateChandrayaanOrbit(): void {
        // Remove existing orbit
        if (this.chandrayaanOrbit) {
            this.scene.remove(this.chandrayaanOrbit);
        }

        const rp = EARTH_RADIUS + this.orbitalParams.perigeeAlt;
        const ra = EARTH_RADIUS + this.orbitalParams.apogeeAlt;
        const e = (ra - rp) / (ra + rp);
        const perigeeDistance = rp * SCALE_FACTOR;
        const a = perigeeDistance / (1 - e);

        const segments = ORBIT_SEGMENTS_DETAILED;
        const omega = THREE.MathUtils.degToRad(this.orbitalParams.omega);
        const inc = THREE.MathUtils.degToRad(this.orbitalParams.inclination);
        const raan = THREE.MathUtils.degToRad(this.orbitalParams.raan);

        const points = Array.from({ length: segments + 1 }, (_, i) => {
            const theta = (i / segments) * Math.PI * 2;
            const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
            const point = new THREE.Vector3(
                r * Math.cos(theta),
                0,
                -r * Math.sin(theta)
            );

            point.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega);
            point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
            point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

            return point;
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: COLORS.chandrayaanOrbit,
            dashSize: 3,
            gapSize: 2
        });
        this.chandrayaanOrbit = new THREE.Line(geometry, material);
        this.chandrayaanOrbit.computeLineDistances();
        this.scene.add(this.chandrayaanOrbit);
    }

    private createChandrayaanNodes(): void {
        const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);

        const ascMaterial = new THREE.MeshBasicMaterial({ color: COLORS.chandrayaanAscending });
        this.chandrayaanAscendingNode = new THREE.Mesh(nodeGeometry, ascMaterial);
        this.scene.add(this.chandrayaanAscendingNode);

        const descMaterial = new THREE.MeshBasicMaterial({ color: COLORS.chandrayaanDescending });
        this.chandrayaanDescendingNode = new THREE.Mesh(nodeGeometry, descMaterial);
        this.scene.add(this.chandrayaanDescendingNode);

        this.updateChandrayaanNodePositions();
    }

    private updateChandrayaanNodePositions(): void {
        const inc = THREE.MathUtils.degToRad(this.orbitalParams.inclination);
        const raan = THREE.MathUtils.degToRad(this.orbitalParams.raan);

        const ascendingPos = new THREE.Vector3(SPHERE_RADIUS, 0, 0);
        ascendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        ascendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
        this.chandrayaanAscendingNode?.position.copy(ascendingPos);

        const descendingPos = new THREE.Vector3(-SPHERE_RADIUS, 0, 0);
        descendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        descendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
        this.chandrayaanDescendingNode?.position.copy(descendingPos);
    }

    private createSpacecraft(): void {
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: COLORS.chandrayaan });
        this.spacecraft = new THREE.Mesh(geometry, material);
        this.scene.add(this.spacecraft);
        this.updateSpacecraftPosition();
    }

    private updateSpacecraftPosition(): void {
        if (!this.spacecraft) return;

        const rp = EARTH_RADIUS + this.orbitalParams.perigeeAlt;
        const ra = EARTH_RADIUS + this.orbitalParams.apogeeAlt;
        const e = (ra - rp) / (ra + rp);
        const perigeeDistance = rp * SCALE_FACTOR;
        const a = perigeeDistance / (1 - e);

        const omega = THREE.MathUtils.degToRad(this.orbitalParams.omega);
        const inc = THREE.MathUtils.degToRad(this.orbitalParams.inclination);
        const raan = THREE.MathUtils.degToRad(this.orbitalParams.raan);
        const nu = THREE.MathUtils.degToRad(this.orbitalParams.trueAnomaly);

        const r = a * (1 - e * e) / (1 + e * Math.cos(nu));
        const spacecraftPos = new THREE.Vector3(
            r * Math.cos(nu),
            0,
            -r * Math.sin(nu)
        );

        spacecraftPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega);
        spacecraftPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        spacecraftPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

        this.spacecraft.position.copy(spacecraftPos);
    }

    private createGreatCircle(radius: number, color: number, inclination: number = 0, raan: number = 0): THREE.Line {
        const segments = ORBIT_SEGMENTS_STANDARD;
        const incRad = THREE.MathUtils.degToRad(inclination);
        const raanRad = THREE.MathUtils.degToRad(raan);

        const points = Array.from({ length: segments + 1 }, (_, i) => {
            const theta = (i / segments) * Math.PI * 2;
            const x = radius * Math.cos(theta);
            const y = 0;
            const z = -radius * Math.sin(theta);

            const point = new THREE.Vector3(x, y, z);
            point.applyAxisAngle(new THREE.Vector3(1, 0, 0), incRad);
            point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);

            return point;
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
        return new THREE.Line(geometry, material);
    }

    /**
     * Update visualization based on a specific date
     * Uses astronomy-engine to get real Moon position
     */
    updateFromDate(date: Date): void {
        this.currentDate = date;

        try {
            // Get real Moon position from ephemeris
            const time = Astronomy.MakeTime(date);
            const moonEquator = Astronomy.Equator('Moon', time, null, false, true);

            // Update lunar parameters from ephemeris
            this.lunarParams.moonRA = moonEquator.ra * 15;  // Convert hours to degrees

            // Get lunar orbital elements
            const moonOrbitElements = this.getMoonOrbitalElements(date);
            this.lunarParams.inclination = moonOrbitElements.inclination;
            this.lunarParams.raan = moonOrbitElements.raan;

            // Update visuals
            this.updateLunarOrbit();
            this.updateMoonPosition();
            this.updateLunarNodePositions();
        } catch (error) {
            console.warn('Could not get Moon ephemeris data:', error);
        }

        if (this.onTimeChange) {
            this.onTimeChange(date);
        }
    }

    private getMoonOrbitalElements(date: Date): { inclination: number; raan: number } {
        // Simplified calculation - could be enhanced with astronomy-engine
        // For now, return reasonable approximations
        try {
            const time = Astronomy.MakeTime(date);
            const moonState = Astronomy.GeoMoonState(time);

            // Calculate inclination from position and velocity
            // This is a simplified approach
            // GeoMoonState returns { position: Vector, velocity: Vector }
            const pos = new THREE.Vector3(
                moonState.position.x,
                moonState.position.y,
                moonState.position.z
            );
            const vel = new THREE.Vector3(
                moonState.velocity.x,
                moonState.velocity.y,
                moonState.velocity.z
            );

            // Angular momentum vector
            const h = new THREE.Vector3().crossVectors(pos, vel);

            // Inclination from angular momentum
            const inclination = Math.acos(h.y / h.length()) * (180 / Math.PI);

            // RAAN calculation
            const n = new THREE.Vector3(-h.z, 0, h.x); // Node vector
            let raan = Math.acos(n.x / n.length()) * (180 / Math.PI);
            if (n.z < 0) raan = 360 - raan;

            return {
                inclination: Math.min(28.6, Math.max(18.3, inclination)),
                raan: raan % 360
            };
        } catch {
            return { inclination: 23.44, raan: 0 };
        }
    }

    private updateLunarOrbit(): void {
        if (this.lunarOrbit) {
            this.scene.remove(this.lunarOrbit);
        }

        this.lunarOrbit = this.createGreatCircle(
            SPHERE_RADIUS,
            COLORS.lunarOrbitPlane,
            this.lunarParams.inclination,
            this.lunarParams.raan
        );
        this.scene.add(this.lunarOrbit);

        // Also update ellipse
        if (this.lunarOrbitEllipse) {
            this.scene.remove(this.lunarOrbitEllipse);
        }
        this.createLunarOrbitEllipse();
    }

    /**
     * Set orbital parameters
     */
    setOrbitalParams(params: Partial<OrbitalParameters>): void {
        Object.assign(this.orbitalParams, params);
        this.updateChandrayaanOrbit();
        this.updateSpacecraftPosition();
        this.updateChandrayaanNodePositions();
    }

    /**
     * Set the visualization mode
     */
    setMode(mode: VisualizationMode): void {
        this.mode = mode;

        // Update visibility of elements based on mode
        if (this.lunarOrbitEllipse) {
            this.lunarOrbitEllipse.visible = mode === 'Plan' || mode === 'Game';
        }
    }

    /**
     * Set spacecraft position by true anomaly
     */
    setTrueAnomaly(trueAnomaly: number): void {
        this.orbitalParams.trueAnomaly = trueAnomaly;
        this.updateSpacecraftPosition();
    }

    /**
     * Animation loop
     */
    private animate = (): void => {
        if (this.disposed) return;

        this.animationFrameId = requestAnimationFrame(this.animate);

        // Handle timeline playback
        if (this.isPlaying && this.timeline && this.timelineStartDate) {
            const now = Date.now();
            const deltaTime = (now - this.lastFrameTime) / 1000;  // seconds
            this.lastFrameTime = now;

            // Update days elapsed based on playback speed
            const daysIncrement = this.playbackSpeed * deltaTime;
            this.timelineDaysElapsed += daysIncrement;

            // Clamp to total days
            if (this.timelineDaysElapsed >= this.timelineTotalDays) {
                this.timelineDaysElapsed = this.timelineTotalDays;
                this.isPlaying = false;
                if (this.playPauseBtn) {
                    this.playPauseBtn.textContent = '▶ Play';
                }
            }

            // Update current date
            this.currentDate = new Date(
                this.timelineStartDate.getTime() + this.timelineDaysElapsed * 24 * 60 * 60 * 1000
            );

            // Update slider
            if (this.timelineSlider) {
                this.timelineSlider.value = String(this.timelineDaysElapsed);
            }

            // Update display and visualization
            this.updateDateDisplay();
            this.updateVisualizationForCurrentTime();
        }

        this.controls?.update();
        this.render();
    };

    private render(): void {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Resize the visualization
     */
    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;

        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }

        if (this.renderer) {
            this.renderer.setSize(width, height);
        }
    }

    /**
     * Get current orbital parameters
     */
    getOrbitalParams(): OrbitalParameters {
        return { ...this.orbitalParams };
    }

    /**
     * Get current lunar parameters
     */
    getLunarParams(): LunarParameters {
        return { ...this.lunarParams };
    }

    /**
     * Set timeline configuration (for updating after LOI selection)
     */
    setTimeline(config: TimelineConfig): void {
        this.timeline = config;
        const paddingDays = config.paddingDays ?? 5;
        this.timelineStartDate = new Date(config.tliDate.getTime() - paddingDays * 24 * 60 * 60 * 1000);
        this.timelineEndDate = new Date(config.landingDate.getTime() + paddingDays * 24 * 60 * 60 * 1000);
        this.timelineTotalDays = (this.timelineEndDate.getTime() - this.timelineStartDate.getTime()) / (24 * 60 * 60 * 1000);

        // Reset to start
        this.timelineDaysElapsed = 0;
        this.isPlaying = false;
        this.currentDate = new Date(this.timelineStartDate);

        // Create controls if they don't exist yet
        if (!this.timelineContainer) {
            this.createTimelineControls();
        }

        // Update slider
        if (this.timelineSlider) {
            this.timelineSlider.max = String(this.timelineTotalDays);
            this.timelineSlider.value = '0';
        }

        // Update play button
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = '▶ Play';
        }

        // Update markers
        const markersRow = this.timelineContainer?.querySelector('.orbit-markers-row');
        if (markersRow) {
            markersRow.innerHTML = this.createTimelineMarkers();
        }

        this.updateDateDisplay();
        this.updateVisualizationForCurrentTime();
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.disposed = true;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Dispose Three.js resources
        this.scene?.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
            if (object instanceof THREE.Line) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
            if (object instanceof THREE.Sprite) {
                object.material.map?.dispose();
                object.material.dispose();
            }
        });

        this.renderer?.dispose();
        this.controls?.dispose();

        if (this.isFullscreen) {
            document.body.classList.remove('orbit-fullscreen-active');
        }

        // Remove canvas from DOM
        const canvas = this.renderer?.domElement;
        if (canvas?.parentElement) {
            canvas.parentElement.remove();
        }

        // Clear references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
    }

    toggleFullscreen(): void {
        if (!this.wrapper) return;

        this.isFullscreen = !this.isFullscreen;
        this.wrapper.classList.toggle('orbit-fullscreen', this.isFullscreen);
        document.body.classList.toggle('orbit-fullscreen-active', this.isFullscreen);

        if (this.fullscreenBtn) {
            this.fullscreenBtn.textContent = this.isFullscreen ? '✕' : '⛶';
            this.fullscreenBtn.title = this.isFullscreen ? 'Exit full screen' : 'Expand to full screen';
        }

        // Resize after layout change
        requestAnimationFrame(() => {
            const target = this.isFullscreen ? this.wrapper : this.container;
            const width = target.clientWidth || this.width;
            const height = target.clientHeight || this.height;
            this.resize(width, height);
            this.render();
        });
    }
}
