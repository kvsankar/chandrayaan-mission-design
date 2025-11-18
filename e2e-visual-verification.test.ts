import { test, expect } from '@playwright/test';

test.describe('Visual Distance Verification Test', () => {
    test('should verify Moon-Craft distance in Game mode matches optimization result', async ({ page }) => {
        console.log('\n=== STEP 1: Use known LOI date for August (equator crossing) ===');

        // Use the equator crossing date from unit tests
        const equatorCrossing = '2023-08-05T11:25:58.258Z';
        console.log(`Using equator crossing: ${equatorCrossing}`);

        // Navigate to app
        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        // Listen to console logs
        const logs: string[] = [];
        page.on('console', msg => logs.push(msg.text()));

        console.log('\n=== STEP 2: Find optimized parameters ===');

        // Switch to Plan mode
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        // Add launch event
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        // Enable Auto LOI
        await page.click('text=Auto LOI');
        await page.waitForTimeout(1000);

        // Set exact parameters using JavaScript evaluation
        const optimizationInput = await page.evaluate((loiDateStr) => {
            const launchEvent = (window as any).launchEvent;
            if (launchEvent) {
                launchEvent.moonInterceptDate = new Date(loiDateStr);
                launchEvent.inclination = 21.5;
                launchEvent.omega = 178;
                launchEvent.apogeeAlt = 370000; // Default value

                console.log('Set optimization input:', {
                    loiDate: launchEvent.moonInterceptDate.toISOString(),
                    inclination: launchEvent.inclination,
                    omega: launchEvent.omega,
                    apogeeAlt: launchEvent.apogeeAlt
                });

                return {
                    loiDate: launchEvent.moonInterceptDate.toISOString(),
                    inclination: launchEvent.inclination,
                    omega: launchEvent.omega,
                    apogeeAlt: launchEvent.apogeeAlt
                };
            }
            return null;
        }, equatorCrossing);

        console.log('Optimization input:', JSON.stringify(optimizationInput, null, 2));

        // Set up dialog handler
        let dialogText = '';
        page.on('dialog', async dialog => {
            dialogText = dialog.message();
            console.log('Dialog received');
            await dialog.accept();
        });

        console.log('\n=== STEP 3: Click Auto Optimize button ===');

        // Find and click Auto Optimize button
        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        await expect(optimizeBtn).toBeVisible({ timeout: 5000 });
        await optimizeBtn.click({ force: true });
        console.log('Clicked Auto Optimize, waiting for result...');

        // Wait for dialog
        let attempts = 0;
        while (dialogText === '' && attempts < 360) {
            await page.waitForTimeout(500);
            attempts++;
        }

        if (dialogText === '') {
            throw new Error('No dialog after 3 minutes');
        }

        console.log('\n=== Optimization Result ===');
        console.log(dialogText);

        // Extract optimization results
        const raanMatch = dialogText.match(/Optimal RAAN: ([\d.]+)/);
        const apogeeMatch = dialogText.match(/Optimal Apogee: ([\d.]+) km/);
        const distanceMatch = dialogText.match(/Closest approach: ([\d.]+) km/);
        const trueAnomalyMatch = dialogText.match(/Optimal True Anomaly: ([\d.]+)/);

        if (!raanMatch || !apogeeMatch || !distanceMatch || !trueAnomalyMatch) {
            throw new Error('Could not parse optimization results');
        }

        const optimizedRaan = parseFloat(raanMatch[1]);
        const optimizedApogee = parseFloat(apogeeMatch[1]);
        const optimizedDistance = parseFloat(distanceMatch[1]);
        const optimalTrueAnomaly = parseFloat(trueAnomalyMatch[1]);

        console.log('Parsed results:');
        console.log(`  RAAN: ${optimizedRaan}°`);
        console.log(`  Apogee: ${optimizedApogee} km`);
        console.log(`  Distance: ${optimizedDistance} km`);
        console.log(`  True Anomaly: ${optimalTrueAnomaly}°`);

        console.log('\n=== STEP 4: Verify parameters match ===');

        const currentParams = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                raan: le.raan,
                apogeeAlt: le.apogeeAlt,
                inclination: le.inclination,
                omega: le.omega
            };
        });

        console.log('Current launchEvent parameters:');
        console.log(`  RAAN: ${currentParams.raan}°`);
        console.log(`  Apogee: ${currentParams.apogeeAlt} km`);
        console.log(`  Inclination: ${currentParams.inclination}°`);
        console.log(`  Omega: ${currentParams.omega}°`);

        expect(Math.abs(currentParams.raan - optimizedRaan)).toBeLessThan(0.1);
        expect(Math.abs(currentParams.apogeeAlt - optimizedApogee)).toBeLessThan(1);
        console.log('✓ Parameters match optimization results');

        console.log('\n=== STEP 5: Switch to Game mode and verify distance ===');

        // Switch to Game mode
        await page.click('button:has-text("Game")');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '/tmp/before-set-time.png' });

        // Set time to LOI date
        await page.evaluate((loiDateStr) => {
            const loiDate = new Date(loiDateStr);
            console.log('Setting time to:', loiDateStr);
            (window as any).setSimulationTime(loiDate);
        }, equatorCrossing);

        await page.waitForTimeout(1000);
        await page.screenshot({ path: '/tmp/after-set-time.png' });

        // Calculate distance
        const visualDistance = await page.evaluate(() => {
            const cache = (window as any).realPositionsCache;

            console.log('Cache:', cache);

            if (!cache || !cache.craftPositionKm || !cache.moonPositionKm) {
                console.log('Cache not ready:', {
                    cacheExists: !!cache,
                    hasCraft: cache && !!cache.craftPositionKm,
                    hasMoon: cache && !!cache.moonPositionKm
                });
                return null;
            }

            const cx = cache.craftPositionKm.x;
            const cy = cache.craftPositionKm.y;
            const cz = cache.craftPositionKm.z;
            const mx = cache.moonPositionKm.x;
            const my = cache.moonPositionKm.y;
            const mz = cache.moonPositionKm.z;

            const distance = Math.sqrt(
                (cx - mx) ** 2 +
                (cy - my) ** 2 +
                (cz - mz) ** 2
            );

            console.log('Distance calculation:', {
                craft: `(${cx.toFixed(1)}, ${cy.toFixed(1)}, ${cz.toFixed(1)})`,
                moon: `(${mx.toFixed(1)}, ${my.toFixed(1)}, ${mz.toFixed(1)})`,
                distance: distance.toFixed(1)
            });

            return distance;
        });

        if (visualDistance === null) {
            throw new Error('Could not calculate visual distance');
        }

        // Get detailed debug info
        const debugInfo = await page.evaluate(() => {
            const cache = (window as any).realPositionsCache;
            const timelineState = (window as any).timelineState;
            const params = (window as any).params;
            const launchEvent = (window as any).launchEvent;

            return {
                craftPos: cache.craftPositionKm,
                moonPos: cache.moonPositionKm,
                timelineDate: timelineState.currentDate,
                daysElapsed: timelineState.daysElapsed,
                appMode: params.appMode,
                launchDate: launchEvent.date,
                tliDate: launchEvent.date,
                loiDate: launchEvent.moonInterceptDate,
                trueAnomaly: params.chandrayaanTrueAnomaly
            };
        });

        console.log(`\n=== FINAL COMPARISON ===`);
        console.log(`Optimization reported: ${optimizedDistance.toFixed(1)} km`);
        console.log(`Visual in Game mode: ${visualDistance.toFixed(1)} km`);
        console.log(`Difference: ${Math.abs(visualDistance - optimizedDistance).toFixed(1)} km`);

        console.log(`\n=== Debug Info ===`);
        console.log(`Craft position: (${debugInfo.craftPos.x.toFixed(1)}, ${debugInfo.craftPos.y.toFixed(1)}, ${debugInfo.craftPos.z.toFixed(1)}) km`);
        console.log(`Moon position: (${debugInfo.moonPos.x.toFixed(1)}, ${debugInfo.moonPos.y.toFixed(1)}, ${debugInfo.moonPos.z.toFixed(1)}) km`);
        console.log(`Days elapsed: ${debugInfo.daysElapsed}`);
        console.log(`TLI date: ${debugInfo.tliDate}`);
        console.log(`LOI date: ${debugInfo.loiDate}`);
        console.log(`True Anomaly: ${debugInfo.trueAnomaly}°`);
        console.log(`Optimal True Anomaly (from optimization): ${optimalTrueAnomaly}°`);

        // The distances should be very close (within 1% or 100 km, whichever is larger)
        const tolerance = Math.max(optimizedDistance * 0.01, 100);

        if (Math.abs(visualDistance - optimizedDistance) < tolerance) {
            console.log(`✓ PASS: Distances match within tolerance (${tolerance.toFixed(1)} km)`);
        } else {
            console.log(`✗ FAIL: Distances differ by more than tolerance`);
            throw new Error(
                `Distance mismatch: optimization=${optimizedDistance.toFixed(1)} km, ` +
                `visual=${visualDistance.toFixed(1)} km, ` +
                `difference=${Math.abs(visualDistance - optimizedDistance).toFixed(1)} km, ` +
                `tolerance=${tolerance.toFixed(1)} km`
            );
        }

        // Also log relevant console output
        console.log('\n=== Relevant Console Logs ===');
        logs.filter(log =>
            log.includes('optimization') ||
            log.includes('distance') ||
            log.includes('Distance')
        ).forEach(log => console.log(log));
    });
});
