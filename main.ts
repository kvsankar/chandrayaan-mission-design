import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI, Controller } from 'lil-gui';
import * as Astronomy from 'astronomy-engine';
import { reactive, computed, watchEffect, ComputedRef, StopFunction } from './reactive.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Application mode - determines which parameter set is active
 */
type AppMode = 'Explore' | 'Plan' | 'Game';

/**
 * Moon mode - determines how Moon position is calculated
 */
type MoonMode = 'Real' | 'Gamed';

/**
 * Which timeline slider controls the visualization
 */
type RenderControlSlider = 'timeline' | 'launch' | 'intercept';

/**
 * Orbital parameters for spacecraft
 */
interface OrbitalParams {
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
interface LaunchEvent {
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
interface Params {
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
interface CaptureState {
    isCaptured: boolean;
    captureDate: Date | null;
    captureThreshold: number;
}

/**
 * Real position in kilometers (for accurate distance calculations)
 */
interface PositionKm {
    x: number;
    y: number;
    z: number;
}

/**
 * Cache for real positions
 */
interface RealPositionsCache {
    moonPositionKm: PositionKm | null;
    craftPositionKm: PositionKm | null;
}

/**
 * Timeline state
 */
interface TimelineState {
    startDate: Date;
    currentDate: Date;
    isPlaying: boolean;
    speed: number;
    daysElapsed: number;
}

/**
 * Render control state
 */
interface RenderControl {
    activeSlider: RenderControlSlider;
    launchDays: number;
    interceptDays: number;
    renderDate: Date;
}

/**
 * Draft state for Plan mode
 */
interface DraftState {
    isDirty: boolean;
    savedLaunchEvent: LaunchEvent | null;
}

/**
 * Controller references for lil-gui (enables/disables controls)
 */
interface LunarControllers {
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
interface ChandrayaanControllers {
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
 * Color scheme object
 */
interface Colors {
    xAxis: number;
    yAxis: number;
    zAxis: number;
    ariesMarker: number;
    equator: number;
    lunarOrbitPlane: number;
    lunarAscending: number;
    lunarDescending: number;
    moon: number;
    chandrayaanPlane: number;
    chandrayaanOrbit: number;
    chandrayaanAscending: number;
    chandrayaanDescending: number;
    chandrayaan: number;
}

/**
 * Complete orbital elements
 */
interface OrbitalElements {
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
interface RealMoonData {
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
interface Cache<T> {
    get(key: unknown): T | null;
    set(value: T, key: unknown): T;
    invalidate(): void;
}

/**
 * Update functions map
 */
interface UpdateFunctionsMap {
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
 */
// @ts-expect-error - Type definition for future use
interface SpeedOption {
    value: number;
    label: string;
}

/**
 * State manager for parameter sets
 */
interface StateManager {
    activateExploreParams(): void;
    activatePlanGameParams(): void;
    updateAllGUIDisplays(): void;
    saveParamsToLaunchEvent(): void;
}

// ============================================================================
// Three.js Scene Objects
// ============================================================================

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let celestialSphere: THREE.Mesh;
let equatorCircle: THREE.Line;
let lunarOrbitCircle: THREE.Line;
let lunarOrbitFilledPlane: THREE.Mesh;
let lunarOrbitEllipse: THREE.Line;  // Dashed ellipse showing actual lunar orbit
let chandrayaanOrbitCircle: THREE.Line;
let chandrayaanOrbitFilledPlane: THREE.Mesh;
let lunarAscendingNode: THREE.Mesh;
let lunarDescendingNode: THREE.Mesh;
let chandrayaanAscendingNode: THREE.Mesh;
let chandrayaanDescendingNode: THREE.Mesh;
let chandrayaanOrbitCircle3D: THREE.Line;
let chandrayaan: THREE.Mesh;
let moon: THREE.Mesh;
let xAxis: THREE.Line;
let yAxis: THREE.Line;
let zAxis: THREE.Line;
let ariesMarker: THREE.Sprite;
let raanLine1: THREE.Line;
let raanLine2: THREE.Line;
let raanArc: THREE.Line;
let raanPie: THREE.Mesh;
let raanLabel: THREE.Sprite;
let aopLine1: THREE.Line;
let aopLine2: THREE.Line;
let aopArc: THREE.Line;
let aopPie: THREE.Mesh;
let aopLabel: THREE.Sprite;

// ============================================================================
// Application State
// ============================================================================

// Parameters
const params: Params = {
    // Global mode
    appMode: 'Explore',

    // Visibility toggles
    showEquator: true,
    showAxes: true,
    showLunarOrbitPlane: true,
    showLunarOrbitFilledPlane: true,
    showLunarNodes: true,
    showMoon: true,
    showChandrayaanOrbitPlane: true,
    showChandrayaanOrbitFilledPlane: true,
    showChandrayaanOrbit: true,
    showChandrayaan: true,
    showChandrayaanNodes: true,
    showRAANAngle: false,
    showAOPAngle: false,

    // Moon mode
    moonMode: 'Gamed',

    // Lunar orbit parameters (plane only, with Moon on circular orbit)
    lunarInclination: 23.44,
    lunarNodes: 0,
    moonRA: 0,
    moonTrueAnomaly: 0,
    moonRADisplay: '--',
    moonDistanceDisplay: '--',

    // Chandrayaan orbit parameters (elliptical)
    chandrayaanInclination: 30,
    chandrayaanNodes: 0,
    chandrayaanOmega: 45,
    chandrayaanPerigeeAlt: 180,
    chandrayaanApogeeAlt: 378029,
    chandrayaanRA: 0,
    chandrayaanTrueAnomaly: 0,
    chandrayaanPeriod: '--',
    chandrayaanRADisplay: '--',
    craftEarthDistance: '--',
    craftMoonDistance: '--',
    restrictOrbitalParams: false,
};

// Capture state
const captureState: CaptureState = {
    isCaptured: false,
    captureDate: null,
    captureThreshold: 2000
};

// Real positions cache (for accurate distance calculations)
const realPositionsCache: RealPositionsCache = {
    moonPositionKm: null,
    craftPositionKm: null
};

// Update guard to prevent circular updates
let isUpdatingFromCode: boolean = false;

// Timeline constants
const TIMELINE_MAX_DAYS = 90;

// Timeline state
const timelineState: TimelineState = {
    startDate: new Date('2023-07-01T00:00:00'),
    currentDate: new Date('2023-07-01T00:00:00'),
    isPlaying: false,
    speed: 0.25,
    daysElapsed: 0
};

// Render control state
const renderControl: RenderControl = {
    activeSlider: 'timeline',
    launchDays: 0,
    interceptDays: 5,
    renderDate: new Date()
};

// TLI (Trans Lunar Injection) event state - REACTIVE
let launchEvent = reactive<LaunchEvent>({
    exists: false,
    date: null,
    inclination: 21.5,
    raan: 5,
    omega: 178,
    perigeeAlt: 180,
    apogeeAlt: 370000,
    trueAnomaly: 0,
    moonInterceptDate: null,
    captureDistance: 5000,
    syncTLIWithLOI: true,
    autoLOI: false,
    optimalLOIDates: []
});

// Expose for E2E testing
if (typeof window !== 'undefined') {
    (window as any).launchEvent = launchEvent;
    (window as any).params = params;
    (window as any).realPositionsCache = realPositionsCache;
    (window as any).updateRenderDate = updateRenderDate;
    (window as any).timelineState = timelineState;

    // Helper function to set the simulation time
    (window as any).setSimulationTime = (date: Date) => {
        const daysSinceStart = (date.getTime() - timelineState.startDate.getTime()) / (24 * 60 * 60 * 1000);
        timelineState.daysElapsed = daysSinceStart;
        updateRenderDate();
    };
}

// Draft state for Plan mode
const draftState: DraftState = {
    isDirty: false,
    savedLaunchEvent: null
};

// Parameter Set Class - Complete state isolation between modes
class ParameterSet {
    name: string;
    lunarInclination: number;
    lunarNodes: number;
    moonRA: number;
    moonTrueAnomaly: number;
    moonMode: MoonMode;
    chandrayaanInclination: number;
    chandrayaanNodes: number;
    chandrayaanOmega: number;
    chandrayaanPerigeeAlt: number;
    chandrayaanApogeeAlt: number;
    chandrayaanRA: number;
    chandrayaanTrueAnomaly: number;

    constructor(name: string, config: {
        lunarInclination: number;
        lunarNodes: number;
        moonRA: number;
        moonTrueAnomaly: number;
        moonMode: MoonMode;
        chandrayaanInclination: number;
        chandrayaanNodes: number;
        chandrayaanOmega: number;
        chandrayaanPerigeeAlt: number;
        chandrayaanApogeeAlt: number;
        chandrayaanRA: number;
        chandrayaanTrueAnomaly: number;
    }) {
        this.name = name;
        this.lunarInclination = config.lunarInclination;
        this.lunarNodes = config.lunarNodes;
        this.moonRA = config.moonRA;
        this.moonTrueAnomaly = config.moonTrueAnomaly;
        this.moonMode = config.moonMode;
        this.chandrayaanInclination = config.chandrayaanInclination;
        this.chandrayaanNodes = config.chandrayaanNodes;
        this.chandrayaanOmega = config.chandrayaanOmega;
        this.chandrayaanPerigeeAlt = config.chandrayaanPerigeeAlt;
        this.chandrayaanApogeeAlt = config.chandrayaanApogeeAlt;
        this.chandrayaanRA = config.chandrayaanRA;
        this.chandrayaanTrueAnomaly = config.chandrayaanTrueAnomaly;
    }

    copyTo(params: Params): void {
        params.lunarInclination = this.lunarInclination;
        params.lunarNodes = this.lunarNodes;
        params.moonRA = this.moonRA;
        params.moonTrueAnomaly = this.moonTrueAnomaly;
        params.moonMode = this.moonMode;
        params.chandrayaanInclination = this.chandrayaanInclination;
        params.chandrayaanNodes = this.chandrayaanNodes;
        params.chandrayaanOmega = this.chandrayaanOmega;
        params.chandrayaanPerigeeAlt = this.chandrayaanPerigeeAlt;
        params.chandrayaanApogeeAlt = this.chandrayaanApogeeAlt;
        params.chandrayaanRA = this.chandrayaanRA;
        params.chandrayaanTrueAnomaly = this.chandrayaanTrueAnomaly;
    }

    copyFrom(params: Params): void {
        this.lunarInclination = params.lunarInclination;
        this.lunarNodes = params.lunarNodes;
        this.moonRA = params.moonRA;
        this.moonTrueAnomaly = params.moonTrueAnomaly;
        this.moonMode = params.moonMode;
        this.chandrayaanInclination = params.chandrayaanInclination;
        this.chandrayaanNodes = params.chandrayaanNodes;
        this.chandrayaanOmega = params.chandrayaanOmega;
        this.chandrayaanPerigeeAlt = params.chandrayaanPerigeeAlt;
        this.chandrayaanApogeeAlt = params.chandrayaanApogeeAlt;
        this.chandrayaanRA = params.chandrayaanRA;
        this.chandrayaanTrueAnomaly = params.chandrayaanTrueAnomaly;
    }

