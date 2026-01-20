# Chandrayaan-3 Orbit Visualization - Technical Specification

**Version:** 1.2
**Last Updated:** December 5, 2024
**Project Type:** Interactive 3D Orbit Visualization

---

## 1. Project Overview

The Chandrayaan-3 Orbit Visualization is an interactive web-based application that simulates and visualizes the orbital mechanics of India's Chandrayaan-3 lunar mission. The project uses a **unified landing page** that routes to **three specialized applications**:

1. **Landing Page** (`index.html`): Main entry point with three app cards for navigation
2. **Chandrayaan Mission Designer** (`wizard.html`): Guided multi-step workflow for backwards mission design (Featured app)
3. **Explorer** (`explorer.html`): Free-form orbital exploration with manual controls (Explore mode only)
4. **Legacy Designer** (`designer.html`): Timeline-based mission planning and playback (Plan + Game modes)

### 1.1 Purpose

**Chandrayaan Mission Designer** (wizard.html):
- Goal-oriented mission planning starting from landing site selection
- Demonstrates backwards design methodology (destination → orbital parameters)
- Calculates optimal Sun illumination windows for landing
- Determines required orbital geometry (RAAN) from landing constraints
- Featured app for new users

**Explorer** (explorer.html):
- Educational tool for understanding orbital mechanics
- Free-form experimentation with orbital parameters
- Manual Moon controls and orbital parameter adjustments
- No timeline or mission planning features

**Legacy Designer** (designer.html):
- Mission planning interface for defining launch parameters
- Visualization platform for playback of planned missions
- Interactive demonstration of Trans-Lunar Injection (TLI) and Lunar Orbit Insertion (LOI)
- Timeline-based mission design with real ephemeris

### 1.2 Core Technologies

- **Language:** TypeScript
- **3D Rendering:** Three.js
- **GUI Framework:** lil-gui
- **Lunar Ephemeris:** astronomy-engine
- **Build Tool:** Vite
- **Testing:** Vitest (unit tests), Playwright (E2E tests)
- **State Persistence (Wizard):** localStorage with versioning

---

## 2. Application Modes

The visualization apps (Explorer and Legacy Designer) implement three distinct modes with specific capabilities and constraints. These modes are now distributed across separate applications:

- **Explore Mode**: Implemented in Explorer app (`explorer.html`) only
- **Plan Mode**: Implemented in Legacy Designer app (`designer.html`)
- **Game Mode**: Implemented in Legacy Designer app (`designer.html`)

### 2.1 Explore Mode (Explorer App)

**Application:** `explorer.html`
**Purpose:** Free exploration and experimentation with orbital parameters

**Characteristics:**
- Manual control of all orbital parameters
- Moon position controlled manually ("Gamed" mode - simplified)
- No timeline constraints
- All parameters adjustable via GUI controls
- Uses separate parameter set (Set A) independent from launch events
- Circular lunar orbit approximation (no real ephemeris)

**Use Cases:**
- Learning orbital mechanics concepts
- Experimenting with different orbital configurations
- Understanding the relationship between orbital elements
- Educational demonstrations

### 2.2 Plan Mode (Legacy Designer App)

**Application:** `designer.html`
**Purpose:** Mission planning with realistic constraints and real lunar ephemeris

**Characteristics:**
- Real lunar ephemeris from astronomy-engine library
- Launch event creation and management
- Realistic parameter constraints matching actual mission requirements
- Three independent timeline sliders (View, Launch, Intercept)
- Save/delete launch events with draft state tracking
- Real-time parameter updates based on selected timeline
- Floating timeline overlay for TLI/LOI date editing

**Launch Parameter Constraints:**
- **Inclination:** 21.5° or 41.8° (dropdown selection)
- **Argument of Periapsis (ω):** 178°, 198°, or 203° (depends on inclination)
- **RAAN (Ω):** 0-360° (continuous)
- **Perigee Altitude:** 180-10,000 km
- **Apogee Altitude:** Adjustable (default: ~384,400 km - lunar distance)

**UI Features:**
- TLI/LOI timeline rows hidden by default
- Floating timeline overlay appears when clicking date inputs
- Blue color scheme for floating timeline
- Bidirectional sync between date picker and timeline slider
- Auto-hide on focus loss (ESC, click outside, blur)

### 2.3 Game Mode (Legacy Designer App)

**Application:** `designer.html`
**Purpose:** Playback and visualization of planned missions

**Characteristics:**
- Read-only mode with all controls disabled
- Real lunar ephemeris displays actual Moon position
- Timeline animation with playback controls
- Spacecraft visualized based on saved launch event
- Capture detection with toast notifications
- Pre-launch vs. post-launch visual states

**Visual States:**
- **Pre-launch:** Spacecraft appears grey
- **Post-launch:** Spacecraft appears white
- **Post-capture:** Spacecraft hidden, capture notification displayed

---

## 3. Coordinate System and Reference Frames

### 3.1 Celestial Coordinate System

The application uses the equatorial celestial coordinate system:

- **X-axis (Red):** Points toward First Point of Aries (♈︎, RA = 0°)
- **Y-axis (Green):** Points toward RA = 90° on equatorial plane
- **Z-axis (Blue):** Points toward North Celestial Pole

### 3.2 Three.js Coordinate Mapping

```
Celestial X = Three.js X
Celestial Y = Three.js -Z
Celestial Z = Three.js +Y
```

This mapping handles Three.js's Y-up convention while maintaining celestial coordinate semantics.

### 3.3 Reference Markers

- **Celestial Sphere:** Wireframe sphere representing the celestial background
- **Equator:** White great circle on celestial sphere
- **Aries Marker:** Symbol at X-axis tip indicating 0° RA

