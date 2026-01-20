# Chandrayaan-3 Orbit Visualization

## Project Overview

This is an interactive Three.js web application that visualizes the orbital mechanics of Chandrayaan-3's mission to the Moon. It demonstrates the relationship between Earth's equatorial plane, the Moon's orbit, and Chandrayaan's highly elliptical transfer orbit.

## Key Concepts

### Coordinate System

The visualization uses a **celestial coordinate system**:
- **X-axis (Red)**: Points to the First Point of Aries (♈︎, RA = 0°)
- **Y-axis (Green)**: Points to RA = 90° on the equatorial plane
- **Z-axis (Blue)**: Points to the North Celestial Pole (perpendicular to equatorial plane)

**Mapping to Three.js coordinates:**
- Celestial X = Three.js X
- Celestial Y = Three.js -Z
- Celestial Z = Three.js +Y

This mapping handles Three.js's Y-up convention while maintaining proper celestial coordinate semantics.

### Orbital Elements

#### Lunar Orbit
- **Inclination**: 18.3° to 28.6° (variable, represents actual Moon orbital inclination variation)
- **RAAN**: Right Ascension of Ascending Node (0-360°)
- **Moon RA**: Moon's position measured from First Point of Aries (0-360°)
- **Visualization**: Great circle (magenta) on celestial sphere

#### Chandrayaan-3 Orbit
- **Type**: Highly elliptical (not circular)
- **Perigee**: 180 km altitude (default, adjustable 180-10,000 km)
- **Apogee**: Adjustable (default ~384,400 km, lunar orbit distance)
- **Eccentricity**: Automatically calculated from perigee and apogee
  - Formula: `e = (apogee - perigee) / (apogee + perigee)`
  - Default: ~0.967 (very elliptical)
- **Inclination**: 0-90°
- **RAAN**: 0-360°
- **Argument of Periapsis (ω)**: 0-360°
- **True Anomaly**: Position along orbit (0-360°)

### Angle Visualizations

#### RAAN Angle (Right Ascension of Ascending Node)
- **Location**: Equatorial plane (XY plane in celestial coords)
- **Components**:
  - Line from origin to First Point of Aries
  - Line from origin to ascending node
  - Arc connecting the endpoints
  - Shaded pie sector (light grey, 25% opacity)
  - "RAAN" text label at arc midpoint
- **Visibility**: Toggleable via "Show RAAN Angle"

#### AOP Angle (Argument of Periapsis)
- **Location**: Chandrayaan's orbital plane (tilted by inclination + RAAN)
- **Components**:
  - Dashed line from origin to ascending node
  - Dashed line from origin to periapsis
  - Arc connecting the endpoints along orbital plane
  - Shaded pie sector (light pink, 25% opacity)
  - "AOP" text label at arc midpoint
- **Visibility**: Toggleable via "Show AOP Angle"
- **Rotation**: Properly oriented by inclination → RAAN transformations

## Application Architecture

The project uses a **unified landing page** that serves as a single entry point to **three specialized applications**:

**Entry Point:**
- **Landing Page** (`index.html`) - Unified front with three app cards for navigation

**Three Specialized Applications:**
1. **Chandrayaan Mission Designer** (`wizard.html`) - Featured app with backwards mission design methodology
2. **Explorer** (`explorer.html`) - Interactive orbital visualization (Explore mode only)
3. **Legacy Designer** (`designer.html`) - Mission planning with timeline (Plan + Game modes)

## File Structure

