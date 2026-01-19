// ============================================================================
// OPTIMIZATION FUNCTIONS
// ============================================================================

import * as THREE from 'three';
import * as Astronomy from 'astronomy-engine';
import { EARTH_RADIUS, EARTH_MU } from './constants.js';

function isAutomatedTestMode(): boolean {
    return typeof window !== 'undefined' && (window as any).__E2E_TESTING__ === true;
}

/**
 * Calculate orbital period given perigee and apogee altitudes
 * @param perigeeAlt - Perigee altitude in km
 * @param apogeeAlt - Apogee altitude in km
 * @returns Orbital period in seconds
 */
export function calculateOrbitalPeriod(perigeeAlt: number, apogeeAlt: number): number {
    const rp = EARTH_RADIUS + perigeeAlt;
    const ra = EARTH_RADIUS + apogeeAlt;
    const a = (rp + ra) / 2;
    const T = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / EARTH_MU);
    return T;
}

/**
 * Calculate true anomaly from time since perigee using Kepler's equation
 * Uses Newton-Raphson iteration to solve M = E - e*sin(E)
 * @param timeSincePeriapsis - Time since perigee passage in seconds
 * @param perigeeAlt - Perigee altitude in km
 * @param apogeeAlt - Apogee altitude in km
 * @returns True anomaly in degrees (0-360)
 */
export function getTrueAnomalyFromTime(timeSincePeriapsis: number, perigeeAlt: number, apogeeAlt: number): number {
    const rp = EARTH_RADIUS + perigeeAlt;
    const ra = EARTH_RADIUS + apogeeAlt;
    const a = (rp + ra) / 2;  // Semi-major axis
    const e = (ra - rp) / (ra + rp);  // Eccentricity

    // Mean motion (rad/s)
    const n = Math.sqrt(EARTH_MU / Math.pow(a, 3));

    // Mean anomaly
    const M = n * timeSincePeriapsis;

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

    let trueAnomalyDeg = trueAnomaly * (180 / Math.PI);
    if (trueAnomalyDeg < 0) trueAnomalyDeg += 360;

    return trueAnomalyDeg;
}

function findMoonEquatorCrossings(startDate: Date, endDate: Date): Astronomy.AstroTime[] {
    const crossings: Astronomy.AstroTime[] = [];
    const t1 = Astronomy.MakeTime(startDate);
    const t2 = Astronomy.MakeTime(endDate);

    // Function that returns Moon's declination
    const declinationFunc = (t: Astronomy.AstroTime): number => {
        const state: any = Astronomy.GeoMoonState(t);
        const hasPosition = state.position !== undefined;
        const geoVector = {
            x: hasPosition ? state.position.x : state.x,
            y: hasPosition ? state.position.y : state.y,
            z: hasPosition ? state.position.z : state.z,
            t: hasPosition ? state.position.t : state.t
        };
        const equatorial = Astronomy.EquatorFromVector(geoVector);
        return equatorial.dec;  // Returns declination in degrees
    };

    // Search for zero crossings in declination
    let searchStart = t1;
    const stepDays = 1.0;  // Search in 1-day increments

    while (searchStart.ut < t2.ut) {
        const searchEnd = (searchStart as any).AddDays(stepDays);
        if (searchEnd.ut > t2.ut) break;

        // Check if there's a sign change in this interval
        const dec1 = declinationFunc(searchStart);
        const dec2 = declinationFunc(searchEnd);

        // Detect BOTH ascending and descending crossings
        // This gives opportunities every ~13.7 days instead of ~27 days
        if (dec1 * dec2 < 0) {  // Sign change = equator crossing (either direction)
            const crossing = (Astronomy as any).Search(declinationFunc, searchStart, searchEnd);
            if (crossing) {
                crossings.push(crossing);
            }
        }

        searchStart = searchEnd;
    }

    return crossings;
}

/**
 * Find times when Moon crosses orbital nodes (latitude = 0 in ecliptic coords)
 * Only returns ascending crossings (south to north) for ~14 day spacing
 * @param startDate - Start of search window
 * @param endDate - End of search window
 * @returns Array of AstroTime objects when Moon crosses ascending node
 */
