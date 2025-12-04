import type { Page } from '@playwright/test';

export async function gotoApp(page: Page): Promise<void> {
    await page.addInitScript(() => { (window as any).__E2E_TESTING__ = true; });
    await page.goto('http://localhost:3002');
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