```
cy3-orbit/
├── index.html               # Landing page with three app entry points
├── explorer.html            # Explorer app entry point (Explore mode only)
├── designer.html            # Legacy Designer app entry point (Plan + Game modes)
├── wizard.html              # Mission Design Wizard entry point
├── index-old.html           # Backup of original three-mode application
├── CLAUDE.md                # This file (developer documentation)
├── package.json             # NPM dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.js           # Vite multi-page build configuration
├── vitest.config.ts         # Unit test configuration
├── eslint.config.js         # ESLint configuration
├── playwright.config.ts     # E2E test config (projects: default, fast, slow)
├── .pre-commit-config.yaml  # Pre-commit hooks (ESLint, TypeScript, etc.)
├── src/                     # Source files
│   ├── landing.ts           # Landing page entry point
│   ├── landing.css          # Landing page styling
│   ├── explorer.ts          # Explorer app entry (Explore mode only)
│   ├── designer.ts          # Designer app entry (Plan + Game modes)
│   ├── main.ts              # Original three-mode app (kept for reference)
│   ├── style.css            # Styling for visualization apps
│   ├── constants.ts         # Application-wide constants
│   ├── events.ts            # Event bus for state management
│   ├── types.ts             # TypeScript type definitions
│   ├── launchEventSetters.ts    # Launch event update functions
│   ├── launchEventComputed.ts   # Computed launch event values
│   ├── optimization.ts      # Orbital optimization algorithms
│   ├── types/               # Type declarations
│   │   ├── astronomy-engine.d.ts
│   │   └── lil-gui.d.ts
│   ├── ui/
│   │   └── dialog.ts        # UI dialog components
│   └── wizard/              # Mission Design Wizard (separate application)
│       ├── wizard-entry.ts  # Wizard app entry point
│       ├── wizard.css       # Wizard-specific styling
│       ├── WizardController.ts  # Main wizard controller/state machine
│       ├── steps/           # Wizard step implementations
│       │   ├── LandingSiteStep.ts     # Step 1: Select landing site
│       │   ├── LandingWindowStep.ts   # Step 2: Choose landing window
│       │   ├── MissionWindowStep.ts   # Step 3: Select mission window
│       │   └── LOIDateStep.ts         # Step 4: Optimize LOI date
│       ├── components/      # Wizard UI components
│       │   ├── MoonGlobeView.ts       # 3D Moon globe with landing sites
│       │   ├── SiteMarkers.ts         # Landing site markers on globe
│       │   ├── SunIlluminationPanel.ts # Sun elevation visualization
│       │   ├── OrbitVisualizationPanel.ts  # Complete orbit visualization
│       │   ├── ORBIT_PANEL_SPEC.md    # Orbit panel specification
│       │   └── orbitVisualization/    # Orbit visualization sub-components
│       │       ├── index.ts           # Module exports
│       │       ├── types.ts           # Component type definitions
│       │       ├── OrbitScene.ts      # Three.js scene setup
│       │       ├── orbitCore.ts       # Core orbital rendering logic
│       │       ├── OrbitVisualizationPanel.ts  # Main panel component
│       │       └── TimelineControls.ts # Timeline UI controls
│       ├── calculations/    # Wizard-specific calculations
│       │   └── sunElevation.ts        # Sun elevation algorithms
│       ├── data/            # Static data for wizard
│       │   └── landing-sites.json     # Pre-defined landing sites
│       └── poc/             # Proof-of-concept code
│           └── sun-elevation-poc.ts   # Initial sun elevation validation
├── tests/
│   ├── unit/                # Unit tests (Vitest)
│   │   ├── ra-calculations.test.ts
│   │   ├── optimization.test.ts
│   │   └── ...
│   └── e2e/                 # E2E tests (Playwright)
│       ├── e2e-wizard-demo.test.ts    # Wizard workflow tests
│       ├── e2e-mode-transitions.test.ts
│       └── ...
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   ├── specs/
│   │   ├── spec.md
│   │   └── mission-design-wizard-spec.md
│   └── ...
└── .github/workflows/
    └── deploy.yml           # CI/CD: tests + GitHub Pages deployment
```

## Technology Stack

- **Language**: TypeScript (compiled to JavaScript)
- **3D Visualization**: Three.js
- **State Management**: Event bus pattern for coordinating state updates
- **GUI**: lil-gui
- **Astronomy**: astronomy-engine
- **Build Tool**: Vite
- **Linting**: ESLint with typescript-eslint
- **Pre-commit Hooks**: Python pre-commit framework (ESLint, TypeScript, complexity checks)
- **Testing**:
  - Vitest: Unit tests (orbital mechanics, utilities, calculations)
  - Playwright: E2E tests (UI interactions, workflows, mode transitions)
  - Two-tier strategy: Fast tests (33 tests) for CI, Slow tests (49 tests) for releases