// @ts-expect-error - keeping for potential future use
function _findMoonNodeCrossings(startDate: Date, endDate: Date): Astronomy.AstroTime[] {
    const crossings: Astronomy.AstroTime[] = [];
    const t1 = Astronomy.MakeTime(startDate);
    const t2 = Astronomy.MakeTime(endDate);

    // Function that returns Moon's ecliptic latitude
    const latitudeFunc = (t: Astronomy.AstroTime): number => {
        const state: any = Astronomy.GeoMoonState(t);
        const hasPosition = state.position !== undefined;
        const geoVector = {
            x: hasPosition ? state.position.x : state.x,
            y: hasPosition ? state.position.y : state.y,
            z: hasPosition ? state.position.z : state.z,
            t: hasPosition ? state.position.t : state.t
        };
        const ecliptic = (Astronomy as any).Ecliptic(geoVector);
        return ecliptic.elat;  // Returns ecliptic latitude in degrees
    };

    // Search for zero crossings in ecliptic latitude
    let searchStart = t1;
    const stepDays = 1.0;  // Search in 1-day increments

    while (searchStart.ut < t2.ut) {
        const searchEnd = (searchStart as any).AddDays(stepDays);
        if (searchEnd.ut > t2.ut) break;

        // Check if there's a sign change in this interval
        const lat1 = latitudeFunc(searchStart);
        const lat2 = latitudeFunc(searchEnd);

        // Only detect ascending node crossings: lat1 < 0 and lat2 > 0 (south to north)
        if (lat1 < 0 && lat2 > 0) {  // Ascending node crossing
            const crossing = (Astronomy as any).Search(latitudeFunc, searchStart, searchEnd);
            if (crossing) {
                crossings.push(crossing);
            }
        }

        searchStart = searchEnd;
    }

    return crossings;
}

/**
 * Find optimal LOI dates (equator crossings + node crossings)
 * @param startDate - Start of search window
 * @param endDate - End of search window
 * @returns Array of Date objects sorted chronologically
 */
export function findOptimalLOIDates(startDate: Date, endDate: Date): Date[] {
    // Use ONLY equator crossings for ~27-day spacing
    // (Node crossings are for ecliptic plane, which is different from equatorial plane)
    const equatorCrossings = findMoonEquatorCrossings(startDate, endDate);

    // Convert to Date objects
    const allDates = equatorCrossings.map(t => t.date);

    // Sort chronologically
    allDates.sort((a, b) => a.getTime() - b.getTime());

    return allDates;
}

// ============================================================================
// APOGEE-MOON DISTANCE OPTIMIZATION
// ============================================================================


/**
 * Calculate Moon's position at a given date
 * Returns position in km (Three.js coordinates)
 */
export function calculateMoonPositionAtDate(date: Date): { x: number, y: number, z: number } {
    const astroTime = Astronomy.MakeTime(date);
    const state: any = Astronomy.GeoMoonState(astroTime);

    // Get position from state
    const hasPosition = state.position !== undefined;
    const geoVector = {
        x: hasPosition ? state.position.x : state.x,
        y: hasPosition ? state.position.y : state.y,
        z: hasPosition ? state.position.z : state.z,
        t: hasPosition ? state.position.t : state.t
    };

    // Convert AU to km (1 AU = 149597870.7 km)
    const moonPosKm = {
        x: geoVector.x * 149597870.7,
        y: geoVector.y * 149597870.7,
        z: geoVector.z * 149597870.7
    };

    // Convert from celestial coordinates to Three.js coordinates
    // Must match the transformation used by calculateRealMoonPosition
    return {
        x: moonPosKm.x,
        y: moonPosKm.z,
        z: -moonPosKm.y
    };
}

/**
 * Calculate time elapsed to reach a given true anomaly from periapsis
 * Uses Kepler's equation: M = E - e*sin(E), where M = mean anomaly, E = eccentric anomaly
 * Returns time in seconds
 */