---

## 4. Visualization Elements

### 4.1 Lunar Orbit Visualization

**Components:**
- **Orbital Plane:** Magenta great circle
- **Orbital Path:** Dashed magenta ellipse showing actual orbit
- **Moon:** Grey sphere at computed position
- **Ascending Node:** Cyan marker
- **Descending Node:** Orange marker

**Orbital Parameters:**
- **Inclination:** 18.3° to 28.6° (varies over time based on real ephemeris)
- **Right Ascension:** Calculated from ephemeris in Plan/Game modes
- **Distance:** Real-time calculation of Moon's distance from Earth

**Mode-Specific Behavior:**
- **Explore Mode:** Simplified circular orbit, manual position control
- **Plan/Game Modes:** Real ephemeris data from astronomy-engine

### 4.2 Chandrayaan Orbit Visualization

**Components:**
- **Orbital Plane:** Yellow great circle
- **Orbital Path:** Gold dashed ellipse (highly eccentric)
- **Spacecraft:** White sphere (grey pre-launch in Game mode)
- **Ascending Node:** Light green marker
- **Descending Node:** Pink marker

**Default Parameters:**
- **Perigee:** 180 km altitude (adjustable)
- **Apogee:** 384,400 km (lunar distance, adjustable)
- **Inclination:** 30° default (21.5° or 41.8° in Plan mode)
- **RAAN (Ω):** 5° default (0-360°)
- **Argument of Periapsis (ω):** 45° default (178°, 198°, 203° in Plan mode)

**Calculations:**
- True anomaly computed via Kepler's equation
- Position calculated using elliptical orbit equation: `r(θ) = a(1-e²)/(1+e*cos(θ))`
- Proper rotation sequence: ω → i → Ω

### 4.3 Angle Visualizations

#### RAAN Angle (Ω)
- **Visualization:** Pie sector in equatorial plane
- **Arc:** Connecting arc between 0° RA and ascending node
- **Label:** Sprite-based text showing angle value
- **Toggle:** Checkbox control for visibility

#### Argument of Periapsis (ω)
- **Visualization:** Pie sector in orbital plane
- **Arc:** Arc from ascending node to periapsis
- **Label:** Sprite-based text showing angle value
- **Toggle:** Checkbox control for visibility

**Rendering Properties:**
- Transparent materials for proper depth sorting
- Zoom-aware label scaling
- Color-coded for distinction from orbit elements

### 4.4 Markers and Labels

**Marker Types:**
- Aries symbol (♈︎) at X-axis tip
- Node markers (spheres) at orbit intersections
- Periapsis/Apoapsis markers (implicit in orbit path)

**Zoom-Aware Scaling:**
- **Base Distance:** 240 units
- **Aries Marker:** 0.2x-0.8x scale range
- **Node Markers:** 0.3x-1.5x scale range
- **Spacecraft:** 0.5x-2.0x scale range

Scale factor based on camera distance to maintain visual consistency.

---

## 5. Timeline System

### 5.1 Time Window

- **Range:** 90-day period starting July 1, 2023
- **Start Date:** Configurable via date/time picker
- **Current Date Display:** Real-time display with formatting
- **Countdown Timer:** T-minus/T-plus display relative to launch event

### 5.2 Timeline Sliders

**Three Independent Timelines:**

1. **View Timeline**
   - General timeline navigation
   - Default active timeline in all modes
   - Controls what date is being visualized
   - Always visible

2. **Launch Timeline (TLI)**
   - Sets launch date for spacecraft
   - Updates when dragged
   - White vertical marker line
   - Hidden in Plan mode (accessible via floating timeline)

3. **Intercept Timeline (LOI)**
   - Sets Moon intercept date
   - Draggable marker
   - Hidden in Plan mode (accessible via floating timeline)

**Selection Mechanism:**
- Radio-button style checkboxes
- Only one timeline can be "active" at a time
- Active timeline controls the render date
- Timeline markers always visible regardless of active state

### 5.3 Floating Timeline Overlay (Plan Mode)

**Trigger:** Clicking/focusing on TLI or LOI date input fields in Plan mode

**Appearance:**
- Overlays on top of main timeline
- Same size as main timeline
- Blue color scheme (distinct from main timeline)
- Main timeline becomes inactive (dimmed, pointer-events disabled)

**Behavior:**
- Shows appropriate label ("TLI Date" or "LOI Date")
- Syncs bidirectionally with date picker input
- Updates visualization in real-time when dragged
- Close button (×) in header
- ESC key closes overlay
- Click outside closes overlay
- Blur event with smart timeout (allows slider interaction)

**Auto-Hide Logic:**
- 100ms timeout after blur to allow slider clicks
- Checks if mouse is hovering over overlay
- Checks if slider is being actively dragged
- Only hides if neither condition is true

### 5.4 Playback Controls

**Controls:**
- **Play/Pause:** Toggle animation state
- **Reset:** Return to start of timeline
- **Speed Up/Down:** Increment/decrement speed with visual feedback
- **Speed Selector:** Dropdown with 11 preset speeds

**Speed Presets:**
- 5 days/second (fastest)
- 2 days/second
- 1 day/second
- 12 hours/second
- 6 hours/second
- 3 hours/second
- 1 hour/second
- 30 minutes/second
- 10 minutes/second
- 1 minute/second
- Realtime (1 second/second)

**Animation Behavior:**
- Continuous loop or stop at end (configurable)
- Smooth interpolation between frames
- Frame-based caching for performance
- Capture detection during playback (Game mode)

---

## 6. User Interface Controls

