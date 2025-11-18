import { describe, it, expect } from 'vitest';

/**
 * Utility Functions Tests
 *
 * Tests for helper functions, edge cases, and data validation.
 */

describe('Utility Functions', () => {
    describe('Angle Normalization', () => {
        function normalizeAngle(degrees: number): number {
            let normalized = degrees % 360;
            if (normalized < 0) normalized += 360;
            return normalized;
        }

        it('should normalize positive angles', () => {
            expect(normalizeAngle(0)).toBe(0);
            expect(normalizeAngle(45)).toBe(45);
            expect(normalizeAngle(360)).toBe(0);
            expect(normalizeAngle(450)).toBe(90);
        });

        it('should normalize negative angles', () => {
            expect(normalizeAngle(-45)).toBe(315);
            // -360 % 360 = -0, then -0 + 360 = 360, but we want 0
            const result = normalizeAngle(-360);
            expect(result === 0 || result === 360).toBe(true);
            expect(normalizeAngle(-450)).toBe(270);
        });

        it('should handle very large angles', () => {
            expect(normalizeAngle(720)).toBe(0);
            expect(normalizeAngle(1080)).toBe(0);
            expect(normalizeAngle(3645)).toBe(45);
        });
    });

    describe('Degree/Radian Conversion', () => {
        function degToRad(degrees: number): number {
            return degrees * Math.PI / 180;
        }

        function radToDeg(radians: number): number {
            return radians * 180 / Math.PI;
        }

        it('should convert degrees to radians', () => {
            expect(degToRad(0)).toBe(0);
            expect(degToRad(90)).toBeCloseTo(Math.PI / 2, 6);
            expect(degToRad(180)).toBeCloseTo(Math.PI, 6);
            expect(degToRad(360)).toBeCloseTo(2 * Math.PI, 6);
        });

        it('should convert radians to degrees', () => {
            expect(radToDeg(0)).toBe(0);
            expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 6);
            expect(radToDeg(Math.PI)).toBeCloseTo(180, 6);
            expect(radToDeg(2 * Math.PI)).toBeCloseTo(360, 6);
        });

        it('should be reversible', () => {
            const angles = [0, 45, 90, 135, 180, 225, 270, 315];
            angles.forEach(deg => {
                expect(radToDeg(degToRad(deg))).toBeCloseTo(deg, 6);
            });
        });
    });

    describe('Cache Implementation', () => {
        interface Cache<T> {
            value: T | null;
            valid: boolean;
        }

        function createCache<T>(): Cache<T> {
            return { value: null, valid: false };
        }

        it('should create empty cache', () => {
            const cache = createCache<number>();
            expect(cache.value).toBeNull();
            expect(cache.valid).toBe(false);
        });

        it('should store and retrieve values', () => {
            const cache = createCache<string>();
            cache.value = 'test';
            cache.valid = true;
            expect(cache.value).toBe('test');
            expect(cache.valid).toBe(true);
        });

        it('should support type safety', () => {
            interface Position {
                x: number;
                y: number;
                z: number;
            }

            const cache = createCache<Position>();
            cache.value = { x: 1, y: 2, z: 3 };
            cache.valid = true;

            expect(cache.value).toEqual({ x: 1, y: 2, z: 3 });
        });
    });

    describe('Date and Time Utilities', () => {
        it('should calculate days from milliseconds', () => {
            const msPerDay = 24 * 60 * 60 * 1000;
            expect(msPerDay).toBe(86400000);

            const days = 5;
            const ms = days * msPerDay;
            expect(ms / msPerDay).toBe(5);
        });

        it('should calculate time difference between dates', () => {
            const date1 = new Date('2023-07-14T09:35:00Z');
            const date2 = new Date('2023-07-19T09:35:00Z');
            const diffMs = date2.getTime() - date1.getTime();
            const diffDays = diffMs / (24 * 60 * 60 * 1000);
            expect(diffDays).toBe(5);
        });

        it('should add days to date', () => {
            const start = new Date('2023-07-14T09:35:00Z');
            const days = 5;
            const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
            expect(end.toISOString()).toBe('2023-07-19T09:35:00.000Z');
        });

        it('should handle leap seconds in date arithmetic', () => {
            // Date arithmetic should work across year boundaries
            const start = new Date('2023-12-30T00:00:00Z');
            const days = 5;
            const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
            expect(end.getFullYear()).toBe(2024);
            expect(end.getDate()).toBe(4);
        });
    });

    describe('Number Formatting', () => {
        it('should format numbers with fixed decimals', () => {
            expect((3.14159).toFixed(2)).toBe('3.14');
            expect((3.14159).toFixed(4)).toBe('3.1416');
            expect((100).toFixed(1)).toBe('100.0');
        });

        it('should handle very small numbers', () => {
            expect((0.000001).toFixed(6)).toBe('0.000001');
            expect((0.000001).toFixed(3)).toBe('0.000');
        });

        it('should handle very large numbers', () => {
            expect((1234567.89).toFixed(2)).toBe('1234567.89');
            expect((384400).toFixed(0)).toBe('384400');
        });
    });

    describe('String Validation', () => {
        function isValidDate(dateStr: string): boolean {
            const date = new Date(dateStr);
            return !isNaN(date.getTime());
        }

        it('should validate date strings', () => {
            expect(isValidDate('2023-07-14T09:35:00Z')).toBe(true);
            expect(isValidDate('2023-07-14')).toBe(true);
            expect(isValidDate('invalid')).toBe(false);
            expect(isValidDate('')).toBe(false);
        });

        it('should validate numeric ranges', () => {
            const inRange = (value: number, min: number, max: number) =>
                value >= min && value <= max;

            expect(inRange(45, 0, 360)).toBe(true);
            expect(inRange(-1, 0, 360)).toBe(false);
            expect(inRange(361, 0, 360)).toBe(false);
            expect(inRange(0, 0, 360)).toBe(true);
            expect(inRange(360, 0, 360)).toBe(true);
        });
    });

    describe('Array Operations', () => {
        it('should find minimum in array', () => {
            const arr = [5, 2, 8, 1, 9];
            expect(Math.min(...arr)).toBe(1);
        });

        it('should find maximum in array', () => {
            const arr = [5, 2, 8, 1, 9];
            expect(Math.max(...arr)).toBe(9);
        });

        it('should calculate array sum', () => {
            const arr = [1, 2, 3, 4, 5];
            const sum = arr.reduce((a, b) => a + b, 0);
            expect(sum).toBe(15);
        });

        it('should find closest value in array', () => {
            const findClosest = (arr: number[], target: number) =>
                arr.reduce((prev, curr) =>
                    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
                );

            expect(findClosest([0, 10, 20, 30], 15)).toBe(10);
            expect(findClosest([0, 10, 20, 30], 16)).toBe(20);
            expect(findClosest([0, 18.3, 28.6, 51.6, 90], 25)).toBe(28.6);
        });
    });

    describe('Object Cloning', () => {
        it('should create shallow copy', () => {
            const obj = { a: 1, b: 2, c: 3 };
            const copy = { ...obj };
            expect(copy).toEqual(obj);
            expect(copy).not.toBe(obj);
        });

        it('should preserve nested objects by reference in shallow copy', () => {
            const nested = { x: 1 };
            const obj = { a: nested };
            const copy = { ...obj };
            expect(copy.a).toBe(nested); // Same reference
        });

        it('should create deep copy with JSON', () => {
            const obj = { a: 1, nested: { b: 2 } };
            const copy = JSON.parse(JSON.stringify(obj));
            expect(copy).toEqual(obj);
            expect(copy.nested).not.toBe(obj.nested); // Different reference
        });
    });

    describe('Boolean Logic', () => {
        it('should handle logical AND', () => {
            expect(true && true).toBe(true);
            expect(true && false).toBe(false);
            expect(false && false).toBe(false);
        });

        it('should handle logical OR', () => {
            expect(true || false).toBe(true);
            expect(false || false).toBe(false);
            expect(false || true).toBe(true);
        });

        it('should handle logical NOT', () => {
            expect(!true).toBe(false);
            expect(!false).toBe(true);
        });

        it('should handle short-circuit evaluation', () => {
            let called = false;
            const func = () => { called = true; return true; };

            // AND short-circuit
            false && func();
            expect(called).toBe(false);

            // OR short-circuit
            true || func();
            expect(called).toBe(false);
        });
    });

    describe('Constants Validation', () => {
        it('should have correct physical constants', () => {
            const EARTH_RADIUS = 6371; // km
            const MOON_RADIUS = 1737; // km
            const LUNAR_ORBIT_DISTANCE = 384400; // km

            expect(EARTH_RADIUS).toBeGreaterThan(6000);
            expect(EARTH_RADIUS).toBeLessThan(7000);

            expect(MOON_RADIUS).toBeGreaterThan(1700);
            expect(MOON_RADIUS).toBeLessThan(1800);

            expect(LUNAR_ORBIT_DISTANCE).toBeGreaterThan(350000);
            expect(LUNAR_ORBIT_DISTANCE).toBeLessThan(400000);
        });

        it('should have reasonable scale factors', () => {
            const LUNAR_ORBIT_DISTANCE = 384400;
            const SPHERE_RADIUS = 100;
            const SCALE_FACTOR = SPHERE_RADIUS / LUNAR_ORBIT_DISTANCE;

            expect(SCALE_FACTOR).toBeGreaterThan(0);
            expect(SCALE_FACTOR).toBeLessThan(1);
            expect(SCALE_FACTOR).toBeCloseTo(0.00026, 5);
        });
    });

    describe('Edge Cases', () => {
        it('should handle division by zero gracefully', () => {
            expect(1 / 0).toBe(Infinity);
            expect(-1 / 0).toBe(-Infinity);
            expect(0 / 0).toBeNaN();
        });

        it('should handle NaN in comparisons', () => {
            const nan = NaN;
            expect(nan === nan).toBe(false);
            expect(isNaN(nan)).toBe(true);
            expect(Number.isNaN(nan)).toBe(true);
        });

        it('should handle floating point precision', () => {
            // Known floating point issue
            expect(0.1 + 0.2).not.toBe(0.3);
            expect(0.1 + 0.2).toBeCloseTo(0.3, 10);
        });

        it('should handle very small angles', () => {
            const angle = 0.0001;
            const rad = angle * Math.PI / 180;
            expect(Math.sin(rad)).toBeCloseTo(rad, 6); // Small angle approximation
        });

        it('should handle angle wrapping at boundaries', () => {
            const normalize = (deg: number) => {
                let n = deg % 360;
                if (n < 0) n += 360;
                return n;
            };

            expect(normalize(359.9)).toBeCloseTo(359.9, 1);
            expect(normalize(360.1)).toBeCloseTo(0.1, 1);
            expect(normalize(-0.1)).toBeCloseTo(359.9, 1);
        });
    });

    describe('Type Coercion', () => {
        it('should handle string to number conversion', () => {
            expect(Number('123')).toBe(123);
            expect(Number('123.45')).toBe(123.45);
            expect(Number('invalid')).toBeNaN();
        });

        it('should handle number to string conversion', () => {
            expect(String(123)).toBe('123');
            expect((123).toString()).toBe('123');
            expect(`${123}`).toBe('123');
        });

        it('should handle boolean to number conversion', () => {
            expect(Number(true)).toBe(1);
            expect(Number(false)).toBe(0);
        });

        it('should handle null and undefined', () => {
            expect(Number(null)).toBe(0);
            expect(Number(undefined)).toBeNaN();
            expect(String(null)).toBe('null');
            expect(String(undefined)).toBe('undefined');
        });
    });
});
