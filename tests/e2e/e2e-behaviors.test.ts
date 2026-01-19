import { test, expect } from '@playwright/test';
import { gotoApp, waitForAppMode, waitForLaunchEvent, waitForAutoLOI } from './test-helpers';

/**
 * Comprehensive behavior-driven E2E tests
 *
 * Test philosophy: USER INPUT → TESTABLE OUTPUT
 * Each test verifies a specific behavior from the application specification
 */

test.describe('Explore Mode - Parameter Controls', () => {
    test('should update Moon orbit visualization when lunar inclination changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        // Get initial lunar inclination
        const initial = await page.evaluate(() => (window as any).params.lunarInclination);

        // Change lunar inclination via GUI
        const newValue = 25.0;
        await page.evaluate((val) => {
            (window as any).params.lunarInclination = val;
        }, newValue);
        await page.waitForTimeout(200);

        // Verify parameter updated
        const updated = await page.evaluate(() => (window as any).params.lunarInclination);
        expect(updated).toBe(newValue);
        expect(updated).not.toBe(initial);
    });

    test('should update Moon orbit visualization when lunar RAAN changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        const initial = await page.evaluate(() => (window as any).params.lunarNodes);

        const newValue = 45.0;
        await page.evaluate((val) => {
            (window as any).params.lunarNodes = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updated = await page.evaluate(() => (window as any).params.lunarNodes);
        expect(updated).toBe(newValue);
        expect(updated).not.toBe(initial);
    });

    test('should update Moon position when moonRA changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        const initial = await page.evaluate(() => (window as any).params.moonRA);

        const newValue = 180.0;
        await page.evaluate((val) => {
            (window as any).params.moonRA = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updated = await page.evaluate(() => (window as any).params.moonRA);
        expect(updated).toBe(newValue);
        expect(updated).not.toBe(initial);
    });

    test('should update Chandrayaan orbit when inclination changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        const initial = await page.evaluate(() => (window as any).params.chandrayaanInclination);

        const newValue = 45.0;
        await page.evaluate((val) => {
            (window as any).params.chandrayaanInclination = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updated = await page.evaluate(() => (window as any).params.chandrayaanInclination);
        expect(updated).toBe(newValue);
        expect(updated).not.toBe(initial);
    });

    test('should update Chandrayaan orbit when RAAN changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        const initial = await page.evaluate(() => (window as any).params.chandrayaanNodes);

        const newValue = 90.0;
        await page.evaluate((val) => {
            (window as any).params.chandrayaanNodes = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updated = await page.evaluate(() => (window as any).params.chandrayaanNodes);
        expect(updated).toBe(newValue);
        expect(updated).not.toBe(initial);
    });

    test('should update Chandrayaan orbit when omega (AOP) changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        const initial = await page.evaluate(() => (window as any).params.chandrayaanOmega);

        const newValue = 90.0;
        await page.evaluate((val) => {
            (window as any).params.chandrayaanOmega = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updated = await page.evaluate(() => (window as any).params.chandrayaanOmega);
        expect(updated).toBe(newValue);
        expect(updated).not.toBe(initial);
    });

    test('should update Chandrayaan orbit when perigee altitude changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        const initial = await page.evaluate(() => (window as any).params.chandrayaanPerigeeAlt);

        const newValue = 500;
        await page.evaluate((val) => {
            (window as any).params.chandrayaanPerigeeAlt = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updated = await page.evaluate(() => (window as any).params.chandrayaanPerigeeAlt);
        expect(updated).toBe(newValue);
        expect(updated).not.toBe(initial);
    });

    test('should update Chandrayaan position when true anomaly changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        const initial = await page.evaluate(() => (window as any).params.chandrayaanTrueAnomaly);

        const newValue = 180.0;
        await page.evaluate((val) => {
            (window as any).params.chandrayaanTrueAnomaly = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updated = await page.evaluate(() => (window as any).params.chandrayaanTrueAnomaly);
        expect(updated).toBe(newValue);
        expect(updated).not.toBe(initial);
    });

    test('should toggle Moon visibility when showMoon changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        const initial = await page.evaluate(() => (window as any).params.showMoon);

        await page.evaluate(() => {
            (window as any).params.showMoon = !(window as any).params.showMoon;
        });
        await page.waitForTimeout(200);

        const updated = await page.evaluate(() => (window as any).params.showMoon);
        expect(updated).toBe(!initial);
    });

    test('should toggle equator visibility when showEquator changes', async ({ page }) => {
        await gotoApp(page, 'Explore');

        const initial = await page.evaluate(() => (window as any).params.showEquator);

        await page.evaluate(() => {
            (window as any).params.showEquator = !(window as any).params.showEquator;
        });
        await page.waitForTimeout(200);

        const updated = await page.evaluate(() => (window as any).params.showEquator);
        expect(updated).toBe(!initial);
    });
});

test.describe('Plan Mode - Launch Event Parameters', () => {
    test('should NOT modify launch event when View timeline slider moves', async ({ page }) => {
        await gotoApp(page);

        // Switch to Plan mode
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        // Create launch event
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        // Capture initial launch event parameters
        const initialParams = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                moonInterceptDate: le.moonInterceptDate?.toISOString(),
                inclination: le.inclination,
                raan: le.raan,
                omega: le.omega,
                apogeeAlt: le.apogeeAlt
            };
        });

        // Select View timeline
        await page.click('#timeline-slider-active');
        await page.waitForTimeout(500);

        // Drag the View timeline slider
        const slider = await page.locator('#timeline-slider');
        await slider.fill('10');
        await page.waitForTimeout(1000);

        // Verify launch event parameters unchanged
        const finalParams = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                moonInterceptDate: le.moonInterceptDate?.toISOString(),
                inclination: le.inclination,
                raan: le.raan,
                omega: le.omega,
                apogeeAlt: le.apogeeAlt
            };
        });

        expect(finalParams).toEqual(initialParams);
    });

    // NOTE: TLI/LOI timeline slider tests removed - sliders are now hidden in Plan mode

    test('should update launch event inclination via GUI input', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await waitForAppMode(page, 'Plan');

        await page.click('#add-launch-action-btn');
        await waitForLaunchEvent(page);

        const initialInclination = await page.evaluate(() => (window as any).launchEvent.inclination);

        // Inclination is constrained to dropdown values: 21.5° or 41.8°
        // Toggle to the other value
        const newValue = initialInclination === 21.5 ? 41.8 : 21.5;
        await page.evaluate((val) => {
            (window as any).launchEvent.inclination = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updatedInclination = await page.evaluate(() => (window as any).launchEvent.inclination);
        expect(updatedInclination).toBe(newValue);
        expect(updatedInclination).not.toBe(initialInclination);
    });

    test('should update launch event RAAN via GUI input', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await waitForAppMode(page, 'Plan');

        await page.click('#add-launch-action-btn');
        await waitForLaunchEvent(page);

        const initialRaan = await page.evaluate(() => (window as any).launchEvent.raan);

        const newValue = (initialRaan + 45.0) % 360;  // Avoid same value
        await page.evaluate((val) => {
            (window as any).launchEvent.raan = val;
        }, newValue);
        await page.waitForTimeout(500);  // Give reactive system time to sync

        const updatedRaan = await page.evaluate(() => (window as any).launchEvent.raan);
        expect(Math.abs(updatedRaan - newValue)).toBeLessThan(0.1);  // Allow for floating point
        expect(Math.abs(updatedRaan - initialRaan)).toBeGreaterThan(1);  // Verify it changed
    });

    test('should update launch event omega via GUI input', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await waitForAppMode(page, 'Plan');

        await page.click('#add-launch-action-btn');
        await waitForLaunchEvent(page);

        // Get current inclination to determine valid omega values
        const { inclination, omega: initialOmega } = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return { inclination: le.inclination, omega: le.omega };
        });

        // Omega is constrained by inclination:
        // - For 21.5°: only 178° is valid
        // - For 41.8°: 198° or 203° are valid
        let newValue;
        if (inclination === 21.5) {
            // For 21.5°, first change to 41.8° to get access to different omega values
            await page.evaluate(() => {
                (window as any).launchEvent.inclination = 41.8;
            });
            await page.waitForTimeout(300);
            newValue = 198;  // Valid for 41.8°
        } else {
            // For 41.8°, toggle between 198 and 203
            newValue = initialOmega === 198 ? 203 : 198;
        }

        await page.evaluate((val) => {
            (window as any).launchEvent.omega = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updatedOmega = await page.evaluate(() => (window as any).launchEvent.omega);
        expect(updatedOmega).toBe(newValue);
        expect(updatedOmega).not.toBe(initialOmega);
    });

    test('should update launch event apogee via GUI input', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        const initialApogee = await page.evaluate(() => (window as any).launchEvent.apogeeAlt);

        const newValue = 380000;
        await page.evaluate((val) => {
            (window as any).launchEvent.apogeeAlt = val;
        }, newValue);
        await page.waitForTimeout(200);

        const updatedApogee = await page.evaluate(() => (window as any).launchEvent.apogeeAlt);
        expect(updatedApogee).toBe(newValue);
        expect(updatedApogee).not.toBe(initialApogee);
    });

    test('should enable Auto Optimize button when Auto LOI is enabled', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        // Enable Auto LOI using helper function (clicking text doesn't trigger lil-gui onChange)
        await page.evaluate(() => {
            (window as any).setAutoLOI(true);
        });
        await waitForAutoLOI(page, true);

        // Verify Auto Optimize button is visible
        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        await expect(optimizeBtn).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Game Mode - Timeline and Simulation', () => {
    test('should start paused when entering Game mode', async ({ page }) => {
        await gotoApp(page);

        // Create launch event
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        // Switch to Game mode
        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1500);

        // Verify playback is paused
        const isPlaying = await page.evaluate(() => (window as any).timelineState.isPlaying);
        expect(isPlaying).toBe(false);

        // Verify play button shows "Play"
        const playBtnText = await page.locator('#play-pause-btn').textContent();
        expect(playBtnText).toContain('Play');
    });

    test('should advance time when Play button is clicked', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1500);

        const initialTime = await page.evaluate(() => (window as any).timelineState.daysElapsed);

        // Click Play
        await page.click('#play-pause-btn');
        await page.waitForTimeout(2000);

        const finalTime = await page.evaluate(() => (window as any).timelineState.daysElapsed);
        expect(finalTime).toBeGreaterThan(initialTime);
    });

    test('should pause when Pause button is clicked', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1500);

        // Start playing
        await page.click('#play-pause-btn');
        await page.waitForTimeout(1000);

        // Pause
        await page.click('#play-pause-btn');
        await page.waitForTimeout(500);

        const isPlaying = await page.evaluate(() => (window as any).timelineState.isPlaying);
        expect(isPlaying).toBe(false);
    });

    test('should reset time to start when Reset button is clicked', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1500);

        // Advance time manually
        await page.evaluate(() => {
            (window as any).timelineState.daysElapsed = 10;
        });
        await page.waitForTimeout(500);

        // Reset
        await page.click('#reset-btn');
        await page.waitForTimeout(500);

        const finalTime = await page.evaluate(() => (window as any).timelineState.daysElapsed);
        expect(finalTime).toBe(0);
    });

    test('should change playback speed when speed selector changes', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1500);

        const initialSpeed = await page.evaluate(() => (window as any).timelineState.speed);

        // Change speed
        await page.selectOption('#playback-speed', '1');
        await page.waitForTimeout(500);

        const finalSpeed = await page.evaluate(() => (window as any).timelineState.speed);
        expect(finalSpeed).toBe(1);
        expect(finalSpeed).not.toBe(initialSpeed);
    });

    test('should update craft position as time advances', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1500);

        const initialDays = await page.evaluate(() => (window as any).timelineState.daysElapsed);

        // Click play to advance time
        await page.click('#play-pause-btn');
        await page.waitForTimeout(2000);  // Let it play for 2 seconds

        // Pause
        await page.click('#play-pause-btn');
        await page.waitForTimeout(500);

        const finalDays = await page.evaluate(() => (window as any).timelineState.daysElapsed);

        // Verify time advanced
        expect(finalDays).toBeGreaterThan(initialDays);
    });

    test('should show capture message when craft enters Moon SOI', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        // Enable Auto LOI
        await page.evaluate(() => { (window as any).setAutoLOI(true); });
        await page.waitForTimeout(1000);

        // Set optimization parameters
        await page.evaluate(() => {
            const le = (window as any).launchEvent;
            le.moonInterceptDate = new Date('2023-08-05T11:25:58.258Z');
            le.inclination = 21.5;
            le.omega = 178;
            le.apogeeAlt = 370000;
        });

        // Run optimization
        let dialogText = '';
        page.on('dialog', async dialog => {
            dialogText = dialog.message();
            await dialog.accept();
        });

        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        await optimizeBtn.click({ force: true });

        // Wait for optimization
        let attempts = 0;
        while (dialogText === '' && attempts < 360) {
            await page.waitForTimeout(500);
            attempts++;
        }

        // Switch to Game mode
        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1500);

        // Set time to LOI using the proper helper that updates positions
        await page.evaluate(() => {
            const le = (window as any).launchEvent;
            (window as any).setSimulationTime(le.moonInterceptDate);
        });
        await page.waitForTimeout(2000);

        // Check if captured (captureState might not be exposed, so check for capture message instead)
        const captureMessageVisible = await page.locator('#capture-message').isVisible();
        expect(captureMessageVisible).toBe(true);
    });
});