    loadFromLaunchEvent(launchEvent: LaunchEvent): void {
        if (!launchEvent.exists) return;

        this.chandrayaanInclination = launchEvent.inclination;
        this.chandrayaanNodes = launchEvent.raan;
        this.chandrayaanOmega = launchEvent.omega;
        this.chandrayaanPerigeeAlt = launchEvent.perigeeAlt;
        this.chandrayaanApogeeAlt = launchEvent.apogeeAlt;
        this.chandrayaanTrueAnomaly = launchEvent.trueAnomaly || 0;
    }
}

// Set A: Explore mode (manual, gamed moon, not tied to real-world time)
const exploreParamSet = new ParameterSet('Explore', {
    lunarInclination: 23.44,
    lunarNodes: 0,
    moonRA: 0,
    moonTrueAnomaly: 0,
    moonMode: 'Gamed',
    chandrayaanInclination: 30,
    chandrayaanNodes: 0,
    chandrayaanOmega: 45,
    chandrayaanPerigeeAlt: 180,
    chandrayaanApogeeAlt: 378029,
    chandrayaanRA: 0,
    chandrayaanTrueAnomaly: 0
});

// Set B: Plan/Game modes (real moon ephemeris, launch event driven)
const planGameParamSet = new ParameterSet('Plan/Game', {
    lunarInclination: 23.44,
    lunarNodes: 0,
    moonRA: 0,
    moonTrueAnomaly: 0,
    moonMode: 'Real',
    chandrayaanInclination: 21.5,
    chandrayaanNodes: 5,
    chandrayaanOmega: 178,
    chandrayaanPerigeeAlt: 180,
    chandrayaanApogeeAlt: 370000,
    chandrayaanRA: 0,
    chandrayaanTrueAnomaly: 0
});

// Track which parameter set is currently active
let currentParamSet: ParameterSet = exploreParamSet;

// State Manager - handles switching between completely isolated parameter sets
const stateManager: StateManager = {
    activateExploreParams(): void {
        // When leaving Plan/Game mode, save launch event to planGameParamSet (not params)
        // This ensures we don't save stale params values back to planGameParamSet
        if (currentParamSet === planGameParamSet && launchEvent.exists) {
            planGameParamSet.loadFromLaunchEvent(launchEvent);
        } else {
            currentParamSet.copyFrom(params);
        }

        currentParamSet = exploreParamSet;
        exploreParamSet.copyTo(params);
        this.updateAllGUIDisplays();
    },

    activatePlanGameParams(): void {
        // When leaving Explore mode, save current params to exploreParamSet
        if (currentParamSet === exploreParamSet) {
            currentParamSet.copyFrom(params);
        }
        // When leaving Plan/Game mode (switching between Plan and Game), save launch event
        else if (launchEvent.exists) {
            planGameParamSet.loadFromLaunchEvent(launchEvent);
        }

        currentParamSet = planGameParamSet;

        if (launchEvent.exists) {
            planGameParamSet.loadFromLaunchEvent(launchEvent);
        }

        planGameParamSet.copyTo(params);
        this.updateAllGUIDisplays();
    },

    updateAllGUIDisplays(): void {
        if (lunarControllers.inclination) lunarControllers.inclination?.updateDisplay();
        if (lunarControllers.nodes) lunarControllers.nodes?.updateDisplay();
        if (lunarControllers.moonRA) lunarControllers.moonRA?.updateDisplay();

        if (chandrayaanControllers.inclination) chandrayaanControllers.inclination?.updateDisplay();
        if (chandrayaanControllers.nodes) chandrayaanControllers.nodes?.updateDisplay();
        if (chandrayaanControllers.omega) chandrayaanControllers.omega?.updateDisplay();
        if (chandrayaanControllers.perigeeAlt) chandrayaanControllers.perigeeAlt?.updateDisplay();
        if (chandrayaanControllers.apogeeAlt) chandrayaanControllers.apogeeAlt?.updateDisplay();
        if (chandrayaanControllers.trueAnomaly) chandrayaanControllers.trueAnomaly?.updateDisplay();
    },

    saveParamsToLaunchEvent(): void {
        if (!launchEvent.exists) return;

        launchEvent.inclination = params.chandrayaanInclination;
        launchEvent.raan = params.chandrayaanNodes;
        launchEvent.omega = params.chandrayaanOmega;
        launchEvent.perigeeAlt = params.chandrayaanPerigeeAlt;
        launchEvent.apogeeAlt = params.chandrayaanApogeeAlt;
        launchEvent.trueAnomaly = params.chandrayaanTrueAnomaly;

        draftState.isDirty = true;
    }
};

// ============================================================================
// REACTIVE LAUNCH EVENT SYSTEM
// ============================================================================

// COMPUTED: TLI date automatically computed from LOI when sync is enabled
const computedTLIDate: ComputedRef<Date | null> = computed(() => {
    if (!launchEvent.syncTLIWithLOI || !launchEvent.moonInterceptDate) {
        return launchEvent.date;
    }

    const periodSeconds = calculateOrbitalPeriod(
        launchEvent.perigeeAlt,
        launchEvent.apogeeAlt
    );
    const halfPeriodMs = (periodSeconds / 2) * 1000;
    return new Date(launchEvent.moonInterceptDate.getTime() - halfPeriodMs);
});

// COMPUTED: Orbital period for display
const computedPeriod: ComputedRef<string> = computed(() => {
    if (!launchEvent.exists) return '--';
    return formatPeriod(
        calculateOrbitalPeriod(launchEvent.perigeeAlt, launchEvent.apogeeAlt)
    );
});

// Launch event GUI instance
let launchEventGUI: GUI | null = null;
let launchEventGUIParams: any = null;
let launchDateController: Controller | null = null;

// GUI controller references
const lunarControllers: LunarControllers = {};
const chandrayaanControllers: ChandrayaanControllers = {};
let lunarFolder: GUI;
let chandrayaanFolder: GUI;
// @ts-expect-error - Used for conditional updates
let moonModeController: Controller;

// Store effect cleanup functions
const reactiveEffectStops: StopFunction[] = [];
let reactiveEffectsInitialized: boolean = false;

function setupReactiveEffects(): void {
    if (reactiveEffectsInitialized) return;
    reactiveEffectsInitialized = true;

    // Auto-sync TLI date when computed value changes
    reactiveEffectStops.push(watchEffect(() => {
        if (!launchEvent.exists || !launchEvent.syncTLIWithLOI) return;

        const tliDate = computedTLIDate.value;
        if (tliDate && tliDate !== launchEvent.date) {
            if (!isUpdatingFromCode) {
                isUpdatingFromCode = true;
                launchEvent.date = tliDate;
                isUpdatingFromCode = false;
            }
        }
    }, { name: 'TLI Date Sync' }));

    // Auto-update TLI GUI display when TLI date changes
    reactiveEffectStops.push(watchEffect(() => {
        if (!launchEvent.exists || !launchDateController) return;

        const tliDate = launchEvent.date;
        if (tliDate && launchEventGUIParams) {
            launchEventGUIParams.launchDate = formatDateForDisplay(tliDate);
            launchDateController.updateDisplay();
        }
    }, { name: 'TLI GUI Update' }));

    // Auto-update LOI GUI display when LOI date changes
    reactiveEffectStops.push(watchEffect(() => {
        if (!launchEvent.exists) return;

        const loiDate = launchEvent.moonInterceptDate;
        if (loiDate && launchEventGUIParams) {
            launchEventGUIParams.moonInterceptDate = formatDateForDisplay(loiDate);
        }
    }, { name: 'LOI GUI Update' }));

    // Auto-update period display when perigee/apogee changes
    reactiveEffectStops.push(watchEffect(() => {
        if (!launchEvent.exists || !launchEventGUIParams) return;

        launchEventGUIParams.period = computedPeriod.value;
    }, { name: 'Period Display Update' }));

    // Auto-handle sync toggle
    reactiveEffectStops.push(watchEffect(() => {
        if (!launchEvent.exists || !launchDateController) return;

        if (launchEvent.syncTLIWithLOI) {
            launchDateController.disable();
        } else {
            launchDateController.enable();
        }
    }, { name: 'Sync Toggle Handler' }));

    // Auto-update timeline sliders when dates change
    reactiveEffectStops.push(watchEffect(() => {
        if (!launchEvent.exists) return;

        // Read reactive properties to track dependencies
        // @ts-expect-error - Unused but needed for reactivity
        const tliDate = launchEvent.date;
        // @ts-expect-error - Unused but needed for reactivity
        const loiDate = launchEvent.moonInterceptDate;

        syncRenderControlSlidersWithLaunchEvent();
    }, { name: 'Timeline Slider Sync' }));

    // Auto-update launch marker when TLI date changes
    reactiveEffectStops.push(watchEffect(() => {
        if (!launchEvent.exists) return;

        const tliDate = launchEvent.date;
        if (tliDate) {
            updateLaunchMarker();
        }
    }, { name: 'Launch Marker Update' }));

    // Auto-update visualization when orbital parameters change
    reactiveEffectStops.push(watchEffect(() => {
        if (!launchEvent.exists) return;

        // Read reactive properties to track dependencies
        // @ts-expect-error - Unused but needed for reactivity
        const inc = launchEvent.inclination;
        // @ts-expect-error - Unused but needed for reactivity
        const raan = launchEvent.raan;
        // @ts-expect-error - Unused but needed for reactivity
        const omega = launchEvent.omega;
        // @ts-expect-error - Unused but needed for reactivity
        const perigee = launchEvent.perigeeAlt;
        // @ts-expect-error - Unused but needed for reactivity
        const apogee = launchEvent.apogeeAlt;
        // @ts-expect-error - Unused but needed for reactivity
        const ta = launchEvent.trueAnomaly;

        if (params.appMode === 'Plan') {
            draftState.isDirty = true;
        }

        syncParamsToLaunchEvent();
        invalidateOrbitalParamsCache();
        updateRenderDate();
    }, { name: 'Orbital Parameters Visualization' }));

    // Auto-update visualization when dates change
    reactiveEffectStops.push(watchEffect(() => {
        if (!launchEvent.exists) return;

        // Read reactive properties to track dependencies
        // @ts-expect-error - Unused but needed for reactivity
        const tliDate = launchEvent.date;
        // @ts-expect-error - Unused but needed for reactivity
        const loiDate = launchEvent.moonInterceptDate;

        updateRenderDate();
    }, { name: 'Date Change Visualization' }));
}

// @ts-expect-error - Function referenced but may appear unused
function cleanupReactiveEffects(): void {
    reactiveEffectStops.forEach(stop => stop());
    reactiveEffectStops.length = 0;
    reactiveEffectsInitialized = false;
}

// ============================================================================
// Constants
// ============================================================================

// Scene and orbital constants
const SPHERE_RADIUS = 100;
const LUNAR_ORBIT_DISTANCE = 384400;
const SCALE_FACTOR = SPHERE_RADIUS / LUNAR_ORBIT_DISTANCE;
const EARTH_RADIUS = 6371;
// @ts-expect-error - Constant for future use
const MOON_RADIUS = 1737;
const EARTH_MU = 398600.4418;

// Camera configuration
const CAMERA_FOV = 45;
const CAMERA_NEAR_PLANE = 0.1;
const CAMERA_FAR_PLANE = 10000;
const CAMERA_INITIAL_X = 240;
const CAMERA_INITIAL_Y = 160;
const CAMERA_INITIAL_Z = 240;

// Rendering constants
const ORBIT_SEGMENTS_DETAILED = 512;
const ORBIT_SEGMENTS_STANDARD = 128;
const SPRITE_CANVAS_SIZE = 128;
const SPRITE_FONT_SIZE = 80;

// Zoom-aware scaling constants
const ZOOM_BASE_DISTANCE = 240;
const ZOOM_BASE_SCALE = 1.0;
const ZOOM_NODE_MIN_SCALE = 0.3;
const ZOOM_NODE_MAX_SCALE = 1.5;
const ZOOM_ARIES_MIN_SCALE = 0.2;
const ZOOM_ARIES_MAX_SCALE = 0.8;
const ZOOM_SPACECRAFT_MIN_SCALE = 0.5;
const ZOOM_SPACECRAFT_MAX_SCALE = 2.0;

// Sprite base sizes
const ARIES_MARKER_BASE_SIZE = 8;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate true anomaly from Right Ascension using spherical trigonometry
 * Inverts the formula: RA = RAAN + atan2(cos(i) * sin(u), cos(u))
 *
 * @param raDeg - Right Ascension in degrees
 * @param raanDeg - Right Ascension of Ascending Node in degrees
 * @param omegaDeg - Argument of Periapsis in degrees
 * @param incDeg - Inclination in degrees
 * @returns True anomaly in degrees
 */
function calculateTrueAnomalyFromRA(
    raDeg: number,
    raanDeg: number,
    omegaDeg: number,
    incDeg: number
): number {
    const raRad = THREE.MathUtils.degToRad(raDeg);
    const raanRad = THREE.MathUtils.degToRad(raanDeg);
    const incRad = THREE.MathUtils.degToRad(incDeg);
    const omegaRad = THREE.MathUtils.degToRad(omegaDeg);

    const deltaRA = raRad - raanRad;

    // Solve for argument of latitude u from: RA = RAAN + atan2(cos(i) * sin(u), cos(u))
    // Using the derived formula that preserves quadrant information
    const k = 1 / Math.sqrt(Math.sin(deltaRA) ** 2 + Math.cos(deltaRA) ** 2 * Math.cos(incRad) ** 2);
    const sinU = k * Math.sin(deltaRA);
    const cosU = k * Math.cos(deltaRA) * Math.cos(incRad);
    const uRad = Math.atan2(sinU, cosU);

    // True anomaly = u - omega
    const nuRad = uRad - omegaRad;
    return THREE.MathUtils.radToDeg(nuRad);
}

/**
 * Calculate Right Ascension from true anomaly using spherical trigonometry
 * Forward formula: RA = RAAN + atan2(cos(i) * sin(u), cos(u))
 * where u = omega + nu (argument of latitude)
 */
function calculateRAFromTrueAnomaly(
    nuDeg: number,
    raanDeg: number,
    omegaDeg: number,
    incDeg: number
): number {
    const nuRad = THREE.MathUtils.degToRad(nuDeg);
    const raanRad = THREE.MathUtils.degToRad(raanDeg);
    const incRad = THREE.MathUtils.degToRad(incDeg);
    const omegaRad = THREE.MathUtils.degToRad(omegaDeg);

    // Argument of latitude u = omega + nu
    const uRad = omegaRad + nuRad;

    // RA = RAAN + atan2(cos(i) * sin(u), cos(u))
    const raRad = raanRad + Math.atan2(Math.cos(incRad) * Math.sin(uRad), Math.cos(uRad));

    return THREE.MathUtils.radToDeg(raRad);
}

function calculateChandrayaanEccentricity(): number {
    const perigeeDistance = EARTH_RADIUS + params.chandrayaanPerigeeAlt;
    const apogeeDistance = EARTH_RADIUS + params.chandrayaanApogeeAlt;
    const e = (apogeeDistance - perigeeDistance) / (apogeeDistance + perigeeDistance);
    return e;
}

function getClosestAllowedInclination(currentInclination: number): number {
    const allowed = [21.5, 41.8];
    return allowed.reduce((prev, curr) =>
        Math.abs(curr - currentInclination) < Math.abs(prev - currentInclination) ? curr : prev
    );
}

function getAllowedOmegaValues(inclination: number): number[] {
    if (inclination === 21.5) {
        return [178];
    } else if (inclination === 41.8) {
        return [198, 203];
    }
    return [178];
}

function getClosestAllowedOmega(currentOmega: number, inclination: number): number {
    const allowed = getAllowedOmegaValues(inclination);
    return allowed.reduce((prev, curr) =>
        Math.abs(curr - currentOmega) < Math.abs(prev - currentOmega) ? curr : prev
    );
}

function calculateOrbitalPeriod(perigeeAlt: number, apogeeAlt: number): number {
    const rp = EARTH_RADIUS + perigeeAlt;
    const ra = EARTH_RADIUS + apogeeAlt;
    const a = (rp + ra) / 2;
    const T = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / EARTH_MU);
    return T;
}

function showConfirmDialog(message: string, title: string = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal')!;
        const titleEl = document.getElementById('confirm-modal-title')!;
        const messageEl = document.getElementById('confirm-modal-message')!;
        const okBtn = document.getElementById('confirm-modal-ok')!;
        const cancelBtn = document.getElementById('confirm-modal-cancel')!;

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.style.display = 'flex';

        const handleOk = (): void => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = (): void => {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

function showAlert(message: string, title: string = 'Notice'): void {
    // Create modal elements if they don't exist
    let modal = document.getElementById('custom-alert-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'custom-alert-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 24px;
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        const titleEl = document.createElement('h3');
        titleEl.id = 'alert-modal-title';
        titleEl.style.cssText = `
            margin: 0 0 16px 0;
            color: #fff;
            font-size: 18px;
            font-weight: bold;
        `;

        const messageEl = document.createElement('pre');
        messageEl.id = 'alert-modal-message';
        messageEl.style.cssText = `
            margin: 0 0 20px 0;
            color: #ddd;
            font-size: 14px;
            white-space: pre-wrap;
            font-family: Arial, sans-serif;
            line-height: 1.5;
        `;

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
        `;

        const okBtn = document.createElement('button');
        okBtn.id = 'alert-modal-ok';
        okBtn.textContent = 'OK';
        okBtn.style.cssText = `
            padding: 8px 24px;
            background: #555;
            border: 1px solid #666;
            border-radius: 4px;
            color: #fff;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
        `;
        okBtn.addEventListener('mouseenter', () => okBtn.style.background = '#666');
        okBtn.addEventListener('mouseleave', () => okBtn.style.background = '#555');

        buttonContainer.appendChild(okBtn);
        dialog.appendChild(titleEl);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttonContainer);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
    }

    const titleEl = document.getElementById('alert-modal-title')!;
    const messageEl = document.getElementById('alert-modal-message')!;
    const okBtn = document.getElementById('alert-modal-ok')!;

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.style.display = 'flex';

    const handleOk = (): void => {
        modal!.style.display = 'none';
        okBtn.removeEventListener('click', handleOk);
    };

    okBtn.addEventListener('click', handleOk);
}

// ============================================================================
// CENTRALIZED PARAMETER CHANGE SYSTEM
// ============================================================================

const ParameterDependencies: { [key: string]: string[] } = {
    lunarInclination: [
        'updateLunarOrbitCircle',
        'updateLunarNodePositions',
        'updateMoonPosition',
        'updateOrbitalElements'
    ],
    lunarNodes: [
        'updateLunarOrbitCircle',
        'updateLunarNodePositions',
        'updateMoonPosition',
        'updateRAANLines',
        'updateOrbitalElements'
    ],
    moonRA: [
        'updateMoonPosition',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ],
    moonTrueAnomaly: [
        'updateMoonPosition',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ],
    chandrayaanInclination: [
        'updateChandrayaanOrbitCircle',
        'updateChandrayaanOrbit',
        'updateChandrayaanNodePositions',
        'updateAOPLines',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ],
    chandrayaanNodes: [
        'updateChandrayaanOrbitCircle',
        'updateChandrayaanOrbit',
        'updateChandrayaanNodePositions',
        'updateRAANLines',
        'updateAOPLines',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ],
    chandrayaanOmega: [
        'updateChandrayaanOrbitCircle',
        'updateChandrayaanOrbit',
        'updateAOPLines',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ],
    chandrayaanPerigeeAlt: [
        'updateChandrayaanOrbit',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ],
    chandrayaanApogeeAlt: [
        'updateChandrayaanOrbit',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ],
    chandrayaanRA: [
        'updateChandrayaanOrbit',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ],
    chandrayaanTrueAnomaly: [
        'updateChandrayaanOrbit',
        'updateCraftMoonDistance',
        'updateOrbitalElements'
    ]
};

const UpdateFunctions: UpdateFunctionsMap = {};

function onParameterChange(paramName: string, newValue: any, skipSync: boolean = false): void {
    if (isUpdatingFromCode) return;

    isUpdatingFromCode = true;

    try {
        (params as any)[paramName] = newValue;

        if (!skipSync) {
            syncParamsToLaunchEvent();
        }

        if (paramName.startsWith('chandrayaan') || paramName.startsWith('moon')) {
            invalidateOrbitalParamsCache();
        }

        const dependencies = ParameterDependencies[paramName] || [];
        for (const funcName of dependencies) {
            const func = UpdateFunctions[funcName];
            if (func && typeof func === 'function') {
                func();
            } else {
                console.warn(`Update function not found: ${funcName}`);
            }
        }
    } finally {
        isUpdatingFromCode = false;
    }
}

// Helper functions for time conversion
const secondsToHours = (seconds: number): number => Math.floor(seconds / 3600);
const secondsToMinutes = (seconds: number): number => Math.floor((seconds % 3600) / 60);
const secondsToSecs = (seconds: number): number => Math.floor(seconds % 60);
const hoursToDays = (hours: number): number => Math.floor(hours / 24);
const hoursRemainder = (hours: number): number => hours % 24;

function formatPeriod(seconds: number): string {
    const hours = secondsToHours(seconds);
    const minutes = secondsToMinutes(seconds);
    const secs = secondsToSecs(seconds);

    if (hours > 24) {
        const days = hoursToDays(hours);
        const remainingHours = hoursRemainder(hours);
        return `${days}d ${remainingHours}h ${minutes}m`;
    }

    return hours > 0
        ? `${hours}h ${minutes}m ${secs}s`
        : `${minutes}m ${secs}s`;
}

function getTrueAnomalyFromTime(timeSinceLaunch: number, perigeeAlt: number, apogeeAlt: number): number {
    const rp = EARTH_RADIUS + perigeeAlt;
    const ra = EARTH_RADIUS + apogeeAlt;
    const a = (rp + ra) / 2;
    const e = (ra - rp) / (ra + rp);

    const n = Math.sqrt(EARTH_MU / Math.pow(a, 3));
    const M = n * timeSinceLaunch;

    let E = M;
    for (let i = 0; i < 10; i++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }

    const trueAnomaly = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    let trueAnomalyDeg = trueAnomaly * 180 / Math.PI;
    if (trueAnomalyDeg < 0) trueAnomalyDeg += 360;

    return trueAnomalyDeg;
}

function createCache<T>(): Cache<T> {
    let cache = { value: null as T | null, key: null as unknown };

    return {
        get: (key: unknown): T | null => (key === cache.key && cache.value !== null) ? cache.value : null,
        set: (value: T, key: unknown): T => {
            cache = { value, key };
            return value;
        },
        invalidate: (): void => {
            cache = { value: null, key: null };
        }
    };
}

const orbitalParamsCache = createCache<OrbitalParams>();
let currentAnimationFrame: number = 0;

function invalidateOrbitalParamsCache(): void {
    orbitalParamsCache.invalidate();
}

function getRenderDate(): Date {
    return renderControl.renderDate ?? timelineState.currentDate;
}

function calculateChandrayaanParams(options: {
    launchEvent: LaunchEvent;
    manualParams: OrbitalParams;
    renderDate: Date;
    mode: AppMode;
}): OrbitalParams {
    const { launchEvent, manualParams, renderDate, mode } = options;

    if (mode === 'Explore') {
        return {
            ...manualParams,
            isLaunched: false
        };
    }

    if (launchEvent.exists) {
        const isLaunched = renderDate >= (launchEvent.date || new Date(0));

        const trueAnomaly = isLaunched
            ? getTrueAnomalyFromTime(
                (renderDate.getTime() - (launchEvent.date?.getTime() || 0)) / 1000,
                launchEvent.perigeeAlt,
                launchEvent.apogeeAlt
            )
            : 0;

        return {
            inclination: launchEvent.inclination,
            raan: launchEvent.raan,
            omega: launchEvent.omega,
            perigeeAlt: launchEvent.perigeeAlt,
            apogeeAlt: launchEvent.apogeeAlt,
            trueAnomaly,
            isLaunched
        };
    }

    return {
        ...manualParams,
        isLaunched: false
    };
}

function getChandrayaanParams(): OrbitalParams {
    const cached = orbitalParamsCache.get(currentAnimationFrame);
    if (cached) {
        return cached;
    }

    const result = calculateChandrayaanParams({
        launchEvent,
        manualParams: {
            inclination: params.chandrayaanInclination,
            raan: params.chandrayaanNodes,
            omega: params.chandrayaanOmega,
            perigeeAlt: params.chandrayaanPerigeeAlt,
            apogeeAlt: params.chandrayaanApogeeAlt,
            trueAnomaly: params.chandrayaanTrueAnomaly
        },
        renderDate: getRenderDate(),
        mode: params.appMode
    });

    return orbitalParamsCache.set(result, currentAnimationFrame);
}

function calculateOrbitalElements(posVector: any, velVector: any): OrbitalElements {
    const AU_TO_KM = 149597870.7;
    const DAYS_TO_SEC = 86400.0;
    const MU_EARTH = 398600.4418;  // km^3/s^2

    const r = {
        x: posVector.x * AU_TO_KM,
        y: posVector.y * AU_TO_KM,
        z: posVector.z * AU_TO_KM
    };

    const v = {
        x: velVector.dx * AU_TO_KM / DAYS_TO_SEC,
        y: velVector.dy * AU_TO_KM / DAYS_TO_SEC,
        z: velVector.dz * AU_TO_KM / DAYS_TO_SEC
    };

    const rMag = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
    const vMag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);

    // Angular momentum vector
    const h = {
        x: r.y * v.z - r.z * v.y,
        y: r.z * v.x - r.x * v.z,
        z: r.x * v.y - r.y * v.x
    };

    const hMag = Math.sqrt(h.x * h.x + h.y * h.y + h.z * h.z);
    const inclination = Math.acos(h.z / hMag) * 180 / Math.PI;

    // Node vector
    const n = {
        x: -h.y,
        y: h.x,
        z: 0
    };

    const nMag = Math.sqrt(n.x * n.x + n.y * n.y);

    let raan = 0;
    if (nMag > 1e-10) {
        raan = Math.acos(n.x / nMag) * 180 / Math.PI;
        if (n.y < 0) raan = 360 - raan;
    }

    // Eccentricity vector
    const rdotv = r.x * v.x + r.y * v.y + r.z * v.z;
    const e = {
        x: (vMag * vMag - MU_EARTH / rMag) * r.x - rdotv * v.x,
        y: (vMag * vMag - MU_EARTH / rMag) * r.y - rdotv * v.y,
        z: (vMag * vMag - MU_EARTH / rMag) * r.z - rdotv * v.z
    };
    const eMag = Math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z) / MU_EARTH;

    // Semi-major axis
    const energy = vMag * vMag / 2 - MU_EARTH / rMag;
    const a = -MU_EARTH / (2 * energy);

    // Argument of periapsis
    let omega = 0;
    if (nMag > 1e-10 && eMag > 1e-10) {
        const cosOmega = (n.x * e.x + n.y * e.y + n.z * e.z) / (nMag * eMag * MU_EARTH);
        omega = Math.acos(Math.max(-1, Math.min(1, cosOmega))) * 180 / Math.PI;
        if (e.z < 0) omega = 360 - omega;
    }

    // Perigee and apogee
    const perigee = a * (1 - eMag) - EARTH_RADIUS;
    const apogee = a * (1 + eMag) - EARTH_RADIUS;

    return {
        inclination: inclination,
        raan: raan,
        eccentricity: eMag,
        omega: omega,
        semiMajorAxis: a,
        perigee: perigee,
        apogee: apogee
    };
}

function calculateRealMoonPosition(date: Date): RealMoonData {
    const astroTime = Astronomy.MakeTime(date);
    const state: any = Astronomy.GeoMoonState(astroTime);

    // Handle both StateVector (x, y, z directly) and { position, velocity } formats
    // The runtime library may differ from type definitions
    const hasPosition = state.position !== undefined;

    const geoVector = {
        x: hasPosition ? state.position.x : state.x,
        y: hasPosition ? state.position.y : state.y,
        z: hasPosition ? state.position.z : state.z,
        t: hasPosition ? state.position.t : state.t
    };

    const velVector = {
        dx: hasPosition ? state.velocity.x : state.vx,
        dy: hasPosition ? state.velocity.y : state.vy,
        dz: hasPosition ? state.velocity.z : state.vz
    };

    const equatorial = Astronomy.EquatorFromVector(geoVector);

    const ra = equatorial.ra * 15;
    const dec = equatorial.dec;
    const distanceKm = equatorial.dist * 149597870.7;

    const elements = calculateOrbitalElements(geoVector, velVector);

    // Convert from AU to km
    const celestialPosKm = {
        x: geoVector.x * 149597870.7,
        y: geoVector.y * 149597870.7,
        z: geoVector.z * 149597870.7
    };

    const positionKm = {
        x: celestialPosKm.x,
        y: celestialPosKm.z,
        z: -celestialPosKm.y
    };

    return {
        ra: ra % 360,
        dec: dec,
        distance: distanceKm,
        inclination: elements.inclination,
        raan: elements.raan,
        positionKm: positionKm,
        orbitalElements: elements
    };
}

/**
 * Find times when Moon crosses the equatorial plane (declination = 0)
 * Returns both ascending and descending crossings (nodes) for ~13.7 day spacing
 * Note: In this project, "nodes" means equator crossings, not ecliptic crossings
 * @param startDate - Start of search window
 * @param endDate - End of search window
 * @returns Array of AstroTime objects when Moon crosses equator (both directions)
 */
function findMoonEquatorCrossings(startDate: Date, endDate: Date): Astronomy.AstroTime[] {
    const crossings: Astronomy.AstroTime[] = [];
    const t1 = Astronomy.MakeTime(startDate);
    const t2 = Astronomy.MakeTime(endDate);

    // Function that returns Moon's declination
    const declinationFunc = (t: Astronomy.AstroTime): number => {
        const state: any = Astronomy.GeoMoonState(t);
        const hasPosition = state.position !== undefined;
        const geoVector = {
            x: hasPosition ? state.position.x : state.x,
            y: hasPosition ? state.position.y : state.y,
            z: hasPosition ? state.position.z : state.z,
            t: hasPosition ? state.position.t : state.t
        };
        const equatorial = Astronomy.EquatorFromVector(geoVector);
        return equatorial.dec;  // Returns declination in degrees
    };

    // Search for zero crossings in declination
    let searchStart = t1;
    const stepDays = 1.0;  // Search in 1-day increments

    while (searchStart.ut < t2.ut) {
        const searchEnd = (searchStart as any).AddDays(stepDays);
        if (searchEnd.ut > t2.ut) break;

        // Check if there's a sign change in this interval
        const dec1 = declinationFunc(searchStart);
        const dec2 = declinationFunc(searchEnd);

        // Detect BOTH ascending and descending crossings
        // This gives opportunities every ~13.7 days instead of ~27 days
        if (dec1 * dec2 < 0) {  // Sign change = equator crossing (either direction)
            const crossing = (Astronomy as any).Search(declinationFunc, searchStart, searchEnd);
            if (crossing) {
                crossings.push(crossing);
            }
        }

        searchStart = searchEnd;
    }

    return crossings;
}

/**
 * Find times when Moon crosses orbital nodes (latitude = 0 in ecliptic coords)
 * Only returns ascending crossings (south to north) for ~14 day spacing
 * @param startDate - Start of search window
 * @param endDate - End of search window
 * @returns Array of AstroTime objects when Moon crosses ascending node
 */
// @ts-ignore - keeping for potential future use
function findMoonNodeCrossings(startDate: Date, endDate: Date): Astronomy.AstroTime[] {
    const crossings: Astronomy.AstroTime[] = [];
    const t1 = Astronomy.MakeTime(startDate);
    const t2 = Astronomy.MakeTime(endDate);

    // Function that returns Moon's ecliptic latitude
    const latitudeFunc = (t: Astronomy.AstroTime): number => {
        const state: any = Astronomy.GeoMoonState(t);
        const hasPosition = state.position !== undefined;
        const geoVector = {
            x: hasPosition ? state.position.x : state.x,
            y: hasPosition ? state.position.y : state.y,
            z: hasPosition ? state.position.z : state.z,
            t: hasPosition ? state.position.t : state.t
        };
        const ecliptic = (Astronomy as any).Ecliptic(geoVector);
        return ecliptic.elat;  // Returns ecliptic latitude in degrees
    };

    // Search for zero crossings in ecliptic latitude
    let searchStart = t1;
    const stepDays = 1.0;  // Search in 1-day increments

    while (searchStart.ut < t2.ut) {
        const searchEnd = (searchStart as any).AddDays(stepDays);
        if (searchEnd.ut > t2.ut) break;

        // Check if there's a sign change in this interval
        const lat1 = latitudeFunc(searchStart);
        const lat2 = latitudeFunc(searchEnd);

        // Only detect ascending node crossings: lat1 < 0 and lat2 > 0 (south to north)
        if (lat1 < 0 && lat2 > 0) {  // Ascending node crossing
            const crossing = (Astronomy as any).Search(latitudeFunc, searchStart, searchEnd);
            if (crossing) {
                crossings.push(crossing);
            }
        }

        searchStart = searchEnd;
    }

    return crossings;
}

/**
 * Find optimal LOI dates (equator crossings + node crossings)
 * @param startDate - Start of search window
 * @param endDate - End of search window
 * @returns Array of Date objects sorted chronologically
 */
function findOptimalLOIDates(startDate: Date, endDate: Date): Date[] {
    // Use ONLY equator crossings for ~27-day spacing
    // (Node crossings are for ecliptic plane, which is different from equatorial plane)
    const equatorCrossings = findMoonEquatorCrossings(startDate, endDate);

    // Convert to Date objects
    const allDates = equatorCrossings.map(t => t.date);

    // Sort chronologically
    allDates.sort((a, b) => a.getTime() - b.getTime());

    return allDates;
}

// ============================================================================
// APOGEE-MOON DISTANCE OPTIMIZATION
// ============================================================================


/**
 * Calculate Moon's position at a given date
 * Returns position in km (Three.js coordinates)
 */
function calculateMoonPositionAtDate(date: Date): { x: number, y: number, z: number } {
    const astroTime = Astronomy.MakeTime(date);
    const state: any = Astronomy.GeoMoonState(astroTime);

    // Get position from state
    const hasPosition = state.position !== undefined;
    const geoVector = {
        x: hasPosition ? state.position.x : state.x,
        y: hasPosition ? state.position.y : state.y,
        z: hasPosition ? state.position.z : state.z,
        t: hasPosition ? state.position.t : state.t
    };

    // Convert AU to km (1 AU = 149597870.7 km)
    const moonPosKm = {
        x: geoVector.x * 149597870.7,
        y: geoVector.y * 149597870.7,
        z: geoVector.z * 149597870.7
    };

    // Convert from celestial coordinates to Three.js coordinates
    // Must match the transformation used by calculateRealMoonPosition
    return {
        x: moonPosKm.x,
        y: moonPosKm.z,
        z: -moonPosKm.y
    };
}

/**
 * Calculate time elapsed to reach a given true anomaly from periapsis
 * Uses Kepler's equation: M = E - e*sin(E), where M = mean anomaly, E = eccentric anomaly
 * Returns time in seconds
 */
function calculateTimeToTrueAnomaly(trueAnomalyDeg: number, perigeeAlt: number, apogeeAlt: number): number {
    const rpKm = EARTH_RADIUS + perigeeAlt;
    const raKm = EARTH_RADIUS + apogeeAlt;
    const e = (raKm - rpKm) / (raKm + rpKm);

    // Convert true anomaly to radians
    let nu = trueAnomalyDeg * Math.PI / 180;

    // Normalize to 0-2π range
    while (nu < 0) nu += 2 * Math.PI;
    while (nu >= 2 * Math.PI) nu -= 2 * Math.PI;

    // Calculate eccentric anomaly from true anomaly
    // cos(E) = (e + cos(nu)) / (1 + e*cos(nu))
    const cosE = (e + Math.cos(nu)) / (1 + e * Math.cos(nu));
    let E = Math.acos(cosE);

    // E has the same quadrant as nu
    if (nu > Math.PI) {
        E = 2 * Math.PI - E;
    }

    // Calculate mean anomaly from eccentric anomaly
    // M = E - e*sin(E)
    const M = E - e * Math.sin(E);

    // Calculate orbital period
    const periodSeconds = calculateOrbitalPeriod(perigeeAlt, apogeeAlt);

    // Time elapsed = M / (2*pi) * Period
    const timeElapsed = (M / (2 * Math.PI)) * periodSeconds;

    return timeElapsed;
}

/**
 * Calculate spacecraft position at a given true anomaly
 */
function calculateCraftPositionAtTrueAnomaly(nu: number, raan: number, apogeeAlt: number, perigeeAlt: number, omega: number, inclination: number): { x: number, y: number, z: number } {
    const rpKm = EARTH_RADIUS + perigeeAlt;
    const raKm = EARTH_RADIUS + apogeeAlt;
    const aKm = (rpKm + raKm) / 2;
    const e = (raKm - rpKm) / (raKm + rpKm);

    const rKm = aKm * (1 - e * e) / (1 + e * Math.cos(nu));

    const craftPosKm = new THREE.Vector3(
        rKm * Math.cos(nu),
        0,
        -rKm * Math.sin(nu)
    );

    const omegaRad = THREE.MathUtils.degToRad(omega);
    const incRad = THREE.MathUtils.degToRad(inclination);
    const raanRad = THREE.MathUtils.degToRad(raan);

    craftPosKm.applyAxisAngle(new THREE.Vector3(0, 1, 0), omegaRad);
    craftPosKm.applyAxisAngle(new THREE.Vector3(1, 0, 0), incRad);
    craftPosKm.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);

    return { x: craftPosKm.x, y: craftPosKm.y, z: craftPosKm.z };
}

/**
 * Calculate closest approach distance between spacecraft orbit and Moon at LOI date
 * Searches around apogee (true anomaly ~180°) for minimum distance
 * Returns both the minimum distance and the true anomaly where it occurs
 */
function calculateClosestApproachToMoon(raan: number, apogeeAlt: number, perigeeAlt: number, loiDate: Date, omega: number, inclination: number): { distance: number, trueAnomaly: number } {
    const moonPos = calculateMoonPositionAtDate(loiDate);

    // Search around apogee (true anomaly = 180°) in a range of ±30°
    const nuCenter = Math.PI; // 180° = apogee
    const nuRange = Math.PI / 6; // ±30°
    const numSamples = 61; // Sample every degree in ±30° range

    let minDistance = Infinity;
    let minNu = nuCenter;

    for (let i = 0; i < numSamples; i++) {
        const nu = nuCenter - nuRange + (2 * nuRange * i / (numSamples - 1));
        const craftPos = calculateCraftPositionAtTrueAnomaly(nu, raan, apogeeAlt, perigeeAlt, omega, inclination);

        const dx = craftPos.x - moonPos.x;
        const dy = craftPos.y - moonPos.y;
        const dz = craftPos.z - moonPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < minDistance) {
            minDistance = distance;
            minNu = nu;
        }
    }

    return { distance: minDistance, trueAnomaly: minNu * 180 / Math.PI };
}

/**
 * Optimize RAAN and Apogee to minimize closest approach distance to Moon
 * Uses Nelder-Mead simplex algorithm (derivative-free optimization)
 */
function optimizeApogeeToMoon(loiDate: Date, omega: number, inclination: number, initialRaan: number, initialApogeeAlt: number): { raan: number, apogeeAlt: number, distance: number } {
    const perigeeAlt = 180; // Fixed perigee at 180 km

    // Nelder-Mead parameters
    const alpha = 1.0;   // Reflection
    const gamma = 2.0;   // Expansion
    const rho = 0.5;     // Contraction
    const sigma = 0.5;   // Shrinkage

    const maxIterations = 150;
    const tolerance = 1.0; // 1 km tolerance

    // Objective function: minimize closest approach distance
    const objectiveFunc = (raan: number, apogeeAlt: number): number => {
        // Clamp to valid ranges
        raan = Math.max(0, Math.min(360, raan));
        apogeeAlt = Math.max(180, Math.min(600000, apogeeAlt));
        return calculateClosestApproachToMoon(raan, apogeeAlt, perigeeAlt, loiDate, omega, inclination).distance;
    };

    // Initialize simplex (3 points for 2D optimization)
    let simplex = [
        { raan: initialRaan, apogeeAlt: initialApogeeAlt, value: objectiveFunc(initialRaan, initialApogeeAlt) },
        { raan: initialRaan + 10, apogeeAlt: initialApogeeAlt, value: objectiveFunc(initialRaan + 10, initialApogeeAlt) },
        { raan: initialRaan, apogeeAlt: initialApogeeAlt + 5000, value: objectiveFunc(initialRaan, initialApogeeAlt + 5000) }
    ];

    for (let iter = 0; iter < maxIterations; iter++) {
        // Sort simplex by objective value
        simplex.sort((a, b) => a.value - b.value);

        const best = simplex[0];
        const worst = simplex[2];

        // Check convergence
        if (worst.value - best.value < tolerance) {
            return { raan: best.raan, apogeeAlt: best.apogeeAlt, distance: best.value };
        }

        // Calculate centroid of best two points
        const centroid = {
            raan: (simplex[0].raan + simplex[1].raan) / 2,
            apogeeAlt: (simplex[0].apogeeAlt + simplex[1].apogeeAlt) / 2
        };

        // Reflection
        const reflected = {
            raan: centroid.raan + alpha * (centroid.raan - worst.raan),
            apogeeAlt: centroid.apogeeAlt + alpha * (centroid.apogeeAlt - worst.apogeeAlt),
            value: 0
        };
        reflected.value = objectiveFunc(reflected.raan, reflected.apogeeAlt);

        if (reflected.value < simplex[1].value && reflected.value >= best.value) {
            simplex[2] = reflected;
            continue;
        }

        if (reflected.value < best.value) {
            // Try expansion
            const expanded = {
                raan: centroid.raan + gamma * (reflected.raan - centroid.raan),
                apogeeAlt: centroid.apogeeAlt + gamma * (reflected.apogeeAlt - centroid.apogeeAlt),
                value: 0
            };
            expanded.value = objectiveFunc(expanded.raan, expanded.apogeeAlt);

            if (expanded.value < reflected.value) {
                simplex[2] = expanded;
            } else {
                simplex[2] = reflected;
            }
            continue;
        }

        // Contraction
        const contracted = {
            raan: centroid.raan + rho * (worst.raan - centroid.raan),
            apogeeAlt: centroid.apogeeAlt + rho * (worst.apogeeAlt - centroid.apogeeAlt),
            value: 0
        };
        contracted.value = objectiveFunc(contracted.raan, contracted.apogeeAlt);

        if (contracted.value < worst.value) {
            simplex[2] = contracted;
            continue;
        }

        // Shrinkage
        for (let i = 1; i < simplex.length; i++) {
            simplex[i] = {
                raan: best.raan + sigma * (simplex[i].raan - best.raan),
                apogeeAlt: best.apogeeAlt + sigma * (simplex[i].apogeeAlt - best.apogeeAlt),
                value: 0
            };
            simplex[i].value = objectiveFunc(simplex[i].raan, simplex[i].apogeeAlt);
        }
    }

    // Return best result after max iterations
    simplex.sort((a, b) => a.value - b.value);
    const best = simplex[0];
    return { raan: best.raan, apogeeAlt: best.apogeeAlt, distance: best.value };
}

/**
 * Multi-start optimization to find global minimum
 * Tries multiple initial RAAN values to avoid local minima
 */
function optimizeApogeeToMoonMultiStart(loiDate: Date, omega: number, inclination: number, _initialApogeeAlt: number): { raan: number, apogeeAlt: number, distance: number, trueAnomaly: number } {
    const perigeeAlt = 180;

    // Calculate Moon's distance at LOI time - this is the natural starting apogee
    const moonPos = calculateMoonPositionAtDate(loiDate);
    const moonDistance = Math.sqrt(moonPos.x * moonPos.x + moonPos.y * moonPos.y + moonPos.z * moonPos.z);
    const moonApogeeAlt = moonDistance - EARTH_RADIUS; // Convert to altitude

    // Multi-start optimization with apogee values centered around Moon's distance
    const startingRAANs = [0, 45, 90, 135, 180, 225, 270, 315]; // 8 starting points

    // Try apogee values around the Moon's distance (±5%, ±10%, ±15%)
    const startingApogees = [
        moonApogeeAlt * 0.85,  // -15%
        moonApogeeAlt * 0.90,  // -10%
        moonApogeeAlt * 0.95,  // -5%
        moonApogeeAlt,         // Exactly at Moon's distance
        moonApogeeAlt * 1.05,  // +5%
        moonApogeeAlt * 1.10,  // +10%
        moonApogeeAlt * 1.15   // +15%
    ];

    let bestResult = { raan: 0, apogeeAlt: moonApogeeAlt, distance: Infinity, trueAnomaly: 180 };

    for (const startRaan of startingRAANs) {
        for (const startApogee of startingApogees) {
            const result = optimizeApogeeToMoon(loiDate, omega, inclination, startRaan, startApogee);

            if (result.distance < bestResult.distance) {
                bestResult.raan = result.raan;
                bestResult.apogeeAlt = result.apogeeAlt;
                bestResult.distance = result.distance;
            }
        }
    }

    // Normalize RAAN to 0-360 range
    bestResult.raan = ((bestResult.raan % 360) + 360) % 360;

    // Find the optimal true anomaly for the best result
    const approachInfo = calculateClosestApproachToMoon(bestResult.raan, bestResult.apogeeAlt, perigeeAlt, loiDate, omega, inclination);
    bestResult.trueAnomaly = approachInfo.trueAnomaly;

    return bestResult;
}

// Color scheme
const COLORS: Colors = {
    xAxis: 0xff0000,
    yAxis: 0x00ff00,
    zAxis: 0x0000ff,
    ariesMarker: 0xff0000,
    equator: 0xffffff,
    lunarOrbitPlane: 0xff00ff,
    lunarAscending: 0x00ffff,
    lunarDescending: 0xff8800,
    moon: 0xaaaaaa,
    chandrayaanPlane: 0xffff00,
    chandrayaanOrbit: 0xffff00,
    chandrayaanAscending: 0x88ff88,
    chandrayaanDescending: 0xff88ff,
    chandrayaan: 0xffffff
};

// ============================================================================
// Initialization and Scene Creation
// ============================================================================

function init(): void {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        CAMERA_FOV,
        window.innerWidth / window.innerHeight,
        CAMERA_NEAR_PLANE,
        CAMERA_FAR_PLANE
    );
    camera.position.set(CAMERA_INITIAL_X, CAMERA_INITIAL_Y, CAMERA_INITIAL_Z);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container')!.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 500;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(200, 200, 200);
    scene.add(pointLight);

    createCelestialSphere();
    createXAxis();
    createYAxis();
    createZAxis();
    createAriesMarker();
    createEquator();
    createLunarOrbitCircle();
    createLunarOrbitEllipse();
    createChandrayaanOrbitCircle();
    createLunarNodes();
    createChandrayaanNodes();
    createMoon();
    createChandrayaanOrbit();
    updateChandrayaanOrbitCircle();
    createRAANLines();
    createAOPLines();

    UpdateFunctions.updateLunarOrbitCircle = updateLunarOrbitCircle;
    UpdateFunctions.updateLunarNodePositions = updateLunarNodePositions;
    UpdateFunctions.updateMoonPosition = updateMoonPosition;
    UpdateFunctions.updateChandrayaanOrbitCircle = updateChandrayaanOrbitCircle;
    UpdateFunctions.updateChandrayaanOrbit = updateChandrayaanOrbit;
    UpdateFunctions.updateChandrayaanNodePositions = updateChandrayaanNodePositions;
    UpdateFunctions.updateRAANLines = updateRAANLines;
    UpdateFunctions.updateAOPLines = updateAOPLines;
    UpdateFunctions.updateCraftMoonDistance = updateCraftMoonDistance;
    UpdateFunctions.updateOrbitalElements = updateOrbitalElements;

    setupGUI();
    setupModeTabs();
    setupActionsPanel();
    setupTimeline();
    updateOrbitalElements();

    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function createCelestialSphere(): void {
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
    const material = new THREE.MeshBasicMaterial({
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        wireframe: false,
        depthWrite: false
    });
    celestialSphere = new THREE.Mesh(geometry, material);
    celestialSphere.renderOrder = 0;
    scene.add(celestialSphere);
}

function createXAxis(): void {
    const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(SPHERE_RADIUS * 1.2, 0, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color: COLORS.xAxis,
        linewidth: 1,
        dashSize: 3,
        gapSize: 2
    });
    xAxis = new THREE.Line(geometry, material);
    xAxis.computeLineDistances();
    scene.add(xAxis);
}

function createYAxis(): void {
    const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -SPHERE_RADIUS * 1.2)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color: COLORS.yAxis,
        linewidth: 1,
        dashSize: 3,
        gapSize: 2
    });
    yAxis = new THREE.Line(geometry, material);
    yAxis.computeLineDistances();
    scene.add(yAxis);
}

function createZAxis(): void {
    const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, SPHERE_RADIUS * 1.2, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color: COLORS.zAxis,
        linewidth: 1,
        dashSize: 3,
        gapSize: 2
    });
    zAxis = new THREE.Line(geometry, material);
    zAxis.computeLineDistances();
    scene.add(zAxis);
}

function createAriesMarker(): void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = SPRITE_CANVAS_SIZE;
    canvas.height = SPRITE_CANVAS_SIZE;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ff0000';
    context.font = `Bold ${SPRITE_FONT_SIZE}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('♈', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });
    ariesMarker = new THREE.Sprite(spriteMaterial);
    ariesMarker.scale.set(ARIES_MARKER_BASE_SIZE, ARIES_MARKER_BASE_SIZE, 1);
    ariesMarker.position.set(SPHERE_RADIUS * 1.2, 0, 0);
    scene.add(ariesMarker);
}

function createGreatCircle(radius: number, color: number, inclination: number = 0, raan: number = 0): THREE.Line {
    const segments = ORBIT_SEGMENTS_STANDARD;
    const inclinationRad = THREE.MathUtils.degToRad(inclination);
    const raanRad = THREE.MathUtils.degToRad(raan);

    const points = Array.from({ length: segments + 1 }, (_, i) => {
        const theta = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(theta);
        const y = 0;
        const z = -radius * Math.sin(theta);

        const point = new THREE.Vector3(x, y, z);
        point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclinationRad);
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);

        return point;
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2
    });
    const circle = new THREE.Line(geometry, material);

    return circle;
}

function createEquator(): void {
    equatorCircle = createGreatCircle(SPHERE_RADIUS, COLORS.equator);
    scene.add(equatorCircle);
}

function createLunarOrbitCircle(): void {
    lunarOrbitCircle = createGreatCircle(
        SPHERE_RADIUS,
        COLORS.lunarOrbitPlane,
        params.lunarInclination,
        params.lunarNodes
    );
    scene.add(lunarOrbitCircle);
}

function createChandrayaanOrbitCircle(): void {
    chandrayaanOrbitCircle = createGreatCircle(
        SPHERE_RADIUS,
        COLORS.chandrayaanPlane,
        params.chandrayaanInclination,
        params.chandrayaanNodes
    );
    scene.add(chandrayaanOrbitCircle);
}

function createLunarOrbitEllipse(): void {
    // Create a placeholder - will be updated with actual orbital elements
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineDashedMaterial({
        color: COLORS.moon,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2
    });
    lunarOrbitEllipse = new THREE.Line(geometry, material);
    lunarOrbitEllipse.visible = false;  // Initially hidden, shown only in Plan/Game modes
    scene.add(lunarOrbitEllipse);
}

function updateLunarOrbitEllipse(elements: OrbitalElements): void {
    if (!lunarOrbitEllipse) return;

    scene.remove(lunarOrbitEllipse);

    // Calculate orbital parameters
    const e = elements.eccentricity;
    const a = elements.semiMajorAxis;

    const segments = 128;

    const omega = THREE.MathUtils.degToRad(elements.omega);
    const inc = THREE.MathUtils.degToRad(elements.inclination);
    const raan = THREE.MathUtils.degToRad(elements.raan);

    // Create elliptical orbit in XZ plane using polar form
    const points = Array.from({ length: segments + 1 }, (_, i) => {
        const theta = (i / segments) * Math.PI * 2;
        const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
        const point = new THREE.Vector3(
            r * SCALE_FACTOR * Math.cos(theta),
            0,
            -r * SCALE_FACTOR * Math.sin(theta)
        );

        // Apply rotations: omega, then inclination, then RAAN
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega);
        point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

        return point;
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color: COLORS.moon,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2
    });
    lunarOrbitEllipse = new THREE.Line(geometry, material);
    lunarOrbitEllipse.computeLineDistances();

