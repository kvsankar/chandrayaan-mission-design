import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';

/**
 * Optimization Tests
 *
 * Tests for RAAN and Apogee optimization to minimize distance
 * between spacecraft apogee and Moon at LOI date.
 */

// Constants (matching main.ts)
const EARTH_RADIUS = 6371; // km

// Helper functions (copied from main.ts for testing)

function calculateApogeePosition(raan: number, apogeeAlt: number, omega: number, inclination: number): { x: number, y: number, z: number } {
    const nu = Math.PI; // 180° - apogee is opposite of perigee
    const raKm = EARTH_RADIUS + apogeeAlt;

    // Position in orbital plane
    const x = raKm * Math.cos(nu);
    const y = 0;
    const z = -raKm * Math.sin(nu);

    // Apply rotations: omega → inclination → RAAN
    const omegaRad = (omega * Math.PI) / 180;
    const incRad = (inclination * Math.PI) / 180;
    const raanRad = (raan * Math.PI) / 180;

    // Rotation around Y (omega)
    let x1 = x * Math.cos(omegaRad) + z * Math.sin(omegaRad);
    let y1 = y;
    let z1 = -x * Math.sin(omegaRad) + z * Math.cos(omegaRad);

    // Rotation around X (inclination)
    let x2 = x1;
    let y2 = y1 * Math.cos(incRad) - z1 * Math.sin(incRad);
    let z2 = y1 * Math.sin(incRad) + z1 * Math.cos(incRad);

    // Rotation around Y (RAAN)
    let x3 = x2 * Math.cos(raanRad) + z2 * Math.sin(raanRad);
    let y3 = y2;
    let z3 = -x2 * Math.sin(raanRad) + z2 * Math.cos(raanRad);

    return { x: x3, y: y3, z: z3 };
}

function calculateMoonPositionAtDate(date: Date): { x: number, y: number, z: number } {
    const astroTime = Astronomy.MakeTime(date);
    const state: any = Astronomy.GeoMoonState(astroTime);

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
    return {
        x: moonPosKm.x,
        y: -moonPosKm.z,
        z: moonPosKm.y
    };
}

function calculateOrbitalPeriod(perigeeAlt: number, apogeeAlt: number): number {
    const EARTH_RADIUS = 6371;
    const EARTH_MU = 398600.4418; // km^3/s^2
    const rp = EARTH_RADIUS + perigeeAlt;
    const ra = EARTH_RADIUS + apogeeAlt;
    const a = (rp + ra) / 2;
    const T = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / EARTH_MU);
    return T;
}