### 6.1 Mode Selector

**Location:** Top-right corner

**Style:** Tab-based selector

**Tabs:**
- Explore
- Plan
- Game

**Behavior:**
- Click to switch modes
- Visual feedback for active mode
- Mode change affects control availability and behavior

### 6.2 Visibility Toggles

**Checkbox Controls for:**

**Celestial Elements:**
- Equator (white great circle)
- Axes (X, Y, Z coordinate axes)
- Aries marker (♈︎ symbol)

**Lunar Elements:**
- Lunar orbit plane (magenta)
- Lunar orbit path (ellipse)
- Lunar nodes (ascending/descending)
- Moon (grey sphere)

**Chandrayaan Elements:**
- Chandrayaan orbit plane (yellow)
- Chandrayaan orbit path (ellipse)
- Chandrayaan nodes (ascending/descending)
- Chandrayaan spacecraft (white/grey sphere)

**Angle Visualizations:**
- RAAN angle visualization
- AOP angle visualization

### 6.3 GUI Parameters (lil-gui)

**Organization:** Folder-based hierarchy

**Context-Sensitive Behavior:**
- Some controls disabled in Game mode
- Different constraints in Plan vs. Explore modes
- Real-time updates to visualization

#### Lunar Parameters

**Explore Mode:**
- Inclination: 18.3-28.6° (slider)
- RAAN: 0-360° (slider)
- Moon Right Ascension (read-only display)

**Plan/Game Modes:**
- All parameters computed from real ephemeris
- Read-only displays only

#### Chandrayaan Parameters

**Adjustable Parameters:**
- Inclination (Explore: slider, Plan: dropdown 21.5°/41.8°)
- RAAN (Ω): 0-360° (slider)
- Argument of Periapsis (ω) (Explore: slider, Plan: dropdown)
- Perigee altitude: 180-10,000 km (slider)
- Apogee altitude (slider)

**Computed/Read-Only:**
- True Anomaly (calculated from time since periapsis)
- Orbital Period (calculated from semi-major axis)
- Craft Right Ascension (calculated from position)

#### Distance Displays (Read-Only)

- Moon distance from Earth (center-to-center, km)
- Craft distance from Earth (center-to-center, km)
- Craft distance to Moon (center-to-center, km)

### 6.4 Legend Panel

**Features:**
- Collapsible panel (click header to toggle)
- Color-coded legend items
- Persistent across mode changes

**Legend Items:**
- Coordinate axes (X, Y, Z with colors)
- Equator (white)
- Lunar orbit elements (magenta/cyan/orange)
- Chandrayaan orbit elements (yellow/gold/green/pink)
- Angle visualizations (RAAN, AOP)

---

## 7. Launch Event Management

### 7.1 Actions Panel (Plan Mode)

**Location:** Right panel in Plan mode

**Components:**
- "Add Launch" button to create new launch event
- Launch Event Card (appears when event created)

### 7.2 Launch Event Parameters

**Date/Time Parameters:**
- Launch Date/Time (TLI - Trans-Lunar Injection)
- Moon Intercept Date/Time (LOI - Lunar Orbit Insertion)
- Sync checkbox (auto-compute TLI from LOI minus half orbital period)

**Orbital Parameters:**
- Inclination: Dropdown (21.5° or 41.8°)
- RAAN (Ω): Slider (0-360°)
- Argument of Periapsis (ω): Dropdown (178°, 198°, or 203°)
  - Options depend on selected inclination
- Perigee altitude: Slider (180-10,000 km)
- Apogee altitude: Slider (adjustable)

**Mission Parameters:**
- Capture distance threshold: 50-400,000 km (default: 5,000 km)
  - Distance at which spacecraft is considered "captured" by Moon

### 7.3 Default Launch Event Values

```
Launch Date: July 30, 2023 at 9:36 PM
Intercept Date: August 5, 2023 at 4:56 PM
Inclination: 30°
RAAN: 5°
Omega (ω): 45°
Perigee: 180 km
Apogee: 370,000 km
Capture Threshold: 5,000 km
```

### 7.4 Launch Event Actions

**Save Button:**
- Commits draft changes
- Validates parameters
- Updates launch event state
- Enables Game mode playback

**Delete Button:**
- Confirmation dialog before deletion
- Removes launch event
- Clears draft state
- Disables Game mode

**Draft State Tracking:**
- Prevents accidental loss of unsaved changes
- Visual indicator for unsaved changes
- Prompts before mode switch with unsaved changes

### 7.5 TLI/LOI Sync Logic

**Sync Checkbox Behavior:**
- When enabled: TLI auto-computes from LOI
- Calculation: `TLI = LOI - (orbital_period / 2)`
- Updates TLI date/time in real-time as LOI changes
- Uses setter function: `setLaunchEventDate()` for proper event emission
- Ensures GUI updates via event bus

---

## 8. Physics & Orbital Mechanics

### 8.1 Orbital Calculations

**Elliptical Orbit Equation:**
```
r(θ) = a(1-e²) / (1 + e*cos(θ))
```

Where:
- `r(θ)`: Distance from Earth at true anomaly θ
- `a`: Semi-major axis
- `e`: Eccentricity
- `θ`: True anomaly

**Kepler's Equation:**
```
M = E - e*sin(E)
θ = 2*arctan(√((1+e)/(1-e)) * tan(E/2))
```

Where:
- `M`: Mean anomaly
- `E`: Eccentric anomaly
- `θ`: True anomaly
- `e`: Eccentricity

**Solver Algorithm:**
- Newton-Raphson iteration for eccentric anomaly
- Optimized to ~70% fewer iterations than standard implementation
- Convergence threshold: 1e-6 radians