    // Show only in Plan and Game modes
    lunarOrbitEllipse.visible = (params.appMode === 'Plan' || params.appMode === 'Game') && params.showLunarOrbitPlane;

    scene.add(lunarOrbitEllipse);
}

function createLunarNodes(): void {
    const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);

    const lunarAscendingMaterial = new THREE.MeshBasicMaterial({ color: COLORS.lunarAscending });
    lunarAscendingNode = new THREE.Mesh(nodeGeometry, lunarAscendingMaterial);
    scene.add(lunarAscendingNode);

    const lunarDescendingMaterial = new THREE.MeshBasicMaterial({ color: COLORS.lunarDescending });
    lunarDescendingNode = new THREE.Mesh(nodeGeometry, lunarDescendingMaterial);
    scene.add(lunarDescendingNode);

    updateLunarNodePositions();
}

function createChandrayaanNodes(): void {
    const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);

    const chandrayaanAscendingMaterial = new THREE.MeshBasicMaterial({ color: COLORS.chandrayaanAscending });
    chandrayaanAscendingNode = new THREE.Mesh(nodeGeometry, chandrayaanAscendingMaterial);
    scene.add(chandrayaanAscendingNode);

    const chandrayaanDescendingMaterial = new THREE.MeshBasicMaterial({ color: COLORS.chandrayaanDescending });
    chandrayaanDescendingNode = new THREE.Mesh(nodeGeometry, chandrayaanDescendingMaterial);
    scene.add(chandrayaanDescendingNode);

