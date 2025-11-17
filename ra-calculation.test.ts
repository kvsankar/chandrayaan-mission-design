import { describe, it, expect } from 'vitest';

/**
 * Tests to verify RA calculation and inversion
 */

describe('RA Calculation Round-Trip', () => {
    function normalizeAngle(deg: number): number {
        let normalized = deg % 360;
        if (normalized < 0) normalized += 360;
        return normalized;
    }

    function degToRad(deg: number): number {
        return deg * Math.PI / 180;
    }

    function radToDeg(rad: number): number {
        return rad * 180 / Math.PI;
    }

    // Forward: Calculate RA from orbital elements
    function calculateRA(raan: number, omega: number, nu: number, inc: number): number {
        const u = omega + nu; // Argument of latitude
        const uRad = degToRad(u);
        const incRad = degToRad(inc);
        const raanRad = degToRad(raan);

        const ra = raanRad + Math.atan2(Math.cos(incRad) * Math.sin(uRad), Math.cos(uRad));
        return normalizeAngle(radToDeg(ra));
    }

    // Inverse: Calculate nu from RA (current implementation)
    function calculateNuFromRA_Current(ra: number, raan: number, omega: number, inc: number): number {
        const raRad = degToRad(ra);
        const raanRad = degToRad(raan);
        const incRad = degToRad(inc);

        const deltaRA = raRad - raanRad;
        const uRad = Math.atan2(Math.sin(deltaRA), Math.cos(deltaRA) * Math.cos(incRad));

        const omegaRad = degToRad(omega);
        const nu = uRad - omegaRad;

        return radToDeg(nu);
    }

    // Inverse: Calculate nu from RA (correct implementation)
    function calculateNuFromRA_Correct(ra: number, raan: number, omega: number, inc: number): number {
        const raRad = degToRad(ra);
        const raanRad = degToRad(raan);
        const incRad = degToRad(inc);
        const omegaRad = degToRad(omega);

        // From: RA = RAAN + atan2(cos(i) * sin(u), cos(u))
        // We get: atan2(cos(i) * sin(u), cos(u)) = RA - RAAN
        const deltaRA = raRad - raanRad;

        // Let's denote atan2(cos(i) * sin(u), cos(u)) = deltaRA
        // We have: y = cos(i) * sin(u), x = cos(u)
        // So: atan2(y, x) = deltaRA
        // Therefore: tan(deltaRA) = y/x = cos(i) * sin(u) / cos(u) = cos(i) * tan(u)
        // So: tan(u) = tan(deltaRA) / cos(i)

        // Using the formula: if tan(u) = k, then u = atan(k)
        // But we need to preserve the quadrant, so we use:
        // u = atan2(sin(u), cos(u)) where we know tan(u) = tan(deltaRA)/cos(i)

        // From tan(deltaRA) = cos(i) * tan(u), we get:
        // sin(deltaRA)/cos(deltaRA) = cos(i) * sin(u)/cos(u)
        // Cross multiply: sin(deltaRA) * cos(u) = cos(deltaRA) * cos(i) * sin(u)

        // We can reconstruct sin(u) and cos(u):
        // From atan2(cos(i)*sin(u), cos(u)) = deltaRA
        // We have: cos(i)*sin(u) = r*sin(deltaRA) and cos(u) = r*cos(deltaRA) for some r
        // Since sin²(u) + cos²(u) = 1:
        // (r*sin(deltaRA)/cos(i))² + (r*cos(deltaRA))² = 1
        // r²[sin²(deltaRA)/cos²(i) + cos²(deltaRA)] = 1

        // Simpler approach: Use the fact that for the given values:
        // u = atan2(sin(deltaRA) / cos(i), cos(deltaRA)) won't work directly

        // Correct formula (derived from spherical trigonometry):
        // cos(u) = cos(deltaRA) / sqrt(cos²(deltaRA) + sin²(deltaRA)/cos²(i))  -- WRONG

        // Actually, the correct inversion is:
        // From: RA - RAAN = atan2(cos(i) * sin(u), cos(u))
        // Let theta = RA - RAAN
        // Then: tan(theta) = cos(i) * tan(u)
        // So: u = atan(tan(theta) / cos(i))

        // But atan loses quadrant info, so we need atan2:
        // If tan(u) = tan(theta)/cos(i), then:
        // sin(u)/cos(u) = sin(theta)/(cos(theta) * cos(i))
        // So: sin(u) = k * sin(theta), cos(u) = k * cos(theta) * cos(i) for some scale k
        // Using sin²(u) + cos²(u) = 1:
        // k²[sin²(theta) + cos²(theta) * cos²(i)] = 1
        // k = 1 / sqrt(sin²(theta) + cos²(theta) * cos²(i))

        const k = 1 / Math.sqrt(Math.sin(deltaRA) ** 2 + Math.cos(deltaRA) ** 2 * Math.cos(incRad) ** 2);
        const sinU = k * Math.sin(deltaRA);
        const cosU = k * Math.cos(deltaRA) * Math.cos(incRad);

        const uRad = Math.atan2(sinU, cosU);
        const nu = uRad - omegaRad;

        return radToDeg(nu);
    }

    it('should correctly round-trip RA calculation for equatorial orbit (i=0)', () => {
        const raan = 45;
        const omega = 30;
        const nu = 60;
        const inc = 0; // Equatorial

        // Forward
        const ra = calculateRA(raan, omega, nu, inc);

        // For i=0, RA should equal RAAN + omega + nu
        expect(ra).toBeCloseTo(normalizeAngle(raan + omega + nu), 1);

        // Inverse (current)
        const nuCalc = calculateNuFromRA_Current(ra, raan, omega, inc);
        expect(nuCalc).toBeCloseTo(nu, 1);
    });

    it('should correctly round-trip RA calculation for inclined orbit (i=20°)', () => {
        const raan = 45;
        const omega = 30;
        const nu = 60;
        const inc = 20;

        // Forward
        const ra = calculateRA(raan, omega, nu, inc);

        // Inverse (correct implementation)
        const nuCalc = calculateNuFromRA_Correct(ra, raan, omega, inc);
        expect(normalizeAngle(nuCalc)).toBeCloseTo(normalizeAngle(nu), 0.1);
    });

    it('should correctly round-trip for various angles', () => {
        const testCases = [
            { raan: 0, omega: 0, nu: 0, inc: 0 },
            { raan: 0, omega: 0, nu: 90, inc: 0 },
            { raan: 45, omega: 30, nu: 60, inc: 20 },
            { raan: 120, omega: 45, nu: 135, inc: 51.6 },
            { raan: 180, omega: 90, nu: 180, inc: 28.6 },
            { raan: 270, omega: 180, nu: 270, inc: 18.3 },
        ];

        testCases.forEach(({ raan, omega, nu, inc }) => {
            const ra = calculateRA(raan, omega, nu, inc);
            const nuCalc = calculateNuFromRA_Correct(ra, raan, omega, inc);

            expect(normalizeAngle(nuCalc)).toBeCloseTo(normalizeAngle(nu), 0.1);
        });
    });

    it('should show both implementations are now equivalent', () => {
        const raan = 45;
        const omega = 30;
        const nu = 60;
        const inc = 20; // Non-zero inclination

        const ra = calculateRA(raan, omega, nu, inc);

        const nuCurrent = calculateNuFromRA_Current(ra, raan, omega, inc);
        const nuCorrect = calculateNuFromRA_Correct(ra, raan, omega, inc);

        console.log(`Original nu: ${nu}°`);
        console.log(`Current implementation: ${nuCurrent.toFixed(2)}° (error: ${(nu - nuCurrent).toFixed(2)}°)`);
        console.log(`Correct implementation: ${nuCorrect.toFixed(2)}° (error: ${(nu - nuCorrect).toFixed(2)}°)`);

        // Both implementations should now be equally accurate (within floating point precision)
        const currentError = Math.abs(normalizeAngle(nuCurrent) - normalizeAngle(nu));
        const correctError = Math.abs(normalizeAngle(nuCorrect) - normalizeAngle(nu));
        expect(currentError).toBeCloseTo(correctError, 10); // Within 10 decimal places
    });

    it('should correctly convert both directions (bidirectional consistency)', () => {
        const testCases = [
            { raan: 0, omega: 0, nu: 0, inc: 0 },
            { raan: 45, omega: 30, nu: 60, inc: 20 },
            { raan: 120, omega: 45, nu: 135, inc: 51.6 },
            { raan: 180, omega: 90, nu: 180, inc: 28.6 },
            { raan: 270, omega: 180, nu: 270, inc: 18.3 },
        ];

        testCases.forEach(({ raan, omega, nu, inc }) => {
            // Forward: nu -> RA
            const raForward = calculateRA(raan, omega, nu, inc);

            // Inverse: RA -> nu
            const nuInverse = calculateNuFromRA_Correct(raForward, raan, omega, inc);

            // Should round-trip correctly
            expect(normalizeAngle(nuInverse)).toBeCloseTo(normalizeAngle(nu), 0.1);

            // Reverse: Start with RA, convert to nu, then back to RA
            const nuFromRA = calculateNuFromRA_Correct(raForward, raan, omega, inc);
            const raReverse = calculateRA(raan, omega, nuFromRA, inc);

            // Should get back the same RA
            expect(normalizeAngle(raReverse)).toBeCloseTo(normalizeAngle(raForward), 0.1);
        });
    });
});