**Orbital Period:**
```
T = 2π * √(a³/μ)
```

Where:
- `T`: Orbital period (seconds)
- `a`: Semi-major axis (km)
- `μ`: Earth's gravitational parameter (398600.4418 km³/s²)

### 8.2 Coordinate Transformations

**Rotation Sequence for Orbital Elements:**
1. Apply Argument of Periapsis (ω) - rotation in orbital plane
2. Apply Inclination (i) - tilt orbital plane
3. Apply RAAN (Ω) - rotate ascending node position

**Matrix Application:**
- Uses Three.js rotation matrices
- Applied in order: `rotateZ(ω)` → `rotateX(i)` → `rotateZ(Ω)`
- Transforms from perifocal frame to celestial frame

### 8.3 Great Circle Rendering

**Plane Representation:**
- Equatorial plane: White circle at sphere radius
- Lunar orbital plane: Magenta circle
- Chandrayaan orbital plane: Yellow circle

**Implementation:**
- 512 segments for smooth circles
- Proper scaling to celestial sphere radius
- Rotation matrices applied for inclined planes

### 8.4 Node Calculations

**Ascending Node:**
- Intersection where orbit crosses equator from south to north
- Calculated from orbital plane normal and equatorial plane normal
- RAAN (Ω) defines the angle from Aries to ascending node

**Descending Node:**
- Intersection where orbit crosses equator from north to south
- 180° opposite to ascending node
- Position: Ascending node + π radians in orbital plane

**Visualization:**
- Spheres placed at intersection points
- Color-coded: Cyan (ascending), Orange (descending)
- Zoom-aware scaling for visibility

---

## 9. Real Lunar Ephemeris

### 9.1 astronomy-engine Integration

**Function Used:** `GeoMoonState(date)`

**Returns:**
- Position vector (x, y, z) in km
- Velocity vector (vx, vy, vz) in km/s

**Coordinate System:**
- Equatorial coordinate system
- J2000 epoch reference frame
- Proper coordinate transformations applied

### 9.2 Osculating Orbital Elements

**Calculated from State Vectors:**
- Semi-major axis (a)
- Eccentricity (e)
- Inclination (i)
- RAAN (Ω)
- Argument of Periapsis (ω)
- True Anomaly (θ)

**Derivation:**
- Angular momentum vector: `h = r × v`
- Node vector: `n = k × h`
- Eccentricity vector: `e_vec = (v × h)/μ - r/|r|`

### 9.3 Real-Time Updates

**Update Frequency:**
- Every frame during animation playback
- On timeline slider changes
- When switching between timelines

**Performance Considerations:**
- Ephemeris calculations cached per frame
- Cache invalidation on date change
- Minimal computational overhead

### 9.4 Ephemeris Data Display

**Read-Only Displays:**
- Moon Right Ascension (RA in degrees)
- Moon Declination (Dec in degrees)
- Moon distance from Earth (km)
- Lunar orbital inclination (degrees)
- RAAN of lunar orbit (degrees)

---

## 10. Capture Detection System

### 10.1 Capture Logic (Game Mode)

**Detection Method:**
- Monitors distance between spacecraft center and Moon center
- Triggers when: `distance ≤ capture_threshold`
- Continuous monitoring during timeline playback

**Threshold Configuration:**
- Configurable in launch event parameters
- Range: 50-400,000 km
- Default: 5,000 km
- Represents proximity required for successful intercept

### 10.2 Capture Visualization

**Toast Notification:**
- Appears at top-right corner
- Message: "Spacecraft captured by Moon!"
- Auto-dismisses after delay
- Visual feedback for successful mission

**Spacecraft State Changes:**
- **Before Capture:** Spacecraft visible, moving along orbit
- **After Capture:** Spacecraft hidden from view
- **Timeline Scrubbing:** Capture state resets when timeline moves before capture time

### 10.3 Capture State Management

**State Tracking:**
- `captureDetected`: Boolean flag
- `captureTime`: Date/Time of capture event
- Reset logic when timeline position < capture time

**Event Emission:**
- Capture event emitted to event bus
- Triggers UI updates (toast notification)
- Updates spacecraft visibility

---

## 11. Performance Optimizations

### 11.1 Caching System

**Frame-Based Caching:**
- Orbital calculations cached per frame
- Reduces 3 function calls → 1 per frame
- Cache key based on current parameters

**Cache Invalidation:**
- Triggered when orbital parameters change
- Triggered when switching launch events
- Triggered when timeline date changes

**Function:** `invalidateOrbitalParamsCache()`
- Clears cached orbital calculations
- Forces recalculation on next frame

### 11.2 Conditional Updates

**Orbital Period:**
- Only recalculated when perigee or apogee changes
- Cached value reused when parameters unchanged

**GUI Controller Updates:**
- `updateDisplay()` called only when values change
- Prevents unnecessary DOM manipulations

**Event Throttling:**
- Timeline slider events throttled during drag
- Prevents excessive calculations during rapid changes

### 11.3 Kepler Solver Optimization

**Improvements:**
- Reduced iterations by ~70% compared to naive implementation
- Better initial guess for eccentric anomaly
- Optimized convergence criteria

**Algorithm:**
- Newton-Raphson with improved starting value
- Early termination when convergence achieved
- Handles edge cases (circular orbits, parabolic orbits)

### 11.4 Rendering Optimizations

**Geometry Updates:**
- Ellipse paths use 512 segments (balance between smoothness and performance)
- Marker geometries reused where possible
- Sprite textures cached

**Depth Sorting:**
- Proper render order for transparent materials
- Angle visualizations rendered with correct depth sorting
- No unnecessary Z-fighting

