/**
 * Sun Elevation Proof of Concept
 *
 * Validates the sun elevation algorithm against Chandrayaan-2 and Chandrayaan-3
 * mission data from ISRO papers.
 *
 * Expected Results:
 * - CY3 Primary: Landing window around Aug 22-23, 2023
 * - CY3 Backup: Landing window around Aug 20-21, 2023
 * - CY2 Primary: Landing window around Sep 6-7, 2019
 * - CY2 Backup: Landing window around Sep 5-6, 2019
 *
 * Run with: npx tsx src/wizard/poc/sun-elevation-poc.ts
 */

import {
    calculateSunElevation,
    findLandingWindows,
    formatDate,
    LandingSite,
    LandingWindow
} from '../calculations/sunElevation.js';

// Landing sites from the papers
const SITES = {
    cy3Primary: {
        name: 'CY3 Primary (Planned)',
        latitude: -69.3676,
        longitude: 32.3481
    } as LandingSite & { name: string },

    cy3Actual: {
        name: 'Shiv Shakti Point (Actual)',
        latitude: -69.3733,
        longitude: 32.3191
    } as LandingSite & { name: string },

    cy3Backup: {
        name: 'CY3 Backup',
        latitude: -69.4977,
        longitude: -17.3304
    } as LandingSite & { name: string },

    cy2Primary: {
        name: 'CY2 Primary',
        latitude: -70.90,
        longitude: 22.78
    } as LandingSite & { name: string },

    cy2Backup: {
        name: 'CY2 Backup',
        latitude: -67.75,
        longitude: -18.47
    } as LandingSite & { name: string }
};

// Time ranges from the papers
const TIME_RANGES = {
    cy3: {
        start: new Date('2023-03-01T00:00:00Z'),
        end: new Date('2023-10-31T23:59:59Z')
    },
    cy2: {
        start: new Date('2019-01-01T00:00:00Z'),
        end: new Date('2019-09-30T23:59:59Z')
    }
};

// Expected landing dates from papers (for validation)
const EXPECTED = {
    cy3Primary: { month: 7, dayRange: [22, 24] },  // August 22-24, 2023
    cy3Backup: { month: 7, dayRange: [20, 22] },   // August 20-22, 2023
    cy2Primary: { month: 8, dayRange: [5, 8] },    // September 5-8, 2019
    cy2Backup: { month: 8, dayRange: [4, 7] }      // September 4-7, 2019
};

function printHeader(text: string): void {
    console.log('\n' + '='.repeat(70));
    console.log(text);
    console.log('='.repeat(70));
}

function printWindow(window: LandingWindow, index: number): void {
    console.log(`\n  Window ${index + 1}:`);
    console.log(`    Start:     ${formatDate(window.startDate)}`);
    console.log(`    End:       ${formatDate(window.endDate)}`);
    console.log(`    Peak:      ${formatDate(window.peakTime)}`);
    console.log(`    Peak elev: ${window.peakElevation.toFixed(2)}°`);
    console.log(`    Duration:  ${window.durationHours.toFixed(1)} hours`);
}

function validateWindow(
    windows: LandingWindow[],
    expected: { month: number; dayRange: number[] },
    siteName: string
): boolean {
    const matching = windows.filter(w => {
        const month = w.peakTime.getUTCMonth();
        const day = w.peakTime.getUTCDate();
        return month === expected.month &&
               day >= expected.dayRange[0] &&
               day <= expected.dayRange[1];
    });

    if (matching.length > 0) {
        console.log(`  ✓ PASS: Found expected window for ${siteName}`);
        return true;
    } else {
        console.log(`  ✗ FAIL: No window found for ${siteName} in expected range`);
        console.log(`    Expected: Month ${expected.month + 1}, Days ${expected.dayRange[0]}-${expected.dayRange[1]}`);
        return false;
    }
}

function testSunElevationAtKnownTime(): void {
    printHeader('Test 1: Sun Elevation at Known Landing Time');

    // CY3 actual landing: Aug 23, 2023 around 12:33 UT
    const landingTime = new Date('2023-08-23T12:33:00Z');
    const site = SITES.cy3Actual;

    const elevation = calculateSunElevation(site, landingTime);

    console.log(`\n  Site: ${site.name}`);
    console.log(`  Coordinates: ${site.latitude}°S, ${site.longitude}°E`);
    console.log(`  Time: ${formatDate(landingTime)}`);
    console.log(`  Computed Sun Elevation: ${elevation.toFixed(2)}°`);

    if (elevation >= 6 && elevation <= 9) {
        console.log(`  ✓ PASS: Elevation is within 6°-9° range`);
    } else if (elevation >= 5 && elevation <= 10) {
        console.log(`  ~ CLOSE: Elevation is close to expected range (5°-10°)`);
    } else {
        console.log(`  ✗ FAIL: Elevation outside expected range`);
    }
}

