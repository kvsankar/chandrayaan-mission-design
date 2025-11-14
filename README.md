# Chandrayaan-3 Orbit Visualization

An interactive 3D visualization of Chandrayaan-3's orbital mechanics, demonstrating the relationship between Earth's equatorial plane, the Moon's orbit, and the spacecraft's highly elliptical transfer orbit.

![Orbit Visualization](Screenshot%202025-11-14%20174755.png)

## Features

### Three Operating Modes

#### Explore Mode
- **Manual control** of all orbital parameters
- Moon position controlled manually (Gamed mode)
- All parameters adjustable via GUI controls
- No timeline constraints
- Ideal for learning orbital mechanics and experimentation

#### Plan Mode
- **Mission planning** with launch event creation
- Real lunar ephemeris from astronomy-engine library
- Define launch parameters with realistic constraints:
  - Inclination: 21.5° or 41.8° (dropdown)
  - Argument of Periapsis: 178°, 198°, or 203° (depends on inclination)
  - Perigee altitude: 180-600,000 km
  - Launch date and Moon intercept date
- Three independent timeline sliders:
  - **View**: General timeline navigation
  - **Launch**: Set launch date (updates when dragged)
  - **Intercept**: Set Moon intercept date
- Radio-button style checkboxes to select which timeline controls rendering
- Spacecraft parameters update in real-time based on selected timeline
- Save/delete launch events with draft state tracking

#### Game Mode
- **Playback mode** for viewing planned missions
- Real lunar ephemeris displays actual Moon position
- All controls visible but disabled (read-only)
- Timeline animation with playback controls
- Spacecraft visualized based on saved launch event

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
- Chandrayaan orbit plane, path, nodes
- RAAN and AOP angle visualizations

#### Orbital Parameters (Context-Sensitive)
- **Lunar**: Inclination, RAAN, Moon RA (manual in Explore, computed in Plan/Game)
- **Chandrayaan**: Inclination, RAAN, AOP (ω), Perigee, Apogee, True Anomaly
- **Read-Only Displays**: Orbital period, Moon RA, Craft RA

#### Actions Panel (Plan Mode)
- **Add Launch**: Create new launch event with lil-gui interface
- **Launch Event Card**: Edit launch parameters
- **Save**: Commit draft changes
- **Delete**: Remove launch event

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
- `main.js`: Core visualization logic, orbital calculations, GUI setup
- `index.html`: Layout, timeline controls, legend panel
- `style.css`: UI styling, responsive design
- `CLAUDE.md`: Developer documentation with implementation details

## Project Structure

```
cy3-orbit/
├── index.html          # Main HTML with UI components
├── main.js            # Three.js visualization and orbital mechanics
├── style.css          # Styling for all UI elements
├── CLAUDE.md          # Technical developer documentation
└── README.md          # This file
```

## Dependencies

- **Three.js** (0.152.2): 3D rendering
- **lil-gui** (0.18): GUI controls
- **astronomy-engine** (2.1.19): Lunar ephemeris calculations
- **es-module-shims** (1.6.3): Import maps polyfill

All dependencies loaded via CDN.

## Usage

Simply open `index.html` in a modern web browser. No build process required.

## TODOs

- [ ] Handle edge cases where changing the start date of the time window moves a planned launch event outside the 3-month time window (currently the launch date can fall outside the visible timeline range)

## Credits

Built with Three.js and astronomy-engine.

See [CLAUDE.md](CLAUDE.md) for detailed technical documentation and implementation notes.