- **CI/CD**: GitHub Actions (unit tests + E2E tests + GitHub Pages deployment)

## Color Scheme

Defined in `COLORS` object in main.js:

### Axes & Reference
- X-axis: Red (0xff0000)
- Y-axis: Green (0x00ff00)
- Z-axis: Blue (0x0000ff)
- First Point of Aries marker: Red (0xff0000)
- Equator: White (0xffffff)

### Lunar Orbit
- Orbital plane: Magenta (0xff00ff)
- Ascending node: Cyan (0x00ffff)
- Descending node: Orange (0xff8800)
- Moon: Grey (0xaaaaaa)

### Chandrayaan Orbit
- Orbital plane: Yellow (0xffff00)
- Orbit path: Gold/Amber (0xffa500)
- Ascending node: Light Green (0x88ff88)
- Descending node: Pink (0xff88ff)
- Spacecraft: White (0xffffff)

### Angle Visualizations
- RAAN pie/edges: Light grey (0xcccccc edges, 0xf0f0f0 fill)
- AOP pie/edges: Light grey edges (0xcccccc), Light pink fill (0xffe0e0)

## Key Implementation Details

### Orbital Geometry

**Great Circles:**
Created using `createGreatCircle(radius, color, inclination, raan)`:
1. Generate points in XZ plane (counter-clockwise from above)
2. Apply inclination rotation around X-axis
3. Apply RAAN rotation around Y-axis

**Elliptical Orbit:**
Uses polar form: `r(θ) = a(1-e²)/(1+e*cos(θ))`
- Points generated in orbital plane
- Rotated by ω (argument of periapsis), then inclination, then RAAN

**Moon Position:**
- RA remains constant when RAAN changes
- Formula: `angleInOrbit = moonRA - lunarRAAN`
- Position calculated, then rotated by inclination and RAAN

### Rendering Order

To ensure transparent objects render correctly:
1. Celestial sphere: `renderOrder = 0`, `depthWrite = false`
2. Angle visualizations: `renderOrder = 10`, `depthWrite = false`

This allows pie sectors to render on top of the semi-transparent celestial sphere.

### Z-Fighting Prevention

Pie sectors are offset slightly above their reference planes:
- `yOffset = 0.1` in vertex creation
- Prevents flickering with equatorial/orbital planes

## Distance Calculations

All distance measurements use **center-to-center distances** and are calculated in **kilometers**.

### Coordinate System Consistency

**Critical**: All positions must be in the same coordinate system for accurate distance calculations.

- **Moon position from ephemeris**: Converted from celestial coords to Three.js coords before caching
  - Celestial (x, y, z) → Three.js (x, z, -y)
- **Craft position**: Calculated directly in Three.js coords using orbital rotations
- **Distance cache**: `realPositionsCache` stores both positions in Three.js coords (km)

### Distance Types

1. **Moon-Earth distance**: `√(moonPos.x² + moonPos.y² + moonPos.z²)` km
2. **Craft-Earth distance**: `√(craftPos.x² + craftPos.y² + craftPos.z²)` km
3. **Craft-Moon distance**: `√((cx-mx)² + (cy-my)² + (cz-mz)²)` km

### Visual vs. Distance Scales

- **Visual positions**: Scaled by `SCALE_FACTOR = 100/384400` for display
- **Distance calculations**: Use unscaled positions in kilometers
- **Real mode Moon**: Visual position uses actual varying distance from ephemeris
- **Gamed mode Moon**: Visual position fixed at `SPHERE_RADIUS` (100 units)

### Constants

- `EARTH_RADIUS = 6371` km
- `MOON_RADIUS = 1737` km
- `LUNAR_ORBIT_DISTANCE = 384400` km (average)

