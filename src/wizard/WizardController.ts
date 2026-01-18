/**
 * WizardController - Manages the Mission Design Wizard flow
 *
 * Handles:
 * - Step navigation (next, back, jump to step)
 * - State persistence across steps
 * - Breadcrumb and progress display
 */

import { MissionWindowStep, MissionWindowState } from './steps/MissionWindowStep.js';
import { LandingSiteStep, LandingSiteStepState } from './steps/LandingSiteStep.js';
import { LandingWindowStep, LandingWindowStepState } from './steps/LandingWindowStep.js';
import { LOIDateStep, LOIDateStepState } from './steps/LOIDateStep.js';
import {
    LunarDaySegment,
    formatLunarDayLabel,
    findElevationCrossing,
    calculateSunElevation
} from './calculations/sunElevation.js';

export interface WizardState {
    currentStep: number;
    missionWindow: MissionWindowState | null;
    landingSite: LandingSiteStepState | null;
    landingWindow: LandingWindowStepState | null;
    selectedLunarDay: LunarDaySegment | null;
    loiDate: LOIDateStepState | null;
}

export interface WizardControllerOptions {
    container: HTMLElement;
    onComplete?: (state: WizardState) => void;
    onCancel?: () => void;
}

const STEP_TITLES = [
    'Exploration Window',
    'Landing Site',
    'Lunar Day',
    'LOI Date',
    'Review'
];

interface MissionTimes {
    sixDegRising: Date;
    nineDegRising: Date;
    sixDegSetting: Date;
    missionDurationHours: number;
}

// Common timezones grouped by region (using IANA timezone names)
const TIMEZONE_OPTIONS = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'America/New_York', label: 'US Eastern' },
    { value: 'America/Chicago', label: 'US Central' },
    { value: 'America/Denver', label: 'US Mountain' },
    { value: 'America/Los_Angeles', label: 'US Pacific' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris/Berlin' },
    { value: 'Europe/Moscow', label: 'Moscow' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'China' },
    { value: 'Australia/Sydney', label: 'Sydney' },
];

export class WizardController {
    private container: HTMLElement;
    private contentContainer: HTMLElement | null = null;
    private currentStepInstance: MissionWindowStep | LandingSiteStep | LandingWindowStep | LOIDateStep | null = null;

    private state: WizardState = {
        currentStep: 1,
        missionWindow: null,
        landingSite: null,
        landingWindow: null,
        selectedLunarDay: null,
        loiDate: null
    };

    private timezone: string = 'UTC';  // Default timezone (IANA name)

    private onComplete?: (state: WizardState) => void;
    private onCancel?: () => void;

    constructor(options: WizardControllerOptions) {
        this.container = options.container;
        this.onComplete = options.onComplete;
        this.onCancel = options.onCancel;

        this.render();
        this.showStep(1);
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-main">
                    <div class="wizard-steps-panel" id="wizard-steps-panel">
                        <div class="steps-header">Steps</div>
                        <div class="steps-list" id="wizard-steps-list"></div>
                    </div>

                    <div class="wizard-content" id="wizard-content"></div>

                    <div class="wizard-summary" id="wizard-summary">
                        <div class="summary-header">Mission Summary</div>
                        <div class="summary-content" id="summary-content">
                            <div class="summary-empty">Complete steps to see summary</div>
                        </div>
                    </div>
                </div>

                <div class="wizard-footer">
                    <button class="wizard-btn wizard-btn-cancel" id="wizard-cancel-btn">Cancel</button>
                    <div class="wizard-footer-center">
                        <label class="timezone-selector">
                            <span class="timezone-label">Timezone:</span>
                            <select id="timezone-select" class="timezone-select">
                                ${TIMEZONE_OPTIONS.map(tz =>
                                    `<option value="${tz.value}">${tz.label}</option>`
                                ).join('')}
                            </select>
                        </label>
                    </div>
                    <div class="wizard-nav-buttons">
                        <button class="wizard-btn wizard-btn-back" id="wizard-back-btn" disabled>
                            ← Back
                        </button>
                        <button class="wizard-btn wizard-btn-next" id="wizard-next-btn">
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.contentContainer = this.container.querySelector('#wizard-content');
        this.updateStepsList();
        this.attachEventListeners();
    }

