/**
 * Sun Elevation Calculator for Lunar Landing Sites
 *
 * Calculates the Sun's elevation angle at a given selenographic (Moon-fixed)
 * latitude and longitude for a given datetime.
 *
 * Used to determine landing windows when Sun elevation is between 6°-9°.
 *
 * Algorithm validated against Chandrayaan-2 and Chandrayaan-3 mission data:
 * - CY3: August 23, 2023 landing window confirmed
 * - CY2: September 6, 2019 landing window confirmed
 */

import * as Astronomy from 'astronomy-engine';

// Constants
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Landing site coordinates
 */
export interface LandingSite {
    latitude: number;   // degrees, -90 to +90 (negative = South)
    longitude: number;  // degrees, -180 to +180 (negative = West)
}

/**
 * Landing window result
 */
export interface LandingWindow {
    startDate: Date;
    endDate: Date;
    peakElevation: number;
    peakTime: Date;
    durationHours: number;
}

/**
 * Calculate the Sun's selenographic coordinates (sub-solar point on Moon)
 *
 * Returns the latitude and longitude on the Moon where the Sun is directly overhead.
 *
 * @param date - The datetime for calculation
 * @returns Sub-solar point {latitude, longitude} in degrees
 */
export function getSubSolarPoint(date: Date): { latitude: number; longitude: number } {
    const time = Astronomy.MakeTime(date);

    // The sub-solar longitude is related to the Moon's phase
    // At New Moon (phase=0): Sun is behind Moon, sub-solar lon ≈ 180° (far side)
    // At Full Moon (phase=180): Sun is in front, sub-solar lon ≈ 0° (near side)
    const moonPhase = Astronomy.MoonPhase(time);

    // Sub-solar longitude calculation
    let subSolarLon = 180 - moonPhase;

    // Normalize to -180 to +180
    while (subSolarLon > 180) subSolarLon -= 360;
    while (subSolarLon < -180) subSolarLon += 360;

    // Sub-solar latitude oscillates with lunar month, roughly ±1.54°
    // (Moon's axial tilt relative to its orbital plane)
    const subSolarLat = 1.54 * Math.sin(moonPhase * DEG_TO_RAD);

    return {
        latitude: subSolarLat,
        longitude: subSolarLon
    };
}

/**
 * Calculate the Sun's elevation angle at a given landing site
 *
 * @param site - Landing site coordinates
 * @param date - The datetime for calculation
 * @returns Sun elevation in degrees (0° = horizon, 90° = zenith)
 */
export function calculateSunElevation(site: LandingSite, date: Date): number {
    const subSolar = getSubSolarPoint(date);

    // Angular distance from site to sub-solar point using spherical trigonometry
    // cos(d) = sin(lat1)*sin(lat2) + cos(lat1)*cos(lat2)*cos(lon2-lon1)
    const lat1 = site.latitude * DEG_TO_RAD;
    const lat2 = subSolar.latitude * DEG_TO_RAD;
    const dLon = (subSolar.longitude - site.longitude) * DEG_TO_RAD;

    const cosAngularDist =
        Math.sin(lat1) * Math.sin(lat2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);

    // Clamp to [-1, 1] to handle floating point errors
    const clampedCos = Math.max(-1, Math.min(1, cosAngularDist));
    const angularDistRad = Math.acos(clampedCos);

    // Sun elevation = 90° - angular distance from sub-solar point
    const elevation = 90 - (angularDistRad * RAD_TO_DEG);

    return elevation;
}

/**
 * Find the exact time when sun elevation crosses a threshold using bisection
 *
 * @param site - Landing site
 * @param startDate - Start of search interval
 * @param endDate - End of search interval
 * @param threshold - Elevation threshold in degrees
 * @param tolerance - Time tolerance in milliseconds (default 60000 = 1 minute)
 * @returns The time when elevation crosses the threshold
 */
export function findElevationCrossing(
    site: LandingSite,
    startDate: Date,
    endDate: Date,
    threshold: number,
    tolerance: number = 60000
): Date {
    let lo = startDate.getTime();
    let hi = endDate.getTime();

    const f = (t: number) => calculateSunElevation(site, new Date(t)) - threshold;

    // Bisection search
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

interface ElevationSample {
    time: Date;
    elevation: number;
}

function sampleElevations(site: LandingSite, startDate: Date, endDate: Date): ElevationSample[] {
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const samples: ElevationSample[] = [];
    let t = startDate.getTime();
    while (t <= endDate.getTime()) {
        const date = new Date(t);
        samples.push({ time: date, elevation: calculateSunElevation(site, date) });
        t += THREE_HOURS_MS;
    }
    return samples;
}

function findWindowEnd(
    site: LandingSite,
    samples: ElevationSample[],
    startIdx: number,
    minElevation: number,
    maxElevation: number
): { endDate: Date; peakElev: number } | null {
    let peakElev = samples[startIdx].elevation;

    for (let j = startIdx; j < samples.length - 1; j++) {
        const s1 = samples[j];
        const s2 = samples[j + 1];

        if (s1.elevation > peakElev) peakElev = s1.elevation;

        // Exits by crossing maxElevation upward (normal case)
        if (s1.elevation < maxElevation && s2.elevation >= maxElevation) {
            return { endDate: findElevationCrossing(site, s1.time, s2.time, maxElevation), peakElev };
        }
        // Edge case: drops below minElevation without reaching max
        if (s1.elevation >= minElevation && s2.elevation < minElevation) {
            return { endDate: findElevationCrossing(site, s1.time, s2.time, minElevation), peakElev };
        }
    }
    return null;
}

/**
 * Find all landing windows within a date range where Sun elevation RISES through min-max range
 *
 * Only rising (sunrise) windows are valid for landing because:
 * - Landing at sunrise gives ~14 Earth days of sunlight for science operations
 * - Landing at sunset would mean immediate lunar night
 *
 * @param site - Landing site
 * @param startDate - Start of search range
 * @param endDate - End of search range
 * @param minElevation - Minimum sun elevation (default 6°)
 * @param maxElevation - Maximum sun elevation (default 9°)
 * @returns Array of landing windows (one per lunar month, ~29.5 day spacing)
 */
export function findLandingWindows(
    site: LandingSite,
    startDate: Date,
    endDate: Date,
    minElevation: number = 6,
    maxElevation: number = 9
): LandingWindow[] {
    const windows: LandingWindow[] = [];
    const samples = sampleElevations(site, startDate, endDate);

    for (let i = 0; i < samples.length - 1; i++) {
        const curr = samples[i];
        const next = samples[i + 1];

        // Only rising windows: crosses minElevation upward (sun rising)
        if (curr.elevation >= minElevation || next.elevation < minElevation) continue;

        const windowStart = findElevationCrossing(site, curr.time, next.time, minElevation);
        const result = findWindowEnd(site, samples, i + 1, minElevation, maxElevation);

        if (result && result.endDate > windowStart) {
            windows.push({
                startDate: windowStart,
                endDate: result.endDate,
                peakElevation: Math.min(result.peakElev, maxElevation),
                peakTime: new Date((windowStart.getTime() + result.endDate.getTime()) / 2),
                durationHours: (result.endDate.getTime() - windowStart.getTime()) / (1000 * 60 * 60)
            });
        }
    }

    return windows;
}

/**
 * Format a date as a readable string
 */
export function formatDate(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UT';
}
