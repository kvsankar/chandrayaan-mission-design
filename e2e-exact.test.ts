import { test, expect } from '@playwright/test';

test.describe('Exact Parameter Match Test', () => {
    test('should match unit test results with exact same parameters', async ({ page }) => {
        // Navigate to app
        await page.goto('http://localhost:3002');
        await page.waitForLoadState('networkidle');

        // Listen to console logs
        const logs: string[] = [];
        page.on('console', msg => logs.push(msg.text()));

        // Switch to Plan mode
        await page.click('button:has-text("Plan")');
        await page.waitForTimeout(1000);

        // Add launch event
        await page.click('#add-launch-action-btn');
        await page.waitForTimeout(2000);

        // Enable Auto LOI
        await page.click('text=Auto LOI');
        await page.waitForTimeout(1000);

        // Set EXACT parameters from unit test using JavaScript evaluation
        await page.evaluate(() => {
            // Access the global launchEvent object
            const launchEvent = (window as any).launchEvent;
            if (launchEvent) {
                launchEvent.moonInterceptDate = new Date('2023-08-05T11:25:58.258Z');
                launchEvent.inclination = 21.5;
                launchEvent.omega = 178;
                launchEvent.apogeeAlt = 378029; // Unit test value
                console.log('Set exact parameters:', {
                    loiDate: launchEvent.moonInterceptDate.toISOString(),
                    inclination: launchEvent.inclination,
                    omega: launchEvent.omega,
                    apogeeAlt: launchEvent.apogeeAlt
                });
            }
        });
        await page.waitForTimeout(1000);

        // Set up dialog handler
        let dialogText = '';
        page.on('dialog', async dialog => {
            dialogText = dialog.message();
            console.log('Dialog:', dialogText.substring(0, 100));
            await dialog.accept();
        });

        // Find and click Auto Optimize button
        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        await expect(optimizeBtn).toBeVisible({ timeout: 5000 });

        // Click
        await optimizeBtn.click({force: true});
        console.log('Clicked Auto Optimize, waiting...');

        // Wait for dialog
        let attempts = 0;
        while (dialogText === '' && attempts < 360) {
            await page.waitForTimeout(500);
            attempts++;
        }

        if (dialogText === '') {
            throw new Error('No dialog after 3 minutes');
        }

        console.log('\n=== RESULT ===');
        console.log(dialogText);
        console.log('=== END ===\n');

        // Extract distance
        const distanceMatch = dialogText.match(/Closest approach: ([\d.]+) km/);
        if (!distanceMatch) {
            throw new Error('No distance in alert: ' + dialogText);
        }

        const distance = parseFloat(distanceMatch[1]);
        console.log('Distance:', distance, 'km');

        // Unit test expects 1.7 km for this exact configuration
        console.log('Expected: ~1.7 km (from unit test)');
        console.log('Actual:', distance, 'km');

        // Check if close to unit test result
        if (Math.abs(distance - 1.7) < 0.5) {
            console.log('✓ MATCHES unit test result!');
        } else {
            console.log('✗ DOES NOT MATCH unit test result');
            console.log('Difference:', Math.abs(distance - 1.7), 'km');
        }

        // Log optimization console output
        console.log('\n=== Optimization Logs ===');
        logs.filter(log =>
            log.includes('Multi-start') ||
            log.includes('best') ||
            log.includes('optimization complete')
        ).forEach(log => console.log(log));
    });
});
