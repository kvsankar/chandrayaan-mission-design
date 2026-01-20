/**
 * Timeline Controls - UI Component for playback controls
 *
 * Renders timeline slider with event markers, play/pause, speed controls.
 * This is part of the imperative shell.
 */

import {
    TimelineConfig,
    SPEED_OPTIONS,
    DEFAULT_SPEED
} from './types.js';
import {
    formatDate,
    calculateMarkerPosition
} from './orbitCore.js';

export interface TimelineControlsCallbacks {
    onPlay: () => void;
    onPause: () => void;
    onReset: () => void;
    onSpeedChange: (speed: number) => void;
    onSeek: (daysElapsed: number) => void;
    onJumpToTLI: () => void;
    onJumpToLOI: () => void;
    onJumpToLanding: () => void;
    onJumpToClosest?: () => void;
}

export class TimelineControls {
    private container: HTMLElement;
    private timeline: TimelineConfig;
    private startDate: Date;
    private totalDays: number;
    private timezone: string;
    private callbacks: TimelineControlsCallbacks;

    // DOM elements
    private panel: HTMLElement | null = null;
    private dateDisplay: HTMLElement | null = null;
    private slider: HTMLInputElement | null = null;
    private playPauseBtn: HTMLButtonElement | null = null;
    private speedSelect: HTMLSelectElement | null = null;
    private speedDownBtn: HTMLButtonElement | null = null;
    private speedUpBtn: HTMLButtonElement | null = null;
    private jumpTliBtn: HTMLButtonElement | null = null;
    private jumpLoiBtn: HTMLButtonElement | null = null;
    private jumpLandingBtn: HTMLButtonElement | null = null;
    private jumpClosestBtn: HTMLButtonElement | null = null;
    private captureMessage: HTMLElement | null = null;

    constructor(
        container: HTMLElement,
        timeline: TimelineConfig,
        startDate: Date,
        totalDays: number,
        timezone: string,
        callbacks: TimelineControlsCallbacks
    ) {
        this.container = container;
        this.timeline = timeline;
        this.startDate = startDate;
        this.totalDays = totalDays;
        this.timezone = timezone || 'UTC';
        this.callbacks = callbacks;

        this.render();
        this.attachEventListeners();
        this.updateSpeedButtons();
    }

    private formatNumber(value: number, decimals: number = 2): string {
        const fixed = value.toFixed(decimals);
        const parts = fixed.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    }