    updateChandrayaanNodePositions();
}

function updateLunarNodePositions(): void {
    const inc = THREE.MathUtils.degToRad(params.lunarInclination);
    const raan = THREE.MathUtils.degToRad(params.lunarNodes);

    const ascendingPos = new THREE.Vector3(SPHERE_RADIUS, 0, 0);
    ascendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    ascendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    lunarAscendingNode.position.copy(ascendingPos);

    const descendingPos = new THREE.Vector3(-SPHERE_RADIUS, 0, 0);
    descendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    descendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    lunarDescendingNode.position.copy(descendingPos);
}

function updateChandrayaanNodePositions(): void {
    const inc = THREE.MathUtils.degToRad(params.chandrayaanInclination);
    const raan = THREE.MathUtils.degToRad(params.chandrayaanNodes);

    const ascendingPos = new THREE.Vector3(SPHERE_RADIUS, 0, 0);
    ascendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    ascendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    chandrayaanAscendingNode.position.copy(ascendingPos);

    const descendingPos = new THREE.Vector3(-SPHERE_RADIUS, 0, 0);
    descendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    descendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    chandrayaanDescendingNode.position.copy(descendingPos);
}

function createMoon(): void {
    const moonGeometry = new THREE.SphereGeometry(3, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({ color: COLORS.moon });
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(moon);
    updateMoonPosition();
}

function updateMoonPosition(): void {
    if (realPositionsCache.moonPositionKm && params.moonMode === 'Real') {
        const moonPos = realPositionsCache.moonPositionKm;
        moon.position.set(
            moonPos.x * SCALE_FACTOR,
            moonPos.y * SCALE_FACTOR,
            moonPos.z * SCALE_FACTOR
        );
    } else {
        // Gamed mode: Calculate Moon position from RA using proper spherical trigonometry
        // For the Moon, omega (argument of periapsis) is 0 since it's a circular orbit
        const angleInOrbitDeg = calculateTrueAnomalyFromRA(
            params.moonRA,
            params.lunarNodes,
            0, // omega = 0 for circular orbit
            params.lunarInclination
        );
        const angleInOrbit = THREE.MathUtils.degToRad(angleInOrbitDeg);

        const inc = THREE.MathUtils.degToRad(params.lunarInclination);
        const raan = THREE.MathUtils.degToRad(params.lunarNodes);

        const posInOrbit = new THREE.Vector3(
            SPHERE_RADIUS * Math.cos(angleInOrbit),
            0,
            -SPHERE_RADIUS * Math.sin(angleInOrbit)
        );

        posInOrbit.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        posInOrbit.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
        moon.position.copy(posInOrbit);

        params.moonDistanceDisplay = LUNAR_ORBIT_DISTANCE.toFixed(1) + ' km';
        if (lunarControllers.moonDistanceDisplay) {
            lunarControllers.moonDistanceDisplay?.updateDisplay();
        }
    }
}

function updateLunarOrbitCircle(): void {
    scene.remove(lunarOrbitCircle);
    scene.remove(lunarOrbitFilledPlane);

    lunarOrbitCircle = createGreatCircle(
        SPHERE_RADIUS,
        COLORS.lunarOrbitPlane,
        params.lunarInclination,
        params.lunarNodes
    );
    scene.add(lunarOrbitCircle);
    lunarOrbitCircle.visible = params.showLunarOrbitPlane;

    const filledGeometry = new THREE.CircleGeometry(SPHERE_RADIUS, 64);
    const inc = THREE.MathUtils.degToRad(params.lunarInclination);
    const raan = THREE.MathUtils.degToRad(params.lunarNodes);

    const positions = filledGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const v = new THREE.Vector3(
            positions.getX(i),
            positions.getY(i),
            positions.getZ(i)
        );
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

        positions.setXYZ(i, v.x, v.y, v.z);
    }
    positions.needsUpdate = true;
    filledGeometry.computeVertexNormals();

    const filledMaterial = new THREE.MeshBasicMaterial({
        color: COLORS.lunarOrbitPlane,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.1,
        depthWrite: false
    });
    lunarOrbitFilledPlane = new THREE.Mesh(filledGeometry, filledMaterial);

    scene.add(lunarOrbitFilledPlane);
    lunarOrbitFilledPlane.visible = params.showLunarOrbitFilledPlane;
}

function updateChandrayaanOrbitCircle(): void {
    scene.remove(chandrayaanOrbitCircle);
    scene.remove(chandrayaanOrbitFilledPlane);

    const orbitalParams = getChandrayaanParams();

    chandrayaanOrbitCircle = createGreatCircle(
        SPHERE_RADIUS,
        COLORS.chandrayaanPlane,
        orbitalParams.inclination,
        orbitalParams.raan
    );
    scene.add(chandrayaanOrbitCircle);
    chandrayaanOrbitCircle.visible = params.showChandrayaanOrbitPlane;

    const filledGeometry = new THREE.CircleGeometry(SPHERE_RADIUS, 64);
    const inc = THREE.MathUtils.degToRad(orbitalParams.inclination);
    const raan = THREE.MathUtils.degToRad(orbitalParams.raan);

    const positions = filledGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const v = new THREE.Vector3(
            positions.getX(i),
            positions.getY(i),
            positions.getZ(i)
        );
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        v.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

        positions.setXYZ(i, v.x, v.y, v.z);
    }
    positions.needsUpdate = true;
    filledGeometry.computeVertexNormals();

    const filledMaterial = new THREE.MeshBasicMaterial({
        color: COLORS.chandrayaanPlane,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.1,
        depthWrite: false
    });
    chandrayaanOrbitFilledPlane = new THREE.Mesh(filledGeometry, filledMaterial);

    scene.add(chandrayaanOrbitFilledPlane);
    chandrayaanOrbitFilledPlane.visible = params.showChandrayaanOrbitFilledPlane;
}

function createChandrayaanOrbit(): void {
    const e = calculateChandrayaanEccentricity();
    const perigeeDistance = (EARTH_RADIUS + params.chandrayaanPerigeeAlt) * SCALE_FACTOR;
    const a = perigeeDistance / (1 - e);
    const segments = 128;

    const points = Array.from({ length: segments + 1 }, (_, i) => {
        const theta = (i / segments) * Math.PI * 2;
        const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
        const x = r * Math.cos(theta);
        const z = -r * Math.sin(theta);
        return new THREE.Vector3(x, 0, z);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color: COLORS.chandrayaanOrbit,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2
    });
    chandrayaanOrbitCircle3D = new THREE.Line(geometry, material);
    chandrayaanOrbitCircle3D.computeLineDistances();
    scene.add(chandrayaanOrbitCircle3D);

    const spacecraftGeometry = new THREE.SphereGeometry(2, 16, 16);
    const spacecraftMaterial = new THREE.MeshPhongMaterial({ color: COLORS.chandrayaan });
    chandrayaan = new THREE.Mesh(spacecraftGeometry, spacecraftMaterial);
    scene.add(chandrayaan);

    updateChandrayaanOrbit();
}

function updateChandrayaanOrbit(): void {
    // Recreate Chandrayaan orbit with current parameters (manual or launch)
    scene.remove(chandrayaanOrbitCircle3D);

    // Get current parameters (manual or from launch event)
    const orbitalParams = getChandrayaanParams();

    // Calculate orbital parameters
    const rp = EARTH_RADIUS + orbitalParams.perigeeAlt;
    const ra = EARTH_RADIUS + orbitalParams.apogeeAlt;
    const e = (ra - rp) / (ra + rp);
    const perigeeDistance = rp * SCALE_FACTOR;
    const a = perigeeDistance / (1 - e); // Semi-major axis

    const segments = ORBIT_SEGMENTS_DETAILED;

    const omega = THREE.MathUtils.degToRad(orbitalParams.omega);
    const inc = THREE.MathUtils.degToRad(orbitalParams.inclination);
    const raan = THREE.MathUtils.degToRad(orbitalParams.raan);

    // Create elliptical orbit in XZ plane using polar form
    // Generate points functionally using Array.from
    const points = Array.from({ length: segments + 1 }, (_, i) => {
        const theta = (i / segments) * Math.PI * 2;
        const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
        const point = new THREE.Vector3(
            r * Math.cos(theta),
            0,
            -r * Math.sin(theta)  // Negative for counter-clockwise viewing from above
        );

        // Apply rotations: omega (argument of periapsis), then inclination, then RAAN
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega);
        point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

        return point;
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color: COLORS.chandrayaanOrbit,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2
    });
    chandrayaanOrbitCircle3D = new THREE.Line(geometry, material);
    chandrayaanOrbitCircle3D.computeLineDistances(); // Required for dashed lines - call on Line object
    chandrayaanOrbitCircle3D.visible = params.showChandrayaanOrbit;
    scene.add(chandrayaanOrbitCircle3D);

    // Update Chandrayaan position
    let nu; // True anomaly in radians

    if (params.appMode === 'Explore') {
        // In Explore mode, use RA to calculate position
        // Use centralized function to convert RA to true anomaly
        nu = THREE.MathUtils.degToRad(calculateTrueAnomalyFromRA(
            params.chandrayaanRA,
            orbitalParams.raan,
            orbitalParams.omega,
            orbitalParams.inclination
        ));
    } else {
        // In Plan/Game modes, use true anomaly directly
        nu = THREE.MathUtils.degToRad(orbitalParams.trueAnomaly);
    }

    const r = a * (1 - e * e) / (1 + e * Math.cos(nu));
    const spacecraftPos = new THREE.Vector3(
        r * Math.cos(nu),
        0,
        -r * Math.sin(nu)
    );

    // Apply same rotations as orbit
    spacecraftPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega);
    spacecraftPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    spacecraftPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

    chandrayaan.position.copy(spacecraftPos);

    // Calculate and store actual position in km for accurate distance calculations
    const rpKm = EARTH_RADIUS + orbitalParams.perigeeAlt;
    const raKm = EARTH_RADIUS + orbitalParams.apogeeAlt;
    const aKm = (rpKm + raKm) / 2; // Semi-major axis in km
    const rKm = aKm * (1 - e * e) / (1 + e * Math.cos(nu)); // Distance from Earth center in km

    // Position in orbital plane (km)
    const craftPosKm = new THREE.Vector3(
        rKm * Math.cos(nu),
        0,
        -rKm * Math.sin(nu)
    );

    // Apply same rotations to get actual position in km
    craftPosKm.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega);
    craftPosKm.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    craftPosKm.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

    // Store in cache
    realPositionsCache.craftPositionKm = {
        x: craftPosKm.x,
        y: craftPosKm.y,
        z: craftPosKm.z
    };

    // Calculate and display craft's distance from Earth
    const craftEarthDist = Math.sqrt(craftPosKm.x * craftPosKm.x + craftPosKm.y * craftPosKm.y + craftPosKm.z * craftPosKm.z);
    params.craftEarthDistance = craftEarthDist.toFixed(1) + ' km';
    if (chandrayaanControllers.craftEarthDistance) {
        chandrayaanControllers.craftEarthDistance?.updateDisplay();
    }

