/**
 * Site Selection Unit Tests
 *
 * Tests for landing site selection logic including:
 * - Angular distance calculations
 * - Snap-to-site functionality
 * - Site filtering
 * - Coordinate validation
 */

import { describe, it, expect } from 'vitest';
import {
    angularDistance,
    loadPresetSites,
    getSnapDefaults,
    filterSitesByMission,
    findNearestSite,
    checkSnap,
    isNearSide,
    formatCoordinates,
    getSiteById,
    PresetSite
} from '../../../src/wizard/components/SiteMarkers.js';

describe('Site Selection', () => {

    describe('Angular Distance', () => {

        it('should return 0 for same point', () => {
            const dist = angularDistance(-69.37, 32.32, -69.37, 32.32);
            expect(dist).toBeCloseTo(0, 5);
        });

        it('should calculate distance between CY3 primary and actual', () => {
            // CY3 Primary: -69.3676, 32.3481
            // CY3 Actual (Shiv Shakti): -69.3733, 32.3191
            const dist = angularDistance(-69.3676, 32.3481, -69.3733, 32.3191);
            // These are very close together
            expect(dist).toBeLessThan(0.05);  // Less than 0.05 degrees
        });

        it('should calculate distance between north and south poles', () => {
            const dist = angularDistance(90, 0, -90, 0);
            expect(dist).toBeCloseTo(180, 1);
        });

        it('should calculate distance along equator', () => {
            // 90 degrees along equator
            const dist = angularDistance(0, 0, 0, 90);
            expect(dist).toBeCloseTo(90, 1);
        });

        it('should handle negative longitudes', () => {
            // CY3 Primary to CY3 Backup (different hemispheres)
            // Primary: -69.3676, 32.3481
            // Backup: -69.4977, -17.3304
            const dist = angularDistance(-69.3676, 32.3481, -69.4977, -17.3304);
            // These are about 50 degrees apart in longitude
            expect(dist).toBeGreaterThan(15);
            expect(dist).toBeLessThan(60);
        });

    });

    describe('Preset Sites Loading', () => {

        it('should load all preset sites', () => {
            const sites = loadPresetSites();
            expect(sites.length).toBe(5);
        });

        it('should include Shiv Shakti Point', () => {
            const sites = loadPresetSites();
            const shivShakti = sites.find(s => s.id === 'cy3-actual');
            expect(shivShakti).toBeDefined();
            expect(shivShakti?.name).toBe('Shiv Shakti Point');
            expect(shivShakti?.latitude).toBeCloseTo(-69.3733, 2);
            expect(shivShakti?.longitude).toBeCloseTo(32.3191, 2);
            expect(shivShakti?.isActualLanding).toBe(true);
        });

        it('should include CY2 sites', () => {
            const sites = loadPresetSites();
            const cy2Sites = sites.filter(s => s.mission === 'cy2');
            expect(cy2Sites.length).toBe(2);
        });

        it('should include CY3 sites', () => {
            const sites = loadPresetSites();
            const cy3Sites = sites.filter(s => s.mission === 'cy3');
            expect(cy3Sites.length).toBe(3);
        });

    });

    describe('Snap Defaults', () => {

        it('should return default snap settings', () => {
            const defaults = getSnapDefaults();
            expect(defaults.snapEnabled).toBe(true);
            expect(defaults.snapRadiusDeg).toBe(2);
            expect(defaults.snapRadiusOptions).toContain(1);
            expect(defaults.snapRadiusOptions).toContain(2);
            expect(defaults.snapRadiusOptions).toContain(5);
        });

    });

    describe('Filter Sites by Mission', () => {

        it('should filter CY3 sites only', () => {
            const sites = loadPresetSites();
            const cy3Sites = filterSitesByMission(sites, 'cy3');
            expect(cy3Sites.length).toBe(3);
            cy3Sites.forEach(s => expect(s.mission).toBe('cy3'));
        });

        it('should filter CY2 sites only', () => {
            const sites = loadPresetSites();
            const cy2Sites = filterSitesByMission(sites, 'cy2');
            expect(cy2Sites.length).toBe(2);
            cy2Sites.forEach(s => expect(s.mission).toBe('cy2'));
        });

        it('should return all sites for "all" filter', () => {
            const sites = loadPresetSites();
            const allSites = filterSitesByMission(sites, 'all');
            expect(allSites.length).toBe(5);
        });

    });

    describe('Find Nearest Site', () => {

        it('should find nearest site', () => {
            const sites = loadPresetSites();
            // Point very close to Shiv Shakti
            const result = findNearestSite(-69.38, 32.32, sites);
            expect(result).not.toBeNull();
            expect(result?.site.id).toBe('cy3-actual');
            expect(result?.distance).toBeLessThan(0.1);
        });

        it('should find CY2 primary when closer to that region', () => {
            const sites = loadPresetSites();
            // Point near CY2 Primary: -70.90, 22.78
            const result = findNearestSite(-70.85, 22.80, sites);
            expect(result).not.toBeNull();
            expect(result?.site.id).toBe('cy2-primary');
        });

        it('should return null for empty sites array', () => {
            const result = findNearestSite(-69.37, 32.32, []);
            expect(result).toBeNull();
        });

    });

    describe('Check Snap', () => {

        it('should snap when within radius', () => {
            const sites = loadPresetSites();
            // Point very close to Shiv Shakti (-69.3733, 32.3191)
            // Using 0.5 degrees offset from exact coordinates
            const result = checkSnap(-69.3733 + 0.5, 32.3191, sites, 2, true);
            expect(result.snapped).toBe(true);
            // Should snap to nearest site which could be Shiv Shakti or CY3-Primary (they are very close)
            expect(result.site?.mission).toBe('cy3');
        });

        it('should not snap when outside radius', () => {
            const sites = loadPresetSites();
            // Point 10 degrees away from all sites (far north of the polar regions)
            const result = checkSnap(-60, 0, sites, 2, true);
            expect(result.snapped).toBe(false);
            expect(result.site).not.toBeNull();  // Still returns nearest
        });

        it('should not snap when snap disabled', () => {
            const sites = loadPresetSites();
            // Point very close to Shiv Shakti
            const result = checkSnap(-69.37, 32.32, sites, 2, false);
            expect(result.snapped).toBe(false);
        });

        it('should not snap with empty sites array', () => {
            const result = checkSnap(-69.37, 32.32, [], 2, true);
            expect(result.snapped).toBe(false);
            expect(result.site).toBeNull();
        });

    });

    describe('Near Side Validation', () => {

        it('should return true for near side longitudes', () => {
            expect(isNearSide(0)).toBe(true);
            expect(isNearSide(45)).toBe(true);
            expect(isNearSide(-45)).toBe(true);
            expect(isNearSide(90)).toBe(true);
            expect(isNearSide(-90)).toBe(true);
        });

        it('should return false for far side longitudes', () => {
            expect(isNearSide(91)).toBe(false);
            expect(isNearSide(-91)).toBe(false);
            expect(isNearSide(180)).toBe(false);
            expect(isNearSide(-180)).toBe(false);
            expect(isNearSide(135)).toBe(false);
        });

        it('should validate all preset sites are on near side', () => {
            const sites = loadPresetSites();
            sites.forEach(site => {
                expect(isNearSide(site.longitude)).toBe(true);
            });
        });

    });

    describe('Format Coordinates', () => {

        it('should format southern latitude correctly', () => {
            const formatted = formatCoordinates(-69.37, 32.32);
            expect(formatted).toBe('69.37°S, 32.32°E');
        });

        it('should format northern latitude correctly', () => {
            const formatted = formatCoordinates(45.5, -90);
            expect(formatted).toBe('45.50°N, 90.00°W');
        });

        it('should handle zero coordinates', () => {
            const formatted = formatCoordinates(0, 0);
            expect(formatted).toBe('0.00°N, 0.00°E');
        });

    });

    describe('Get Site by ID', () => {

        it('should find site by ID', () => {
            const sites = loadPresetSites();
            const site = getSiteById(sites, 'cy3-actual');
            expect(site).toBeDefined();
            expect(site?.name).toBe('Shiv Shakti Point');
        });

        it('should return undefined for unknown ID', () => {
            const sites = loadPresetSites();
            const site = getSiteById(sites, 'unknown-site');
            expect(site).toBeUndefined();
        });

    });

});
