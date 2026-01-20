/**
 * Help Panel Component
 *
 * Provides a slide-out help panel with step-specific guidance.
 * Shows detailed help content for the current wizard step.
 */

import helpConfig from '../help-config.json';

interface HelpSection {
    heading: string;
    content: string;
}

interface StepHelpContent {
    title: string;
    sections: HelpSection[];
    tips?: string[];
}

interface HelpConfig {
    walkthrough: {
        enabled: boolean;
        showOnFirstVisit: boolean;
        steps: unknown[];
    };
    helpContent: {
        [stepIndex: string]: StepHelpContent;
    };
}

export class HelpPanel {
    private container: HTMLElement;
    private panel: HTMLElement | null = null;
    private isOpen = false;
    private currentStep = 0;
    private config: HelpConfig;

    constructor(container: HTMLElement) {
        this.container = container;
        this.config = helpConfig as HelpConfig;
        this.createHelpPanel();
        this.attachEventListeners();
    }

    private createHelpPanel(): void {
        this.panel = document.createElement('div');
        this.panel.className = 'help-panel';
        this.panel.innerHTML = `
            <div class="help-panel-header">
                <h3 class="help-panel-title">Help</h3>
                <button class="help-panel-close" aria-label="Close help panel">&times;</button>
            </div>
            <div class="help-panel-content">
                <!-- Content populated dynamically -->
            </div>
        `;

        this.container.appendChild(this.panel);
    }

    private attachEventListeners(): void {
        // Close panel on close button click
        const closeButton = this.panel?.querySelector('.help-panel-close');
        closeButton?.addEventListener('click', () => {
            this.close();
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    public setStep(stepIndex: number): void {
        this.currentStep = stepIndex;
        if (this.isOpen) {
            this.updateContent();
        }
    }

    private updateContent(): void {
        const contentEl = this.panel?.querySelector('.help-panel-content');
        if (!contentEl) return;

        const stepHelp = this.config.helpContent[this.currentStep.toString()];
        if (!stepHelp) {
            contentEl.innerHTML = '<p class="help-error">No help available for this step.</p>';
            return;
        }

        let html = `<h2 class="help-step-title">${stepHelp.title}</h2>`;

        // Add sections
        stepHelp.sections.forEach(section => {
            html += `
                <div class="help-section">
                    <h4 class="help-section-heading">${section.heading}</h4>
                    <p class="help-section-content">${this.formatContent(section.content)}</p>
                </div>
            `;
        });

        // Add tips if available
        if (stepHelp.tips && stepHelp.tips.length > 0) {
            html += '<div class="help-tips"><h4 class="help-tips-heading">💡 Tips</h4><ul class="help-tips-list">';
            stepHelp.tips.forEach(tip => {
                html += `<li>${tip}</li>`;
            });
            html += '</ul></div>';
        }

        contentEl.innerHTML = html;
    }

    private formatContent(content: string): string {
        // Convert newlines to <br> and preserve list formatting
        return content
            .split('\n')
            .map(line => {
                if (line.startsWith('•')) {
                    return `<span class="help-bullet">${line}</span>`;
                }
                return line;
            })
            .join('<br>');
    }

    public open(): void {
        if (this.isOpen) return;

        this.updateContent();
        this.panel?.classList.add('open');
        this.isOpen = true;
    }

    public close(): void {
        if (!this.isOpen) return;

        this.panel?.classList.remove('open');
        this.isOpen = false;
    }

    public toggle(): void {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    public destroy(): void {
        this.panel?.remove();
    }
}
