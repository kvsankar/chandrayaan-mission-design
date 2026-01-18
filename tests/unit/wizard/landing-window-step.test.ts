/**
 * LandingWindowStep Component Tests
 *
 * Tests that the LandingWindowStep component can be instantiated and renders
 * without runtime errors. This catches issues like missing functions,
 * incorrect API usage, etc.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LandingWindowStep } from '../../../src/wizard/steps/LandingWindowStep.js';
import { findLandingWindowsWithRaan, calculateRequiredRaan, findLunarDays } from '../../../src/wizard/calculations/sunElevation.js';

describe('LandingWindowStep Component', () => {
    let container: HTMLElement;

    beforeEach(() => {
        // Create container element (happy-dom provides document)
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    it('should instantiate without throwing errors', () => {
        expect(() => {
            const step = new LandingWindowStep({
                container,
                siteName: 'Shiv Shakti',
                siteLatitude: -69.3733,
                siteLongitude: 32.3191,
                explorationStartDate: new Date('2023-03-01'),
                explorationEndDate: new Date('2023-10-31')
            });
            step.dispose();
        }).not.toThrow();
    });

    it('should render timeline with lunar day segments', () => {
        const step = new LandingWindowStep({
            container,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-03-01'),
            explorationEndDate: new Date('2023-10-31')
        });

        // Check that timeline elements exist
        const timelineTrack = container.querySelector('.timeline-track');
        expect(timelineTrack).not.toBeNull();

        // Check that day segments exist (should have ~8 lunar days for Mar-Oct 2023)
        const daySegments = container.querySelectorAll('.timeline-segment.day');
        expect(daySegments.length).toBeGreaterThan(0);

        step.dispose();
    });

    it('should be invalid when no lunar day is selected', () => {
        const step = new LandingWindowStep({
            container,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-03-01'),
            explorationEndDate: new Date('2023-10-31')
        });

        expect(step.isValid()).toBe(false);
        expect(step.getSelectedLunarDay()).toBeNull();

        step.dispose();
    });
});

describe('Lunar Day Cycles', () => {
    it('should find lunar days for CY3 site', () => {
        const days = findLunarDays(
            { latitude: -69.3733, longitude: 32.3191 },
            new Date('2023-03-01'),
            new Date('2023-10-31')
        );

        // Should have ~8 lunar days for Mar-Oct 2023
        expect(days.length).toBeGreaterThanOrEqual(7);
        expect(days.length).toBeLessThanOrEqual(9);

        // Each day should have sunrise, sunset, peakTime, peakElevation
        for (const day of days) {
            expect(day.sunrise).toBeInstanceOf(Date);
            expect(day.sunset).toBeInstanceOf(Date);
            expect(day.peakTime).toBeInstanceOf(Date);
            expect(typeof day.peakElevation).toBe('number');
            expect(day.isDay).toBe(true);
        }
    });

    it('should have lunar days with positive duration', () => {
        const days = findLunarDays(
            { latitude: -69.3733, longitude: 32.3191 },
            new Date('2023-08-01'),
            new Date('2023-09-30')
        );

        expect(days.length).toBeGreaterThan(0);

        for (const day of days) {
            const durationMs = day.sunset.getTime() - day.sunrise.getTime();
            const durationDays = durationMs / (1000 * 60 * 60 * 24);
            // Polar regions have variable day lengths - can be very short or very long
            // depending on season and exact location. Just verify positive duration.
            expect(durationDays).toBeGreaterThan(0);
            // Sunrise should always be before sunset
            expect(day.sunrise.getTime()).toBeLessThan(day.sunset.getTime());
        }
    });
});

describe('Required RAAN Calculation', () => {
    it('should calculate RAAN without throwing errors', () => {
        expect(() => {
            const raan = calculateRequiredRaan(32.3191, new Date('2023-08-23T12:00:00Z'));
            expect(typeof raan).toBe('number');
            expect(raan).toBeGreaterThanOrEqual(0);
            expect(raan).toBeLessThan(360);
        }).not.toThrow();
    });

    it('should calculate RAAN for CY3 landing date close to expected value (~262°)', () => {
        // CY3 paper states required RAAN for Aug 23 landing was ~262°
        const raan = calculateRequiredRaan(32.3191, new Date('2023-08-23T12:00:00Z'));

        // Allow some tolerance since exact time affects the value
        expect(raan).toBeGreaterThan(240);
        expect(raan).toBeLessThan(290);
    });
});

describe('findLandingWindowsWithRaan', () => {
    it('should return windows with RAAN values', () => {
        const windows = findLandingWindowsWithRaan(
            { latitude: -69.3733, longitude: 32.3191 },
            new Date('2023-08-01'),
            new Date('2023-08-31')
        );

        expect(windows.length).toBeGreaterThan(0);

        // Each window should have a requiredRaan property
        for (const window of windows) {
            expect(window).toHaveProperty('requiredRaan');
            expect(typeof window.requiredRaan).toBe('number');
            expect(window.requiredRaan).toBeGreaterThanOrEqual(0);
            expect(window.requiredRaan).toBeLessThan(360);
        }
    });

    it('should find August 2023 window for CY3 site', () => {
        const windows = findLandingWindowsWithRaan(
            { latitude: -69.3733, longitude: 32.3191 },
            new Date('2023-08-01'),
            new Date('2023-08-31')
        );

        expect(windows.length).toBe(1);

        const augWindow = windows[0];
        const day = augWindow.peakTime.getUTCDate();

        // Should be around Aug 22-24
        expect(day).toBeGreaterThanOrEqual(22);
        expect(day).toBeLessThanOrEqual(24);
    });
});