function testCY3Windows(): void {
    printHeader('Test 2: CY3 Landing Windows (2023)');

    const { start, end } = TIME_RANGES.cy3;
    let allPassed = true;

    // Test primary site
    console.log(`\n--- ${SITES.cy3Primary.name} ---`);
    console.log(`  Coordinates: ${SITES.cy3Primary.latitude}°, ${SITES.cy3Primary.longitude}°`);

    const primaryWindows = findLandingWindows(SITES.cy3Primary, start, end);
    console.log(`  Found ${primaryWindows.length} windows:`);

    for (let i = 0; i < primaryWindows.length; i++) {
        printWindow(primaryWindows[i], i);
    }

    if (!validateWindow(primaryWindows, EXPECTED.cy3Primary, 'CY3 Primary')) {
        allPassed = false;
    }

    // Test backup site
    console.log(`\n--- ${SITES.cy3Backup.name} ---`);
    console.log(`  Coordinates: ${SITES.cy3Backup.latitude}°, ${SITES.cy3Backup.longitude}°`);

    const backupWindows = findLandingWindows(SITES.cy3Backup, start, end);
    console.log(`  Found ${backupWindows.length} windows:`);

    for (let i = 0; i < backupWindows.length; i++) {
        printWindow(backupWindows[i], i);
    }

    if (!validateWindow(backupWindows, EXPECTED.cy3Backup, 'CY3 Backup')) {
        allPassed = false;
    }

    console.log(`\n  Overall CY3: ${allPassed ? '✓ PASS' : '✗ FAIL'}`);
}

function testCY2Windows(): void {
    printHeader('Test 3: CY2 Landing Windows (2019)');

    const { start, end } = TIME_RANGES.cy2;
    let allPassed = true;

    // Test primary site
    console.log(`\n--- ${SITES.cy2Primary.name} ---`);
    console.log(`  Coordinates: ${SITES.cy2Primary.latitude}°, ${SITES.cy2Primary.longitude}°`);

    const primaryWindows = findLandingWindows(SITES.cy2Primary, start, end);
    console.log(`  Found ${primaryWindows.length} windows:`);

    for (let i = 0; i < primaryWindows.length; i++) {
        printWindow(primaryWindows[i], i);
    }

    if (!validateWindow(primaryWindows, EXPECTED.cy2Primary, 'CY2 Primary')) {
        allPassed = false;
    }

    // Test backup site
    console.log(`\n--- ${SITES.cy2Backup.name} ---`);
    console.log(`  Coordinates: ${SITES.cy2Backup.latitude}°, ${SITES.cy2Backup.longitude}°`);

    const backupWindows = findLandingWindows(SITES.cy2Backup, start, end);
    console.log(`  Found ${backupWindows.length} windows:`);

    for (let i = 0; i < backupWindows.length; i++) {
        printWindow(backupWindows[i], i);
    }

    if (!validateWindow(backupWindows, EXPECTED.cy2Backup, 'CY2 Backup')) {
        allPassed = false;
    }

    console.log(`\n  Overall CY2: ${allPassed ? '✓ PASS' : '✗ FAIL'}`);
}

function testMonthlyCadence(): void {
    printHeader('Test 4: Monthly Cadence Check');

    // Landing windows should occur roughly once per ~29.5 day lunar cycle
    const site = SITES.cy3Primary;
    const { start, end } = TIME_RANGES.cy3;

    const windows = findLandingWindows(site, start, end);

    console.log(`\n  Site: ${site.name}`);
    console.log(`  Period: ${start.toISOString().substring(0, 10)} to ${end.toISOString().substring(0, 10)}`);
    console.log(`  Expected windows: ~8 (one per month)`);
    console.log(`  Found windows: ${windows.length}`);

    if (windows.length >= 6 && windows.length <= 10) {
        console.log(`  ✓ PASS: Reasonable number of windows found`);
    } else {
        console.log(`  ✗ FAIL: Unexpected number of windows`);
    }

    // Check spacing between windows
    if (windows.length >= 2) {
        console.log(`\n  Window spacing (days):`);
        for (let i = 1; i < windows.length; i++) {
            const daysBetween = (windows[i].peakTime.getTime() - windows[i-1].peakTime.getTime()) / (1000 * 60 * 60 * 24);
            const status = (daysBetween >= 27 && daysBetween <= 32) ? '✓' : '~';
            console.log(`    Window ${i} to ${i+1}: ${daysBetween.toFixed(1)} days ${status}`);
        }
    }
}

// Main execution
console.log('\n' + '█'.repeat(70));
console.log('  SUN ELEVATION PROOF OF CONCEPT');
console.log('  Validating against Chandrayaan-2 and Chandrayaan-3 mission data');
console.log('█'.repeat(70));

testSunElevationAtKnownTime();
testCY3Windows();
testCY2Windows();
testMonthlyCadence();

printHeader('SUMMARY');
console.log(`
  This PoC validates the sun elevation calculation algorithm against
  actual Chandrayaan mission data from ISRO papers.

  Success Criteria:
  - CY3 landing window includes Aug 22-24, 2023
  - CY2 landing window includes Sep 5-8, 2019
  - Windows occur with ~29.5 day (lunar month) cadence
  - Sun elevation at known landing time is within 6°-9°
`);
