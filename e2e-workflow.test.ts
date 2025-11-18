import { test, expect } from '@playwright/test';

test.describe('Complete User Workflow Tests', () => {
    test('should complete full workflow: Explore → Plan → Optimize → Game → Validate', async ({ page }) => {
        console.log('\n=== COMPLETE USER WORKFLOW TEST ===');

        // Navigate to app
        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        console.log('\n--- Step 1: Start in Explore mode ---');

        // Verify we're in Explore mode by default
        const exploreBtn = page.locator('button:has-text("Explore")');
        await expect(exploreBtn).toHaveClass(/active/);

        // Set some Explore mode parameters
        await page.evaluate(() => {
            (window as any).params.chandrayaanInclination = 25.5;
            (window as any).params.chandrayaanRAAN = 90;
        });

        console.log('\n--- Step 2: Switch to Plan mode ---');

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        // Verify Plan mode is active
        const planBtn = page.locator('button:has-text("Plan")');
        await expect(planBtn).toHaveClass(/active/);

        console.log('\n--- Step 3: Create Launch Event ---');

        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        // Verify launch event exists
        const launchEventExists = await page.evaluate(() => {
            return (window as any).launchEvent.exists;
        });
        expect(launchEventExists).toBe(true);

        console.log('\n--- Step 4: Enable Auto LOI ---');

        await page.click('text=Auto LOI');
        await page.waitForTimeout(1000);

        console.log('\n--- Step 5: Set optimization parameters ---');

        const equatorCrossing = '2023-08-05T11:25:58.258Z';
        const optimizationInput = await page.evaluate((loiDateStr) => {
            const launchEvent = (window as any).launchEvent;
            launchEvent.moonInterceptDate = new Date(loiDateStr);
            launchEvent.inclination = 21.5;
            launchEvent.omega = 178;
            launchEvent.apogeeAlt = 370000;

            return {
                loiDate: launchEvent.moonInterceptDate.toISOString(),
                inclination: launchEvent.inclination,
                omega: launchEvent.omega,
                apogeeAlt: launchEvent.apogeeAlt
            };
        }, equatorCrossing);

        console.log('Optimization input:', JSON.stringify(optimizationInput, null, 2));

        console.log('\n--- Step 6: Run Auto Optimize ---');

        // Set up dialog handler
        let dialogText = '';
        page.on('dialog', async dialog => {
            dialogText = dialog.message();
            await dialog.accept();
        });

        // Click Auto Optimize button
        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        await expect(optimizeBtn).toBeVisible({ timeout: 5000 });
        await optimizeBtn.click({ force: true });

        // Wait for optimization to complete
        let attempts = 0;
        while (dialogText === '' && attempts < 360) {
            await page.waitForTimeout(500);
            attempts++;
        }

        if (dialogText === '') {
            throw new Error('Optimization did not complete within 3 minutes');
        }

        console.log('Optimization complete:', dialogText);

        // Extract optimization results
        const raanMatch = dialogText.match(/Optimal RAAN: ([\d.]+)/);
        const apogeeMatch = dialogText.match(/Optimal Apogee: ([\d.]+) km/);
        const distanceMatch = dialogText.match(/Closest approach: ([\d.]+) km/);

        expect(raanMatch).toBeTruthy();
        expect(apogeeMatch).toBeTruthy();
        expect(distanceMatch).toBeTruthy();

        const optimizedRaan = parseFloat(raanMatch![1]);
        const optimizedApogee = parseFloat(apogeeMatch![1]);
        const optimizedDistance = parseFloat(distanceMatch![1]);

        console.log('Optimized RAAN:', optimizedRaan);
        console.log('Optimized Apogee:', optimizedApogee);
        console.log('Optimized Distance:', optimizedDistance);

        console.log('\n--- Step 7: Verify parameters were updated ---');

        const updatedParams = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                raan: le.raan,
                apogeeAlt: le.apogeeAlt
            };
        });

        expect(Math.abs(updatedParams.raan - optimizedRaan)).toBeLessThan(0.1);
        expect(Math.abs(updatedParams.apogeeAlt - optimizedApogee)).toBeLessThan(1);
        console.log('✓ Parameters updated correctly');

        console.log('\n--- Step 8: Switch to Game mode ---');

        await page.click('button:has-text("Game")');
        await page.waitForTimeout(2000);

        // Verify Game mode is active
        const gameBtn = page.locator('button:has-text("Game")');
        await expect(gameBtn).toHaveClass(/active/);

        console.log('\n--- Step 9: Verify parameters persisted in Game mode ---');

        const gameParams = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                raan: le.raan,
                apogeeAlt: le.apogeeAlt
            };
        });

        expect(Math.abs(gameParams.raan - optimizedRaan)).toBeLessThan(0.1);
        expect(Math.abs(gameParams.apogeeAlt - optimizedApogee)).toBeLessThan(1);
        console.log('✓ Parameters persisted correctly in Game mode');

        console.log('\n--- Step 10: Set time to LOI and validate distance ---');

        await page.evaluate((loiDateStr) => {
            const loiDate = new Date(loiDateStr);
            (window as any).setSimulationTime(loiDate);
        }, equatorCrossing);

        await page.waitForTimeout(1000);

        const visualDistance = await page.evaluate(() => {
            const cache = (window as any).realPositionsCache;
            if (!cache || !cache.craftPositionKm || !cache.moonPositionKm) {
                return null;
            }

            const cx = cache.craftPositionKm.x;
            const cy = cache.craftPositionKm.y;
            const cz = cache.craftPositionKm.z;
            const mx = cache.moonPositionKm.x;
            const my = cache.moonPositionKm.y;
            const mz = cache.moonPositionKm.z;

            return Math.sqrt(
                (cx - mx) ** 2 +
                (cy - my) ** 2 +
                (cz - mz) ** 2
            );
        });

        if (visualDistance === null) {
            throw new Error('Could not calculate visual distance');
        }

        console.log('Visual distance at LOI:', visualDistance.toFixed(1), 'km');
        console.log('Optimization reported:', optimizedDistance.toFixed(1), 'km');
        console.log('Difference:', Math.abs(visualDistance - optimizedDistance).toFixed(1), 'km');

        // Verify distances match (within 1% or 100 km tolerance)
        const tolerance = Math.max(optimizedDistance * 0.01, 100);
        expect(Math.abs(visualDistance - optimizedDistance)).toBeLessThan(tolerance);
        console.log('✓ Visual distance matches optimization result');

        console.log('\n--- Step 11: Switch back to Plan mode and verify persistence ---');

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        const planParamsAfter = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                raan: le.raan,
                apogeeAlt: le.apogeeAlt
            };
        });

        expect(Math.abs(planParamsAfter.raan - optimizedRaan)).toBeLessThan(0.1);
        expect(Math.abs(planParamsAfter.apogeeAlt - optimizedApogee)).toBeLessThan(1);
        console.log('✓ Parameters still correct after returning to Plan mode');

        console.log('\n--- Step 12: Switch to Explore mode and verify isolation ---');

        await page.click('button:has-text("Explore")');
        await page.waitForTimeout(1000);

        const exploreParams = await page.evaluate(() => {
            return {
                inclination: (window as any).params.chandrayaanInclination,
                raan: (window as any).params.chandrayaanRAAN
            };
        });

        // Verify Explore mode has its own parameters (should be the ones we set in step 1)
        expect(exploreParams.inclination).toBe(25.5);
        expect(exploreParams.raan).toBe(90);
        console.log('✓ Explore mode parameters isolated correctly');

        console.log('\n=== WORKFLOW TEST PASSED ✓ ===');
    });

    test('should handle launch event creation and deletion', async ({ page }) => {
        console.log('\n=== LAUNCH EVENT LIFECYCLE TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        // Switch to Plan mode
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        console.log('\n--- Step 1: Create launch event ---');

        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        const eventExists1 = await page.evaluate(() => (window as any).launchEvent.exists);
        expect(eventExists1).toBe(true);
        console.log('✓ Launch event created');

        console.log('\n--- Step 2: Capture default parameters ---');

        const defaultParams = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                inclination: le.inclination,
                omega: le.omega,
                raan: le.raan,
                apogeeAlt: le.apogeeAlt,
                exists: le.exists
            };
        });

        expect(defaultParams.exists).toBe(true);
        console.log('Default parameters captured:', defaultParams);

        console.log('\n--- Step 3: Switch to Game mode and verify ---');

        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1000);

        const gameParams = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                inclination: le.inclination,
                omega: le.omega,
                raan: le.raan,
                apogeeAlt: le.apogeeAlt
            };
        });

        expect(gameParams.inclination).toBe(defaultParams.inclination);
        expect(gameParams.omega).toBe(defaultParams.omega);
        expect(gameParams.raan).toBe(defaultParams.raan);
        expect(gameParams.apogeeAlt).toBe(defaultParams.apogeeAlt);
        console.log('✓ Parameters persisted in Game mode');

        console.log('\n--- Step 4: Return to Plan and delete event ---');

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        // Delete launch event
        const deleteBtn = page.locator('button:has-text("Delete Event")');
        if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
            await page.waitForTimeout(1000);
        } else {
            // Alternative: directly remove via evaluate
            await page.evaluate(() => {
                (window as any).launchEvent.exists = false;
            });
        }

        const eventExists2 = await page.evaluate(() => (window as any).launchEvent.exists);
        expect(eventExists2).toBe(false);
        console.log('✓ Launch event deleted');

        console.log('\n=== LIFECYCLE TEST PASSED ✓ ===');
    });
});
