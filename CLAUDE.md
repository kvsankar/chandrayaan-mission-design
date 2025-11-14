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
├── index.html          # Main HTML with legend panel and imports
├── main.js            # Three.js visualization logic
├── style.css          # Styling for UI elements
└── CLAUDE.md          # This file
```

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

## Important Constraints

1. **RA vs RAAN**: Moon's Right Ascension (RA) is absolute in space and doesn't change when lunar RAAN changes
2. **Fixed Apogee**: Chandrayaan orbit always reaches lunar orbit distance (384,400 km) at apogee
3. **Counter-clockwise**: All rotations follow right-hand rule (counter-clockwise when viewed from above/north)
4. **Node Positions**: Calculated by rotating (±R, 0, 0) in orbital plane by inclination and RAAN

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

- Uses ES6 modules with import maps for Three.js
- lil-gui for interactive controls
- All geometry uses `applyAxisAngle()` for consistent rotations
- Text labels created using canvas textures and sprites
- Legend panel is collapsible and positioned on left side

## Future Enhancements

Potential additions:
- Animation of orbits over time
- Multiple Chandrayaan orbit phases
- Trajectory prediction
- Real ephemeris data integration
- Camera presets for different viewpoints