**Zoom-Aware Scaling:**
- Markers scale based on camera distance
- Prevents markers from becoming too small or too large
- Maintains visual consistency across zoom levels

---

## 12. Mission Design Wizard (Separate Application)

The Mission Design Wizard is a standalone application (`wizard.html`) that implements a **backwards mission design methodology**.

### 12.1 Design Philosophy

**Backwards vs. Forward Design:**

Traditional approach (Main App):
- Adjust orbital parameters → See if trajectory reaches Moon

Wizard approach:
- Choose landing site → Find when Sun is optimal → Calculate required orbital parameters

**Educational Value:**
- Teaches **why** specific orbital parameters are chosen
- Demonstrates real mission planning constraints
- Shows relationship between landing requirements and orbital geometry

### 12.2 Four-Step Workflow

#### Step 1: Landing Site Selection

**Features:**
- Interactive 3D Moon globe using Three.js
- Pre-defined landing sites (JSON data)
- Site markers on Moon surface
- Displays site coordinates (selenographic latitude/longitude)

**Available Sites:**
- Shackleton Crater (South Pole)
- Malapert Massif
- Apollo 17 landing site
- Other historical/proposed sites

**Component:** `LandingSiteStep.ts`, `MoonGlobeView.ts`, `SiteMarkers.ts`

#### Step 2: Landing Window Selection

**Sun Elevation Calculation:**
- Computes Sun elevation angle at landing site over time
- Uses astronomy-engine for accurate Sun/Moon positions
- Accounts for lunar libration effects
- Time step: 1 hour intervals (configurable)

**Landing Window Criteria:**
- Sun elevation: 6° to 9° above horizon
- Provides adequate illumination without excessive heat
- Avoids thermal extremes for spacecraft/instruments

**Algorithm:** `src/wizard/calculations/sunElevation.ts`

**Output:**
- List of viable landing windows with start/end times
- Visual chart showing Sun elevation over time
- Allows user to select preferred window

**Component:** `LandingWindowStep.ts`, `SunIlluminationPanel.ts`

#### Step 3: Mission Window Selection

**Purpose:** Connect landing window to launch planning timeline

**Features:**
- Select mission start date
- Validate compatibility with landing window
- Consider transfer time from Earth to Moon
- Account for orbital mechanics constraints

**Component:** `MissionWindowStep.ts`

#### Step 4: LOI Date Optimization

**Calculations:**

1. **Required RAAN Calculation:**
   - Determines spacecraft orbital plane orientation needed
   - Based on Moon's RA at landing time
   - Formula: `Required RAAN = Moon RA at landing - offset`
   - Offset depends on landing site longitude and Moon libration

2. **Optimal LOI Date Finding:**
   - Works backwards from landing date
   - Finds dates when spacecraft RAAN aligns properly
   - Uses Moon equator crossing detection
   - Minimizes apogee-to-Moon distance

3. **Trajectory Visualization:**
   - Full 3D orbit visualization
   - Timeline showing key mission events
   - Interactive controls for exploring trajectory

**Algorithm:** `findOptimalLOIDates()` in `src/optimization.ts`

**Components:**
- `LOIDateStep.ts`
- `OrbitVisualizationPanel.ts`
- `OrbitScene.ts`
- `orbitCore.ts`
- `TimelineControls.ts`

**Display:**
- Calculated LOI date
- Required RAAN value
- Orbital parameters (inclination, ω, perigee, apogee)
- Visual confirmation of Moon encounter

### 12.3 State Management

**WizardState Interface:**
```typescript
interface WizardState {
  stateVersion: number;
  currentStepIndex: number;
  lastSavedAt: Date;
  landingSite?: {
    name: string;
    latitude: number;
    longitude: number;
  };
  landingWindow?: {
    startDate: Date;
    endDate: Date;
    sunElevation: { min: number; max: number; };
  };
  missionWindow?: {
    startDate: Date;
    endDate: Date;
  };
  loiDate?: Date;
  requiredRAAN?: number;
  orbitalParameters?: {
    inclination: number;
    raan: number;
    omega: number;
    perigeeAlt: number;
    apogeeAlt: number;
  };
}
```

### 12.4 State Persistence

**localStorage Implementation:**

**Storage Key:** `cy3-orbit:wizard-state`

**Features:**
- Automatic save after each step completion
- Resume dialog on app restart
- 30-day auto-expiration
- Version-aware state migration

**State Versioning:**
- `stateVersion` field for schema changes
- Migration function for backwards compatibility
- Handles breaking changes gracefully

**Example:**
```typescript
// Save
localStorage.setItem('cy3-orbit:wizard-state', JSON.stringify(wizardState));

// Load with validation
const savedState = JSON.parse(localStorage.getItem('cy3-orbit:wizard-state'));
if (savedState.stateVersion !== CURRENT_VERSION) {
  migrateState(savedState);
}
```

### 12.5 Sun Elevation Algorithm

**Purpose:** Calculate Sun elevation angle at landing site over time

**Steps:**
1. Calculate Moon's orientation (libration) at given time
2. Calculate Sun's position relative to Moon
3. Transform to landing site local frame
4. Calculate elevation angle from local horizon

**Landing Window Detection:**
- Scan time range in hourly steps
- Identify continuous periods where 6° ≤ elevation ≤ 9°
- Group into discrete landing windows
- Return window start/end times

**Key Functions:**
- `calculateSunElevationAtSite(site, date)`
- `findLandingWindows(site, startDate, endDate)`
- `calculateRequiredRAAN(landingTime, site)`

### 12.6 Orbital Optimization Algorithms

