/**
 * Wizard Entry Point
 *
 * Initializes the Mission Design Wizard application.
 * This is the main entry point for wizard.html.
 */

import { WizardController } from './WizardController';

console.log('Chandrayaan Mission Designer - Loading...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        const container = document.getElementById('wizard-container');

        if (!container) {
            throw new Error('Wizard container not found in DOM');
        }

        // Initialize the wizard
        // @ts-expect-error wizard manages its own lifecycle
        const _wizard = new WizardController({
            container,
            onComplete: (state) => {
                console.log('Mission design complete:', state);
                alert('Mission design complete! In the full app, this would create a launch event.');
            },
            onCancel: () => {
                console.log('Wizard cancelled');
                // Future: Navigate back to landing page
                // window.location.href = './landing.html';
            }
        });

        console.log('Wizard initialized successfully');
    } catch (error) {
        console.error('Wizard initialization error:', error);
        const container = document.getElementById('wizard-container');
        if (container) {
            container.innerHTML =
                `<div style="padding: 24px; color: #f66;">
                    <h2>Error Loading Wizard</h2>
                    <p>${error instanceof Error ? error.message : String(error)}</p>
                </div>`;
        }
    }
});
