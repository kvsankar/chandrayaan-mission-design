/**
 * Orbit Visualization Panel - Main Component
 *
 * Integrates the functional core with the imperative shell (Three.js scene + UI controls).
 * This is the public API for the component.
 */

import { OrbitScene } from './OrbitScene.js';
import { TimelineControls } from './TimelineControls.js';
import * as Astronomy from 'astronomy-engine';
import {
    OrbitVisualizationConfig,
    OrbitPanelState,
    OrbitalParams,
    TimelineConfig,
    DEFAULT_CAPTURE_THRESHOLD,
    DEFAULT_PADDING_DAYS,
    DEFAULT_SPEED
} from './types.js';
import {
    advanceTime,
    calculateDateFromDays,
    calculateDaysElapsed,
    getSpacecraftState,
    calculateDistance,
    checkCaptureCondition
} from './orbitCore.js';
import { calculateMoonPositionAtDate } from '../../../optimization.js';
import { EARTH_MU } from '../../../constants.js';

const AU_TO_KM = 149597870.7;
const DAY_TO_SEC = 86400;

export class OrbitVisualizationPanel {
    private container: HTMLElement;
    private config: OrbitVisualizationConfig;
    private wrapper: HTMLElement | null = null;
    private mainColumn: HTMLElement | null = null;
    private sidebarContainer: HTMLElement | null = null;
    private isFullscreen = false;
    private fullscreenCloseBtn: HTMLButtonElement | null = null;
    private viewOptionsContainer: HTMLElement | null = null;
    private paramsContainer: HTMLElement | null = null;
    private infoContainer: HTMLElement | null = null;
    private timezone: string;

    // Components
    private scene: OrbitScene | null = null;
    private controls: TimelineControls | null = null;

    // State
    private state: OrbitPanelState;

    // Animation
    private animationFrameId: number | null = null;
    private lastFrameTime: number = 0;
    private disposed = false;

    constructor(config: OrbitVisualizationConfig) {
        this.container = config.container;
        this.config = config;
        this.timezone = config.timezone || 'UTC';

        // Initialize state
        const paddingDays = config.timeline.paddingDays ?? DEFAULT_PADDING_DAYS;
        const startDate = new Date(config.timeline.tliDate.getTime() - paddingDays * 24 * 60 * 60 * 1000);
        const endDate = new Date(config.timeline.landingDate.getTime() + paddingDays * 24 * 60 * 60 * 1000);
        const totalDays = calculateDaysElapsed(startDate, endDate);

        this.state = {
            startDate,
            endDate,
            totalDays,
            daysElapsed: 0,
            isPlaying: false,
            speed: DEFAULT_SPEED,
            currentDate: new Date(startDate),
            moonPosition: null,
            craftPosition: null,
            craftTrueAnomaly: 0,
            craftMoonDistance: 0,
            craftEarthDistance: 0,
            isCaptured: false,
            captureDate: null
        };

        this.init();
    }

    private init(): void {
        // Create wrapper structure
        const wrapper = document.createElement('div');
        wrapper.className = 'orbit-panel-wrapper';

        const mainColumn = document.createElement('div');
        mainColumn.className = 'orbit-main-column';
        wrapper.appendChild(mainColumn);

        const sceneContainer = document.createElement('div');
        sceneContainer.className = 'orbit-scene-container';
        mainColumn.appendChild(sceneContainer);

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'orbit-controls-container';
        mainColumn.appendChild(controlsContainer);

        // Fullscreen close button (appears only in fullscreen)
        const closeBtn = document.createElement('button');
        closeBtn.className = 'orbit-fullscreen-close';
        closeBtn.title = 'Exit full screen';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => this.toggleFullscreen());
        wrapper.appendChild(closeBtn);

        this.container.appendChild(wrapper);
        this.wrapper = wrapper;
        this.mainColumn = mainColumn;
        this.fullscreenCloseBtn = closeBtn;