    // Update spacecraft appearance and visibility based on status
    if (captureState.isCaptured && params.appMode === 'Game') {
        // After capture - hide the spacecraft
        chandrayaan.visible = false;
    } else if (params.appMode !== 'Explore' && launchEvent.exists && !orbitalParams.isLaunched) {
        // Plan/Game mode: Launch exists but not reached yet - grey and frozen at perigee
        // Respect showChandrayaan visibility toggle
        chandrayaan.visible = params.showChandrayaan;
        (chandrayaan.material as THREE.MeshPhongMaterial).color.setHex(0x888888);
        (chandrayaan.material as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
    } else {
        // Explore mode OR no launch event OR launched - white and active
        // Respect showChandrayaan visibility toggle
        chandrayaan.visible = params.showChandrayaan;
        (chandrayaan.material as THREE.MeshPhongMaterial).color.setHex(COLORS.chandrayaan);
        (chandrayaan.material as THREE.MeshPhongMaterial).emissive.setHex(0x222222);
    }

    // Update RA display
    updateChandrayaanRADisplay();

    // Update craft-Moon distance and check for capture
    updateCraftMoonDistance();
}

// Calculate and update distance between craft and Moon
function updateCraftMoonDistance(): void {
    let distanceKm;

    // Use real positions if available (Game/Plan modes with ephemeris)
    if (realPositionsCache.moonPositionKm && realPositionsCache.craftPositionKm) {
        const moonPos = realPositionsCache.moonPositionKm;
        const craftPos = realPositionsCache.craftPositionKm;

        // Calculate actual 3D distance in km
        const dx = craftPos.x - moonPos.x;
        const dy = craftPos.y - moonPos.y;
        const dz = craftPos.z - moonPos.z;
        distanceKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
    } else {
        // Fallback to visualization-based distance (Explore mode)
        const distance = chandrayaan.position.distanceTo(moon.position);
        distanceKm = distance / SCALE_FACTOR;
    }

    // Update display
    params.craftMoonDistance = distanceKm.toFixed(1) + ' km';

    if (chandrayaanControllers.craftMoonDistance) {
        chandrayaanControllers.craftMoonDistance?.updateDisplay();
    }

    // Check for capture (only in Game mode with launch event)
    if (params.appMode === 'Game' && launchEvent.exists) {
        // If we've gone back in time before the capture, reset capture state
        if (captureState.isCaptured && captureState.captureDate) {
            const currentTime = getRenderDate();
            if (currentTime < captureState.captureDate) {
                resetCaptureState();
            }
        }

        // Check for new capture using launch event's capture distance
        const threshold = launchEvent.captureDistance || 2000; // Default to 2000 km if not set
        if (!captureState.isCaptured && distanceKm <= threshold) {
            captureState.isCaptured = true;
            captureState.captureDate = new Date(getRenderDate());
            showCaptureMessage();
        }
    }
}

// Show capture message when spacecraft is captured by Moon
function showCaptureMessage(): void {
    const messageEl = document.getElementById('capture-message');
    if (messageEl) {
        messageEl.style.display = 'block';
    }
}

// Hide capture message
function hideCaptureMessage(): void {
    const messageEl = document.getElementById('capture-message');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
}

// Reset capture state
function resetCaptureState(): void {
    captureState.isCaptured = false;
    captureState.captureDate = null;
    hideCaptureMessage();
}

function updateOrbitalElements(): void {
    // Info panel removed - orbital elements now shown in GUI controls
}

function createRAANLines(): void {
    const lineLength = SPHERE_RADIUS; // Extend to celestial sphere
    const edgeColor = 0xcccccc; // Light grey for all edges

    // Line 1: From origin to First Point of Aries (along X-axis)
    const points1 = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(lineLength, 0, 0)
    ];
    const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
    const material1 = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: 2
    });
    raanLine1 = new THREE.Line(geometry1, material1);
    raanLine1.visible = params.showRAANAngle;
    scene.add(raanLine1);

    // Line 2: From origin to ascending node
    const raan = THREE.MathUtils.degToRad(params.chandrayaanNodes);
    const points2 = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
            lineLength * Math.cos(raan),
            0,
            -lineLength * Math.sin(raan) // Negative for counter-clockwise
        )
    ];
    const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
    const material2 = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: 2
    });
    raanLine2 = new THREE.Line(geometry2, material2);
    raanLine2.visible = params.showRAANAngle;
    scene.add(raanLine2);

    // Arc: Connect endpoints of the two lines
    const arcPoints = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * raan; // From 0 to raan
        arcPoints.push(new THREE.Vector3(
            lineLength * Math.cos(angle),
            0,
            -lineLength * Math.sin(angle) // Negative for counter-clockwise
        ));
    }
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMaterial = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: 2
    });
    raanArc = new THREE.Line(arcGeometry, arcMaterial);
    raanArc.visible = params.showRAANAngle;
    scene.add(raanArc);

    // Filled pie sector with hatching
    const vertices = [];
    const indices = [];
    const yOffset = 0.1; // Slight offset above equatorial plane to avoid z-fighting

    // Center vertex
    vertices.push(0, yOffset, 0);

    // Edge vertices along the arc
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * raan;
        vertices.push(
            lineLength * Math.cos(angle),
            yOffset,
            -lineLength * Math.sin(angle)
        );
    }

    // Create triangles from center to arc (reversed winding for outward facing)
    for (let i = 1; i <= segments; i++) {
        indices.push(0, i + 1, i);
    }

    const pieGeometry = new THREE.BufferGeometry();
    pieGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    pieGeometry.setIndex(indices);
    pieGeometry.computeVertexNormals();

    const pieMaterial = new THREE.MeshBasicMaterial({
        color: 0xf0f0f0, // Very light grey/off-white
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    raanPie = new THREE.Mesh(pieGeometry, pieMaterial);
    raanPie.renderOrder = 10; // Render on top of celestial sphere
    raanPie.visible = params.showRAANAngle;
    scene.add(raanPie);

    // Create text label for RAAN
    createRAAnLabel(raan, lineLength);
    raanLabel.visible = params.showRAANAngle;
}

function createRAAnLabel(raan: number, radius: number): void {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.font = 'Bold 40px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('RAAN', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    raanLabel = new THREE.Sprite(spriteMaterial);

    // Position at midpoint of arc
    const midAngle = raan / 2;
    raanLabel.position.set(
        radius * Math.cos(midAngle),
        5, // Slightly above the plane
        -radius * Math.sin(midAngle)
    );
    raanLabel.scale.set(10, 2.5, 1); // Scale the sprite

    scene.add(raanLabel);
}

function updateRAANLines(): void {
    // Remove old lines, arc, pie, and label
    scene.remove(raanLine1);
    scene.remove(raanLine2);
    scene.remove(raanArc);
    scene.remove(raanPie);
    scene.remove(raanLabel);

    const lineLength = SPHERE_RADIUS; // Extend to celestial sphere
    const edgeColor = 0xcccccc; // Light grey for all edges

    // Line 1: From origin to First Point of Aries (always along X-axis, doesn't change)
    const points1 = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(lineLength, 0, 0)
    ];
    const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
    const material1 = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: 2
    });
    raanLine1 = new THREE.Line(geometry1, material1);
    raanLine1.visible = params.showRAANAngle;
    scene.add(raanLine1);

    // Line 2: From origin to ascending node (updates with RAAN)
    const raan = THREE.MathUtils.degToRad(params.chandrayaanNodes);
    const points2 = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
            lineLength * Math.cos(raan),
            0,
            -lineLength * Math.sin(raan)
        )
    ];
    const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
    const material2 = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: 2
    });
    raanLine2 = new THREE.Line(geometry2, material2);
    raanLine2.visible = params.showRAANAngle;
    scene.add(raanLine2);

    // Arc: Connect endpoints of the two lines
    const arcPoints = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * raan; // From 0 to raan
        arcPoints.push(new THREE.Vector3(
            lineLength * Math.cos(angle),
            0,
            -lineLength * Math.sin(angle)
        ));
    }
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMaterial = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: 2
    });
    raanArc = new THREE.Line(arcGeometry, arcMaterial);
    raanArc.visible = params.showRAANAngle;
    scene.add(raanArc);

    // Filled pie sector with hatching
    const vertices = [];
    const indices = [];
    const yOffset = 0.1; // Slight offset above equatorial plane to avoid z-fighting

    // Center vertex
    vertices.push(0, yOffset, 0);

    // Edge vertices along the arc
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * raan;
        vertices.push(
            lineLength * Math.cos(angle),
            yOffset,
            -lineLength * Math.sin(angle)
        );
    }

    // Create triangles from center to arc (reversed winding for outward facing)
    for (let i = 1; i <= segments; i++) {
        indices.push(0, i + 1, i);
    }

    const pieGeometry = new THREE.BufferGeometry();
    pieGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    pieGeometry.setIndex(indices);
    pieGeometry.computeVertexNormals();

    const pieMaterial = new THREE.MeshBasicMaterial({
        color: 0xf0f0f0, // Very light grey/off-white
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    raanPie = new THREE.Mesh(pieGeometry, pieMaterial);
    raanPie.renderOrder = 10; // Render on top of celestial sphere
    raanPie.visible = params.showRAANAngle;
    scene.add(raanPie);

    // Create text label for RAAN
    createRAAnLabel(raan, lineLength);
    raanLabel.visible = params.showRAANAngle;
}

function createAOPLines(): void {
    const lineLength = SPHERE_RADIUS; // Extend to celestial sphere
    const edgeColor = 0xcccccc; // Light grey for all edges

    const omega = THREE.MathUtils.degToRad(params.chandrayaanOmega);
    const inc = THREE.MathUtils.degToRad(params.chandrayaanInclination);
    const raan = THREE.MathUtils.degToRad(params.chandrayaanNodes);

    // Line 1: From origin to ascending node (on orbital plane)
    // Ascending node is at angle 0 in the orbital plane
    let nodeDir = new THREE.Vector3(lineLength, 0, 0);
    nodeDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    nodeDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

    const points1 = [
        new THREE.Vector3(0, 0, 0),
        nodeDir
    ];
    const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
    const material1 = new THREE.LineDashedMaterial({
        color: edgeColor,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2
    });
    aopLine1 = new THREE.Line(geometry1, material1);
    aopLine1.computeLineDistances();
    aopLine1.visible = params.showAOPAngle;
    scene.add(aopLine1);

    // Line 2: From origin to periapsis
    // Periapsis is at angle omega in the orbital plane
    let periapsisDir = new THREE.Vector3(lineLength, 0, 0);
    periapsisDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega); // Rotate by omega first
    periapsisDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    periapsisDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

    const points2 = [
        new THREE.Vector3(0, 0, 0),
        periapsisDir
    ];
    const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
    const material2 = new THREE.LineDashedMaterial({
        color: edgeColor,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2
    });
    aopLine2 = new THREE.Line(geometry2, material2);
    aopLine2.computeLineDistances();
    aopLine2.visible = params.showAOPAngle;
    scene.add(aopLine2);

    // Arc: Connect endpoints along the orbital plane
    const arcPoints = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * omega; // From 0 to omega
        let point = new THREE.Vector3(
            lineLength * Math.cos(angle),
            0,
            -lineLength * Math.sin(angle)
        );
        point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
        arcPoints.push(point);
    }
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMaterial = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: 2
    });
    aopArc = new THREE.Line(arcGeometry, arcMaterial);
    aopArc.visible = params.showAOPAngle;
    scene.add(aopArc);

    // Filled pie sector
    const vertices = [];
    const indices = [];
    const yOffset = 0.1;

    // Center vertex
    vertices.push(0, yOffset, 0);

    // Edge vertices along the arc
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * omega;
        let point = new THREE.Vector3(
            lineLength * Math.cos(angle),
            yOffset,
            -lineLength * Math.sin(angle)
        );
        point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
        vertices.push(point.x, point.y, point.z);
    }

    // Create triangles from center to arc (reversed winding for outward facing)
    for (let i = 1; i <= segments; i++) {
        indices.push(0, i + 1, i);
    }

    const pieGeometry = new THREE.BufferGeometry();
    pieGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    pieGeometry.setIndex(indices);
    pieGeometry.computeVertexNormals();

    const pieMaterial = new THREE.MeshBasicMaterial({
        color: 0xffe0e0, // Very light pink/rose
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    aopPie = new THREE.Mesh(pieGeometry, pieMaterial);
    aopPie.renderOrder = 10;
    aopPie.visible = params.showAOPAngle;
    scene.add(aopPie);

    // Create text label for AOP
    createAOPLabel(omega, inc, raan, lineLength);
    aopLabel.visible = params.showAOPAngle;
}

function createAOPLabel(omega: number, inc: number, raan: number, radius: number): void {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.font = 'Bold 40px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('AOP', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    aopLabel = new THREE.Sprite(spriteMaterial);

    // Position at midpoint of arc in orbital plane
    const midAngle = omega / 2;
    let labelPos = new THREE.Vector3(
        radius * Math.cos(midAngle),
        5,
        -radius * Math.sin(midAngle)
    );
    labelPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    labelPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

    aopLabel.position.copy(labelPos);
    aopLabel.scale.set(10, 2.5, 1);

    scene.add(aopLabel);
}

function updateAOPLines(): void {
    // Remove old elements
    scene.remove(aopLine1);
    scene.remove(aopLine2);
    scene.remove(aopArc);
    scene.remove(aopPie);
    scene.remove(aopLabel);

    const lineLength = SPHERE_RADIUS;
    const edgeColor = 0xcccccc;

    const omega = THREE.MathUtils.degToRad(params.chandrayaanOmega);
    const inc = THREE.MathUtils.degToRad(params.chandrayaanInclination);
    const raan = THREE.MathUtils.degToRad(params.chandrayaanNodes);

    // Line 1: From origin to ascending node
    let nodeDir = new THREE.Vector3(lineLength, 0, 0);
    nodeDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    nodeDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

    const points1 = [
        new THREE.Vector3(0, 0, 0),
        nodeDir
    ];
    const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
    const material1 = new THREE.LineDashedMaterial({
        color: edgeColor,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2
    });
    aopLine1 = new THREE.Line(geometry1, material1);
    aopLine1.computeLineDistances();
    aopLine1.visible = params.showAOPAngle;
    scene.add(aopLine1);

    // Line 2: From origin to periapsis
    let periapsisDir = new THREE.Vector3(lineLength, 0, 0);
    periapsisDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega);
    periapsisDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    periapsisDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

    const points2 = [
        new THREE.Vector3(0, 0, 0),
        periapsisDir
    ];
    const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
    const material2 = new THREE.LineDashedMaterial({
        color: edgeColor,
        linewidth: 2,
        dashSize: 3,
        gapSize: 2
    });
    aopLine2 = new THREE.Line(geometry2, material2);
    aopLine2.computeLineDistances();
    aopLine2.visible = params.showAOPAngle;
    scene.add(aopLine2);

    // Arc along orbital plane
    const arcPoints = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * omega;
        let point = new THREE.Vector3(
            lineLength * Math.cos(angle),
            0,
            -lineLength * Math.sin(angle)
        );
        point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
        arcPoints.push(point);
    }
    const arcGeometry = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMaterial = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: 2
    });
    aopArc = new THREE.Line(arcGeometry, arcMaterial);
    aopArc.visible = params.showAOPAngle;
    scene.add(aopArc);

    // Filled pie sector
    const vertices = [];
    const indices = [];
    const yOffset = 0.1;

    // Center vertex
    vertices.push(0, yOffset, 0);

    // Edge vertices along the arc
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * omega;
        let point = new THREE.Vector3(
            lineLength * Math.cos(angle),
            yOffset,
            -lineLength * Math.sin(angle)
        );
        point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
        vertices.push(point.x, point.y, point.z);
    }

    // Create triangles
    for (let i = 1; i <= segments; i++) {
        indices.push(0, i + 1, i);
    }

    const pieGeometry = new THREE.BufferGeometry();
    pieGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    pieGeometry.setIndex(indices);
    pieGeometry.computeVertexNormals();

    const pieMaterial = new THREE.MeshBasicMaterial({
        color: 0xffe0e0, // Very light pink/rose
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    aopPie = new THREE.Mesh(pieGeometry, pieMaterial);
    aopPie.renderOrder = 10;
    aopPie.visible = params.showAOPAngle;
    scene.add(aopPie);

    // Create label
    createAOPLabel(omega, inc, raan, lineLength);
    aopLabel.visible = params.showAOPAngle;
}

// Update Moon position from real ephemeris
function updateMoonFromRealPosition(): void {
    // Pull from single source of truth (respects active timeline)
    const moonData = calculateRealMoonPosition(getRenderDate());

    // Update parameters with real values
    params.moonRA = moonData.ra;
    params.lunarInclination = moonData.inclination;
    params.lunarNodes = moonData.raan;

    // Store real Moon position in km for accurate distance calculations
    realPositionsCache.moonPositionKm = moonData.positionKm;

    // Calculate and display Moon's distance from Earth
    const moonPos = realPositionsCache.moonPositionKm;
    const moonDistance = Math.sqrt(moonPos.x * moonPos.x + moonPos.y * moonPos.y + moonPos.z * moonPos.z);
    params.moonDistanceDisplay = moonDistance.toFixed(1) + ' km';

    // Update GUI display
    if (lunarControllers.moonRA) lunarControllers.moonRA?.updateDisplay();
    if (lunarControllers.inclination) lunarControllers.inclination?.updateDisplay();
    if (lunarControllers.nodes) lunarControllers.nodes?.updateDisplay();
    if (lunarControllers.moonDistanceDisplay) lunarControllers.moonDistanceDisplay?.updateDisplay();

    // Update visual representation
    updateLunarOrbitCircle();
    updateLunarOrbitEllipse(moonData.orbitalElements);
    updateLunarNodePositions();
    updateMoonPosition();
    updateOrbitalElements();

    // Update RA display
    updateMoonRADisplay();
}

function switchAppMode(mode: AppMode): void {
    const timelinePanel = document.getElementById('timeline-panel');
    // Used in function scope

    const actionsPanel = document.getElementById('actions-panel');

    // Reset capture state when switching modes
    resetCaptureState();

    if (mode === 'Explore') {
        // Explore mode: Show all manual controls, hide timeline, force Gamed Moon mode, hide actions panel

        // Activate Set A (completely isolated from Plan/Game params)
        stateManager.activateExploreParams();

        lunarFolder.show();
        chandrayaanFolder.show();

        // Enable all lunar controls
        lunarControllers.inclination?.enable();
        lunarControllers.nodes?.enable();
        lunarControllers.moonRA?.enable();
        lunarControllers.moonTrueAnomaly?.enable();

        // Enable all chandrayaan controls
        chandrayaanControllers.inclination?.enable();
        chandrayaanControllers.nodes?.enable();
        chandrayaanControllers.omega?.enable();
        chandrayaanControllers.perigeeAlt?.enable();
        chandrayaanControllers.apogeeAlt?.enable();
        chandrayaanControllers.ra?.enable();
        chandrayaanControllers.trueAnomaly?.enable();

        // Enable sync buttons in Explore mode (now inline buttons, controlled via DOM)
        if (chandrayaanControllers.syncInclinationBtn) chandrayaanControllers.syncInclinationBtn.disabled = false;
        if (chandrayaanControllers.syncRaanBtn) chandrayaanControllers.syncRaanBtn.disabled = false;
        if (chandrayaanControllers.syncAopBtn) chandrayaanControllers.syncAopBtn.disabled = false;
        if (chandrayaanControllers.syncApogeeBtn) chandrayaanControllers.syncApogeeBtn.disabled = false;
        if (chandrayaanControllers.syncRABtn) chandrayaanControllers.syncRABtn.disabled = false;

        // Show restrict checkbox only in Explore mode
        chandrayaanControllers.restrictOrbitalParams?.show();

        // Hide timeline panel
        if (timelinePanel) timelinePanel.style.display = 'none';

        // Hide launch event container and Add Launch button completely in Explore mode
        const launchContainer = document.getElementById('launch-event-container');
        const addLaunchBtn = document.getElementById('add-launch-action-btn');
        if (launchContainer) launchContainer.style.display = 'none';
        if (addLaunchBtn) if (addLaunchBtn) addLaunchBtn.style.display = 'none';

        // Hide actions panel completely in Explore mode
        if (actionsPanel) {
            actionsPanel.classList.remove('visible');
            actionsPanel.classList.remove('disabled');
        }

        // Update visuals with Set A params
        updateLunarOrbitCircle();
        updateLunarNodePositions();
        updateMoonPosition();
        updateChandrayaanOrbit();
        updateChandrayaanPeriodDisplay();

        // Hide lunar orbit ellipse in Explore mode
        if (lunarOrbitEllipse) lunarOrbitEllipse.visible = false;

        // Hide Launch and Intercept timeline rows in Explore mode
        const launchRow = document.querySelector('.timeline-row-selector:nth-child(3)');
        const interceptRow = document.querySelector('.timeline-row-selector:nth-child(4)');
        if (launchRow) (launchRow as HTMLElement).style.display = 'none';
        if (interceptRow) (interceptRow as HTMLElement).style.display = 'none';

    } else if (mode === 'Plan') {
        // Plan mode: Show all controls but disabled (read-only), show actions panel for editing, show timeline, force Real Moon mode

        // Activate Set B (completely isolated from Explore params)
        stateManager.activatePlanGameParams();

        lunarFolder.show();
        chandrayaanFolder.show();

        // Disable all lunar controls (read-only display - controlled by Real ephemeris)
        lunarControllers.inclination?.disable();
        lunarControllers.nodes?.disable();
        lunarControllers.moonRA?.disable();
        lunarControllers.moonTrueAnomaly?.disable();

        // Disable all chandrayaan controls (read-only display - controlled by launch event)
        chandrayaanControllers.inclination?.disable();
        chandrayaanControllers.nodes?.disable();
        chandrayaanControllers.omega?.disable();
        chandrayaanControllers.perigeeAlt?.disable();
        chandrayaanControllers.apogeeAlt?.disable();
        chandrayaanControllers.ra?.disable();
        chandrayaanControllers.trueAnomaly?.disable();

        // Disable sync buttons in Plan mode (now inline buttons, controlled via DOM)
        if (chandrayaanControllers.syncInclinationBtn) chandrayaanControllers.syncInclinationBtn.disabled = true;
        if (chandrayaanControllers.syncRaanBtn) chandrayaanControllers.syncRaanBtn.disabled = true;
        if (chandrayaanControllers.syncAopBtn) chandrayaanControllers.syncAopBtn.disabled = true;
        if (chandrayaanControllers.syncApogeeBtn) chandrayaanControllers.syncApogeeBtn.disabled = true;
        if (chandrayaanControllers.syncRABtn) chandrayaanControllers.syncRABtn.disabled = true;

        // Hide restrict checkbox in Plan mode
        chandrayaanControllers.restrictOrbitalParams?.hide();

        // Show actions panel (enabled)
        if (actionsPanel) {
            actionsPanel.classList.add('visible');
            actionsPanel.classList.remove('disabled');
        }

        // Show timeline panel
        if (timelinePanel) {
            timelinePanel.style.display = 'block';
            timelinePanel.classList.remove('disabled');
        }

        // Update moon position from current date using Real ephemeris
        updateMoonFromRealPosition();

        // Update period display
        updateChandrayaanPeriodDisplay();

        // Show/hide Add Launch button and launch event container based on launch event existence
        if (launchEvent.exists) {
            const elem_add_launch_action_btn = document.getElementById('add-launch-action-btn');
            if (elem_add_launch_action_btn) elem_add_launch_action_btn.style.display = 'none';
            const elem_launch_event_container = document.getElementById('launch-event-container');
            if (elem_launch_event_container) elem_launch_event_container.style.display = 'block';
            createLaunchEventGUI();

            // Sync timeline slider with intercept date if it exists
            if (launchEvent.moonInterceptDate) {
                updateTimelineSliderFromInterceptDate();
            }

            // Update launch marker on timeline
            updateLaunchMarker();

            // Sync render control sliders with launch event
            syncRenderControlSlidersWithLaunchEvent();
        } else {
            // No launch event: show Add Launch button, hide container
            const elem_add_launch_action_btn = document.getElementById('add-launch-action-btn');
            if (elem_add_launch_action_btn) elem_add_launch_action_btn.style.display = 'block';
            const elem_launch_event_container = document.getElementById('launch-event-container');
            if (elem_launch_event_container) elem_launch_event_container.style.display = 'none';
        }

        // Show Launch and Intercept timeline rows in Plan mode
        const launchRowPlan = document.querySelector('.timeline-row-selector:nth-child(3)');
        const interceptRowPlan = document.querySelector('.timeline-row-selector:nth-child(4)');
        if (launchRowPlan) (launchRowPlan as HTMLElement).style.display = 'flex';
        if (interceptRowPlan) (interceptRowPlan as HTMLElement).style.display = 'flex';

        // In Plan mode, View checkbox should be enabled (user can switch between timelines)
        const viewCheckboxPlan = document.getElementById('timeline-slider-active');
        if (viewCheckboxPlan) {
            (viewCheckboxPlan as HTMLInputElement).disabled = false;
        }

        // Update disabled state of Launch and Intercept sliders
        updateRenderControlSlidersState();

    } else if (mode === 'Game') {
        // Game mode: Show controls but disabled, show timeline, force Real Moon mode, show actions panel disabled
        // Note: Game mode uses Set B (same as Plan mode - complete isolation from Explore)

        // Activate Set B (same params as Plan mode)
        stateManager.activatePlanGameParams();

        lunarFolder.show();
        chandrayaanFolder.show();

        // Disable all lunar controls (read-only display)
        lunarControllers.inclination?.disable();
        lunarControllers.nodes?.disable();
        lunarControllers.moonRA?.disable();
        lunarControllers.moonTrueAnomaly?.disable();

        // Disable all chandrayaan controls (show but grayed out)
        chandrayaanControllers.inclination?.disable();
        chandrayaanControllers.nodes?.disable();
        chandrayaanControllers.omega?.disable();
        chandrayaanControllers.perigeeAlt?.disable();
        chandrayaanControllers.apogeeAlt?.disable();
        chandrayaanControllers.ra?.disable();
        chandrayaanControllers.trueAnomaly?.disable();

        // Disable sync buttons in Game mode (now inline buttons, controlled via DOM)
        if (chandrayaanControllers.syncInclinationBtn) chandrayaanControllers.syncInclinationBtn.disabled = true;
        if (chandrayaanControllers.syncRaanBtn) chandrayaanControllers.syncRaanBtn.disabled = true;
        if (chandrayaanControllers.syncAopBtn) chandrayaanControllers.syncAopBtn.disabled = true;
        if (chandrayaanControllers.syncApogeeBtn) chandrayaanControllers.syncApogeeBtn.disabled = true;
        if (chandrayaanControllers.syncRABtn) chandrayaanControllers.syncRABtn.disabled = true;

        // Hide restrict checkbox in Game mode
        chandrayaanControllers.restrictOrbitalParams?.hide();

        // Show timeline panel
        if (timelinePanel) {
            timelinePanel.style.display = 'block';
            timelinePanel.classList.remove('disabled');
        }

        // Show actions panel but disabled
        if (actionsPanel) {
            actionsPanel.classList.add('visible');
            actionsPanel.classList.add('disabled');
        }

        // Update moon position from current date when switching to Game mode
        updateMoonFromRealPosition();

        // Sync GUI controls with launch event if it exists
        syncGUIWithLaunchEvent();

        // Update period display
        updateChandrayaanPeriodDisplay();

        // Update launch marker on timeline
        updateLaunchMarker();

        // Hide Launch and Intercept timeline rows in Game mode
        const launchRowGame = document.querySelector('.timeline-row-selector:nth-child(3)');
        const interceptRowGame = document.querySelector('.timeline-row-selector:nth-child(4)');
        if (launchRowGame) (launchRowGame as HTMLElement).style.display = 'none';
        if (interceptRowGame) (interceptRowGame as HTMLElement).style.display = 'none';

        // In Game mode, View checkbox should be checked and disabled
        const viewCheckbox = document.getElementById('timeline-slider-active');
        if (viewCheckbox) {
            (viewCheckbox as HTMLInputElement).checked = true;
            (viewCheckbox as HTMLInputElement).disabled = true;
        }
        renderControl.activeSlider = 'timeline';

        // Update active timeline indicator
        const activeIndicator = document.getElementById('active-timeline-indicator');
        if (activeIndicator) {
            activeIndicator.textContent = 'View';
        }
    }

    // Update renderDate to reflect the active timeline for this mode
    // This ensures getRenderDate() returns correct date after mode switch
    updateRenderDate();
}

// Update Chandrayaan orbital period display
function updateChandrayaanPeriodDisplay(): void {
    const orbitalParams = getChandrayaanParams();
    const periodSeconds = calculateOrbitalPeriod(orbitalParams.perigeeAlt, orbitalParams.apogeeAlt);
    params.chandrayaanPeriod = formatPeriod(periodSeconds);

    if (chandrayaanControllers.period) {
        chandrayaanControllers.period?.updateDisplay();
    }
}

// Update Moon RA display (from ephemeris or manual input)
function updateMoonRADisplay(): void {
    // params.moonRA is already set from ephemeris in updateMoonFromRealPosition()
    // or manually in Gamed mode
    params.moonRADisplay = params.moonRA.toFixed(1) + '°';

    if (lunarControllers.moonRADisplay) {
        lunarControllers.moonRADisplay?.updateDisplay();
    }
}

// Update Chandrayaan RA display (calculated from orbital elements)
function updateChandrayaanRADisplay(): void {
    const orbitalParams = getChandrayaanParams();

    // Chandrayaan's RA in the equatorial plane is calculated from:
    // RA = RAAN + angle of spacecraft position projected onto equatorial plane
    // For a spacecraft at (RAAN, omega, true_anomaly):
    // The RA depends on the orbital plane's orientation and position in orbit

    // Use centralized function to calculate RA from true anomaly
    const ra = calculateRAFromTrueAnomaly(
        orbitalParams.trueAnomaly,
        orbitalParams.raan,
        orbitalParams.omega,
        orbitalParams.inclination
    );

    // Normalize to 0-360
    const raValue = ((ra % 360) + 360) % 360;
    params.chandrayaanRADisplay = raValue.toFixed(1) + '°';

    if (chandrayaanControllers.raDisplay) {
        chandrayaanControllers.raDisplay?.updateDisplay();
    }
}

// Update render control sliders state (enable/disable based on launch event existence)
function updateRenderControlSlidersState(): void {
    const launchSlider = document.getElementById('launch-slider');
    const interceptSlider = document.getElementById('intercept-slider');
    const launchCheckbox = document.getElementById('launch-slider-active');
    const interceptCheckbox = document.getElementById('intercept-slider-active');
    const viewCheckbox = document.getElementById('timeline-slider-active');

    if (launchEvent.exists) {
        // Enable Launch and Intercept sliders
        if (launchSlider) (launchSlider as HTMLInputElement).disabled = false;
        if (interceptSlider) (interceptSlider as HTMLInputElement).disabled = false;
        if (launchCheckbox) (launchCheckbox as HTMLInputElement).disabled = false;
        if (interceptCheckbox) (interceptCheckbox as HTMLInputElement).disabled = false;
    } else {
        // Disable Launch and Intercept sliders
        if (launchSlider) (launchSlider as HTMLInputElement).disabled = true;
        if (interceptSlider) (interceptSlider as HTMLInputElement).disabled = true;
        if (launchCheckbox) (launchCheckbox as HTMLInputElement).disabled = true;
        if (interceptCheckbox) (interceptCheckbox as HTMLInputElement).disabled = true;

        // If either Launch or Intercept was selected, fallback to View
        if (renderControl.activeSlider === 'launch' || renderControl.activeSlider === 'intercept') {
            if (viewCheckbox) {
                (viewCheckbox as HTMLInputElement).checked = true;
                renderControl.activeSlider = 'timeline';

                // Update active timeline indicator
                const activeIndicator = document.getElementById('active-timeline-indicator');
                if (activeIndicator) {
                    activeIndicator.textContent = 'View';
                }
            }
        }
    }
}

// Sync params to launch event in Plan mode (when GUI controls change)
function syncParamsToLaunchEvent(): void {
    if (params.appMode !== 'Plan') return;
    if (!launchEvent.exists) return;
    if (isUpdatingFromCode) return; // Prevent circular updates during programmatic changes

    // Use centralized state manager
    stateManager.saveParamsToLaunchEvent();

    // Note: lil-gui will handle display updates automatically via .listen()
}

// Sync GUI controls with launch event parameters (Game and Plan modes)
function syncGUIWithLaunchEvent(): void {
    if (params.appMode !== 'Game' && params.appMode !== 'Plan') return;

    const orbitalParams = getChandrayaanParams();

    // Check if period-affecting parameters changed
    const perigeeChanged = params.chandrayaanPerigeeAlt !== orbitalParams.perigeeAlt;
    const apogeeChanged = params.chandrayaanApogeeAlt !== orbitalParams.apogeeAlt;

    // Update params without triggering onChange events
    params.chandrayaanInclination = orbitalParams.inclination;
    params.chandrayaanNodes = orbitalParams.raan;
    params.chandrayaanOmega = orbitalParams.omega;
    params.chandrayaanPerigeeAlt = orbitalParams.perigeeAlt;
    params.chandrayaanApogeeAlt = orbitalParams.apogeeAlt;
    params.chandrayaanTrueAnomaly = orbitalParams.trueAnomaly;

    // Update GUI display
    chandrayaanControllers.inclination?.updateDisplay();
    chandrayaanControllers.nodes?.updateDisplay();
    chandrayaanControllers.omega?.updateDisplay();
    chandrayaanControllers.perigeeAlt?.updateDisplay();
    chandrayaanControllers.apogeeAlt?.updateDisplay();
    chandrayaanControllers.trueAnomaly?.updateDisplay();

    // Only update period display if perigee or apogee changed
    if (perigeeChanged || apogeeChanged) {
        updateChandrayaanPeriodDisplay();
    }
}

function setupGUI(): void {
    const gui = new GUI();

    // Visibility folder
    const visibilityFolder = gui.addFolder('Visibility');
    visibilityFolder.add(params, 'showEquator').name('Show Equator').onChange(value => {
        equatorCircle.visible = value;
    });
    visibilityFolder.add(params, 'showAxes').name('Show Axes').onChange(value => {
        xAxis.visible = value;
        yAxis.visible = value;
        zAxis.visible = value;
        ariesMarker.visible = value;
    });

    const lunarVisFolder = visibilityFolder.addFolder('Lunar Orbit');
    lunarVisFolder.add(params, 'showMoon').name('Show Moon').onChange(value => {
        moon.visible = value;
    });
    lunarVisFolder.add(params, 'showLunarOrbitPlane').name('Show Plane Circle').onChange(value => {
        lunarOrbitCircle.visible = value;
        // Also update ellipse visibility (only shown in Plan/Game modes)
        if (lunarOrbitEllipse) {
            lunarOrbitEllipse.visible = value && (params.appMode === 'Plan' || params.appMode === 'Game');
        }
    });
    lunarVisFolder.add(params, 'showLunarOrbitFilledPlane').name('Show Filled Plane').onChange(value => {
        if (lunarOrbitFilledPlane) lunarOrbitFilledPlane.visible = value;
    });
    lunarVisFolder.add(params, 'showLunarNodes').name('Show Nodes').onChange(value => {
        lunarAscendingNode.visible = value;
        lunarDescendingNode.visible = value;
    });

    const chandrayaanVisFolder = visibilityFolder.addFolder('Chandrayaan Orbit');
    chandrayaanVisFolder.add(params, 'showChandrayaan').name('Show Chandrayaan').onChange(value => {
        chandrayaan.visible = value;
    });
    chandrayaanVisFolder.add(params, 'showChandrayaanOrbitPlane').name('Show Plane Circle').onChange(value => {
        chandrayaanOrbitCircle.visible = value;
    });
    chandrayaanVisFolder.add(params, 'showChandrayaanOrbitFilledPlane').name('Show Filled Plane').onChange(value => {
        if (chandrayaanOrbitFilledPlane) chandrayaanOrbitFilledPlane.visible = value;
    });
    chandrayaanVisFolder.add(params, 'showChandrayaanOrbit').name('Show Orbit').onChange(value => {
        chandrayaanOrbitCircle3D.visible = value;
    });
    chandrayaanVisFolder.add(params, 'showChandrayaanNodes').name('Show Nodes').onChange(value => {
        chandrayaanAscendingNode.visible = value;
        chandrayaanDescendingNode.visible = value;
    });
    chandrayaanVisFolder.add(params, 'showRAANAngle').name('Show RAAN Angle').onChange(value => {
        raanLine1.visible = value;
        raanLine2.visible = value;
        raanArc.visible = value;
        raanPie.visible = value;
        raanLabel.visible = value;
    });
    chandrayaanVisFolder.add(params, 'showAOPAngle').name('Show AOP Angle').onChange(value => {
        aopLine1.visible = value;
        aopLine2.visible = value;
        aopArc.visible = value;
        aopPie.visible = value;
        aopLabel.visible = value;
    });
    visibilityFolder.open();

    // Lunar orbit folder
    lunarFolder = gui.addFolder('Lunar Orbit Parameters');

    // Store controller references for enable/disable
    lunarControllers.nodes = lunarFolder.add(params, 'lunarNodes', 0, 360, 1).name('Nodes (RAAN) (°)').onChange((value) => {
        // When RAAN changes, update RA to keep True Anomaly constant
        // RA = RAAN + TrueAnomaly
        let ra = value + params.moonTrueAnomaly;
        while (ra < 0) ra += 360;
        while (ra >= 360) ra -= 360;
        params.moonRA = ra;
        if (lunarControllers.moonRA) {
            lunarControllers.moonRA?.updateDisplay();
        }
        onParameterChange('lunarNodes', value);
    });
    lunarControllers.inclination = lunarFolder.add(params, 'lunarInclination', 18.3, 28.6, 0.1).name('Inclination (°)').onChange((value) => {
        onParameterChange('lunarInclination', value);
    });
    // Moon RA control (affects True Anomaly)
    lunarControllers.moonRA = lunarFolder.add(params, 'moonRA', 0, 360, 1).name('Moon RA (°)').onChange((value) => {
        // Update moonTrueAnomaly from moonRA
        // For circular orbit: RA = RAAN + TrueAnomaly
        let ta = value - params.lunarNodes;
        // Normalize to 0-360
        while (ta < 0) ta += 360;
        while (ta >= 360) ta -= 360;
        params.moonTrueAnomaly = ta;
        if (lunarControllers.moonTrueAnomaly) {
            lunarControllers.moonTrueAnomaly?.updateDisplay();
        }
        onParameterChange('moonRA', value);
        updateMoonRADisplay();
    });

    // Moon True Anomaly control (affects RA)
    lunarControllers.moonTrueAnomaly = lunarFolder.add(params, 'moonTrueAnomaly', 0, 360, 1).name('Moon True Anomaly (°)').onChange((value) => {
        // Update moonRA from moonTrueAnomaly
        // For circular orbit: RA = RAAN + TrueAnomaly
        let ra = params.lunarNodes + value;
        // Normalize to 0-360
        while (ra < 0) ra += 360;
        while (ra >= 360) ra -= 360;
        params.moonRA = ra;
        if (lunarControllers.moonRA) {
            lunarControllers.moonRA?.updateDisplay();
        }
        onParameterChange('moonTrueAnomaly', value);
        updateMoonRADisplay();
    });

    lunarControllers.moonRADisplay = lunarFolder.add(params, 'moonRADisplay').name('Moon RA (current)').disable();
    lunarControllers.moonDistanceDisplay = lunarFolder.add(params, 'moonDistanceDisplay').name('Distance from Earth').disable();
    lunarFolder.open();

    // Helper function to add inline sync button (moon icon)
    function addInlineSyncButton(controller: any, onClick: () => void): HTMLButtonElement {
        const domElement = controller.domElement;
        const widgetContainer = domElement.querySelector('.slider') || domElement.querySelector('input[type="number"]');

        if (widgetContainer && widgetContainer.parentElement) {
            const button = document.createElement('button');
            button.innerHTML = '☽'; // Moon crescent symbol
            button.title = 'Sync from Moon';
            button.style.cssText = `
                position: absolute;
                left: -22px;
                top: 50%;
                transform: translateY(-50%);
                width: 18px;
                height: 18px;
                padding: 0;
                margin: 0;
                font-size: 12px;
                line-height: 18px;
                border: 1px solid #555;
                border-radius: 2px;
                background: #1a1a1a;
                color: #aaa;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
                z-index: 10;
            `;
            button.addEventListener('mouseenter', () => {
                button.style.background = '#2a2a2a';
                button.style.color = '#fff';
                button.style.borderColor = '#888';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = '#1a1a1a';
                button.style.color = '#aaa';
                button.style.borderColor = '#555';
            });
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                onClick();
            });

            // Make the parent container position relative for absolute positioning
            const parent = widgetContainer.parentElement;
            if (parent && getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }

            // Append button to the widget container's parent
            parent?.appendChild(button);
            return button;
        }
        return null as any;
    }

    // Chandrayaan orbit folder
    chandrayaanFolder = gui.addFolder('Chandrayaan Orbit Parameters');

    // Restrict Orbital Parameters checkbox (Explore mode only)
    chandrayaanControllers.restrictOrbitalParams = chandrayaanFolder.add(params, 'restrictOrbitalParams').name('Restrict to Launch Values').onChange(async (value) => {
        if (value) {
            // Show warning popup
            const confirmed = await showConfirmDialog(
                'This will restrict Inclination and Argument of Periapsis to allowed launch event values.\n\n' +
                'Allowed Inclinations: 21.5° or 41.8°\n' +
                'Allowed AoP values:\n' +
                '  • 21.5° inclination: 178°\n' +
                '  • 41.8° inclination: 198° or 203°\n\n' +
                'Current values will be adjusted to the closest allowed values.\n\n' +
                'Continue?',
                'Restrict Orbital Parameters'
            );

            if (confirmed) {
                // Clamp inclination to closest allowed value
                const newInclination = getClosestAllowedInclination(params.chandrayaanInclination);
                params.chandrayaanInclination = newInclination;
                chandrayaanControllers.inclination?.updateDisplay();

                // Clamp omega to closest allowed value for this inclination
                const newOmega = getClosestAllowedOmega(params.chandrayaanOmega, newInclination);
                params.chandrayaanOmega = newOmega;
                chandrayaanControllers.omega?.updateDisplay();

                // Update visualization
                syncParamsToLaunchEvent();
                invalidateOrbitalParamsCache();
                updateChandrayaanOrbitCircle();
                updateChandrayaanOrbit();
                updateChandrayaanNodePositions();
                updateAOPLines();
                updateOrbitalElements();
            } else {
                // User cancelled - uncheck the box
                params.restrictOrbitalParams = false;
                chandrayaanControllers.restrictOrbitalParams?.updateDisplay();
            }
        }
        // When unchecked, values stay as-is, user can now change them freely
    });

    // Inclination with sync button
    // RAAN with sync button
    chandrayaanControllers.nodes = chandrayaanFolder.add(params, 'chandrayaanNodes', 0, 360, 1).name('Nodes (RAAN) (°)').onChange((value) => {
        // When RAAN changes, update RA to keep True Anomaly constant
        // RA = RAAN + AOP + TrueAnomaly
        let ra = value + params.chandrayaanOmega + params.chandrayaanTrueAnomaly;
        while (ra < 0) ra += 360;
        while (ra >= 360) ra -= 360;
        params.chandrayaanRA = ra;
        if (chandrayaanControllers.ra) {
            chandrayaanControllers.ra?.updateDisplay();
        }
        onParameterChange('chandrayaanNodes', value);
    });
    // Add inline sync button for RAAN
    chandrayaanControllers.syncRaanBtn = addInlineSyncButton(chandrayaanControllers.nodes, () => {
        const value = params.lunarNodes;
        params.chandrayaanNodes = value;
        chandrayaanControllers.nodes?.updateDisplay();
        onParameterChange('chandrayaanNodes', value);
    });

    chandrayaanControllers.inclination = chandrayaanFolder.add(params, 'chandrayaanInclination', 0, 90, 0.1).name('Inclination (°)').onChange((value) => {
        // If restrictions are enabled, clamp to allowed values
        if (params.restrictOrbitalParams) {
            const newInclination = getClosestAllowedInclination(value);
            if (newInclination !== value) {
                value = newInclination;
                chandrayaanControllers.inclination?.updateDisplay();
            }
            // Also update omega to valid value for this inclination
            const newOmega = getClosestAllowedOmega(params.chandrayaanOmega, newInclination);
            if (newOmega !== params.chandrayaanOmega) {
                params.chandrayaanOmega = newOmega;
                chandrayaanControllers.omega?.updateDisplay();
            }
        }
        onParameterChange('chandrayaanInclination', value);
    });
    // Add inline sync button for Inclination
    chandrayaanControllers.syncInclinationBtn = addInlineSyncButton(chandrayaanControllers.inclination, () => {
        let value = params.lunarInclination;

        // If restrictions are enabled, clamp to allowed values
        if (params.restrictOrbitalParams) {
            const newInclination = getClosestAllowedInclination(value);
            value = newInclination;

            // Also update omega to valid value for this inclination
            const newOmega = getClosestAllowedOmega(params.chandrayaanOmega, newInclination);
            params.chandrayaanOmega = newOmega;
            chandrayaanControllers.omega?.updateDisplay();
        }

        params.chandrayaanInclination = value;
        chandrayaanControllers.inclination?.updateDisplay();
        onParameterChange('chandrayaanInclination', value);
    });

    // AoP with sync button (calculate to point apogee toward Moon)
    chandrayaanControllers.omega = chandrayaanFolder.add(params, 'chandrayaanOmega', 0, 360, 1).name('ω (Arg. Periapsis) (°)').onChange((value) => {
        // If restrictions are enabled, clamp to allowed values
        if (params.restrictOrbitalParams) {
            const newOmega = getClosestAllowedOmega(value, params.chandrayaanInclination);
            if (newOmega !== value) {
                value = newOmega;
                chandrayaanControllers.omega?.updateDisplay();
            }
        }
        // When AOP changes, update RA to keep True Anomaly constant
        // RA = RAAN + AOP + TrueAnomaly
        let ra = params.chandrayaanNodes + value + params.chandrayaanTrueAnomaly;
        while (ra < 0) ra += 360;
        while (ra >= 360) ra -= 360;
        params.chandrayaanRA = ra;
        if (chandrayaanControllers.ra) {
            chandrayaanControllers.ra?.updateDisplay();
        }
        onParameterChange('chandrayaanOmega', value);
    });
    // Add inline sync button for AOP
    chandrayaanControllers.syncAopBtn = addInlineSyncButton(chandrayaanControllers.omega, () => {
        // Calculate AoP to point apogee toward Moon's current position
        // Apogee is at true anomaly = 180°, so we need AoP such that AoP + 180° points to Moon
        // Moon's position in orbital plane is at moonRA degrees from First Point of Aries
        // We need to find the angle from the ascending node to the Moon in the spacecraft's orbital plane

        const chandrayaanRAAN_rad = params.chandrayaanNodes * Math.PI / 180;
        const chandrayaanInc_rad = params.chandrayaanInclination * Math.PI / 180;
        const lunarInc_rad = params.lunarInclination * Math.PI / 180;
        const lunarRAAN_rad = params.lunarNodes * Math.PI / 180;

        // Get Moon's position in 3D space using proper spherical trigonometry
        const angleInLunarOrbitDeg = calculateTrueAnomalyFromRA(
            params.moonRA,
            params.lunarNodes,
            0, // omega = 0 for circular lunar orbit
            params.lunarInclination
        );
        const angleInLunarOrbit = THREE.MathUtils.degToRad(angleInLunarOrbitDeg);

        const moonPos = new THREE.Vector3(
            SPHERE_RADIUS * Math.cos(angleInLunarOrbit),
            0,
            -SPHERE_RADIUS * Math.sin(angleInLunarOrbit)
        );
        moonPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), lunarInc_rad);
        moonPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), lunarRAAN_rad);

        // Calculate the angle from Chandrayaan's ascending node to Moon
        // First, get the ascending node position in 3D
        const ascNodePos = new THREE.Vector3(SPHERE_RADIUS, 0, 0);
        ascNodePos.applyAxisAngle(new THREE.Vector3(1, 0, 0), chandrayaanInc_rad);
        ascNodePos.applyAxisAngle(new THREE.Vector3(0, 1, 0), chandrayaanRAAN_rad);

        // Project both vectors onto Chandrayaan's orbital plane
        // The orbital plane normal is (0, 1, 0) rotated by inclination and RAAN
        const normal = new THREE.Vector3(0, 1, 0);
        normal.applyAxisAngle(new THREE.Vector3(1, 0, 0), chandrayaanInc_rad);
        normal.applyAxisAngle(new THREE.Vector3(0, 1, 0), chandrayaanRAAN_rad);

        // Get vectors in the orbital plane
        const nodeInPlane = ascNodePos.clone().projectOnPlane(normal).normalize();
        const moonInPlane = moonPos.clone().projectOnPlane(normal).normalize();

        // Calculate angle between them (this is where apogee should be)
        let apogeeAngle = Math.acos(nodeInPlane.dot(moonInPlane)) * 180 / Math.PI;

        // Determine sign using cross product
        const cross = new THREE.Vector3().crossVectors(nodeInPlane, moonInPlane);
        if (cross.dot(normal) < 0) {
            apogeeAngle = 360 - apogeeAngle;
        }

        // Since apogee is at true anomaly = 180°, AoP = apogeeAngle - 180°
        let aop = apogeeAngle - 180;
        if (aop < 0) aop += 360;

        params.chandrayaanOmega = aop;

        // If restrictions are enabled, clamp to allowed values
        if (params.restrictOrbitalParams) {
            const newOmega = getClosestAllowedOmega(params.chandrayaanOmega, params.chandrayaanInclination);
            params.chandrayaanOmega = newOmega;
        }

        chandrayaanControllers.omega?.updateDisplay();
        onParameterChange('chandrayaanOmega', aop);
    });

    chandrayaanControllers.perigeeAlt = chandrayaanFolder.add(params, 'chandrayaanPerigeeAlt', 180, 600000, 100).name('Perigee Altitude (km)').onChange((value) => {
        onParameterChange('chandrayaanPerigeeAlt', value);
        updateChandrayaanPeriodDisplay();
    });

    // Apogee with sync button (sync to lunar orbit radius)
    chandrayaanControllers.apogeeAlt = chandrayaanFolder.add(params, 'chandrayaanApogeeAlt', 180, 600000, 100).name('Apogee Altitude (km)').onChange((value) => {
        onParameterChange('chandrayaanApogeeAlt', value);
        updateChandrayaanPeriodDisplay();
    });
    // Add inline sync button for Apogee
    chandrayaanControllers.syncApogeeBtn = addInlineSyncButton(chandrayaanControllers.apogeeAlt, () => {
        // Set apogee to lunar orbit distance (384,400 km from Earth center - Earth radius)
        params.chandrayaanApogeeAlt = LUNAR_ORBIT_DISTANCE - EARTH_RADIUS;
        chandrayaanControllers.apogeeAlt?.updateDisplay();
        syncParamsToLaunchEvent();
        invalidateOrbitalParamsCache();
        updateChandrayaanOrbit();
        updateOrbitalElements();
        updateChandrayaanPeriodDisplay();
    });

    // RA control (affects True Anomaly)
    chandrayaanControllers.ra = chandrayaanFolder.add(params, 'chandrayaanRA', 0, 360, 1).name('Craft RA (°)').onChange(() => {
        // Update chandrayaanTrueAnomaly from chandrayaanRA using proper spherical trigonometry
        let ta = calculateTrueAnomalyFromRA(
            params.chandrayaanRA,
            params.chandrayaanNodes,
            params.chandrayaanOmega,
            params.chandrayaanInclination
        );

        // Normalize to 0-360
        while (ta < 0) ta += 360;
        while (ta >= 360) ta -= 360;
        params.chandrayaanTrueAnomaly = ta;
        if (chandrayaanControllers.trueAnomaly) {
            chandrayaanControllers.trueAnomaly?.updateDisplay();
        }
        syncParamsToLaunchEvent();
        invalidateOrbitalParamsCache();
        updateChandrayaanOrbit();
        updateOrbitalElements();
    });

    // Add inline sync button for RA
    chandrayaanControllers.syncRABtn = addInlineSyncButton(chandrayaanControllers.ra, () => {
        params.chandrayaanRA = params.moonRA;
        chandrayaanControllers.ra?.updateDisplay();

        // Calculate True Anomaly from RA using centralized function
        let ta = calculateTrueAnomalyFromRA(
            params.chandrayaanRA,
            params.chandrayaanNodes,
            params.chandrayaanOmega,
            params.chandrayaanInclination
        );

        // Normalize to 0-360
        while (ta < 0) ta += 360;
        while (ta >= 360) ta -= 360;

        params.chandrayaanTrueAnomaly = ta;
        if (chandrayaanControllers.trueAnomaly) {
            chandrayaanControllers.trueAnomaly?.updateDisplay();
        }
        syncParamsToLaunchEvent();
        invalidateOrbitalParamsCache();
        updateChandrayaanOrbit();
        updateOrbitalElements();
    });

    // True Anomaly control (affects RA)
    chandrayaanControllers.trueAnomaly = chandrayaanFolder.add(params, 'chandrayaanTrueAnomaly', 0, 360, 1).name('Craft True Anomaly (°)').onChange(() => {
        // Update chandrayaanRA from chandrayaanTrueAnomaly using proper spherical trigonometry
        let ra = calculateRAFromTrueAnomaly(
            params.chandrayaanTrueAnomaly,
            params.chandrayaanNodes,
            params.chandrayaanOmega,
            params.chandrayaanInclination
        );
        // Normalize to 0-360
        while (ra < 0) ra += 360;
        while (ra >= 360) ra -= 360;
        params.chandrayaanRA = ra;
        if (chandrayaanControllers.ra) {
            chandrayaanControllers.ra?.updateDisplay();
        }
        syncParamsToLaunchEvent();
        invalidateOrbitalParamsCache();
        updateChandrayaanOrbit();
        updateOrbitalElements();
    });

    chandrayaanControllers.period = chandrayaanFolder.add(params, 'chandrayaanPeriod').name('Orbital Period').disable();
    chandrayaanControllers.raDisplay = chandrayaanFolder.add(params, 'chandrayaanRADisplay').name('Craft RA (current)').disable();
    chandrayaanControllers.craftEarthDistance = chandrayaanFolder.add(params, 'craftEarthDistance').name('Distance from Earth').disable();
    chandrayaanControllers.craftMoonDistance = chandrayaanFolder.add(params, 'craftMoonDistance').name('Distance to Moon').disable();
    chandrayaanFolder.open();

    // Initialize period display
    updateChandrayaanPeriodDisplay();

    // Initialize RA displays
    updateMoonRADisplay();
    updateChandrayaanRADisplay();

    // Initialize app mode
    switchAppMode(params.appMode);
}

