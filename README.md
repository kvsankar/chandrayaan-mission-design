# Moon Mission Orbit Design

An interactive 3D visualization of Chandrayaan-3's orbital mechanics, demonstrating the relationship between Earth's equatorial plane, the Moon's orbit, and the spacecraft's highly elliptical transfer orbit.

**🚀 [Live Demo](https://kvsankar.github.io/chandrayaan-mission-design/)**

![Chandrayaan-3 Orbit Visualization](public/chandrayaan-mission-design.png)

## Human Note

This interactive animation was developed to educate astronomy and space enthusiasts about the Chandrayaan 3 mission design. This animation was first used in the [Bangalore Astronomical Society](https://bas.org.in/) Astronomy Workshop for Enthusiasts (AWE) 2025 at the [Jain School of Sciences](https://jainuniversity.ac.in/sos/) on 15th November 2025.

The project features a unified landing page that routes to three specialized applications:
- **Chandrayaan Mission Designer**: Guides you through backwards mission design starting from landing site selection
- **Explorer**: Free-form exploration teaching the geometry of lunar and spacecraft orbits
- **Legacy Designer**: Timeline-based mission planning with constraints on Argument of Perigee (AoP) and inclination, plus playback mode

Future enhancements will add support for ascent orbit, earth-bound orbit raising maneuvers, lunar capture, lunar orbit lowering maneuvers, and descent orbit.

## Features

### Application Architecture

This project uses a **unified landing page** that routes to **three specialized applications**:

1. **Landing Page** (`index.html`) - Main entry point for all users
2. **Chandrayaan Mission Designer** (`wizard.html`) - Guided backwards mission design workflow (Featured app)
3. **Explorer** (`explorer.html`) - Free-form orbital exploration (Explore mode)
4. **Legacy Designer** (`designer.html`) - Timeline-based mission planning and playback (Plan + Game modes)

### Three Operating Modes (Explorer & Legacy Designer)

#### Explore Mode (Explorer App - `explorer.html`)
- **Manual control** of all orbital parameters
- Moon position controlled manually (Gamed mode)
- All parameters adjustable via GUI controls
- No timeline constraints
- No mode tabs (dedicated Explore-only experience)
- Ideal for learning orbital mechanics and experimentation

#### Plan Mode (Legacy Designer App - `designer.html`)
- **Mission planning** with launch event creation
- Real lunar ephemeris from astronomy-engine library
- Define launch parameters with realistic constraints:
  - Inclination: 21.5° or 41.8° (dropdown)
  - Argument of Periapsis: 178°, 198°, or 203° (depends on inclination)
  - Perigee altitude: 180-10,000 km
  - Launch date and Moon intercept date
- Three independent timeline sliders:
  - **View**: General timeline navigation
  - **Launch**: Set launch date (updates when dragged)
  - **Intercept**: Set Moon intercept date
- Radio-button style checkboxes to select which timeline controls rendering
- Spacecraft parameters update in real-time based on selected timeline
- Save/delete launch events with draft state tracking

#### Game Mode (Legacy Designer App - `designer.html`)
- **Playback mode** for viewing planned missions
- Real lunar ephemeris displays actual Moon position
- All controls visible but disabled (read-only), including lunar and chandrayaan parameters
- Timeline animation with playback controls
- Spacecraft visualized based on saved launch event
- Capture detection with toast notification when spacecraft reaches Moon

### Chandrayaan Mission Designer (`wizard.html`)

The Mission Designer implements a **backwards mission design methodology** - starting from the landing site and working backwards to determine orbital parameters. This is the **featured application** shown first on the landing page.

#### Educational Philosophy

**Backwards Design Approach:**
1. Start with the destination (landing site on Moon)
2. Determine when Sun provides proper illumination
3. Calculate required orbital geometry (RAAN)
4. Find optimal LOI (Lunar Orbit Insertion) date

This goal-oriented approach helps students understand **why** specific orbital parameters are chosen, rather than just adjusting them freely.

#### Four-Step Workflow

**Step 1: Landing Site Selection**
- Interactive 3D Moon globe with pre-defined landing sites
- Sites include Shackleton Crater, Malapert Massif, Apollo 17, etc.
- Visual markers on Moon surface showing site locations

**Step 2: Landing Window Selection**
- Calculates Sun elevation angles at selected site over time
- Identifies viable landing windows (6°-9° Sun elevation)
- Shows time periods with optimal lighting conditions
- Prevents landing during extreme temperatures

**Step 3: Mission Window Selection**
- Presents available mission timeframes
- Allows selection of specific mission dates
- Connects landing constraints to launch planning

**Step 4: LOI Date Optimization**
- Calculates required RAAN from landing window timing
- Finds optimal dates for Lunar Orbit Insertion
- Displays complete orbital timeline with 3D visualization
- Shows spacecraft trajectory and Moon encounter

#### Key Features

**Sun Elevation Calculations:**
- Accurate Sun position relative to landing site
- Libration effects included
- Landing window detection algorithm
- Visualization of Sun angles over time

**Orbital Optimization:**
- Automatic RAAN calculation from landing constraints
- Moon equator crossing detection
- Closest approach distance optimization
- Multi-start optimization for robust solutions

**State Persistence:**
- Saves progress in browser localStorage
- Resume capability after closing browser
- Auto-clear after 30 days
- Version-aware state migration

**Relationship to Other Applications:**
- **Standalone application** with its own entry point
- Demonstrates backwards mission design feasibility
- Different educational approach from Explorer/Designer apps
- Future integration planned with Legacy Designer's Plan mode

### Timeline System

- **Time Window**: 90-day range starting July 1, 2023
- **Date/Time Picker**: Set custom start date for time window
- **Current Date Display**: Shows selected date with formatting
- **Countdown Timer**: T-minus/T-plus display relative to launch
- **Launch Marker**: White vertical line on timeline indicating launch time
- **Playback Controls**:
  - Play/Pause animation
  - Reset to start
  - Speed controls with 11 preset speeds (5 days/sec to realtime)
  - Speed up/down buttons showing next speed level

### Visualization Elements

#### Coordinate System
- **X-axis (Red)**: First Point of Aries (♈︎, RA = 0°)
- **Y-axis (Green)**: RA = 90° on equatorial plane
- **Z-axis (Blue)**: North Celestial Pole
- **Equator**: White circle on celestial sphere

#### Lunar Orbit
- **Orbital plane**: Magenta great circle
- **Moon**: Grey sphere at computed position
- **Nodes**: Cyan (ascending) and orange (descending) markers
- **Right Ascension**: Calculated from ephemeris in Real mode
- **Inclination**: 18.3° to 28.6° range (varies over time)

#### Chandrayaan Orbit
- **Orbital path**: Gold ellipse (highly eccentric)
- **Orbital plane**: Yellow great circle
- **Spacecraft**: White sphere (grey before launch in Game mode)
- **Nodes**: Light green (ascending) and pink (descending) markers
- **Perigee**: 180 km default (adjustable)
- **Apogee**: 384,400 km (lunar distance, adjustable in Explore mode)
- **Period**: Auto-calculated and displayed
- **Right Ascension**: Computed from orbital elements

#### Angle Visualizations
- **RAAN Angle**: Pie sector in equatorial plane with arc and label
- **AOP Angle**: Pie sector in orbital plane showing argument of periapsis
- Both toggleable via visibility controls

### GUI Controls

#### Mode Selection
- Tab-style selector at top-right
- Switches between Explore, Plan, and Game modes
- Mode changes affect control availability

#### Visibility Toggles
- Equator, Axes
- Lunar orbit plane, nodes, Moon
- Chandrayaan orbit plane, path, spacecraft, nodes
- RAAN and AOP angle visualizations

#### Orbital Parameters (Context-Sensitive)
- **Lunar**: Inclination, RAAN, Moon RA (manual in Explore, computed in Plan/Game)
- **Chandrayaan**: Inclination, RAAN, AOP (ω), Perigee, Apogee, True Anomaly
- **Read-Only Displays**:
  - Orbital period, Moon RA, Craft RA
  - Moon distance from Earth (center-to-center, km)
  - Craft distance from Earth (center-to-center, km)
  - Craft distance to Moon (center-to-center, km)

#### Actions Panel (Plan Mode)
- **Add Launch**: Create new launch event with lil-gui interface
- **Launch Event Card**: Edit launch parameters
  - Launch date/time and Moon intercept date/time
  - Orbital parameters (inclination, RAAN, AOP, perigee, apogee)
  - Capture distance threshold (50-400,000 km)
- **Save**: Commit draft changes
- **Delete**: Remove launch event
- **Default Values**:
  - Launch: July 30, 2023 at 9:36 PM
  - Intercept: August 5, 2023 at 4:56 PM
  - RAAN: 5°, Apogee: 370,000 km
  - Capture threshold: 5,000 km

### Capture Detection (Game Mode)

- Monitors distance between spacecraft and Moon center
- Triggers capture notification when distance ≤ threshold
- Configurable capture distance in launch event (default: 5,000 km)
- Toast notification appears at top-right when captured
- Spacecraft hidden after capture
- Capture resets when scrubbing timeline before capture time

### Real Lunar Ephemeris

Uses `astronomy-engine` library for accurate Moon data:
- Position and velocity vectors via `GeoMoonState()`
- Osculating orbital elements calculated from state vectors
- Proper coordinate transformations to equatorial reference frame
- Real-time updates during timeline animation

### Performance Optimizations

- **Frame-based caching**: Reduces repeated orbital calculations (3 calls → 1 per frame)
- **Conditional updates**: Period only recalculated when perigee/apogee change
- **Kepler solver optimization**: ~70% reduction in Newton-Raphson iterations during animation
- **Smooth rendering**: 512 segments for elliptical orbit paths

### Camera & Rendering

- **FOV**: 45° (reduced from 75° to minimize edge distortion)
- **Camera Position**: (240, 160, 240) - farther back for better perspective
- **Zoom-Aware Scaling**: Markers resize based on camera distance
  - Sprite sizes: 0.2x-0.8x range for Aries marker
  - Node markers: 0.3x-2.0x range
- **Transparent Rendering**: Proper depth sorting for angle visualizations

## Controls

- **Left Mouse**: Rotate view (OrbitControls)
- **Right Mouse**: Pan view
- **Mouse Wheel**: Zoom in/out
- **Timeline Slider**: Drag to scrub through time (when enabled)
- **Launch Marker**: Drag to adjust launch time (Plan mode)

## Technical Details

### Orbital Mechanics
- Elliptical orbits using polar form: `r(θ) = a(1-e²)/(1+e*cos(θ))`
- True anomaly calculated via Kepler's equation
- Proper rotation sequence: AOP → Inclination → RAAN
- Great circles for orbital planes

### Coordinate Mapping
```
Celestial X = Three.js X
Celestial Y = Three.js -Z
Celestial Z = Three.js +Y
```

This handles Three.js's Y-up convention while maintaining celestial semantics.

### Code Organization
- `landing.ts`: Landing page routing (minimal functionality)
- `explorer.ts`: Explorer app - Explore mode only (~4,849 lines)
- `designer.ts`: Legacy Designer app - Plan + Game modes (~4,867 lines)
- `main.ts`: Original three-mode app (kept for reference)
- `src/events.ts`: Event bus for coordinating state updates
- `src/launchEventSetters.ts`: Explicit setter functions for launch event parameters
- `src/types.ts`: TypeScript type definitions for type safety
- `src/wizard/`: Complete wizard implementation (separate architecture)
- `index.html`: Landing page with three app cards
- `explorer.html`: Explorer app layout
- `designer.html`: Legacy Designer layout with timeline controls
- `wizard.html`: Mission Designer layout
- `style.css`: UI styling for visualization apps
- `ARCHITECTURE.md`: Event bus architecture documentation
- `CLAUDE.md`: Developer documentation with implementation details
- `TESTING.md`: Testing strategy and CI/CD setup guide

## Project Structure

```
cy3-orbit/
├── index.html                    # Landing page (unified entry point)
├── explorer.html                 # Explorer app (Explore mode)
├── designer.html                 # Legacy Designer app (Plan + Game modes)
├── wizard.html                   # Chandrayaan Mission Designer
├── index-old.html                # Original three-mode app (backup)
├── src/
│   ├── landing.ts                # Landing page entry point
│   ├── landing.css               # Landing page styling
│   ├── explorer.ts               # Explorer app entry
│   ├── designer.ts               # Designer app entry
│   ├── main.ts                   # Original three-mode app (reference)
│   ├── style.css                 # Visualization app styling
│   ├── constants.ts              # Application-wide constants
│   ├── events.ts                 # Event bus for state management
│   ├── launchEventSetters.ts    # Launch event update functions
│   ├── launchEventComputed.ts   # Computed launch event values
│   ├── optimization.ts           # Orbital optimization algorithms
│   ├── types.ts                  # TypeScript type definitions
│   ├── ui/
│   │   └── dialog.ts             # UI dialog components
│   └── wizard/                   # Chandrayaan Mission Designer (separate app)
│       ├── wizard-entry.ts       # Wizard app entry point
│       ├── wizard.css            # Wizard styling
│       ├── WizardController.ts   # Main wizard controller/state machine
│       ├── steps/                # Four wizard steps
│       │   ├── LandingSiteStep.ts
│       │   ├── LandingWindowStep.ts
│       │   ├── MissionWindowStep.ts
│       │   └── LOIDateStep.ts
│       ├── components/           # Wizard UI components
│       │   ├── MoonGlobeView.ts
│       │   ├── SiteMarkers.ts
│       │   ├── SunIlluminationPanel.ts
│       │   ├── OrbitVisualizationPanel.ts
│       │   └── orbitVisualization/
│       ├── calculations/
│       │   └── sunElevation.ts   # Sun elevation algorithms
│       └── data/
│           └── landing-sites.json
├── tests/
│   ├── unit/                     # Unit tests (Vitest)
│   └── e2e/                      # E2E tests (Playwright)
│       ├── e2e-wizard-demo.test.ts
│       └── ...
├── docs/
│   ├── ARCHITECTURE.md           # Event bus architecture
│   ├── TESTING.md                # Testing strategy
│   ├── CLAUDE.md                 # Technical documentation
│   └── specs/
│       ├── spec.md
│       └── mission-design-wizard-spec.md
├── playwright.config.ts          # E2E test configuration
└── README.md                     # This file
```

## Dependencies

### Runtime Dependencies
- **Three.js** (0.152.2): 3D rendering
- **lil-gui** (0.18): GUI controls
- **astronomy-engine** (2.1.19): Lunar ephemeris calculations

### Development Dependencies
- **TypeScript** (5.3.3): Type safety and compilation
- **Vite** (5.4.21): Development server and build tool
- **Vitest** (1.0.4): Unit testing framework
- **Playwright** (1.56.1): E2E testing framework
- **@vitest/coverage-v8**: Code coverage reporting

## Development Setup

### Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Running Tests
```bash
# Run unit tests
npm test

# Run unit tests with coverage
npm run test:coverage

# Run fast E2E tests (for CI/pre-commit)
npm run test:e2e:fast

# Run all E2E tests (for releases)
npm run test:e2e:slow

# Run all tests (unit + E2E)
npm run test:all
```

### Test Categories
The project uses a two-tier testing strategy:

**Fast Tests** (3 minutes) - For CI and pre-commit:
- All unit tests
- Essential E2E tests covering core functionality
- Run with: `npm run test:ci`

**Slow Tests** (5 minutes) - For releases:
- All unit tests
- Comprehensive E2E tests including optimization tests
- Run with: `npm run test:release`

See [TESTING.md](TESTING.md) for detailed testing strategy and CI/CD setup.

## TODOs

- [ ] Handle edge cases where changing the start date of the time window moves a planned launch event outside the 3-month time window (currently the launch date can fall outside the visible timeline range)

## Documentation

- **[TESTING.md](docs/TESTING.md)**: Testing strategy, CI/CD setup, and best practices
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Event bus architecture and design patterns
- **[CLAUDE.md](docs/CLAUDE.md)**: Detailed technical documentation and implementation notes

## Credits

Built with Three.js and astronomy-engine.
