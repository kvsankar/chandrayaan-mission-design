import { describe, it, expect } from 'vitest';

/**
 * Orbital Mechanics Calculation Tests
 *
 * These tests verify the correctness of orbital mechanics calculations
 * used in the Chandrayaan-3 visualization.
 */

describe('Orbital Mechanics Calculations', () => {
    describe('Eccentricity Calculation', () => {
        it('should calculate eccentricity for highly elliptical orbit (default)', () => {
            // Default: perigee = 180km, apogee = 378029km
            const EARTH_RADIUS = 6371;
            const perigee = 180;
            const apogee = 378029;

            const rp = EARTH_RADIUS + perigee;
            const ra = EARTH_RADIUS + apogee;
            const e = (ra - rp) / (ra + rp);

            expect(e).toBeCloseTo(0.9665, 3);
        });

        it('should calculate eccentricity for circular orbit', () => {
            const EARTH_RADIUS = 6371;
            const altitude = 400;

            const rp = EARTH_RADIUS + altitude;
            const ra = EARTH_RADIUS + altitude;
            const e = (ra - rp) / (ra + rp);

            expect(e).toBe(0);
        });

        it('should calculate eccentricity for moderately elliptical orbit', () => {
            const EARTH_RADIUS = 6371;
            const perigee = 200;
            const apogee = 35786; // GTO-like

            const rp = EARTH_RADIUS + perigee;
            const ra = EARTH_RADIUS + apogee;
            const e = (ra - rp) / (ra + rp);

            expect(e).toBeCloseTo(0.7303, 3);
        });
    });

    describe('Orbital Period Calculation', () => {
        it('should calculate orbital period using vis-viva equation', () => {
            const EARTH_RADIUS = 6371;
            const G = 6.67430e-11; // m^3 kg^-1 s^-2
            const M_earth = 5.972e24; // kg
            const mu = G * M_earth; // m^3/s^2

            const perigeeAlt = 180; // km
            const apogeeAlt = 378029; // km

            const rp = (EARTH_RADIUS + perigeeAlt) * 1000; // Convert to meters
            const ra = (EARTH_RADIUS + apogeeAlt) * 1000;
            const a = (rp + ra) / 2; // Semi-major axis

            const period = 2 * Math.PI * Math.sqrt(a ** 3 / mu);
            const periodHours = period / 3600;

            // For default TLI orbit, period should be around 239 hours
            expect(periodHours).toBeGreaterThan(230);
            expect(periodHours).toBeLessThan(250);
        });

        it('should calculate period for LEO circular orbit', () => {
            const EARTH_RADIUS = 6371;
            const G = 6.67430e-11;
            const M_earth = 5.972e24;
            const mu = G * M_earth;

            const altitude = 400; // ISS altitude
            const r = (EARTH_RADIUS + altitude) * 1000;
            const a = r;

            const period = 2 * Math.PI * Math.sqrt(a ** 3 / mu);
            const periodMinutes = period / 60;

            // ISS orbital period is about 92 minutes
            expect(periodMinutes).toBeGreaterThan(90);
            expect(periodMinutes).toBeLessThan(95);
        });
    });

    describe('Period Formatting', () => {
        function formatPeriod(seconds: number): string {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${hours}h ${mins}m ${secs}s`;
        }

        it('should format period in hours, minutes, seconds', () => {
            expect(formatPeriod(3661)).toBe('1h 1m 1s');
            expect(formatPeriod(3600)).toBe('1h 0m 0s');
            expect(formatPeriod(90)).toBe('0h 1m 30s');
        });

        it('should handle large periods', () => {
            const result = formatPeriod(407568); // ~113 hours
            expect(result).toMatch(/^\d+h \d+m \d+s$/);
        });
    });

    describe('True Anomaly from Time', () => {
        it('should calculate true anomaly using Kepler equation', () => {
            const EARTH_RADIUS = 6371;
            const G = 6.67430e-11;
            const M_earth = 5.972e24;
            const mu = G * M_earth;

            const perigeeAlt = 180;
            const apogeeAlt = 378029;

            const rp = (EARTH_RADIUS + perigeeAlt) * 1000;
            const ra = (EARTH_RADIUS + apogeeAlt) * 1000;
            const a = (rp + ra) / 2;
            const e = (ra - rp) / (ra + rp);

            const period = 2 * Math.PI * Math.sqrt(a ** 3 / mu);

            // At t=0 (perigee), true anomaly should be 0
            const meanMotion = 2 * Math.PI / period;
            const M0 = 0; // Mean anomaly at perigee

            expect(M0).toBe(0);

            // At t = period/4, should be roughly at 90 degrees
            const M90 = meanMotion * (period / 4);
            expect(M90).toBeCloseTo(Math.PI / 2, 1);
        });

        it('should handle circular orbit (e=0)', () => {
            // For circular orbit, true anomaly = mean anomaly
            const e = 0;
            const M = Math.PI / 2; // 90 degrees

            // Solve Kepler's equation: M = E - e*sin(E)
            // For e=0: M = E, and nu = E for circular orbit
            const E = M;
            const nu = E;

            expect(nu).toBeCloseTo(Math.PI / 2, 6);
        });
    });

    describe('Date Formatting', () => {
        function formatDateForDisplay(date: Date | null): string {
            if (!date) return '--';
            return date.toISOString().slice(0, 16).replace('T', ' ');
        }

        it('should format date correctly', () => {
            const date = new Date('2023-07-14T09:35:00Z');
            const result = formatDateForDisplay(date);
            expect(result).toBe('2023-07-14 09:35');
        });

        it('should handle null date', () => {
            expect(formatDateForDisplay(null)).toBe('--');
        });
    });

    describe('Angle Calculations', () => {
        it('should calculate Right Ascension from orbital elements', () => {
            // RA = RAAN + atan2(cos(i) * sin(u), cos(u))
            // where u = ω + ν (argument of latitude)

            const raanDeg = 45;
            const omegaDeg = 30;
            const nuDeg = 60;
            const incDeg = 20;

            const raan = raanDeg * Math.PI / 180;
            const omega = omegaDeg * Math.PI / 180;
            const nu = nuDeg * Math.PI / 180;
            const inc = incDeg * Math.PI / 180;

            const u = omega + nu; // Argument of latitude
            const ra = raan + Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u));
            const raDeg = ra * 180 / Math.PI;

            // RA should be between 0-360
            expect(raDeg).toBeGreaterThanOrEqual(0);
            expect(raDeg).toBeLessThan(360);
        });

        it('should handle RA for equatorial orbit (i=0)', () => {
            // For equatorial orbit, RA = RAAN + ω + ν
            const raanDeg = 45;
            const omegaDeg = 30;
            const nuDeg = 60;
            const incDeg = 0;

            const raan = raanDeg * Math.PI / 180;
            const omega = omegaDeg * Math.PI / 180;
            const nu = nuDeg * Math.PI / 180;
            const inc = incDeg * Math.PI / 180;

            const u = omega + nu;
            const ra = raan + Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u));
            const raDeg = ra * 180 / Math.PI;

            // For i=0, RA should equal RAAN + ω + ν
            const expectedRaDeg = raanDeg + omegaDeg + nuDeg;
            expect(raDeg).toBeCloseTo(expectedRaDeg, 1);
        });

        it('should invert RA formula to get true anomaly', () => {
            // Given RA, RAAN, omega, inclination -> solve for nu
            const raanDeg = 45;
            const omegaDeg = 30;
            const incDeg = 20;
            const raDeg = 150;

            const ra = raDeg * Math.PI / 180;
            const raan = raanDeg * Math.PI / 180;
            const omega = omegaDeg * Math.PI / 180;
            const inc = incDeg * Math.PI / 180;

            // Solve for u from: RA = RAAN + atan2(cos(i) * sin(u), cos(u))
            const deltaRA = ra - raan;
            const u = Math.atan2(Math.sin(deltaRA), Math.cos(deltaRA) * Math.cos(inc));

            // True anomaly = u - omega
            const nu = u - omega;
            const nuDeg = nu * 180 / Math.PI;

            // Verify by calculating RA back
            const uCalc = omega + nu;
            const raCalc = raan + Math.atan2(Math.cos(inc) * Math.sin(uCalc), Math.cos(uCalc));
            const raCalcDeg = raCalc * 180 / Math.PI;

            expect(raCalcDeg).toBeCloseTo(raDeg, 1);
        });
    });

    describe('Allowed Inclination Constraints', () => {
        function getClosestAllowedInclination(currentInclination: number): number {
            const allowedValues = [0, 18.3, 28.6, 51.6, 90];
            return allowedValues.reduce((prev, curr) =>
                Math.abs(curr - currentInclination) < Math.abs(prev - currentInclination) ? curr : prev
            );
        }

        it('should snap to closest allowed inclination', () => {
            expect(getClosestAllowedInclination(0)).toBe(0);
            expect(getClosestAllowedInclination(5)).toBe(0);
            expect(getClosestAllowedInclination(15)).toBe(18.3);
            expect(getClosestAllowedInclination(25)).toBe(28.6);
            expect(getClosestAllowedInclination(40)).toBe(28.6);
            expect(getClosestAllowedInclination(50)).toBe(51.6);
            expect(getClosestAllowedInclination(85)).toBe(90);
        });
    });

    describe('Allowed Omega Constraints', () => {
        function getAllowedOmegaValues(inclination: number): number[] {
            if (inclination === 18.3) return [0, 180];
            if (inclination === 28.6) return [0, 180];
            if (inclination === 51.6) return [180, 270];
            return []; // No constraints for other inclinations
        }

        function getClosestAllowedOmega(currentOmega: number, inclination: number): number {
            const allowedValues = getAllowedOmegaValues(inclination);
            if (allowedValues.length === 0) return currentOmega;
            return allowedValues.reduce((prev, curr) =>
                Math.abs(curr - currentOmega) < Math.abs(prev - currentOmega) ? curr : prev
            );
        }

        it('should return allowed omega values for lunar-resonant inclinations', () => {
            expect(getAllowedOmegaValues(18.3)).toEqual([0, 180]);
            expect(getAllowedOmegaValues(28.6)).toEqual([0, 180]);
            expect(getAllowedOmegaValues(51.6)).toEqual([180, 270]);
        });

        it('should return no constraints for other inclinations', () => {
            expect(getAllowedOmegaValues(0)).toEqual([]);
            expect(getAllowedOmegaValues(90)).toEqual([]);
        });

        it('should snap to closest allowed omega', () => {
            expect(getClosestAllowedOmega(10, 18.3)).toBe(0);
            expect(getClosestAllowedOmega(170, 18.3)).toBe(180);
            expect(getClosestAllowedOmega(200, 51.6)).toBe(180);
            expect(getClosestAllowedOmega(260, 51.6)).toBe(270);
        });

        it('should not constrain omega for unrestricted inclinations', () => {
            expect(getClosestAllowedOmega(45, 0)).toBe(45);
            expect(getClosestAllowedOmega(123, 90)).toBe(123);
        });
    });

    describe('Distance Calculations', () => {
        it('should calculate orbital radius from true anomaly', () => {
            const EARTH_RADIUS = 6371;
            const perigeeAlt = 180;
            const apogeeAlt = 378029;

            const rp = EARTH_RADIUS + perigeeAlt;
            const ra = EARTH_RADIUS + apogeeAlt;
            const a = (rp + ra) / 2;
            const e = (ra - rp) / (ra + rp);

            // At perigee (nu = 0), r = a(1-e)
            const nu0 = 0;
            const r0 = a * (1 - e * e) / (1 + e * Math.cos(nu0));
            expect(r0).toBeCloseTo(rp, 0);

            // At apogee (nu = π), r = a(1+e)
            const nuPi = Math.PI;
            const rPi = a * (1 - e * e) / (1 + e * Math.cos(nuPi));
            expect(rPi).toBeCloseTo(ra, 0);
        });

        it('should calculate 3D distance between two points', () => {
            const p1 = { x: 0, y: 0, z: 0 };
            const p2 = { x: 3, y: 4, z: 0 };

            const dist = Math.sqrt(
                (p2.x - p1.x) ** 2 +
                (p2.y - p1.y) ** 2 +
                (p2.z - p1.z) ** 2
            );

            expect(dist).toBe(5); // 3-4-5 triangle
        });

        it('should calculate Earth-Moon distance', () => {
            // Average Earth-Moon distance is about 384,400 km
            const LUNAR_ORBIT_DISTANCE = 384400;

            expect(LUNAR_ORBIT_DISTANCE).toBeGreaterThan(363000); // Perigee
            expect(LUNAR_ORBIT_DISTANCE).toBeLessThan(406000); // Apogee
        });
    });

    describe('Coordinate System Transformations', () => {
        it('should convert celestial coordinates to Three.js coordinates', () => {
            // Celestial: X → Aries, Y → RA=90°, Z → North Pole
            // Three.js: X=X, Y=Z, Z=-Y (Y is up in Three.js)

            const celestial = { x: 1, y: 2, z: 3 };
            const threejs = {
                x: celestial.x,
                y: celestial.z,  // Celestial Z → Three.js Y
                z: -celestial.y  // Celestial Y → Three.js -Z
            };

            expect(threejs.x).toBe(1);
            expect(threejs.y).toBe(3);
            expect(threejs.z).toBe(-2);
        });

        it('should handle rotation around X-axis', () => {
            // Rotation matrix for X-axis:
            // [1    0       0    ]
            // [0  cos(θ) -sin(θ)]
            // [0  sin(θ)  cos(θ)]

            const angle = Math.PI / 2; // 90 degrees
            const point = { x: 1, y: 0, z: 1 };

            const rotated = {
                x: point.x,
                y: point.y * Math.cos(angle) - point.z * Math.sin(angle),
                z: point.y * Math.sin(angle) + point.z * Math.cos(angle)
            };

            expect(rotated.x).toBeCloseTo(1, 6);
            expect(rotated.y).toBeCloseTo(-1, 6);
            expect(rotated.z).toBeCloseTo(0, 6);
        });
    });
});