        // Sidebar (view options + params + info)
        this.renderSidebar();
        this.renderViewOptions();
        this.renderParams();
        this.renderInfo();

        // Initialize Three.js scene
        try {
            // Check for WebGL support
            const testCanvas = document.createElement('canvas');
            const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
            if (!gl) {
                console.warn('WebGL not available');
                sceneContainer.innerHTML = '<div class="orbit-no-webgl">WebGL not available</div>';
            } else {
                const width = (this.mainColumn?.clientWidth || this.container.clientWidth || 500);
                const height = (this.container.clientHeight || 500) - 120; // Reserve space for controls

                this.scene = new OrbitScene(sceneContainer, width, Math.max(height, 300));
                this.scene.updateTransferOrbit(this.config.orbital);
            }
        } catch (error) {
            console.warn('Failed to initialize OrbitScene:', error);
        }

        // Initialize timeline controls
        this.controls = new TimelineControls(
            controlsContainer,
            this.config.timeline,
            this.state.startDate,
            this.state.totalDays,
            this.timezone,
            {
                onPlay: () => this.play(),
                onPause: () => this.pause(),
                onReset: () => this.reset(),
                onSpeedChange: (speed) => this.setSpeed(speed),
                onSeek: (days) => this.seekTo(days),
                onJumpToTLI: () => this.seekToDate(this.config.timeline.tliDate),
                onJumpToLOI: () => this.seekToDate(this.config.timeline.loiDate),
                onJumpToLanding: () => this.seekToDate(this.config.timeline.landingDate),
                onJumpToClosest: () => {
                    if (this.config.timeline.closestApproachDate) {
                        this.seekToDate(this.config.timeline.closestApproachDate);
                    }
                }
            }
        );

        // Initial update
        this.updatePositions();
        this.updateUI();
        this.scene?.setViewOptions({});

