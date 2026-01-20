/**
 * Walkthrough Manager
 *
 * Manages the interactive walkthrough using driver.js.
 * Shows first-time users how to use the Mission Design Wizard.
 */

import { driver, Driver, Config, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import helpConfig from '../help-config.json';

const WALKTHROUGH_SEEN_KEY = 'wizard-walkthrough-seen';

interface WalkthroughConfig {
    enabled: boolean;
    showOnFirstVisit: boolean;
    steps: DriveStep[];
}

export class WalkthroughManager {
    private driverInstance: Driver | null = null;
    private config: WalkthroughConfig;

    constructor() {
        const fullConfig = helpConfig as { walkthrough: WalkthroughConfig };
        this.config = fullConfig.walkthrough;
    }

    /**
     * Initialize and potentially show the walkthrough
     */
    public init(): void {
        if (!this.config.enabled) {
            return;
        }

        // Check if this is the first visit
        const hasSeenWalkthrough = localStorage.getItem(WALKTHROUGH_SEEN_KEY);

        if (!hasSeenWalkthrough && this.config.showOnFirstVisit) {
            // Small delay to let the page render
            setTimeout(() => {
                this.start();
            }, 500);
        }
    }

    /**
     * Start the walkthrough
     */
    public start(): void {
        if (!this.config.enabled) {
            console.warn('Walkthrough is disabled in configuration');
            return;
        }

        // Create driver instance if not exists
        if (!this.driverInstance) {
            this.createDriver();
        }

        // Start the walkthrough
        this.driverInstance?.drive();

        // Mark as seen
        localStorage.setItem(WALKTHROUGH_SEEN_KEY, 'true');
    }

    /**
     * Reset the walkthrough (for testing or user request)
     */
    public reset(): void {
        localStorage.removeItem(WALKTHROUGH_SEEN_KEY);
    }

    /**
     * Create the driver.js instance with configuration
     */
    private createDriver(): void {
        const driverConfig: Config = {
            showProgress: true,
            showButtons: ['next', 'previous', 'close'],
            steps: this.config.steps,
            onDestroyed: () => {
                // Optional: Add analytics or other actions when walkthrough completes
                console.log('Walkthrough completed or dismissed');
            },
            nextBtnText: 'Next →',
            prevBtnText: '← Previous',
            doneBtnText: 'Got it!',
            progressText: 'Step {{current}} of {{total}}',
            allowClose: true,
            smoothScroll: true,
        };

        this.driverInstance = driver(driverConfig);
    }

    /**
     * Destroy the walkthrough
     */
    public destroy(): void {
        this.driverInstance?.destroy();
        this.driverInstance = null;
    }

    /**
     * Check if user has seen the walkthrough
     */
    public hasSeenWalkthrough(): boolean {
        return localStorage.getItem(WALKTHROUGH_SEEN_KEY) !== null;
    }
}
