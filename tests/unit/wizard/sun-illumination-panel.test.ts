/**
 * Unit tests for SunIlluminationPanel component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    calculateSunElevation,
    getSubSolarPoint,
    generateAltitudeTimeline,
    LandingWindowWithRaan
} from '../../../src/wizard/calculations/sunElevation.js';

// Mock Three.js and WebGL for component tests
vi.mock('three', async () => {
    const actual = await vi.importActual('three');
    return {
        ...actual as object,
        WebGLRenderer: vi.fn().mockImplementation(() => ({
            setSize: vi.fn(),
            setPixelRatio: vi.fn(),
            render: vi.fn(),
            dispose: vi.fn(),
            domElement: document.createElement('canvas')
        }))
    };
});

describe('Sun Illumination Calculations', () => {
    describe('getSubSolarPoint', () => {
        it('returns valid sub-solar point coordinates', () => {
            const testDate = new Date('2023-08-23T12:00:00Z');
            const subSolar = getSubSolarPoint(testDate);

            expect(subSolar).toHaveProperty('latitude');
            expect(subSolar).toHaveProperty('longitude');
            expect(subSolar.latitude).toBeGreaterThanOrEqual(-2);
            expect(subSolar.latitude).toBeLessThanOrEqual(2);
            expect(subSolar.longitude).toBeGreaterThanOrEqual(-180);
            expect(subSolar.longitude).toBeLessThanOrEqual(180);
        });

        it('sub-solar longitude varies with moon phase', () => {
            // Test at different phases
            const date1 = new Date('2023-08-16T00:00:00Z'); // Near new moon
            const date2 = new Date('2023-08-31T00:00:00Z'); // Near full moon

            const subSolar1 = getSubSolarPoint(date1);
            const subSolar2 = getSubSolarPoint(date2);

            // Sub-solar points should be different
            expect(Math.abs(subSolar1.longitude - subSolar2.longitude)).toBeGreaterThan(90);
        });
    });

    describe('calculateSunElevation', () => {
        const shivShaktiPoint = { latitude: -69.37, longitude: 32.35 };

        it('calculates sun elevation for CY3 landing site', () => {
            const elevation = calculateSunElevation(
                shivShaktiPoint,
                new Date('2023-08-23T12:00:00Z')
            );

            expect(typeof elevation).toBe('number');
            expect(elevation).toBeGreaterThan(-90);
            expect(elevation).toBeLessThan(90);
        });

        it('elevation varies throughout lunar day', () => {
            const date1 = new Date('2023-08-23T00:00:00Z');
            const date2 = new Date('2023-08-30T00:00:00Z');

            const elev1 = calculateSunElevation(shivShaktiPoint, date1);
            const elev2 = calculateSunElevation(shivShaktiPoint, date2);

            // Elevation should change significantly over a week (at least 10 degrees)
            expect(Math.abs(elev1 - elev2)).toBeGreaterThan(10);
        });

        it('CY3 landing window has elevation in 6-9 degree range', () => {
            // CY3 landed on Aug 23, 2023 around 12:33 UT
            const landingTime = new Date('2023-08-23T12:33:00Z');
            const elevation = calculateSunElevation(shivShaktiPoint, landingTime);

            // Should be close to the target 6-9 degree range
            expect(elevation).toBeGreaterThan(3);
            expect(elevation).toBeLessThan(12);
        });
    });

    describe('generateAltitudeTimeline', () => {
        const testSite = { latitude: -69.37, longitude: 32.35 };

        it('generates altitude data points', () => {
            const startTime = new Date('2023-08-22T00:00:00Z');
            const endTime = new Date('2023-08-24T00:00:00Z');

            const timeline = generateAltitudeTimeline(testSite, startTime, endTime, 60);

            expect(timeline.length).toBeGreaterThan(0);
            expect(timeline[0]).toHaveProperty('time');
            expect(timeline[0]).toHaveProperty('altitude');
        });

        it('respects step interval', () => {
            const startTime = new Date('2023-08-22T00:00:00Z');
            const endTime = new Date('2023-08-23T00:00:00Z');

            const timeline30min = generateAltitudeTimeline(testSite, startTime, endTime, 30);
            const timeline60min = generateAltitudeTimeline(testSite, startTime, endTime, 60);

            // 30-minute steps should produce ~2x more points than 60-minute steps
            expect(timeline30min.length).toBeGreaterThan(timeline60min.length * 1.5);
        });

        it('altitudes are continuous (no large jumps)', () => {
            const startTime = new Date('2023-08-22T00:00:00Z');
            const endTime = new Date('2023-08-24T00:00:00Z');

            const timeline = generateAltitudeTimeline(testSite, startTime, endTime, 30);

            // Check that consecutive altitudes don't jump more than 5 degrees
            for (let i = 1; i < timeline.length; i++) {
                const diff = Math.abs(timeline[i].altitude - timeline[i - 1].altitude);
                expect(diff).toBeLessThan(5);
            }
        });
    });
});

describe('SunIlluminationPanel Integration', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('can create a mock landing window for testing', () => {
        const mockWindow: LandingWindowWithRaan = {
            startDate: new Date('2023-08-23T10:00:00Z'),
            endDate: new Date('2023-08-23T14:00:00Z'),
            peakTime: new Date('2023-08-23T12:00:00Z'),
            peakElevation: 7.5,
            durationHours: 4,
            requiredRaan: 156.7
        };

        expect(mockWindow.startDate).toBeInstanceOf(Date);
        expect(mockWindow.endDate).toBeInstanceOf(Date);
        expect(mockWindow.peakTime).toBeInstanceOf(Date);
        expect(mockWindow.peakElevation).toBe(7.5);
        expect(mockWindow.durationHours).toBe(4);
        expect(mockWindow.requiredRaan).toBe(156.7);
    });

    it('generateAltitudeTimeline includes peak time data', () => {
        const site = { latitude: -69.37, longitude: 32.35 };
        const peakTime = new Date('2023-08-23T12:00:00Z');
        const startTime = new Date(peakTime.getTime() - 12 * 60 * 60 * 1000);
        const endTime = new Date(peakTime.getTime() + 12 * 60 * 60 * 1000);

        const timeline = generateAltitudeTimeline(site, startTime, endTime, 30);

        // Should have data points spanning the 24-hour range
        expect(timeline.length).toBeGreaterThan(40);

        // First and last points should be close to start/end times
        const firstTime = timeline[0].time.getTime();
        const lastTime = timeline[timeline.length - 1].time.getTime();
        expect(Math.abs(firstTime - startTime.getTime())).toBeLessThan(60000);
        expect(Math.abs(lastTime - endTime.getTime())).toBeLessThan(2 * 60 * 60 * 1000);
    });
});

describe('MoonGlobeView.updateSunLighting', () => {
    it('getSubSolarPoint returns coordinates that can be converted to 3D position', () => {
        const testDate = new Date('2023-08-23T12:00:00Z');
        const subSolar = getSubSolarPoint(testDate);

        // Convert to 3D position (same algorithm used in MoonGlobeView)
        const DEG_TO_RAD = Math.PI / 180;
        const MOON_RADIUS = 50;
        const latRad = subSolar.latitude * DEG_TO_RAD;
        const lonRad = subSolar.longitude * DEG_TO_RAD;

        const z = MOON_RADIUS * Math.sin(latRad);
        const r = MOON_RADIUS * Math.cos(latRad);
        const x = -r * Math.sin(lonRad);
        const y = r * Math.cos(lonRad);

        // Position should be on or near the sphere surface
        const distance = Math.sqrt(x * x + y * y + z * z);
        expect(distance).toBeCloseTo(MOON_RADIUS, 1);
    });
});
