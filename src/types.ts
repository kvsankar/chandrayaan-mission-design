// ============================================================================
// Type Definitions
// ============================================================================

import type { Controller } from 'lil-gui';

/**
 * Application mode - determines which parameter set is active
 */
export type AppMode = 'Explore' | 'Plan' | 'Game';

/**
 * Moon mode - determines how Moon position is calculated
 */
export type MoonMode = 'Real' | 'Gamed';

/**
 * Which timeline slider controls the visualization
 */
export type RenderControlSlider = 'timeline' | 'launch' | 'intercept';

/**
 * Orbital parameters for spacecraft
 */
export interface OrbitalParams {
    inclination: number;
    raan: number;
    omega: number;
    perigeeAlt: number;
    apogeeAlt: number;
    trueAnomaly: number;
    isLaunched?: boolean;
}

/**
 * Launch event (TLI - Trans Lunar Injection)
 */
export interface LaunchEvent {
    exists: boolean;
    date: Date | null;
    inclination: number;
    raan: number;
    omega: number;
    perigeeAlt: number;
    apogeeAlt: number;
    trueAnomaly: number;
    moonInterceptDate: Date | null;
    captureDistance: number;
    syncTLIWithLOI: boolean;
    autoLOI: boolean;  // When true, LOI date is automatically selected from optimal dates
    optimalLOIDates: Date[];  // List of optimal LOI dates (equator/node crossings)
}

/**
 * Main application parameters (GUI state)
 */
export interface Params {
    // Global mode
    appMode: AppMode;

    // Visibility toggles
    showEquator: boolean;
    showAxes: boolean;
    showLunarOrbitPlane: boolean;
    showLunarOrbitFilledPlane: boolean;
    showLunarNodes: boolean;
    showMoon: boolean;
    showChandrayaanOrbitPlane: boolean;
    showChandrayaanOrbitFilledPlane: boolean;
    showChandrayaanOrbit: boolean;
    showChandrayaan: boolean;
    showChandrayaanNodes: boolean;
    showRAANAngle: boolean;
    showAOPAngle: boolean;

    // Moon mode
    moonMode: MoonMode;

    // Lunar orbit parameters
    lunarInclination: number;
    lunarNodes: number;
    moonRA: number;
    moonTrueAnomaly: number;
    moonRADisplay: string;
    moonDistanceDisplay: string;

    // Chandrayaan orbit parameters
    chandrayaanInclination: number;
    chandrayaanNodes: number;
    chandrayaanOmega: number;
    chandrayaanPerigeeAlt: number;
    chandrayaanApogeeAlt: number;
    chandrayaanRA: number;
    chandrayaanTrueAnomaly: number;
    chandrayaanPeriod: string;
    chandrayaanRADisplay: string;
    craftEarthDistance: string;
    craftMoonDistance: string;
    restrictOrbitalParams: boolean;
}

/**
 * Capture state - tracks when spacecraft is captured by Moon
 */
export interface CaptureState {
    isCaptured: boolean;
    captureDate: Date | null;
    captureThreshold: number;
}

/**
 * Real position in kilometers (for accurate distance calculations)
 */
export interface PositionKm {
    x: number;
    y: number;
    z: number;
}

/**
 * Cache for real positions
 */
export interface RealPositionsCache {
    moonPositionKm: PositionKm | null;
    craftPositionKm: PositionKm | null;
}

/**
 * Timeline state
 */
export interface TimelineState {
    startDate: Date;
    currentDate: Date;
    isPlaying: boolean;
    speed: number;
    daysElapsed: number;
}

/**
 * Render control state
 */
export interface RenderControl {
    activeSlider: RenderControlSlider;
    launchDays: number;
    interceptDays: number;
    renderDate: Date;
}

/**
 * Draft state for Plan mode
 */
export interface DraftState {
    isDirty: boolean;
    savedLaunchEvent: LaunchEvent | null;
}

/**
 * Controller references for lil-gui (enables/disables controls)
 */
export interface LunarControllers {
    inclination?: Controller;
    nodes?: Controller;
    moonRA?: Controller;
    moonTrueAnomaly?: Controller;
    moonRADisplay?: Controller;
    moonDistanceDisplay?: Controller;
}

/**
 * Chandrayaan controller references
 */
export interface ChandrayaanControllers {
    inclination?: Controller;
    nodes?: Controller;
    omega?: Controller;
    perigeeAlt?: Controller;
    apogeeAlt?: Controller;
    ra?: Controller;
    trueAnomaly?: Controller;
    period?: Controller;
    raDisplay?: Controller;
    craftEarthDistance?: Controller;
    craftMoonDistance?: Controller;
    restrictOrbitalParams?: Controller;
    // Inline sync buttons (HTML elements, not lil-gui controllers)
    syncInclinationBtn?: HTMLButtonElement;
    syncRaanBtn?: HTMLButtonElement;
    syncAopBtn?: HTMLButtonElement;
    syncApogeeBtn?: HTMLButtonElement;
    syncRABtn?: HTMLButtonElement;
}


/**
 * Complete orbital elements
 */
export interface OrbitalElements {
    inclination: number;
    raan: number;
    eccentricity: number;
    omega: number;  // argument of periapsis
    semiMajorAxis: number;  // in km
    perigee: number;  // in km
    apogee: number;  // in km
}

/**
 * Real Moon position data from ephemeris
 */
export interface RealMoonData {
    ra: number;
    dec: number;
    distance: number;
    inclination: number;
    raan: number;
    positionKm: PositionKm;
    orbitalElements: OrbitalElements;
}

/**
 * Cache utility
 */
export interface Cache<T> {
    get(key: unknown): T | null;
    set(value: T, key: unknown): T;
    invalidate(): void;
}

/**
 * Update functions map
 */
export interface UpdateFunctionsMap {
    [key: string]: (() => void) | undefined;
    updateLunarOrbitCircle?: () => void;
    updateLunarNodePositions?: () => void;
    updateMoonPosition?: () => void;
    updateChandrayaanOrbitCircle?: () => void;
    updateChandrayaanOrbit?: () => void;
    updateChandrayaanNodePositions?: () => void;
    updateRAANLines?: () => void;
    updateAOPLines?: () => void;
    updateCraftMoonDistance?: () => void;
    updateOrbitalElements?: () => void;
}

/**
 * Speed option for timeline playback
 * Type definition for future use
 */
export interface SpeedOption {
    value: number;
    label: string;
}

/**
 * State manager for parameter sets
 */
export interface StateManager {
    activateExploreParams(): void;
    activatePlanGameParams(): void;
    updateAllGUIDisplays(): void;
    saveParamsToLaunchEvent(): void;
}