## Important Constraints

1. **RA vs RAAN**: Moon's Right Ascension (RA) is absolute in space and doesn't change when lunar RAAN changes
2. **Adjustable Apogee**: Chandrayaan apogee is adjustable (default ~378,029 km altitude ≈ lunar distance)
3. **Counter-clockwise**: All rotations follow right-hand rule (counter-clockwise when viewed from above/north)
4. **Node Positions**: Calculated by rotating (±R, 0, 0) in orbital plane by inclination and RAAN
5. **Center-to-center distances**: All distance thresholds (capture, etc.) measure from object centers
6. **Spherical Trigonometry**: RA↔True Anomaly conversions use proper spherical trig (NOT simple addition/subtraction)

## Unified Landing Page Architecture

The project uses a **unified landing page** as the **single entry point** to all functionality. Users access a modern landing page that routes them to one of three specialized applications based on their needs.

### Landing Page (`index.html` + `src/landing.ts`)

The landing page serves as the unified front to the application suite:

- **Single Entry Point**: All users start here - one URL, one interface
- **Three Large Cards**: Each card routes to a specialized application
- **Modern Design**: Gradient backgrounds, hover effects, smooth animations
- **Responsive**: Works on desktop, tablet, and mobile devices
- **Minimal JavaScript**: Lightweight routing with analytics tracking
- **Fast Load**: No heavy dependencies (no Three.js, no orbital calculations)

### Application Entry Points

Each application is a separate HTML file with its own TypeScript entry point:

1. **Chandrayaan Mission Designer** (`wizard.html`)
   - Entry point: `src/wizard/wizard-entry.ts`
   - Backwards mission design methodology
   - 4-step guided workflow

2. **Explorer** (`explorer.html`)
   - Entry point: `src/explorer.ts`
   - Explore mode only (no timeline, no mode switching)
   - Manual Moon controls and orbital parameter adjustments
   - All visualization features enabled

3. **Legacy Designer** (`designer.html`)
   - Entry point: `src/designer.ts`
   - Plan + Game modes only (no Explore mode)
   - Timeline-based mission planning
   - TLI/LOI event management

### Navigation Strategy

- **No cross-app navigation**: Each app is standalone after selection
- **Browser back button**: Returns to landing page naturally
- **No breadcrumbs**: Clean, focused experience within each app

### URL Structure

```
/                    → Landing page (MAIN ENTRY POINT)
                       ├─→ /wizard.html         → Chandrayaan Mission Designer
                       ├─→ /explorer.html       → Explorer
                       └─→ /designer.html       → Legacy Designer
```

**Note**: While users can technically navigate directly to any HTML file, the intended user flow is:
1. Start at landing page (`/`)
2. Choose an app from the three cards
3. Work within the selected app
4. Use browser back button to return to landing page

### Benefits of Unified Architecture

This architecture provides several advantages:

1. **Clear User Journey**: New users see all options upfront and choose based on their needs
2. **Focused Experience**: Each app contains only relevant features (no unused mode tabs)
3. **Easier Maintenance**: Changes to one app don't affect others
4. **Better Performance**: Each app loads only what it needs
5. **Educational Clarity**: Different learning paths (guided wizard vs. free exploration vs. mission planning)
6. **Future Scalability**: Easy to add new specialized apps without cluttering existing ones

### Code Architecture

**Landing Page**:
- Minimal dependencies (just landing.css and landing.ts)
- No Three.js or heavy libraries
- Fast load time

**Explorer App** (`explorer.ts`):
- Based on original `main.ts` with Explore mode only
- Removed: Mode tabs, timeline, launch events
- Kept: All manual controls, sync buttons, visualization toggles

**Designer App** (`designer.ts`):
- Based on original `main.ts` with Plan/Game modes only
- Removed: Explore mode tab and manual Moon controls
- Kept: Timeline, launch events, optimization algorithms