    private attachEventListeners(): void {
        const backBtn = this.container.querySelector('#wizard-back-btn');
        const nextBtn = this.container.querySelector('#wizard-next-btn');
        const cancelBtn = this.container.querySelector('#wizard-cancel-btn');
        const timezoneSelect = this.container.querySelector('#timezone-select') as HTMLSelectElement;

        backBtn?.addEventListener('click', () => this.goBack());
        nextBtn?.addEventListener('click', () => this.goNext());
        cancelBtn?.addEventListener('click', () => this.cancel());

        timezoneSelect?.addEventListener('change', () => {
            this.timezone = timezoneSelect.value;
            this.updateSummary();
            // Notify current step of timezone change
            if (this.currentStepInstance instanceof LandingWindowStep) {
                this.currentStepInstance.setTimezone(this.timezone);
            } else if (this.currentStepInstance instanceof LOIDateStep) {
                this.currentStepInstance.setTimezone(this.timezone);
            }
        });
    }

    private updateStepsList(): void {
        const stepsList = this.container.querySelector('#wizard-steps-list');
        if (!stepsList) return;

        const items = STEP_TITLES.map((title, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === this.state.currentStep;
            const isCompleted = stepNum < this.state.currentStep;
            const isClickable = stepNum < this.state.currentStep;

            let className = 'step-item';
            if (isActive) className += ' active';
            if (isCompleted) className += ' completed';
            if (isClickable) className += ' clickable';

            return `
                <div class="${className}" data-step="${stepNum}">
                    <span class="step-number">${isCompleted ? '✓' : stepNum}</span>
                    <span class="step-title">${title}</span>
                </div>
            `;
        }).join('');

        stepsList.innerHTML = items;

        // Add click handlers for completed steps
        stepsList.querySelectorAll('.step-item.clickable').forEach(item => {
            item.addEventListener('click', () => {
                const step = parseInt(item.getAttribute('data-step') || '1', 10);
                this.goToStep(step);
            });
        });
    }

    private updateNavButtons(): void {
        const backBtn = this.container.querySelector('#wizard-back-btn') as HTMLButtonElement;
        const nextBtn = this.container.querySelector('#wizard-next-btn') as HTMLButtonElement;

        if (backBtn) {
            backBtn.disabled = this.state.currentStep === 1;
        }

        if (nextBtn) {
            if (this.state.currentStep === 5) {
                nextBtn.textContent = 'Create Mission';
            } else {
                nextBtn.textContent = 'Next →';
            }
        }
    }

    private showStep(stepNum: number): void {
        if (!this.contentContainer) return;

        // Dispose current step
        this.currentStepInstance?.dispose();
        this.currentStepInstance = null;

        this.state.currentStep = stepNum;
        this.updateStepsList();
        this.updateNavButtons();

        switch (stepNum) {
            case 1:
                this.showMissionWindowStep();
                break;
            case 2:
                this.showLandingSiteStep();
                break;
            case 3:
                this.showLandingWindowStep();
                break;
            case 4:
                this.showLOIDateStep();
                break;
            case 5:
                this.showPlaceholderStep(stepNum);
                break;
        }
    }

    private showMissionWindowStep(): void {
        if (!this.contentContainer) return;

        this.currentStepInstance = new MissionWindowStep({
            container: this.contentContainer,
            initialState: this.state.missionWindow || undefined,
            onStateChange: (state) => {
                this.state.missionWindow = state;
                this.updateSummary();
            }
        });
    }

    private showLandingSiteStep(): void {
        if (!this.contentContainer) return;

        // Determine mission filter based on step 1 selection
        const missionFilter = this.state.missionWindow?.preset === 'cy2' ? 'cy2' :
                             this.state.missionWindow?.preset === 'cy3' ? 'cy3' : 'all';

        this.currentStepInstance = new LandingSiteStep({
            container: this.contentContainer,
            missionFilter,
            initialState: this.state.landingSite || undefined,
            onStateChange: (state) => {
                this.state.landingSite = state;
                this.updateSummary();
            }
        });
    }

    private getExplorationDates(): { startDate: Date; endDate: Date } {
        const startDate = this.state.missionWindow?.startDate
            ? new Date(this.state.missionWindow.startDate)
            : new Date('2023-03-01');
        const endDate = this.state.missionWindow?.endDate
            ? new Date(this.state.missionWindow.endDate)
            : new Date('2023-10-31');
        return { startDate, endDate };
    }

    private showLandingWindowStep(): void {
        if (!this.contentContainer) return;

        const site = this.state.landingSite?.primarySite;
        if (!site) {
            this.showPlaceholderStep(3);
            return;
        }

        const { startDate, endDate } = this.getExplorationDates();
        const backupSite = this.state.landingSite?.backupSite;

        this.currentStepInstance = new LandingWindowStep({
            container: this.contentContainer,
            siteName: site.name,
            siteLatitude: site.latitude,
            siteLongitude: site.longitude,
            backupSiteName: backupSite?.name,
            backupSiteLatitude: backupSite?.latitude,
            backupSiteLongitude: backupSite?.longitude,
            explorationStartDate: startDate,
            explorationEndDate: endDate,
            timezone: this.timezone,
            initialState: this.state.landingWindow || undefined,
            onStateChange: (state) => {
                this.state.landingWindow = state;
                this.state.selectedLunarDay = state.selectedLunarDay;
                this.updateSummary();
            }
        });
    }

