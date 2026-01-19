/**
 * Orbit Visualization - Functional Core
 *
 * Pure functions for orbital calculations. No side effects, no DOM, no Three.js.
 * These functions are the "functional core" of the component.
 */

import { EARTH_RADIUS, EARTH_MU } from '../../../constants.js';

// ============================================================================
// Types
// ============================================================================

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

export interface OrbitalParams {
    inclination: number;  // degrees
    raan: number;         // degrees
    omega: number;        // degrees (argument of periapsis)
    perigeeAlt: number;   // km
    apogeeAlt: number;    // km
}

export interface TimeAdvanceResult {
    daysElapsed: number;
    reachedEnd: boolean;
}

export interface SpacecraftState {
    position: Position3D;      // km in Three.js coords
    trueAnomaly: number;       // degrees
    isLaunched: boolean;       // post-TLI?
    distanceFromEarth: number; // km
}

// ============================================================================
// Time Advancement (Pure)
// ============================================================================

/**
 * Advance time by deltaTime at given speed, clamped to maxDays
 */
export function advanceTime(
    currentDays: number,
    deltaTimeMs: number,
    speed: number,  // days per second
    maxDays: number
): TimeAdvanceResult {
    const deltaSeconds = deltaTimeMs / 1000;
    const daysIncrement = speed * deltaSeconds;
    const newDays = currentDays + daysIncrement;

    if (newDays >= maxDays) {
        return { daysElapsed: maxDays, reachedEnd: true };
    }

    return { daysElapsed: newDays, reachedEnd: false };
}

/**
 * Calculate date from start date and days elapsed
 */
export function calculateDateFromDays(startDate: Date, daysElapsed: number): Date {
    return new Date(startDate.getTime() + daysElapsed * 24 * 60 * 60 * 1000);
}

/**
 * Calculate days elapsed between two dates
 */
export function calculateDaysElapsed(startDate: Date, currentDate: Date): number {
    return (currentDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
}

// ============================================================================
// Orbital Mechanics (Pure)
// ============================================================================

/**
 * Calculate orbital period using Kepler's third law
 * T = 2π * sqrt(a³/μ)
 */
export function calculateOrbitalPeriod(perigeeAlt: number, apogeeAlt: number): number {
    const rp = EARTH_RADIUS + perigeeAlt;
    const ra = EARTH_RADIUS + apogeeAlt;
    const a = (rp + ra) / 2;  // Semi-major axis
    return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / EARTH_MU);  // seconds
}

/**
 * Calculate true anomaly from time since periapsis using Kepler's equation
 * Uses Newton-Raphson iteration to solve: M = E - e*sin(E)
 */
export function getTrueAnomalyFromTime(
    timeSincePeriapsis: number,  // seconds
    perigeeAlt: number,          // km
    apogeeAlt: number            // km
): number {  // degrees [0, 360)
    const rp = EARTH_RADIUS + perigeeAlt;
    const ra = EARTH_RADIUS + apogeeAlt;
    const a = (rp + ra) / 2;
    const e = (ra - rp) / (ra + rp);

    // Mean motion (rad/s)
    const n = Math.sqrt(EARTH_MU / Math.pow(a, 3));

    // Mean anomaly
    let M = n * timeSincePeriapsis;

    // Normalize M to [0, 2π)
    M = M % (2 * Math.PI);
    if (M < 0) M += 2 * Math.PI;

    // Solve Kepler's equation using Newton-Raphson (10 iterations)
    let E = M;
    for (let i = 0; i < 10; i++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }

    // Convert eccentric anomaly to true anomaly
    const trueAnomaly = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    // Convert to degrees [0, 360)
    let trueAnomalyDeg = trueAnomaly * (180 / Math.PI);
    if (trueAnomalyDeg < 0) trueAnomalyDeg += 360;

    return trueAnomalyDeg;
}

/**
 * Calculate spacecraft position in km given true anomaly and orbital parameters
 * Returns position in Three.js coordinate system
 */
