/**
 * MissionWindowStep - Step 1 of Mission Design Wizard
 *
 * Allows user to select the exploration window (time range for planning):
 * - CY3 preset (March - October 2023)
 * - CY2 preset (January - September 2019)
 * - Custom date range
 */

export interface MissionWindowState {
    preset: 'cy3' | 'cy2' | 'custom';
    startDate: Date;
    endDate: Date;
}

export interface MissionWindowStepOptions {
    container: HTMLElement;
    initialState?: Partial<MissionWindowState>;
    onStateChange?: (state: MissionWindowState) => void;
}

// Preset time ranges
const PRESETS = {
    cy3: {
        name: 'Chandrayaan-3 (2023)',
        description: 'March 2023 - October 2023',
        start: new Date('2023-03-01T00:00:00Z'),
        end: new Date('2023-10-31T23:59:59Z')
    },
    cy2: {
        name: 'Chandrayaan-2 (2019)',
        description: 'January 2019 - September 2019',
        start: new Date('2019-01-01T00:00:00Z'),
        end: new Date('2019-09-30T23:59:59Z')
    }
};

export class MissionWindowStep {
    private container: HTMLElement;
    private state: MissionWindowState;
    private onStateChange?: (state: MissionWindowState) => void;

    constructor(options: MissionWindowStepOptions) {
        this.container = options.container;
        this.onStateChange = options.onStateChange;

        // Initialize state with CY3 as default
        this.state = {
            preset: 'cy3',
            startDate: PRESETS.cy3.start,
            endDate: PRESETS.cy3.end,
            ...options.initialState
        };

        this.render();
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="mission-window-step">
                <div class="preset-options">
                    <label class="preset-option ${this.state.preset === 'cy3' ? 'selected' : ''}">
                        <input type="radio" name="mission-preset" value="cy3"
                            ${this.state.preset === 'cy3' ? 'checked' : ''} />
                        <div class="preset-content">
                            <span class="preset-name">${PRESETS.cy3.name}</span>
                            <span class="preset-dates">${PRESETS.cy3.description}</span>
                        </div>
                    </label>

                    <label class="preset-option ${this.state.preset === 'cy2' ? 'selected' : ''}">
                        <input type="radio" name="mission-preset" value="cy2"
                            ${this.state.preset === 'cy2' ? 'checked' : ''} />
                        <div class="preset-content">
                            <span class="preset-name">${PRESETS.cy2.name}</span>
                            <span class="preset-dates">${PRESETS.cy2.description}</span>
                        </div>
                    </label>

                    <label class="preset-option ${this.state.preset === 'custom' ? 'selected' : ''}">
                        <input type="radio" name="mission-preset" value="custom"
                            ${this.state.preset === 'custom' ? 'checked' : ''} />
                        <div class="preset-content">
                            <span class="preset-name">Custom Range</span>
                            <span class="preset-dates">Define your own time window</span>
                        </div>
                    </label>
                </div>

                <div class="custom-dates-section" id="custom-dates-section"
                    style="display: ${this.state.preset === 'custom' ? 'block' : 'none'};">
                    <div class="date-inputs">
                        <div class="date-field">
                            <label for="start-date-input">Start Date:</label>
                            <input type="date" id="start-date-input"
                                value="${this.formatDateForInput(this.state.startDate)}" />
                        </div>
                        <div class="date-field">
                            <label for="end-date-input">End Date:</label>
                            <input type="date" id="end-date-input"
                                value="${this.formatDateForInput(this.state.endDate)}" />
                        </div>
                    </div>
                    <p class="date-hint">
                        Minimum range: 1 month. Maximum range: 12 months.
                    </p>
                </div>

            </div>
        `;

        this.attachEventListeners();
    }

    private attachEventListeners(): void {
        // Preset radio buttons
        const presetRadios = this.container.querySelectorAll('input[name="mission-preset"]');
        presetRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                this.handlePresetChange(target.value as 'cy3' | 'cy2' | 'custom');
            });
        });

        // Custom date inputs
        const startDateInput = this.container.querySelector('#start-date-input') as HTMLInputElement;
        const endDateInput = this.container.querySelector('#end-date-input') as HTMLInputElement;

        startDateInput?.addEventListener('change', () => {
            if (this.state.preset === 'custom') {
                this.state.startDate = new Date(startDateInput.value + 'T00:00:00Z');
                this.notifyStateChange();
            }
        });

        endDateInput?.addEventListener('change', () => {
            if (this.state.preset === 'custom') {
                this.state.endDate = new Date(endDateInput.value + 'T23:59:59Z');
                this.notifyStateChange();
            }
        });
    }

    private handlePresetChange(preset: 'cy3' | 'cy2' | 'custom'): void {
        this.state.preset = preset;

        // Update dates based on preset
        if (preset === 'cy3') {
            this.state.startDate = PRESETS.cy3.start;
            this.state.endDate = PRESETS.cy3.end;
        } else if (preset === 'cy2') {
            this.state.startDate = PRESETS.cy2.start;
            this.state.endDate = PRESETS.cy2.end;
        }

        // Update UI
        this.updatePresetStyles();
        this.toggleCustomDates(preset === 'custom');
        this.notifyStateChange();
    }

    private updatePresetStyles(): void {
        const options = this.container.querySelectorAll('.preset-option');
        options.forEach(option => {
            const radio = option.querySelector('input') as HTMLInputElement;
            if (radio.checked) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    private toggleCustomDates(show: boolean): void {
        const customSection = this.container.querySelector('#custom-dates-section') as HTMLElement;
        if (customSection) {
            customSection.style.display = show ? 'block' : 'none';
        }
    }

    private formatDateForInput(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    /**
     * Get current state
     */
    getState(): MissionWindowState {
        return { ...this.state };
    }

    /**
     * Validate step
     */
    isValid(): boolean {
        const startTime = this.state.startDate.getTime();
        const endTime = this.state.endDate.getTime();
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        const twelveMonths = 365 * 24 * 60 * 60 * 1000;

        const duration = endTime - startTime;
        return duration >= oneMonth && duration <= twelveMonths;
    }

    /**
     * Get validation error message
     */
    getValidationError(): string | null {
        if (!this.isValid()) {
            const startTime = this.state.startDate.getTime();
            const endTime = this.state.endDate.getTime();
            const duration = endTime - startTime;
            const oneMonth = 30 * 24 * 60 * 60 * 1000;

            if (duration < oneMonth) {
                return 'Time range must be at least 1 month';
            }
            return 'Time range must not exceed 12 months';
        }
        return null;
    }

    /**
     * Clean up
     */
    dispose(): void {
        this.container.innerHTML = '';
    }
}