// Update render date based on active timeline slider
function updateRenderDate(): void {
    let daysToUse;

    if (renderControl.activeSlider === 'launch') {
        daysToUse = renderControl.launchDays;
    } else if (renderControl.activeSlider === 'intercept') {
        daysToUse = renderControl.interceptDays;
    } else {
        daysToUse = timelineState.daysElapsed;
    }

    // Update renderDate - this is the single source of truth for rendering
    renderControl.renderDate = new Date(
        timelineState.startDate.getTime() + daysToUse * 24 * 60 * 60 * 1000
    );

    // Update current date display in first row to show the active timeline's date
    const currentDateSpan = document.getElementById('current-date');
    if (currentDateSpan) {
        if (currentDateSpan) currentDateSpan.textContent = renderControl.renderDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Update countdown timer to reflect active timeline's date
    updateCountdownTimer();

    // Update visualization - functions will pull from getRenderDate() automatically
    if (params.moonMode === 'Real') {
        updateMoonFromRealPosition();
    }

    // Update Chandrayaan orbit in all modes
    // In Explore: uses Set A (manual params)
    // In Plan/Game: uses Set B (launch event params if exists)
    updateChandrayaanOrbit();

    // Sync GUI with launch event only in Plan/Game modes
    if ((params.appMode === 'Game' || params.appMode === 'Plan') && launchEvent.exists) {
        syncGUIWithLaunchEvent();
    }
}

function setupTimeline(): void {
    const startDateInput = document.getElementById('start-date');
    const timelineSlider = document.getElementById('timeline-slider');
    const currentDateSpan = document.getElementById('current-date');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const playbackSpeedSelect = document.getElementById('playback-speed');

    // Use the default start date from timelineState (July 1, 2023)
    // Don't overwrite it with current date

    // Set datetime-local input value from existing timelineState
    const localDateString = new Date(timelineState.startDate.getTime() - timelineState.startDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    (startDateInput as HTMLInputElement).value = localDateString;

    // Update current date display
    function updateCurrentDateDisplay() {
        if (currentDateSpan) currentDateSpan.textContent = timelineState.currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    updateCurrentDateDisplay();

    // Start date change handler
    if (startDateInput) {
        startDateInput.addEventListener('change', (e) => {
            timelineState.startDate = new Date((e.target as HTMLInputElement).value);
            if (timelineSlider) {
                timelineState.daysElapsed = parseFloat((timelineSlider as HTMLInputElement).value);
            }
            timelineState.currentDate = new Date(
                timelineState.startDate.getTime() + timelineState.daysElapsed * 24 * 60 * 60 * 1000
            );

            // Update renderDate and all visualization (single source of truth)
            updateRenderDate();

            // Update launch marker position
            updateLaunchMarker();
        });
    }

    // Timeline slider handler (fires while dragging)
    if (timelineSlider) {
        timelineSlider.addEventListener('input', (e) => {
            timelineState.daysElapsed = parseFloat((e.target as HTMLInputElement).value);
        timelineState.currentDate = new Date(
            timelineState.startDate.getTime() + timelineState.daysElapsed * 24 * 60 * 60 * 1000
        );

        // Update timeline slider display if it exists
        const timelineSliderDisplay = document.getElementById('timeline-slider-display');
        if (timelineSliderDisplay) {
            timelineSliderDisplay.textContent = `Day ${timelineState.daysElapsed.toFixed(1)}`;
        }

        // Only update visualization if timeline slider is active for rendering
        if (renderControl.activeSlider === 'timeline') {
            // Update renderDate and all visualization (single source of truth)
            updateRenderDate();
        }

        // Update Moon intercept date in Plan mode (real-time preview while dragging)
        if (params.appMode === 'Plan' && launchEvent.exists) {
            // Temporarily update intercept date for preview (will be finalized on 'change')
            launchEvent.moonInterceptDate = new Date(timelineState.currentDate);
        }
        });
    }

    // Timeline slider change handler (fires when user releases slider)
    if (timelineSlider) {
        timelineSlider.addEventListener('change', () => {
        if (params.appMode === 'Plan' && launchEvent.exists) {
            // Finalize Moon intercept date to current timeline position
            launchEvent.moonInterceptDate = new Date(timelineState.currentDate);

            // Update the datetime-local input in the GUI (second one is Moon Intercept)
            if (launchEventGUI) {
                const formattedDate = formatDateForDisplay(launchEvent.moonInterceptDate);
                const inputs = document.querySelectorAll('#launch-event-container input[type="datetime-local"]');
                if (inputs.length >= 2) {
                    (inputs[1] as HTMLInputElement).value = formattedDate;  // Second input is Moon Intercept Date
                }
            }

            // Mark as dirty
            draftState.isDirty = true;
        }
        });
    }

    // Play/Pause button
    if (playPauseBtn) playPauseBtn.addEventListener('click', () => {
        timelineState.isPlaying = !timelineState.isPlaying;
        if (playPauseBtn) playPauseBtn.textContent = timelineState.isPlaying ? '⏸ Pause' : '▶ Play';
    });

    // Reset button
    if (resetBtn) resetBtn.addEventListener('click', () => {
        timelineState.isPlaying = false;
        timelineState.daysElapsed = 0;
        (timelineSlider as HTMLInputElement).value = String(0);
        timelineState.currentDate = new Date(timelineState.startDate);
        if (playPauseBtn) playPauseBtn.textContent = '▶ Play';

        // Update timeline slider display
        const timelineSliderDisplay = document.getElementById('timeline-slider-display');
        if (timelineSliderDisplay) {
            timelineSliderDisplay.textContent = 'Day 0.0';
        }

        // Update renderDate and all visualization (single source of truth)
        updateRenderDate();
    });

    // Playback speed
    if (playbackSpeedSelect) playbackSpeedSelect.addEventListener('change', (e) => {
        timelineState.speed = parseFloat((e.target as HTMLInputElement).value);
        updateSpeedButtons();
    });

    // Speed control buttons
    const speedDownBtn = document.getElementById('speed-down-btn');
    const speedUpBtn = document.getElementById('speed-up-btn');

    const speedOptions = [
        { value: 0.000011574, label: 'Realtime' },
        { value: 0.000694, label: '1 min/sec' },
        { value: 0.006944, label: '10 min/sec' },
        { value: 0.020833, label: '30 min/sec' },
        { value: 0.041667, label: '1 hr/sec' },
        { value: 0.125, label: '3 hr/sec' },
        { value: 0.25, label: '6 hr/sec' },
        { value: 0.5, label: '12 hr/sec' },
        { value: 1, label: '1 day/sec' },
        { value: 2, label: '2 days/sec' },
        { value: 5, label: '5 days/sec' }
    ];

    function updateSpeedButtons() {
        const currentValue = parseFloat((playbackSpeedSelect as HTMLSelectElement).value);
        const currentIndex = speedOptions.findIndex(opt => Math.abs(opt.value - currentValue) < 0.0001);

        // Update down button
        if (currentIndex > 0) {
            (speedDownBtn as HTMLInputElement).disabled = false;
            if (speedDownBtn) speedDownBtn.textContent = `◄ ${speedOptions[currentIndex - 1].label}`;
        } else {
            (speedDownBtn as HTMLInputElement).disabled = true;
            if (speedDownBtn) speedDownBtn.textContent = '◄';
        }

        // Update up button
        if (currentIndex < speedOptions.length - 1) {
            (speedUpBtn as HTMLInputElement).disabled = false;
            if (speedUpBtn) speedUpBtn.textContent = `${speedOptions[currentIndex + 1].label} ►`;
        } else {
            (speedUpBtn as HTMLInputElement).disabled = true;
            if (speedUpBtn) speedUpBtn.textContent = '►';
        }
    }

    if (speedDownBtn) speedDownBtn.addEventListener('click', () => {
        const currentValue = parseFloat((playbackSpeedSelect as HTMLSelectElement).value);
        const currentIndex = speedOptions.findIndex(opt => Math.abs(opt.value - currentValue) < 0.0001);
        if (currentIndex > 0) {
            (playbackSpeedSelect as HTMLSelectElement).value = String(speedOptions[currentIndex - 1].value);
            timelineState.speed = speedOptions[currentIndex - 1].value;
            updateSpeedButtons();
        }
    });

    if (speedUpBtn) speedUpBtn.addEventListener('click', () => {
        const currentValue = parseFloat((playbackSpeedSelect as HTMLSelectElement).value);
        const currentIndex = speedOptions.findIndex(opt => Math.abs(opt.value - currentValue) < 0.0001);
        if (currentIndex < speedOptions.length - 1) {
            (playbackSpeedSelect as HTMLSelectElement).value = String(speedOptions[currentIndex + 1].value);
            timelineState.speed = speedOptions[currentIndex + 1].value;
            updateSpeedButtons();
        }
    });

    // Initialize button states
    updateSpeedButtons();

    // Setup render control sliders (Plan mode only)
    setupRenderControlSliders();
}

function setupRenderControlSliders(): void {
    const launchSlider = document.getElementById('launch-slider');
    const interceptSlider = document.getElementById('intercept-slider');
    const launchSliderDisplay = document.getElementById('launch-slider-display');
    const interceptSliderDisplay = document.getElementById('intercept-slider-display');
    const timelineSliderDisplay = document.getElementById('timeline-slider-display');

    const timelineCheckbox = document.getElementById('timeline-slider-active');
    const launchCheckbox = document.getElementById('launch-slider-active');
    const interceptCheckbox = document.getElementById('intercept-slider-active');

    // Update slider displays
    function updateSliderDisplays() {
        if (launchSlider && launchSliderDisplay) launchSliderDisplay.textContent = `Day ${parseFloat((launchSlider as HTMLInputElement).value).toFixed(1)}`;
        if (interceptSlider && interceptSliderDisplay) interceptSliderDisplay.textContent = `Day ${parseFloat((interceptSlider as HTMLInputElement).value).toFixed(1)}`;
        if (timelineSliderDisplay) timelineSliderDisplay.textContent = `Day ${timelineState.daysElapsed.toFixed(1)}`;
    }

    // Checkbox change handlers (radio button behavior)
    function handleCheckboxChange(selectedCheckbox: any, sliderType: any): void {
        // Uncheck all others
        [timelineCheckbox, launchCheckbox, interceptCheckbox].forEach(cb => {
            if (cb !== selectedCheckbox) (cb as HTMLInputElement).checked = false;
        });

        // Ensure the selected one is checked
        if (!(selectedCheckbox as HTMLInputElement).checked) {
            (selectedCheckbox as HTMLInputElement).checked = true;
        }

        // Update active slider
        renderControl.activeSlider = sliderType;

        // Update active timeline indicator
        const indicator = document.getElementById('active-timeline-indicator');
        if (indicator) {
            if (sliderType === 'timeline') {
                indicator.textContent = 'View';
            } else if (sliderType === 'launch') {
                indicator.textContent = 'Launch';
            } else if (sliderType === 'intercept') {
                indicator.textContent = 'Intercept';
            }
        }

        // Update render date
        updateRenderDate();
    }

    if (timelineCheckbox) {
        timelineCheckbox.addEventListener('change', () => {
            if ((timelineCheckbox as HTMLInputElement).checked) {
                handleCheckboxChange(timelineCheckbox, 'timeline');
            } else {
                // If the user tries to uncheck it, re-check it, as one must be active.
                (timelineCheckbox as HTMLInputElement).checked = true;
            }
        });
    }

    if (launchCheckbox) {
        launchCheckbox.addEventListener('change', () => {
            if ((launchCheckbox as HTMLInputElement).checked) {
                handleCheckboxChange(launchCheckbox, 'launch');
            } else {
                // If unchecked, fall back to the timeline checkbox
                handleCheckboxChange(timelineCheckbox, 'timeline');
            }
        });
    }

    if (interceptCheckbox) {
        interceptCheckbox.addEventListener('change', () => {
            if ((interceptCheckbox as HTMLInputElement).checked) {
                handleCheckboxChange(interceptCheckbox, 'intercept');
            } else {
                // If unchecked, fall back to the timeline checkbox
                handleCheckboxChange(timelineCheckbox, 'timeline');
            }
        });
    }

    // Launch slider handler
    if (launchSlider) {
        launchSlider.addEventListener('input', (e) => {
            renderControl.launchDays = parseFloat((e.target as HTMLInputElement).value);

            // Update launch date - reactivity handles all updates automatically!
            if (launchEvent.exists) {
                launchEvent.date = new Date(
                    timelineState.startDate.getTime() + renderControl.launchDays * 24 * 60 * 60 * 1000
                );
            }

            updateSliderDisplays();
        });
    }

    // Intercept slider handler
    if (interceptSlider) {
        interceptSlider.addEventListener('input', (e) => {
            renderControl.interceptDays = parseFloat((e.target as HTMLInputElement).value);

            // Update intercept date - reactivity handles all updates automatically!
            if (launchEvent.exists) {
                launchEvent.moonInterceptDate = new Date(
                    timelineState.startDate.getTime() + renderControl.interceptDays * 24 * 60 * 60 * 1000
                );
            }

            updateSliderDisplays();
        });
    }

    // Initialize displays
    updateSliderDisplays();

    // Initialize renderDate to match the current timeline state
    // This ensures getRenderDate() returns correct date from the start
    updateRenderDate();
}

function syncRenderControlSlidersWithLaunchEvent(): void {
    if (!launchEvent.exists) return;

    // This function is called when updating from code (e.g., when switching modes)
    // We're already protected by isUpdatingFromCode flag in the callers

    const launchSlider = document.getElementById('launch-slider');
    const interceptSlider = document.getElementById('intercept-slider');

    if (launchEvent.date && launchSlider) {
        // Calculate days from start for launch date
        const launchDays = (launchEvent.date.getTime() - timelineState.startDate.getTime()) / (24 * 60 * 60 * 1000);
        renderControl.launchDays = Math.max(0, Math.min(TIMELINE_MAX_DAYS, launchDays));
        (launchSlider as HTMLInputElement).value = String(renderControl.launchDays);
    }

    if (launchEvent.moonInterceptDate && interceptSlider) {
        // Calculate days from start for intercept date
        const interceptDays = (launchEvent.moonInterceptDate.getTime() - timelineState.startDate.getTime()) / (24 * 60 * 60 * 1000);
        renderControl.interceptDays = Math.max(0, Math.min(TIMELINE_MAX_DAYS, interceptDays));
        (interceptSlider as HTMLInputElement).value = String(renderControl.interceptDays);
    }

    // Update displays
    const launchSliderDisplay = document.getElementById('launch-slider-display');
    const interceptSliderDisplay = document.getElementById('intercept-slider-display');
    if (launchSliderDisplay) if (launchSliderDisplay) launchSliderDisplay.textContent = `Day ${renderControl.launchDays.toFixed(1)}`;
    if (interceptSliderDisplay) if (interceptSliderDisplay) interceptSliderDisplay.textContent = `Day ${renderControl.interceptDays.toFixed(1)}`;
}

function updateCountdownTimer(): void {
    const countdownEl = document.getElementById('countdown-timer');

    if (!launchEvent.exists) {
        if (countdownEl) countdownEl.style.display = 'none';
        return;
    }

    if (countdownEl) countdownEl.style.display = 'block';

    // Pull from single source of truth (respects active timeline)
    const currentDate = getRenderDate();

    // Calculate time difference in seconds
    const diffMs = launchEvent.date ? currentDate.getTime() - launchEvent.date.getTime() : 0;
    const diffSec = Math.abs(diffMs / 1000);

    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = Math.floor(diffSec % 60);

    const sign = diffMs < 0 ? '-' : '+';
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (countdownEl) if (countdownEl) countdownEl.textContent = `T${sign}${formattedTime}`;
}

// Update marker sizes based on camera distance (zoom-aware rendering)
function updateMarkerSizes(): void {
    // Node markers: cap scale to prevent huge spheres when zoomed in
    const nodeMarkers = [
        lunarAscendingNode,
        lunarDescendingNode,
        chandrayaanAscendingNode,
        chandrayaanDescendingNode
    ];

    nodeMarkers.forEach(node => {
        if (!node) return;

        const distance = camera.position.distanceTo(node.position);

        // Scale proportional to distance (farther = bigger to stay visible)
        let scale = (distance / ZOOM_BASE_DISTANCE) * ZOOM_BASE_SCALE;

        // Cap the scale to prevent tiny dots when far AND huge spheres when close
        scale = Math.max(ZOOM_NODE_MIN_SCALE, Math.min(ZOOM_NODE_MAX_SCALE, scale));

        node.scale.setScalar(scale);
    });

    // Aries marker (sprite): tighter caps than nodes to keep it small
    if (ariesMarker) {
        const distance = camera.position.distanceTo(ariesMarker.position);
        let scale = (distance / ZOOM_BASE_DISTANCE) * ZOOM_BASE_SCALE;

        // Tighter caps: keep marker smaller when zooming in
        scale = Math.max(ZOOM_ARIES_MIN_SCALE, Math.min(ZOOM_ARIES_MAX_SCALE, scale));

        // Sprites use uniform scale on X and Y (Z is always 1)
        ariesMarker.scale.set(ARIES_MARKER_BASE_SIZE * scale, ARIES_MARKER_BASE_SIZE * scale, 1);
    }

    // Spacecraft: slightly larger caps
    if (chandrayaan) {
        const distance = camera.position.distanceTo(chandrayaan.position);

        let scale = (distance / ZOOM_BASE_DISTANCE) * ZOOM_BASE_SCALE;

        // Cap: allow slightly larger than nodes
        scale = Math.max(ZOOM_SPACECRAFT_MIN_SCALE, Math.min(ZOOM_SPACECRAFT_MAX_SCALE, scale));

        chandrayaan.scale.setScalar(scale);
    }
}

function onWindowResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastFrameTime: number = Date.now();

// Setup mode tabs
function setupModeTabs(): void {
    const modeTabs = document.querySelectorAll('.mode-tab');

    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const newMode = tab.getAttribute('data-mode') as AppMode;
            if (!newMode) return;

            // Check for unsaved changes before switching
            if (draftState.isDirty && params.appMode === 'Plan') {
                const confirmSwitch = confirm('You have unsaved changes. Are you sure you want to switch modes?');
                if (!confirmSwitch) {
                    return;
                }
                // Discard changes
                draftState.isDirty = false;
            }

            // Update active tab
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Switch mode
            params.appMode = newMode;
            switchAppMode(newMode);
        });
    });
}