export function calculateTimeToTrueAnomaly(trueAnomalyDeg: number, perigeeAlt: number, apogeeAlt: number): number {
    const rpKm = EARTH_RADIUS + perigeeAlt;
    const raKm = EARTH_RADIUS + apogeeAlt;
    const e = (raKm - rpKm) / (raKm + rpKm);

    // Convert true anomaly to radians
    let nu = trueAnomalyDeg * Math.PI / 180;

    // Normalize to 0-2π range
    while (nu < 0) nu += 2 * Math.PI;
    while (nu >= 2 * Math.PI) nu -= 2 * Math.PI;

    // Calculate eccentric anomaly from true anomaly
    // cos(E) = (e + cos(nu)) / (1 + e*cos(nu))
    const cosE = (e + Math.cos(nu)) / (1 + e * Math.cos(nu));
    let E = Math.acos(cosE);

    // E has the same quadrant as nu
    if (nu > Math.PI) {
        E = 2 * Math.PI - E;
    }

    // Calculate mean anomaly from eccentric anomaly
    // M = E - e*sin(E)
    const M = E - e * Math.sin(E);

    // Calculate orbital period
    const periodSeconds = calculateOrbitalPeriod(perigeeAlt, apogeeAlt);

    // Time elapsed = M / (2*pi) * Period
    const timeElapsed = (M / (2 * Math.PI)) * periodSeconds;

    return timeElapsed;
}

/**
 * Calculate spacecraft position at a given true anomaly
 */
export function calculateCraftPositionAtTrueAnomaly(nu: number, raan: number, apogeeAlt: number, perigeeAlt: number, omega: number, inclination: number): { x: number, y: number, z: number } {
    const rpKm = EARTH_RADIUS + perigeeAlt;
    const raKm = EARTH_RADIUS + apogeeAlt;
    const aKm = (rpKm + raKm) / 2;
    const e = (raKm - rpKm) / (raKm + rpKm);

    const rKm = aKm * (1 - e * e) / (1 + e * Math.cos(nu));

    const craftPosKm = new THREE.Vector3(
        rKm * Math.cos(nu),
        0,
        -rKm * Math.sin(nu)
    );

    const omegaRad = THREE.MathUtils.degToRad(omega);
    const incRad = THREE.MathUtils.degToRad(inclination);
    const raanRad = THREE.MathUtils.degToRad(raan);

    craftPosKm.applyAxisAngle(new THREE.Vector3(0, 1, 0), omegaRad);
    craftPosKm.applyAxisAngle(new THREE.Vector3(1, 0, 0), incRad);
    craftPosKm.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);

    return { x: craftPosKm.x, y: craftPosKm.y, z: craftPosKm.z };
}

/**
 * Calculate closest approach distance between spacecraft orbit and Moon at LOI date
 * Searches around apogee (true anomaly ~180°) for minimum distance
 * Returns both the minimum distance and the true anomaly where it occurs
 */
export function calculateClosestApproachToMoon(raan: number, apogeeAlt: number, perigeeAlt: number, loiDate: Date, omega: number, inclination: number): { distance: number, trueAnomaly: number } {
    const moonPos = calculateMoonPositionAtDate(loiDate);

    // Search full orbit for minimum distance, with local refinement
    const coarseSamples = isAutomatedTestMode() ? 181 : 361; // every 2° or 1°

    let minDistance = Infinity;
    let minNu = 0;

    for (let i = 0; i < coarseSamples; i++) {
        const nu = (i / (coarseSamples - 1)) * Math.PI * 2;
        const craftPos = calculateCraftPositionAtTrueAnomaly(nu, raan, apogeeAlt, perigeeAlt, omega, inclination);

        const dx = craftPos.x - moonPos.x;
        const dy = craftPos.y - moonPos.y;
        const dz = craftPos.z - moonPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < minDistance) {
            minDistance = distance;
            minNu = nu;
        }
    }

    // Fine sweep ±2° around coarse best at 0.1°
    const fineSpan = isAutomatedTestMode() ? Math.PI / 90 : Math.PI / 90; // 2°
    const fineStep = isAutomatedTestMode() ? Math.PI / 450 : Math.PI / 1800; // 0.4° or 0.1°
    for (let nu = minNu - fineSpan; nu <= minNu + fineSpan; nu += fineStep) {
        const craftPos = calculateCraftPositionAtTrueAnomaly(nu, raan, apogeeAlt, perigeeAlt, omega, inclination);
        const dx = craftPos.x - moonPos.x;
        const dy = craftPos.y - moonPos.y;
        const dz = craftPos.z - moonPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance < minDistance) {
            minDistance = distance;
            minNu = nu;
        }
    }

    return { distance: minDistance, trueAnomaly: minNu * 180 / Math.PI };
}

