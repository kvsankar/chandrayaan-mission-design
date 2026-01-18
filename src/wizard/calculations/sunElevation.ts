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

/**
 * Calculate the required lunar orbit RAAN for a landing at a given site and time
 *
 * From CY3 paper: θS = θR + θ
 * Where:
 *   θS = Required RAAN of lunar orbit
 *   θR = Moon's Right Ascension (sidereal angle from ephemeris)
 *   θ = Landing site longitude (Moon-fixed)
 *
 * @param siteLongitude - Landing site longitude in degrees
 * @param date - Landing date/time
 * @returns Required RAAN in degrees (0-360)
 */
export function calculateRequiredRaan(siteLongitude: number, date: Date): number {
    const time = Astronomy.MakeTime(date);

    // Get Moon's geocentric position vector, then convert to equatorial
    const moonVector = Astronomy.GeoMoon(time);
    const moonEquator = Astronomy.EquatorFromVector(moonVector);

    // Moon's Right Ascension in degrees (0-360)
    const moonRA = moonEquator.ra * 15; // Convert hours to degrees

    // Required RAAN = Moon RA + site longitude
    let raan = moonRA + siteLongitude;

    // Normalize to 0-360
    while (raan < 0) raan += 360;
    while (raan >= 360) raan -= 360;

    return raan;
}

/**
 * Extended landing window with computed RAAN
 */
export interface LandingWindowWithRaan extends LandingWindow {
    requiredRaan: number;
}

/**
 * Find landing windows with required RAAN computed for each
 */
export function findLandingWindowsWithRaan(
    site: LandingSite,
    startDate: Date,
    endDate: Date,
    minElevation: number = 6,
    maxElevation: number = 9
): LandingWindowWithRaan[] {
    const windows = findLandingWindows(site, startDate, endDate, minElevation, maxElevation);

    return windows.map(window => ({
        ...window,
        requiredRaan: calculateRequiredRaan(site.longitude, window.peakTime)
    }));
}

/**
 * Altitude timeline point
 */
export interface AltitudeTimelinePoint {
    time: Date;
    altitude: number;
}

/**
 * Generate sun altitude timeline data for a landing site
 *
 * @param site - Landing site coordinates
 * @param startTime - Start of timeline
 * @param endTime - End of timeline
 * @param stepMinutes - Time step in minutes (default 30)
 * @returns Array of time/altitude points
 */
export function generateAltitudeTimeline(
    site: LandingSite,
    startTime: Date,
    endTime: Date,
    stepMinutes: number = 30
): AltitudeTimelinePoint[] {
    const stepMs = stepMinutes * 60 * 1000;
    const points: AltitudeTimelinePoint[] = [];

    let t = startTime.getTime();
    while (t <= endTime.getTime()) {
        const time = new Date(t);
        const altitude = calculateSunElevation(site, time);
        points.push({ time, altitude });
        t += stepMs;
    }

    return points;
}

/**
 * Lunar day segment - a period when the sun is above the horizon at a site
 */
export interface LunarDaySegment {
    sunrise: Date;          // When sun crosses 0° rising
    sunset: Date;           // When sun crosses 0° setting
    peakTime: Date;         // Midpoint (approximately local noon)
    peakElevation: number;  // Maximum sun elevation during this day
    isDay: true;            // Type discriminator
}

/**
 * Lunar night segment - a period when the sun is below the horizon
 */
export interface LunarNightSegment {
    start: Date;            // Night begins (previous sunset)
    end: Date;              // Night ends (next sunrise)
    isDay: false;           // Type discriminator
}

/**
 * Combined type for day/night segments
 */
export type LunarSegment = LunarDaySegment | LunarNightSegment;

interface SunCrossing {
    time: Date;
    isRising: boolean;
}

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

/**
 * Find all zero-crossings (sunrise/sunset) in the elevation samples
 */
