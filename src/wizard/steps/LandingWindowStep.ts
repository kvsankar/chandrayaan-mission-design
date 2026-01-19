/**
 * LandingWindowStep - Step 3 of Mission Design Wizard
 *
 * Shows a timeline of lunar day/night cycles for the exploration window.
 * Users can select a lunar day (when the site is sunlit) for landing.
 * When selected, shows sun illumination visualization panel.
 */

import {
    LunarDaySegment,
    LunarNightSegment,
    LunarSegment,
    findLunarDayNightCycles,
    formatLunarDayLabel,
    calculateRequiredRaan,
    findElevationCrossing,
    calculateSunElevation
} from '../calculations/sunElevation.js';
import { SunIlluminationPanel } from '../components/SunIlluminationPanel.js';

export interface LandingWindowStepState {
    selectedLunarDay: LunarDaySegment | null;
}

export interface LandingWindowStepOptions {
    container: HTMLElement;
    siteName: string;
    siteLatitude: number;
    siteLongitude: number;
    backupSiteName?: string;
    backupSiteLatitude?: number;
    backupSiteLongitude?: number;
    explorationStartDate: Date;
    explorationEndDate: Date;
    timezone?: string;
    initialState?: Partial<LandingWindowStepState>;
    onStateChange?: (state: LandingWindowStepState) => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export class LandingWindowStep {
    private container: HTMLElement;
    private siteName: string;
    private siteLatitude: number;
    private siteLongitude: number;
    private backupSiteName?: string;
    private backupSiteLatitude?: number;
    private backupSiteLongitude?: number;
    private explorationStartDate: Date;  // User's requested exploration window
    private explorationEndDate: Date;
    private extendedStartDate: Date;     // Extended to include complete lunar days
    private extendedEndDate: Date;
    private timezone: string;

    private segments: LunarSegment[] = [];
    private state: LandingWindowStepState;
    private onStateChange?: (state: LandingWindowStepState) => void;
    private illuminationPanel: SunIlluminationPanel | null = null;

    constructor(options: LandingWindowStepOptions) {
        this.container = options.container;
        this.siteName = options.siteName;
        this.siteLatitude = options.siteLatitude;
        this.siteLongitude = options.siteLongitude;
        this.backupSiteName = options.backupSiteName;
        this.backupSiteLatitude = options.backupSiteLatitude;
        this.backupSiteLongitude = options.backupSiteLongitude;
        this.explorationStartDate = options.explorationStartDate;
        this.explorationEndDate = options.explorationEndDate;
        this.timezone = options.timezone || 'UTC';
        // Initialize extended dates to user dates, will be updated in computeSegments
        this.extendedStartDate = options.explorationStartDate;
        this.extendedEndDate = options.explorationEndDate;
        this.onStateChange = options.onStateChange;

        this.state = {
            selectedLunarDay: null,
            ...options.initialState
        };

        this.computeSegments();
        this.render();

        // If there's an initial selected day, show the illumination panel
        if (this.state.selectedLunarDay) {
            this.showIlluminationPanel(this.state.selectedLunarDay);
        }
    }

    private computeSegments(): void {
        this.segments = findLunarDayNightCycles(
            { latitude: this.siteLatitude, longitude: this.siteLongitude },
            this.explorationStartDate,
            this.explorationEndDate
        );

        // Calculate extended window from actual segment dates
        if (this.segments.length > 0) {
            const firstSegment = this.segments[0];
            const lastSegment = this.segments[this.segments.length - 1];

            // Get the start of the first segment
            if (firstSegment.isDay) {
                this.extendedStartDate = (firstSegment as LunarDaySegment).sunrise;
            } else {
                this.extendedStartDate = (firstSegment as LunarNightSegment).start;
            }

            // Get the end of the last segment
            if (lastSegment.isDay) {
                this.extendedEndDate = (lastSegment as LunarDaySegment).sunset;
            } else {
                this.extendedEndDate = (lastSegment as LunarNightSegment).end;
            }
        }
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="lunar-day-step">
                <div class="timeline-section">
                    <div class="timeline-header">
                        <div class="timeline-heading-left">
                            <span class="timeline-title">Lunar Days as Mission Windows</span>
                            <div class="timeline-legend-inline">
                                <span class="legend-inline-label">Legend:</span>
                                <span class="legend-inline-item">🟨 Lunar Day</span>
                                <span class="legend-inline-item">🟦 Lunar Night</span>
                                <span class="legend-inline-item">🟩 Selected</span>
                            </div>
                        </div>
                        <span class="timeline-subtitle">
                            ${this.formatDateRange(this.extendedStartDate, this.extendedEndDate)}
                        </span>
                    </div>

                    <div class="timeline-container" id="timeline-container">
                        ${this.renderTimeline()}
                    </div>
                </div>

                <div class="illumination-panel-container" id="illumination-panel-container"></div>
            </div>
        `;

        this.attachEventListeners();
    }

    private renderTimeline(): string {
        if (this.segments.length === 0) {
            return '<div class="no-segments">No lunar day/night data available</div>';
        }

        // Use extended window for timeline to show complete lunar days
        const totalDuration = this.extendedEndDate.getTime() - this.extendedStartDate.getTime();
        let html = '<div class="timeline-wrapper">';
        html += '<div class="timeline-track">';

        // Render segments (without labels inside)
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];

            if (segment.isDay) {
                const segmentStart = segment.sunrise;
                const segmentEnd = segment.sunset;
                const startOffset = (segmentStart.getTime() - this.extendedStartDate.getTime()) / totalDuration * 100;
                const width = (segmentEnd.getTime() - segmentStart.getTime()) / totalDuration * 100;

                const isSelected = this.isDaySelected(segment);
                const label = formatLunarDayLabel(segment);
                const segmentId = this.getDayId(segment);

                html += `
                    <div class="timeline-segment day ${isSelected ? 'selected' : ''}"
                         data-segment-id="${segmentId}"
                         style="left: ${startOffset}%; width: ${width}%;"
                         title="${label}">
                    </div>
                `;
            } else {
                const nightSegment = segment as LunarNightSegment;
                const segmentStart = nightSegment.start;
                const segmentEnd = nightSegment.end;
                const startOffset = (segmentStart.getTime() - this.extendedStartDate.getTime()) / totalDuration * 100;
                const width = (segmentEnd.getTime() - segmentStart.getTime()) / totalDuration * 100;

                html += `
                    <div class="timeline-segment night"
                         style="left: ${startOffset}%; width: ${width}%;">
                    </div>
                `;
            }
        }
        html += '</div>';

        // Labels below the timeline
        html += '<div class="timeline-labels">';
        for (const segment of this.segments) {
            if (segment.isDay) {
                const segmentStart = segment.sunrise;
                const segmentEnd = segment.sunset;
                const startOffset = (segmentStart.getTime() - this.extendedStartDate.getTime()) / totalDuration * 100;
                const width = (segmentEnd.getTime() - segmentStart.getTime()) / totalDuration * 100;
                const label = formatLunarDayLabel(segment);

                html += `
                    <div class="segment-label" style="left: ${startOffset}%; width: ${width}%;">
                        ${label}
                    </div>
                `;
            }
        }
        html += '</div>';

        html += '</div>';
        return html;
    }

    // Month markers removed (not used)

    private renderDayDetails(day: LunarDaySegment): string {
        // Calculate mission times (6° and 9° crossings)
        const missionTimes = this.calculateMissionTimes(day);

        // Calculate required RAAN at landing time (6° rising crossing)
        const landingTime = missionTimes?.sixDegRising ?? day.peakTime;
        const requiredRaan = calculateRequiredRaan(this.siteLongitude, landingTime);

        if (missionTimes) {
            const missionDurationDays = missionTimes.missionDurationHours / 24;

            return `
                <div class="detail-row highlight">
                    <span class="detail-label">Selected:</span>
                    <span class="detail-value">${formatLunarDayLabel(day)}</span>
                </div>

                <div class="details-divider"></div>

                <div class="detail-row">
                    <span class="detail-label">6° Rising:</span>
                    <span class="detail-value">${this.formatDateTime(missionTimes.sixDegRising)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">9° Rising:</span>
                    <span class="detail-value">${this.formatDateTime(missionTimes.nineDegRising)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">6° Setting:</span>
                    <span class="detail-value">${this.formatDateTime(missionTimes.sixDegSetting)}</span>
                </div>

                <div class="details-divider"></div>

                <div class="detail-row highlight">
                    <span class="detail-label">Mission Duration:</span>
                    <span class="detail-value">${missionDurationDays.toFixed(1)} days</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Peak Elevation:</span>
                    <span class="detail-value">${day.peakElevation.toFixed(1)}°</span>
                </div>
                <div class="detail-row highlight">
                    <span class="detail-label">Required RAAN:</span>
                    <span class="detail-value">${requiredRaan.toFixed(1)}°</span>
                </div>
            `;
        }

        // Fallback if mission times couldn't be calculated
        const sunriseStr = this.formatDateTime(day.sunrise);
        const sunsetStr = this.formatDateTime(day.sunset);
        const durationDays = (day.sunset.getTime() - day.sunrise.getTime()) / (1000 * 60 * 60 * 24);

        return `
            <div class="detail-row highlight">
                <span class="detail-label">Selected:</span>
                <span class="detail-value">${formatLunarDayLabel(day)}</span>
            </div>

            <div class="details-divider"></div>

            <div class="detail-row">
                <span class="detail-label">Sunrise:</span>
                <span class="detail-value">${sunriseStr}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Sunset:</span>
                <span class="detail-value">${sunsetStr}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${durationDays.toFixed(1)} days</span>
            </div>

            <div class="details-divider"></div>

            <div class="detail-row">
                <span class="detail-label">Peak Elevation:</span>
                <span class="detail-value">${day.peakElevation.toFixed(1)}°</span>
            </div>
            <div class="detail-row highlight">
                <span class="detail-label">Required RAAN:</span>
                <span class="detail-value">${requiredRaan.toFixed(1)}°</span>
            </div>
        `;
    }

    /**
     * Calculate 6° and 9° crossing times for a lunar day
     */
    private calculateMissionTimes(day: LunarDaySegment): {
        sixDegRising: Date;
        nineDegRising: Date;
        sixDegSetting: Date;
        missionDurationHours: number;
    } | null {
        const site = { latitude: this.siteLatitude, longitude: this.siteLongitude };
        const samples = this.sampleElevations(site, day);
        const crossings = this.findElevationCrossings(site, samples);

        if (!crossings) return null;

        return {
            ...crossings,
            missionDurationHours: (crossings.sixDegSetting.getTime() - crossings.sixDegRising.getTime()) / (1000 * 60 * 60)
        };
    }

    private sampleElevations(
        site: { latitude: number; longitude: number },
        day: LunarDaySegment
    ): { time: Date; elevation: number }[] {
        const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
        const samples: { time: Date; elevation: number }[] = [];
        let t = day.sunrise.getTime();
        while (t <= day.sunset.getTime()) {
            samples.push({ time: new Date(t), elevation: calculateSunElevation(site, new Date(t)) });
            t += THREE_HOURS_MS;
        }
        return samples;
    }

    private findRisingCrossing(
        site: { latitude: number; longitude: number },
        samples: { time: Date; elevation: number }[],
        threshold: number
    ): Date | null {
        for (let i = 0; i < samples.length - 1; i++) {
            if (samples[i].elevation < threshold && samples[i + 1].elevation >= threshold) {
                return findElevationCrossing(site, samples[i].time, samples[i + 1].time, threshold);
            }
        }
        return null;
    }

    private findSettingCrossing(
        site: { latitude: number; longitude: number },
        samples: { time: Date; elevation: number }[],
        threshold: number
    ): Date | null {
        for (let i = 0; i < samples.length - 1; i++) {
            if (samples[i].elevation >= threshold && samples[i + 1].elevation < threshold) {
                return findElevationCrossing(site, samples[i].time, samples[i + 1].time, threshold);
            }
        }
        return null;
    }

    private findElevationCrossings(
        site: { latitude: number; longitude: number },
        samples: { time: Date; elevation: number }[]
    ): { sixDegRising: Date; nineDegRising: Date; sixDegSetting: Date } | null {
        const sixDegRising = this.findRisingCrossing(site, samples, 6);
        const nineDegRising = this.findRisingCrossing(site, samples, 9);
        const sixDegSetting = this.findSettingCrossing(site, samples, 6);

        if (!sixDegRising || !nineDegRising || !sixDegSetting) return null;
        return { sixDegRising, nineDegRising, sixDegSetting };
    }

    private attachEventListeners(): void {
        const timelineContainer = this.container.querySelector('#timeline-container');

        timelineContainer?.querySelectorAll('.timeline-segment.day').forEach(segment => {
            segment.addEventListener('click', () => {
                const segmentId = segment.getAttribute('data-segment-id');
                if (segmentId) {
                    this.selectDayById(segmentId);
                }
            });
        });
    }

    private selectDayById(segmentId: string): void {
        const daySegments = this.segments.filter((s): s is LunarDaySegment => s.isDay);
        const day = daySegments.find(d => this.getDayId(d) === segmentId);
        if (day) {
            this.state.selectedLunarDay = day;
            this.updateUI();
            this.showIlluminationPanel(day);
            this.notifyStateChange();
        }
    }

    private showIlluminationPanel(day: LunarDaySegment): void {
        // Dispose existing panel
        if (this.illuminationPanel) {
            this.illuminationPanel.dispose();
            this.illuminationPanel = null;
        }

        const container = this.container.querySelector('#illumination-panel-container') as HTMLElement;
        if (!container) return;

        // Prepare secondary site if available
        const secondarySite = (this.backupSiteName && this.backupSiteLatitude !== undefined && this.backupSiteLongitude !== undefined)
            ? { name: this.backupSiteName, latitude: this.backupSiteLatitude, longitude: this.backupSiteLongitude }
            : undefined;

        // Calculate mission times to get 6° crossing (landing time)
        const missionTimes = this.calculateMissionTimes(day);
        const landingTime = missionTimes?.sixDegRising ?? day.peakTime;

        // Create a landing window object from the lunar day
        const landingWindow = {
            startDate: day.sunrise,
            endDate: day.sunset,
            peakTime: day.peakTime,
            peakElevation: day.peakElevation,
            durationHours: (day.sunset.getTime() - day.sunrise.getTime()) / (1000 * 60 * 60),
            // Calculate RAAN at landing time (6° rising), not lunar day peak
            requiredRaan: calculateRequiredRaan(this.siteLongitude, landingTime)
        };

        this.illuminationPanel = new SunIlluminationPanel({
            container,
            primarySite: {
                name: this.siteName,
                latitude: this.siteLatitude,
                longitude: this.siteLongitude
            },
            secondarySite,
            landingWindow,
            timezone: this.timezone
        });
    }

    private hideIlluminationPanel(): void {
        if (this.illuminationPanel) {
            this.illuminationPanel.dispose();
            this.illuminationPanel = null;
        }
    }

    private updateUI(): void {
        // Update timeline selection
        const timelineContainer = this.container.querySelector('#timeline-container');
        timelineContainer?.querySelectorAll('.timeline-segment.day').forEach(segment => {
            const segmentId = segment.getAttribute('data-segment-id');
            const isSelected = segmentId && this.state.selectedLunarDay &&
                this.getDayId(this.state.selectedLunarDay) === segmentId;
            segment.classList.toggle('selected', isSelected || false);
        });

        // Update details panel
        const detailsContent = this.container.querySelector('#day-details');
        if (detailsContent) {
            detailsContent.innerHTML = this.state.selectedLunarDay
                ? this.renderDayDetails(this.state.selectedLunarDay)
                : '<div class="no-selection">Click a lunar day (light segment) to select it</div>';
        }
    }

    private getDayId(day: LunarDaySegment): string {
        return day.sunrise.toISOString();
    }

    private isDaySelected(day: LunarDaySegment): boolean {
        if (!this.state.selectedLunarDay) return false;
        return this.getDayId(day) === this.getDayId(this.state.selectedLunarDay);
    }

    private formatDateTime(date: Date): string {
        const month = MONTH_NAMES[date.getUTCMonth()];
        const day = date.getUTCDate();
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${month} ${day}, ${hours}:${minutes} UT`;
    }

    private formatDateRange(start: Date, end: Date): string {
        const startMonth = MONTH_NAMES[start.getUTCMonth()];
        const startYear = start.getUTCFullYear();
        const endMonth = MONTH_NAMES[end.getUTCMonth()];
        const endYear = end.getUTCFullYear();

        if (startYear === endYear) {
            return `${startMonth} - ${endMonth} ${startYear}`;
        }
        return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }

    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    /**
     * Get current state
     */
    getState(): LandingWindowStepState {
        return { ...this.state };
    }

    /**
     * Get selected lunar day
     */
    getSelectedLunarDay(): LunarDaySegment | null {
        return this.state.selectedLunarDay;
    }

    /**
     * Validate step (has lunar day selected)
     */
    isValid(): boolean {
        return this.state.selectedLunarDay !== null;
    }

    /**
     * Set timezone and update displays
     */
    setTimezone(timezone: string): void {
        this.timezone = timezone;
        // Re-create illumination panel with new timezone if a day is selected
        if (this.state.selectedLunarDay) {
            this.showIlluminationPanel(this.state.selectedLunarDay);
        }
    }

    /**
     * Clean up
     */
    dispose(): void {
        this.hideIlluminationPanel();
        this.container.innerHTML = '';
    }
}
