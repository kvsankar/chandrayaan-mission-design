#!/usr/bin/env node
/**
 * Generate closest-approach solutions for CY-3 and CY-2 calendar ranges.
 *
 * Uses the same optimizer as the main app:
 *  - inclination = 21.5°
 *  - omega (AoP) = 178°
 *  - perigee = 180 km
 *  - optimizes RAAN and apogee to minimize Moon miss distance at LOI
 *
 * Output: CSV to stdout with columns:
 *   mission, LOI_ISO, TLI_ISO, RAAN_deg, Apogee_km, Closest_km, TrueAnom_deg
 */

// Run with: node scripts/closest-approach-report.js

const {
    findOptimalLOIDates,
    optimizeApogeeToMoonMultiStart,
    calculateTimeToTrueAnomaly
} = require('../dist/optimization.js');

const CY3 = { name: 'CY3', start: '2023-03-01', end: '2023-10-31' };
const CY2 = { name: 'CY2', start: '2019-01-01', end: '2019-09-30' };

const INCLINATION = 21.5;
const OMEGA = 178;
const PERIGEE = 180;

function pad(n) {
    return n < 10 ? `0${n}` : `${n}`;
}

function toISO(dt) {
    return [
        dt.getUTCFullYear(),
        pad(dt.getUTCMonth() + 1),
        pad(dt.getUTCDate())
    ].join('-') + 'T' +
        [pad(dt.getUTCHours()), pad(dt.getUTCMinutes())].join(':') +
        'Z';
}

function processWindow(window) {
    const start = new Date(`${window.start}T00:00:00Z`);
    const end = new Date(`${window.end}T23:59:59Z`);

    const loiDates = findOptimalLOIDates(start, end);

    const rows = [];
    for (const loi of loiDates) {
        const sol = optimizeApogeeToMoonMultiStart(loi, OMEGA, INCLINATION, 378029);

        const timeToNu = calculateTimeToTrueAnomaly(
            sol.trueAnomaly,
            PERIGEE,
            sol.apogeeAlt
        );
        const tli = new Date(loi.getTime() - timeToNu * 1000);

        rows.push({
            mission: window.name,
            loi: toISO(loi),
            tli: toISO(tli),
            raan: sol.raan,
            apogee: sol.apogeeAlt,
            closest: sol.distance,
            nu: sol.trueAnomaly
        });
    }
    return rows;
}

function main() {
    const rows = [
        ...processWindow(CY3),
        ...processWindow(CY2)
    ];

    // CSV header
    console.log('mission,LOI_ISO,TLI_ISO,RAAN_deg,Apogee_km,Closest_km,TrueAnom_deg');
    for (const r of rows) {
        console.log([
            r.mission,
            r.loi,
            r.tli,
            r.raan.toFixed(3),
            r.apogee.toFixed(1),
            r.closest.toFixed(1),
            r.nu.toFixed(2)
        ].join(','));
    }
}

main();