**Wizard App** (`wizard-entry.ts`):
- Previously at `src/wizard/demo.html`
- Now integrated as first-class app at root level
- Full wizard functionality preserved

**Original Three-Mode App** (`main.ts` + `index-old.html`):
- Kept for reference and backward compatibility
- Contains all three modes (Explore, Plan, Game) in one application
- Not linked from landing page (direct URL access only)
- Useful for comparing code between split apps and original monolithic version

### Build Configuration

Vite is configured for **multi-page application** build:

```javascript
rollupOptions: {
  input: {
    main: resolve(__dirname, 'index.html'),
    explorer: resolve(__dirname, 'explorer.html'),
    designer: resolve(__dirname, 'designer.html'),
    wizard: resolve(__dirname, 'wizard.html')
  }
}
```

This generates four separate HTML files with their own bundled JavaScript, while sharing common code chunks automatically.

## Mission Design Wizard Architecture

The Mission Design Wizard is a **separate standalone application** (`wizard.html`) that implements a guided, multi-step workflow for planning lunar missions using a **backwards mission design methodology**.

### Philosophy: Backwards Mission Design

Unlike the main visualization app (Explore/Plan/Game modes), the wizard works **backwards from the landing site**:

1. **Start at the destination**: Select landing site on Moon
2. **Work backwards**: Determine when Sun provides adequate illumination
3. **Find required orbital geometry**: Calculate RAAN needed for landing window
4. **Optimize timing**: Find optimal LOI date for mission success

This approach teaches orbital mechanics through **goal-oriented problem solving** rather than forward simulation.

### Four-Step Workflow

**Step 1: Landing Site Selection**
- Interactive 3D Moon globe with pre-defined landing sites
- Sites include: Shackleton Crater, Malapert Massif, Apollo 17, etc.
- Displays site coordinates (latitude, longitude)
- Component: `LandingSiteStep.ts`, `MoonGlobeView.ts`, `SiteMarkers.ts`

**Step 2: Landing Window Selection**
- Calculates Sun elevation at selected site over time
- Identifies viable landing windows (6°-9° Sun elevation)
- Displays time windows with optimal lighting conditions
- Algorithm: `sunElevation.ts` using astronomy-engine
- Component: `LandingWindowStep.ts`, `SunIlluminationPanel.ts`

**Step 3: Mission Window Selection**
- Presents available mission timeframes
- Allows selection of specific mission dates
- Connects landing window to launch planning
- Component: `MissionWindowStep.ts`

**Step 4: LOI Date Optimization**
- Calculates required RAAN from landing window timing
- Finds optimal Lunar Orbit Insertion (LOI) dates
- Uses Moon equator crossing detection
- Displays full orbital timeline and visualization
- Algorithm: `findOptimalLOIDates()` in `optimization.ts`
- Component: `LOIDateStep.ts`, `OrbitVisualizationPanel.ts`

### Component Hierarchy

```
WizardController (state machine)
├── LandingSiteStep
│   └── MoonGlobeView
│       └── SiteMarkers
├── LandingWindowStep
│   └── SunIlluminationPanel
├── MissionWindowStep
├── LOIDateStep
│   └── OrbitVisualizationPanel
│       ├── OrbitScene
│       ├── orbitCore
│       └── TimelineControls
```

### State Management

**WizardState Interface** (defined in `WizardController.ts`):
- `currentStepIndex`: Current step (0-3)
- `landingSite`: Selected landing location
- `landingWindow`: Chosen time window with Sun elevation
- `missionWindow`: Selected mission timeframe
- `loiDate`: Optimized LOI date
- `requiredRAAN`: Calculated RAAN from landing geometry

**State Persistence**:
- Stored in `localStorage` with key: `cy3-orbit:wizard-state`
- Includes version field for migration: `stateVersion: 1`
- Automatically saved after each step completion
- Auto-clears after 30 days of inactivity
- Resume dialog on app restart if saved state exists

**State Versioning**:
- Future-proof design for schema changes
- Migration path for breaking changes
- Version comparison on load

### Integration with Main Application