        // Start animation loop
        this.animate();
    }

    /**
     * Build right-hand sidebar container
     */
    private renderSidebar(): void {
        const sidebar = document.createElement('div');
        sidebar.className = 'orbit-sidebar';
        this.sidebarContainer = sidebar;
        this.wrapper?.appendChild(sidebar);
    }

    /**
     * Render view options (toggles)
     */
    private renderViewOptions(): void {
        if (!this.sidebarContainer) return;
        this.viewOptionsContainer = document.createElement('div');
        this.viewOptionsContainer.className = 'orbit-view-options';
        this.viewOptionsContainer.innerHTML = `
            <div class="orbit-options-title">View Options</div>
            <label><input type="checkbox" data-opt="moon" checked /> Moon</label>
            <label><input type="checkbox" data-opt="transferOrbit" checked /> Transfer Orbit</label>
            <label><input type="checkbox" data-opt="lunarPlane" checked /> Lunar Plane</label>
            <label><input type="checkbox" data-opt="lunarEllipse" checked /> Lunar Orbit Ellipse</label>
            <label><input type="checkbox" data-opt="spacecraft" checked /> Spacecraft</label>
            <label><input type="checkbox" data-opt="labels" checked /> Labels</label>
        `;

        this.viewOptionsContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', () => {
                const key = input.getAttribute('data-opt') as string;
                const value = input.checked;
                if (this.scene) {
                    this.scene.setViewOptions({ [key]: value } as any);
                }
            });
        });

        this.sidebarContainer.appendChild(this.viewOptionsContainer);
    }

    /**
     * Render read-only orbital parameters
     */
    private renderParams(): void {
        if (!this.sidebarContainer) return;
        this.paramsContainer = document.createElement('div');
        this.paramsContainer.className = 'orbit-params';
        this.sidebarContainer.appendChild(this.paramsContainer);
        this.updateParamsDisplay();
    }

    private formatNumber(value: number, decimals: number = 1): string {
        return Number.isFinite(value) ? value.toFixed(decimals) : '--';
    }

    private updateParamsDisplay(): void {
        if (!this.paramsContainer) return;
        const p = this.config.orbital;
        this.paramsContainer.innerHTML = `
            <div class="orbit-params-title">Orbit Parameters</div>
            <div class="orbit-params-grid">
                <div><span class="label">Inclination</span><span>${this.formatNumber(p.inclination, 2)}°</span></div>
                <div><span class="label">RAAN</span><span>${this.formatNumber(p.raan, 2)}°</span></div>
                <div><span class="label">Arg Periapsis (ω)</span><span>${this.formatNumber(p.omega, 2)}°</span></div>
                <div><span class="label">Perigee</span><span>${this.formatNumber(p.perigeeAlt, 0)} km</span></div>
                <div><span class="label">Apogee</span><span>${this.formatNumber(p.apogeeAlt, 0)} km</span></div>
            </div>
        `;
    }

    /**
     * Render info panel (timeline dates + distances)
     */
    private renderInfo(): void {
        if (!this.sidebarContainer) return;
        this.infoContainer = document.createElement('div');
        this.infoContainer.className = 'orbit-info';
        this.sidebarContainer.appendChild(this.infoContainer);
        this.updateInfoDisplay();
    }

    private formatDateShort(date: Date): string {
        try {
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: this.timezone
            }).format(date);
        } catch {
            return '--';
        }
    }

    private updateInfoDisplay(): void {
        if (!this.infoContainer) return;
        const t = this.config.timeline;
        this.infoContainer.innerHTML = `
            <div class="orbit-params-title">Timeline</div>
            <div class="orbit-params-grid">
                <div><span class="label">TLI</span><span>${this.formatDateShort(t.tliDate)}</span></div>
                <div><span class="label">LOI</span><span>${this.formatDateShort(t.loiDate)}</span></div>
                <div><span class="label">Landing</span><span>${this.formatDateShort(t.landingDate)}</span></div>
                <div><span class="label">Current</span><span>${this.formatDateShort(this.state.currentDate)}</span></div>
            </div>
            <div class="orbit-params-title">Distances</div>
            <div class="orbit-params-grid">
                <div><span class="label">Craft-Moon</span><span>${this.state.craftMoonDistance ? this.formatNumber(this.state.craftMoonDistance, 0) + ' km' : '--'}</span></div>
                <div><span class="label">Craft-Earth</span><span>${this.state.craftEarthDistance ? this.formatNumber(this.state.craftEarthDistance, 0) + ' km' : '--'}</span></div>
            </div>
        `;
    }

    /**
     * Main animation loop
     */
    private animate = (): void => {
        if (this.disposed) return;

        this.animationFrameId = requestAnimationFrame(this.animate);

        if (this.state.isPlaying) {
            const now = Date.now();
            const deltaTime = now - this.lastFrameTime;
            this.lastFrameTime = now;

            // Advance time
            const result = advanceTime(
                this.state.daysElapsed,
                deltaTime,
                this.state.speed,
                this.state.totalDays
            );

            this.state.daysElapsed = result.daysElapsed;
            this.state.currentDate = calculateDateFromDays(this.state.startDate, result.daysElapsed);

            if (result.reachedEnd) {
                this.state.isPlaying = false;
            }

            // Update positions and check capture
            this.updatePositions();
            this.checkCapture();

            // Update UI
            this.updateUI();

            // Notify callback
            if (this.config.onTimeChange) {
                this.config.onTimeChange(this.state.currentDate);
            }
        }

        // Render scene
        this.scene?.render();
    };

    /**
     * Update Moon and spacecraft positions using functional core
     */
    private updatePositions(): void {
        // Get Moon position from ephemeris
        try {
            this.state.moonPosition = calculateMoonPositionAtDate(this.state.currentDate);
            this.scene?.updateMoonPosition(this.state.moonPosition);

            // Update the lunar orbit plane so the rendered track matches the Moon's motion
            const lunarElements = this.getMoonOrbitalElements(this.state.currentDate);
            if (lunarElements) {
                this.scene?.updateLunarOrbit(lunarElements.inclination, lunarElements.raan);
                this.scene?.updateLunarOrbitEllipse({
                    semiMajorAxisKm: lunarElements.semiMajorAxis,
                    eccentricity: lunarElements.eccentricity,
                    inclination: lunarElements.inclination,
                    raan: lunarElements.raan,
                    omega: lunarElements.omega
                });
            }

            // Update lunar orbit visualization based on Moon's position
            // (simplified - could calculate actual orbital elements)
        } catch (error) {
            console.warn('Failed to calculate Moon position:', error);
        }

        // Get spacecraft state
        const craftState = getSpacecraftState(
            this.state.currentDate,
            this.config.timeline.tliDate,
            this.config.orbital
        );

        this.state.craftPosition = craftState.position;
        this.state.craftTrueAnomaly = craftState.trueAnomaly;
        this.state.craftEarthDistance = craftState.distanceFromEarth;

        // Hide spacecraft after capture; otherwise show/update
        if (this.state.isCaptured) {
            // Hide spacecraft mesh by not updating position and using captured appearance
            this.scene?.setSpacecraftAppearance('captured');
        } else {
            this.scene?.updateSpacecraftPosition(craftState.position);
            if (!craftState.isLaunched) {
                this.scene?.setSpacecraftAppearance('preLaunch');
            } else {
                this.scene?.setSpacecraftAppearance('normal');
            }
        }

        // Calculate craft-Moon distance
        if (this.state.moonPosition && this.state.craftPosition) {
            this.state.craftMoonDistance = calculateDistance(
                this.state.craftPosition,
                this.state.moonPosition
            );
        }
    }

    /**
     * Check capture condition
     */
    private checkCapture(): void {
        if (this.state.isCaptured) {
            // Check if we've rewound before capture
            if (this.state.captureDate && this.state.currentDate < this.state.captureDate) {
                this.state.isCaptured = false;
                this.state.captureDate = null;
                this.controls?.hideCaptureMessage();
            }
            return;
        }

        if (!this.state.moonPosition || !this.state.craftPosition) return;

        const threshold = this.config.captureThreshold ?? DEFAULT_CAPTURE_THRESHOLD;
        const captured = checkCaptureCondition(
            this.state.craftPosition,
            this.state.moonPosition,
            threshold
        );

        if (captured) {
            this.state.isCaptured = true;
            this.state.captureDate = new Date(this.state.currentDate);
            this.controls?.showCaptureMessage();

            if (this.config.onCapture) {
                this.config.onCapture(this.state.captureDate);
            }
            return;
        }

        // Fallback: consider capture achieved at or after LOI date to mirror main app behavior
        if (this.config.timeline && this.state.currentDate >= this.config.timeline.loiDate) {
            this.state.isCaptured = true;
            this.state.captureDate = new Date(this.state.currentDate);
            this.controls?.showCaptureMessage();
            if (this.config.onCapture) {
                this.config.onCapture(this.state.captureDate);
            }
        }
    }

    /**
     * Update UI controls
     */
    private updateUI(): void {
        this.controls?.update(
            this.state.currentDate,
            this.state.daysElapsed,
            this.state.isPlaying,
            this.state.isCaptured ? null : (this.state.craftMoonDistance || null)
        );
        this.updateInfoDisplay();
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Start playback
     */
    play(): void {
        this.state.isPlaying = true;
        this.lastFrameTime = Date.now();
    }

    /**
     * Pause playback
     */
    pause(): void {
        this.state.isPlaying = false;
    }

    /**
     * Reset to start
     */
    reset(): void {
        this.state.isPlaying = false;
        this.state.daysElapsed = 0;
        this.state.currentDate = new Date(this.state.startDate);
        this.state.isCaptured = false;
        this.state.captureDate = null;
        this.controls?.hideCaptureMessage();
        this.updatePositions();
        this.updateUI();
        // Reapply current view options to scene after reset
        if (this.scene) {
            this.scene.setViewOptions({});
        }
    }

    /**
     * Set playback speed
     */
    setSpeed(daysPerSecond: number): void {
        this.state.speed = daysPerSecond;
        this.controls?.syncSpeed(daysPerSecond);
    }

    /**
     * Seek to specific position
     */
    seekTo(daysElapsed: number): void {
        this.state.daysElapsed = Math.max(0, Math.min(daysElapsed, this.state.totalDays));
        this.state.currentDate = calculateDateFromDays(this.state.startDate, this.state.daysElapsed);

        // Check if we need to reset capture state
        if (this.state.isCaptured && this.state.captureDate &&
            this.state.currentDate < this.state.captureDate) {
            this.state.isCaptured = false;
            this.state.captureDate = null;
            this.controls?.hideCaptureMessage();
        }

        this.updatePositions();
        this.updateUI();

        // Re-check capture at new position
        if (!this.state.isCaptured) {
            this.checkCapture();
        }

        if (this.config.onTimeChange) {
            this.config.onTimeChange(this.state.currentDate);
        }
    }

    /**
    * Seek to an absolute date on the timeline
    */
    seekToDate(date: Date): void {
        const days = calculateDaysElapsed(this.state.startDate, date);
        this.seekTo(days);
    }

    /**
     * Update orbital parameters
     */
    setOrbitalParams(params: Partial<OrbitalParams>): void {
        Object.assign(this.config.orbital, params);
        this.scene?.updateTransferOrbit(this.config.orbital);
        this.updatePositions();
        this.updateParamsDisplay();
    }

    /**
     * Update timeline configuration
     */
    setTimeline(timeline: TimelineConfig): void {
        this.config.timeline = timeline;

        const paddingDays = timeline.paddingDays ?? DEFAULT_PADDING_DAYS;
        this.state.startDate = new Date(timeline.tliDate.getTime() - paddingDays * 24 * 60 * 60 * 1000);
        this.state.endDate = new Date(timeline.landingDate.getTime() + paddingDays * 24 * 60 * 60 * 1000);
        this.state.totalDays = calculateDaysElapsed(this.state.startDate, this.state.endDate);

        // Reset playback and jump to LOI for clarity
        this.state.daysElapsed = 0;
        this.state.currentDate = new Date(this.state.startDate);
        this.state.isPlaying = false;
        this.state.isCaptured = false;
        this.state.captureDate = null;

        // Update controls
        this.controls?.updateTimeline(timeline, this.state.startDate, this.state.totalDays);
        this.controls?.hideCaptureMessage();

        this.updatePositions();
        this.updateUI();

        // Auto-seek to LOI so closest approach is visible immediately
        this.seekToDate(timeline.loiDate);
    }

    /**
     * Get current date
     */
    getCurrentDate(): Date {
        return new Date(this.state.currentDate);
    }

    /**
     * Check if spacecraft is captured
     */
    isCaptured(): boolean {
        return this.state.isCaptured;
    }

    /**
     * Resize the panel
     */
    resize(width: number, height: number): void {
        const controlsHeight = 120;
        this.scene?.resize(width, Math.max(height - controlsHeight, 300));
    }

    /**
     * Update timezone for all displays
     */
    setTimezone(timezone: string): void {
        this.timezone = timezone || 'UTC';
        this.controls?.setTimezone(this.timezone);
        this.updateInfoDisplay();
    }

    /**
     * Toggle fullscreen mode for the visualization panel
     */
    toggleFullscreen(): void {
        if (!this.wrapper) return;

        this.isFullscreen = !this.isFullscreen;
        this.wrapper.classList.toggle('orbit-fullscreen', this.isFullscreen);
        document.body.classList.toggle('orbit-fullscreen-active', this.isFullscreen);
        if (this.fullscreenCloseBtn) {
            this.fullscreenCloseBtn.style.display = this.isFullscreen ? 'block' : 'none';
        }

        // Resize after layout change
        requestAnimationFrame(() => {
            const target = this.wrapper as HTMLElement;
            const width = target.clientWidth || this.container.clientWidth || 800;
            const height = target.clientHeight || this.container.clientHeight || 600;
            this.resize(width, height);
        });
    }

    /**
     * Estimate Moon orbital elements from ephemeris (matches main app approach)
     */
    private getMoonOrbitalElements(date: Date): { inclination: number; raan: number; eccentricity: number; semiMajorAxis: number; omega: number } | null {
        try {
            const time = Astronomy.MakeTime(date);
            const state: any = Astronomy.GeoMoonState(time);
            const hasPosition = state.position !== undefined;

            const pos = {
                x: hasPosition ? state.position.x : state.x,
                y: hasPosition ? state.position.y : state.y,
                z: hasPosition ? state.position.z : state.z
            };
            const vel = {
                x: hasPosition ? state.velocity.x : state.vx,
                y: hasPosition ? state.velocity.y : state.vy,
                z: hasPosition ? state.velocity.z : state.vz
            };

            // Convert to km / km/s
            const r = {
                x: pos.x * AU_TO_KM,
                y: pos.y * AU_TO_KM,
                z: pos.z * AU_TO_KM
            };
            const v = {
                x: (vel.x * AU_TO_KM) / DAY_TO_SEC,
                y: (vel.y * AU_TO_KM) / DAY_TO_SEC,
                z: (vel.z * AU_TO_KM) / DAY_TO_SEC
            };

            // Angular momentum vector h = r × v
            const hx = r.y * v.z - r.z * v.y;
            const hy = r.z * v.x - r.x * v.z;
            const hz = r.x * v.y - r.y * v.x;
            const hMag = Math.sqrt(hx * hx + hy * hy + hz * hz);
            if (hMag < 1e-6) return null;

            // Inclination relative to equatorial plane (XY)
            const inclination = Math.acos(hz / hMag) * (180 / Math.PI);

            // Node vector n = (-h_y, h_x, 0)
            const nx = -hy;
            const ny = hx;
            const nMag = Math.sqrt(nx * nx + ny * ny);

            let raan = 0;
            if (nMag > 1e-6) {
                raan = Math.acos(nx / nMag) * (180 / Math.PI);
                if (ny < 0) raan = 360 - raan;
            }

            // Eccentricity vector
            const rMag = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
            const vMag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            const rDotV = r.x * v.x + r.y * v.y + r.z * v.z;
            const ex = (vMag * vMag - EARTH_MU / rMag) * r.x - rDotV * v.x;
            const ey = (vMag * vMag - EARTH_MU / rMag) * r.y - rDotV * v.y;
            const ez = (vMag * vMag - EARTH_MU / rMag) * r.z - rDotV * v.z;
            const eMag = Math.sqrt(ex * ex + ey * ey + ez * ez) / EARTH_MU;

            // Semi-major axis from vis-viva: a = -mu / (2*E)
            const energy = vMag * vMag / 2 - EARTH_MU / rMag;
            const semiMajorAxis = -EARTH_MU / (2 * energy);

            // Argument of periapsis
            let omega = 0;
            if (nMag > 1e-6 && eMag > 1e-6) {
                const cosOmega = (nx * ex + ny * ey) / (nMag * eMag * EARTH_MU);
                omega = Math.acos(Math.max(-1, Math.min(1, cosOmega))) * (180 / Math.PI);
                if (ez < 0) omega = 360 - omega;
            }

            return {
                inclination,
                raan: raan % 360,
                eccentricity: eMag,
                semiMajorAxis,
                omega
            };
        } catch (error) {
            console.warn('Failed to compute Moon orbital plane:', error);
            return null;
        }
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.disposed = true;

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.scene?.dispose();
        this.controls?.dispose();

        // Remove wrapper
        const wrapper = this.container.querySelector('.orbit-panel-wrapper');
        if (wrapper) {
            this.container.removeChild(wrapper);
        }
    }
}

// Re-export types for convenience
export type { OrbitalParams, TimelineConfig } from './types.js';