    private showLOIDateStep(): void {
        if (!this.contentContainer) return;

        const selectedLunarDay = this.state.selectedLunarDay;
        const primarySite = this.state.landingSite?.primarySite;

        if (!selectedLunarDay || !primarySite) {
            this.showPlaceholderStep(4);
            return;
        }

        const { startDate, endDate } = this.getExplorationDates();

        this.currentStepInstance = new LOIDateStep({
            container: this.contentContainer,
            selectedLunarDay,
            siteName: primarySite.name,
            siteLatitude: primarySite.latitude,
            siteLongitude: primarySite.longitude,
            explorationStartDate: startDate,
            explorationEndDate: endDate,
            timezone: this.timezone,
            initialState: this.state.loiDate || undefined,
            onStateChange: (state) => {
                this.state.loiDate = state;
                this.updateSummary();
            }
        });
    }

    private updateSummary(): void {
        const summaryContent = this.container.querySelector('#summary-content');
        if (!summaryContent) return;

        const sections: string[] = [];

        if (this.state.missionWindow) {
            sections.push(this.renderMissionWindowSection(this.state.missionWindow));
        }

        if (this.state.landingSite) {
            const siteSection = this.renderLandingSiteSection(this.state.landingSite);
            if (siteSection) sections.push(siteSection);
        }

        if (this.state.selectedLunarDay) {
            sections.push(this.renderLunarDaySection(this.state.selectedLunarDay));
        }

        if (this.state.loiDate?.selectedLOIDate) {
            sections.push(this.renderLOIDateSection(this.state.loiDate.selectedLOIDate));
        }

        summaryContent.innerHTML = sections.length > 0
            ? sections.join('')
            : '<div class="summary-empty">Complete steps to see summary</div>';
    }

    private renderMissionWindowSection(mw: MissionWindowState): string {
        const dateItems = [
            mw.startDate ? `<div class="summary-item"><span class="summary-label">Start:</span><span class="summary-value">${new Date(mw.startDate).toLocaleDateString()}</span></div>` : '',
            mw.endDate ? `<div class="summary-item"><span class="summary-label">End:</span><span class="summary-value">${new Date(mw.endDate).toLocaleDateString()}</span></div>` : ''
        ].filter(Boolean).join('');

        return `
            <div class="summary-section">
                <div class="summary-section-header">
                    <span class="summary-step-num">1</span>
                    Mission Window
                </div>
                <div class="summary-section-content">
                    <div class="summary-item">
                        <span class="summary-label">Preset:</span>
                        <span class="summary-value">${mw.preset?.toUpperCase() || 'Custom'}</span>
                    </div>
                    ${dateItems}
                </div>
            </div>
        `;
    }

    private renderSiteItem(label: string, site: { name: string; latitude: number; longitude: number }): string {
        return `
            <div class="summary-item">
                <span class="summary-label">${label}:</span>
                <span class="summary-value">${site.name}</span>
            </div>
            <div class="summary-item secondary">
                <span class="summary-value">${site.latitude.toFixed(2)}°, ${site.longitude.toFixed(2)}°</span>
            </div>
        `;
    }

    private renderLandingSiteSection(ls: LandingSiteStepState): string | null {
        const siteItems: string[] = [];

        if (ls.primarySite) siteItems.push(this.renderSiteItem('Primary', ls.primarySite));
        if (ls.backupSite) siteItems.push(this.renderSiteItem('Backup', ls.backupSite));

        if (siteItems.length === 0) return null;

        return `
            <div class="summary-section">
                <div class="summary-section-header">
                    <span class="summary-step-num">2</span>
                    Landing Site
                </div>
                <div class="summary-section-content">
                    ${siteItems.join('')}
                </div>
            </div>
        `;
    }