function findZeroCrossings(site: LandingSite, samples: ElevationSample[]): SunCrossing[] {
    const crossings: SunCrossing[] = [];

    for (let i = 0; i < samples.length - 1; i++) {
        const curr = samples[i];
        const next = samples[i + 1];

        if (curr.elevation < 0 && next.elevation >= 0) {
            // Sunrise: elevation goes from negative to positive
            crossings.push({ time: findElevationCrossing(site, curr.time, next.time, 0), isRising: true });
        } else if (curr.elevation >= 0 && next.elevation < 0) {
            // Sunset: elevation goes from positive to negative
            crossings.push({ time: findElevationCrossing(site, curr.time, next.time, 0), isRising: false });
        }
    }

    return crossings.sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * Search backwards from startDate to find the actual sunrise if starting during daytime
 */
function findActualSunriseBackwards(site: LandingSite, startDate: Date, initialElevation: number): Date {
    const searchStart = new Date(startDate.getTime() - FIFTEEN_DAYS_MS);
    let t = startDate.getTime();
    let prevElevation = initialElevation;

    while (t > searchStart.getTime()) {
        t -= THREE_HOURS_MS;
        const elevation = calculateSunElevation(site, new Date(t));
        if (elevation < 0 && prevElevation >= 0) {
            return findElevationCrossing(site, new Date(t), new Date(t + THREE_HOURS_MS), 0);
        }
        prevElevation = elevation;
    }

    return startDate;
}

/**
 * Create a day segment from sunrise to sunset
 */
function createDaySegment(sunrise: Date, sunset: Date, site: LandingSite): LunarDaySegment {
    const peakTime = new Date((sunrise.getTime() + sunset.getTime()) / 2);
    return {
        sunrise,
        sunset,
        peakTime,
        peakElevation: calculateSunElevation(site, peakTime),
        isDay: true
    };
}

/**
 * Create a night segment
 */
function createNightSegment(start: Date, end: Date): LunarNightSegment {
    return { start, end, isDay: false };
}

interface SegmentBuildState {
    segments: LunarSegment[];
    currentStart: Date;
    isCurrentlyDay: boolean;
}

/**
 * Process crossings and build segments
 */
function buildSegmentsFromCrossings(
    crossings: SunCrossing[],
    state: SegmentBuildState,
    site: LandingSite
): void {
    for (const crossing of crossings) {
        if (crossing.isRising) {
            if (!state.isCurrentlyDay && state.currentStart < crossing.time) {
                state.segments.push(createNightSegment(state.currentStart, crossing.time));
            }
            state.currentStart = crossing.time;
            state.isCurrentlyDay = true;
        } else {
            if (state.isCurrentlyDay && state.currentStart < crossing.time) {
                state.segments.push(createDaySegment(state.currentStart, crossing.time, site));
            }
            state.currentStart = crossing.time;
            state.isCurrentlyDay = false;
        }
    }
}

/**
 * Find all lunar day and night segments within a date range for a given site.
 *
 * A lunar day is defined as the period when sun elevation > 0° at the site.
 * Each lunar day is approximately 14 Earth days.
 *
 * @param site - Landing site coordinates
 * @param startDate - Start of search range
 * @param endDate - End of search range
 * @returns Array of alternating day/night segments
 */
export function findLunarDayNightCycles(
    site: LandingSite,
    startDate: Date,
    endDate: Date
): LunarSegment[] {
    const samples = sampleElevations(site, startDate, endDate);
    const crossings = findZeroCrossings(site, samples);

    const initialElevation = calculateSunElevation(site, startDate);
    const isCurrentlyDay = initialElevation >= 0;

    const state: SegmentBuildState = {
        segments: [],
        currentStart: isCurrentlyDay
            ? findActualSunriseBackwards(site, startDate, initialElevation)
            : startDate,
        isCurrentlyDay
    };

    buildSegmentsFromCrossings(crossings, state, site);

    // Handle partial segment at end
    if (state.currentStart < endDate) {
        if (state.isCurrentlyDay) {
            state.segments.push(createDaySegment(state.currentStart, endDate, site));
        } else {
            state.segments.push(createNightSegment(state.currentStart, endDate));
        }
    }

    return state.segments;
}

/**
 * Get only the lunar day segments (when sun is above horizon)
 */
export function findLunarDays(
    site: LandingSite,
    startDate: Date,
    endDate: Date
): LunarDaySegment[] {
    const allSegments = findLunarDayNightCycles(site, startDate, endDate);
    return allSegments.filter((s): s is LunarDaySegment => s.isDay);
}

/**
 * Format a lunar day segment as a date range string
 * e.g., "Oct 1-16" or "Oct 20 - Nov 05"
 */
export function formatLunarDayLabel(segment: LunarDaySegment): string {
    const startMonth = segment.sunrise.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const endMonth = segment.sunset.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const startDay = segment.sunrise.getUTCDate();
    const endDay = segment.sunset.getUTCDate();

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
    } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay.toString().padStart(2, '0')}`;
    }
}
