/**
 * LOIDateStep Component Tests
 *
 * Tests that the LOIDateStep component can be instantiated and renders
 * without runtime errors. Also tests LOI date computation and selection.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LOIDateStep } from '../../../src/wizard/steps/LOIDateStep.js';
import { LunarDaySegment } from '../../../src/wizard/calculations/sunElevation.js';
import { findOptimalLOIDates } from '../../../src/optimization.js';

// Mock a lunar day for testing (CY3 landing window around Aug 23, 2023)
const mockLunarDay: LunarDaySegment = {
    isDay: true,
    sunrise: new Date('2023-08-23T06:00:00Z'),
    sunset: new Date('2023-09-06T18:00:00Z'),
    peakTime: new Date('2023-08-30T12:00:00Z'),
    peakElevation: 12.5
};

describe('LOIDateStep Component', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    it('should instantiate without throwing errors', () => {
        expect(() => {
            const step = new LOIDateStep({
                container,
                selectedLunarDay: mockLunarDay,
                siteName: 'Shiv Shakti',
                siteLatitude: -69.3733,
                siteLongitude: 32.3191,
                explorationStartDate: new Date('2023-08-01'),
                explorationEndDate: new Date('2023-10-31')
            });
            step.dispose();
        }).not.toThrow();
    });

    it('should render exploration timeline', () => {
        const step = new LOIDateStep({
            container,
            selectedLunarDay: mockLunarDay,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-08-01'),
            explorationEndDate: new Date('2023-10-31')
        });

        // Check exploration timeline exists
        const explorationTimeline = container.querySelector('#exploration-timeline');
        expect(explorationTimeline).not.toBeNull();

        // Check day segments exist
        const daySegments = container.querySelectorAll('.timeline-segment.day');
        expect(daySegments.length).toBeGreaterThan(0);

        step.dispose();
    });

    it('should render LOI timeline with markers', () => {
        const step = new LOIDateStep({
            container,
            selectedLunarDay: mockLunarDay,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-08-01'),
            explorationEndDate: new Date('2023-10-31')
        });

        // Check LOI timeline exists
        const loiTimeline = container.querySelector('#loi-timeline');
        expect(loiTimeline).not.toBeNull();

        // Check LOI markers exist (should have at least 1-2 crossings before landing)
        const loiMarkers = container.querySelectorAll('.loi-marker');
        expect(loiMarkers.length).toBeGreaterThan(0);
        expect(loiMarkers.length).toBeLessThanOrEqual(2); // We show max 2 LOI options

        step.dispose();
    });

    it('should render landing marker on LOI timeline', () => {
        const step = new LOIDateStep({
            container,
            selectedLunarDay: mockLunarDay,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-08-01'),
            explorationEndDate: new Date('2023-10-31')
        });

        // Check landing marker exists
        const landingMarker = container.querySelector('.landing-marker');
        expect(landingMarker).not.toBeNull();

        // Check landing label exists
        const landingLabel = container.querySelector('.landing-marker-label');
        expect(landingLabel).not.toBeNull();
        expect(landingLabel?.textContent).toBe('Landing');

        step.dispose();
    });

    it('should be invalid when no LOI date is selected', () => {
        const step = new LOIDateStep({
            container,
            selectedLunarDay: mockLunarDay,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-08-01'),
            explorationEndDate: new Date('2023-10-31')
        });

        expect(step.isValid()).toBe(false);
        expect(step.getSelectedLOIDate()).toBeNull();

        step.dispose();
    });

    it('should show node symbols (ascending/descending) on LOI markers', () => {
        const step = new LOIDateStep({
            container,
            selectedLunarDay: mockLunarDay,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-08-01'),
            explorationEndDate: new Date('2023-10-31')
        });

        // Check LOI marker labels contain node symbols
        const loiLabels = container.querySelectorAll('.loi-marker-label');
        expect(loiLabels.length).toBeGreaterThan(0);

        for (const label of loiLabels) {
            const text = label.textContent || '';
            // Should contain either ascending (☊) or descending (☋) symbol
            expect(text === '☊' || text === '☋').toBe(true);
        }

        step.dispose();
    });

    it('should mark exploration timeline segments as readonly', () => {
        const step = new LOIDateStep({
            container,
            selectedLunarDay: mockLunarDay,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-08-01'),
            explorationEndDate: new Date('2023-10-31')
        });

        // Check that day segments are marked as readonly
        const readonlySegments = container.querySelectorAll('.timeline-segment.day.readonly');
        expect(readonlySegments.length).toBeGreaterThan(0);

        step.dispose();
    });

    it('should call onStateChange when LOI is selected', () => {
        let stateChangeCount = 0;
        let lastState: any = null;

        const step = new LOIDateStep({
            container,
            selectedLunarDay: mockLunarDay,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-08-01'),
            explorationEndDate: new Date('2023-10-31'),
            onStateChange: (state) => {
                stateChangeCount++;
                lastState = state;
            }
        });

        // Click on an LOI marker
        const loiMarker = container.querySelector('.loi-marker');
        if (loiMarker) {
            (loiMarker as HTMLElement).click();
            expect(stateChangeCount).toBe(1);
            expect(lastState).not.toBeNull();
            expect(lastState.selectedLOIDate).toBeInstanceOf(Date);
        }

        step.dispose();
    });
});

describe('LOI Date Computation', () => {
    it('should find Moon equator crossings before CY3 landing', () => {
        const landingDate = new Date('2023-08-23T00:00:00Z');
        const searchStart = new Date(landingDate.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days before
        const searchEnd = landingDate;

        const crossings = findOptimalLOIDates(searchStart, searchEnd);

        // Should find at least 1 crossing in 60 days
        expect(crossings.length).toBeGreaterThan(0);

        // All crossings should be dates
        for (const crossing of crossings) {
            expect(crossing).toBeInstanceOf(Date);
        }

        // All crossings should be before the landing date
        for (const crossing of crossings) {
            expect(crossing.getTime()).toBeLessThan(landingDate.getTime());
        }

        // Crossings should be roughly 27 days apart (once per lunar orbit)
        if (crossings.length >= 2) {
            const sorted = crossings.sort((a, b) => a.getTime() - b.getTime());
            for (let i = 1; i < sorted.length; i++) {
                const daysBetween = (sorted[i].getTime() - sorted[i-1].getTime()) / (1000 * 60 * 60 * 24);
                expect(daysBetween).toBeGreaterThan(20);
                expect(daysBetween).toBeLessThan(35);
            }
        }
    });

    it('should find crossings with expected spacing around Aug 2023', () => {
        // Look for crossings in June-Aug 2023 (need longer period for ~27 day spacing)
        const crossings = findOptimalLOIDates(
            new Date('2023-06-01'),
            new Date('2023-08-20')
        );

        // Should find at least 2 crossings in ~80 days
        expect(crossings.length).toBeGreaterThanOrEqual(2);

        // Verify chronological order
        for (let i = 1; i < crossings.length; i++) {
            expect(crossings[i].getTime()).toBeGreaterThan(crossings[i-1].getTime());
        }
    });
});

describe('LOIDateStep State Management', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    it('should restore initial state if provided', () => {
        const initialLOIDate = new Date('2023-08-10T12:00:00Z');

        const step = new LOIDateStep({
            container,
            selectedLunarDay: mockLunarDay,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-08-01'),
            explorationEndDate: new Date('2023-10-31'),
            initialState: {
                selectedLOIDate: initialLOIDate
            }
        });

        const state = step.getState();
        expect(state.selectedLOIDate).toEqual(initialLOIDate);

        step.dispose();
    });

    it('should return valid state after selection', () => {
        const step = new LOIDateStep({
            container,
            selectedLunarDay: mockLunarDay,
            siteName: 'Shiv Shakti',
            siteLatitude: -69.3733,
            siteLongitude: 32.3191,
            explorationStartDate: new Date('2023-08-01'),
            explorationEndDate: new Date('2023-10-31')
        });

        // Initially invalid
        expect(step.isValid()).toBe(false);

        // Click on an LOI marker
        const loiMarker = container.querySelector('.loi-marker');
        if (loiMarker) {
            (loiMarker as HTMLElement).click();

            // Now should be valid
            expect(step.isValid()).toBe(true);
            expect(step.getSelectedLOIDate()).toBeInstanceOf(Date);
        }

        step.dispose();
    });
});