    private renderLunarDaySection(lunarDay: LunarDaySegment): string {
        const label = formatLunarDayLabel(lunarDay);

        // Get primary and backup sites
        const primarySite = this.state.landingSite?.primarySite;
        const backupSite = this.state.landingSite?.backupSite;

        let siteSections = '';

        // Primary site mission times
        if (primarySite) {
            const missionTimes = this.calculateMissionTimes(
                { latitude: primarySite.latitude, longitude: primarySite.longitude },
                lunarDay
            );
            siteSections += this.renderSiteMissionTimes('Primary', primarySite.name, missionTimes);
        }

        // Backup site mission times
        if (backupSite) {
            const missionTimes = this.calculateMissionTimes(
                { latitude: backupSite.latitude, longitude: backupSite.longitude },
                lunarDay
            );
            siteSections += this.renderSiteMissionTimes('Backup', backupSite.name, missionTimes);
        }

        return `
            <div class="summary-section">
                <div class="summary-section-header">
                    <span class="summary-step-num">3</span>
                    Lunar Day
                </div>
                <div class="summary-section-content">
                    <div class="summary-item">
                        <span class="summary-label">Period:</span>
                        <span class="summary-value">${label}</span>
                    </div>
                    ${siteSections}
                </div>
            </div>
        `;
    }

    private renderSiteMissionTimes(
        siteType: string,
        siteName: string,
        missionTimes: MissionTimes | null
    ): string {
        if (!missionTimes) {
            return `
                <div class="summary-subsection">
                    <div class="summary-item">
                        <span class="summary-label">${siteType}:</span>
                        <span class="summary-value">${siteName}</span>
                    </div>
                    <div class="summary-item secondary">
                        <span class="summary-value">Unable to calculate times</span>
                    </div>
                </div>
            `;
        }

        const missionDays = missionTimes.missionDurationHours / 24;

        return `
            <div class="summary-subsection">
                <div class="summary-item">
                    <span class="summary-label">${siteType}:</span>
                    <span class="summary-value">${siteName}</span>
                </div>
                <div class="summary-item secondary">
                    <span class="summary-label">6° rising:</span>
                    <span class="summary-value">${this.formatDateTime(missionTimes.sixDegRising)}</span>
                </div>
                <div class="summary-item secondary">
                    <span class="summary-label">9° rising:</span>
                    <span class="summary-value">${this.formatDateTime(missionTimes.nineDegRising)}</span>
                </div>
                <div class="summary-item secondary">
                    <span class="summary-label">6° setting:</span>
                    <span class="summary-value">${this.formatDateTime(missionTimes.sixDegSetting)}</span>
                </div>
                <div class="summary-item secondary">
                    <span class="summary-label">Duration:</span>
                    <span class="summary-value">${missionDays.toFixed(1)} days</span>
                </div>
            </div>
        `;
    }

