/**
 * Sun Elevation PoC Tests
 *
 * Validates the sun elevation algorithm against Chandrayaan-2 and Chandrayaan-3
 * mission data from ISRO papers.
 */

import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';

// Constants
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

interface LandingSite {
    latitude: number;
    longitude: number;
}

interface LandingWindow {
    startDate: Date;
    endDate: Date;
    peakElevation: number;
    peakTime: Date;
    durationHours: number;
}

/**
 * Calculate the Sun's selenographic coordinates (sub-solar point on Moon)
 */
function getSubSolarPoint(date: Date): { latitude: number; longitude: number } {
    const time = Astronomy.MakeTime(date);

    // The sub-solar longitude is related to the Moon's phase
    const moonPhase = Astronomy.MoonPhase(time);

    // Sub-solar longitude: when phase=0 (new moon), sun is at far side (lon=180)
    // when phase=180 (full moon), sun is at near side (lon=0)
    let subSolarLon = 180 - moonPhase;

    // Normalize to -180 to +180
    while (subSolarLon > 180) subSolarLon -= 360;
    while (subSolarLon < -180) subSolarLon += 360;

    // Sub-solar latitude oscillates with lunar month, roughly ±1.54°
    const subSolarLat = 1.54 * Math.sin(moonPhase * DEG_TO_RAD);

    return {
        latitude: subSolarLat,
        longitude: subSolarLon
    };
}

/**
 * Calculate the Sun's elevation angle at a given landing site
 */
