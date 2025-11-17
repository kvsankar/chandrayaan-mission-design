import { test, expect } from '@playwright/test';

test.describe('Simple Auto Optimize Test', () => {
    test('should run auto optimize with default values', async ({ page }) => {
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

        // Set LOI date to test value
        const loiDateInput = page.locator('input[title="Lunar Orbit Insertion"]');
        await loiDateInput.fill('2023-08-05T11:25');
        await page.waitForTimeout(1000);

        // Find Auto Optimize button
        const optimizeBtn = page.locator('button:has-text("Auto Optimize RAAN & Apogee")');
        await expect(optimizeBtn).toBeVisible({ timeout: 5000 });

        // Set up dialog handler BEFORE clicking (to capture any alert)
        let dialogText = '';
        page.on('dialog', async dialog => {
            dialogText = dialog.message();
            console.log('Dialog received:', dialogText.substring(0, 100) + '...');
            await dialog.accept();
        });

        // Click optimize button (might take a long time to run optimization)
        await optimizeBtn.click({force: true});
        console.log('Clicked Auto Optimize button, waiting for result...');

        // Wait for dialog text to be populated (dialog handler will accept it)
        let attempts = 0;
        while (dialogText === '' && attempts < 360) { // 3 minutes max (360 * 0.5s)
            await page.waitForTimeout(500);
            attempts++;
        }

        if (dialogText === '') {
            throw new Error('No dialog appeared after 3 minutes');
        }

        const alertText = dialogText;

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