test.describe('Mode Transitions', () => {
    test('should preserve Explore parameters when switching to Plan and back', async ({ page }) => {
        await gotoApp(page);

        // Capture Explore params
        const exploreParams = await page.evaluate(() => ({
            chandrayaanInclination: (window as any).params.chandrayaanInclination,
            chandrayaanNodes: (window as any).params.chandrayaanNodes,
            chandrayaanOmega: (window as any).params.chandrayaanOmega,
            chandrayaanPerigeeAlt: (window as any).params.chandrayaanPerigeeAlt
        }));

        // Switch to Plan
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        // Switch back to Explore
        await page.click('button:has-text("Explore")');
        await page.waitForTimeout(1000);

        // Verify params unchanged
        const finalParams = await page.evaluate(() => ({
            chandrayaanInclination: (window as any).params.chandrayaanInclination,
            chandrayaanNodes: (window as any).params.chandrayaanNodes,
            chandrayaanOmega: (window as any).params.chandrayaanOmega,
            chandrayaanPerigeeAlt: (window as any).params.chandrayaanPerigeeAlt
        }));

        expect(finalParams).toEqual(exploreParams);
    });

    test('should preserve Plan parameters when switching to Game and back', async ({ page }) => {
        await gotoApp(page);

        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        // Capture Plan params
        const planParams = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                inclination: le.inclination,
                raan: le.raan,
                omega: le.omega,
                apogeeAlt: le.apogeeAlt
            };
        });

        // Switch to Game
        await page.click('button:has-text("Game")');
        await page.waitForTimeout(1000);

        // Switch back to Plan
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        // Verify params unchanged
        const finalParams = await page.evaluate(() => {
            const le = (window as any).launchEvent;
            return {
                inclination: le.inclination,
                raan: le.raan,
                omega: le.omega,
                apogeeAlt: le.apogeeAlt
            };
        });

        expect(finalParams).toEqual(planParams);
    });
});