interface SimplexPoint {
    raan: number;
    apogeeAlt: number;
    value: number;
}

// Nelder-Mead constants
const NM_ALPHA = 1.0;   // Reflection
const NM_GAMMA = 2.0;   // Expansion
const NM_RHO = 0.5;     // Contraction
const NM_SIGMA = 0.5;   // Shrinkage

function tryExpansion(
    centroid: { raan: number; apogeeAlt: number },
    reflected: SimplexPoint,
    objectiveFunc: (r: number, a: number) => number
): SimplexPoint {
    const expanded = {
        raan: centroid.raan + NM_GAMMA * (reflected.raan - centroid.raan),
        apogeeAlt: centroid.apogeeAlt + NM_GAMMA * (reflected.apogeeAlt - centroid.apogeeAlt),
        value: 0
    };
    expanded.value = objectiveFunc(expanded.raan, expanded.apogeeAlt);
    return expanded.value < reflected.value ? expanded : reflected;
}

function tryContraction(
    centroid: { raan: number; apogeeAlt: number },
    worst: SimplexPoint,
    objectiveFunc: (r: number, a: number) => number
): SimplexPoint {
    const contracted = {
        raan: centroid.raan + NM_RHO * (worst.raan - centroid.raan),
        apogeeAlt: centroid.apogeeAlt + NM_RHO * (worst.apogeeAlt - centroid.apogeeAlt),
        value: 0
    };
    contracted.value = objectiveFunc(contracted.raan, contracted.apogeeAlt);
    return contracted;
}

/**
 * Optimize RAAN and Apogee to minimize closest approach distance to Moon
 * Uses Nelder-Mead simplex algorithm (derivative-free optimization)
 */
export function optimizeApogeeToMoon(loiDate: Date, omega: number, inclination: number, initialRaan: number, initialApogeeAlt: number): { raan: number, apogeeAlt: number, distance: number } {
    const perigeeAlt = 180; // Fixed perigee at 180 km
    const maxIterations = isAutomatedTestMode() ? 40 : 150;
    const tolerance = isAutomatedTestMode() ? 5.0 : 1.0;

    const objectiveFunc = (raan: number, apogeeAlt: number): number => {
        raan = Math.max(0, Math.min(360, raan));
        apogeeAlt = Math.max(180, Math.min(600000, apogeeAlt));
        return calculateClosestApproachToMoon(raan, apogeeAlt, perigeeAlt, loiDate, omega, inclination).distance;
    };

    const simplex: SimplexPoint[] = [
        { raan: initialRaan, apogeeAlt: initialApogeeAlt, value: objectiveFunc(initialRaan, initialApogeeAlt) },
        { raan: initialRaan + 10, apogeeAlt: initialApogeeAlt, value: objectiveFunc(initialRaan + 10, initialApogeeAlt) },
        { raan: initialRaan, apogeeAlt: initialApogeeAlt + 5000, value: objectiveFunc(initialRaan, initialApogeeAlt + 5000) }
    ];

    for (let iter = 0; iter < maxIterations; iter++) {
        simplex.sort((a, b) => a.value - b.value);
        const best = simplex[0];
        const worst = simplex[2];

        if (worst.value - best.value < tolerance) {
            return { raan: best.raan, apogeeAlt: best.apogeeAlt, distance: best.value };
        }

        const centroid = {
            raan: (simplex[0].raan + simplex[1].raan) / 2,
            apogeeAlt: (simplex[0].apogeeAlt + simplex[1].apogeeAlt) / 2
        };

        const reflected: SimplexPoint = {
            raan: centroid.raan + NM_ALPHA * (centroid.raan - worst.raan),
            apogeeAlt: centroid.apogeeAlt + NM_ALPHA * (centroid.apogeeAlt - worst.apogeeAlt),
            value: 0
        };
        reflected.value = objectiveFunc(reflected.raan, reflected.apogeeAlt);

        if (reflected.value < simplex[1].value && reflected.value >= best.value) {
            simplex[2] = reflected;
            continue;
        }

        if (reflected.value < best.value) {
            simplex[2] = tryExpansion(centroid, reflected, objectiveFunc);
            continue;
        }

        const contracted = tryContraction(centroid, worst, objectiveFunc);
        if (contracted.value < worst.value) {
            simplex[2] = contracted;
            continue;
        }

        // Shrinkage
        for (let i = 1; i < simplex.length; i++) {
            simplex[i] = {
                raan: best.raan + NM_SIGMA * (simplex[i].raan - best.raan),
                apogeeAlt: best.apogeeAlt + NM_SIGMA * (simplex[i].apogeeAlt - best.apogeeAlt),
                value: 0
            };
            simplex[i].value = objectiveFunc(simplex[i].raan, simplex[i].apogeeAlt);
        }
    }

    simplex.sort((a, b) => a.value - b.value);
    const best = simplex[0];
    return { raan: best.raan, apogeeAlt: best.apogeeAlt, distance: best.value };
}

