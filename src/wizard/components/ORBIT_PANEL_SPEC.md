# Orbit Visualization Panel - Component Specification

## Overview

A reusable component for the Mission Design Wizard that visualizes transfer orbit trajectories with real ephemeris data and playback controls matching the main Game mode.

## Architecture: Functional Core / Imperative Shell

```
┌─────────────────────────────────────────────────────────────────┐
│                      IMPERATIVE SHELL                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   UI Renderer   │  │  Event Handlers │  │  Animation     │  │
│  │   (Three.js)    │  │  (DOM Events)   │  │  Loop          │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    STATE MANAGER                          │  │
│  │   - Coordinates all state updates                         │  │
│  │   - Calls functional core for calculations                │  │
│  │   - Triggers UI updates                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FUNCTIONAL CORE                            │
│  (Pure functions - no side effects, no DOM, no Three.js)       │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ getMoonPosition │  │ getSpacecraft   │  │ checkCapture   │  │
│  │ AtDate(date)    │  │ Position(date,  │  │ Condition(     │  │
│  │ → {x,y,z} km    │  │ tliDate,params) │  │ craftPos,      │  │
│  │                 │  │ → {x,y,z,ν} km  │  │ moonPos,       │  │
│  └─────────────────┘  └─────────────────┘  │ threshold)     │  │
│                                            │ → boolean      │  │
│  ┌─────────────────┐  ┌─────────────────┐  └────────────────┘  │
│  │ calculateDistance│ │ getTrueAnomaly  │                      │
│  │ (pos1,pos2)     │  │ FromTime(t,a,e) │                      │
│  │ → km            │  │ → degrees       │                      │
│  └─────────────────┘  └─────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

## State Structure

```typescript
interface OrbitPanelState {
    // Timeline configuration (immutable after init)
    timeline: {
        startDate: Date;      // 5 days before TLI
        endDate: Date;        // 5 days after landing
        tliDate: Date;        // Trans-Lunar Injection
        loiDate: Date;        // Lunar Orbit Insertion (target)
        landingDate: Date;    // Landing date
        totalDays: number;    // Total timeline span
    };

    // Playback state (mutable)
    playback: {
        daysElapsed: number;  // Current position on timeline
        isPlaying: boolean;   // Animation running?
        speed: number;        // Days per second
        currentDate: Date;    // Derived: startDate + daysElapsed
    };

    // Orbital parameters (immutable after init)
    orbital: {
        inclination: number;  // degrees
        raan: number;         // degrees
        omega: number;        // degrees (argument of periapsis)
        perigeeAlt: number;   // km
        apogeeAlt: number;    // km
    };

    // Computed positions (updated each frame)
    positions: {
        moonKm: {x: number, y: number, z: number} | null;
        craftKm: {x: number, y: number, z: number} | null;
        craftTrueAnomaly: number;  // degrees
    };