export function calculateSpacecraftPosition(
    trueAnomaly: number,   // degrees
    orbital: OrbitalParams
): Position3D {
    const rp = EARTH_RADIUS + orbital.perigeeAlt;
    const ra = EARTH_RADIUS + orbital.apogeeAlt;
    const e = (ra - rp) / (ra + rp);
    const a = (rp + ra) / 2;

    const nu = trueAnomaly * Math.PI / 180;  // radians
    const omega = orbital.omega * Math.PI / 180;
    const inc = orbital.inclination * Math.PI / 180;
    const raan = orbital.raan * Math.PI / 180;

    // Distance from Earth center (km)
    const r = a * (1 - e * e) / (1 + e * Math.cos(nu));

    // Position in orbital plane
    let x = r * Math.cos(nu);
    let y = 0;
    let z = -r * Math.sin(nu);

    // Apply argument of periapsis rotation (around Y axis, Three.js convention)
    // Matrix4.makeRotationY => x' =  c*x + s*z ; z' = -s*x + c*z
    const cosOmega = Math.cos(omega);
    const sinOmega = Math.sin(omega);
    const x1 = cosOmega * x + sinOmega * z;
    const z1 = -sinOmega * x + cosOmega * z;
    x = x1;
    z = z1;

    // Apply inclination rotation (around X axis)
    const cosInc = Math.cos(inc);
    const sinInc = Math.sin(inc);
    const y1 = cosInc * y - sinInc * z;
    const z2 = sinInc * y + cosInc * z;
    y = y1;
    z = z2;

    // Apply RAAN rotation (around Y axis, Three.js convention)
    const cosRaan = Math.cos(raan);
    const sinRaan = Math.sin(raan);
    const x2 = cosRaan * x + sinRaan * z;
    const z3 = -sinRaan * x + cosRaan * z;

    return { x: x2, y: y, z: z3 };
}

/**
 * Get complete spacecraft state for a given date
 */
export function getSpacecraftState(
    currentDate: Date,
    tliDate: Date,
    orbital: OrbitalParams
): SpacecraftState {
    const isLaunched = currentDate >= tliDate;

    if (!isLaunched) {
        // Pre-TLI: spacecraft at perigee
        const position = calculateSpacecraftPosition(0, orbital);
        const distanceFromEarth = EARTH_RADIUS + orbital.perigeeAlt;
        return { position, trueAnomaly: 0, isLaunched: false, distanceFromEarth };
    }

    // Post-TLI: calculate position from elapsed time
    const timeSinceTLI = (currentDate.getTime() - tliDate.getTime()) / 1000;  // seconds
    const trueAnomaly = getTrueAnomalyFromTime(timeSinceTLI, orbital.perigeeAlt, orbital.apogeeAlt);
    const position = calculateSpacecraftPosition(trueAnomaly, orbital);

    // Calculate distance from Earth
    const distanceFromEarth = Math.sqrt(
        position.x * position.x + position.y * position.y + position.z * position.z
    );

    return { position, trueAnomaly, isLaunched: true, distanceFromEarth };
}

// ============================================================================
// Distance Calculations (Pure)
// ============================================================================

/**
 * Calculate Euclidean distance between two 3D positions
 */
export function calculateDistance(pos1: Position3D, pos2: Position3D): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if spacecraft is within capture threshold of Moon
 */
export function checkCaptureCondition(
    craftPos: Position3D,
    moonPos: Position3D,
    threshold: number  // km
): boolean {
    return calculateDistance(craftPos, moonPos) <= threshold;
}

// ============================================================================
// Countdown Timer (Pure)
// ============================================================================

/**
 * Format countdown timer relative to TLI date
 * Returns "T-HH:MM:SS" before TLI or "T+HH:MM:SS" after
 */
export function formatCountdown(currentDate: Date, tliDate: Date): string {
    const diffMs = currentDate.getTime() - tliDate.getTime();
    const sign = diffMs < 0 ? '-' : '+';
    const absDiff = Math.abs(diffMs) / 1000;  // seconds

    const hours = Math.floor(absDiff / 3600);
    const minutes = Math.floor((absDiff % 3600) / 60);
    const seconds = Math.floor(absDiff % 60);

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `T${sign}${hh}:${mm}:${ss}`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date, timeZone: string = 'UTC'): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone,
        timeZoneName: 'short'
    }).format(date);
}

/**
 * Format days elapsed for display
 */
export function formatDaysElapsed(days: number): string {
    return `Day ${days.toFixed(1)}`;
}

// ============================================================================
// Timeline Marker Positions (Pure)
// ============================================================================

/**
 * Calculate percentage position of an event on the timeline
 */
export function calculateMarkerPosition(
    eventDate: Date,
    startDate: Date,
    totalDays: number
): number {
    const daysSinceStart = calculateDaysElapsed(startDate, eventDate);
    return (daysSinceStart / totalDays) * 100;
}