    private render(): void {
        // Calculate marker positions
        const tliPos = calculateMarkerPosition(this.timeline.tliDate, this.startDate, this.totalDays);
        const loiPos = calculateMarkerPosition(this.timeline.loiDate, this.startDate, this.totalDays);
        const landingPos = calculateMarkerPosition(this.timeline.landingDate, this.startDate, this.totalDays);
        const closestPos = this.timeline.closestApproachDate
            ? calculateMarkerPosition(this.timeline.closestApproachDate, this.startDate, this.totalDays)
            : null;

        this.panel = document.createElement('div');
        this.panel.className = 'orbit-timeline-panel';
        this.panel.innerHTML = `
            <div class="orbit-timeline-row orbit-timeline-row-slider">
                <div class="orbit-slider-container">
                    <div class="orbit-slider-track-wrapper">
                        <div class="orbit-event-marker orbit-marker-tli" style="left: ${tliPos}%;" title="TLI: ${formatDate(this.timeline.tliDate, this.timezone)}">
                            <div class="orbit-marker-line"></div>
                            <div class="orbit-marker-label">TLI</div>
                        </div>
                        <div class="orbit-event-marker orbit-marker-loi" style="left: ${loiPos}%;" title="LOI: ${formatDate(this.timeline.loiDate, this.timezone)}">
                            <div class="orbit-marker-line"></div>
                            <div class="orbit-marker-label">TOI</div>
                        </div>
                        <div class="orbit-event-marker orbit-marker-landing" style="left: ${landingPos}%;" title="Landing: ${formatDate(this.timeline.landingDate, this.timezone)}">
                            <div class="orbit-marker-line"></div>
                            <div class="orbit-marker-label">Landing</div>
                        </div>
                        <div class="orbit-event-marker orbit-marker-closest" style="${closestPos !== null ? `left: ${closestPos}%;` : 'display: none;'}" title="Closest approach: ${this.timeline.closestApproachDate ? formatDate(this.timeline.closestApproachDate, this.timezone) : ''}">
                            <div class="orbit-marker-line"></div>
                            <div class="orbit-marker-label">Closest</div>
                        </div>
                        <input type="range" class="orbit-timeline-slider" id="orbit-timeline-slider"
                               min="0" max="${this.totalDays}" value="0" step="0.01" />
                    </div>
                </div>
            </div>

            <div class="orbit-timeline-row orbit-timeline-row-meta">
                <div class="orbit-date-display">
                    <span class="orbit-current-date" id="orbit-current-date">${formatDate(this.startDate, this.timezone)}</span>
                </div>
                <div class="orbit-distance-display">
                    <span class="orbit-distance-label">Craft to Moon:</span>
                    <span class="orbit-distance-value" id="orbit-moon-distance">--</span>
                </div>
            </div>

            <div class="orbit-timeline-row orbit-timeline-row-controls">
                <div class="orbit-primary-controls">
                    <button class="orbit-play-btn" id="orbit-play-btn">▶ Play</button>
                    <button class="orbit-reset-btn" id="orbit-reset-btn">↺ Reset</button>
                </div>

                <div class="orbit-jump-controls">
                    <button class="orbit-jump-btn" id="orbit-jump-tli" title="Jump to TLI">TLI</button>
                    <button class="orbit-jump-btn" id="orbit-jump-loi" title="Jump to TOI">TOI</button>
                    <button class="orbit-jump-btn" id="orbit-jump-closest" title="Jump to closest approach" style="${closestPos !== null ? '' : 'display:none;'}">Closest</button>
                    <button class="orbit-jump-btn" id="orbit-jump-landing" title="Jump to Landing">Landing</button>
                </div>

                <div class="orbit-speed-controls">
                    <button class="orbit-speed-btn" id="orbit-speed-down" title="Slower">◄</button>
                    <select class="orbit-speed-select" id="orbit-speed-select">
                        ${SPEED_OPTIONS.map(opt =>
                            `<option value="${opt.value}" ${opt.value === DEFAULT_SPEED ? 'selected' : ''}>${opt.label}</option>`
                        ).join('')}
                    </select>
                    <button class="orbit-speed-btn" id="orbit-speed-up" title="Faster">►</button>
                </div>
            </div>

            <div class="orbit-capture-message" id="orbit-capture-message" style="display: none;">
                Craft orbiting Moon
            </div>
        `;

        this.container.appendChild(this.panel);

        // Get references to elements
        this.dateDisplay = this.panel.querySelector('#orbit-current-date');
        this.slider = this.panel.querySelector('#orbit-timeline-slider');
        this.playPauseBtn = this.panel.querySelector('#orbit-play-btn');
        this.speedSelect = this.panel.querySelector('#orbit-speed-select');
        this.speedDownBtn = this.panel.querySelector('#orbit-speed-down');
        this.speedUpBtn = this.panel.querySelector('#orbit-speed-up');
        this.captureMessage = this.panel.querySelector('#orbit-capture-message');
        this.jumpTliBtn = this.panel.querySelector('#orbit-jump-tli');
        this.jumpLoiBtn = this.panel.querySelector('#orbit-jump-loi');
        this.jumpLandingBtn = this.panel.querySelector('#orbit-jump-landing');
        this.jumpClosestBtn = this.panel.querySelector('#orbit-jump-closest');
    }

    // eslint-disable-next-line complexity
    private attachEventListeners(): void {
        // Play/Pause
        this.playPauseBtn?.addEventListener('click', () => {
            const isPlaying = this.playPauseBtn?.textContent?.includes('Pause');
            if (isPlaying) {
                this.callbacks.onPause();
            } else {
                this.callbacks.onPlay();
            }
        });

        // Reset
        this.panel?.querySelector('#orbit-reset-btn')?.addEventListener('click', () => {
            this.callbacks.onReset();
        });

        // Slider
        this.slider?.addEventListener('input', () => {
            const value = parseFloat(this.slider?.value || '0');
            this.callbacks.onSeek(value);
        });

        // Speed select
        this.speedSelect?.addEventListener('change', () => {
            const speed = parseFloat(this.speedSelect?.value || String(DEFAULT_SPEED));
            this.callbacks.onSpeedChange(speed);
            this.updateSpeedButtons();
        });

        // Speed up (► increases speed)
        this.speedUpBtn?.addEventListener('click', () => {
            const currentIndex = this.getCurrentSpeedIndex();
            if (currentIndex < SPEED_OPTIONS.length - 1) {
                const newSpeed = SPEED_OPTIONS[currentIndex + 1].value;
                if (this.speedSelect) this.speedSelect.value = String(newSpeed);
                this.callbacks.onSpeedChange(newSpeed);
                this.updateSpeedButtons();
            }
        });

        // Speed down (◄ slows down)
        this.speedDownBtn?.addEventListener('click', () => {
            const currentIndex = this.getCurrentSpeedIndex();
            if (currentIndex > 0) {
                const newSpeed = SPEED_OPTIONS[currentIndex - 1].value;
                if (this.speedSelect) this.speedSelect.value = String(newSpeed);
                this.callbacks.onSpeedChange(newSpeed);
                this.updateSpeedButtons();
            }
        });

        // Jump buttons
        this.jumpTliBtn?.addEventListener('click', () => this.callbacks.onJumpToTLI());
        this.jumpLoiBtn?.addEventListener('click', () => this.callbacks.onJumpToLOI());
        this.jumpLandingBtn?.addEventListener('click', () => this.callbacks.onJumpToLanding());
        this.jumpClosestBtn?.addEventListener('click', () => this.callbacks.onJumpToClosest && this.callbacks.onJumpToClosest());
    }

