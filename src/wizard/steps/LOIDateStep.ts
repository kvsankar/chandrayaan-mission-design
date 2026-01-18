/**
 * LOIDateStep - Step 4 of Mission Design Wizard
 *
 * Shows the exploration timeline (read-only) with the selected lunar day highlighted,
 * then shows Moon equator crossings that can serve as LOI (Lunar Orbit Insertion) dates.
 * The LOI must occur before the selected landing window from Step 3.
 */

import {
    LunarDaySegment,
    LunarNightSegment,
    LunarSegment,
    findLunarDayNightCycles,
    formatLunarDayLabel
} from '../calculations/sunElevation.js';
import { findOptimalLOIDates } from '../../optimization.js';

export interface LOIDateStepState {
    selectedLOIDate: Date | null;
}

export interface LOIDateStepOptions {
    container: HTMLElement;
    selectedLunarDay: LunarDaySegment;
    siteName: string;
    siteLatitude: number;
    siteLongitude: number;
    explorationStartDate: Date;
    explorationEndDate: Date;
    timezone?: string;
    initialState?: Partial<LOIDateStepState>;
    onStateChange?: (state: LOIDateStepState) => void;
}

interface LOIOption {
    date: Date;
    daysBeforeLanding: number;
    label: string;
    isAscending: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export class LOIDateStep {
    private container: HTMLElement;
    private selectedLunarDay: LunarDaySegment;
    private siteName: string;
    private siteLatitude: number;
    private siteLongitude: number;
    private explorationStartDate: Date;
    private explorationEndDate: Date;
    private timezone: string;

    // Exploration timeline data (same as Step 3)
    private segments: LunarSegment[] = [];
    private extendedStartDate: Date;
    private extendedEndDate: Date;

    private loiOptions: LOIOption[] = [];
    private state: LOIDateStepState;
    private onStateChange?: (state: LOIDateStepState) => void;

    constructor(options: LOIDateStepOptions) {
        this.container = options.container;
        this.selectedLunarDay = options.selectedLunarDay;
        this.siteName = options.siteName;
        this.siteLatitude = options.siteLatitude;
        this.siteLongitude = options.siteLongitude;
        this.explorationStartDate = options.explorationStartDate;
        this.explorationEndDate = options.explorationEndDate;
        this.extendedStartDate = options.explorationStartDate;
        this.extendedEndDate = options.explorationEndDate;
        this.timezone = options.timezone || 'UTC';
        this.onStateChange = options.onStateChange;

        this.state = {
            selectedLOIDate: null,
            ...options.initialState
        };

        this.computeSegments();
        this.computeLOIOptions();
        this.extendTimelineForLOI();
        this.render();
    }

    /**
     * Compute lunar day/night segments (same as Step 3)
     */
    private computeSegments(): void {
        this.segments = findLunarDayNightCycles(
            { latitude: this.siteLatitude, longitude: this.siteLongitude },
            this.explorationStartDate,
            this.explorationEndDate
        );

        if (this.segments.length > 0) {
            const firstSegment = this.segments[0];
            const lastSegment = this.segments[this.segments.length - 1];

            if (firstSegment.isDay) {
                this.extendedStartDate = (firstSegment as LunarDaySegment).sunrise;
            } else {
                this.extendedStartDate = (firstSegment as LunarNightSegment).start;
            }

            if (lastSegment.isDay) {
                this.extendedEndDate = (lastSegment as LunarDaySegment).sunset;
            } else {
                this.extendedEndDate = (lastSegment as LunarNightSegment).end;
            }
        }
    }

    private computeLOIOptions(): void {
        const landingDate = this.selectedLunarDay.sunrise;
        const searchStart = new Date(landingDate.getTime() - 60 * 24 * 60 * 60 * 1000);
        const searchEnd = landingDate;

        const allCrossings = findOptimalLOIDates(searchStart, searchEnd);

        const validCrossings = allCrossings
            .filter(date => date < landingDate)
            .sort((a, b) => b.getTime() - a.getTime());

        const selectedCrossings = validCrossings.slice(0, 2);

        this.loiOptions = selectedCrossings.map((date, index) => {
            const daysBeforeLanding = (landingDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
            const label = index === 0 ? 'Previous Crossing' : 'Earlier Crossing';

            return {
                date,
                daysBeforeLanding,
                label,
                isAscending: this.checkIfAscending(date)
            };
        });
    }

    /**
     * Extend the timeline to include LOI dates if they're before the current start
     */
    private extendTimelineForLOI(): void {
        if (this.loiOptions.length === 0) return;

        // Find earliest LOI date
        const earliestLOI = this.loiOptions.reduce((earliest, opt) =>
            opt.date < earliest ? opt.date : earliest, this.loiOptions[0].date);

        // Add some padding (2 days before earliest LOI)
        const paddedStart = new Date(earliestLOI.getTime() - 2 * 24 * 60 * 60 * 1000);

        // Extend timeline start if needed
        if (paddedStart < this.extendedStartDate) {
            this.extendedStartDate = paddedStart;
        }
    }

    private checkIfAscending(date: Date): boolean {
        const beforeDate = new Date(date.getTime() - 60 * 60 * 1000);
        const afterDate = new Date(date.getTime() + 60 * 60 * 1000);

        try {
            const Astronomy = (window as any).Astronomy;
            if (!Astronomy) return true;

            const decBefore = this.getMoonDeclination(beforeDate);
            const decAfter = this.getMoonDeclination(afterDate);

            return decAfter > decBefore;
        } catch {
            return true;
        }
    }

    private getMoonDeclination(date: Date): number {
        try {
            const Astronomy = (window as any).Astronomy;
            const time = Astronomy.MakeTime(date);
            const state = Astronomy.GeoMoonState(time);
            const hasPosition = state.position !== undefined;
            const geoVector = {
                x: hasPosition ? state.position.x : state.x,
                y: hasPosition ? state.position.y : state.y,
                z: hasPosition ? state.position.z : state.z,
                t: hasPosition ? state.position.t : state.t
            };
            const equatorial = Astronomy.EquatorFromVector(geoVector);
            return equatorial.dec;
        } catch {
            return 0;
        }
    }

    private render(): void {
        const lunarDayLabel = formatLunarDayLabel(this.selectedLunarDay);

        this.container.innerHTML = `
            <div class="loi-date-step">
                <div class="step-header">
                    <h2>Step 4: Select LOI Date</h2>
                    <p class="step-site-info">${this.siteName} | ${lunarDayLabel}</p>
                </div>

                <div class="timeline-section">
                    <div class="timeline-header">
                        <span class="timeline-title">Exploration Timeline</span>
                        <span class="timeline-subtitle">
                            ${this.formatDateRange(this.extendedStartDate, this.extendedEndDate)}
                        </span>
                    </div>

                    <div class="timeline-container" id="exploration-timeline">
                        ${this.renderExplorationTimeline()}
                    </div>

                    <div class="timeline-legend">
                        <span class="legend-item">
                            <span class="legend-box day"></span> Lunar Day (sunlit)
                        </span>
                        <span class="legend-item">
                            <span class="legend-box night"></span> Lunar Night
                        </span>
                        <span class="legend-item">
                            <span class="legend-box selected"></span> Selected
                        </span>
                    </div>
                </div>

                <div class="timeline-section loi-timeline-section">
                    <div class="timeline-header">
                        <span class="timeline-title">LOI Date Selection</span>
                        <span class="timeline-subtitle">Moon equator crossings before landing</span>
                    </div>

                    <div class="timeline-container" id="loi-timeline">
                        ${this.renderLOITimeline()}
                    </div>

                    <div class="timeline-legend">
                        <span class="legend-item">
                            <span class="legend-box loi"></span> LOI Option
                        </span>
                        <span class="legend-item">
                            <span class="legend-box loi-selected"></span> Selected LOI
                        </span>
                        <span class="legend-item">
                            <span class="node-symbol">☊</span> Ascending Node
                        </span>
                        <span class="legend-item">
                            <span class="node-symbol">☋</span> Descending Node
                        </span>
                    </div>
                </div>

                <div class="loi-details" id="loi-details">
                    ${this.state.selectedLOIDate
                        ? this.renderSelectedDetails()
                        : '<div class="no-selection">Select an LOI date above</div>'}
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Render the exploration timeline (read-only, no LOI markers)
     */
    private renderExplorationTimeline(): string {
        if (this.segments.length === 0) {
            return '<div class="no-segments">No lunar day/night data available</div>';
        }

        const totalDuration = this.extendedEndDate.getTime() - this.extendedStartDate.getTime();
        let html = '<div class="timeline-wrapper">';
        html += '<div class="timeline-track">';

        // Month markers
        html += this.renderMonthMarkers();

        // Render segments (read-only lunar days/nights)
        for (const segment of this.segments) {
            if (segment.isDay) {
                const segmentStart = segment.sunrise;
                const segmentEnd = segment.sunset;
                const startOffset = (segmentStart.getTime() - this.extendedStartDate.getTime()) / totalDuration * 100;
                const width = (segmentEnd.getTime() - segmentStart.getTime()) / totalDuration * 100;

                const isSelected = this.isDaySelected(segment);
                const label = formatLunarDayLabel(segment);

                html += `
                    <div class="timeline-segment day readonly ${isSelected ? 'selected' : ''}"
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

    /**
     * Render the LOI selection timeline with markers
     */
    private renderLOITimeline(): string {
        if (this.loiOptions.length === 0) {
            return '<div class="no-segments">No LOI dates available</div>';
        }

        const totalDuration = this.extendedEndDate.getTime() - this.extendedStartDate.getTime();
        let html = '<div class="timeline-wrapper">';
        html += '<div class="timeline-track loi-track">';

        html += this.renderMonthMarkers();
        html += this.renderLOIMarkers(totalDuration);
        html += this.renderLandingMarker(totalDuration);

        html += '</div>';
        html += this.renderLOILabels(totalDuration);
        html += '</div>';

        return html;
    }

    private renderLOIMarkers(totalDuration: number): string {
        let html = '';
        for (let i = 0; i < this.loiOptions.length; i++) {
            const option = this.loiOptions[i];
            const offset = (option.date.getTime() - this.extendedStartDate.getTime()) / totalDuration * 100;

            if (offset < 0 || offset > 100) continue;

            const isSelected = this.state.selectedLOIDate &&
                option.date.getTime() === this.state.selectedLOIDate.getTime();
            const nodeSymbol = option.isAscending ? '☊' : '☋';
            const nodeType = option.isAscending ? 'Ascending' : 'Descending';

            html += `
                <div class="loi-marker ${isSelected ? 'selected' : ''}"
                     data-loi-index="${i}"
                     style="left: ${offset}%;"
                     title="${option.label}: ${this.formatDateTimeShort(option.date)} (${nodeType})">
                    <div class="loi-marker-line"></div>
                    <div class="loi-marker-label">${nodeSymbol}</div>
                </div>
            `;
        }
        return html;
    }

    private renderLandingMarker(totalDuration: number): string {
        const landingDate = this.selectedLunarDay.sunrise;
        const offset = (landingDate.getTime() - this.extendedStartDate.getTime()) / totalDuration * 100;

        if (offset < 0 || offset > 100) return '';

        return `
            <div class="landing-marker" style="left: ${offset}%;" title="Landing: ${this.formatDateTimeShort(landingDate)}">
                <div class="landing-marker-line"></div>
                <div class="landing-marker-label">Landing</div>
            </div>
        `;
    }

    private renderLOILabels(totalDuration: number): string {
        let html = '<div class="timeline-labels loi-labels">';
        for (const option of this.loiOptions) {
            const offset = (option.date.getTime() - this.extendedStartDate.getTime()) / totalDuration * 100;

            if (offset < 0 || offset > 100) continue;

            html += `
                <div class="loi-label" style="left: ${offset}%;">
                    ${this.formatDateTimeShort(option.date)}
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    private formatDateTimeShort(date: Date): string {
        const month = MONTH_NAMES[date.getUTCMonth()];
        const day = date.getUTCDate();
        return `${month} ${day}`;
    }

    private renderMonthMarkers(): string {
        let html = '<div class="month-markers">';
        const totalDuration = this.extendedEndDate.getTime() - this.extendedStartDate.getTime();

        const startYear = this.extendedStartDate.getFullYear();
        const startMonth = this.extendedStartDate.getMonth();
        const endYear = this.extendedEndDate.getFullYear();
        const endMonth = this.extendedEndDate.getMonth();

        for (let year = startYear; year <= endYear; year++) {
            const monthStart = (year === startYear) ? startMonth : 0;
            const monthEnd = (year === endYear) ? endMonth : 11;

            for (let month = monthStart; month <= monthEnd; month++) {
                const monthDate = new Date(Date.UTC(year, month, 1));
                if (monthDate >= this.extendedStartDate && monthDate <= this.extendedEndDate) {
                    const offset = (monthDate.getTime() - this.extendedStartDate.getTime()) / totalDuration * 100;
                    html += `
                        <div class="month-marker" style="left: ${offset}%;">
                            <span class="month-label">${MONTH_NAMES[month]}${year !== startYear ? ' ' + year : ''}</span>
                        </div>
                    `;
                }
            }
        }

        html += '</div>';
        return html;
    }

    private isDaySelected(day: LunarDaySegment): boolean {
        return day.sunrise.getTime() === this.selectedLunarDay.sunrise.getTime();
    }

    private renderSelectedDetails(): string {
        if (!this.state.selectedLOIDate) {
            return '<div class="no-selection">Select an LOI date above</div>';
        }

        const option = this.loiOptions.find(o => o.date.getTime() === this.state.selectedLOIDate!.getTime());
        if (!option) {
            return '<div class="no-selection">Invalid selection</div>';
        }

        const crossingType = option.isAscending ? 'Ascending (S→N)' : 'Descending (N→S)';
        const landingDate = this.selectedLunarDay.sunrise;
        const transitDays = option.daysBeforeLanding;

        return `
            <div class="details-content">
                <div class="detail-row highlight">
                    <span class="detail-label">Selected LOI:</span>
                    <span class="detail-value">${this.formatDateTime(option.date)}</span>
                </div>

                <div class="details-divider"></div>

                <div class="detail-row">
                    <span class="detail-label">Crossing Type:</span>
                    <span class="detail-value">${crossingType}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Days to Landing:</span>
                    <span class="detail-value">${transitDays.toFixed(1)} days</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Landing Date:</span>
                    <span class="detail-value">${this.formatDateTime(landingDate)}</span>
                </div>

                <div class="details-divider"></div>

                <div class="detail-note">
                    <strong>Note:</strong> LOI occurs when the Moon crosses Earth's equatorial plane.
                    This provides optimal geometry for lunar orbit insertion.
                </div>
            </div>
        `;
    }

    private attachEventListeners(): void {
        // LOI markers on LOI timeline
        const loiTimeline = this.container.querySelector('#loi-timeline');
        loiTimeline?.querySelectorAll('.loi-marker').forEach(marker => {
            marker.addEventListener('click', () => {
                const index = parseInt(marker.getAttribute('data-loi-index') || '0', 10);
                this.selectLOI(index);
            });
        });
    }

    private selectLOI(index: number): void {
        if (index >= 0 && index < this.loiOptions.length) {
            this.state.selectedLOIDate = this.loiOptions[index].date;
            this.updateUI();
            this.notifyStateChange();
        }
    }

    private updateUI(): void {
        // Update LOI markers on LOI timeline
        const loiTimeline = this.container.querySelector('#loi-timeline');
        loiTimeline?.querySelectorAll('.loi-marker').forEach(marker => {
            const index = parseInt(marker.getAttribute('data-loi-index') || '0', 10);
            const option = this.loiOptions[index];
            const isSelected = this.state.selectedLOIDate &&
                option.date.getTime() === this.state.selectedLOIDate.getTime();
            marker.classList.toggle('selected', isSelected);
        });

        const detailsPanel = this.container.querySelector('#loi-details');
        if (detailsPanel) {
            detailsPanel.innerHTML = this.state.selectedLOIDate
                ? this.renderSelectedDetails()
                : '<div class="no-selection">Click an LOI marker (blue line) on the timeline below</div>';
        }
    }

    private formatDateTime(date: Date): string {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: this.timezone,
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZoneName: 'short'
        });
        return formatter.format(date);
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

    getState(): LOIDateStepState {
        return { ...this.state };
    }

    getSelectedLOIDate(): Date | null {
        return this.state.selectedLOIDate;
    }

    isValid(): boolean {
        return this.state.selectedLOIDate !== null;
    }

    setTimezone(timezone: string): void {
        this.timezone = timezone;
        this.render();
    }

    dispose(): void {
        this.container.innerHTML = '';
    }
}