    // Capture state
    capture: {
        isCaptured: boolean;
        captureDate: Date | null;
        threshold: number;    // km (default: 5000)
    };
}
```

## Functional Core - Pure Functions

### 1. Moon Position (reuse from optimization.ts)
```typescript
// Already exists in src/optimization.ts
export function calculateMoonPositionAtDate(date: Date): {x: number, y: number, z: number}
```

### 2. Spacecraft True Anomaly (reuse from optimization.ts)
```typescript
// Already exists in src/optimization.ts
export function getTrueAnomalyFromTime(
    timeSincePeriapsis: number,  // seconds
    perigeeAlt: number,          // km
    apogeeAlt: number            // km
): number  // degrees [0, 360)
```

### 3. Spacecraft Position (new pure function)
```typescript
export function calculateSpacecraftPosition(
    trueAnomaly: number,   // degrees
    orbital: OrbitalParams
): {x: number, y: number, z: number}  // km in Three.js coords
```

### 4. Distance Calculation (new pure function)
```typescript
export function calculateDistance(
    pos1: {x: number, y: number, z: number},
    pos2: {x: number, y: number, z: number}
): number  // km
```

### 5. Capture Check (new pure function)
```typescript
export function checkCaptureCondition(
    craftPos: {x: number, y: number, z: number},
    moonPos: {x: number, y: number, z: number},
    threshold: number
): boolean
```

### 6. Time Advancement (new pure function)
```typescript
export function advanceTime(
    currentDays: number,
    deltaTimeMs: number,
    speed: number,
    maxDays: number
): {daysElapsed: number, reachedEnd: boolean}
```

## UI Components

### Timeline Controls (matching Game mode)
```
┌─────────────────────────────────────────────────────────────────┐
│  Aug 5, 2023 14:30                              T+02:15:30     │
├─────────────────────────────────────────────────────────────────┤
│  [TLI]        [LOI]                              [Land]        │
│    ▼           ▼                                   ▼           │
│  ━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│       ↑ current position (draggable)                           │
│                                                                 │
│     Day -2.3                                        Day 12.5   │
├─────────────────────────────────────────────────────────────────┤
│              [▶ Play]  [↺ Reset]  [◄ 6 hr/sec ►]              │
└─────────────────────────────────────────────────────────────────┘
```

### Speed Options
```typescript
const SPEED_OPTIONS = [
    { value: 0.000011574, label: 'Realtime' },
    { value: 0.041667, label: '1 hr/sec' },
    { value: 0.125, label: '3 hr/sec' },
    { value: 0.25, label: '6 hr/sec' },      // Default
    { value: 0.5, label: '12 hr/sec' },
    { value: 1, label: '1 day/sec' },
    { value: 2, label: '2 days/sec' },
];
```

## Animation Loop Flow

```
requestAnimationFrame loop:
│
├── if (isPlaying):
│   │
│   ├── Calculate deltaTime since last frame
│   │
│   ├── advanceTime(daysElapsed, deltaTime, speed, maxDays)
│   │   └── Returns new daysElapsed (pure)
│   │
│   ├── currentDate = startDate + daysElapsed
│   │
│   ├── getMoonPositionAtDate(currentDate)
│   │   └── Returns moon {x,y,z} in km (pure)
│   │
│   ├── if (currentDate >= tliDate):
│   │   ├── timeSinceTLI = currentDate - tliDate
│   │   ├── trueAnomaly = getTrueAnomalyFromTime(timeSinceTLI, perigee, apogee)
│   │   └── craftPos = calculateSpacecraftPosition(trueAnomaly, orbital)
│   │
│   ├── if (!isCaptured):
│   │   ├── isCaptured = checkCaptureCondition(craftPos, moonPos, threshold)
│   │   └── if (isCaptured): showCaptureMessage()
│   │
│   └── updateUI(positions, daysElapsed, currentDate)
│
├── Update Three.js scene objects
│
└── renderer.render(scene, camera)
```

## Behavior Rules

### Pre-TLI (currentDate < tliDate)
- Spacecraft at perigee (true anomaly = 0°)
- Spacecraft visible but grayed out
- Moon moves with real ephemeris

### Post-TLI (currentDate >= tliDate)
- Spacecraft position calculated from elapsed time using Kepler's equation
- True anomaly increases as spacecraft traverses ellipse
- Moon continues with real ephemeris
- Distance to Moon checked each frame

### Capture Condition
- Triggered when: `distance(craft, moon) <= threshold`
- Default threshold: 5000 km
- On capture:
  - Show capture message toast
  - Hide spacecraft
  - Continue animation (don't pause)

### No Capture (spacecraft misses Moon)
- Spacecraft continues orbiting Earth
- Will return to perigee (true anomaly wraps to 0°)
- Continues indefinitely

## CSS Classes (wizard.css additions)

```css
/* Timeline panel at bottom of orbit visualization */
.orbit-timeline-panel { ... }

/* Current date and countdown display */
.orbit-date-display { ... }
.orbit-countdown { ... }

/* Timeline slider with event markers */
.orbit-slider-track { ... }
.orbit-event-marker { ... }
.orbit-event-marker.tli { ... }
.orbit-event-marker.loi { ... }
.orbit-event-marker.landing { ... }

/* Control buttons */
.orbit-controls-row { ... }
.orbit-play-btn { ... }
.orbit-reset-btn { ... }
.orbit-speed-select { ... }
.orbit-speed-btn { ... }

/* Capture message toast */
.orbit-capture-message { ... }
```

## API

```typescript
interface OrbitVisualizationPanelConfig {
    container: HTMLElement;
    timeline: {
        tliDate: Date;
        loiDate: Date;
        landingDate: Date;
        paddingDays?: number;  // default: 5
    };
    orbital: OrbitalParameters;
    captureThreshold?: number;  // default: 5000 km
    onTimeChange?: (date: Date) => void;
    onCapture?: (date: Date) => void;
}

class OrbitVisualizationPanel {
    constructor(config: OrbitVisualizationPanelConfig);

    // Update orbital parameters (e.g., when LOI selection changes)
    setOrbitalParams(params: Partial<OrbitalParameters>): void;

    // Update timeline (e.g., when LOI date changes)
    setTimeline(config: TimelineConfig): void;

    // Playback control
    play(): void;
    pause(): void;
    reset(): void;
    setSpeed(daysPerSecond: number): void;
    seekTo(daysElapsed: number): void;

    // Get current state
    getCurrentDate(): Date;
    getPositions(): {moon: Position3D, craft: Position3D};
    isCaptured(): boolean;

    // Cleanup
    dispose(): void;
}
```

## File Structure

```
src/wizard/components/
├── orbitVisualization/
│   ├── index.ts              # Re-exports
│   ├── OrbitVisualizationPanel.ts  # Main class (imperative shell)
│   ├── OrbitScene.ts         # Three.js scene setup
│   ├── TimelineControls.ts   # Timeline UI component
│   ├── orbitCore.ts          # Pure functions (functional core)
│   └── types.ts              # TypeScript interfaces
```

## Dependencies

- Reuse from `src/optimization.ts`:
  - `calculateMoonPositionAtDate()`
  - `getTrueAnomalyFromTime()`

- Reuse from `src/constants.ts`:
  - `EARTH_RADIUS`, `EARTH_MU`, `SCALE_FACTOR`
  - `COLORS`

- New pure functions to add to `src/optimization.ts` or new file