**Moon Equator Crossing Detection:**

**Function:** `findMoonEquatorCrossings(craftPos, moonPos, orbitParams)`

**Algorithm:**
1. Sample spacecraft position at regular intervals
2. Calculate position relative to Moon
3. Detect Z-coordinate sign changes (equator crossings)
4. Refine using bisection method
5. Classify as ascending/descending

**Optimal LOI Date Finding:**

**Function:** `findOptimalLOIDates(requiredRAAN, landingDate)`

**Strategy:**
1. Work backwards from landing date: `LOI = landing - transfer_time`
2. Calculate Moon RA at landing time
3. Find dates when spacecraft RAAN matches required value
4. Verify equator crossing at apogee
5. Optimize for minimum distance to Moon

### 12.7 Integration with Main Application

**Current Status:** **Standalone proof-of-concept**

**Why Separate?**
- Different educational philosophy
- Different state management needs (persistent vs. ephemeral)
- Different workflows (linear vs. free-form)
- Independent development and testing

**Future Integration Plans:**
- Export wizard results to Plan mode
- Populate LaunchEvent from WizardState
- "Import from Wizard" button in Plan mode
- Unified state format for interoperability

### 12.8 Wizard Testing

**Unit Tests:**
- Sun elevation calculation accuracy
- RAAN calculation from landing geometry
- Landing window detection logic
- State serialization/deserialization

**E2E Tests:**
- Complete 4-step workflow
- Step navigation and validation
- State persistence across page reloads
- Resume functionality

**Test Files:**
- `tests/unit/sunElevation.test.ts`
- `tests/e2e/e2e-wizard-demo.test.ts`

### 12.9 Wizard vs. Main App Comparison

| Aspect | Main App | Wizard |
|--------|----------|--------|
| **Entry Point** | `index.html` | `wizard.html` |
| **Approach** | Forward simulation | Backwards design |
| **Workflow** | Free-form exploration | Linear 4-step process |
| **State** | Ephemeral (no persistence) | Persistent (localStorage) |
| **Education Focus** | Orbital geometry | Mission planning methodology |
| **Architecture** | Event bus | State machine |
| **Status** | Production | Proof-of-concept |

### 12.10 Wizard Documentation

**See Also:**
- **Mission Design Wizard Specification:** `docs/specs/mission-design-wizard-spec.md`
- **Wizard Architecture:** `docs/ARCHITECTURE.md#mission-design-wizard-architecture`
- **Wizard Testing:** `docs/TESTING.md#mission-design-wizard-testing`

---

## 13. Code Architecture

### 13.1 File Structure

```
cy3-orbit/
├── index.html              # Main HTML structure
├── src/
│   ├── main.ts             # Core visualization logic
│   ├── style.css           # Application styles
│   ├── events.ts           # Event bus implementation
│   ├── optimization.ts     # Optimization algorithms
│   ├── launchEventSetters.ts  # Launch event update functions
│   └── types/
│       ├── astronomy-engine.d.ts  # Astronomy engine type declarations
│       └── lil-gui.d.ts           # lil-gui type declarations
├── tests/
│   ├── unit/               # Unit tests (Vitest)
│   └── e2e/                # E2E tests (Playwright)
├── docs/
│   └── specs/              # Technical specifications
├── .pre-commit-config.yaml # Pre-commit hooks configuration
├── eslint.config.js        # ESLint configuration
├── playwright.config.ts    # Playwright configuration
└── tsconfig.json           # TypeScript configuration
```

### 12.2 Event-Driven Architecture

**Event Bus:**
- Central event system for state coordination
- Decoupled components
- Type-safe event emission and subscription

**Event Types:**
- `launchEvent:date` - Launch date changed
- `launchEvent:moonInterceptDate` - Intercept date changed
- `launchEvent:inclination` - Inclination changed
- `launchEvent:raan` - RAAN changed
- `launchEvent:omega` - Argument of periapsis changed
- `launchEvent:perigee` - Perigee altitude changed
- `launchEvent:apogee` - Apogee altitude changed
- `params:*` - Parameter changes in Explore mode

**Event Flow:**
```
User Input → Setter Function → Event Emission → Event Handlers → UI Update
```

### 12.3 Key Interfaces

**LaunchEvent:**
```typescript
interface LaunchEvent {
  exists: boolean;
  date: Date;
  moonInterceptDate: Date;
  inclination: number;
  raan: number;
  omega: number;
  perigee: number;
  apogee: number;
  captureThreshold: number;
  isDraft: boolean;
}
```

**OrbitalParams:**
```typescript
interface OrbitalParams {
  inclination: number;
  raan: number;
  omega: number;
  perigee: number;
  apogee: number;
  trueAnomaly: number;
  period: number;
}
```

**TimelineState:**
```typescript
interface TimelineState {
  startDate: Date;
  currentDate: Date;
  isPlaying: boolean;
  speed: number;
}
```

**RenderControl:**
```typescript
interface RenderControl {
  activeTimeline: 'view' | 'launch' | 'intercept';
  renderDate: Date;
}
```

### 12.4 Setter Functions Pattern

**Purpose:** Encapsulate state updates and ensure event emission

**Example:**
```typescript
function setLaunchEventDate(event: LaunchEvent, date: Date): void {
  event.date = date;
  eventBus.emit('launchEvent:date', date);

  if (syncTLIWithLOI) {
    // Compute TLI from LOI
    const tliDate = new Date(event.moonInterceptDate.getTime() - period/2);
    event.date = tliDate;
  }

  updateVisualization();
}
```

**Benefits:**
- Consistent state updates
- Automatic event emission
- Centralized side-effect management
- Type safety