    private getCurrentSpeedIndex(): number {
        const currentValue = parseFloat(this.speedSelect?.value || String(DEFAULT_SPEED));
        let bestIndex = 0;
        let bestDiff = Number.POSITIVE_INFINITY;
        SPEED_OPTIONS.forEach((opt, idx) => {
            const diff = Math.abs(opt.value - currentValue);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestIndex = idx;
            }
        });
        return bestIndex;
    }

    private updateSpeedButtons(): void {
        const currentIndex = this.getCurrentSpeedIndex();
        if (this.speedDownBtn) {
            this.speedDownBtn.disabled = currentIndex <= 0;
        }
        if (this.speedUpBtn) {
            this.speedUpBtn.disabled = currentIndex >= SPEED_OPTIONS.length - 1;
        }
    }

    /**
     * Update the timeline display with current state
     */
    update(
        currentDate: Date,
        daysElapsed: number,
        isPlaying: boolean,
        moonDistance: number | null
    ): void {
        // Update date display
        if (this.dateDisplay) {
            this.dateDisplay.textContent = formatDate(currentDate, this.timezone);
        }

        // Update slider
        if (this.slider) {
            this.slider.value = String(daysElapsed);
        }

        // Update play/pause button
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
        }

        // Update moon distance
        const moonDistEl = this.panel?.querySelector('#orbit-moon-distance');
        if (moonDistEl) {
            moonDistEl.textContent = moonDistance !== null
                ? `${this.formatNumber(moonDistance, 2)} km`
                : '--';
        }
    }

    /**
     * Show capture message
     */
    showCaptureMessage(): void {
        if (this.captureMessage) {
            this.captureMessage.style.display = 'block';
        }
    }

    /**
     * Hide capture message
     */
    hideCaptureMessage(): void {
        if (this.captureMessage) {
            this.captureMessage.style.display = 'none';
        }
    }

    /**
     * Sync external speed changes back into the UI (e.g., when set programmatically)
     */
    syncSpeed(speed: number): void {
        if (this.speedSelect) {
            this.speedSelect.value = String(speed);
        }
        this.updateSpeedButtons();
    }

    /**
     * Update timeline configuration (e.g., when LOI changes)
     */
    // eslint-disable-next-line complexity
    updateTimeline(timeline: TimelineConfig, startDate: Date, totalDays: number): void {
        this.timeline = timeline;
        this.startDate = startDate;
        this.totalDays = totalDays;

        // Update slider max
        if (this.slider) {
            this.slider.max = String(totalDays);
        }

        // Update markers
        const tliPos = calculateMarkerPosition(timeline.tliDate, startDate, totalDays);
        const loiPos = calculateMarkerPosition(timeline.loiDate, startDate, totalDays);
        const landingPos = calculateMarkerPosition(timeline.landingDate, startDate, totalDays);
        const closestPos = timeline.closestApproachDate
            ? calculateMarkerPosition(timeline.closestApproachDate, startDate, totalDays)
            : null;

        const tliMarker = this.panel?.querySelector('.orbit-marker-tli') as HTMLElement;
        const loiMarker = this.panel?.querySelector('.orbit-marker-loi') as HTMLElement;
        const landingMarker = this.panel?.querySelector('.orbit-marker-landing') as HTMLElement;
        const closestMarker = this.panel?.querySelector('.orbit-marker-closest') as HTMLElement;

        if (tliMarker) {
            tliMarker.style.left = `${tliPos}%`;
            tliMarker.title = `TLI: ${formatDate(this.timeline.tliDate, this.timezone)}`;
        }
        if (loiMarker) {
            loiMarker.style.left = `${loiPos}%`;
            loiMarker.title = `LOI: ${formatDate(this.timeline.loiDate, this.timezone)}`;
        }
        if (landingMarker) {
            landingMarker.style.left = `${landingPos}%`;
            landingMarker.title = `Landing: ${formatDate(this.timeline.landingDate, this.timezone)}`;
        }
        if (closestMarker) {
            if (closestPos !== null) {
                closestMarker.style.display = 'flex';
                closestMarker.style.left = `${closestPos}%`;
                closestMarker.title = `Closest approach: ${formatDate(this.timeline.closestApproachDate as Date, this.timezone)}`;
            } else {
                closestMarker.style.display = 'none';
            }
        }

        // Show/hide closest jump based on availability
        if (this.jumpClosestBtn) {
            this.jumpClosestBtn.style.display = timeline.closestApproachDate ? 'inline-flex' : 'none';
        }
    }

    setTimezone(timezone: string): void {
        this.timezone = timezone || 'UTC';
        if (this.dateDisplay) {
            this.dateDisplay.textContent = formatDate(this.startDate, this.timezone);
        }
        // Refresh marker titles with new timezone
        this.updateTimeline(this.timeline, this.startDate, this.totalDays);
    }

    /**
     * Clean up
     */
    dispose(): void {
        if (this.panel && this.panel.parentElement) {
            this.panel.parentElement.removeChild(this.panel);
        }
    }
}
