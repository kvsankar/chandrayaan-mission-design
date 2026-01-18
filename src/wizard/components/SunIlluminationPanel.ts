/**
 * SunIlluminationPanel - Displays sun illumination visualization for a landing window
 *
 * Shows:
 * - Moon globe with realistic sun lighting direction
 * - Timeline chart showing sun altitude at primary and secondary sites
 * - Draggable slider to scrub through time
 * - Mission duration information
 */

import * as THREE from 'three';
import { LandingWindowWithRaan, calculateSunElevation, getSubSolarPoint, findElevationCrossing } from '../calculations/sunElevation.js';

const DEG_TO_RAD = Math.PI / 180;
const MOON_RADIUS = 40;  // Smaller than main globe view

// Mission crossing times
interface MissionTimes {
    sixDegRising: Date;
    nineDegRising: Date;
    sixDegSetting: Date;
    missionDurationHours: number;
}

export interface SunIlluminationPanelOptions {
    container: HTMLElement;
    primarySite: { name: string; latitude: number; longitude: number };
    secondarySite?: { name: string; latitude: number; longitude: number };
    landingWindow: LandingWindowWithRaan;
    timezone?: string;
}

interface AltitudePoint {
    time: Date;
    altitude: number;
}

export class SunIlluminationPanel {
    private container: HTMLElement;
    private primarySite: { name: string; latitude: number; longitude: number };
    private secondarySite?: { name: string; latitude: number; longitude: number };
    private landingWindow: LandingWindowWithRaan;
    private timezone: string;

    // Three.js components for mini globe
    private scene: THREE.Scene | null = null;
    private camera: THREE.OrthographicCamera | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private moonGroup: THREE.Group | null = null;  // Container for moon mesh and markers
    private moon: THREE.Mesh | null = null;
    private directionalLight: THREE.DirectionalLight | null = null;
    private animationFrameId: number | null = null;
    private disposed = false;

    // Chart components
    private chartCanvas: HTMLCanvasElement | null = null;
    private chartCtx: CanvasRenderingContext2D | null = null;

    // Timeline data
    private primaryAltitudes: AltitudePoint[] = [];
    private secondaryAltitudes: AltitudePoint[] = [];
    private timelineStart: Date;
    private timelineEnd: Date;
    private currentTime: Date;

    // Slider state
    private isDragging = false;

    // Mission times (6° and 9° crossings)
    private missionTimes: MissionTimes | null = null;

    // Playback state
    private isPlaying = false;
    private playbackIntervalId: number | null = null;
    private readonly PLAYBACK_STEP_MS = 30 * 60 * 1000; // 30 minutes per tick
    private readonly PLAYBACK_INTERVAL_MS = 100; // Update every 100ms

    constructor(options: SunIlluminationPanelOptions) {
        this.container = options.container;
        this.primarySite = options.primarySite;
        this.secondarySite = options.secondarySite;
        this.landingWindow = options.landingWindow;
        this.timezone = options.timezone || 'UTC';

        // Timeline shows the full lunar day (sunrise to sunset)
        this.timelineStart = this.landingWindow.startDate;
        this.timelineEnd = this.landingWindow.endDate;

        // Calculate mission times (6° and 9° crossings)
        this.missionTimes = this.calculateMissionTimes();

        // Start at 6° rising if available, otherwise at sunrise
        this.currentTime = this.missionTimes?.sixDegRising ?? this.landingWindow.startDate;

        this.generateAltitudeData();
        this.render();
        this.initMoonGlobe();
        this.initChart();
        this.updateTime(this.currentTime);
    }

    /**
     * Calculate the 6° and 9° crossing times for the mission
     */
    private calculateMissionTimes(): MissionTimes | null {
        const site = { latitude: this.primarySite.latitude, longitude: this.primarySite.longitude };
        const samples = this.generateSamples(site);
        const crossings = this.findCrossings(site, samples);

        if (!crossings) {
            return null;
        }

        return {
            ...crossings,
            missionDurationHours: (crossings.sixDegSetting.getTime() - crossings.sixDegRising.getTime()) / (1000 * 60 * 60)
        };
    }