### 12.5 UI Dialog System

**Functions:**
- `showConfirmDialog(message, onConfirm, onCancel)` - Yes/No dialogs
- `showAlert(message, onOk)` - Alert dialogs

**Implementation:**
- Modal overlay with backdrop
- Custom styling
- Promise-based for async/await usage
- Accessible (keyboard support)

**Usage Example:**
```typescript
const confirmed = await showConfirmDialog(
  "Delete this launch event?",
  () => deleteLaunchEvent(),
  () => { /* cancelled */ }
);
```

---

## 14. Testing Strategy

### 14.1 Unit Tests (Vitest)

**Coverage:** 28+ tests

**Test Categories:**
- Orbital calculation functions
- Coordinate transformations
- Kepler solver accuracy
- Event bus functionality
- Setter function behavior

**Example Tests:**
- `computeOrbitalParams()` returns correct values
- `keplerSolver()` converges to correct eccentric anomaly
- Event emission triggers handlers
- Cache invalidation works correctly

### 14.2 End-to-End Tests (Playwright)

**Coverage:** 108+ tests

**Test Categories:**

1. **Mode Transitions** (`e2e-modes.test.ts`)
   - Switching between Explore/Plan/Game modes
   - Control availability in each mode
   - State persistence across mode switches

2. **Feature Tests** (`e2e-features.test.ts`)
   - Launch event creation/editing/deletion
   - Timeline slider interactions
   - Playback controls
   - Capture detection
   - Parameter updates

3. **Error Handling** (`e2e-error-handling.test.ts`)
   - Invalid parameter validation
   - Draft state warnings
   - Missing launch event handling
   - Boundary condition testing

### 14.3 Test Configuration

**Single Playwright Config with Projects** (`playwright.config.ts`):

| Project | Pattern | Tests | Time | Use Case |
|---------|---------|-------|------|----------|
| `default` | `e2e-.+.test.ts` | All | ~5m | Comprehensive |
| `fast` | `e2e-(simple\|exact\|behaviors\|workflow\|modes).test.ts` | 33 | ~2m | CI, pre-commit |
| `slow` | `e2e-.+.test.ts` | 49 | ~5m | Releases |

### 14.4 npm Test Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test --project=default",
  "test:e2e:fast": "playwright test --project=fast",
  "test:e2e:slow": "playwright test --project=slow",
  "test:ci": "npm test && npm run test:e2e:fast",
  "test:release": "npm test && npm run test:e2e:slow"
}
```

---

## 15. Code Quality & Linting

### 15.1 ESLint Configuration

The project uses ESLint with TypeScript support for static code analysis.

**Configuration File:** `eslint.config.js`

**Key Rules:**
- TypeScript recommended rules via `typescript-eslint`
- Complexity limit: Maximum cyclomatic complexity of 10 (enforced)
- Unused variables allowed with `_` prefix
- No explicit `any` warnings (not errors)

**Complexity Grading:**
| Grade | Complexity | Status |
|-------|------------|--------|
| A     | 1-5        | Allowed |
| B     | 6-10       | Allowed |
| C     | 11-15      | **Rejected** |
| D-F   | 16+        | **Rejected** |

### 15.2 Pre-commit Hooks

Pre-commit hooks ensure code quality before commits using the `pre-commit` framework.

**Configuration File:** `.pre-commit-config.yaml`

**Hooks:**
1. **trailing-whitespace** - Remove trailing whitespace
2. **end-of-file-fixer** - Ensure files end with newline
3. **check-yaml** - Validate YAML syntax
4. **check-json** - Validate JSON syntax (excludes tsconfig.json which uses JSONC)
5. **check-added-large-files** - Prevent large file commits
6. **ESLint** - Run ESLint on TypeScript/JavaScript files
7. **TypeScript compilation** - Verify `tsc --noEmit` passes
8. **Complexity check** - Reject functions with complexity > 10

**Running Hooks:**
```bash
pre-commit run --all-files  # Run all hooks
pre-commit run eslint       # Run specific hook
```

### 15.3 Code Organization Principles

**Complexity Reduction Strategies:**
- Extract helper functions for repeated logic
- Use early returns to reduce nesting
- Split large functions into smaller, focused functions
- Move validation logic to dedicated functions

**Helper Function Naming:**
- `update*` - Functions that update state/UI
- `calculate*` - Pure functions for computations
- `setup*` - Initialization functions
- `is*` / `has*` - Boolean predicates

---

## 16. Configuration & Constants

### 16.1 Physical Constants

```typescript
const EARTH_RADIUS = 6371; // km
const MOON_RADIUS = 1737; // km
const EARTH_MU = 398600.4418; // km³/s² (gravitational parameter)
const SPHERE_RADIUS = 100; // Celestial sphere radius (arbitrary units)
```

### 16.2 Rendering Constants

```typescript
const ORBIT_SEGMENTS = 512; // Ellipse path smoothness
const SPRITE_CANVAS_SIZE = 128; // Sprite texture resolution
const SPRITE_FONT_SIZE = 80; // Font size for angle labels

// Camera configuration
const CAMERA_FOV = 45; // degrees
const CAMERA_POSITION = { x: 240, y: 160, z: 240 };
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 10000;

// Zoom scaling
const BASE_CAMERA_DISTANCE = 240;
const ARIES_MARKER_SCALE_RANGE = { min: 0.2, max: 0.8 };
const NODE_MARKER_SCALE_RANGE = { min: 0.3, max: 1.5 };
const SPACECRAFT_SCALE_RANGE = { min: 0.5, max: 2.0 };
```

### 16.3 Default Mission Parameters

```typescript
const DEFAULT_LAUNCH_EVENT = {
  launchDate: new Date("2023-07-30T21:36:00"),
  moonInterceptDate: new Date("2023-08-05T16:56:00"),
  inclination: 30, // degrees
  raan: 5, // degrees
  omega: 45, // degrees
  perigee: 180, // km
  apogee: 370000, // km
  captureThreshold: 5000 // km
};