    private renderLOIDateSection(loiDate: Date): string {
        return `
            <div class="summary-section">
                <div class="summary-section-header">
                    <span class="summary-step-num">4</span>
                    LOI Date
                </div>
                <div class="summary-section-content">
                    <div class="summary-item">
                        <span class="summary-label">Date:</span>
                        <span class="summary-value">${this.formatDateTime(loiDate)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    private calculateMissionTimes(
        site: { latitude: number; longitude: number },
        lunarDay: LunarDaySegment
    ): MissionTimes | null {
        const samples = this.generateElevationSamples(site, lunarDay);
        const cycles = this.findMissionCycles(site, samples);
        const bestCycle = this.findClosestCycle(cycles, lunarDay.peakTime);

        if (!bestCycle) {
            return null;
        }

        return {
            sixDegRising: bestCycle.sixDegRising,
            nineDegRising: bestCycle.nineDegRising,
            sixDegSetting: bestCycle.sixDegSetting,
            missionDurationHours: (bestCycle.sixDegSetting.getTime() - bestCycle.sixDegRising.getTime()) / (1000 * 60 * 60)
        };
    }

    private generateElevationSamples(
        site: { latitude: number; longitude: number },
        lunarDay: LunarDaySegment
    ): { time: Date; elevation: number }[] {
        const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
        const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

        const searchStart = lunarDay.sunrise.getTime() - FIFTEEN_DAYS_MS;
        const searchEnd = lunarDay.sunset.getTime() + FIFTEEN_DAYS_MS;

        const samples: { time: Date; elevation: number }[] = [];
        let t = searchStart;
        while (t <= searchEnd) {
            const time = new Date(t);
            samples.push({ time, elevation: calculateSunElevation(site, time) });
            t += THREE_HOURS_MS;
        }
        return samples;
    }

    private isRisingCrossing(curr: number, next: number, threshold: number): boolean {
        return curr < threshold && next >= threshold;
    }

    private isSettingCrossing(curr: number, next: number, threshold: number): boolean {
        return curr >= threshold && next < threshold;
    }

    private findMissionCycles(
        site: { latitude: number; longitude: number },
        samples: { time: Date; elevation: number }[]
    ): { sixDegRising: Date; nineDegRising: Date; sixDegSetting: Date }[] {
        const cycles: { sixDegRising: Date; nineDegRising: Date; sixDegSetting: Date }[] = [];
        let sixRising: Date | null = null;
        let nineRising: Date | null = null;

        for (let i = 0; i < samples.length - 1; i++) {
            const curr = samples[i];
            const next = samples[i + 1];

            if (this.isRisingCrossing(curr.elevation, next.elevation, 6)) {
                sixRising = findElevationCrossing(site, curr.time, next.time, 6);
                nineRising = null;
            }
            if (sixRising && !nineRising && this.isRisingCrossing(curr.elevation, next.elevation, 9)) {
                nineRising = findElevationCrossing(site, curr.time, next.time, 9);
            }
            if (sixRising && nineRising && this.isSettingCrossing(curr.elevation, next.elevation, 6)) {
                cycles.push({
                    sixDegRising: sixRising,
                    nineDegRising: nineRising,
                    sixDegSetting: findElevationCrossing(site, curr.time, next.time, 6)
                });
                sixRising = null;
                nineRising = null;
            }
        }
        return cycles;
    }

    private findClosestCycle(
        cycles: { sixDegRising: Date; nineDegRising: Date; sixDegSetting: Date }[],
        peakTime: Date
    ): { sixDegRising: Date; nineDegRising: Date; sixDegSetting: Date } | null {
        const peakMs = peakTime.getTime();
        let bestCycle: { sixDegRising: Date; nineDegRising: Date; sixDegSetting: Date } | null = null;
        let bestDistance = Infinity;

        for (const cycle of cycles) {
            const midpoint = (cycle.sixDegRising.getTime() + cycle.sixDegSetting.getTime()) / 2;
            const distance = Math.abs(midpoint - peakMs);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestCycle = cycle;
            }
        }
        return bestCycle;
    }

    private formatDateTime(date: Date): string {
        // Use Intl.DateTimeFormat for proper timezone handling
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

    private showPlaceholderStep(stepNum: number): void {
        if (!this.contentContainer) return;

        const title = STEP_TITLES[stepNum - 1];
        this.contentContainer.innerHTML = `
            <div class="placeholder-step">
                <h2>Step ${stepNum}: ${title}</h2>
                <p class="placeholder-message">
                    This step will be implemented in Iteration ${stepNum}.
                </p>
                <div class="placeholder-info">
                    <strong>Current State:</strong>
                    <pre>${JSON.stringify(this.state, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    private goBack(): void {
        if (this.state.currentStep > 1) {
            this.saveCurrentStepState();
            this.showStep(this.state.currentStep - 1);
        }
    }

    private goNext(): void {
        // Validate current step
        if (!this.validateCurrentStep()) {
            return;
        }

        this.saveCurrentStepState();

        if (this.state.currentStep < 5) {
            this.showStep(this.state.currentStep + 1);
        } else {
            // Final step - complete wizard
            this.complete();
        }
    }

    private goToStep(stepNum: number): void {
        if (stepNum < this.state.currentStep) {
            this.saveCurrentStepState();
            this.showStep(stepNum);
        }
    }

    private saveCurrentStepState(): void {
        if (this.currentStepInstance) {
            if (this.currentStepInstance instanceof MissionWindowStep) {
                this.state.missionWindow = this.currentStepInstance.getState();
            } else if (this.currentStepInstance instanceof LandingSiteStep) {
                this.state.landingSite = this.currentStepInstance.getState();
            } else if (this.currentStepInstance instanceof LandingWindowStep) {
                this.state.landingWindow = this.currentStepInstance.getState();
                this.state.selectedLunarDay = this.currentStepInstance.getSelectedLunarDay();
            } else if (this.currentStepInstance instanceof LOIDateStep) {
                this.state.loiDate = this.currentStepInstance.getState();
            }
        }
    }

    private validateCurrentStep(): boolean {
        if (!this.currentStepInstance) return true;

        if (!this.currentStepInstance.isValid()) {
            // Show validation error
            if (this.currentStepInstance instanceof MissionWindowStep) {
                const error = this.currentStepInstance.getValidationError();
                if (error) {
                    alert(error);
                }
            } else {
                alert('Please complete this step before proceeding.');
            }
            return false;
        }

        return true;
    }

    private complete(): void {
        this.saveCurrentStepState();
        if (this.onComplete) {
            this.onComplete(this.state);
        }
    }

    private cancel(): void {
        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * Get current wizard state
     */
    getState(): WizardState {
        this.saveCurrentStepState();
        return { ...this.state };
    }

    /**
     * Clean up
     */
    dispose(): void {
        this.currentStepInstance?.dispose();
        this.container.innerHTML = '';
    }
}
