/**
 * Launch Event Setters - Explicit update functions with event emission
 *
 * These functions replace the reactive system with explicit, testable setters.
 * Each setter updates the launchEvent and emits corresponding events.
 */

import { events } from './events.js';
import type { LaunchEvent } from './types.js';

/**
 * Set launch event RAAN
 */
export function setLaunchEventRaan(launchEvent: LaunchEvent, value: number): void {
    launchEvent.raan = value;
    events.emit('launchEvent:raan', { raan: value });
}

/**
 * Set launch event apogee altitude
 * Validates that apogee is greater than perigee
 */
export function setLaunchEventApogeeAlt(launchEvent: LaunchEvent, value: number): boolean {
    // Validate: apogee must be >= perigee
    if (value < launchEvent.perigeeAlt) {
        console.warn(`Apogee (${value} km) must be >= Perigee (${launchEvent.perigeeAlt} km). Value not updated.`);
        return false;
    }

    launchEvent.apogeeAlt = value;
    events.emit('launchEvent:apogeeAlt', { apogeeAlt: value });
    return true;
}

/**
 * Set launch event perigee altitude
 * Validates that perigee is less than or equal to apogee
 */
export function setLaunchEventPerigeeAlt(launchEvent: LaunchEvent, value: number): boolean {
    // Validate: perigee must be <= apogee
    if (value > launchEvent.apogeeAlt) {
        console.warn(`Perigee (${value} km) must be <= Apogee (${launchEvent.apogeeAlt} km). Value not updated.`);
        return false;
    }

    launchEvent.perigeeAlt = value;
    events.emit('launchEvent:perigeeAlt', { perigeeAlt: value });
    return true;
}

/**
 * Set launch event inclination
 */
export function setLaunchEventInclination(launchEvent: LaunchEvent, value: number): void {
    launchEvent.inclination = value;
    events.emit('launchEvent:inclination', { inclination: value });
}

/**
 * Set launch event omega (argument of periapsis)
 */
export function setLaunchEventOmega(launchEvent: LaunchEvent, value: number): void {
    launchEvent.omega = value;
    events.emit('launchEvent:omega', { omega: value });
}

/**
 * Set launch event true anomaly
 */
export function setLaunchEventTrueAnomaly(launchEvent: LaunchEvent, value: number): void {
    launchEvent.trueAnomaly = value;
    events.emit('launchEvent:trueAnomaly', { trueAnomaly: value });
}

/**
 * Set TLI date
 */
export function setLaunchEventDate(launchEvent: LaunchEvent, value: Date | null): void {
    launchEvent.date = value;
    events.emit('launchEvent:date', { date: value as Date });
}

/**
 * Set LOI (Moon intercept) date
 */
export function setLaunchEventMoonInterceptDate(launchEvent: LaunchEvent, value: Date | null): void {
    launchEvent.moonInterceptDate = value;
    events.emit('launchEvent:moonInterceptDate', { moonInterceptDate: value as Date });
}

/**
 * Set sync TLI with LOI flag
 */
export function setLaunchEventSyncTLIWithLOI(launchEvent: LaunchEvent, value: boolean): void {
    launchEvent.syncTLIWithLOI = value;
    events.emit('launchEvent:syncTLIWithLOI', { syncTLIWithLOI: value });
}

/**
 * Set optimized values atomically (for optimization results)
 */
export function setLaunchEventOptimizedValues(
    launchEvent: LaunchEvent,
    values: { raan: number; apogeeAlt: number }
): void {
    launchEvent.raan = values.raan;
    launchEvent.apogeeAlt = values.apogeeAlt;
    events.emit('launchEvent:optimized', values);
}

/**
 * Notify that launch event was created
 */
export function notifyLaunchEventCreated(): void {
    events.emit('launchEvent:created', {});
}

/**
 * Notify that launch event was deleted
 */
export function notifyLaunchEventDeleted(): void {
    events.emit('launchEvent:deleted', {});
}
