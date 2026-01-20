# Chandrayaan-3 Orbit Visualization - Comprehensive Technical Specification

**Version:** 2.1
**Last Updated:** January 20, 2026 (Revised)
**Project Type:** Interactive 3D Orbit Visualization with Mission Design Tools

---

## Table of Contents

### Part I: Core Visualization Application
1. [Project Overview](#1-project-overview)
2. [Application Modes](#2-application-modes)
3. [Coordinate System and Reference Frames](#3-coordinate-system-and-reference-frames)
4. [Visualization Elements](#4-visualization-elements)
5. [Timeline System](#5-timeline-system)
6. [User Interface Controls](#6-user-interface-controls)
7. [Launch Event Management](#7-launch-event-management)
8. [Physics & Orbital Mechanics](#8-physics--orbital-mechanics)
9. [Real Lunar Ephemeris](#9-real-lunar-ephemeris)
10. [Capture Detection System](#10-capture-detection-system)
11. [Performance Optimizations](#11-performance-optimizations)
12. [Code Architecture](#12-code-architecture)
13. [Testing Strategy](#13-testing-strategy)
14. [Code Quality & Linting](#14-code-quality--linting)
15. [Configuration & Constants](#15-configuration--constants)
16. [Browser Compatibility](#16-browser-compatibility)
17. [Deployment](#17-deployment)
18. [Future Enhancements](#18-future-enhancements)
19. [Known Limitations](#19-known-limitations)
20. [License and Attribution](#20-license-and-attribution)
21. [Appendix: Glossary](#21-appendix-glossary)

### Part II: Mission Design Wizard
22. [Mission Design Wizard Overview](#22-mission-design-wizard-overview)
23. [Wizard Design Philosophy](#23-wizard-design-philosophy)
24. [Wizard User Flow](#24-wizard-user-flow)
25. [Wizard Steps](#25-wizard-steps)
26. [Wizard Algorithms](#26-wizard-algorithms)
27. [Wizard Technical Architecture](#27-wizard-technical-architecture)
28. [Wizard Testing Strategy](#28-wizard-testing-strategy)
29. [Wizard Implementation Summary](#29-wizard-implementation-summary)
30. [Wizard Reference Data](#30-wizard-reference-data)

### Part III: Orbit Visualization Panel Component
31. [Orbit Panel Overview](#31-orbit-panel-overview)
32. [Orbit Panel Architecture](#32-orbit-panel-architecture)
33. [Orbit Panel State Structure](#33-orbit-panel-state-structure)
34. [Orbit Panel Functional Core](#34-orbit-panel-functional-core)
35. [Orbit Panel UI Components](#35-orbit-panel-ui-components)
36. [Orbit Panel Animation Loop](#36-orbit-panel-animation-loop)
37. [Orbit Panel Behavior Rules](#37-orbit-panel-behavior-rules)
38. [Orbit Panel API](#38-orbit-panel-api)
39. [Orbit Panel File Structure](#39-orbit-panel-file-structure)

---

# Part I: Core Visualization Application

---

## 1. Project Overview

The Chandrayaan-3 Orbit Visualization is an interactive web-based application that simulates and visualizes the orbital mechanics of India's Chandrayaan-3 lunar mission. The project uses a **unified landing page** that routes to **three specialized applications**:

1. **Landing Page** (`index.html`): Main entry point with three app cards for navigation
2. **Chandrayaan Mission Designer** (`wizard.html`): Guided multi-step workflow for backwards mission design (Featured app)
3. **Explorer** (`explorer.html`): Free-form orbital exploration with manual controls (Explore mode only)
4. **Legacy Designer** (`designer.html`): Timeline-based mission planning and playback (Plan + Game modes)

**Note:** The original three-mode application (`main.ts` + `index-old.html`) is preserved for reference and backward compatibility but is not linked from the landing page. It contains all three modes (Explore, Plan, Game) in one application and is useful for comparing the split architecture with the original monolithic version.

### 1.0 Educational Tool Disclaimer

**⚠️ IMPORTANT: This is an educational visualization tool, not a professional mission design system.**

The Chandrayaan-3 Orbit Visualization and Mission Designer are designed to teach foundational physics principles and orbital mechanics concepts. They are **not suitable for real mission planning** and incorporate significant simplifications:

**Simplified Physics Model:**
- Uses a two-body Keplerian model (spacecraft + Earth or spacecraft + Moon)
- No realistic orbital insertion maneuvers (assumes instantaneous velocity changes)
- Does not model thrust profiles, fuel consumption, or propulsion systems
- No station-keeping or orbit maintenance maneuvers

**Missing Gravitational Influences:**
- Multi-body gravitational effects (Sun-Earth-Moon three-body problem)
- Earth's oblateness (J2, J3, J4 perturbations)
- Solar radiation pressure
- Atmospheric drag (even in highly elliptical Earth orbits)
- Lunar mascons and gravitational anomalies

**Idealized Transfers:**
- TLI (Trans-Lunar Injection) modeled as instantaneous velocity change at perigee
- LOI (Lunar Orbit Insertion) not explicitly modeled
- No mid-course corrections or trajectory adjustments
- Capture detection based on simple distance threshold

**Educational Purpose:**
This tool helps students and enthusiasts understand:
- **Why** certain orbital parameters (RAAN, AOP, inclination) are chosen
- Geometric relationships between Earth, Moon, and spacecraft orbits
- Constraints imposed by landing site illumination requirements
- Backwards mission design methodology
- Visualization of osculating orbital elements

**For Professional Mission Planning:**
Real mission design requires professional tools like GMAT (General Mission Analysis Tool), STK (Systems Tool Kit), or Copernicus, which include:
- High-fidelity force models
- Numerical integration of equations of motion
- Optimization algorithms for trajectory design
- Propulsion system modeling
- Navigation and guidance algorithms

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
- **Guided Tours:** driver.js (wizard walkthroughs)
- **Build Tool:** Vite (multi-page configuration)
- **Testing:** Vitest (unit tests), Playwright (E2E tests)
- **State Persistence (Wizard):** localStorage with versioning
- **Configuration:** JSON files for landing page and help system content

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

## 12. Code Architecture

### 12.1 File Structure

```
cy3-orbit/
├── index.html               # Landing page entry point
├── explorer.html            # Explorer app entry point
├── designer.html            # Legacy Designer app entry point
├── wizard.html              # Mission Design Wizard entry point
├── index-old.html           # Backup of original three-mode app
├── src/
│   ├── landing.ts           # Landing page entry point
│   ├── landing.css          # Landing page styling
│   ├── landing-config.json  # Landing page configuration
│   ├── explorer.ts          # Explorer app entry (Explore mode only)
│   ├── designer.ts          # Designer app entry (Plan + Game modes)
│   ├── main.ts              # Original three-mode app (kept for reference)
│   ├── style.css            # Application styles
│   ├── constants.ts         # Application-wide constants
│   ├── events.ts            # Event bus implementation
│   ├── optimization.ts      # Optimization algorithms
│   ├── launchEventSetters.ts    # Launch event update functions
│   ├── launchEventComputed.ts   # Computed launch event values
│   ├── types.ts             # TypeScript type definitions
│   ├── types/
│   │   ├── astronomy-engine.d.ts  # Astronomy engine type declarations
│   │   └── lil-gui.d.ts           # lil-gui type declarations
│   ├── ui/
│   │   └── dialog.ts        # UI dialog components
│   └── wizard/              # Mission Design Wizard (separate application)
│       ├── wizard-entry.ts  # Wizard app entry point
│       ├── wizard.css       # Wizard-specific styling
│       ├── WizardController.ts  # Main wizard controller/state machine
│       ├── help-config.json # Help system configuration
│       ├── steps/           # Wizard step implementations
│       │   ├── LandingSiteStep.ts     # Step 1: Select landing site (reordered)
│       │   ├── LandingWindowStep.ts   # Step 2: Choose landing window (reordered)
│       │   ├── MissionWindowStep.ts   # Step 3: Select mission window (reordered)
│       │   └── LOIDateStep.ts         # Step 4: Optimize LOI date
│       ├── components/      # Wizard UI components
│       │   ├── MoonGlobeView.ts       # 3D Moon globe with landing sites
│       │   ├── SiteMarkers.ts         # Landing site markers on globe
│       │   ├── SunIlluminationPanel.ts # Sun elevation visualization
│       │   ├── HelpPanel.ts           # Context-sensitive help system
│       │   ├── WalkthroughManager.ts  # Guided UI walkthroughs (driver.js)
│       │   ├── OrbitVisualizationPanel.ts  # Complete orbit visualization
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
│   │   └── wizard/          # Wizard unit tests
│   └── e2e/                 # E2E tests (Playwright)
│       ├── e2e-wizard-demo.test.ts    # Wizard workflow tests
│       ├── e2e-mode-transitions.test.ts
│       └── ...
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TESTING.md
│   └── specs/
│       └── spec.md          # This file (comprehensive specification)
├── .pre-commit-config.yaml # Pre-commit hooks configuration
├── eslint.config.js        # ESLint configuration
├── playwright.config.ts    # Playwright configuration
├── vitest.config.ts        # Unit test configuration
├── vite.config.js          # Vite multi-page build configuration
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

## 13. Testing Strategy

### 13.1 Unit Tests (Vitest)

**Coverage:** 152 tests across 9 test files

**Test Categories:**
- Orbital calculation functions
- Coordinate transformations (RA ↔ True Anomaly conversions)
- Kepler solver accuracy
- Event bus functionality
- Setter function behavior
- Optimization algorithms (LOI date finding, apogee optimization)
- Wizard calculations (sun elevation, landing windows)

**Example Tests:**
- `computeOrbitalParams()` returns correct values
- `keplerSolver()` converges to correct eccentric anomaly
- Event emission triggers handlers
- Cache invalidation works correctly
- RA↔True Anomaly conversions handle inclined orbits correctly
- Sun elevation calculations match mission data

### 13.2 End-to-End Tests (Playwright)

**Coverage:** 59 tests across 9 test files

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

3. **Wizard Workflow** (`e2e-wizard-demo.test.ts`)
   - Complete 4-step wizard flow
   - Landing site selection
   - Sun elevation window selection
   - LOI date optimization

4. **Error Handling** (`e2e-error-handling.test.ts`)
   - Invalid parameter validation
   - Draft state warnings
   - Missing launch event handling
   - Boundary condition testing

5. **Visual Verification** (`e2e-visual-verification.test.ts`)
   - UI element rendering
   - Visualization accuracy
   - Animation playback

### 13.3 Test Configuration

**Single Playwright Config with Projects** (`playwright.config.ts`):

| Project | Pattern | Tests | Time | Use Case |
|---------|---------|-------|------|----------|
| `default` | `e2e-.+.test.ts` | All | ~5m | Comprehensive |
| `fast` | `e2e-(simple\|exact\|behaviors\|workflow\|modes).test.ts` | 33 | ~2m | CI, pre-commit |
| `slow` | `e2e-.+.test.ts` | 49 | ~5m | Releases |

### 13.4 npm Test Scripts

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

## 14. Code Quality & Linting

### 14.1 ESLint Configuration

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

### 14.2 Pre-commit Hooks

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

### 14.3 Code Organization Principles

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

## 15. Configuration & Constants

### 15.1 Physical Constants

Defined in `src/constants.ts`:

```typescript
const EARTH_RADIUS = 6371; // km
const MOON_RADIUS = 1737; // km
const EARTH_MU = 398600.4418; // km³/s² (gravitational parameter)
const SPHERE_RADIUS = 100; // Celestial sphere radius (arbitrary units)
const LUNAR_ORBIT_DISTANCE = 384400; // km (average Earth-Moon distance)
const SCALE_FACTOR = SPHERE_RADIUS / LUNAR_ORBIT_DISTANCE; // Visual scale conversion
```

### 15.2 Rendering Constants

Defined in `src/constants.ts`:

```typescript
const ORBIT_SEGMENTS_DETAILED = 512; // Ellipse path smoothness (high detail)
const ORBIT_SEGMENTS_STANDARD = 128; // Standard detail level
const SPRITE_CANVAS_SIZE = 128; // Sprite texture resolution
const SPRITE_FONT_SIZE = 80; // Font size for angle labels

// Camera configuration
const CAMERA_FOV = 45; // degrees
const CAMERA_INITIAL_X = 240;
const CAMERA_INITIAL_Y = 160;
const CAMERA_INITIAL_Z = 240;
const CAMERA_NEAR_PLANE = 0.1;
const CAMERA_FAR_PLANE = 10000;

// Zoom-aware scaling
const ZOOM_BASE_DISTANCE = 240;
const ZOOM_ARIES_MIN_SCALE = 0.2;
const ZOOM_ARIES_MAX_SCALE = 0.8;
const ZOOM_NODE_MIN_SCALE = 0.3;
const ZOOM_NODE_MAX_SCALE = 1.5;
const ZOOM_SPACECRAFT_MIN_SCALE = 0.5;
const ZOOM_SPACECRAFT_MAX_SCALE = 2.0;

// Sprite base sizes
const ARIES_MARKER_BASE_SIZE = 8;
```

### 15.3 Default Mission Parameters

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

### 15.4 GUI Configuration

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

## 16. Browser Compatibility

### 16.1 Supported Browsers

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

### 16.2 Responsive Design

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

## 17. Deployment

### 17.1 Build Process

**Development:**
```bash
npm run dev    # Start Vite dev server (port 3002, no auto-open)
```

**Production Build:**
```bash
npm run build  # TypeScript compilation + Vite build
```

**Output:**
- `dist-pages/` folder with optimized static files (configured for GitHub Pages)
- Minified JavaScript
- Optimized assets
- Source maps for debugging

### 17.2 GitHub Actions Workflow

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

### 17.3 GitHub Pages Deployment

**Configuration:**
- Branch: `gh-pages`
- Base path: `./' (relative paths)
- Output directory: `dist-pages/`
- Multi-page build with four HTML entry points
- Asset paths configured in `vite.config.js`

**URL:** `https://<username>.github.io/cy3-orbit/`

---

## 18. Future Enhancements

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

## 19. Known Limitations

**See also: Section 1.0 - Educational Tool Disclaimer for comprehensive overview of limitations.**

### 19.1 Physics and Orbital Mechanics Simplifications

1. **Simplified Physics Model:**
   - Two-body Keplerian model (Earth-spacecraft or Moon-spacecraft)
   - Point-mass gravity approximation for both Earth and Moon
   - No multi-body gravitational effects (Sun-Earth-Moon three-body problem)
   - No perturbations:
     - Earth oblateness (J2, J3, J4 harmonics)
     - Lunar mascons and gravitational anomalies
     - Solar radiation pressure
     - Third-body perturbations from Sun
   - No atmospheric drag (important for highly elliptical Earth orbits)
   - No relativistic effects

2. **Idealized Maneuvers:**
   - TLI (Trans-Lunar Injection) modeled as instantaneous velocity change
   - No realistic thrust profiles or burn durations
   - No fuel consumption modeling or propulsion system characteristics
   - LOI (Lunar Orbit Insertion) not explicitly modeled
   - No mid-course corrections or trajectory control maneuvers
   - No station-keeping or orbit maintenance

3. **Simplified Capture Detection:**
   - Based on simple distance threshold (default: 5,000 km)
   - Does not model sphere of influence transitions
   - No orbital energy or velocity considerations
   - No bound/unbound orbit determination

4. **Osculating Elements:**
   - Orbital elements treated as fixed (not time-varying due to perturbations)
   - No numerical integration of equations of motion
   - Keplerian elements assumed constant between maneuvers

### 19.2 Performance Limitations

1. **Computational:**
   - Large timeline scrubbing may lag on low-end devices
   - Real-time ephemeris calculations add computational overhead
   - Many simultaneous visualizations (all toggles on) may reduce FPS
   - No GPU acceleration for orbital calculations

2. **Rendering:**
   - Maximum 512 segments for orbit paths (trade-off between smoothness and performance)
   - Large zoom ranges may cause marker visibility issues

### 19.3 Accuracy Limitations

1. **Lunar Ephemeris:**
   - Limited to astronomy-engine precision (typically ~1 km position accuracy)
   - No custom ephemeris data import
   - Fixed lunar orbital element model (18.3°-28.6° inclination range)

2. **Timeline:**
   - 90-day maximum timeline duration (arbitrary limit)
   - Fixed time step for animation (no adaptive stepping)

### 19.4 UI/UX Limitations

1. **User Interface:**
   - No undo/redo for parameter changes
   - Limited mobile touch gesture support
   - No keyboard shortcuts for common actions
   - No parameter bookmarking or presets (except wizard state persistence)

2. **Visualization:**
   - Fixed camera controls (no predefined viewpoints beyond manual positioning)
   - No animation export or recording capability
   - Limited customization of visual appearance

3. **Integration:**
   - Wizard results cannot be directly exported to Legacy Designer (planned future enhancement)
   - No mission data export to standard formats (GMAT scripts, STK scenarios, etc.)

### 19.5 What This Tool Is NOT

This tool is **not suitable for**:
- Actual mission planning or operational trajectory design
- High-fidelity mission analysis requiring numerical integration
- Fuel budget calculations or propulsion system sizing
- Navigation and guidance algorithm development
- Mission risk assessment or failure mode analysis
- Regulatory compliance or safety certification

**For professional use:** See GMAT, STK, Copernicus, or similar mission analysis tools.

---

## 20. License and Attribution

**Project License:** [Specify license]

**Third-Party Libraries:**
- Three.js - MIT License
- lil-gui - MIT License
- astronomy-engine - MIT License
- driver.js - MIT License
- Vite - MIT License
- Vitest - MIT License
- Playwright - Apache 2.0 License
- TypeScript - Apache 2.0 License

---

## 21. Appendix: Glossary

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

# Part II: Mission Design Wizard

---

## 22. Mission Design Wizard Overview

### 22.1 Purpose

Enhance the application to support **backwards mission design** - the methodology actually used by ISRO for Chandrayaan-3. Instead of users manually setting orbital parameters, the wizard guides them through a realistic mission design flow starting from landing site selection.

### 22.2 Design Philosophy

The actual Chandrayaan-3 mission design worked backwards:

```
Landing Site Selection
         ↓
Sun Illumination Constraints (6°-9° elevation)
         ↓
Candidate Landing Windows (monthly opportunities)
         ↓
Required Lunar Orbit RAAN for each window
         ↓
LOI Date (Moon's nodal crossings)
         ↓
TLI Date (half orbital period before LOI)
         ↓
Launch Window
```

This wizard implements this flow, making mission planning educational and realistic.

### 22.3 Iteration Plan

| Iteration | Deliverable | User Value |
|-----------|-------------|------------|
| **0** | **Sun elevation PoC** | **Algorithm validated against CY2/CY3 papers** |
| 1 | Moon globe + site selector | Visual site selection |
| 2 | Sun illumination UI | See valid landing windows |
| 3 | Landing window selection | Pick landing date |
| 4 | LOI date computation | Automatic LOI selection |
| 5 | Full wizard integration | Complete backwards design flow |

### 22.4 Scope Constraints

**In Scope:**
- Chandrayaan series missions (CY2, CY3)
- South polar landing sites
- Polar orbits (90° inclination)
- Near-side sites only (longitude -90° to +90°)

**Out of Scope:**
- Far side landing sites (no direct Earth comms)
- Non-polar inclinations
- AOP launch vehicle constraints
- Multiple saved missions
- Export/import functionality

---

## 23. Wizard Design Philosophy

### 23.1 Backwards vs. Forward Design

**Traditional approach (Main App):**
- Adjust orbital parameters → See if trajectory reaches Moon

**Wizard approach:**
- Choose landing site → Find when Sun is optimal → Calculate required orbital parameters

**Educational Value:**
- Teaches **why** specific orbital parameters are chosen
- Demonstrates real mission planning constraints
- Shows relationship between landing requirements and orbital geometry

---

## 24. Wizard User Flow

### 24.1 Navigation: Hybrid View

The wizard uses a hybrid navigation with breadcrumb (top) and collapsible tree (sidebar):

```
┌──────────────────────────────────────────────────────────────────┐
│ CY3 (2023) → Shiv Shakti → Aug 23 → [LOI] → Review              │
│     ✓            ✓           ✓        ●                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────┐                                           │
│ │ ▼ Mission Path    │  ┌────────────────────────────────────┐   │
│ │                   │  │                                    │   │
│ │ ● Time Window     │  │         [Step Content Area]        │   │
│ │ │ CY3 (2023)     │  │                                    │   │
│ │ │                 │  │                                    │   │
│ │ └● Site           │  │                                    │   │
│ │  │ Shiv Shakti   │  │                                    │   │
│ │  │               │  │                                    │   │
│ │  └● Window       │  │                                    │   │
│ │   │ Aug 23       │  │                                    │   │
│ │   │              │  │                                    │   │
│ │   └● LOI ← here  │  │                                    │   │
│ │    │             │  │                                    │   │
│ │    └○ Review     │  │                                    │   │
│ │                   │  │                                    │   │
│ │ [▲ Collapse]      │  └────────────────────────────────────┘   │
│ └───────────────────┘                                           │
│                                                                  │
│                                [← Back]  [Cancel]  [Next →]      │
└──────────────────────────────────────────────────────────────────┘
```

**Features:**
- **Breadcrumb (top)**: Always visible, compact, clickable
- **Tree (sidebar)**: Collapsible, shows full details, clickable nodes
- Clicking either navigates to that step
- Downstream selections cleared when earlier step changes

**State Flow:**
```
Step 1 change → clears Steps 2-5
Step 2 change → recomputes availableWindows, clears Steps 3-5
Step 3 change → recomputes availableLOIDates, clears Steps 4-5
Step 4 change → recomputes TLI date
```

---

## 25. Wizard Steps

### 25.1 Step 1: Mission Time Window

**Purpose:** Set the overall time range for mission planning.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 1: Mission Time Window                          [1/5 ●○○○○]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Select a time range for mission planning:                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ● Chandrayaan-3 (2023)                                    │  │
│  │    March 2023 - October 2023                               │  │
│  │                                                            │  │
│  │  ○ Chandrayaan-2 (2019)                                    │  │
│  │    January 2019 - September 2019                           │  │
│  │                                                            │  │
│  │  ○ Custom Range                                            │  │
│  │    Start: [________] End: [________]                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ℹ️  The time window determines available landing opportunities. │
│      Lunar landing windows occur roughly once per month when     │
│      sun elevation at the landing site is 6°-9°.                │
│                                                                  │
│                                         [Cancel]  [Next →]       │
└──────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Presets only set time range (no impact on site selection)
- Custom range allows any dates (for hypothetical/future missions)
- Minimum range: 1 month
- Maximum range: 12 months

---

### 25.2 Step 2: Landing Site Selection

**Purpose:** Select where on the Moon to land.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 2: Landing Site                                 [2/5 ○●○○○]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐ │
│  │                             │  │ Crosshair: -69.37°S 32.32°E│ │
│  │    ○ CY2-B                  │  │ ⚡ Near: Shiv Shakti Point  │ │
│  │         ○ CY2-P             │  │                            │ │
│  │              ● Shiv Shakti  │  │ [Set as Primary]           │ │
│  │              ○ CY3-P        │  │ [Set as Backup]            │ │
│  │                ○ CY3-B      │  │                            │ │
│  │          +                  │  │ ────────────────────────── │ │
│  │      [South Pole View]      │  │ Primary: (none)            │ │
│  │                             │  │                            │ │
│  │                             │  │ ☐ Add backup site          │ │
│  └─────────────────────────────┘  │                            │ │
│                                   │ ────────────────────────── │ │
│  Rotate: drag | Zoom: scroll      │ Settings:                  │ │
│                                   │  ☑ Snap to nearby sites    │ │
│                                   │  Snap radius: [2°  ▾]      │ │
│                                   │                            │ │
│                                   │ Presets: [CY3 ▾]           │ │
│                                   └────────────────────────────┘ │
│                                                                  │
│                                [← Back]  [Cancel]  [Next →]      │
└──────────────────────────────────────────────────────────────────┘
```

**Moon Globe View:**
- Default camera: Above South Pole (looking down at -90° latitude)
- NASA/USGS public domain texture
- Adaptive lat/lon grid (30° → 10° → 5° → 1° based on zoom)

**Site Selection UX - Crosshair Mode:**
- Fixed crosshair at viewport center
- Rotate/zoom globe to position target under crosshair
- Live coordinates update as globe rotates
- Click "Set as Primary" or "Set as Backup" to confirm

**Site Markers on Globe:**
- Small labeled markers at each preset site position
- Hover: Shows tooltip with full name, coordinates, description
- Abbreviated labels on globe (CY3-P, CY3-B, CY2-P, CY2-B, Shiv Shakti)

**Snap Behavior:**
```
Crosshair distance to site:
  > snap radius → No snap, use exact crosshair coordinates
  ≤ snap radius → Show "⚡ Near: [name]", clicking "Set" snaps to exact site coords
```

**Snap Configuration:**
- Default: Snap enabled, 2° radius
- Options: 1° | 2° | 5° | Off
- Setting persists via localStorage

**Far Side Constraint:**
```typescript
if (Math.abs(longitude) > 90) {
  showError('Far side sites not supported (no direct Earth comms)');
  return false;
}
```

**Validation:**
- Must have at least primary site selected
- Latitude: -90° to +90°
- Longitude: -90° to +90° (near side only)

---

### 25.3 Step 3: Landing Window Selection

**Purpose:** Show dates when sun elevation at the site is 6°-9°.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 3: Landing Window                               [3/5 ○○●○○]│
│  Site: Shiv Shakti Point (-69.37°S, 32.32°E)                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Valid landing windows (Sun elevation 6°-9°):                    │
│                                                                  │
│  2023                                                            │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐              │
│  │ Mar │ Apr │ May │ Jun │ Jul │ Aug │ Sep │ Oct │              │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤              │
│  │  28 │  24 │  26 │  24 │  24 │[●23]│  21 │  20 │              │
│  │     │     │     │     │     │     │     │     │              │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘              │
│                          ▲                                       │
│                     Selected                                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Selected: August 23, 2023 (Primary: Shiv Shakti)           │  │
│  │                                                            │  │
│  │ Window details:                                            │  │
│  │   Start:      Aug 22, 18:04 UT                            │  │
│  │   End:        Aug 24, 06:12 UT                            │  │
│  │   Duration:   36 hours                                     │  │
│  │   Peak sun:   7.5° (Aug 23, 12:00 UT)                     │  │
│  │   Req. RAAN:  262°                                        │  │
│  │                                                            │  │
│  │ ℹ️ Backup site (CY3 Backup) window opens ~Aug 25-26        │  │
│  │   Available if primary landing is not achieved             │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ℹ️  Sun at 6°-9° provides optimal lighting for descent imaging │
│      while avoiding harsh shadows or thermal extremes.           │
│                                                                  │
│                                [← Back]  [Cancel]  [Next →]      │
└──────────────────────────────────────────────────────────────────┘
```

**Window Details:**
| Field | Description |
|-------|-------------|
| Start/End | When sun elevation enters/exits 6°-9° range |
| Duration | How long the window stays open |
| Peak sun | Maximum elevation and when it occurs |
| Req. RAAN | Required lunar orbit RAAN |

**Backup Site Warning:**
- If backup site selected, shows when backup window opens (~2-3 days after primary)
- Informational only, does not affect primary window selection

**Validation:**
- Must select one landing window to proceed

---

### 25.4 Step 4: LOI Date Selection

**Purpose:** Select when to perform Lunar Orbit Insertion.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 4: LOI Date                                     [4/5 ○○○●○]│
│  Landing: Aug 23, 2023 | Required RAAN: 262°                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Compatible LOI opportunities:                                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ● Aug 5, 2023 13:42 UT                    [Recommended]   │  │
│  │   Moon distance:    372,206 km (closer = less ΔV)         │  │
│  │   Node type:        Descending                            │  │
│  │   Days to landing:  17.5 days                             │  │
│  │   Computed TLI:     Jul 31, 2023 ~18:30 UT               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ○ Jul 22, 2023 08:15 UT                                   │  │
│  │   Moon distance:    398,450 km                            │  │
│  │   Node type:        Ascending                             │  │
│  │   Days to landing:  32 days                               │  │
│  │   Computed TLI:     Jul 17, 2023 ~04:00 UT               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ○ Aug 18, 2023 19:30 UT                                   │  │
│  │   Moon distance:    365,800 km                            │  │
│  │   Node type:        Ascending                             │  │
│  │   Days to landing:  4.5 days (tight margin)              │  │
│  │   Computed TLI:     Aug 14, 2023 ~06:00 UT               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ℹ️  Moon crosses equator every ~13.7 days. Closer Moon         │
│      distance means lower fuel cost for orbit insertion.         │
│                                                                  │
│                                [← Back]  [Cancel]  [Next →]      │
└──────────────────────────────────────────────────────────────────┘
```

**LOI Candidate Details:**
| Field | Description |
|-------|-------------|
| Date/Time | When Moon crosses equatorial plane |
| Moon distance | Center-to-center Earth-Moon distance |
| Node type | Ascending (S→N) or Descending (N→S) |
| Days to landing | Time for lunar orbit operations |
| Computed TLI | Auto-calculated: LOI - (transfer orbit period / 2) |

**Ranking Logic:**
- Primary: Moon distance (closer = recommended)
- Secondary: Days to landing (≥10-15 days preferred)
- Warning if margin < 10 days ("tight margin")

**Validation:**
- Must select one LOI date to proceed

---

### 25.5 Step 5: Review & Confirm

**Purpose:** Summary of all computed mission parameters.

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 5: Mission Summary                              [5/5 ○○○○●]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ LANDING                                                     │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Site:        Shiv Shakti Point                              │ │
│  │ Coordinates: 69.37°S, 32.32°E                               │ │
│  │ Date:        Aug 23, 2023 ~12:00 UT                         │ │
│  │ Sun elev:    7.2°                                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ LUNAR ORBIT                                                 │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ RAAN (Ω):     262°                                          │ │
│  │ Inclination:  90° (polar)                                   │ │
│  │ Target alt:   100 km circular (post-LOI)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ LOI (Lunar Orbit Insertion)                                 │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Date:        Aug 5, 2023 13:42 UT                           │ │
│  │ Moon dist:   372,206 km                                     │ │
│  │ Node type:   Descending                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ TLI (Trans-Lunar Injection)                                 │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Date:        Jul 31, 2023 18:32 UT                          │ │
│  │ Perigee:     180 km                                         │ │
│  │ Apogee:      ~372,000 km                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ LAUNCH WINDOW                                               │ │
│  │ ─────────────────────────────────────────────────────────── │ │
│  │ Range:       Jul 12-19, 2023                                │ │
│  │ Nominal:     Jul 14, 2023 09:21 UT                          │ │
│  │ Injection:   i=21.3°, Ω=8.8°, ω=178.1°                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ☑ Compare with actual CY3 mission data                         │
│                                                                  │
│                     [← Back]  [Cancel]  [Create Mission]         │
└──────────────────────────────────────────────────────────────────┘
```

**On "Create Mission":**
1. Creates launch event with computed TLI parameters
2. Clears wizard state from localStorage
3. Switches to Plan mode with event loaded
4. User can fine-tune parameters if needed

**Comparison View (when checked):**
```
┌─────────────────────────────────────────────────────┐
│ Parameter      │ Computed    │ Actual CY3      │
│────────────────┼─────────────┼─────────────────│
│ TLI Date       │ Jul 31      │ Jul 31 ✓        │
│ LOI Date       │ Aug 5       │ Aug 5  ✓        │
│ Landing        │ Aug 23      │ Aug 23 ✓        │
│ Lunar RAAN     │ 262°        │ 262°   ✓        │
└─────────────────────────────────────────────────────┘
```

---

## 26. Wizard Algorithms

### 26.1 Sun Illumination Calculator

**Purpose:** Calculate when sun elevation at landing site is 6°-9°.

**Algorithm:**
```
1. Compute Sun altitude at landing site (lat, lon) for datetime
   - astronomy-engine gives Sun position relative to Moon
   - Transform to selenographic coordinates
   - Compute altitude angle at site

2. Find crossings via iterative method (bisection)
   - Find times when: sun_altitude(t) = 6°
   - Find times when: sun_altitude(t) = 9°
   - Pair crossings to form windows
```

**Finding Windows:**
```
For mission time range:
  1. Coarse scan: sample every 12 hours to find approximate regions
  2. Fine search: use bisection to find exact crossing times
     - f(t) = sun_altitude(t) - threshold
     - Find roots for threshold = 6° and threshold = 9°
  3. Pair crossings: 6° rise → 9° rise → 9° fall → 6° fall
```

**Performance:**
- Coarse scan: ~480 samples (8 months × 2/day)
- Bisection: ~10-15 iterations per crossing
- Total: <100ms

### 26.2 Proof of Concept - Algorithm Validation

**Purpose:** Validate sun elevation algorithm before UI work.

**File:** `src/wizard/poc/sun-elevation-poc.ts`

**Inputs:**
- CY3 sites: Shiv Shakti (-69.37°S, 32.32°E), Backup (-69.50°S, -17.33°W)
- CY2 sites: Primary (-70.90°S, 22.78°E), Backup (-67.75°S, -18.47°W)
- Time ranges: CY3 (Mar-Oct 2023), CY2 (Jan-Sep 2019)

**Validation Criteria:**
- Computed windows match paper dates within ±1 day
- Sun elevation at landing time falls within 6°-9°
- Monthly pattern matches (one window per ~29.5 day lunar cycle)

**Expected Results:**
| Mission | Site | Expected Landing | Sun Elev |
|---------|------|------------------|----------|
| CY3 | Primary | Aug 22-23, 2023 | 6°-9° |
| CY3 | Backup | Aug 20-21, 2023 | 6°-9° |
| CY2 | Primary | Sep 6-7, 2019 | 6°-9° |
| CY2 | Backup | Sep 5-6, 2019 | 6°-9° |

### 26.3 LOI Date Computation

**Status:** Already implemented in `src/optimization.ts`

**Existing Functions:**
| Function | Purpose |
|----------|---------|
| `findMoonEquatorCrossings(start, end)` | Finds Moon's equator crossings via declination root-finding |
| `findOptimalLOIDates(start, end)` | Returns array of LOI candidate dates |
| `calculateMoonPositionAtDate(date)` | Gets Moon distance at any date |
| `optimizeApogeeToMoonMultiStart(...)` | Full RAAN/apogee optimization |

**New wrapper needed:**
```typescript
export function getLOICandidates(startDate: Date, endDate: Date): LOICandidate[] {
  const dates = findOptimalLOIDates(startDate, endDate);
  return dates.map(date => ({
    date,
    moonDistance: getMoonDistance(date),
    nodeType: getNodeType(date),
  }));
}
```

### 26.4 Required RAAN Calculation

From the CY3 paper (Equation 1):
```
θS = θR + θ
```
Where:
- θS = Required RAAN of lunar orbit
- θR = Moon's sidereal angle (from ephemeris)
- θ = Landing site longitude (Moon-fixed)

---

## 27. Wizard Technical Architecture

### 27.0 Help System and Guided Walkthroughs

**Help Panel** (`src/wizard/components/HelpPanel.ts`):
- Context-sensitive help displayed for each wizard step
- Toggleable panel with step-specific content
- Configuration loaded from `help-config.json`
- Content includes:
  - Step overview and objectives
  - Detailed explanations of controls and features
  - Tips for optimal mission design
  - References to mission documentation

**Walkthrough Manager** (`src/wizard/components/WalkthroughManager.ts`):
- Interactive guided tours using driver.js library
- Step-by-step UI element highlighting and explanations
- Configurable tour sequences for each wizard step
- Features:
  - Spotlight effect on active elements
  - Progress indicators
  - Skip/complete options
  - Persistent tour completion state

**Help Configuration** (`help-config.json`):
- Structured JSON containing all help content
- Organized by wizard step
- Includes driver.js tour definitions
- Version-controlled for consistency

**Integration:**
- Help button in wizard header toggles help panel
- Context automatically updates when step changes
- Walkthrough triggered on first visit to each step (optional)
- Styling customizations for driver.js (font size, padding)

### 27.1 File Structure

```
src/wizard/
├── MissionDesignWizard.ts      # Main wizard controller
├── WizardState.ts              # State management
├── steps/
│   ├── MissionWindowStep.ts    # Step 1: Time range
│   ├── LandingSiteStep.ts      # Step 2: Site selection
│   ├── LandingWindowStep.ts    # Step 3: Window selection
│   ├── LOISelectionStep.ts     # Step 4: LOI date
│   └── ReviewStep.ts           # Step 5: Summary
├── components/
│   ├── MoonGlobeView.ts        # Interactive Moon (Three.js)
│   ├── AdaptiveGrid.ts         # Lat/lon grid overlay
│   ├── SiteMarkers.ts          # Preset site markers + snap
│   ├── Breadcrumb.ts           # Top navigation
│   ├── DecisionTree.ts         # Sidebar tree view
│   └── WindowCalendar.ts       # Landing window calendar
├── calculations/
│   ├── sunElevation.ts         # Sun position at site
│   └── landingWindows.ts       # Find valid windows
├── data/
│   └── landing-sites.json      # Preset sites config
└── poc/
    └── sun-elevation-poc.ts    # Iteration 0 validation
```

**Reused from existing code:**
- `optimization.ts` → LOI dates, Moon position, orbital period
- `events.ts` → Event bus for state updates
- `launchEventSetters.ts` → Creating launch event on wizard completion

### 27.2 State Management

```typescript
interface WizardState {
  // Navigation
  currentStep: 1 | 2 | 3 | 4 | 5;

  // Step 1: Mission Window
  missionPreset: 'cy3' | 'cy2' | 'custom';
  missionStartDate: Date;
  missionEndDate: Date;

  // Step 2: Landing Site
  primarySite: LandingSite | null;
  secondarySite: LandingSite | null;
  snapEnabled: boolean;
  snapRadius: number;

  // Step 3: Landing Window
  availableWindows: LandingWindow[];
  selectedWindow: LandingWindow | null;

  // Step 4: LOI
  availableLOIDates: LOICandidate[];
  selectedLOI: LOICandidate | null;

  // Computed
  computedTLIDate: Date | null;
  computedLaunchWindow: DateRange | null;
}

interface LandingSite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isPreset: boolean;
}

interface LandingWindow {
  startDate: Date;
  endDate: Date;
  peakElevation: number;
  peakTime: Date;
  duration: number;
  requiredRaan: number;
}

interface LOICandidate {
  date: Date;
  moonDistance: number;
  nodeType: 'ascending' | 'descending';
  daysToLanding: number;
}
```

### 27.3 State Persistence

**Storage:**
- Mechanism: `localStorage`
- Key: `cy3-orbit:wizard-state`
- Format: JSON with timestamp

```typescript
interface PersistedWizardState {
  savedAt: number;  // Date.now()
  version: 1;       // for future migrations
  state: WizardState;
}
```

**Lifecycle:**
| Event | Action |
|-------|--------|
| Step change | Save to localStorage |
| "Continue" (resume) | Load from localStorage |
| "Start Fresh" | Clear localStorage, init new |
| "Cancel" | Keep saved (can resume later) |
| "Create Mission" | Clear localStorage |
| State >30 days old | Auto-clear on open |

**Resume Dialog:**
```
┌────────────────────────────────────────────────────────────┐
│ ⚠️ Resuming saved progress from Jan 15, 2025              │
│ [Continue] [Start Fresh]                                   │
└────────────────────────────────────────────────────────────┘
```

### 27.4 Event Integration

**New Wizard Events:**
```typescript
type WizardEventKey =
  | 'wizard:open'
  | 'wizard:close'
  | 'wizard:stepChange'
  | 'wizard:siteSelected'
  | 'wizard:windowSelected'
  | 'wizard:loiSelected'
  | 'wizard:complete';
```

**Integration with Existing Events:**
```typescript
events.on('wizard:complete', ({ launchEvent }) => {
  setLaunchEventDate(launchEvent.tliDate);
  setLaunchEventMoonInterceptDate(launchEvent.loiDate);
  setLaunchEventRaan(launchEvent.raan);
  setLaunchEventInclination(launchEvent.inclination);
  setLaunchEventApogeeAlt(launchEvent.apogeeAlt);
});
```

### 27.5 Preset Sites Configuration

**File:** `src/wizard/data/landing-sites.json`

```json
{
  "sites": [
    {
      "id": "cy3-actual",
      "name": "Shiv Shakti Point",
      "mission": "cy3",
      "missionYear": 2023,
      "latitude": -69.3733,
      "longitude": 32.3191,
      "description": "Actual CY3 landing site (Aug 23, 2023)"
    },
    {
      "id": "cy3-primary",
      "name": "CY3 Primary (Planned)",
      "mission": "cy3",
      "missionYear": 2023,
      "latitude": -69.3676,
      "longitude": 32.3481,
      "description": "Originally planned primary site"
    },
    {
      "id": "cy3-backup",
      "name": "CY3 Backup",
      "mission": "cy3",
      "missionYear": 2023,
      "latitude": -69.4977,
      "longitude": -17.3304,
      "description": "CY3 backup landing site"
    },
    {
      "id": "cy2-primary",
      "name": "CY2 Primary (Planned)",
      "mission": "cy2",
      "missionYear": 2019,
      "latitude": -70.90,
      "longitude": 22.78,
      "description": "Chandrayaan-2 planned landing site"
    },
    {
      "id": "cy2-backup",
      "name": "CY2 Backup",
      "mission": "cy2",
      "missionYear": 2019,
      "latitude": -67.75,
      "longitude": -18.47,
      "description": "CY2 backup landing site"
    }
  ]
}
```

---

## 28. Wizard Testing Strategy

### 28.1 Test Layers

| Layer | Tool | What to Test |
|-------|------|--------------|
| PoC | Vitest | Sun elevation algorithm vs CY2/CY3 papers |
| Unit | Vitest | Calculations, state transitions, data transforms |
| E2E | Playwright | Full wizard flow, UI interactions |

### 28.2 PoC Tests (Iteration 0)

```typescript
// tests/unit/sun-elevation.test.ts

describe('Sun Elevation PoC', () => {
  test('CY3 primary site has Aug 22-23 window', () => {
    const windows = findLandingWindows(
      { lat: -69.37, lon: 32.32 },
      new Date('2023-03-01'),
      new Date('2023-10-31')
    );
    const augWindow = windows.find(w => w.peakTime.getMonth() === 7);
    expect(augWindow.peakTime.getDate()).toBeCloseTo(23, 1);
  });

  test('CY2 primary site has Sep 6-7 window', () => {
    const windows = findLandingWindows(
      { lat: -70.90, lon: 22.78 },
      new Date('2019-01-01'),
      new Date('2019-09-30')
    );
    const sepWindow = windows.find(w => w.peakTime.getMonth() === 8);
    expect(sepWindow.peakTime.getDate()).toBeCloseTo(6, 1);
  });

  test('Sun elevation within 6-9 degrees at landing time', () => {
    const elevation = calculateSunElevation(
      { lat: -69.37, lon: 32.32 },
      new Date('2023-08-23T12:00:00Z')
    );
    expect(elevation).toBeGreaterThanOrEqual(6);
    expect(elevation).toBeLessThanOrEqual(9);
  });
});
```

### 28.3 Unit Tests

```
tests/unit/wizard/
├── sun-elevation.test.ts      # PoC validation
├── landing-windows.test.ts    # Window detection
├── wizard-state.test.ts       # State transitions
├── site-snap.test.ts          # Snap logic
└── storage.test.ts            # localStorage handling
```

### 28.4 E2E Tests

```
tests/e2e/wizard/
├── happy-path.spec.ts         # Complete CY3 flow
├── navigation.spec.ts         # Back, breadcrumb, tree clicks
├── site-selection.spec.ts     # Globe, crosshair, presets, snap
├── resume.spec.ts             # Close and resume from storage
└── validation.spec.ts         # Error states, required fields
```

### 28.5 Validation Matrix

| Test Case | Expected | Source |
|-----------|----------|--------|
| CY3 landing window | Aug 22-24, 2023 | Paper Table 2 |
| CY3 required RAAN | 262° | Paper Table 2 |
| CY3 LOI date | Aug 5, 2023 | Paper Table 3 |
| CY2 landing window | Sep 6-7, 2019 | Paper |
| CY2 LOI date | Sep 2, 2019 | Paper |

---

## 29. Wizard Implementation Summary

### 29.1 Final Iteration Plan

| Iteration | Deliverable | Dependencies | Est. Scope |
|-----------|-------------|--------------|------------|
| **0** | Sun elevation PoC | astronomy-engine | Small |
| **1** | Moon globe + site selector | NASA texture, Three.js | Medium |
| **2** | Sun illumination UI | Iteration 0 algorithm | Medium |
| **3** | Landing window selection | Iteration 2 | Small |
| **4** | LOI computation | Existing optimization.ts | Small |
| **5** | Full wizard integration | All above | Medium |

### 29.2 Prerequisites

- [ ] Download NASA Moon texture (public domain)
- [ ] Validate astronomy-engine can compute sub-solar point
- [ ] Confirm existing LOI code handles all edge cases

### 29.3 Definition of Done

| Iteration | Done When |
|-----------|-----------|
| 0 | PoC passes for CY2 + CY3 sites, matches paper dates ±1 day |
| 1 | Can select site via globe, presets load, snap works |
| 2 | Landing windows computed and displayed for selected site |
| 3 | Can select window, shows backup site warning |
| 4 | LOI candidates shown, TLI auto-computed |
| 5 | "Create Mission" generates launch event, E2E tests pass |

### 29.4 Success Criteria

- [ ] CY3 defaults produce Aug 23 landing, Aug 5 LOI, Jul 31 TLI
- [ ] CY2 defaults produce Sep 6-7 landing window
- [ ] All E2E tests pass
- [ ] State persists across browser sessions
- [ ] Wizard integrates with existing Plan/Game modes

---

## 30. Wizard Reference Data

### 30.1 Chandrayaan-3 Mission Values

| Parameter | Value |
|-----------|-------|
| Landing site (actual) | -69.3733°S, 32.3191°E (Shiv Shakti Point) |
| Landing site (planned) | -69.3676°S, 32.3481°E |
| Landing site (backup) | -69.4977°S, -17.3304°W |
| Landing date | Aug 23, 2023 |
| Sun elevation requirement | 6°-9° |
| Required lunar RAAN (Aug) | 262° |
| LOI date | Aug 5, 2023 13:42 UT |
| TLI date | Jul 31, 2023 18:32 UT |
| Launch date | Jul 14, 2023 09:21 UT |

### 30.2 Chandrayaan-2 Mission Values

| Parameter | Value |
|-----------|-------|
| Landing site (planned) | -70.90°S, 22.78°E |
| Landing site (backup) | -67.75°S, -18.47°W |
| Landing date (planned) | Sep 6-7, 2019 |
| Launch date | Jul 22, 2019 09:13 UT |

### 30.3 Reference Documents

- `/docs/reference/chandrayaan3-mission-data.md` - CY3 paper data
- `/docs/reference/chandrayaan2-mission-data.md` - CY2 paper data

---

# Part III: Orbit Visualization Panel Component

---

## 31. Orbit Panel Overview

A reusable component for the Mission Design Wizard that visualizes transfer orbit trajectories with real ephemeris data and playback controls matching the main Game mode.

---

## 32. Orbit Panel Architecture

### 32.1 Architecture: Functional Core / Imperative Shell

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

---

## 33. Orbit Panel State Structure

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

---

## 34. Orbit Panel Functional Core

### 34.1 Pure Functions

#### 1. Moon Position (reuse from optimization.ts)
```typescript
// Already exists in src/optimization.ts
export function calculateMoonPositionAtDate(date: Date): {x: number, y: number, z: number}
```

#### 2. Spacecraft True Anomaly (reuse from optimization.ts)
```typescript
// Already exists in src/optimization.ts
export function getTrueAnomalyFromTime(
    timeSincePeriapsis: number,  // seconds
    perigeeAlt: number,          // km
    apogeeAlt: number            // km
): number  // degrees [0, 360)
```

#### 3. Spacecraft Position (new pure function)
```typescript
export function calculateSpacecraftPosition(
    trueAnomaly: number,   // degrees
    orbital: OrbitalParams
): {x: number, y: number, z: number}  // km in Three.js coords
```

#### 4. Distance Calculation (new pure function)
```typescript
export function calculateDistance(
    pos1: {x: number, y: number, z: number},
    pos2: {x: number, y: number, z: number}
): number  // km
```

#### 5. Capture Check (new pure function)
```typescript
export function checkCaptureCondition(
    craftPos: {x: number, y: number, z: number},
    moonPos: {x: number, y: number, z: number},
    threshold: number
): boolean
```

#### 6. Time Advancement (new pure function)
```typescript
export function advanceTime(
    currentDays: number,
    deltaTimeMs: number,
    speed: number,
    maxDays: number
): {daysElapsed: number, reachedEnd: boolean}
```

---

## 35. Orbit Panel UI Components

### 35.1 Timeline Controls

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

### 35.2 Speed Options

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

---

## 36. Orbit Panel Animation Loop

### 36.1 Animation Flow

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

---

## 37. Orbit Panel Behavior Rules

### 37.1 Pre-TLI (currentDate < tliDate)
- Spacecraft at perigee (true anomaly = 0°)
- Spacecraft visible but grayed out
- Moon moves with real ephemeris

### 37.2 Post-TLI (currentDate >= tliDate)
- Spacecraft position calculated from elapsed time using Kepler's equation
- True anomaly increases as spacecraft traverses ellipse
- Moon continues with real ephemeris
- Distance to Moon checked each frame

### 37.3 Capture Condition
- Triggered when: `distance(craft, moon) <= threshold`
- Default threshold: 5000 km
- On capture:
  - Show capture message toast
  - Hide spacecraft
  - Continue animation (don't pause)

### 37.4 No Capture (spacecraft misses Moon)
- Spacecraft continues orbiting Earth
- Will return to perigee (true anomaly wraps to 0°)
- Continues indefinitely

---

## 38. Orbit Panel API

### 38.1 Configuration Interface

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
```

### 38.2 Class API

```typescript
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

---

## 39. Orbit Panel File Structure

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

### 39.1 Dependencies

- Reuse from `src/optimization.ts`:
  - `calculateMoonPositionAtDate()`
  - `getTrueAnomalyFromTime()`

- Reuse from `src/constants.ts`:
  - `EARTH_RADIUS`, `EARTH_MU`, `SCALE_FACTOR`
  - `COLORS`

- New pure functions to add to `src/optimization.ts` or new file

---

**End of Comprehensive Specification Document**