**Current Status**: The wizard is a **standalone proof-of-concept**. It demonstrates:
- Feasibility of backwards mission design pedagogy
- Sun elevation calculation algorithms
- RAAN optimization from landing constraints

**Future Integration** (not yet implemented):
- Export wizard results to main app's Plan mode
- Populate launch event parameters from wizard state
- Unified state management between applications

### Key Differences from Visualization Apps

| Feature | Explorer/Designer Apps | Mission Design Wizard |
|---------|------------------------|----------------------|
| Approach | Forward simulation | Backwards design |
| Entry Point | Manual parameter control | Single guided workflow |
| State | Launch events + GUI state | WizardState object |
| Persistence | None (ephemeral) | localStorage (persistent) |
| Education Focus | Interactive exploration | Step-by-step methodology |

## Constants Module

Defined in `src/constants.ts` - centralized application constants.

### Physical Constants

```typescript
EARTH_RADIUS = 6371       // km
MOON_RADIUS = 1737        // km
LUNAR_ORBIT_DISTANCE = 384400  // km (average Earth-Moon distance)
```

### Visualization Constants

```typescript
SPHERE_RADIUS = 100       // Visual size of celestial sphere
SCALE_FACTOR = 100 / 384400  // Scale for displaying lunar orbit
```

### Capture Thresholds

```typescript
CAPTURE_RADIUS_KM = 66000  // Distance for Moon capture detection
MOON_RADIUS_KM = 1737      // Used in closest approach calculations
```

### Sun Elevation Parameters

```typescript
MIN_SUN_ELEVATION = 6      // Minimum Sun angle for landing (degrees)
MAX_SUN_ELEVATION = 9      // Maximum Sun angle for landing (degrees)
```

Landing windows are defined as times when Sun elevation is within this range, providing adequate illumination without excessive heat.

### Orbital Parameters

```typescript
PERIGEE_ALTITUDE_MIN = 180     // km
PERIGEE_ALTITUDE_MAX = 10000   // km
PERIGEE_ALTITUDE_DEFAULT = 180 // km
```

## Sun Elevation Calculations

Algorithm in `src/wizard/calculations/sunElevation.ts` - calculates Sun elevation angle at landing site over time.

### Algorithm Overview

**Purpose**: Determine when the Sun is at optimal elevation (6°-9°) for safe landing at a specific lunar location.

**Steps**:

1. **Input Parameters**:
   - Landing site latitude/longitude (selenographic coordinates)
   - Time range (start date → end date)
   - Time step (default: 1 hour)

2. **For each time step**:
   - Calculate Moon's orientation (libration) using astronomy-engine
   - Calculate Sun's position relative to Moon
   - Transform Sun position to landing site local frame
   - Calculate elevation angle from local horizon

3. **Landing Window Detection**:
   - Identify continuous periods where `6° ≤ elevation ≤ 9°`
   - Group into discrete landing windows
   - Return window start/end times

### Required RAAN Calculation

Once a landing window is selected, the wizard calculates the **required RAAN** for the spacecraft orbit:

**Formula**:
```
Required RAAN = Moon RA at landing time - offset
```

Where the offset depends on:
- Landing site longitude
- Moon's orientation (libration)
- Desired approach geometry

This RAAN ensures the spacecraft's orbital plane intersects the Moon when the landing site has proper illumination.

### Key Functions

- `calculateSunElevationAtSite(site, date)`: Single point calculation
- `findLandingWindows(site, startDate, endDate)`: Window detection
- `calculateRequiredRAAN(landingTime, site)`: Orbital geometry calculation

## Orbital Optimization Algorithms

Defined in `src/optimization.ts` - algorithms for finding optimal orbital parameters.

### Moon Equator Crossing Detection

**Function**: `findMoonEquatorCrossings(craftPos, moonPos, orbitParams)`

**Purpose**: Identify when the spacecraft crosses the Moon's equatorial plane during its orbit.

