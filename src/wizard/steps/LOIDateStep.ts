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
    formatLunarDayLabel,
    calculateRequiredRaan
} from '../calculations/sunElevation.js';
import {
    calculateTimeToTrueAnomaly,
    findOptimalLOIDates,
    optimizeApogeeToMoonMultiStart
} from '../../optimization.js';
import { OrbitVisualizationPanel, OrbitalParams, TimelineConfig } from '../components/orbitVisualization/index.js';

// Default orbital parameters for CY3-like mission
const DEFAULT_PERIGEE_ALT = 180;  // km
const DEFAULT_APOGEE_ALT = 378029;  // km (lunar distance)

export interface LOIDateStepState {
    selectedLOIDate: Date | null;
    computedTLIDate: Date | null;
    transferOrbit: TransferOrbitSolution | null;
    explorationCollapsed?: boolean;
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

interface TransferOrbitSolution {
    tliDate: Date;
    orbital: OrbitalParams;
    trueAnomalyAtLOI: number;
    closestApproachKm: number;
    closestApproachTime: Date;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export class LOIDateStep {
    private container: HTMLElement;
    private selectedLunarDay: LunarDaySegment;
    // private siteName: string;
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
    private sectionCollapsed: { exploration: boolean; loi: boolean } = { exploration: false, loi: false };

    // Orbit visualization
    private orbitPanel: OrbitVisualizationPanel | null = null;

    constructor(options: LOIDateStepOptions) {
        this.container = options.container;
        this.selectedLunarDay = options.selectedLunarDay;
        // this.siteName = options.siteName;
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
            computedTLIDate: null,
            transferOrbit: null,
            explorationCollapsed: options.initialState?.explorationCollapsed,
            ...options.initialState
        };

        // initialize collapsed states
        this.sectionCollapsed.exploration = this.state.explorationCollapsed ?? false;

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
        this.container.innerHTML = `
            <div class="loi-date-step">
                    <div class="timeline-section collapsible-section ${this.sectionCollapsed.exploration ? 'collapsed' : ''}" id="exploration-section">
                    <div class="timeline-header" data-toggle="exploration-section">
                        <div class="timeline-heading-left">
                            <span class="timeline-title">Lunar Days as Mission Windows <span class="collapse-toggle">▼</span></span>
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

                    <div class="timeline-container" id="exploration-timeline">
                        ${this.renderExplorationTimeline()}
                    </div>
                </div>

                <div class="timeline-section loi-timeline-section collapsible-section ${this.sectionCollapsed.loi ? 'collapsed' : ''}" id="loi-selection-section">
                    <div class="timeline-header" data-toggle="loi-selection-section">
                        <span class="timeline-title">LOI Date Selection <span class="collapse-toggle">▼</span></span>
                        <span class="timeline-subtitle">Moon equator crossings before landing</span>
                    </div>

                    <div class="timeline-container" id="loi-timeline">
                        ${this.renderLOITimeline()}
                    </div>

                </div>

                <div class="loi-content-row">
                    <div class="orbit-visualization-section">
                        <div class="orbit-header">
                            <span class="orbit-title">Transfer Orbit Animation</span>
                            <button class="orbit-expand-btn hidden" id="orbit-expand-btn" type="button" title="Expand to full screen">⛶</button>
                        </div>
                        <div class="orbit-container" id="orbit-container"></div>
                        <div class="orbit-legend">
                            <span class="legend-item">
                                <span class="legend-line lunar"></span> Moon Orbit
                            </span>
                            <span class="legend-item">
                                <span class="legend-line chandrayaan"></span> Transfer Orbit
                            </span>
                            <span class="legend-item">
                                <span class="legend-marker tli"></span> TLI
                            </span>
                            <span class="legend-item">
                                <span class="legend-marker loi"></span> LOI
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.initOrbitVisualization();
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
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: this.timezone,
            month: 'short',
            day: 'numeric'
        });
        return formatter.format(date);
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

    private attachEventListeners(): void {
        // LOI markers on LOI timeline
        const loiTimeline = this.container.querySelector('#loi-timeline');
        loiTimeline?.querySelectorAll('.loi-marker').forEach(marker => {
            marker.addEventListener('click', () => {
                const index = parseInt(marker.getAttribute('data-loi-index') || '0', 10);
                this.selectLOI(index);
            });
        });

        // Collapsible section toggles
        this.container.querySelectorAll('.timeline-header[data-toggle]').forEach(header => {
            header.addEventListener('click', (e) => {
                const targetId = header.getAttribute('data-toggle');
                if (targetId) {
                    const section = this.container.querySelector(`#${targetId}`);
                    if (section) {
                        section.classList.toggle('collapsed');
                        // track manual collapse state
                        if (targetId === 'exploration-section') {
                            this.sectionCollapsed.exploration = section.classList.contains('collapsed');
                        } else if (targetId === 'loi-selection-section') {
                            this.sectionCollapsed.loi = section.classList.contains('collapsed');
                        }
                        // Resize orbit panel when sections collapse/expand
                        this.handleSectionToggle();
                    }
                }
                e.stopPropagation();
            });
        });
    }

    /**
     * Handle section collapse/expand to resize orbit visualization
     */
    private handleSectionToggle(): void {
        const orbitSection = this.container.querySelector('.orbit-visualization-section');
        const explorationSection = this.container.querySelector('#exploration-section');
        const loiSection = this.container.querySelector('#loi-selection-section');

        // If both sections are collapsed, expand the orbit panel
        if (explorationSection?.classList.contains('collapsed') &&
            loiSection?.classList.contains('collapsed')) {
            orbitSection?.classList.add('expanded');
        } else {
            orbitSection?.classList.remove('expanded');
        }

        // Resize orbit panel renderer if needed
        if (this.orbitPanel) {
            const orbitContainer = this.container.querySelector('#orbit-container') as HTMLElement;
            if (orbitContainer) {
                setTimeout(() => {
                    const width = orbitContainer.clientWidth;
                    const height = orbitContainer.clientHeight;
                    if (width > 0 && height > 0) {
                        this.orbitPanel?.resize(width, height);
                    }
                }, 350);  // Wait for CSS transition to complete
            }
        }
    }

    /**
     * Calculate orbital period for transfer orbit
     */
    private computeTransferOrbit(loiDate: Date): TransferOrbitSolution {
        const inclination = 21.5;
        const omega = 178;
        const perigeeAlt = DEFAULT_PERIGEE_ALT;
        const initialApogeeAlt = DEFAULT_APOGEE_ALT;

        try {
            const optimized = optimizeApogeeToMoonMultiStart(
                loiDate,
                omega,
                inclination,
                initialApogeeAlt
            );

            const timeToNu = calculateTimeToTrueAnomaly(
                optimized.trueAnomaly,
                perigeeAlt,
                optimized.apogeeAlt
            );

            const tliDate = new Date(loiDate.getTime() - timeToNu * 1000);

            return {
                tliDate,
                orbital: {
                    inclination,
                    raan: optimized.raan,
                    omega,
                    perigeeAlt,
                    apogeeAlt: optimized.apogeeAlt
                },
                trueAnomalyAtLOI: optimized.trueAnomaly,
                closestApproachKm: optimized.distance,
                closestApproachTime: loiDate
            };
        } catch (error) {
            console.warn('Transfer orbit optimization failed, using fallback timing.', error);

            // Fallback: assume apogee at 180° true anomaly with analytic RAAN
            const fallbackNu = 180;
            const timeToApogee = calculateTimeToTrueAnomaly(
                fallbackNu,
                perigeeAlt,
                initialApogeeAlt
            );
            const tliDate = new Date(loiDate.getTime() - timeToApogee * 1000);

            return {
                tliDate,
                orbital: {
                    inclination,
                    raan: calculateRequiredRaan(this.siteLongitude, loiDate),
                    omega,
                    perigeeAlt,
                    apogeeAlt: initialApogeeAlt
                },
                trueAnomalyAtLOI: fallbackNu,
                closestApproachKm: Infinity,
                closestApproachTime: loiDate
            };
        }
    }

    /**
     * Ensure we have a cached transfer orbit solution for the selected LOI
     */
    private ensureTransferOrbitSolution(): TransferOrbitSolution | null {
        if (!this.state.selectedLOIDate) return null;

        if (!this.state.transferOrbit || !this.state.computedTLIDate) {
            const solution = this.computeTransferOrbit(this.state.selectedLOIDate);
            this.state.transferOrbit = solution;
            this.state.computedTLIDate = solution.tliDate;
        }

        return this.state.transferOrbit;
    }

    private initOrbitVisualization(): void {
        const orbitContainer = this.container.querySelector('#orbit-container') as HTMLElement;
        if (!orbitContainer) return;

        // Wire up inline expand button
        const expandBtn = this.container.querySelector('#orbit-expand-btn') as HTMLButtonElement | null;

        // Show placeholder until LOI is selected
        if (!this.state.selectedLOIDate) {
            if (expandBtn) expandBtn.classList.add('hidden');
            orbitContainer.innerHTML = `
                <div class="orbit-placeholder">
                    <p>Select an LOI date above to view the transfer orbit trajectory</p>
                </div>
            `;
            return;
        }

        const transferOrbit = this.ensureTransferOrbitSolution();
        if (!transferOrbit) return;

        // Check if WebGL is available (not available in unit test environment)
        try {
            const testCanvas = document.createElement('canvas');
            const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
            if (!gl) {
                console.warn('WebGL not available, skipping orbit visualization');
                orbitContainer.innerHTML = '<div class="orbit-placeholder"><p>WebGL not available</p></div>';
                return;
            }
        } catch {
            console.warn('WebGL check failed, skipping orbit visualization');
            return;
        }

        // Calculate required RAAN for the LOI date
        const requiredRaan = calculateRequiredRaan(this.siteLongitude, this.state.selectedLOIDate);
        const landingDate = this.selectedLunarDay.sunrise;

        // Orbital parameters based on CY3 mission profile
        const orbitalParams: OrbitalParams = {
            ...transferOrbit.orbital,
            raan: transferOrbit.orbital.raan ?? requiredRaan
        };

        // Timeline configuration
        const timeline: TimelineConfig = {
            tliDate: transferOrbit.tliDate,
            loiDate: this.state.selectedLOIDate,
            landingDate: landingDate,
            closestApproachDate: transferOrbit.closestApproachTime,
            paddingDays: 5
        };

        try {
            // Clear placeholder
            orbitContainer.innerHTML = '';

            this.orbitPanel = new OrbitVisualizationPanel({
                container: orbitContainer,
                timeline: timeline,
                orbital: orbitalParams,
                timezone: this.timezone,
                captureThreshold: 5000,  // km
                onTimeChange: (_date) => {
                    // Could update external UI here if needed
                },
                onCapture: (_date) => {
                    // Capture detected - could show notification here
                }
            });
            // Connect inline expand control to the panel's fullscreen toggle
            if (expandBtn) {
                const toggleFn = (this.orbitPanel as any)?.toggleFullscreen;
                if (typeof toggleFn === 'function') {
                    expandBtn.classList.remove('hidden');
                    expandBtn.addEventListener('click', () => toggleFn.call(this.orbitPanel));
                } else {
                    expandBtn.classList.add('hidden');
                }
            }
        } catch (error) {
            console.warn('Failed to initialize orbit visualization:', error);
            orbitContainer.innerHTML = '<div class="orbit-placeholder"><p>Failed to initialize visualization</p></div>';
        }
    }

    private selectLOI(index: number): void {
        if (index >= 0 && index < this.loiOptions.length) {
            this.state.selectedLOIDate = this.loiOptions[index].date;

            // Compute TLI from LOI
            const solution = this.computeTransferOrbit(this.state.selectedLOIDate);
            this.state.transferOrbit = solution;
            this.state.computedTLIDate = solution.tliDate;
            this.state.explorationCollapsed = true;

            // Auto-collapse exploration panel on selection (stay collapsed until user reopens or navigation reset)
            this.sectionCollapsed.exploration = true;
            const explorationSection = this.container.querySelector('#exploration-section');
            explorationSection?.classList.add('collapsed');

            this.updateUI();
            this.notifyStateChange();

            // Update orbit visualization to show the trajectory
            this.updateOrbitVisualization();
        }
    }

    private updateOrbitVisualization(): void {
        if (!this.state.selectedLOIDate) return;

        const transferOrbit = this.ensureTransferOrbitSolution();
        if (!transferOrbit) return;

        // If panel doesn't exist yet, initialize it
        if (!this.orbitPanel) {
            this.initOrbitVisualization();
            // Update subtitle
            const subtitle = this.container.querySelector('#orbit-subtitle');
            if (subtitle) {
                subtitle.textContent = `TLI: ${this.formatDateTimeShort(this.state.computedTLIDate)} → LOI: ${this.formatDateTimeShort(this.state.selectedLOIDate)}`;
            }
            return;
        }

        // Calculate required RAAN for the LOI date
        const requiredRaan = calculateRequiredRaan(this.siteLongitude, this.state.selectedLOIDate);
        const landingDate = this.selectedLunarDay.sunrise;

        // Update orbital parameters
        this.orbitPanel.setOrbitalParams({
            raan: transferOrbit.orbital.raan ?? requiredRaan,
            perigeeAlt: transferOrbit.orbital.perigeeAlt,
            apogeeAlt: transferOrbit.orbital.apogeeAlt
        });

        // Update timeline configuration
        this.orbitPanel.setTimeline({
            tliDate: transferOrbit.tliDate,
            loiDate: this.state.selectedLOIDate,
            landingDate: landingDate,
            closestApproachDate: transferOrbit.closestApproachTime,
            paddingDays: 5
        });

        // Ensure expand button is visible when visualization is active
        const expandBtn = this.container.querySelector('#orbit-expand-btn') as HTMLButtonElement | null;
        if (expandBtn) {
            const toggleFn = (this.orbitPanel as any)?.toggleFullscreen;
            if (typeof toggleFn === 'function') {
                expandBtn.classList.remove('hidden');
            } else {
                expandBtn.classList.add('hidden');
            }
        }

        // Update subtitle
        const subtitle = this.container.querySelector('#orbit-subtitle');
        if (subtitle) {
            subtitle.textContent = `TLI: ${this.formatDateTimeShort(this.state.computedTLIDate)} → LOI: ${this.formatDateTimeShort(this.state.selectedLOIDate)}`;
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
        if (this.orbitPanel) {
            this.orbitPanel.setTimezone(timezone);
        }
        this.render();
    }

    dispose(): void {
        if (this.orbitPanel) {
            this.orbitPanel.dispose();
            this.orbitPanel = null;
        }
        this.container.innerHTML = '';
    }
}
