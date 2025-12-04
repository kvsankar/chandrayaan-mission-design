import { test, expect } from '@playwright/test';
import { gotoApp, waitForAppMode, waitForAutoLOI, waitForLaunchEvent } from './test-helpers';

test.describe('Simple Auto Optimize Test', () => {
    test('should run auto optimize with default values', async ({ page }) => {
        test.setTimeout(120000); // Optimization can legitimately run for tens of seconds
        // Navigate to app
        await gotoApp(page);

        // Listen to console logs and errors
        const logs: string[] = [];
        const errors: string[] = [];
        page.on('console', msg => {
            logs.push(msg.text());
            if (msg.type() === 'error') {
                errors.push(msg.text());
                console.log('BROWSER ERROR:', msg.text());
            }
        });
        page.on('pageerror', error => {
            errors.push(error.message);
            console.log('PAGE ERROR:', error.message);
        });

        // Switch to Plan mode
        await page.click('button:has-text("Plan")');
        await waitForAppMode(page, 'Plan');

        // Add launch event
        await page.click('#add-launch-action-btn');
        await waitForLaunchEvent(page);

        // Enable Auto LOI
        await page.evaluate(() => { (window as any).setAutoLOI(true); });
        await waitForAutoLOI(page, true);

        // Set LOI date to test value
        const loiDateInput = page.locator('input[title="Lunar Orbit Insertion"]');
        await loiDateInput.fill('2023-08-05T11:25');

        // Find Auto Optimize button
        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        await expect(optimizeBtn).toBeVisible({ timeout: 5000 });

        await expect(optimizeBtn).toBeEnabled({ timeout: 60000 });

        const alertText = await page.evaluate(() => {
            const trigger = (window as any).triggerAutoOptimizeForTest;
            if (typeof trigger === 'function') {
                return trigger();
            }
            throw new Error('triggerAutoOptimizeForTest not available');
        });
        console.log('Auto optimize output:', alertText.substring(0, 100) + '...');

        console.log('\n=== ALERT MESSAGE ===');
        console.log(alertText);
        console.log('=== END ALERT ===\n');

        // Extract distance
        const distanceMatch = alertText.match(/Closest approach: ([\d.]+) km/);
        if (!distanceMatch) {
            throw new Error('Could not find distance in alert: ' + alertText);
        }

        const distance = parseFloat(distanceMatch[1]);
        console.log('Optimized distance:', distance, 'km');

        // Extract RAAN
        const raanMatch = alertText.match(/Optimal RAAN: ([\d.]+)/);
        if (raanMatch) {
            console.log('Optimal RAAN:', raanMatch[1], '°');
        }

        // Extract Apogee
        const apogeeMatch = alertText.match(/Optimal Apogee: ([\d.]+) km/);
        if (apogeeMatch) {
            console.log('Optimal Apogee:', apogeeMatch[1], 'km');
        }

        // Check relevant console logs
        console.log('\n=== RELEVANT CONSOLE LOGS ===');
        logs.filter(log =>
            log.includes('Multi-start') ||
            log.includes('best') ||
            log.includes('RAAN') ||
            log.includes('Apogee') ||
            log.includes('optimization')
        ).forEach(log => console.log(log));

        // Verify distance is reasonable
        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThan(100000); // Should be much less than 100,000 km

        console.log('\n✓ Test passed! Optimization achieved', distance, 'km');
    });
});
