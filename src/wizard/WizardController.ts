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

export interface WizardState {
    currentStep: number;
    missionWindow: MissionWindowState | null;
    landingSite: LandingSiteStepState | null;
    // Future steps will add more state here
}

export interface WizardControllerOptions {
    container: HTMLElement;
    onComplete?: (state: WizardState) => void;
    onCancel?: () => void;
}

const STEP_TITLES = [
    'Mission Window',
    'Landing Site',
    'Landing Window',
    'LOI Date',
    'Review'
];

export class WizardController {
    private container: HTMLElement;
    private contentContainer: HTMLElement | null = null;
    private currentStepInstance: MissionWindowStep | LandingSiteStep | null = null;

    private state: WizardState = {
        currentStep: 1,
        missionWindow: null,
        landingSite: null
    };

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

        backBtn?.addEventListener('click', () => this.goBack());
        nextBtn?.addEventListener('click', () => this.goNext());
        cancelBtn?.addEventListener('click', () => this.cancel());
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
            case 4:
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
