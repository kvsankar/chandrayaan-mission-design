/**
 * SiteMarkers - Preset landing site management and snap logic
 *
 * Handles:
 * - Loading preset sites from configuration
 * - Snap-to-site functionality
 * - Site filtering by mission
 */

import landingSitesData from '../data/landing-sites.json';

export interface PresetSite {
    id: string;
    name: string;
    shortLabel: string;
    mission: 'cy2' | 'cy3';
    missionYear: number;
    latitude: number;
    longitude: number;
    description: string;
    isActualLanding: boolean;
}

export interface SiteConfig {
    sites: PresetSite[];
    defaults: {
        snapEnabled: boolean;
        snapRadiusDeg: number;
        snapRadiusOptions: number[];
    };
}

export interface SnapResult {
    snapped: boolean;
    site: PresetSite | null;
    distance: number;  // Angular distance in degrees
}

/**
 * Calculate angular distance between two lat/lon points on a sphere
 * Uses the haversine formula
 */
export function angularDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const DEG_TO_RAD = Math.PI / 180;

    const lat1Rad = lat1 * DEG_TO_RAD;
    const lat2Rad = lat2 * DEG_TO_RAD;
    const dLatRad = (lat2 - lat1) * DEG_TO_RAD;
    const dLonRad = (lon2 - lon1) * DEG_TO_RAD;

    const a = Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLonRad / 2) * Math.sin(dLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Convert radians to degrees
    return c * (180 / Math.PI);
}

/**
 * Load all preset sites from configuration
 */
export function loadPresetSites(): PresetSite[] {
    return (landingSitesData as SiteConfig).sites;
}

/**
 * Get default snap settings
 */
export function getSnapDefaults(): SiteConfig['defaults'] {
    return (landingSitesData as SiteConfig).defaults;
}

/**
 * Filter sites by mission
 */
export function filterSitesByMission(
    sites: PresetSite[],
    mission: 'cy2' | 'cy3' | 'all'
): PresetSite[] {
    if (mission === 'all') {
        return sites;
    }
    return sites.filter(s => s.mission === mission);
}

/**
 * Find the nearest preset site to a given lat/lon
 */
export function findNearestSite(
    lat: number,
    lon: number,
    sites: PresetSite[]
): { site: PresetSite; distance: number } | null {
    if (sites.length === 0) return null;

    let nearest: PresetSite = sites[0];
    let minDistance = angularDistance(lat, lon, sites[0].latitude, sites[0].longitude);

    for (let i = 1; i < sites.length; i++) {
        const d = angularDistance(lat, lon, sites[i].latitude, sites[i].longitude);
        if (d < minDistance) {
            minDistance = d;
            nearest = sites[i];
        }
    }

    return { site: nearest, distance: minDistance };
}

/**
 * Check if crosshair should snap to a nearby site
 */
export function checkSnap(
    lat: number,
    lon: number,
    sites: PresetSite[],
    snapRadiusDeg: number,
    snapEnabled: boolean
): SnapResult {
    if (!snapEnabled || sites.length === 0) {
        return { snapped: false, site: null, distance: Infinity };
    }

    const nearest = findNearestSite(lat, lon, sites);
    if (!nearest) {
        return { snapped: false, site: null, distance: Infinity };
    }

    if (nearest.distance <= snapRadiusDeg) {
        return {
            snapped: true,
            site: nearest.site,
            distance: nearest.distance
        };
    }

    return {
        snapped: false,
        site: nearest.site,
        distance: nearest.distance
    };
}

/**
 * Validate that a site is on the near side (longitude -90 to +90)
 */
export function isNearSide(longitude: number): boolean {
    return Math.abs(longitude) <= 90;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lon: number): string {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';

    return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
}

/**
 * Get site by ID
 */
export function getSiteById(sites: PresetSite[], id: string): PresetSite | undefined {
    return sites.find(s => s.id === id);
}