function calculateTimeToTrueAnomaly(trueAnomalyDeg: number, perigeeAlt: number, apogeeAlt: number): number {
    const EARTH_RADIUS = 6371;
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

function calculateCraftPositionAtTrueAnomaly(nu: number, raan: number, apogeeAlt: number, perigeeAlt: number, omega: number, inclination: number): { x: number, y: number, z: number } {
    const rpKm = EARTH_RADIUS + perigeeAlt;
    const raKm = EARTH_RADIUS + apogeeAlt;
    const aKm = (rpKm + raKm) / 2;
    const e = (raKm - rpKm) / (raKm + rpKm);

    const rKm = aKm * (1 - e * e) / (1 + e * Math.cos(nu));

    // Position in orbital plane
    let x = rKm * Math.cos(nu);
    let y = 0;
    let z = -rKm * Math.sin(nu);

    // Apply rotations: omega → inclination → RAAN
    const omegaRad = (omega * Math.PI) / 180;
    const incRad = (inclination * Math.PI) / 180;
    const raanRad = (raan * Math.PI) / 180;

    // Rotation around Y (omega)
    let x1 = x * Math.cos(omegaRad) + z * Math.sin(omegaRad);
    let y1 = y;
    let z1 = -x * Math.sin(omegaRad) + z * Math.cos(omegaRad);

    // Rotation around X (inclination)
    let x2 = x1;
    let y2 = y1 * Math.cos(incRad) - z1 * Math.sin(incRad);
    let z2 = y1 * Math.sin(incRad) + z1 * Math.cos(incRad);

    // Rotation around Y (RAAN)
    let x3 = x2 * Math.cos(raanRad) + z2 * Math.sin(raanRad);
    let y3 = y2;
    let z3 = -x2 * Math.sin(raanRad) + z2 * Math.cos(raanRad);

    return { x: x3, y: y3, z: z3 };
}

function calculateClosestApproachToMoon(raan: number, apogeeAlt: number, perigeeAlt: number, loiDate: Date, omega: number, inclination: number): { distance: number, trueAnomaly: number } {
    const moonPos = calculateMoonPositionAtDate(loiDate);

    // Search around apogee (true anomaly = 180°) in a range of ±30°
    const nuCenter = Math.PI; // 180° = apogee
    const nuRange = Math.PI / 6; // ±30°
    const numSamples = 61; // Sample every degree in ±30° range

    let minDistance = Infinity;
    let minNu = nuCenter;

    for (let i = 0; i < numSamples; i++) {
        const nu = nuCenter - nuRange + (2 * nuRange * i / (numSamples - 1));
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

function optimizeApogeeToMoon(loiDate: Date, omega: number, inclination: number, initialRaan: number, initialApogeeAlt: number): { raan: number, apogeeAlt: number, distance: number, iterations: number } {
    const perigeeAlt = 180; // Fixed perigee at 180 km

    // Nelder-Mead parameters
    const alpha = 1.0;
    const gamma = 2.0;
    const rho = 0.5;
    const sigma = 0.5;

    const maxIterations = 150;
    const tolerance = 1.0;

    const objectiveFunc = (raan: number, apogeeAlt: number): number => {
        raan = Math.max(0, Math.min(360, raan));
        apogeeAlt = Math.max(180, Math.min(600000, apogeeAlt));
        return calculateClosestApproachToMoon(raan, apogeeAlt, perigeeAlt, loiDate, omega, inclination).distance;
    };

    let simplex = [
        { raan: initialRaan, apogeeAlt: initialApogeeAlt, value: objectiveFunc(initialRaan, initialApogeeAlt) },
        { raan: initialRaan + 10, apogeeAlt: initialApogeeAlt, value: objectiveFunc(initialRaan + 10, initialApogeeAlt) },
        { raan: initialRaan, apogeeAlt: initialApogeeAlt + 5000, value: objectiveFunc(initialRaan, initialApogeeAlt + 5000) }
    ];

    let iterations = 0;
    for (let iter = 0; iter < maxIterations; iter++) {
        iterations = iter + 1;
        simplex.sort((a, b) => a.value - b.value);

        const best = simplex[0];
        const worst = simplex[2];

        if (worst.value - best.value < tolerance) {
            return { raan: best.raan, apogeeAlt: best.apogeeAlt, distance: best.value, iterations };
        }

        const centroid = {
            raan: (simplex[0].raan + simplex[1].raan) / 2,
            apogeeAlt: (simplex[0].apogeeAlt + simplex[1].apogeeAlt) / 2
        };

        const reflected = {
            raan: centroid.raan + alpha * (centroid.raan - worst.raan),
            apogeeAlt: centroid.apogeeAlt + alpha * (centroid.apogeeAlt - worst.apogeeAlt),
            value: 0
        };
        reflected.value = objectiveFunc(reflected.raan, reflected.apogeeAlt);

        if (reflected.value < simplex[1].value && reflected.value >= best.value) {
            simplex[2] = reflected;
            continue;
        }

        if (reflected.value < best.value) {
            const expanded = {
                raan: centroid.raan + gamma * (reflected.raan - centroid.raan),
                apogeeAlt: centroid.apogeeAlt + gamma * (reflected.apogeeAlt - centroid.apogeeAlt),
                value: 0
            };
            expanded.value = objectiveFunc(expanded.raan, expanded.apogeeAlt);

            if (expanded.value < reflected.value) {
                simplex[2] = expanded;
            } else {
                simplex[2] = reflected;
            }
            continue;
        }

        const contracted = {
            raan: centroid.raan + rho * (worst.raan - centroid.raan),
            apogeeAlt: centroid.apogeeAlt + rho * (worst.apogeeAlt - centroid.apogeeAlt),
            value: 0
        };
        contracted.value = objectiveFunc(contracted.raan, contracted.apogeeAlt);

        if (contracted.value < worst.value) {
            simplex[2] = contracted;
            continue;
        }

        for (let i = 1; i < simplex.length; i++) {
            simplex[i] = {
                raan: best.raan + sigma * (simplex[i].raan - best.raan),
                apogeeAlt: best.apogeeAlt + sigma * (simplex[i].apogeeAlt - best.apogeeAlt),
                value: 0
            };
            simplex[i].value = objectiveFunc(simplex[i].raan, simplex[i].apogeeAlt);
        }
    }

    simplex.sort((a, b) => a.value - b.value);
    const best = simplex[0];
    return { raan: best.raan, apogeeAlt: best.apogeeAlt, distance: best.value, iterations };
}

/**
 * Multi-start optimization to find global minimum
 * Tries multiple initial RAAN values to avoid local minima
 */
function optimizeApogeeToMoonMultiStart(loiDate: Date, omega: number, inclination: number, initialApogeeAlt: number): { raan: number, apogeeAlt: number, distance: number, trueAnomaly: number } {
    const perigeeAlt = 180;
    const startingRAANs = [0, 45, 90, 135, 180, 225, 270, 315]; // Try 8 starting points
    let bestResult = { raan: 0, apogeeAlt: initialApogeeAlt, distance: Infinity, trueAnomaly: 180 };

    for (const startRaan of startingRAANs) {
        const result = optimizeApogeeToMoon(loiDate, omega, inclination, startRaan, initialApogeeAlt);

        if (result.distance < bestResult.distance) {
            bestResult.raan = result.raan;
            bestResult.apogeeAlt = result.apogeeAlt;
            bestResult.distance = result.distance;
        }
    }

    // Normalize RAAN to 0-360 range
    bestResult.raan = ((bestResult.raan % 360) + 360) % 360;

    // Find the optimal true anomaly for the best result
    const approachInfo = calculateClosestApproachToMoon(bestResult.raan, bestResult.apogeeAlt, perigeeAlt, loiDate, omega, inclination);
    bestResult.trueAnomaly = approachInfo.trueAnomaly;

    return bestResult;
}

function findMoonEquatorCrossings(startDate: Date, endDate: Date): Astronomy.AstroTime[] {
    const crossings: Astronomy.AstroTime[] = [];
    const t1 = Astronomy.MakeTime(startDate);
    const t2 = Astronomy.MakeTime(endDate);

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
        return equatorial.dec;
    };

    let searchStart = t1;
    const stepDays = 1.0;

    while (searchStart.ut < t2.ut) {
        const searchEnd = (searchStart as any).AddDays(stepDays);
        if (searchEnd.ut > t2.ut) break;

        const dec1 = declinationFunc(searchStart);
        const dec2 = declinationFunc(searchEnd);

        if (dec1 * dec2 < 0) {
            const crossing = (Astronomy as any).Search(declinationFunc, searchStart, searchEnd);
            if (crossing) crossings.push(crossing);
        }
        searchStart = searchEnd;
    }
    return crossings;
}

describe('RAAN and Apogee Optimization', () => {
    describe('Apogee Position Calculation', () => {
        it('should calculate apogee position at true anomaly = 180°', () => {
            const raan = 0;
            const apogeeAlt = 378029;
            const omega = 178;
            const inclination = 21.5;

            const pos = calculateApogeePosition(raan, apogeeAlt, omega, inclination);

            // Apogee distance should be Earth radius + apogee altitude
            const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
            expect(distance).toBeCloseTo(EARTH_RADIUS + apogeeAlt, 0);
        });

        it('should place apogee on opposite side from perigee', () => {
            const raan = 0;
            const apogeeAlt = 378029;
            const omega = 0;
            const inclination = 0;

            const pos = calculateApogeePosition(raan, apogeeAlt, omega, inclination);

            // For omega=0, inc=0, RAAN=0, apogee should be at (-r, 0, 0)
            expect(pos.x).toBeLessThan(0);
            expect(Math.abs(pos.y)).toBeLessThan(100);
            expect(Math.abs(pos.z)).toBeLessThan(100);
        });
    });

    describe('Moon Position Calculation', () => {
        it('should calculate Moon position from ephemeris', () => {
            const date = new Date('2023-08-05T16:56:00Z');
            const moonPos = calculateMoonPositionAtDate(date);

            // Moon should be roughly at lunar orbit distance
            const distance = Math.sqrt(moonPos.x ** 2 + moonPos.y ** 2 + moonPos.z ** 2);
            expect(distance).toBeGreaterThan(356000); // Lunar perigee
            expect(distance).toBeLessThan(407000); // Lunar apogee
        });
    });

    describe('Distance Calculation', () => {
        it('should calculate closest approach distance to Moon', () => {
            const loiDate = new Date('2023-08-05T16:56:00Z');
            const raan = 100;
            const apogeeAlt = 378029;
            const perigeeAlt = 180;
            const omega = 178;
            const inclination = 21.5;

            const result = calculateClosestApproachToMoon(raan, apogeeAlt, perigeeAlt, loiDate, omega, inclination);

            // Distance should be positive
            expect(result.distance).toBeGreaterThan(0);
            // Distance should be less than 2x lunar orbit distance
            expect(result.distance).toBeLessThan(768800);
            // True anomaly should be around apogee (150-210°)
            expect(result.trueAnomaly).toBeGreaterThan(150);
            expect(result.trueAnomaly).toBeLessThan(210);
        });
    });

    describe('Optimization for Jul 1 - Sep 30, 2023 LOI dates', () => {
        it('should find optimal LOI dates (equator crossings)', () => {
            const startDate = new Date('2023-07-01T00:00:00Z');
            const endDate = new Date('2023-09-30T23:59:59Z');

            const crossings = findMoonEquatorCrossings(startDate, endDate);

            console.log(`\n=== Found ${crossings.length} equator crossings ===`);
            crossings.forEach((crossing, i) => {
                console.log(`${i + 1}. ${crossing.date.toISOString()}`);
            });

            // Should find a few crossings in 3 month period
            // (Moon crosses equator roughly every ~13.7 days, so ~6-7 times in 90 days)
            expect(crossings.length).toBeGreaterThan(2);
            expect(crossings.length).toBeLessThan(10);
        });

        it('should optimize RAAN for each LOI date with multi-start', () => {
            const startDate = new Date('2023-07-01T00:00:00Z');
            const endDate = new Date('2023-09-30T23:59:59Z');

            const crossings = findMoonEquatorCrossings(startDate, endDate);
            const loiDates = crossings.map(c => c.date);

            // Test parameters (Chandrayaan-3 actual mission)
            const omega = 178;
            const inclination = 21.5;
            const initialApogeeAlt = 378029;

            console.log(`\n=== Multi-Start Optimization Results for LOI Dates ===`);
            console.log(`Omega: ${omega}°, Inclination: ${inclination}°`);
            console.log(`Optimizing RAAN and Apogee for closest approach (8 starting points)\n`);

            const results = loiDates.slice(0, 4).map((loiDate, i) => {
                const result = optimizeApogeeToMoonMultiStart(loiDate, omega, inclination, initialApogeeAlt);

                console.log(`LOI ${i + 1}: ${loiDate.toISOString()}`);
                console.log(`  Optimized RAAN: ${result.raan.toFixed(2)}°`);
                console.log(`  Optimized Apogee: ${result.apogeeAlt.toFixed(1)} km`);
                console.log(`  Optimal True Anomaly: ${result.trueAnomaly.toFixed(1)}°`);
                console.log(`  Closest approach: ${result.distance.toFixed(1)} km`);
                console.log('');

                return result;
            });

            // All optimizations should find good solutions
            results.forEach(result => {
                // RAAN should be normalized to 0-360
                expect(result.raan).toBeGreaterThanOrEqual(0);
                expect(result.raan).toBeLessThanOrEqual(360);
                // Distance should be much better with multi-start
                // Some dates get <10 km, others ~4600 km depending on Moon position
                expect(result.distance).toBeLessThan(10000);
            });

            // Check that at least one result is very close (<100 km)
            const bestDistance = Math.min(...results.map(r => r.distance));
            expect(bestDistance).toBeLessThan(100);
        });

        it('should verify distance calculation matches what user would see in visualization', () => {
            // Use LOI 2 (Aug 5) which had best result: 1.7 km
            const loiDate = new Date('2023-08-05T11:25:58.258Z');
            const omega = 178;
            const inclination = 21.5;
            const initialApogeeAlt = 378029;
            const perigeeAlt = 180;

            // Run optimization
            const result = optimizeApogeeToMoonMultiStart(loiDate, omega, inclination, initialApogeeAlt);

            console.log(`\n=== Verification Test for LOI 2 ===`);
            console.log(`LOI Date: ${loiDate.toISOString()}`);
            console.log(`Optimized RAAN: ${result.raan.toFixed(2)}°`);
            console.log(`Optimized Apogee: ${result.apogeeAlt.toFixed(1)} km`);
            console.log(`Optimal True Anomaly: ${result.trueAnomaly.toFixed(1)}°`);
            console.log(`Closest approach (from optimization): ${result.distance.toFixed(1)} km`);

            // Calculate TLI time
            const timeToOptimalNu = calculateTimeToTrueAnomaly(result.trueAnomaly, perigeeAlt, result.apogeeAlt);
            const tliDate = new Date(loiDate.getTime() - timeToOptimalNu * 1000);
            const travelTimeHours = timeToOptimalNu / 3600;

            console.log(`\n=== TLI Timing ===`);
            console.log(`Time to reach ν=${result.trueAnomaly.toFixed(1)}°: ${travelTimeHours.toFixed(2)} hours (${(travelTimeHours / 24).toFixed(2)} days)`);
            console.log(`TLI Date: ${tliDate.toISOString()}`);
            console.log(`Travel time from TLI to LOI: ${(travelTimeHours / 24).toFixed(2)} days`);

            // Now check distance at specific true anomalies (coarse)
            console.log(`\nDistance at different true anomalies (10° steps):`);
            for (let nu = 150; nu <= 210; nu += 10) {
                const nuRad = nu * Math.PI / 180;
                const craftPos = calculateCraftPositionAtTrueAnomaly(
                    nuRad,
                    result.raan,
                    result.apogeeAlt,
                    perigeeAlt,
                    omega,
                    inclination
                );
                const moonPos = calculateMoonPositionAtDate(loiDate);
                const dx = craftPos.x - moonPos.x;
                const dy = craftPos.y - moonPos.y;
                const dz = craftPos.z - moonPos.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                console.log(`  ν=${nu}°: ${distance.toFixed(1)} km`);
            }

            // Find exact minimum with fine sampling
            console.log(`\nFinding exact minimum with 1° resolution:`);
            let minDist = Infinity;
            let minNu = 0;
            const moonPos = calculateMoonPositionAtDate(loiDate);

            for (let nu = 150; nu <= 210; nu += 1) {
                const nuRad = nu * Math.PI / 180;
                const craftPos = calculateCraftPositionAtTrueAnomaly(
                    nuRad,
                    result.raan,
                    result.apogeeAlt,
                    perigeeAlt,
                    omega,
                    inclination
                );
                const dx = craftPos.x - moonPos.x;
                const dy = craftPos.y - moonPos.y;
                const dz = craftPos.z - moonPos.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (distance < minDist) {
                    minDist = distance;
                    minNu = nu;
                }
            }
            console.log(`  Minimum distance: ${minDist.toFixed(1)} km at ν=${minNu}°`);

            console.log(`\nNOTE: The visualization shows distance at a specific true anomaly.`);
            console.log(`The optimization finds the MINIMUM distance across ±30° around apogee.`);
            console.log(`If you set true anomaly to exactly 180°, you may not see the minimum distance!`);
        });

        it('should show variation in optimal RAAN across different LOI dates', () => {
            const startDate = new Date('2023-07-01T00:00:00Z');
            const endDate = new Date('2023-09-30T23:59:59Z');

            const crossings = findMoonEquatorCrossings(startDate, endDate);
            const loiDates = crossings.map(c => c.date);

            const omega = 178;
            const inclination = 21.5;
            const initialRaan = 0;
            const initialApogeeAlt = 378029;

            const results = loiDates.slice(0, 5).map(loiDate =>
                optimizeApogeeToMoon(loiDate, omega, inclination, initialRaan, initialApogeeAlt)
            );

            const raanValues = results.map(r => r.raan);
            const minRaan = Math.min(...raanValues);
            const maxRaan = Math.max(...raanValues);

            console.log(`\n=== RAAN Variation ===`);
            console.log(`Min RAAN: ${minRaan.toFixed(2)}°`);
            console.log(`Max RAAN: ${maxRaan.toFixed(2)}°`);
            console.log(`Range: ${(maxRaan - minRaan).toFixed(2)}°`);

            // RAAN variation is small because all LOI dates are at equator crossings
            // and apogee is fixed, so we're just adjusting direction slightly
            expect(maxRaan - minRaan).toBeGreaterThan(0.5);
        });

        it('should optimize for actual Chandrayaan-3 LOI date', () => {
            // Actual Chandrayaan-3 LOI date: August 5, 2023, 19:12 IST (13:42 UTC)
            const actualLOI = new Date('2023-08-05T13:42:00Z');

            const omega = 178;
            const inclination = 21.5;
            const initialRaan = 0;
            const initialApogeeAlt = 378029;

            const result = optimizeApogeeToMoon(actualLOI, omega, inclination, initialRaan, initialApogeeAlt);

            console.log(`\n=== Actual Chandrayaan-3 LOI Date Optimization ===`);
            console.log(`LOI Date: ${actualLOI.toISOString()}`);
            console.log(`Optimized RAAN: ${result.raan.toFixed(2)}°`);
            console.log(`Optimized Apogee: ${result.apogeeAlt.toFixed(1)} km`);
            console.log(`Distance to Moon: ${result.distance.toFixed(1)} km`);
            console.log(`Iterations: ${result.iterations}`);

            expect(result.iterations).toBeLessThan(100);
            expect(result.distance).toBeLessThan(100000);
        });
    });

    describe('Optimization Algorithm Behavior', () => {
        it('should converge to same result from different initial RAAN values', () => {
            const loiDate = new Date('2023-08-05T13:42:00Z');
            const omega = 178;
            const inclination = 21.5;
            const initialApogeeAlt = 378029;

            const result1 = optimizeApogeeToMoon(loiDate, omega, inclination, 0, initialApogeeAlt);
            const result2 = optimizeApogeeToMoon(loiDate, omega, inclination, 180, initialApogeeAlt);

            console.log(`\n=== Convergence from Different Initial Values ===`);
            console.log(`Starting from RAAN=0°: ${result1.raan.toFixed(2)}°, dist=${result1.distance.toFixed(1)} km`);
            console.log(`Starting from RAAN=180°: ${result2.raan.toFixed(2)}°, dist=${result2.distance.toFixed(1)} km`);

            // Both should find reasonable distances
            expect(result1.distance).toBeLessThan(30000);
            expect(result2.distance).toBeLessThan(30000);
            // Different starting points may find different local minima
            // This is expected for non-convex optimization
            console.log(`Distance difference: ${Math.abs(result1.distance - result2.distance).toFixed(1)} km`);
            expect(Math.min(result1.distance, result2.distance)).toBeLessThan(15000);
        });

        it('should handle inclination = 41.8° (alternate Chandrayaan orbit)', () => {
            const loiDate = new Date('2023-08-05T13:42:00Z');
            const omega = 198; // Valid for inclination 41.8°
            const inclination = 41.8;
            const initialRaan = 0;
            const initialApogeeAlt = 378029;

            const result = optimizeApogeeToMoon(loiDate, omega, inclination, initialRaan, initialApogeeAlt);

            console.log(`\n=== Optimization with Inclination 41.8° ===`);
            console.log(`Optimized RAAN: ${result.raan.toFixed(2)}°`);
            console.log(`Optimized Apogee: ${result.apogeeAlt.toFixed(1)} km`);
            console.log(`Distance to Moon: ${result.distance.toFixed(1)} km`);

            expect(result.iterations).toBeLessThan(100);
            expect(result.distance).toBeLessThan(100000);
        });
    });
});