/**
 * Multi-start optimization to find global minimum
 * Tries multiple initial RAAN values to avoid local minima
 */
export function optimizeApogeeToMoonMultiStart(loiDate: Date, omega: number, inclination: number, _initialApogeeAlt: number): { raan: number, apogeeAlt: number, distance: number, trueAnomaly: number } {
    const perigeeAlt = 180;

    // Calculate Moon's distance at LOI time - this is the natural starting apogee
    const moonPos = calculateMoonPositionAtDate(loiDate);
    const moonDistance = Math.sqrt(moonPos.x * moonPos.x + moonPos.y * moonPos.y + moonPos.z * moonPos.z);
    const moonApogeeAlt = moonDistance - EARTH_RADIUS; // Convert to altitude

    // Narrow RAAN window around Moon RA at LOI (±5°)
    const moonRaanGuess = ((Math.atan2(-moonPos.z, moonPos.x) * 180 / Math.PI) + 360) % 360;
    const raanStep = isAutomatedTestMode() ? 5 : 1;
    const raanWindow = 5;
    const startingRAANs: number[] = [];
    for (let d = -raanWindow; d <= raanWindow; d += raanStep) {
        startingRAANs.push(((moonRaanGuess + d) % 360 + 360) % 360);
    }

    // Apogee seeds around Moon distance (tighter band)
    const startingApogees = isAutomatedTestMode()
        ? [
            moonApogeeAlt * 0.97,
            moonApogeeAlt,
            moonApogeeAlt * 1.03
        ]
        : [
            moonApogeeAlt * 0.90,  // -10%
            moonApogeeAlt * 0.95,  // -5%
            moonApogeeAlt,         // 0%
            moonApogeeAlt * 1.05,  // +5%
            moonApogeeAlt * 1.10   // +10%
        ];

    const bestResult = { raan: 0, apogeeAlt: moonApogeeAlt, distance: Infinity, trueAnomaly: 180 };

    for (const startRaan of startingRAANs) {
        for (const startApogee of startingApogees) {
            const result = optimizeApogeeToMoon(loiDate, omega, inclination, startRaan, startApogee);

            if (result.distance < bestResult.distance) {
                bestResult.raan = result.raan;
                bestResult.apogeeAlt = result.apogeeAlt;
                bestResult.distance = result.distance;
            }
        }
    }

    // Normalize RAAN to 0-360 range
    bestResult.raan = ((bestResult.raan % 360) + 360) % 360;

    // Find the optimal true anomaly for the best result
    const approachInfo = calculateClosestApproachToMoon(bestResult.raan, bestResult.apogeeAlt, perigeeAlt, loiDate, omega, inclination);
    bestResult.trueAnomaly = approachInfo.trueAnomaly;

    return bestResult;
}