// Setup actions panel
function setupActionsPanel(): void {
    // Used in function scope

    // @ts-expect-error - Used in conditional logic
    const actionsPanel = document.getElementById('actions-panel');
    const addLaunchBtn = document.getElementById('add-launch-action-btn');
    const launchEventContainer = document.getElementById('launch-event-container');

    // Add Launch button click handler
    if (addLaunchBtn) addLaunchBtn.addEventListener('click', () => {
        // Create launch event if it doesn't exist
        if (!launchEvent.exists) {
            launchEvent.exists = true;
            launchEvent.date = new Date('2023-07-30T21:36:00');
            launchEvent.moonInterceptDate = new Date('2023-08-05T16:56:00');
        }

        // Show card, hide button
        if (addLaunchBtn) addLaunchBtn.style.display = 'none';
        if (launchEventContainer) launchEventContainer.style.display = 'block';

        // Create launch event GUI
        createLaunchEventGUI();

        // Sync timeline slider with intercept date
        if (launchEvent.moonInterceptDate) {
            updateTimelineSliderFromInterceptDate();
        }

        // Update launch marker
        updateLaunchMarker();

        // Sync render control sliders with launch event
        syncRenderControlSlidersWithLaunchEvent();

        // Update slider enabled/disabled state
        updateRenderControlSlidersState();
    });
}