**Algorithm**:
1. Sample spacecraft position at regular true anomaly intervals
2. Calculate position relative to Moon
3. Detect sign changes in Z-coordinate (equatorial plane crossings)
4. Refine crossing points using bisection method
5. Classify as ascending (south→north) or descending (north→south)

**Returns**: Array of crossing events with:
- `trueAnomaly`: Position in orbit where crossing occurs
- `time`: Time of crossing (if using time-based orbit)
- `type`: 'ascending' or 'descending'
- `distanceFromMoon`: Distance to Moon center at crossing

**Used in**: LOI date optimization, trajectory analysis

### Optimal LOI Date Finding

**Function**: `findOptimalLOIDates(requiredRAAN, landingDate, options)`

**Purpose**: Find the best date for Lunar Orbit Insertion given landing constraints.

**Strategy**:
1. **Work backwards from landing**: `landingDate - transferTime`
2. **Moon RA calculation**: Determine Moon's RA at landing time
3. **RAAN matching**: Find dates when spacecraft RAAN aligns with required geometry
4. **Equator crossing check**: Verify spacecraft crosses Moon's equator at apogee
5. **Distance optimization**: Minimize apogee-to-Moon distance

**Constraints**:
- Spacecraft must reach Moon vicinity at the right RAAN
- Apogee should occur near Moon equator crossing
- Distance to Moon at apogee < capture radius

**Returns**: Array of viable LOI dates with:
- `date`: LOI date
- `requiredRAAN`: RAAN value needed
- `closestApproach`: Distance to Moon (km)
- `equatorCrossing`: Crossing event details

### Multi-Start Apogee Optimization

**Function**: `optimizeApogeeToMoonMultiStart(params)`

**Purpose**: Adjust apogee distance to minimize closest approach to Moon.

**Algorithm**:
1. **Grid search**: Try multiple initial apogee values
2. **Local optimization**: Refine each using gradient descent
3. **Constraint satisfaction**: Ensure physical validity
4. **Best solution selection**: Choose minimum distance result

**Parameters**:
- Initial orbital parameters
- Target Moon position
- Distance tolerance

**Used in**: Plan mode optimization, wizard LOI calculations

### Kepler's Equation Solver

**Function**: `getTrueAnomalyFromTime(time, period, eccentricity)`

**Purpose**: Convert elapsed time to position in orbit (true anomaly).

**Algorithm**:
1. Calculate mean anomaly: `M = 2π * (time / period)`
2. Solve Kepler's equation for eccentric anomaly: `M = E - e*sin(E)`
3. Convert eccentric anomaly to true anomaly using eccentricity

**Method**: Newton-Raphson iteration for high-accuracy solution

**Used in**: Time-based orbit simulation, capture event timing

## Orbital Calculations

### RA and True Anomaly Conversions

The application supports both directions of conversion between Right Ascension (RA) and True Anomaly using proper spherical trigonometry.

#### Forward (True Anomaly → RA)

**Function**: `calculateRAFromTrueAnomaly(nu, raan, omega, inc)` (main.ts:836)

**Formula**:
```
u = ω + ν  (argument of latitude)
RA = RAAN + atan2(cos(i) * sin(u), cos(u))
```

**Used in**:
- `updateChandrayaanRADisplay()` - Display current spacecraft RA
- `chandrayaanTrueAnomaly.onChange()` - When user drags True Anomaly slider

#### Inverse (RA → True Anomaly)

**Function**: `calculateTrueAnomalyFromRA(ra, raan, omega, inc)` (main.ts:806)

**Formula**: Inverts the forward formula using derived solution
```
Δ RA = RA - RAAN
k = 1 / sqrt(sin²(ΔRA) + cos²(ΔRA) * cos²(i))
sin(u) = k * sin(ΔRA)
cos(u) = k * cos(ΔRA) * cos(i)
u = atan2(sin(u), cos(u))
ν = u - ω
```