const TIMELINE_START_DATE = new Date("2023-07-01T00:00:00");
const TIMELINE_DURATION_DAYS = 90;
```

### 16.4 GUI Configuration

```typescript
// lil-gui settings
const GUI_WIDTH = 300; // pixels
const GUI_CLOSED_BY_DEFAULT = false;

// Timeline
const TIMELINE_PLAYBACK_SPEEDS = [
  5 * 86400,      // 5 days/sec
  2 * 86400,      // 2 days/sec
  1 * 86400,      // 1 day/sec
  43200,          // 12 hours/sec
  21600,          // 6 hours/sec
  10800,          // 3 hours/sec
  3600,           // 1 hour/sec
  1800,           // 30 min/sec
  600,            // 10 min/sec
  60,             // 1 min/sec
  1               // Realtime
];
```

---

## 17. Browser Compatibility

### 17.1 Supported Browsers

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+

**Required Features:**
- WebGL 1.0
- ES6 modules
- CSS Grid
- Flexbox
- Date input type
- Range input type

### 17.2 Responsive Design

**Viewport Handling:**
- Canvas fills available viewport
- Responsive GUI panels
- Mobile-friendly controls
- Touch event support for timeline sliders

**Breakpoints:**
- Desktop: Full GUI + legend
- Tablet: Collapsible panels
- Mobile: Stacked layout

---

## 18. Deployment

### 18.1 Build Process

**Development:**
```bash
npm run dev    # Start Vite dev server (port 5173)
```

**Production Build:**
```bash
npm run build  # TypeScript compilation + Vite build
```

**Output:**
- `dist/` folder with optimized static files
- Minified JavaScript
- Optimized assets

### 18.2 GitHub Actions Workflow

**CI Pipeline:**
1. Checkout code
2. Install dependencies
3. Run TypeScript compilation
4. Run unit tests
5. Run fast E2E tests
6. Build production bundle

**Release Workflow:**
1. All CI steps
2. Run full E2E test suite
3. Generate coverage report
4. Deploy to GitHub Pages

### 18.3 GitHub Pages Deployment

**Configuration:**
- Branch: `gh-pages`
- Base path: `/cy3-orbit/`
- Asset paths configured in `vite.config.ts`

**URL:** `https://<username>.github.io/cy3-orbit/`

---

## 19. Future Enhancements (Not Implemented)

The following features were discussed but not implemented in the current version:

- Multi-start optimization algorithm (simplified or removed)
- Advanced auto-optimization features
- Additional orbital maneuvers (mid-course corrections)
- Real-time telemetry data integration
- Multi-mission comparison view
- Export/import launch event configurations
- Downloadable mission reports
- VR/AR support for immersive visualization

---

## 20. Known Limitations

1. **Simplified Physics:**
   - No perturbations (Earth oblateness, solar gravity, etc.)
   - No atmospheric drag
   - No thrust/propulsion modeling
   - Point-mass gravity model

2. **Performance:**
   - Large timeline scrubbing may lag on low-end devices
   - Real-time ephemeris calculations add computational overhead
   - Many simultaneous visualizations (all toggles on) may reduce FPS

3. **Accuracy:**
   - Simplified orbital mechanics (two-body problem)
   - No relativistic effects
   - Lunar ephemeris limited to astronomy-engine precision

4. **UI/UX:**
   - No undo/redo for parameter changes
   - Limited mobile touch gesture support
   - No keyboard shortcuts for common actions

---

## 21. License and Attribution

**Project License:** [Specify license]

**Third-Party Libraries:**
- Three.js - MIT License
- lil-gui - MIT License
- astronomy-engine - MIT License
- Vite - MIT License
- Vitest - MIT License
- Playwright - Apache 2.0 License

---

## 22. Appendix: Glossary

**AOP (Argument of Periapsis):** Angle from ascending node to periapsis, measured in the orbital plane (symbol: ω)

**Apogee:** Farthest point in orbit from Earth

**Ascending Node:** Point where orbit crosses equatorial plane from south to north

**Descending Node:** Point where orbit crosses equatorial plane from north to south

**Eccentric Anomaly:** Auxiliary angle used in Kepler's equation (symbol: E)

**Eccentricity:** Measure of how elliptical an orbit is (0 = circle, 0-1 = ellipse)

**Ephemeris:** Table or data of celestial body positions over time

**First Point of Aries:** Direction of 0° Right Ascension (♈︎)

**Inclination:** Angle between orbital plane and equatorial plane (symbol: i)

**LOI (Lunar Orbit Insertion):** Maneuver to enter orbit around the Moon

**Mean Anomaly:** Angle proportional to time since periapsis (symbol: M)

**Osculating Orbital Elements:** Orbital elements calculated from position and velocity at a specific instant

**Perigee:** Closest point in orbit to Earth

**RAAN (Right Ascension of Ascending Node):** Angle from Aries to ascending node (symbol: Ω)

**Right Ascension (RA):** Celestial longitude measured eastward from Aries

**Semi-major Axis:** Half the longest diameter of an ellipse (symbol: a)

**TLI (Trans-Lunar Injection):** Maneuver to send spacecraft toward the Moon

**True Anomaly:** Angle from periapsis to current position in orbit (symbol: θ or ν)

---

**End of Specification Document**