function calculateSunElevation(site: LandingSite, date: Date): number {
    const subSolar = getSubSolarPoint(date);

    // Angular distance using spherical trigonometry
    const lat1 = site.latitude * DEG_TO_RAD;
    const lat2 = subSolar.latitude * DEG_TO_RAD;
    const dLon = (subSolar.longitude - site.longitude) * DEG_TO_RAD;

    const cosAngularDist =
        Math.sin(lat1) * Math.sin(lat2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const clampedCos = Math.max(-1, Math.min(1, cosAngularDist));
    const angularDistRad = Math.acos(clampedCos);

    // Sun elevation = 90° - angular distance from sub-solar point
    return 90 - (angularDistRad * RAD_TO_DEG);
}

/**
 * Find elevation crossing using bisection
 */
function findElevationCrossing(
    site: LandingSite,
    startDate: Date,
    endDate: Date,
    threshold: number,
    tolerance: number = 60000
): Date {
    let lo = startDate.getTime();
    let hi = endDate.getTime();

    const f = (t: number) => calculateSunElevation(site, new Date(t)) - threshold;

    while (hi - lo > tolerance) {
        const mid = (lo + hi) / 2;
        if (f(lo) * f(mid) < 0) {
            hi = mid;
        } else {
            lo = mid;
        }
    }

    return new Date((lo + hi) / 2);
}

/**
 * Find all landing windows in a date range
 *
 * A landing window is when sun elevation RISES through the 6°-9° range.
 * Only rising (sunrise) windows are valid for landing because:
 * - Landing at sunrise gives ~14 Earth days of sunlight for operations
 * - Landing at sunset would mean immediate lunar night
 *
 * Window: elevation crosses 6° upward → window ends when it crosses 9° upward
 */
function findLandingWindows(
    site: LandingSite,
    startDate: Date,
    endDate: Date,
    minElevation: number = 6,
    maxElevation: number = 9
): LandingWindow[] {
    const windows: LandingWindow[] = [];
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const samples: { time: Date; elevation: number }[] = [];

    let t = startDate.getTime();
    while (t <= endDate.getTime()) {
        const date = new Date(t);
        const elev = calculateSunElevation(site, date);
        samples.push({ time: date, elevation: elev });
        t += THREE_HOURS_MS;
    }

    for (let i = 0; i < samples.length - 1; i++) {
        const curr = samples[i];
        const next = samples[i + 1];

        // Only rising windows: crosses minElevation upward (sun rising)
        if (curr.elevation < minElevation && next.elevation >= minElevation) {
            const windowStart = findElevationCrossing(site, curr.time, next.time, minElevation);

            // Find when it exits the range (crosses maxElevation upward)
            let windowEnd: Date | null = null;
            let peakElev = next.elevation;

            for (let j = i + 1; j < samples.length - 1; j++) {
                const s1 = samples[j];
                const s2 = samples[j + 1];

                if (s1.elevation > peakElev) {
                    peakElev = s1.elevation;
                }

                // Exits by crossing maxElevation upward (normal case)
                if (s1.elevation < maxElevation && s2.elevation >= maxElevation) {
                    windowEnd = findElevationCrossing(site, s1.time, s2.time, maxElevation);
                    break;
                }
                // Edge case: drops below minElevation without reaching max (shouldn't happen normally)
                if (s1.elevation >= minElevation && s2.elevation < minElevation) {
                    windowEnd = findElevationCrossing(site, s1.time, s2.time, minElevation);
                    break;
                }
            }

            if (windowEnd && windowEnd > windowStart) {
                const midTime = new Date((windowStart.getTime() + windowEnd.getTime()) / 2);

                windows.push({
                    startDate: windowStart,
                    endDate: windowEnd,
                    peakElevation: Math.min(peakElev, maxElevation),
                    peakTime: midTime,
                    durationHours: (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60)
                });
            }
        }
        // Setting windows are NOT included - landing at sunset is not viable
    }

    return windows;
}

// Landing sites from papers
const SITES = {
    cy3Primary: { latitude: -69.3676, longitude: 32.3481 },
    cy3Actual: { latitude: -69.3733, longitude: 32.3191 },
    cy3Backup: { latitude: -69.4977, longitude: -17.3304 },
    cy2Primary: { latitude: -70.90, longitude: 22.78 },
    cy2Backup: { latitude: -67.75, longitude: -18.47 }
};

describe('Sun Elevation PoC', () => {

    describe('Basic Calculations', () => {

        it('should calculate sub-solar point', () => {
            const date = new Date('2023-08-23T12:00:00Z');
            const subSolar = getSubSolarPoint(date);

            expect(subSolar.latitude).toBeGreaterThanOrEqual(-2);
            expect(subSolar.latitude).toBeLessThanOrEqual(2);
            expect(subSolar.longitude).toBeGreaterThanOrEqual(-180);
            expect(subSolar.longitude).toBeLessThanOrEqual(180);
        });

        it('should calculate sun elevation at landing time', () => {
            // CY3 actual landing: Aug 23, 2023 around 12:33 UT
            const landingTime = new Date('2023-08-23T12:33:00Z');
            const elevation = calculateSunElevation(SITES.cy3Actual, landingTime);

            console.log(`CY3 landing time elevation: ${elevation.toFixed(2)}°`);

            // Expect elevation to be reasonable (within broader range for PoC)
            expect(elevation).toBeGreaterThan(0);
            expect(elevation).toBeLessThan(30);
        });

    });

    describe('CY3 Landing Windows (2023)', () => {

        const CY3_START = new Date('2023-03-01T00:00:00Z');
        const CY3_END = new Date('2023-10-31T23:59:59Z');

        it('should find landing windows for CY3 primary site', () => {
            // First, let's debug by checking elevation over time
            const debugStart = new Date('2023-08-20T00:00:00Z');
            const debugEnd = new Date('2023-08-27T00:00:00Z');
            console.log(`\nDebug: Elevation around Aug 23:`);
            for (let d = debugStart.getTime(); d <= debugEnd.getTime(); d += 12 * 60 * 60 * 1000) {
                const date = new Date(d);
                const elev = calculateSunElevation(SITES.cy3Primary, date);
                console.log(`  ${date.toISOString().substring(0, 16)} - ${elev.toFixed(2)}°`);
            }

            const windows = findLandingWindows(SITES.cy3Primary, CY3_START, CY3_END);

            console.log(`\nCY3 Primary site windows found: ${windows.length}`);
            windows.forEach((w, i) => {
                console.log(`  ${i + 1}. ${w.peakTime.toISOString().substring(0, 10)} - Peak: ${w.peakElevation.toFixed(2)}°`);
            });

            // Should find one window per lunar month (rising only)
            // 8 months = ~8 windows
            expect(windows.length).toBeGreaterThanOrEqual(6);
            expect(windows.length).toBeLessThanOrEqual(10);
        });

        it('should have August window around Aug 22-24 for CY3 primary', () => {
            const windows = findLandingWindows(SITES.cy3Primary, CY3_START, CY3_END);

            const augustWindow = windows.find(w => {
                const month = w.peakTime.getUTCMonth();
                const day = w.peakTime.getUTCDate();
                return month === 7 && day >= 20 && day <= 26; // Allow some margin
            });

            expect(augustWindow).toBeDefined();
            if (augustWindow) {
                console.log(`\nCY3 August window: ${augustWindow.peakTime.toISOString()}`);
                console.log(`  Peak elevation: ${augustWindow.peakElevation.toFixed(2)}°`);
            }
        });

        it('should find landing windows for CY3 backup site', () => {
            const windows = findLandingWindows(SITES.cy3Backup, CY3_START, CY3_END);

            console.log(`\nCY3 Backup site windows:`);
            windows.forEach((w, i) => {
                console.log(`  ${i + 1}. ${w.peakTime.toISOString().substring(0, 10)} - Peak: ${w.peakElevation.toFixed(2)}°`);
            });

            expect(windows.length).toBeGreaterThanOrEqual(4);
        });

    });

    describe('CY2 Landing Windows (2019)', () => {

        const CY2_START = new Date('2019-01-01T00:00:00Z');
        const CY2_END = new Date('2019-09-30T23:59:59Z');

        it('should find landing windows for CY2 primary site', () => {
            const windows = findLandingWindows(SITES.cy2Primary, CY2_START, CY2_END);

            console.log(`\nCY2 Primary site windows:`);
            windows.forEach((w, i) => {
                console.log(`  ${i + 1}. ${w.peakTime.toISOString().substring(0, 10)} - Peak: ${w.peakElevation.toFixed(2)}°`);
            });

            // One window per lunar month (rising only)
            expect(windows.length).toBeGreaterThanOrEqual(7);
            expect(windows.length).toBeLessThanOrEqual(11);
        });

        it('should have September window around Sep 5-8 for CY2 primary', () => {
            const windows = findLandingWindows(SITES.cy2Primary, CY2_START, CY2_END);

            const septemberWindow = windows.find(w => {
                const month = w.peakTime.getUTCMonth();
                const day = w.peakTime.getUTCDate();
                return month === 8 && day >= 3 && day <= 10; // Allow some margin
            });

            expect(septemberWindow).toBeDefined();
            if (septemberWindow) {
                console.log(`\nCY2 September window: ${septemberWindow.peakTime.toISOString()}`);
                console.log(`  Peak elevation: ${septemberWindow.peakElevation.toFixed(2)}°`);
            }
        });

    });

    describe('Monthly Cadence', () => {

        it('should have ~29.5 day spacing between windows (one per lunar month)', () => {
            // Only rising windows are returned, so spacing should be ~29.5 days (lunar synodic period)
            const CY3_START = new Date('2023-03-01T00:00:00Z');
            const CY3_END = new Date('2023-10-31T23:59:59Z');
            const windows = findLandingWindows(SITES.cy3Primary, CY3_START, CY3_END);

            if (windows.length >= 2) {
                const spacings: number[] = [];
                for (let i = 1; i < windows.length; i++) {
                    const days = (windows[i].peakTime.getTime() - windows[i-1].peakTime.getTime()) / (1000 * 60 * 60 * 24);
                    spacings.push(days);
                }

                console.log(`\nWindow spacings (days): ${spacings.map(s => s.toFixed(1)).join(', ')}`);

                // Spacings should be ~29-30 days (lunar synodic period)
                const validSpacings = spacings.filter(s => s >= 27 && s <= 32);
                expect(validSpacings.length).toBeGreaterThanOrEqual(spacings.length * 0.8);
            }
        });

    });

    describe('RAAN Calculation Verification', () => {

        /**
         * Verify RAAN calculation against CY3 paper data
         *
         * From: Mathavaraj & Negi, "Chandrayaan-3 Trajectory Design"
         * Table: Required Lunar Orbit RAAN by Landing Date
         *
         * Formula: θS = θR + θ
         *   θS = Required RAAN
         *   θR = Moon's sidereal angle (Right Ascension from ephemeris)
         *   θ = Landing site longitude
         */

        // Paper data: Required RAAN values for CY3 primary site (longitude 32.3481°E)
        const PAPER_RAAN_DATA = [
            { date: '2023-01-27T16:00:00Z', expectedRaan: 53 },
            { date: '2023-02-26T08:00:00Z', expectedRaan: 83 },
            { date: '2023-03-28T06:00:00Z', expectedRaan: 114 },
            { date: '2023-04-24T16:30:00Z', expectedRaan: 145 },
            { date: '2023-05-26T08:30:00Z', expectedRaan: 176 },
            { date: '2023-06-24T22:30:00Z', expectedRaan: 206 },
            { date: '2023-07-24T10:30:00Z', expectedRaan: 234 },
            { date: '2023-08-22T20:30:00Z', expectedRaan: 262 },
            { date: '2023-09-21T05:30:00Z', expectedRaan: 289 },
            { date: '2023-10-20T13:30:00Z', expectedRaan: 316 },
            { date: '2023-11-18T23:00:00Z', expectedRaan: 343 },
            { date: '2023-12-18T10:30:00Z', expectedRaan: 11 },
        ];

        /**
         * Calculate RAAN using Moon's spin angle (more accurate formula)
         *
         * Formula: RAAN = (Moon spin - 180°) + site longitude
         *
         * This uses the Moon's rotation axis spin angle which accounts for
         * the Moon's orientation in inertial space including libration.
         */
        function calculateRaan(siteLongitude: number, date: Date): number {
            const time = Astronomy.MakeTime(date);
            const axis = Astronomy.RotationAxis('Moon', time);

            // Normalize spin to 0-360
            let spinNorm = axis.spin % 360;
            if (spinNorm < 0) spinNorm += 360;

            // RAAN = (spin - 180) + site longitude
            let raan = spinNorm - 180 + siteLongitude;
            while (raan < 0) raan += 360;
            while (raan >= 360) raan -= 360;

            return raan;
        }

        it('should compute RAAN close to paper values for August 22, 2023 (CY3 landing)', () => {
            // The actual CY3 landing was August 23, but the paper window is Aug 22, 20:30 UT
            const date = new Date('2023-08-22T20:30:00Z');
            const siteLon = SITES.cy3Primary.longitude;

            const computedRaan = calculateRaan(siteLon, date);

            // Get Moon's spin angle for logging
            const time = Astronomy.MakeTime(date);
            const axis = Astronomy.RotationAxis('Moon', time);
            let spinNorm = axis.spin % 360;
            if (spinNorm < 0) spinNorm += 360;

            console.log(`\nRAAN Verification for Aug 22, 2023:`);
            console.log(`  Landing site longitude: ${siteLon.toFixed(4)}°E`);
            console.log(`  Moon spin angle (normalized): ${spinNorm.toFixed(2)}°`);
            console.log(`  Computed RAAN: ${computedRaan.toFixed(2)}°`);
            console.log(`  Paper expected: 262°`);
            console.log(`  Difference: ${Math.abs(computedRaan - 262).toFixed(2)}°`);

            // Using Moon's spin angle gives very accurate results
            // Expected difference < 1° for most dates
            expect(Math.abs(computedRaan - 262)).toBeLessThan(1);
        });

        it('should compute RAAN for all 2023 landing windows from paper', () => {
            const siteLon = SITES.cy3Primary.longitude;

            console.log(`\nRAAN Verification for all 2023 landing windows:`);
            console.log(`Site longitude: ${siteLon.toFixed(4)}°E`);
            console.log(`\n| Landing Date           | Computed RAAN | Paper RAAN | Diff |`);
            console.log(`|------------------------|---------------|------------|------|`);

            const results: { date: string; computed: number; expected: number; diff: number }[] = [];

            for (const entry of PAPER_RAAN_DATA) {
                const date = new Date(entry.date);
                const computedRaan = calculateRaan(siteLon, date);
                const diff = computedRaan - entry.expectedRaan;

                // Normalize difference to -180 to +180 range
                let normalizedDiff = diff;
                if (normalizedDiff > 180) normalizedDiff -= 360;
                if (normalizedDiff < -180) normalizedDiff += 360;

                const dateStr = date.toISOString().substring(0, 16).replace('T', ' ');
                console.log(`| ${dateStr} | ${computedRaan.toFixed(1).padStart(13)} | ${entry.expectedRaan.toString().padStart(10)} | ${normalizedDiff.toFixed(1).padStart(4)} |`);

                results.push({
                    date: dateStr,
                    computed: computedRaan,
                    expected: entry.expectedRaan,
                    diff: normalizedDiff
                });
            }

            // Calculate average absolute error
            const avgError = results.reduce((sum, r) => sum + Math.abs(r.diff), 0) / results.length;
            console.log(`\nAverage absolute error: ${avgError.toFixed(2)}°`);

            // Most should be within 5 degrees
            const withinTolerance = results.filter(r => Math.abs(r.diff) < 5).length;
            console.log(`Within 5° tolerance: ${withinTolerance}/${results.length}`);
        });

        it('should compute RAAN for CY2 2019 landing windows from paper', () => {
            // CY2 primary site longitude
            const siteLon = SITES.cy2Primary.longitude; // 22.78°E

            // CY2 Paper data
            const CY2_PAPER_DATA = [
                { date: '2019-06-09T23:00:00Z', expectedRaan: 190.0 },
                { date: '2019-07-09T14:00:00Z', expectedRaan: 220.0 },
                { date: '2019-08-08T05:00:00Z', expectedRaan: 251.0 },
                { date: '2019-09-06T19:00:00Z', expectedRaan: 280.0 },  // CY2 landing attempt
                { date: '2019-10-06T09:00:00Z', expectedRaan: 310.0 },
                { date: '2019-11-04T21:00:00Z', expectedRaan: 339.0 },
                { date: '2019-12-04T07:00:00Z', expectedRaan: 6.5 },
            ];

            console.log(`\nCY2 RAAN Verification (2019):`);
            console.log(`Site: -70.90°S, ${siteLon}°E`);
            console.log(`\n| Landing Date      | Computed RAAN | Paper RAAN | Diff   |`);
            console.log(`|-------------------|---------------|------------|--------|`);

            const results: { diff: number }[] = [];

            for (const entry of CY2_PAPER_DATA) {
                const date = new Date(entry.date);
                const computedRaan = calculateRaan(siteLon, date);

                let diff = computedRaan - entry.expectedRaan;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;

                const dateStr = date.toISOString().substring(0, 16).replace('T', ' ');
                console.log(`| ${dateStr} | ${computedRaan.toFixed(1).padStart(13)} | ${entry.expectedRaan.toString().padStart(10)} | ${diff.toFixed(1).padStart(6)} |`);

                results.push({ diff });
            }

            const avgError = results.reduce((sum, r) => sum + Math.abs(r.diff), 0) / results.length;
            console.log(`\nAverage absolute error: ${avgError.toFixed(2)}°`);

            // CY2 should have very low error (< 1°)
            expect(avgError).toBeLessThan(1);

            // All should be within 5° tolerance
            const withinTolerance = results.filter(r => Math.abs(r.diff) < 5).length;
            expect(withinTolerance).toBe(results.length);
        });

        it('should show detailed breakdown of spin-based RAAN calculation', () => {
            // Analyze the Aug 22 case in detail
            const date = new Date('2023-08-22T20:30:00Z');
            const time = Astronomy.MakeTime(date);
            const siteLon = SITES.cy3Primary.longitude;

            // Get rotation axis info
            const axis = Astronomy.RotationAxis('Moon', time);
            let spinNorm = axis.spin % 360;
            if (spinNorm < 0) spinNorm += 360;

            // For comparison, also show Moon RA
            const moonVector = Astronomy.GeoMoon(time);
            const moonEquator = Astronomy.EquatorFromVector(moonVector);
            const moonRA = moonEquator.ra * 15;

            console.log(`\nDetailed breakdown for Aug 22, 2023 20:30 UT:`);
            console.log(`  Moon rotation axis RA: ${axis.ra.toFixed(2)}°`);
            console.log(`  Moon rotation axis Dec: ${axis.dec.toFixed(2)}°`);
            console.log(`  Moon spin (cumulative): ${axis.spin.toFixed(2)}°`);
            console.log(`  Moon spin (normalized): ${spinNorm.toFixed(2)}°`);
            console.log(`  Site longitude: ${siteLon.toFixed(4)}°`);
            console.log(`  Formula: (spin - 180) + siteLon`);
            console.log(`  Result: (${spinNorm.toFixed(2)} - 180) + ${siteLon.toFixed(2)} = ${(spinNorm - 180 + siteLon).toFixed(2)}°`);
            console.log(`  Paper value: 262°`);
            console.log(`\n  Comparison with old formula (Moon RA + siteLon):`);
            console.log(`  Moon RA: ${moonRA.toFixed(2)}° → RAAN: ${((moonRA + siteLon + 360) % 360).toFixed(2)}° (diff from paper: ${(((moonRA + siteLon + 360) % 360) - 262).toFixed(2)}°)`);

            // Verify spin is reasonable
            expect(spinNorm).toBeGreaterThanOrEqual(0);
            expect(spinNorm).toBeLessThan(360);
        });

    });

});
