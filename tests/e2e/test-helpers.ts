import type { Page } from '@playwright/test';

export async function gotoApp(page: Page, mode?: 'Explore' | 'Plan' | 'Game'): Promise<void> {
    await page.addInitScript(() => { (window as any).__E2E_TESTING__ = true; });

    // Route to the appropriate app based on mode
    let url = 'http://localhost:3002';
    if (mode === 'Explore') {
        url += '/explorer.html';
    } else if (mode === 'Plan' || mode === 'Game') {
        url += '/designer.html';
    } else {
        // Default to old three-mode app (index-old.html) for backward compatibility
        url += '/index-old.html';
    }

    await page.goto(url);
    await page.waitForLoadState('load');
}

export async function waitForAppMode(page: Page, mode: 'Explore' | 'Plan' | 'Game'): Promise<void> {
    await page.waitForFunction(expectedMode => {
        return (window as any).params?.appMode === expectedMode;
    }, mode);
}

export async function waitForLaunchEvent(page: Page): Promise<void> {
    await page.waitForFunction(() => {
        const launchEvent = (window as any).launchEvent;
        return !!launchEvent && launchEvent.exists === true;
    });
}

export async function waitForAutoLOI(page: Page, enabled: boolean): Promise<void> {
    await page.waitForFunction(expected => {
        const launchEvent = (window as any).launchEvent;
        return !!launchEvent && launchEvent.autoLOI === expected;
    }, enabled);
}
