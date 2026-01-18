/**
 * Mission Design Wizard E2E Tests
 *
 * Tests the wizard flow for console errors and basic functionality.
 */

import { test, expect, ConsoleMessage } from '@playwright/test';

test.describe('Mission Design Wizard', () => {
    const consoleErrors: string[] = [];

    test.beforeEach(async ({ page }) => {
        consoleErrors.length = 0;

        // Capture console errors
        page.on('console', (msg: ConsoleMessage) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Capture page errors
        page.on('pageerror', (error) => {
            consoleErrors.push(error.message);
        });
    });

    test('should load without console errors', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        // Wait for the component to initialize
        await page.waitForTimeout(2000);

        // Filter out expected/benign errors (like 404 for optional textures, CORS for external images)
        const criticalErrors = consoleErrors.filter(err =>
            !err.includes('404') &&
            !err.includes('texture') &&
            !err.includes('favicon') &&
            !err.includes('CORS') &&
            !err.includes('svs.gsfc.nasa.gov') &&
            !err.includes('net::ERR_FAILED')
        );

        // Log any errors for debugging
        if (criticalErrors.length > 0) {
            console.log('Console errors found:', criticalErrors);
        }

        expect(criticalErrors).toHaveLength(0);
    });

    test('should display Step 1 (Mission Window) on load', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        await page.waitForTimeout(1000);

        // Check Step 1 header is visible
        await expect(page.locator('text=Step 1: Mission Time Window')).toBeVisible();

        // Check preset options are visible
        await expect(page.locator('text=Chandrayaan-3 (2023)')).toBeVisible();
        await expect(page.locator('text=Chandrayaan-2 (2019)')).toBeVisible();
        await expect(page.locator('text=Custom Range')).toBeVisible();
    });

    test('should have CY3 selected by default', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        await page.waitForTimeout(1000);

        // CY3 radio should be checked
        const cy3Radio = page.locator('input[value="cy3"]');
        await expect(cy3Radio).toBeChecked();
    });

    test('should navigate from Step 1 to Step 2', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        await page.waitForTimeout(1000);

        // Click Next button
        await page.locator('#wizard-next-btn').click();

        await page.waitForTimeout(2000);

        // Should now see Step 2 (Landing Site)
        await expect(page.locator('.landing-site-step')).toBeVisible();

        // Moon globe should be visible
        await expect(page.locator('#moon-globe-container')).toBeVisible();
    });

    test('should show breadcrumb navigation', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        await page.waitForTimeout(1000);

        // Breadcrumb should be visible
        await expect(page.locator('.wizard-breadcrumb')).toBeVisible();

        // Step 1 should be active
        await expect(page.locator('.breadcrumb-item.active')).toBeVisible();
    });

    test('should navigate back from Step 2 to Step 1', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        await page.waitForTimeout(1000);

        // Go to Step 2
        await page.locator('#wizard-next-btn').click();
        await page.waitForTimeout(2000);

        // Click Back button
        await page.locator('#wizard-back-btn').click();
        await page.waitForTimeout(1000);

        // Should be back at Step 1
        await expect(page.locator('text=Step 1: Mission Time Window')).toBeVisible();
    });

    test('should display Moon globe with canvas on Step 2', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        await page.waitForTimeout(1000);

        // Navigate to Step 2
        await page.locator('#wizard-next-btn').click();
        await page.waitForTimeout(2000);

        // Check that the globe container exists and has canvas
        const globeContainer = page.locator('#moon-globe-container');
        await expect(globeContainer).toBeVisible();

        const canvas = globeContainer.locator('canvas');
        await expect(canvas).toBeVisible();
    });

    test('should have preset sites dropdown on Step 2', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        await page.waitForTimeout(1000);

        // Navigate to Step 2
        await page.locator('#wizard-next-btn').click();
        await page.waitForTimeout(2000);

        // Check primary site dropdown has options
        const primarySelect = page.locator('#primary-site-select');
        await expect(primarySelect).toBeVisible();

        const options = await primarySelect.locator('option').count();
        expect(options).toBeGreaterThanOrEqual(4);  // At least 3 CY3 sites + default option + crosshair option
    });

    test('should select preset site on Step 2', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        await page.waitForTimeout(1000);

        // Navigate to Step 2
        await page.locator('#wizard-next-btn').click();
        await page.waitForTimeout(2000);

        // Select Shiv Shakti from primary site dropdown
        await page.locator('#primary-site-select').selectOption('cy3-actual');
        await page.waitForTimeout(500);

        // Check that primary site was set (shown in display area)
        const primaryDisplay = page.locator('#primary-display');
        await expect(primaryDisplay).toContainText('Shiv Shakti');
    });

    test('should show placeholder for Step 3', async ({ page }) => {
        await page.goto('/src/wizard/demo.html');

        await page.waitForTimeout(1000);

        // Navigate to Step 2
        await page.locator('#wizard-next-btn').click();
        await page.waitForTimeout(2000);

        // Select a site first (required for Step 2 validation)
        await page.locator('#primary-site-select').selectOption('cy3-actual');
        await page.waitForTimeout(500);

        // Navigate to Step 3
        await page.locator('#wizard-next-btn').click();
        await page.waitForTimeout(1000);

        // Should see placeholder for Step 3
        await expect(page.locator('text=Step 3: Landing Window')).toBeVisible();
        await expect(page.locator('text=This step will be implemented')).toBeVisible();
    });
});
