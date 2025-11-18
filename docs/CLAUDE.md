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
- **Apogee**: Fixed at 384,400 km (lunar orbit distance)
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

## File Structure

```
cy3-orbit/
├── index.html               # Main HTML with legend panel and imports
├── main.ts                  # Three.js visualization logic (TypeScript)
├── main.js                  # Compiled JavaScript (generated)
├── reactive.ts              # Reactive state management system
├── style.css                # Styling for UI elements
├── package.json             # NPM dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.js           # Vite build configuration
├── vitest.config.ts         # Testing configuration
├── *.test.ts                # Unit tests (97 tests)
├── CLAUDE.md                     # This file (developer documentation)
├── ARCHITECTURE.md               # Event bus architecture documentation
├── DEPLOYMENT.md                 # GitHub Pages deployment guide
├── LESSONS-LEARNED.md            # Bug regression documentation
├── TESTING.md                    # Testing strategy and CI/CD setup
├── playwright.config.ts          # E2E test configuration (all tests)
├── playwright.config.fast.ts    # Fast E2E tests for CI
├── playwright.config.slow.ts    # Comprehensive E2E tests for releases
└── .github/workflows/            # CI/CD pipeline
    └── deploy.yml                # Automated deployment to GitHub Pages
```

##  Technology Stack

- **Language**: TypeScript (compiled to JavaScript)
- **3D Visualization**: Three.js
- **State Management**: Event bus pattern for coordinating state updates
- **GUI**: lil-gui
- **Astronomy**: astronomy-engine
- **Build Tool**: Vite
- **Testing**:
  - Vitest: Unit tests (orbital mechanics, utilities, calculations)
  - Playwright: E2E tests (UI interactions, workflows, mode transitions)
  - Two-tier strategy: Fast tests (3 min) for CI, Slow tests (5 min) for releases
- **Deployment**: GitHub Actions → GitHub Pages

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

# Testing
npm test             # Run unit tests (Vitest)
npm test:coverage    # Generate coverage report
npm run test:e2e:fast    # Fast E2E tests for CI (3 min, 34 tests)
npm run test:e2e:slow    # All E2E tests for releases (5 min, 49 tests)
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
- **Event Bus Pattern**: Explicit event emission for state updates in src/events.ts
- **Setter Functions**: Dedicated update functions with validation in src/launchEventSetters.ts
- **Centralized Functions**: RA↔Anomaly conversions in main.ts:806, main.ts:836
- **Modular Architecture**: Clear separation between state, UI, and rendering
- **Type Safety**: Full TypeScript types in src/types.ts
- **Comprehensive Testing**: Unit and E2E tests with two-tier CI/CD strategy

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