// Create launch event GUI using lil-gui
function createLaunchEventGUI(): void {
    const container = document.getElementById('launch-event-container');

    // Destroy existing GUI if it exists
    if (launchEventGUI) {
        launchEventGUI.destroy();
    }

    // Create new GUI instance
    launchEventGUI = new GUI({ container: container || undefined });
    launchEventGUI.title('Launch Event');

    // Helper function to get valid omega values based on inclination
    function getOmegaOptions(inc: number): { [key: string]: number } {
        if (inc === 21.5) {
            return { '178°': 178 };
        } else if (inc === 41.8) {
            return { '198°': 198, '203°': 203 };
        }
        return { '178°': 178 }; // default
    }

    // Validate and set initial omega based on inclination
    const validOmegaOptions = getOmegaOptions(launchEvent.inclination);
    if (!Object.values(validOmegaOptions).includes(launchEvent.omega)) {
        // If current omega is invalid for this inclination, use the first valid option
        launchEvent.omega = Object.values(validOmegaOptions)[0];
    }

    // Create a temporary params object for the GUI
    const guiParams: any = {
        moonInterceptDate: formatDateForDisplay(launchEvent.moonInterceptDate),
        autoLOI: launchEvent.autoLOI,
        optimalLOIDate: formatDateForDisplay(launchEvent.moonInterceptDate),  // For dropdown
        syncTLIWithLOI: launchEvent.syncTLIWithLOI,
        launchDate: formatDateForDisplay(launchEvent.date),
        inclination: launchEvent.inclination,
        raan: launchEvent.raan,
        omega: launchEvent.omega,
        perigeeAlt: launchEvent.perigeeAlt,
        apogeeAlt: launchEvent.apogeeAlt,
        trueAnomaly: launchEvent.trueAnomaly || 0,
        captureDistance: launchEvent.captureDistance || 2000,
        period: formatPeriod(calculateOrbitalPeriod(launchEvent.perigeeAlt, launchEvent.apogeeAlt)),
        save: () => saveLaunchEvent(),
        delete: () => deleteLaunchEvent()
    };

    // Store reference for updating from timeline sliders
    launchEventGUIParams = guiParams;

    // Variable to hold the optimal LOI controller reference
    let optimalLOIController: any = null;

    // Helper function to handle optimal LOI selection
    const handleOptimalLOIChange = (value: string) => {
        if (value && value !== 'None' && value !== 'Select Auto LOI first' && value !== 'No optimal dates found') {
            const newDate = new Date(value);

            // Update the reactive property - this will trigger all updates automatically
            launchEvent.moonInterceptDate = newDate;

            // Update the manual input display value
            guiParams.moonInterceptDate = formatDateForDisplay(newDate);

            // Trigger render update
            updateRenderDate();
        }
    };

    // Create Automatic LOI checkbox
    const autoLOIController = launchEventGUI.add(guiParams, 'autoLOI').name('Auto LOI').onChange((value: boolean) => {
        launchEvent.autoLOI = value;

        if (value) {
            // Calculate optimal LOI dates when enabled
            // Search the full timeline window
            const searchStart = timelineState.startDate;
            const searchEnd = new Date(timelineState.startDate.getTime() + TIMELINE_MAX_DAYS * 24 * 60 * 60 * 1000);

            launchEvent.optimalLOIDates = findOptimalLOIDates(searchStart, searchEnd);

            // Destroy existing dropdown if it exists
            if (optimalLOIController) {
                optimalLOIController.destroy();
                optimalLOIController = null;
            }

            // Build options object for lil-gui
            const options: Record<string, string> = {};
            if (launchEvent.optimalLOIDates.length === 0) {
                options['No optimal dates found'] = 'None';
                guiParams.optimalLOIDate = 'None';
            } else {
                launchEvent.optimalLOIDates.forEach((date) => {
                    const formatted = formatDateForDisplay(date);
                    options[formatted] = formatted;
                });

                // Select first optimal date
                const firstDate = formatDateForDisplay(launchEvent.optimalLOIDates[0]);
                guiParams.optimalLOIDate = firstDate;
                launchEvent.moonInterceptDate = launchEvent.optimalLOIDates[0];
                guiParams.moonInterceptDate = formatDateForDisplay(launchEvent.optimalLOIDates[0]);

                // Trigger render update
                updateRenderDate();
            }

            // Create new dropdown with proper options
            optimalLOIController = launchEventGUI.add(guiParams, 'optimalLOIDate', options).name('Optimal LOI').onChange(handleOptimalLOIChange);

            // Move dropdown to appear right after the checkbox
            const autoLOIElement = autoLOIController.domElement;
            const optimalLOIElement = optimalLOIController.domElement;
            if (autoLOIElement && optimalLOIElement && autoLOIElement.parentElement) {
                autoLOIElement.parentElement.insertBefore(optimalLOIElement, autoLOIElement.nextSibling);
            }

            optimalLOIController.show();
            interceptDateController.hide();
        } else {
            // Destroy dropdown when unchecked
            if (optimalLOIController) {
                optimalLOIController.destroy();
                optimalLOIController = null;
            }
            interceptDateController.show();
        }
    });

    // Create LOI Date manual input (appears after checkbox)
    const interceptDateController = launchEventGUI.add(guiParams, 'moonInterceptDate').name('LOI Date').listen();
    const interceptInputElem = interceptDateController.domElement.querySelector('input');

    if (interceptInputElem) interceptInputElem.type = 'datetime-local';

    const interceptInputElem2 = interceptDateController.domElement.querySelector('input');
    if (interceptInputElem2) interceptInputElem2.title = 'Lunar Orbit Insertion';
    const interceptNameElem = interceptDateController.domElement.querySelector('.name');

    if (interceptNameElem) (interceptNameElem as HTMLElement).title = 'Lunar Orbit Insertion';

    // Switch to LOI timeline on click/focus
    const switchToLOITimeline = () => {
        const interceptCheckbox = document.getElementById('intercept-slider-active');
        if (interceptCheckbox && !(interceptCheckbox as HTMLInputElement).disabled) {
            (interceptCheckbox as HTMLInputElement).checked = true;
            interceptCheckbox.dispatchEvent(new Event('change'));
        }
    };
        // @ts-expect-error - Declared for querySelector
    const elem = interceptDateController.domElement.querySelector('input');

    const interceptInputElem3 = interceptDateController.domElement.querySelector('input');


    if (interceptInputElem3) interceptInputElem3.addEventListener('focus', switchToLOITimeline);

    const interceptInputElem4 = interceptDateController.domElement.querySelector('input');
    if (interceptInputElem4) interceptInputElem4.addEventListener('click', switchToLOITimeline);

    // Add change handler for LOI date input
    const interceptInputElem5 = interceptDateController.domElement.querySelector('input');
    if (interceptInputElem5) interceptInputElem5.addEventListener('change', (e: Event) => {
        if (isUpdatingFromCode) return; // Prevent circular updates from slider

        // Just set the value - reactivity handles everything!
        launchEvent.moonInterceptDate = new Date((e.target as HTMLInputElement).value);
        guiParams.moonInterceptDate = (e.target as HTMLInputElement).value;
    });

    // Sync TLI with LOI checkbox
    // @ts-expect-error - Used in reactive effects

    const syncCheckboxController = launchEventGUI.add(guiParams, 'syncTLIWithLOI').name('Sync TLI').onChange(value => {
        // Just set the value - reactivity handles everything!
        launchEvent.syncTLIWithLOI = value;
    });

    // TLI Date controller
    launchDateController = launchEventGUI.add(guiParams, 'launchDate').name('TLI Date').listen();
    const launchInputElem = launchDateController.domElement.querySelector('input');

    if (launchInputElem) launchInputElem.type = 'datetime-local';

    const launchInputElem2 = launchDateController.domElement.querySelector('input');
    if (launchInputElem2) launchInputElem2.title = 'Trans Lunar Injection';
    const launchNameElem = launchDateController.domElement.querySelector('.name');

    if (launchNameElem) (launchNameElem as HTMLElement).title = 'Trans Lunar Injection';

    // Set initial state (disabled if sync is enabled)
    if (launchEvent.syncTLIWithLOI) {
        launchDateController.disable();
        // TLI date will be computed automatically by reactive system
    }

    // Switch to TLI timeline on click/focus
    const switchToTLITimeline = () => {
        const launchCheckbox = document.getElementById('launch-slider-active');
        if (launchCheckbox && !(launchCheckbox as HTMLInputElement).disabled) {
            (launchCheckbox as HTMLInputElement).checked = true;
            launchCheckbox.dispatchEvent(new Event('change'));
        }
    };

    const launchInputElem3 = launchDateController.domElement.querySelector('input');
    if (launchInputElem3) launchInputElem3.addEventListener('focus', switchToTLITimeline);

    const launchInputElem4 = launchDateController.domElement.querySelector('input');
    if (launchInputElem4) launchInputElem4.addEventListener('click', switchToTLITimeline);



    const launchInputElem6 = launchDateController.domElement.querySelector('input');
    if (launchInputElem6) launchInputElem6.addEventListener('change', (e: Event) => {
        if (isUpdatingFromCode) return; // Prevent circular updates from slider

        // Just set the value - reactivity handles everything!
        launchEvent.date = new Date((e.target as HTMLInputElement).value);
        guiParams.launchDate = (e.target as HTMLInputElement).value;
    });

    // Helper function to switch to View timeline when clicking on orbital parameter fields
    function switchToViewTimeline() {
        const viewCheckbox = document.getElementById('timeline-slider-active');
        if (viewCheckbox && !(viewCheckbox as HTMLInputElement).disabled) {
            (viewCheckbox as HTMLInputElement).checked = true;
            viewCheckbox.dispatchEvent(new Event('change'));
        }
    }

    // Helper to add both click, focus, and input handlers to a controller
    function addViewTimelineSwitchHandlers(controller: any, selector: any): void {
        const element = controller.domElement.querySelector(selector);
        if (element) {
            element.addEventListener('focus', switchToViewTimeline);
            element.addEventListener('click', switchToViewTimeline);
            element.addEventListener('input', switchToViewTimeline); // For typing in input
        }

        // Also attach to the slider element if it exists (for lil-gui number controllers)
        const slider = controller.domElement.querySelector('.slider');
        if (slider) {
            slider.addEventListener('mousedown', switchToViewTimeline);
            slider.addEventListener('touchstart', switchToViewTimeline);
        }
    }

    // RAAN controller
    const raanController = launchEventGUI.add(guiParams, 'raan', 0, 360, 0.1).name('RAAN (Ω) (°)').onChange(value => {
        launchEvent.raan = value;
        markDirtyAndUpdate();
    });
    addViewTimelineSwitchHandlers(raanController, 'input');

    // Declare omega controller variable (will be assigned after inclination)
    let omegaController: Controller | undefined;

    // Inclination dropdown (constrained to 21.5° or 41.8°)
    const inclinationController = launchEventGUI.add(guiParams, 'inclination', { '21.5°': 21.5, '41.8°': 41.8 }).name('Inclination').onChange(value => {
        launchEvent.inclination = value;

        // Update omega options based on new inclination
        const validOmegaOptions = getOmegaOptions(value);

        // Set omega to first valid option for this inclination
        const newOmega = Object.values(validOmegaOptions)[0];
        guiParams.omega = newOmega;
        launchEvent.omega = newOmega;

        // Recreate omega controller with new options
        if (omegaController && launchEventGUI) { /* Recreate will happen below */ }
        if (launchEventGUI) omegaController = launchEventGUI.add(guiParams, 'omega', validOmegaOptions).name('ω (Arg. Periapsis)').onChange(value => {
            launchEvent.omega = value;
            markDirtyAndUpdate();
        });
        // Add handlers to dynamically created omega controller
        addViewTimelineSwitchHandlers(omegaController, 'select');

        markDirtyAndUpdate();
    });
    // Add handlers to inclination
    addViewTimelineSwitchHandlers(inclinationController, 'select');

    // Omega dropdown (depends on inclination) - Created after inclination for proper UI order
    omegaController = launchEventGUI.add(guiParams, 'omega', getOmegaOptions(guiParams.inclination)).name('ω (Arg. Periapsis)').onChange(value => {
        launchEvent.omega = value;
        markDirtyAndUpdate();
    });
    addViewTimelineSwitchHandlers(omegaController, 'select');

    const perigeeController = launchEventGUI.add(guiParams, 'perigeeAlt', 180, 600000, 100).name('Perigee Alt (km)').onChange(value => {
        // Just set the value - reactivity handles everything!
        launchEvent.perigeeAlt = value;
    });
    addViewTimelineSwitchHandlers(perigeeController, 'input');

    const apogeeController = launchEventGUI.add(guiParams, 'apogeeAlt', 180, 600000, 100).name('Apogee Alt (km)').onChange(value => {
        // Just set the value - reactivity handles everything!
        launchEvent.apogeeAlt = value;
    });
    addViewTimelineSwitchHandlers(apogeeController, 'input');

    // Auto-optimize button (placed after controllers so they're in scope)
    const autoOptimizeBtn = document.createElement('button');
    autoOptimizeBtn.textContent = 'Auto Optimize RAAN & Apogee';
    autoOptimizeBtn.title = 'Optimize RAAN and Apogee to minimize closest approach distance to Moon at LOI';
    autoOptimizeBtn.style.cssText = `
        width: 100%;
        padding: 10px 12px;
        margin-bottom: 8px;
        background: #555;
        border: 1px solid #444;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s;
        font-family: Arial, sans-serif;
        line-height: 1.4;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    autoOptimizeBtn.addEventListener('mouseenter', () => {
        autoOptimizeBtn.style.background = '#666';
    });

    autoOptimizeBtn.addEventListener('mouseleave', () => {
        autoOptimizeBtn.style.background = '#555';
    });

    autoOptimizeBtn.addEventListener('click', () => {
        // Run optimization
        const loiDate = launchEvent.moonInterceptDate;
        if (!loiDate) {
            showAlert('Please set LOI date first', 'Missing LOI Date');
            return;
        }

        const result = optimizeApogeeToMoonMultiStart(
            loiDate,
            launchEvent.omega,
            launchEvent.inclination,
            launchEvent.apogeeAlt
        );

        // Prevent reactive effects from reverting our changes
        isUpdatingFromCode = true;

        // Update launch event
        launchEvent.raan = result.raan;
        launchEvent.apogeeAlt = result.apogeeAlt;

        // Update GUI params to reflect launchEvent changes
        guiParams.raan = result.raan;
        guiParams.apogeeAlt = result.apogeeAlt;

        // Recalculate TLI date based on optimal true anomaly
        // Time from periapsis (TLI) to reach the optimal true anomaly at LOI
        const timeToOptimalNu = calculateTimeToTrueAnomaly(result.trueAnomaly, launchEvent.perigeeAlt, result.apogeeAlt);
        const newTLIDate = new Date(loiDate.getTime() - timeToOptimalNu * 1000);

        // Update TLI date
        launchEvent.date = newTLIDate;
        guiParams.launchDate = newTLIDate.toISOString().slice(0, 16);
        if (launchDateController) {
            launchDateController.updateDisplay();
        }

        // Update controllers
        raanController.updateDisplay();
        apogeeController.updateDisplay();

        // Mark dirty and update visualization
        markDirtyAndUpdate();

        // Re-enable reactive effects
        isUpdatingFromCode = false;

        showAlert(`Optimization complete!\n\nOptimal RAAN: ${result.raan.toFixed(2)}°\nOptimal Apogee: ${result.apogeeAlt.toFixed(1)} km\nOptimal True Anomaly: ${result.trueAnomaly.toFixed(1)}°\n\nClosest approach: ${result.distance.toFixed(1)} km\n\nTLI date adjusted to ${newTLIDate.toISOString().slice(0, 16)}\nto reach ν=${result.trueAnomaly.toFixed(1)}° at LOI`, 'Optimization Complete');
    });

    // Insert button into GUI
    if (launchEventGUI && (launchEventGUI as any).$children) {
        const guiElement = (launchEventGUI as any).domElement;
        const childrenContainer = guiElement.querySelector('.children');
        if (childrenContainer) {
            // Create a wrapper for the button to match lil-gui styling
            const buttonWrapper = document.createElement('div');
            buttonWrapper.style.cssText = 'padding: 4px 8px;';
            buttonWrapper.appendChild(autoOptimizeBtn);
            childrenContainer.appendChild(buttonWrapper);
        }
    }

    // True anomaly is disabled because at launch the craft is always at perigee (ν = 0°)
    const trueAnomalyController = launchEventGUI.add(guiParams, 'trueAnomaly', 0, 360, 1).name('True Anomaly (°)').onChange(value => {
        launchEvent.trueAnomaly = value;
        markDirtyAndUpdate();
    }).disable();
    addViewTimelineSwitchHandlers(trueAnomalyController, 'input');

    const captureDistController = launchEventGUI.add(guiParams, 'captureDistance', 50, 400000, 10).name('Capture Dist (km)').onChange(value => {
        launchEvent.captureDistance = value;
        markDirtyAndUpdate();
    });
    addViewTimelineSwitchHandlers(captureDistController, 'input');

    const periodController = launchEventGUI.add(guiParams, 'period').name('Period').disable();
    addViewTimelineSwitchHandlers(periodController, 'input');

    // Add save and delete buttons
    launchEventGUI.add(guiParams, 'save').name('💾 Save');
    launchEventGUI.add(guiParams, 'delete').name('🗑️ Delete');

    // Helper functions
    function markDirtyAndUpdate() {
        draftState.isDirty = true;

        // Sync launchEvent to BOTH params AND planGameParamSet
        // This ensures the parameter set is always in sync with launchEvent
        planGameParamSet.loadFromLaunchEvent(launchEvent);
        planGameParamSet.copyTo(params);

        // Update GUI controllers
        chandrayaanControllers.inclination?.updateDisplay();
        chandrayaanControllers.nodes?.updateDisplay();
        chandrayaanControllers.omega?.updateDisplay();
        chandrayaanControllers.perigeeAlt?.updateDisplay();
        chandrayaanControllers.apogeeAlt?.updateDisplay();
        chandrayaanControllers.trueAnomaly?.updateDisplay();

        // Invalidate cache so fresh calculations use current renderDate
        invalidateOrbitalParamsCache();

        // Update orbital period display (depends on perigee/apogee which may have changed)
        updateChandrayaanPeriodDisplay();

        // Update visualization based on ACTIVE timeline (respects which checkbox is selected)
        // updateRenderDate() sets renderControl.renderDate which becomes the source of truth
        // All render functions will pull from getRenderDate() automatically
        updateRenderDate();

        // Update orbital geometry (nodes, planes, angle visualizations)
        // These depend on orbital parameters (inclination, RAAN, omega) which may have changed
        updateChandrayaanNodePositions();
        updateChandrayaanOrbitCircle();
        updateRAANLines();
        updateAOPLines();
    }

    // Setup reactive effects after GUI is created
    setupReactiveEffects();
}

function saveLaunchEvent(): void {
    // Save a copy
    draftState.savedLaunchEvent = JSON.parse(JSON.stringify(launchEvent));
    draftState.isDirty = false;

    // Sync launchEvent to planGameParamSet and params (ensure consistency)
    if (params.appMode === 'Plan' || params.appMode === 'Game') {
        planGameParamSet.loadFromLaunchEvent(launchEvent);
        planGameParamSet.copyTo(params);

        // Update all GUI displays to reflect saved values
        chandrayaanControllers.inclination?.updateDisplay();
        chandrayaanControllers.nodes?.updateDisplay();
        chandrayaanControllers.omega?.updateDisplay();
        chandrayaanControllers.perigeeAlt?.updateDisplay();
        chandrayaanControllers.apogeeAlt?.updateDisplay();
        chandrayaanControllers.trueAnomaly?.updateDisplay();
    }

    // Invalidate cache so fresh calculations use current renderDate
    invalidateOrbitalParamsCache();

    // Update visualizations - will automatically use renderDate from active timeline
    updateChandrayaanOrbit();
    updateChandrayaanPeriodDisplay();

    // Update launch marker on timeline
    updateLaunchMarker();
}

function deleteLaunchEvent(): void {
    const confirmDelete = confirm('Are you sure you want to delete this launch event?');
    if (!confirmDelete) return;

    // Destroy GUI
    if (launchEventGUI) {
        launchEventGUI.destroy();
        launchEventGUI = null;
        launchEventGUIParams = null;
    }

    // Clear launch event
    launchEvent.exists = false;
    launchEvent.date = null;
    launchEvent.moonInterceptDate = null;

    // Clear draft state
    draftState.isDirty = false;
    draftState.savedLaunchEvent = null;

    // Reset capture state
    resetCaptureState();

    // Hide container, show button
    const elem_launch_event_container = document.getElementById('launch-event-container');
    if (elem_launch_event_container) elem_launch_event_container.style.display = 'none';
    const elem_add_launch_action_btn = document.getElementById('add-launch-action-btn');
    if (elem_add_launch_action_btn) elem_add_launch_action_btn.style.display = 'block';

    // Invalidate cache
    invalidateOrbitalParamsCache();

    // Update visualizations to show manual parameters
    updateChandrayaanOrbit();
    updateChandrayaanPeriodDisplay();

    // Hide launch marker
    updateLaunchMarker();

    // Update slider enabled/disabled state
    updateRenderControlSlidersState();
}

function formatDateForDisplay(date: Date | null): string {
    if (!date) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function updateTimelineSliderFromInterceptDate(): void {
    if (!launchEvent.moonInterceptDate) return;

    // Calculate days from timeline start to intercept date
    const daysFromStart = (launchEvent.moonInterceptDate.getTime() - timelineState.startDate.getTime()) / (24 * 60 * 60 * 1000);

    // Clamp to valid range [0, TIMELINE_MAX_DAYS]
    const clampedDays = Math.max(0, Math.min(TIMELINE_MAX_DAYS, daysFromStart));

    // Update timeline state
    timelineState.daysElapsed = clampedDays;
    timelineState.currentDate = new Date(
        timelineState.startDate.getTime() + clampedDays * 24 * 60 * 60 * 1000
    );

    // Update slider and display
    const slider = document.getElementById('timeline-slider');
    if (slider) {
        (slider as HTMLInputElement).value = String(clampedDays);
    }

    const currentDateSpan = document.getElementById('current-date');
    if (currentDateSpan) {
        if (currentDateSpan) currentDateSpan.textContent = timelineState.currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Update moon position
    if (params.moonMode === 'Real') {
        updateMoonFromRealPosition();
    }
}

function updateLaunchMarker(): void {
    const launchMarker = document.getElementById('launch-marker');
    if (!launchMarker) return;

    if (!launchEvent.exists || !launchEvent.date) {
        launchMarker.style.display = 'none';
        return;
    }

    // Calculate days from start
    const daysFromStart = (launchEvent.date.getTime() - timelineState.startDate.getTime()) / (24 * 60 * 60 * 1000);

    // Clamp to [0, TIMELINE_MAX_DAYS] range to handle small timing differences
    const clampedDays = Math.max(0, Math.min(TIMELINE_MAX_DAYS, daysFromStart));

    // Hide if significantly outside window (more than 1 day before or after)
    if (daysFromStart < -1 || daysFromStart > 91) {
        launchMarker.style.display = 'none';
        return;
    }

    // Show marker at relative position (0-100%)
    const percentage = (clampedDays / TIMELINE_MAX_DAYS) * 100;
    launchMarker.style.display = 'block';
    launchMarker.style.left = `${percentage}%`;
}

function animate(): void {
    requestAnimationFrame(animate);

    // Increment frame counter to invalidate getChandrayaanParams() cache
    currentAnimationFrame++;

    // Handle timeline animation
    if (timelineState.isPlaying) {
        const now = Date.now();
        const deltaTime = (now - lastFrameTime) / 1000; // seconds
        lastFrameTime = now;

        // Update days elapsed based on playback speed
        const daysIncrement = timelineState.speed * deltaTime;
        timelineState.daysElapsed += daysIncrement;

        // Clamp to max timeline days
        if (timelineState.daysElapsed >= TIMELINE_MAX_DAYS) {
            timelineState.daysElapsed = TIMELINE_MAX_DAYS;
            timelineState.isPlaying = false;
            const playPauseBtn = document.getElementById('play-pause-btn');
            if (playPauseBtn) playPauseBtn.textContent = '▶ Play';
        }

        // Update current date
        timelineState.currentDate = new Date(
            timelineState.startDate.getTime() + timelineState.daysElapsed * 24 * 60 * 60 * 1000
        );

        // Update slider position
        const slider = document.getElementById('timeline-slider');
        if (slider) (slider as HTMLInputElement).value = String(timelineState.daysElapsed);

        // Update timeline slider display
        const timelineSliderDisplay = document.getElementById('timeline-slider-display');
        if (timelineSliderDisplay) {
            timelineSliderDisplay.textContent = `Day ${timelineState.daysElapsed.toFixed(1)}`;
        }

        // Update renderDate and all visualization (single source of truth)
        // This handles date display, countdown, Moon position, and Chandrayaan orbit
        updateRenderDate();
    } else {
        lastFrameTime = Date.now();
    }

    // Update marker sizes based on zoom level
    updateMarkerSizes();

    controls.update();
    renderer.render(scene, camera);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
