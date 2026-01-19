/**
 * Orbit Visualization - Type Definitions
 */

export interface Position3D {
    x: number;
    y: number;
    z: number;
}

export interface OrbitalParams {
    inclination: number;  // degrees
    raan: number;         // degrees
    omega: number;        // degrees (argument of periapsis)
    perigeeAlt: number;   // km
    apogeeAlt: number;    // km
}

export interface TimelineConfig {
    tliDate: Date;        // Trans-Lunar Injection
    loiDate: Date;        // Lunar Orbit Insertion
    landingDate: Date;    // Landing date
    closestApproachDate?: Date; // Optional: closest approach to Moon
    paddingDays?: number; // Days before TLI and after landing (default: 5)
}

export interface OrbitPanelState {
    // Timeline bounds
    startDate: Date;
    endDate: Date;
    totalDays: number;

    // Playback state
    daysElapsed: number;
    isPlaying: boolean;
    speed: number;        // days per second
    currentDate: Date;

    // Positions (km)
    moonPosition: Position3D | null;
    craftPosition: Position3D | null;
    craftTrueAnomaly: number;
    craftMoonDistance: number;
    craftEarthDistance: number;

    // Capture state
    isCaptured: boolean;
    captureDate: Date | null;
}

export interface OrbitVisualizationConfig {
    container: HTMLElement;
    timeline: TimelineConfig;
    orbital: OrbitalParams;
    captureThreshold?: number;  // km (default: 5000)
    timezone?: string;
    onTimeChange?: (date: Date) => void;
    onCapture?: (date: Date) => void;
}

export const SPEED_OPTIONS = [
    { value: 0.000011574, label: 'Realtime' },
    { value: 0.000694, label: '1 min/sec' },
    { value: 0.041667, label: '1 hr/sec' },
    { value: 0.125, label: '3 hr/sec' },
    { value: 0.25, label: '6 hr/sec' },
    { value: 0.5, label: '12 hr/sec' },
    { value: 1, label: '1 day/sec' },
    { value: 2, label: '2 days/sec' },
];

export const DEFAULT_CAPTURE_THRESHOLD = 5000;  // km
export const DEFAULT_PADDING_DAYS = 5;
export const DEFAULT_SPEED = 0.25;  // 6 hr/sec
