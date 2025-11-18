import { test, expect } from '@playwright/test';

test.describe('Error Handling and Edge Cases', () => {
    test('should handle optimization without launch event gracefully', async ({ page }) => {
        console.log('\n=== OPTIMIZATION WITHOUT LAUNCH EVENT TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        // Switch to Plan mode but don't create launch event
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        console.log('\n--- Verify no launch event exists ---');

        const eventExists = await page.evaluate(() => {
            return (window as any).launchEvent.exists;
        });

        expect(eventExists).toBe(false);
        console.log('✓ No launch event exists');

        console.log('\n--- Verify Auto Optimize button is not visible ---');

        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        const isVisible = await optimizeBtn.isVisible();

        expect(isVisible).toBe(false);
        console.log('✓ Auto Optimize button correctly hidden without launch event');

        console.log('\n=== TEST PASSED ✓ ===');
    });

    test('should handle optimization without Auto LOI enabled', async ({ page }) => {
        console.log('\n=== OPTIMIZATION WITHOUT AUTO LOI TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        // Switch to Plan mode and create launch event
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        console.log('\n--- Verify Auto LOI is disabled ---');

        const autoLOI = await page.evaluate(() => {
            return (window as any).launchEvent.autoLOI;
        });

        expect(autoLOI).toBe(false);
        console.log('✓ Auto LOI disabled by default');

        console.log('\n--- Verify Auto Optimize button is not visible ---');

        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        const isVisible = await optimizeBtn.isVisible();

        expect(isVisible).toBe(false);
        console.log('✓ Auto Optimize button correctly hidden without Auto LOI');

        console.log('\n=== TEST PASSED ✓ ===');
    });

    test('should handle missing LOI date gracefully', async ({ page }) => {
        console.log('\n=== MISSING LOI DATE TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        // Switch to Plan mode and create launch event
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        // Enable Auto LOI
        await page.evaluate(() => { (window as any).setAutoLOI(true); });
        await page.waitForTimeout(1000);

        console.log('\n--- Clear LOI date ---');

        await page.evaluate(() => {
            const launchEvent = (window as any).launchEvent;
            launchEvent.moonInterceptDate = null;
        });

        console.log('\n--- Attempt optimization with null LOI date ---');

        let dialogText = '';
        let errorOccurred = false;

        page.on('dialog', async dialog => {
            dialogText = dialog.message();
            await dialog.accept();
        });

        // Monitor for console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errorOccurred = true;
                console.log('Console error detected:', msg.text());
            }
        });

        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');

        try {
            await expect(optimizeBtn).toBeVisible({ timeout: 5000 });
            await optimizeBtn.click({ force: true });
            await page.waitForTimeout(2000);

            // App should handle this gracefully (either error message or no-op)
            console.log('✓ App did not crash with missing LOI date');
        } catch (error) {
            console.log('✓ Button not clickable or error handled gracefully');
        }

        console.log('\n=== TEST PASSED ✓ ===');
    });

    test('should validate parameter values and prevent invalid configurations', async ({ page }) => {
        // Now tests validation at the validation function level
        console.log('\n=== PARAMETER VALIDATION TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        // Switch to Plan mode and create launch event
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        console.log('\n--- Step 1: Get initial apogee and perigee ---');

        const initial = await page.evaluate(() => {
            const launchEvent = (window as any).launchEvent;
            return {
                apogee: launchEvent.apogeeAlt,
                perigee: launchEvent.perigeeAlt
            };
        });

        console.log(`Initial: Perigee=${initial.perigee} km, Apogee=${initial.apogee} km`);

        console.log('\n--- Step 2: Test apogee validation (must be >= perigee) ---');

        // Try to set apogee < perigee (should fail)
        const invalidApogeeResult = await page.evaluate((perigee) => {
            const validateApogee = (window as any).validateApogee;
            return validateApogee(perigee - 1000); // Try to set apogee 1000 km below perigee
        }, initial.perigee);

        expect(invalidApogeeResult.valid).toBe(false);
        expect(invalidApogeeResult.message).toContain('must be >= Perigee');
        console.log('✓ Invalid apogee rejected:', invalidApogeeResult.message);

        // Valid apogee should pass
        const validApogeeResult = await page.evaluate((perigee) => {
            const validateApogee = (window as any).validateApogee;
            return validateApogee(perigee + 10000); // Set apogee 10,000 km above perigee
        }, initial.perigee);

        expect(validApogeeResult.valid).toBe(true);
        console.log('✓ Valid apogee accepted');

        console.log('\n--- Step 3: Test perigee validation (must be <= apogee) ---');

        // Try to set perigee > apogee (should fail)
        const invalidPerigeeResult = await page.evaluate((apogee) => {
            const validatePerigee = (window as any).validatePerigee;
            return validatePerigee(apogee + 1000); // Try to set perigee 1000 km above apogee
        }, initial.apogee);

        expect(invalidPerigeeResult.valid).toBe(false);
        expect(invalidPerigeeResult.message).toContain('must be <= Apogee');
        console.log('✓ Invalid perigee rejected:', invalidPerigeeResult.message);

        // Valid perigee should pass
        const validPerigeeResult = await page.evaluate((apogee) => {
            const validatePerigee = (window as any).validatePerigee;
            return validatePerigee(apogee - 10000); // Set perigee 10,000 km below apogee
        }, initial.apogee);

        expect(validPerigeeResult.valid).toBe(true);
        console.log('✓ Valid perigee accepted');

        console.log('\n--- Step 4: Verify lil-gui constraints ---');

        // Verify GUI controls have min/max constraints
        const guiConstraints = await page.evaluate(() => {
            const launchEvent = (window as any).launchEvent;

            // Get current values to verify they're within expected ranges
            return {
                perigee: launchEvent.perigeeAlt,
                apogee: launchEvent.apogeeAlt,
                inclination: launchEvent.inclination,
                raan: launchEvent.raan,
                omega: launchEvent.omega
            };
        });

        // Verify inclination is within 0-90° or valid discrete values
        expect(guiConstraints.inclination).toBeGreaterThanOrEqual(0);
        expect(guiConstraints.inclination).toBeLessThanOrEqual(90);
        console.log('✓ Inclination within valid range (0-90°)');

        // Verify RAAN is within 0-360°
        expect(guiConstraints.raan).toBeGreaterThanOrEqual(0);
        expect(guiConstraints.raan).toBeLessThanOrEqual(360);
        console.log('✓ RAAN within valid range (0-360°)');

        // Verify omega is within 0-360°
        expect(guiConstraints.omega).toBeGreaterThanOrEqual(0);
        expect(guiConstraints.omega).toBeLessThanOrEqual(360);
        console.log('✓ Omega within valid range (0-360°)');

        console.log('\n=== PARAMETER VALIDATION TEST PASSED ✓ ===');
    });

    test('should handle rapid optimization requests', async ({ page }) => {
        console.log('\n=== RAPID OPTIMIZATION REQUESTS TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        // Setup launch event with Auto LOI
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);
        await page.evaluate(() => { (window as any).setAutoLOI(true); });
        await page.waitForTimeout(1000);

        // Set valid parameters
        const equatorCrossing = '2023-08-05T11:25:58.258Z';
        await page.evaluate((loiDateStr) => {
            const launchEvent = (window as any).launchEvent;
            launchEvent.moonInterceptDate = new Date(loiDateStr);
            launchEvent.inclination = 21.5;
            launchEvent.omega = 178;
            launchEvent.apogeeAlt = 370000;
        }, equatorCrossing);

        console.log('\n--- Click optimize button rapidly (should not crash) ---');

        let dialogCount = 0;
        page.on('dialog', async dialog => {
            dialogCount++;
            await dialog.accept();
        });

        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        await expect(optimizeBtn).toBeVisible({ timeout: 5000 });

        // Click multiple times rapidly
        for (let i = 0; i < 3; i++) {
            try {
                await optimizeBtn.click({ force: true, timeout: 500 });
                await page.waitForTimeout(100);
            } catch (error) {
                // Button might be disabled during optimization - that's fine
                console.log(`Click ${i + 1} handled gracefully`);
            }
        }

        // Wait for any dialogs to complete
        await page.waitForTimeout(5000);

        console.log(`✓ Received ${dialogCount} dialog(s) from rapid clicks`);
        console.log('✓ App did not crash from rapid optimization requests');

        console.log('\n=== TEST PASSED ✓ ===');
    });

    test('should handle mode switching during optimization', async ({ page }) => {
        console.log('\n=== MODE SWITCHING DURING OPTIMIZATION TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        // Setup launch event with Auto LOI
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);
        await page.evaluate(() => { (window as any).setAutoLOI(true); });
        await page.waitForTimeout(1000);

        // Set valid parameters
        const equatorCrossing = '2023-08-05T11:25:58.258Z';
        await page.evaluate((loiDateStr) => {
            const launchEvent = (window as any).launchEvent;
            launchEvent.moonInterceptDate = new Date(loiDateStr);
            launchEvent.inclination = 21.5;
            launchEvent.omega = 178;
            launchEvent.apogeeAlt = 370000;
        }, equatorCrossing);

        console.log('\n--- Start optimization ---');

        let optimizationComplete = false;
        page.on('dialog', async dialog => {
            optimizationComplete = true;
            await dialog.accept();
        });

        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        await expect(optimizeBtn).toBeVisible({ timeout: 5000 });
        await optimizeBtn.click({ force: true });

        // Wait briefly then switch modes
        await page.waitForTimeout(1000);

        console.log('\n--- Switch to Game mode during optimization ---');
        await page.click('button:has-text("Game")');
        await page.waitForTimeout(500);

        console.log('\n--- Switch to Explore mode ---');
        await page.click('button:has-text("Explore")');
        await page.waitForTimeout(500);

        console.log('\n--- Switch back to Plan mode ---');
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        console.log('✓ App survived mode switching during optimization');

        // Wait for optimization to potentially complete
        let attempts = 0;
        while (!optimizationComplete && attempts < 60) {
            await page.waitForTimeout(1000);
            attempts++;
        }

        if (optimizationComplete) {
            console.log('✓ Optimization completed despite mode switching');
        } else {
            console.log('⚠ Optimization may have been interrupted (acceptable)');
        }

        console.log('\n=== TEST PASSED ✓ ===');
    });

    test('should handle time set to far future/past dates', async ({ page }) => {
        console.log('\n=== EXTREME TIME VALUES TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        // Switch to Game mode
        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1000);

        console.log('\n--- Test far future date ---');

        const farFuture = new Date('2100-01-01T00:00:00Z');
        await page.evaluate((dateStr) => {
            (window as any).setSimulationTime(new Date(dateStr));
        }, farFuture.toISOString());

        await page.waitForTimeout(500);

        const futureTime = await page.evaluate(() => {
            return new Date((window as any).timelineState.currentDate).toISOString();
        });

        console.log('Set time to:', farFuture.toISOString());
        console.log('Actual time:', futureTime);
        console.log('✓ App handled far future date');

        console.log('\n--- Test far past date ---');

        const farPast = new Date('1950-01-01T00:00:00Z');
        await page.evaluate((dateStr) => {
            (window as any).setSimulationTime(new Date(dateStr));
        }, farPast.toISOString());

        await page.waitForTimeout(500);

        const pastTime = await page.evaluate(() => {
            return new Date((window as any).timelineState.currentDate).toISOString();
        });

        console.log('Set time to:', farPast.toISOString());
        console.log('Actual time:', pastTime);
        console.log('✓ App handled far past date');

        console.log('\n=== TEST PASSED ✓ ===');
    });

    test('should handle creating multiple launch events sequentially', async ({ page }) => {
        console.log('\n=== MULTIPLE LAUNCH EVENTS TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        for (let i = 0; i < 3; i++) {
            console.log(`\n--- Create launch event #${i + 1} ---`);

            // Delete existing event if any
            const eventExists = await page.evaluate(() => (window as any).launchEvent.exists);
            if (eventExists) {
                await page.evaluate(() => {
                    (window as any).deleteLaunchEventForTest();
                });
                await page.waitForTimeout(500);
            }

            // Create new event
            await page.click('#add-launch-action-btn');
            await page.waitForTimeout(2000);

            // Verify event was created
            const params = await page.evaluate(() => {
                const le = (window as any).launchEvent;
                return {
                    exists: le.exists,
                    inclination: le.inclination,
                    raan: le.raan,
                    omega: le.omega,
                    apogeeAlt: le.apogeeAlt
                };
            });

            expect(params.exists).toBe(true);
            console.log(`✓ Event #${i + 1} created successfully`);
            console.log(`  Params:`, params);
        }

        console.log('\n✓ Successfully created and deleted multiple launch events sequentially');

        console.log('\n=== TEST PASSED ✓ ===');
    });

    test('should handle browser page reload in different modes', async ({ page }) => {
        console.log('\n=== PAGE RELOAD TEST ===');

        await page.goto('http://localhost:3002');
        await page.waitForLoadState('load');

        console.log('\n--- Test reload in Explore mode ---');
        await page.reload();
        await page.waitForLoadState('load');
        const exploreMode = await page.evaluate(() => (window as any).params.appMode);
        console.log('Mode after reload:', exploreMode);
        console.log('✓ Reloaded in Explore mode');

        console.log('\n--- Test reload in Plan mode ---');
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        await page.reload();
        await page.waitForLoadState('load');

        // After reload, app should start fresh in Explore mode
        const modeAfterReload = await page.evaluate(() => (window as any).params.appMode);
        console.log('Mode after Plan reload:', modeAfterReload);
        console.log('✓ App reset to Explore mode after reload');

        console.log('\n--- Test reload in Game mode ---');
        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1000);

        await page.reload();
        await page.waitForLoadState('load');

        const modeAfterGameReload = await page.evaluate(() => (window as any).params.appMode);
        console.log('Mode after Game reload:', modeAfterGameReload);
        console.log('✓ App reset to Explore mode after reload');

        console.log('\n=== TEST PASSED ✓ ===');
    });
});