    private generateSamples(site: { latitude: number; longitude: number }): AltitudePoint[] {
        const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
        const samples: AltitudePoint[] = [];
        let t = this.timelineStart.getTime();
        while (t <= this.timelineEnd.getTime()) {
            const time = new Date(t);
            samples.push({ time, altitude: calculateSunElevation(site, time) });
            t += THREE_HOURS_MS;
        }
        return samples;
    }

    private findRisingCrossing(
        site: { latitude: number; longitude: number },
        samples: AltitudePoint[],
        threshold: number
    ): Date | null {
        for (let i = 0; i < samples.length - 1; i++) {
            if (samples[i].altitude < threshold && samples[i + 1].altitude >= threshold) {
                return findElevationCrossing(site, samples[i].time, samples[i + 1].time, threshold);
            }
        }
        return null;
    }

    private findSettingCrossing(
        site: { latitude: number; longitude: number },
        samples: AltitudePoint[],
        threshold: number
    ): Date | null {
        for (let i = 0; i < samples.length - 1; i++) {
            if (samples[i].altitude >= threshold && samples[i + 1].altitude < threshold) {
                return findElevationCrossing(site, samples[i].time, samples[i + 1].time, threshold);
            }
        }
        return null;
    }

    private findCrossings(
        site: { latitude: number; longitude: number },
        samples: AltitudePoint[]
    ): { sixDegRising: Date; nineDegRising: Date; sixDegSetting: Date } | null {
        const sixDegRising = this.findRisingCrossing(site, samples, 6);
        const nineDegRising = this.findRisingCrossing(site, samples, 9);
        const sixDegSetting = this.findSettingCrossing(site, samples, 6);

        if (!sixDegRising || !nineDegRising || !sixDegSetting) return null;
        return { sixDegRising, nineDegRising, sixDegSetting };
    }