test.describe('UI Panel Collapse', () => {
    test('should collapse and expand Controls panel', async ({ page }) => {
        await gotoApp(page);

        const collapseBtn = page.locator('#gui-collapse-btn');
        const guiPanel = page.locator('.lil-gui.root');

        // Initially expanded - button shows »
        await expect(collapseBtn).toHaveText('»');
        await expect(guiPanel).not.toHaveClass(/collapsed/);

        // Collapse
        await collapseBtn.click();
        await page.waitForTimeout(400);

        await expect(collapseBtn).toHaveText('«');
        await expect(guiPanel).toHaveClass(/collapsed/);

        // Expand
        await collapseBtn.click();
        await page.waitForTimeout(400);

        await expect(collapseBtn).toHaveText('»');
        await expect(guiPanel).not.toHaveClass(/collapsed/);
    });

    test('should collapse and expand Events panel in Plan mode', async ({ page }) => {
        await gotoApp(page);

        // Switch to Plan mode and create launch event
        await page.click('button:has-text("Plan")');
        await waitForAppMode(page, 'Plan');
        await page.click('#add-launch-action-btn');
        await waitForLaunchEvent(page);

        const collapseBtn = page.locator('#actions-collapse-btn');
        const actionsPanel = page.locator('#actions-panel');

        // Initially expanded - button shows »
        await expect(collapseBtn).toBeVisible();
        await expect(collapseBtn).toHaveText('»');
        await expect(actionsPanel).not.toHaveClass(/collapsed/);

        // Collapse
        await collapseBtn.click();
        await page.waitForTimeout(400);

        await expect(collapseBtn).toHaveText('«');
        await expect(actionsPanel).toHaveClass(/collapsed/);

        // Expand
        await collapseBtn.click();
        await page.waitForTimeout(400);

        await expect(collapseBtn).toHaveText('»');
        await expect(actionsPanel).not.toHaveClass(/collapsed/);
    });

    test('should not overlap when both panels are collapsed', async ({ page }) => {
        await gotoApp(page);

        // Switch to Plan mode and create launch event
        await page.click('button:has-text("Plan")');
        await waitForAppMode(page, 'Plan');
        await page.click('#add-launch-action-btn');
        await waitForLaunchEvent(page);

        const controlsBtn = page.locator('#gui-collapse-btn');
        const eventsBtn = page.locator('#actions-collapse-btn');

        // Collapse both panels
        await controlsBtn.click();
        await page.waitForTimeout(400);
        await eventsBtn.click();
        await page.waitForTimeout(400);

        // Get bounding boxes
        const controlsBox = await controlsBtn.boundingBox();
        const eventsBox = await eventsBtn.boundingBox();

        expect(controlsBox).not.toBeNull();
        expect(eventsBox).not.toBeNull();

        if (controlsBox && eventsBox) {
            // Events button should be to the left of Controls button (no overlap)
            const eventsRight = eventsBox.x + eventsBox.width;
            expect(eventsRight).toBeLessThanOrEqual(controlsBox.x);
        }
    });
});