**Used in**:
- `updateChandrayaanOrbit()` - Position spacecraft in Explore mode
- `updateMoonPosition()` - Position Moon from RA in Gamed mode
- `chandrayaanRA.onChange()` - When user drags RA slider
- `syncRA` button - Sync spacecraft RA to Moon RA
- `syncAOP` button - Calculate position for apogee alignment

**Critical**: Simple addition/subtraction `RA = RAAN + ω + ν` **only works for equatorial orbits** (i=0°). For inclined orbits, must use spherical trigonometry. See LESSONS-LEARNED.md for details on why this matters.

## GUI Controls

### Visibility
- Equator, Axes, Lunar/Chandrayaan orbit planes and elements
- RAAN Angle, AOP Angle toggles

### Lunar Orbit Parameters
- Inclination: 18.3° to 28.6°
- RAAN: 0° to 360°
- Moon RA: 0° to 360°

### Chandrayaan Orbit Parameters
- Inclination: 0° to 90°
- RAAN: 0° to 360°
- Argument of Periapsis (ω): 0° to 360°
- Perigee Altitude: 180 to 10,000 km
- True Anomaly: 0° to 360°

## Development Notes

### TypeScript
- Written in TypeScript for type safety and better IDE support
- Compiles to JavaScript via `npm run compile`
- Full type annotations for orbital parameters and Three.js objects
- Custom type definitions for astronomy-engine and lil-gui

### Development Workflow
```bash
# Development
npm run dev          # Start Vite dev server with HMR (port 3000/3001)
npm run compile      # Compile TypeScript to JavaScript
npm run build        # Production build for GitHub Pages
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix

# Testing
npm test             # Run unit tests once (Vitest)
npm run test:watch   # Run unit tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # All E2E tests (--project=default)
npm run test:e2e:fast    # Fast E2E tests for CI (--project=fast, 33 tests)
npm run test:e2e:slow    # All E2E tests for releases (--project=slow, 49 tests)
npm run test:ci          # Unit + Fast E2E (for pre-commit/CI)
npm run test:release     # Unit + Slow E2E (for releases)
```

### Testing Strategy

The project uses a **two-tier testing approach** optimized for different stages of development:

**Fast Tests (3 minutes)** - For CI and pre-commit:
- All unit tests (Vitest)
- Essential E2E tests covering core functionality
- Excludes long-running optimization tests
- Run with: `npm run test:ci`

**Slow Tests (5 minutes)** - For releases:
- All unit tests (Vitest)
- Comprehensive E2E tests including optimization scenarios
- Error handling edge cases and visual verification
- Run with: `npm run test:release`

**Test Coverage**:
- Unit tests: Orbital mechanics, RA calculations, utilities, optimization algorithms
- E2E tests: Mode transitions, timeline controls, parameter validation, capture detection
- Total: ~41 unit tests + 49 E2E tests

See [TESTING.md](TESTING.md) for detailed testing strategy, CI/CD setup, and best practices.

### Code Organization
- **Source in `src/`**: All source files organized under src/ directory
- **Event Bus Pattern**: Explicit event emission for state updates in `src/events.ts`
- **Setter Functions**: Dedicated update functions with validation in `src/launchEventSetters.ts`
- **Centralized Functions**: RA↔Anomaly conversions in `src/main.ts`
- **Modular Architecture**: Clear separation between state, UI, and rendering
- **Type Safety**: Full TypeScript types in `src/types.ts`
- **Type Declarations**: Custom .d.ts files in `src/types/`
- **Comprehensive Testing**: Unit tests in `tests/unit/`, E2E tests in `tests/e2e/`

### Key Technical Details
- ES6 modules with Vite bundling
- lil-gui for interactive controls
- All geometry uses `applyAxisAngle()` for consistent rotations
- Text labels created using canvas textures and sprites
- Legend panel is collapsible and positioned on left side
- Automatic dependency tracking prevents bugs from missing update calls

## Future Enhancements

Potential additions:
- Animation of orbits over time
- Multiple Chandrayaan orbit phases
- Trajectory prediction
- Real ephemeris data integration
- Camera presets for different viewpoints