    private render(): void {
        const lunarDayDays = (this.timelineEnd.getTime() - this.timelineStart.getTime()) / (1000 * 60 * 60 * 24);
        const missionDurationDays = this.missionTimes
            ? this.missionTimes.missionDurationHours / 24
            : lunarDayDays;

        this.container.innerHTML = `
            <div class="illumination-panel">
                <div class="illumination-header">
                    <span class="illumination-title">Sun Illumination</span>
                    <span class="illumination-time" id="illumination-time"></span>
                </div>

                <div class="illumination-content">
                    <div class="illumination-globe-section">
                        <div class="illumination-globe" id="illumination-globe"></div>
                        <div class="globe-labels">
                            <div class="globe-label">South Pole View</div>
                            <div class="sun-direction" id="sun-direction">Sun: --</div>
                        </div>
                    </div>

                    <div class="illumination-chart-section">
                        <div class="chart-header">
                            <span>Sun Altitude</span>
                            <div class="chart-legend">
                                <span class="legend-primary"><span class="line-sample solid"></span> ${this.primarySite.name}</span>
                                ${this.secondarySite ? `<span class="legend-secondary"><span class="line-sample dashed"></span> ${this.secondarySite.name}</span>` : ''}
                            </div>
                        </div>
                        <div class="chart-container">
                            <canvas id="altitude-chart"></canvas>
                            <div class="chart-slider-track" id="slider-track">
                                <div class="chart-slider" id="chart-slider"></div>
                            </div>
                        </div>
                        <div class="chart-controls">
                            <div class="chart-axis-labels">
                                <span class="axis-start">${this.formatDateShort(this.timelineStart)}</span>
                                <span class="axis-end">${this.formatDateShort(this.timelineEnd)}</span>
                            </div>
                            <button class="play-pause-btn" id="play-pause-btn" title="Play/Pause animation">
                                <span class="play-icon">▶</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="illumination-footer">
                    <div class="mission-times">
                        ${this.missionTimes ? `
                            <div class="mission-times-row">
                                <div class="time-item">
                                    <span class="time-label">6° Rising:</span>
                                    <span class="time-value">${this.formatDateTime(this.missionTimes.sixDegRising)}</span>
                                </div>
                                <div class="time-item">
                                    <span class="time-label">9° Rising:</span>
                                    <span class="time-value">${this.formatDateTime(this.missionTimes.nineDegRising)}</span>
                                </div>
                            </div>
                            <div class="mission-times-row">
                                <div class="time-item">
                                    <span class="time-label">6° Setting:</span>
                                    <span class="time-value">${this.formatDateTime(this.missionTimes.sixDegSetting)}</span>
                                </div>
                                <div class="time-item highlight">
                                    <span class="time-label">Mission Duration:</span>
                                    <span class="time-value">${missionDurationDays.toFixed(1)} days</span>
                                </div>
                            </div>
                        ` : `
                            <div class="mission-times-row">
                                <div class="time-item">
                                    <span class="time-label">Sunrise:</span>
                                    <span class="time-value">${this.formatDateTime(this.timelineStart)}</span>
                                </div>
                                <div class="time-item">
                                    <span class="time-label">Sunset:</span>
                                    <span class="time-value">${this.formatDateTime(this.timelineEnd)}</span>
                                </div>
                            </div>
                        `}
                    </div>
                    <div class="mission-info">
                        <div class="info-item">
                            <span class="info-label">RAAN:</span>
                            <span class="info-value">${this.landingWindow.requiredRaan.toFixed(1)}°</span>
                        </div>
                        <div class="altitude-display" id="altitude-display">
                            <span class="altitude-primary">Alt: --°</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    private attachEventListeners(): void {
        const sliderTrack = this.container.querySelector('#slider-track');
        const slider = this.container.querySelector('#chart-slider');

        if (sliderTrack && slider) {
            // Mouse events
            slider.addEventListener('mousedown', (e) => this.startDrag(e as MouseEvent));
            sliderTrack.addEventListener('click', (e) => this.handleTrackClick(e as MouseEvent));
            document.addEventListener('mousemove', this.handleDrag);
            document.addEventListener('mouseup', this.stopDrag);

            // Touch events
            slider.addEventListener('touchstart', (e) => this.startDrag(e as TouchEvent));
            document.addEventListener('touchmove', this.handleTouchDrag);
            document.addEventListener('touchend', this.stopDrag);
        }

        // Play/pause button
        const playPauseBtn = this.container.querySelector('#play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayback());
        }
    }

    private startDrag(e: MouseEvent | TouchEvent): void {
        e.preventDefault();
        this.isDragging = true;
        this.container.querySelector('#chart-slider')?.classList.add('dragging');
    }

    private handleDrag = (e: MouseEvent): void => {
        if (!this.isDragging) return;
        this.updateSliderFromEvent(e.clientX);
    };

    private handleTouchDrag = (e: TouchEvent): void => {
        if (!this.isDragging || e.touches.length === 0) return;
        this.updateSliderFromEvent(e.touches[0].clientX);
    };

    private stopDrag = (): void => {
        this.isDragging = false;
        this.container.querySelector('#chart-slider')?.classList.remove('dragging');
    };

    private handleTrackClick(e: MouseEvent): void {
        this.updateSliderFromEvent(e.clientX);
    }

    private updateSliderFromEvent(clientX: number): void {
        const track = this.container.querySelector('#slider-track') as HTMLElement;
        if (!track) return;

        const rect = track.getBoundingClientRect();
        const x = clientX - rect.left;
        const position = Math.max(0, Math.min(1, x / rect.width));

        const newTime = new Date(
            this.timelineStart.getTime() +
            position * (this.timelineEnd.getTime() - this.timelineStart.getTime())
        );
        this.updateTime(newTime);
    }

    /**
     * Toggle playback on/off
     */
    private togglePlayback(): void {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
    }

    /**
     * Start timeline playback animation
     */
    private startPlayback(): void {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.updatePlayPauseButton();

        // If at end, restart from beginning (6° rising or timeline start)
        if (this.currentTime >= this.timelineEnd) {
            this.currentTime = this.missionTimes?.sixDegRising ?? this.timelineStart;
        }

        this.playbackIntervalId = window.setInterval(() => {
            const newTime = new Date(this.currentTime.getTime() + this.PLAYBACK_STEP_MS);

            if (newTime >= this.timelineEnd) {
                this.updateTime(this.timelineEnd);
                this.stopPlayback();
            } else {
                this.updateTime(newTime);
            }
        }, this.PLAYBACK_INTERVAL_MS);
    }

    /**
     * Stop timeline playback animation
     */
    private stopPlayback(): void {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        this.updatePlayPauseButton();

        if (this.playbackIntervalId !== null) {
            clearInterval(this.playbackIntervalId);
            this.playbackIntervalId = null;
        }
    }

    /**
     * Update play/pause button appearance
     */
    private updatePlayPauseButton(): void {
        const btn = this.container.querySelector('#play-pause-btn');
        const icon = btn?.querySelector('.play-icon');
        if (icon) {
            icon.textContent = this.isPlaying ? '⏸' : '▶';
        }
    }

    private initMoonGlobe(): void {
        const globeContainer = this.container.querySelector('#illumination-globe') as HTMLElement;
        if (!globeContainer) return;

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a14);

        // Camera - orthographic, looking at south pole from below
        const aspect = globeContainer.clientWidth / globeContainer.clientHeight;
        const frustumSize = MOON_RADIUS * 2.4;
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            500
        );
        // Position camera to look at south pole from below
        this.camera.position.set(0, 0, -150);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        globeContainer.appendChild(this.renderer.domElement);

        // Create moon group - contains moon mesh and all markers
        // Moon stays fixed in selenographic coordinates, light moves around it
        this.moonGroup = new THREE.Group();
        this.scene.add(this.moonGroup);

        // Create Moon mesh and add to group
        this.moon = this.createMoon();
        this.moonGroup.add(this.moon);

        // Add south pole marker to group
        const poleMarker = this.createPoleMarker();
        this.moonGroup.add(poleMarker);

        // Add site markers to group
        this.addSiteMarkers();

        // Lighting - low ambient for strong shadows (high contrast)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.03);
        this.scene.add(ambientLight);

        // Directional light - position will be updated based on sub-solar point
        // The Sun moves around the Moon over a lunar day
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
        this.directionalLight.position.set(100, 0, 0);  // Initial position, will be updated
        this.scene.add(this.directionalLight);

        // Start render loop
        this.animate();
    }

    private createMoon(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(MOON_RADIUS, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 1.0,
            metalness: 0.0
        });

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            '/textures/moon_lroc_color.jpg',
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.offset.x = -0.25;
                material.map = texture;
                material.color.set(0xffffff);
                material.needsUpdate = true;
            }
        );

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotateX(Math.PI / 2);
        return mesh;
    }

    private createPoleMarker(): THREE.Group {
        const group = new THREE.Group();

        // Ring at south pole
        const ringGeometry = new THREE.RingGeometry(2, 3, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(0, 0, -MOON_RADIUS - 0.5);
        group.add(ring);

        return group;
    }

    private addSiteMarkers(): void {
        if (!this.moonGroup) return;

        // Primary site marker - added to moonGroup so it rotates with moon
        const primaryMarker = this.createSiteMarker(
            this.primarySite.latitude,
            this.primarySite.longitude,
            0x00ff88
        );
        this.moonGroup.add(primaryMarker);

        // Secondary site marker
        if (this.secondarySite) {
            const secondaryMarker = this.createSiteMarker(
                this.secondarySite.latitude,
                this.secondarySite.longitude,
                0xffaa00
            );
            this.moonGroup.add(secondaryMarker);
        }
    }

    private createSiteMarker(lat: number, lon: number, color: number): THREE.Mesh {
        const pos = this.latLonToPosition(lat, lon, MOON_RADIUS + 0.5);
        const geometry = new THREE.SphereGeometry(1.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(pos);
        return marker;
    }

    private latLonToPosition(lat: number, lon: number, radius: number): THREE.Vector3 {
        const latRad = lat * DEG_TO_RAD;
        const lonRad = lon * DEG_TO_RAD;
        const z = radius * Math.sin(latRad);
        const r = radius * Math.cos(latRad);
        const x = -r * Math.sin(lonRad);
        const y = r * Math.cos(lonRad);
        return new THREE.Vector3(x, y, z);
    }

    private animate = (): void => {
        if (this.disposed) return;
        this.animationFrameId = requestAnimationFrame(this.animate);

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    };

    private initChart(): void {
        this.chartCanvas = this.container.querySelector('#altitude-chart') as HTMLCanvasElement;
        if (!this.chartCanvas) return;

        const container = this.chartCanvas.parentElement as HTMLElement;
        this.chartCanvas.width = container.clientWidth;
        this.chartCanvas.height = container.clientHeight - 20; // Account for slider

        this.chartCtx = this.chartCanvas.getContext('2d');
        this.drawChart();
    }

    private drawChart(): void {
        if (!this.chartCtx || !this.chartCanvas) return;

        const ctx = this.chartCtx;
        const width = this.chartCanvas.width;
        const height = this.chartCanvas.height;

        // Clear
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(0, 0, width, height);

        // Chart dimensions
        const padding = { top: 20, right: 20, bottom: 30, left: 40 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Calculate Y scale
        const { maxAlt, minAlt, altRange, gridStep } = this.calculateYScale();

        // Draw components
        this.drawGridLines(ctx, padding, chartHeight, maxAlt, minAlt, altRange, gridStep, width);
        this.drawOptimalBand(ctx, padding, chartWidth, chartHeight, maxAlt, minAlt, altRange, width);

        // Create coordinate helpers
        const timeToX = (time: Date): number => {
            const t = (time.getTime() - this.timelineStart.getTime()) /
                     (this.timelineEnd.getTime() - this.timelineStart.getTime());
            return padding.left + t * chartWidth;
        };
        const altToY = (alt: number): number => {
            const clampedAlt = Math.max(minAlt, Math.min(maxAlt, alt));
            return padding.top + chartHeight - ((clampedAlt - minAlt) / altRange) * chartHeight;
        };

        // Draw curves
        this.drawCurve(ctx, this.primaryAltitudes, timeToX, altToY, '#00ff88', false);
        this.drawCurve(ctx, this.secondaryAltitudes, timeToX, altToY, '#ffaa00', true);
    }

    private calculateYScale(): { maxAlt: number; minAlt: number; altRange: number; gridStep: number } {
        let maxDataAlt = 0;
        for (const point of this.primaryAltitudes) {
            if (point.altitude > maxDataAlt) maxDataAlt = point.altitude;
        }
        for (const point of this.secondaryAltitudes) {
            if (point.altitude > maxDataAlt) maxDataAlt = point.altitude;
        }
        const maxAlt = Math.max(15, Math.ceil(maxDataAlt / 5) * 5 + 5);
        const minAlt = 0;
        const gridStep = maxAlt <= 20 ? 5 : maxAlt <= 45 ? 10 : 15;
        return { maxAlt, minAlt, altRange: maxAlt - minAlt, gridStep };
    }

    private drawGridLines(
        ctx: CanvasRenderingContext2D, padding: { top: number; left: number },
        chartHeight: number,
        maxAlt: number, minAlt: number, altRange: number, gridStep: number, width: number
    ): void {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        for (let alt = 0; alt <= maxAlt; alt += gridStep) {
            const y = padding.top + chartHeight - ((alt - minAlt) / altRange) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - 20, y);
            ctx.stroke();
            ctx.fillStyle = '#666';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText(`${alt}°`, padding.left - 5, y + 3);
        }
    }

    private drawOptimalBand(
        ctx: CanvasRenderingContext2D, padding: { top: number; left: number },
        chartWidth: number, chartHeight: number,
        maxAlt: number, minAlt: number, altRange: number, width: number
    ): void {
        if (maxAlt < 9) return;
        const band6Y = padding.top + chartHeight - ((6 - minAlt) / altRange) * chartHeight;
        const band9Y = padding.top + chartHeight - ((9 - minAlt) / altRange) * chartHeight;
        ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
        ctx.fillRect(padding.left, band9Y, chartWidth, band6Y - band9Y);
        ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
        ctx.lineWidth = 1;
        [band6Y, band9Y].forEach(y => {
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - 20, y);
            ctx.stroke();
        });
    }

    private drawCurve(
        ctx: CanvasRenderingContext2D, points: AltitudePoint[],
        timeToX: (t: Date) => number, altToY: (a: number) => number,
        color: string, dashed: boolean
    ): void {
        if (points.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        if (dashed) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        let drawing = false;
        for (const point of points) {
            if (point.altitude < 0) { drawing = false; continue; }
            const x = timeToX(point.time);
            const y = altToY(point.altitude);
            if (!drawing) { ctx.moveTo(x, y); drawing = true; }
            else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
        if (dashed) ctx.setLineDash([]);
    }

    private generateAltitudeData(): void {
        const stepMinutes = 30;
        const stepMs = stepMinutes * 60 * 1000;

        this.primaryAltitudes = [];
        this.secondaryAltitudes = [];

        let t = this.timelineStart.getTime();
        while (t <= this.timelineEnd.getTime()) {
            const time = new Date(t);

            // Primary site
            const primaryAlt = calculateSunElevation(
                { latitude: this.primarySite.latitude, longitude: this.primarySite.longitude },
                time
            );
            this.primaryAltitudes.push({ time, altitude: primaryAlt });

            // Secondary site
            if (this.secondarySite) {
                const secondaryAlt = calculateSunElevation(
                    { latitude: this.secondarySite.latitude, longitude: this.secondarySite.longitude },
                    time
                );
                this.secondaryAltitudes.push({ time, altitude: secondaryAlt });
            }

            t += stepMs;
        }
    }

    /**
     * Update the visualization to a specific time
     */
    updateTime(date: Date): void {
        this.currentTime = date;

        // Update sun lighting on globe
        this.updateSunLighting(date);

        // Update time display
        const timeDisplay = this.container.querySelector('#illumination-time');
        if (timeDisplay) {
            timeDisplay.textContent = this.formatDateTime(date);
        }

        // Update altitude display
        const primaryAlt = calculateSunElevation(
            { latitude: this.primarySite.latitude, longitude: this.primarySite.longitude },
            date
        );
        const altitudeDisplay = this.container.querySelector('#altitude-display');
        if (altitudeDisplay) {
            let html = `<span class="altitude-primary">Primary: ${primaryAlt.toFixed(1)}°</span>`;
            if (this.secondarySite) {
                const secondaryAlt = calculateSunElevation(
                    { latitude: this.secondarySite.latitude, longitude: this.secondarySite.longitude },
                    date
                );
                html += `<span class="altitude-secondary">Backup: ${secondaryAlt.toFixed(1)}°</span>`;
            }
            altitudeDisplay.innerHTML = html;
        }

        // Update slider position
        const slider = this.container.querySelector('#chart-slider') as HTMLElement;
        if (slider && !this.isDragging) {
            const position = (date.getTime() - this.timelineStart.getTime()) /
                           (this.timelineEnd.getTime() - this.timelineStart.getTime());
            slider.style.left = `${position * 100}%`;
        }

        // Redraw chart with new current time marker
        this.drawChart();
    }

    private updateSunLighting(date: Date): void {
        if (!this.directionalLight) return;

        // Get sub-solar point (selenographic lat/lon where Sun is directly overhead)
        const subSolar = getSubSolarPoint(date);

        // Convert selenographic coords to Three.js direction
        // In this view (camera at -Z looking at south pole):
        // - Moon mesh is rotated so poles are at ±Z (south at -Z facing camera)
        // - latLonToPosition produces: lat→Z, lon→rotation in XY plane
        // - lon=0 (near side) → +Y, lon=90E → -X, lon=180 (far side) → -Y, lon=90W → +X
        const lightDistance = 200;
        const sunPos = this.latLonToPosition(subSolar.latitude, subSolar.longitude, lightDistance);
        this.directionalLight.position.copy(sunPos);

        // Update sun direction label
        const sunDirLabel = this.container.querySelector('#sun-direction');
        if (sunDirLabel) {
            const lonDir = subSolar.longitude >= 0 ? 'E' : 'W';
            sunDirLabel.textContent = `Sun: ${Math.abs(subSolar.longitude).toFixed(0)}°${lonDir}`;
        }
    }

    private formatDateTime(date: Date): string {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: this.timezone,
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZoneName: 'short'
        });
        return formatter.format(date);
    }

    private formatDateShort(date: Date): string {
        const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        const day = date.getUTCDate();
        return `${month} ${day}`;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.disposed = true;

        // Stop playback if running
        this.stopPlayback();

        // Cancel animation frame
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Remove event listeners
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.stopDrag);
        document.removeEventListener('touchmove', this.handleTouchDrag);
        document.removeEventListener('touchend', this.stopDrag);

        // Dispose Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentElement) {
                this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
            }
        }

        // Clear container
        this.container.innerHTML = '';
    }
}
