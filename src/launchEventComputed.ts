/**
 * Launch Event Computed Values - Pure functions replacing computed()
 *
 * These pure functions replace the reactive computed() calls with simple,
 * testable functions that can be called when needed.
 *
 * Note: This module provides helper functions for computing derived values
 * from LaunchEvent. The actual calculateOrbitalPeriod and formatPeriod
 * implementations are in main.ts and should be imported when refactoring.
 */

import type { LaunchEvent } from './types.js';

/**
 * Compute TLI date from LOI date (if sync enabled)
 * Returns null if sync is disabled or no LOI date
 *
 * @param launchEvent - The launch event
 * @param calculateOrbitalPeriod - Function to calculate orbital period
 */
export function computeTLIDate(
    launchEvent: LaunchEvent,
    calculateOrbitalPeriod: (perigeeAlt: number, apogeeAlt: number) => number
): Date | null {
    if (!launchEvent.syncTLIWithLOI || !launchEvent.moonInterceptDate) {
        return launchEvent.date;
    }

    const periodSeconds = calculateOrbitalPeriod(
        launchEvent.perigeeAlt,
        launchEvent.apogeeAlt
    );
    const halfPeriodMs = (periodSeconds / 2) * 1000;
    return new Date(launchEvent.moonInterceptDate.getTime() - halfPeriodMs);
}

/**
 * Compute orbital period for display
 * Returns '--' if launch event doesn't exist
 *
 * @param launchEvent - The launch event
 * @param calculateOrbitalPeriod - Function to calculate orbital period
 * @param formatPeriod - Function to format period for display
 */
export function computePeriodDisplay(
    launchEvent: LaunchEvent,
    calculateOrbitalPeriod: (perigeeAlt: number, apogeeAlt: number) => number,
    formatPeriod: (seconds: number) => string
): string {
    if (!launchEvent.exists) return '--';
    return formatPeriod(
        calculateOrbitalPeriod(launchEvent.perigeeAlt, launchEvent.apogeeAlt)
    );
}
