import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';
import * as Astronomy from 'astronomy-engine';

// Three.js scene setup
let scene, camera, renderer, controls;
let celestialSphere;
let equatorCircle, lunarOrbitCircle, chandrayaanOrbitCircle;
let lunarAscendingNode, lunarDescendingNode;
let chandrayaanAscendingNode, chandrayaanDescendingNode;
let chandrayaanOrbitCircle3D, chandrayaan;
let moon;
let xAxis, yAxis, zAxis, ariesMarker;
let raanLine1, raanLine2, raanArc, raanPie, raanLabel; // RAAN angle visualization
let aopLine1, aopLine2, aopArc, aopPie, aopLabel; // AOP angle visualization

// Parameters
const params = {
    // Global mode
    appMode: 'Explore', // 'Explore' or 'Game'

    // Visibility toggles
    showEquator: true,
    showAxes: true,
    showLunarOrbitPlane: true,
    showLunarNodes: true,
    showMoon: true,
    showChandrayaanOrbitPlane: true,
    showChandrayaanOrbit: true,
    showChandrayaanNodes: true,
    showRAANAngle: false,
    showAOPAngle: false,

    // Moon mode
    moonMode: 'Gamed', // 'Real' or 'Gamed'

    // Lunar orbit parameters (plane only, with Moon on circular orbit)
    lunarInclination: 23.44, // degrees (relative to equator)
    lunarNodes: 0, // RAAN - Right Ascension of Ascending Node
    moonRA: 0, // Moon's Right Ascension from First Point of Aries (degrees)

    // Chandrayaan orbit parameters (elliptical)
    chandrayaanInclination: 30, // degrees
    chandrayaanNodes: 0, // RAAN - Right Ascension of Ascending Node
    chandrayaanOmega: 45, // Argument of periapsis (degrees)
    chandrayaanPerigeeAlt: 180, // Perigee altitude in km
    chandrayaanApogeeAlt: 378029, // Apogee altitude in km (default: 384400 - 6371 = lunar orbit distance altitude)
    chandrayaanTrueAnomaly: 0, // True anomaly (position along orbit, degrees)
    chandrayaanPeriod: '--', // Orbital period (display only)
};

// Timeline state
let timelineState = {
    startDate: new Date(),
    currentDate: new Date(),
    isPlaying: false,
    speed: 0.25, // days per second (default: 6 hr/sec)
    daysElapsed: 0
};

// Launch event state
let launchEvent = {
    exists: false,
    date: null,
    inclination: 21.5,
    raan: 0,
    omega: 178,
    perigeeAlt: 180,
    apogeeAlt: 384400
};

// GUI controller references (for enabling/disabling)
let lunarControllers = {};
let chandrayaanControllers = {};
let lunarFolder, chandrayaanFolder, moonModeController;

const SPHERE_RADIUS = 100;
const LUNAR_ORBIT_DISTANCE = 384400; // Lunar orbit distance in km
const SCALE_FACTOR = SPHERE_RADIUS / LUNAR_ORBIT_DISTANCE; // Scale lunar distance to fit scene
const EARTH_RADIUS = 6371; // Earth radius in km
const EARTH_MU = 398600.4418; // Earth's gravitational parameter (km^3/s^2)

// Helper function to calculate Chandrayaan orbit eccentricity
function calculateChandrayaanEccentricity() {
    const perigeeDistance = EARTH_RADIUS + params.chandrayaanPerigeeAlt;
    const apogeeDistance = LUNAR_ORBIT_DISTANCE;
    const e = (apogeeDistance - perigeeDistance) / (apogeeDistance + perigeeDistance);
    return e;
}

// Calculate orbital period from perigee and apogee altitudes
function calculateOrbitalPeriod(perigeeAlt, apogeeAlt) {
    const rp = EARTH_RADIUS + perigeeAlt; // Perigee distance from Earth center (km)
    const ra = EARTH_RADIUS + apogeeAlt;  // Apogee distance from Earth center (km)
    const a = (rp + ra) / 2; // Semi-major axis (km)
    const T = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / EARTH_MU); // Period in seconds
    return T;
}

// Format period as human-readable string
function formatPeriod(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else {
        return `${minutes}m ${secs}s`;
    }
}

// Solve Kepler's equation to get true anomaly from time since periapsis
function getTrueAnomalyFromTime(timeSinceLaunch, perigeeAlt, apogeeAlt) {
    const rp = EARTH_RADIUS + perigeeAlt;
    const ra = EARTH_RADIUS + apogeeAlt;
    const a = (rp + ra) / 2; // Semi-major axis
    const e = (ra - rp) / (ra + rp); // Eccentricity

    const n = Math.sqrt(EARTH_MU / Math.pow(a, 3)); // Mean motion (rad/s)
    const M = n * timeSinceLaunch; // Mean anomaly (radians)

    // Solve Kepler's equation: M = E - e*sin(E) for eccentric anomaly E
    // Using Newton-Raphson iteration
    let E = M; // Initial guess
    for (let i = 0; i < 10; i++) {
        E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }

    // Convert eccentric anomaly to true anomaly
    const trueAnomaly = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    // Convert to degrees and normalize to 0-360
    let trueAnomalyDeg = trueAnomaly * 180 / Math.PI;
    if (trueAnomalyDeg < 0) trueAnomalyDeg += 360;

    return trueAnomalyDeg;
}

// Cache for getChandrayaanParams to avoid redundant calculations per frame
let cachedOrbitalParams = null;
let lastParamsCacheFrame = -1;
let currentAnimationFrame = 0;

// Invalidate the orbital params cache (call when parameters change manually)
function invalidateOrbitalParamsCache() {
    cachedOrbitalParams = null;
    lastParamsCacheFrame = -1;
}

// Get current chandrayaan orbital parameters (manual or from launch event)
function getChandrayaanParams() {
    // Return cached result if already calculated this frame
    if (currentAnimationFrame === lastParamsCacheFrame && cachedOrbitalParams !== null) {
        return cachedOrbitalParams;
    }

    // Calculate new parameters
    let result;

    // If a launch event exists, always use launch parameters for the orbit
    // This prevents the orbit from jumping when crossing the launch date
    if (launchEvent.exists) {
        const isLaunched = timelineState.currentDate >= launchEvent.date;

        let trueAnomaly;
        if (isLaunched) {
            // After launch: calculate true anomaly from time since launch
            const timeSinceLaunch = (timelineState.currentDate.getTime() - launchEvent.date.getTime()) / 1000;
            trueAnomaly = getTrueAnomalyFromTime(timeSinceLaunch, launchEvent.perigeeAlt, launchEvent.apogeeAlt);
        } else {
            // Before launch: freeze at perigee (true anomaly = 0)
            trueAnomaly = 0;
        }

        result = {
            inclination: launchEvent.inclination,
            raan: launchEvent.raan,
            omega: launchEvent.omega,
            perigeeAlt: launchEvent.perigeeAlt,
            apogeeAlt: launchEvent.apogeeAlt,
            trueAnomaly: trueAnomaly,
            isLaunched: isLaunched
        };
    } else {
        // No launch event: use manual parameters
        result = {
            inclination: params.chandrayaanInclination,
            raan: params.chandrayaanNodes,
            omega: params.chandrayaanOmega,
            perigeeAlt: params.chandrayaanPerigeeAlt,
            apogeeAlt: params.chandrayaanApogeeAlt,
            trueAnomaly: params.chandrayaanTrueAnomaly,
            isLaunched: false
        };
    }

    // Cache the result
    cachedOrbitalParams = result;
    lastParamsCacheFrame = currentAnimationFrame;

    return result;
}

// Calculate Moon's orbital elements from position and velocity vectors
function calculateOrbitalElements(posVector, velVector) {
    // Convert to standard units (km and km/s)
    const AU_TO_KM = 149597870.7;
    const DAYS_TO_SEC = 86400.0;

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

    // Angular momentum vector h = r × v
    const h = {
        x: r.y * v.z - r.z * v.y,
        y: r.z * v.x - r.x * v.z,
        z: r.x * v.y - r.y * v.x
    };

    const hMag = Math.sqrt(h.x * h.x + h.y * h.y + h.z * h.z);

    // Inclination (angle between h and z-axis)
    const inclination = Math.acos(h.z / hMag) * 180 / Math.PI;

    // Node vector n = k × h (where k is unit z-vector)
    const n = {
        x: -h.y,
        y: h.x,
        z: 0
    };

    const nMag = Math.sqrt(n.x * n.x + n.y * n.y);

    // RAAN (Right Ascension of Ascending Node)
    let raan = 0;
    if (nMag > 1e-10) {
        raan = Math.acos(n.x / nMag) * 180 / Math.PI;
        if (n.y < 0) raan = 360 - raan;
    }

    return {
        inclination: inclination,
        raan: raan
    };
}

// Calculate real Moon position using astronomy library
function calculateRealMoonPosition(date) {
    // Get geocentric position AND velocity of Moon using GeoMoonState
    const state = Astronomy.GeoMoonState(date);

    // Position vector
    const geoVector = {
        x: state.x,
        y: state.y,
        z: state.z,
        t: state.t
    };

    // Velocity vector (already provided by GeoMoonState!)
    const velVector = {
        dx: state.vx,
        dy: state.vy,
        dz: state.vz
    };

    // Convert position vector to equatorial coordinates
    const equatorial = Astronomy.EquatorFromVector(geoVector);

    // Right Ascension in degrees (0-360)
    const ra = equatorial.ra * 15; // Convert hours to degrees

    // Declination in degrees
    const dec = equatorial.dec;

    // Distance in km
    const distanceKm = equatorial.dist * 149597870.7; // AU to km

    // Calculate orbital elements from position and velocity
    const elements = calculateOrbitalElements(geoVector, velVector);

    return {
        ra: ra % 360,
        dec: dec,
        distance: distanceKm,
        inclination: elements.inclination,
        raan: elements.raan
    };
}

// Color scheme
const COLORS = {
    xAxis: 0xff0000,           // Red
    yAxis: 0x00ff00,           // Green
    zAxis: 0x0000ff,           // Blue
    ariesMarker: 0xff0000,     // Red
    equator: 0xffffff,         // White
    lunarOrbitPlane: 0xff00ff, // Magenta
    lunarAscending: 0x00ffff,  // Cyan
    lunarDescending: 0xff8800, // Orange
    moon: 0xaaaaaa,            // Gray
    chandrayaanPlane: 0xffff00,     // Yellow
    chandrayaanOrbit: 0xffa500,     // Gold/Amber
    chandrayaanAscending: 0x88ff88, // Light Green
    chandrayaanDescending: 0xff88ff,// Pink
    chandrayaan: 0xffffff      // White
};

function init() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );
    camera.position.set(150, 100, 150);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 500;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(200, 200, 200);
    scene.add(pointLight);

    // Create celestial sphere
    createCelestialSphere();

    // Create coordinate system
    createXAxis();
    createYAxis();
    createZAxis();
    createAriesMarker();

    // Create great circles
    createEquator();
    createLunarOrbitCircle();
    createChandrayaanOrbitCircle();

    // Create nodes
    createLunarNodes();
    createChandrayaanNodes();

    // Create Moon (on circular orbit, not rendered)
    createMoon();

    // Create Chandrayaan circular orbit and spacecraft
    createChandrayaanOrbit();

    // Create RAAN angle visualization
    createRAANLines();

    // Create AOP angle visualization
    createAOPLines();

    // Setup GUI
    setupGUI();

    // Setup timeline
    setupTimeline();

    // Setup launch popup
    setupLaunchPopup();

    // Update orbital elements display
    updateOrbitalElements();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation
    animate();
}

function createCelestialSphere() {
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
    celestialSphere.renderOrder = 0; // Render before other transparent objects
    scene.add(celestialSphere);
}

function createXAxis() {
    // Create X-axis line (pointing to First Point of Aries, RA = 0°)
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

function createYAxis() {
    // Create Y-axis line (RA = 90° on equatorial plane)
    // In Three.js coords: -Z direction gives us RA = 90°
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

function createZAxis() {
    // Create Z-axis line (perpendicular to equatorial plane, pointing to north pole)
    // In Three.js coords: +Y direction gives us north pole
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

function createAriesMarker() {
    // Create marker at First Point of Aries (0° RA on equator)
    // Use Aries symbol ♈ as a sprite instead of a sphere
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;

    // Clear canvas to transparent
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Aries symbol in red
    context.fillStyle = '#ff0000';
    context.font = 'Bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('♈', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true // Enable transparency
    });
    ariesMarker = new THREE.Sprite(spriteMaterial);
    ariesMarker.scale.set(8, 8, 1); // Make it visible

    // Position at the tip of the X axis
    ariesMarker.position.set(SPHERE_RADIUS * 1.2, 0, 0);
    scene.add(ariesMarker);
}

function createGreatCircle(radius, color, inclination = 0, raan = 0) {
    const segments = 128;
    const points = [];

    // Create circle in XZ plane (counter-clockwise when viewed from above)
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(theta);
        const y = 0;
        const z = -radius * Math.sin(theta); // Negative for counter-clockwise viewing from above

        const point = new THREE.Vector3(x, y, z);

        // Apply rotations to each point: inclination first, then RAAN
        point.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(inclination));
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(raan));

        points.push(point);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2
    });
    const circle = new THREE.Line(geometry, material);

    return circle;
}

function createEquator() {
    equatorCircle = createGreatCircle(SPHERE_RADIUS, COLORS.equator);
    scene.add(equatorCircle);
}

function createLunarOrbitCircle() {
    lunarOrbitCircle = createGreatCircle(
        SPHERE_RADIUS,
        COLORS.lunarOrbitPlane,
        params.lunarInclination,
        params.lunarNodes
    );
    scene.add(lunarOrbitCircle);
}

function createChandrayaanOrbitCircle() {
    chandrayaanOrbitCircle = createGreatCircle(
        SPHERE_RADIUS,
        COLORS.chandrayaanPlane,
        params.chandrayaanInclination,
        params.chandrayaanNodes
    );
    scene.add(chandrayaanOrbitCircle);
}

function createLunarNodes() {
    // Nodes are where the lunar orbit intersects the equatorial plane
    const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);

    // Ascending node
    const lunarAscendingMaterial = new THREE.MeshBasicMaterial({ color: COLORS.lunarAscending });
    lunarAscendingNode = new THREE.Mesh(nodeGeometry, lunarAscendingMaterial);
    scene.add(lunarAscendingNode);

    // Descending node
    const lunarDescendingMaterial = new THREE.MeshBasicMaterial({ color: COLORS.lunarDescending });
    lunarDescendingNode = new THREE.Mesh(nodeGeometry, lunarDescendingMaterial);
    scene.add(lunarDescendingNode);

    updateLunarNodePositions();
}

function createChandrayaanNodes() {
    // Nodes are where Chandrayaan orbit intersects the equatorial plane
    const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);

    // Ascending node
    const chandrayaanAscendingMaterial = new THREE.MeshBasicMaterial({ color: COLORS.chandrayaanAscending });
    chandrayaanAscendingNode = new THREE.Mesh(nodeGeometry, chandrayaanAscendingMaterial);
    scene.add(chandrayaanAscendingNode);

    // Descending node
    const chandrayaanDescendingMaterial = new THREE.MeshBasicMaterial({ color: COLORS.chandrayaanDescending });
    chandrayaanDescendingNode = new THREE.Mesh(nodeGeometry, chandrayaanDescendingMaterial);
    scene.add(chandrayaanDescendingNode);

    updateChandrayaanNodePositions();
}

function updateLunarNodePositions() {
    // Nodes are where the inclined orbital plane intersects the equatorial plane
    // They occur at true anomaly 0° and 180° in the orbital plane (before rotation)
    // After applying inclination and RAAN, these become the ascending and descending nodes

    const inc = THREE.MathUtils.degToRad(params.lunarInclination);
    const raan = THREE.MathUtils.degToRad(params.lunarNodes);

    // Ascending node: starts at (R, 0, 0) in orbital plane
    const ascendingPos = new THREE.Vector3(SPHERE_RADIUS, 0, 0);
    ascendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    ascendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    lunarAscendingNode.position.copy(ascendingPos);

    // Descending node: starts at (-R, 0, 0) in orbital plane
    const descendingPos = new THREE.Vector3(-SPHERE_RADIUS, 0, 0);
    descendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    descendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    lunarDescendingNode.position.copy(descendingPos);
}

function updateChandrayaanNodePositions() {
    // Nodes are where the inclined orbital plane intersects the equatorial plane
    const inc = THREE.MathUtils.degToRad(params.chandrayaanInclination);
    const raan = THREE.MathUtils.degToRad(params.chandrayaanNodes);

    // Ascending node: starts at (R, 0, 0) in orbital plane
    const ascendingPos = new THREE.Vector3(SPHERE_RADIUS, 0, 0);
    ascendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    ascendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    chandrayaanAscendingNode.position.copy(ascendingPos);

    // Descending node: starts at (-R, 0, 0) in orbital plane
    const descendingPos = new THREE.Vector3(-SPHERE_RADIUS, 0, 0);
    descendingPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    descendingPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);
    chandrayaanDescendingNode.position.copy(descendingPos);
}

function createMoon() {
    // Create Moon on a circular orbit (orbit path not rendered, just the Moon)
    const moonGeometry = new THREE.SphereGeometry(3, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({ color: COLORS.moon });
    moon = new THREE.Mesh(moonGeometry, moonMaterial);

    scene.add(moon);

    // Position moon based on true anomaly
    updateMoonPosition();
}

function updateMoonPosition() {
    // Position Moon based on Right Ascension (measured from First Point of Aries)
    // RA is absolute and doesn't change when RAAN changes
    // RA increases counter-clockwise when viewed from above (from north pole)

    const ra = THREE.MathUtils.degToRad(params.moonRA);
    const inc = THREE.MathUtils.degToRad(params.lunarInclination);
    const raan = THREE.MathUtils.degToRad(params.lunarNodes);

    // Calculate the angle within the orbital plane
    // When RAAN changes, this angle changes to keep RA constant in space
    const angleInOrbit = ra - raan;

    // Start with position in the unrotated orbital plane (XZ plane)
    // Negative Z makes counter-clockwise rotation when viewed from above
    const posInOrbit = new THREE.Vector3(
        SPHERE_RADIUS * Math.cos(angleInOrbit),
        0,
        -SPHERE_RADIUS * Math.sin(angleInOrbit)
    );

    // Apply orbital rotations: inclination around X-axis, then RAAN around Y-axis
    posInOrbit.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    posInOrbit.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

    moon.position.copy(posInOrbit);
}

function updateLunarOrbitCircle() {
    scene.remove(lunarOrbitCircle);
    lunarOrbitCircle = createGreatCircle(
        SPHERE_RADIUS,
        COLORS.lunarOrbitPlane,
        params.lunarInclination,
        params.lunarNodes
    );
    scene.add(lunarOrbitCircle);
    lunarOrbitCircle.visible = params.showLunarOrbitPlane;
}

function updateChandrayaanOrbitCircle() {
    scene.remove(chandrayaanOrbitCircle);
    chandrayaanOrbitCircle = createGreatCircle(
        SPHERE_RADIUS,
        COLORS.chandrayaanPlane,
        params.chandrayaanInclination,
        params.chandrayaanNodes
    );
    scene.add(chandrayaanOrbitCircle);
    chandrayaanOrbitCircle.visible = params.showChandrayaanOrbitPlane;
}

function createChandrayaanOrbit() {
    // Create an elliptical orbit for Chandrayaan
    // Calculate orbital parameters
    const e = calculateChandrayaanEccentricity();
    const perigeeDistance = (EARTH_RADIUS + params.chandrayaanPerigeeAlt) * SCALE_FACTOR;
    const a = perigeeDistance / (1 - e); // Semi-major axis

    const segments = 128;
    const points = [];

    // Create ellipse using polar form: r(θ) = a(1-e²)/(1+e*cos(θ))
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
        const x = r * Math.cos(theta);
        const z = -r * Math.sin(theta); // Negative for counter-clockwise from above
        points.push(new THREE.Vector3(x, 0, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: COLORS.chandrayaanOrbit,
        linewidth: 2
    });
    chandrayaanOrbitCircle3D = new THREE.Line(geometry, material);

    scene.add(chandrayaanOrbitCircle3D);

    // Create Chandrayaan spacecraft
    const spacecraftGeometry = new THREE.SphereGeometry(2, 16, 16);
    const spacecraftMaterial = new THREE.MeshPhongMaterial({ color: COLORS.chandrayaan });
    chandrayaan = new THREE.Mesh(spacecraftGeometry, spacecraftMaterial);

    scene.add(chandrayaan);

    // Apply orbital rotations and position spacecraft
    updateChandrayaanOrbit();
}

function updateChandrayaanOrbit() {
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

    const segments = 512;
    const points = [];

    const omega = THREE.MathUtils.degToRad(orbitalParams.omega);
    const inc = THREE.MathUtils.degToRad(orbitalParams.inclination);
    const raan = THREE.MathUtils.degToRad(orbitalParams.raan);

    // Create elliptical orbit in XZ plane using polar form
    for (let i = 0; i <= segments; i++) {
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

        points.push(point);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: COLORS.chandrayaanOrbit,
        linewidth: 2
    });
    chandrayaanOrbitCircle3D = new THREE.Line(geometry, material);
    chandrayaanOrbitCircle3D.visible = params.showChandrayaanOrbit;
    scene.add(chandrayaanOrbitCircle3D);

    // Update Chandrayaan position based on true anomaly
    const nu = THREE.MathUtils.degToRad(orbitalParams.trueAnomaly);
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

    // Update spacecraft appearance based on launch status
    if (launchEvent.exists && !orbitalParams.isLaunched) {
        // Launch exists but not reached yet - grey and frozen at perigee
        chandrayaan.material.color.setHex(0x888888);
        chandrayaan.material.emissive.setHex(0x000000);
    } else {
        // No launch event (manual mode) OR launched - white and active
        chandrayaan.material.color.setHex(COLORS.chandrayaan);
        chandrayaan.material.emissive.setHex(0x222222);
    }
}

function updateOrbitalElements() {
    // Info panel removed - orbital elements now shown in GUI controls
}

function createRAANLines() {
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

function createRAAnLabel(raan, radius) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
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

function updateRAANLines() {
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

function createAOPLines() {
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

function createAOPLabel(omega, inc, raan, radius) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
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

function updateAOPLines() {
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
function updateMoonFromRealPosition() {
    const moonData = calculateRealMoonPosition(timelineState.currentDate);

    // Update parameters with real values
    params.moonRA = moonData.ra;
    params.lunarInclination = moonData.inclination;
    params.lunarNodes = moonData.raan;

    // Update GUI display
    if (lunarControllers.moonRA) lunarControllers.moonRA.updateDisplay();
    if (lunarControllers.inclination) lunarControllers.inclination.updateDisplay();
    if (lunarControllers.nodes) lunarControllers.nodes.updateDisplay();

    // Update visual representation
    updateLunarOrbitCircle();
    updateLunarNodePositions();
    updateMoonPosition();
    updateOrbitalElements();
}

function switchAppMode(mode) {
    const timelinePanel = document.getElementById('timeline-panel');
    const addLaunchBtn = document.getElementById('add-launch-btn');

    if (mode === 'Explore') {
        // Explore mode: Show all manual controls, hide timeline, force Gamed Moon mode
        lunarFolder.show();
        chandrayaanFolder.show();

        // Force Moon to Gamed mode
        params.moonMode = 'Gamed';

        // Enable all lunar controls
        lunarControllers.inclination.enable();
        lunarControllers.nodes.enable();
        lunarControllers.moonRA.enable();

        // Enable all chandrayaan controls
        chandrayaanControllers.inclination.enable();
        chandrayaanControllers.nodes.enable();
        chandrayaanControllers.omega.enable();
        chandrayaanControllers.perigeeAlt.enable();
        chandrayaanControllers.apogeeAlt.enable();
        chandrayaanControllers.trueAnomaly.enable();

        // Hide timeline panel
        timelinePanel.style.display = 'none';

        // Update period display
        updateChandrayaanPeriodDisplay();

    } else if (mode === 'Game') {
        // Game mode: Show controls but disabled, show timeline, force Real Moon mode
        lunarFolder.show();
        chandrayaanFolder.show();

        // Force Moon to Real mode
        params.moonMode = 'Real';

        // Disable lunar controls (show but grayed out)
        lunarControllers.inclination.disable();
        lunarControllers.nodes.disable();
        lunarControllers.moonRA.disable();

        // Disable all chandrayaan controls (show but grayed out)
        chandrayaanControllers.inclination.disable();
        chandrayaanControllers.nodes.disable();
        chandrayaanControllers.omega.disable();
        chandrayaanControllers.perigeeAlt.disable();
        chandrayaanControllers.apogeeAlt.disable();
        chandrayaanControllers.trueAnomaly.disable();

        // Show timeline panel
        timelinePanel.style.display = 'block';
        timelinePanel.classList.remove('disabled');

        // Update moon position from current date when switching to Game mode
        updateMoonFromRealPosition();

        // Sync GUI controls with launch event if it exists
        syncGUIWithLaunchEvent();

        // Update period display
        updateChandrayaanPeriodDisplay();
    }
}

// Update Chandrayaan orbital period display
function updateChandrayaanPeriodDisplay() {
    const orbitalParams = getChandrayaanParams();
    const periodSeconds = calculateOrbitalPeriod(orbitalParams.perigeeAlt, orbitalParams.apogeeAlt);
    params.chandrayaanPeriod = formatPeriod(periodSeconds);

    if (chandrayaanControllers.period) {
        chandrayaanControllers.period.updateDisplay();
    }
}

// Sync GUI controls with launch event parameters in Game mode
function syncGUIWithLaunchEvent() {
    if (params.appMode !== 'Game') return;

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
    chandrayaanControllers.inclination.updateDisplay();
    chandrayaanControllers.nodes.updateDisplay();
    chandrayaanControllers.omega.updateDisplay();
    chandrayaanControllers.perigeeAlt.updateDisplay();
    chandrayaanControllers.apogeeAlt.updateDisplay();
    chandrayaanControllers.trueAnomaly.updateDisplay();

    // Only update period display if perigee or apogee changed
    if (perigeeChanged || apogeeChanged) {
        updateChandrayaanPeriodDisplay();
    }
}

function setupGUI() {
    const gui = new GUI();

    // App Mode selector at the very top
    gui.add(params, 'appMode', ['Explore', 'Game']).name('Mode').onChange(value => {
        switchAppMode(value);
    });

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
    lunarVisFolder.add(params, 'showLunarOrbitPlane').name('Show Plane').onChange(value => {
        lunarOrbitCircle.visible = value;
    });
    lunarVisFolder.add(params, 'showLunarNodes').name('Show Nodes').onChange(value => {
        lunarAscendingNode.visible = value;
        lunarDescendingNode.visible = value;
    });
    lunarVisFolder.add(params, 'showMoon').name('Show Moon').onChange(value => {
        moon.visible = value;
    });

    const chandrayaanVisFolder = visibilityFolder.addFolder('Chandrayaan Orbit');
    chandrayaanVisFolder.add(params, 'showChandrayaanOrbitPlane').name('Show Plane').onChange(value => {
        chandrayaanOrbitCircle.visible = value;
    });
    chandrayaanVisFolder.add(params, 'showChandrayaanOrbit').name('Show Orbit').onChange(value => {
        chandrayaanOrbitCircle3D.visible = value;
        chandrayaan.visible = value;
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
    lunarControllers.inclination = lunarFolder.add(params, 'lunarInclination', 18.3, 28.6, 0.1).name('Inclination (°)').onChange(() => {
        updateLunarOrbitCircle();
        updateLunarNodePositions();
        updateMoonPosition();
        updateOrbitalElements();
    });
    lunarControllers.nodes = lunarFolder.add(params, 'lunarNodes', 0, 360, 1).name('Nodes (RAAN) (°)').onChange(() => {
        updateLunarOrbitCircle();
        updateLunarNodePositions();
        updateMoonPosition();
        updateOrbitalElements();
    });
    lunarControllers.moonRA = lunarFolder.add(params, 'moonRA', 0, 360, 1).name('Moon RA (°)').onChange(() => {
        updateMoonPosition();
        updateOrbitalElements();
    });
    lunarFolder.open();

    // Chandrayaan orbit folder
    chandrayaanFolder = gui.addFolder('Chandrayaan Orbit Parameters');
    chandrayaanControllers.inclination = chandrayaanFolder.add(params, 'chandrayaanInclination', 0, 90, 0.1).name('Inclination (°)').onChange(() => {
        updateChandrayaanOrbitCircle();
        updateChandrayaanOrbit();
        updateChandrayaanNodePositions();
        updateAOPLines();
        updateOrbitalElements();
    });
    chandrayaanControllers.nodes = chandrayaanFolder.add(params, 'chandrayaanNodes', 0, 360, 1).name('Nodes (RAAN) (°)').onChange(() => {
        updateChandrayaanOrbitCircle();
        updateChandrayaanOrbit();
        updateChandrayaanNodePositions();
        updateRAANLines();
        updateAOPLines();
        updateOrbitalElements();
    });
    chandrayaanControllers.omega = chandrayaanFolder.add(params, 'chandrayaanOmega', 0, 360, 1).name('ω (Arg. Periapsis) (°)').onChange(() => {
        updateChandrayaanOrbit();
        updateAOPLines();
        updateOrbitalElements();
    });
    chandrayaanControllers.perigeeAlt = chandrayaanFolder.add(params, 'chandrayaanPerigeeAlt', 180, 600000, 100).name('Perigee Altitude (km)').onChange(() => {
        updateChandrayaanOrbit();
        updateOrbitalElements();
        updateChandrayaanPeriodDisplay();
    });
    chandrayaanControllers.apogeeAlt = chandrayaanFolder.add(params, 'chandrayaanApogeeAlt', 180, 600000, 100).name('Apogee Altitude (km)').onChange(() => {
        updateChandrayaanOrbit();
        updateOrbitalElements();
        updateChandrayaanPeriodDisplay();
    });
    chandrayaanControllers.trueAnomaly = chandrayaanFolder.add(params, 'chandrayaanTrueAnomaly', 0, 360, 1).name('True Anomaly (°)').onChange(() => {
        updateChandrayaanOrbit();
        updateOrbitalElements();
    });
    chandrayaanControllers.period = chandrayaanFolder.add(params, 'chandrayaanPeriod').name('Orbital Period').disable();
    chandrayaanFolder.open();

    // Initialize period display
    updateChandrayaanPeriodDisplay();

    // Initialize app mode
    switchAppMode(params.appMode);
}

function setupTimeline() {
    const startDateInput = document.getElementById('start-date');
    const timelineSlider = document.getElementById('timeline-slider');
    const currentDateSpan = document.getElementById('current-date');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const playbackSpeedSelect = document.getElementById('playback-speed');

    // Initialize start date to now
    const now = new Date();
    timelineState.startDate = now;
    timelineState.currentDate = new Date(now);

    // Set datetime-local input value
    const localDateString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    startDateInput.value = localDateString;

    // Update current date display
    function updateCurrentDateDisplay() {
        currentDateSpan.textContent = timelineState.currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    updateCurrentDateDisplay();

    // Start date change handler
    startDateInput.addEventListener('change', (e) => {
        timelineState.startDate = new Date(e.target.value);
        timelineState.daysElapsed = parseFloat(timelineSlider.value);
        timelineState.currentDate = new Date(
            timelineState.startDate.getTime() + timelineState.daysElapsed * 24 * 60 * 60 * 1000
        );
        updateCurrentDateDisplay();

        if (params.moonMode === 'Real') {
            updateMoonFromRealPosition();
        }
    });

    // Timeline slider handler
    timelineSlider.addEventListener('input', (e) => {
        timelineState.daysElapsed = parseFloat(e.target.value);
        timelineState.currentDate = new Date(
            timelineState.startDate.getTime() + timelineState.daysElapsed * 24 * 60 * 60 * 1000
        );
        updateCurrentDateDisplay();
        updateCountdownTimer();

        if (params.moonMode === 'Real') {
            updateMoonFromRealPosition();
        }
    });

    // Play/Pause button
    playPauseBtn.addEventListener('click', () => {
        timelineState.isPlaying = !timelineState.isPlaying;
        playPauseBtn.textContent = timelineState.isPlaying ? '⏸ Pause' : '▶ Play';
    });

    // Reset button
    resetBtn.addEventListener('click', () => {
        timelineState.isPlaying = false;
        timelineState.daysElapsed = 0;
        timelineSlider.value = 0;
        timelineState.currentDate = new Date(timelineState.startDate);
        updateCurrentDateDisplay();
        playPauseBtn.textContent = '▶ Play';

        if (params.moonMode === 'Real') {
            updateMoonFromRealPosition();
        }
    });

    // Playback speed
    playbackSpeedSelect.addEventListener('change', (e) => {
        timelineState.speed = parseFloat(e.target.value);
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
        const currentValue = parseFloat(playbackSpeedSelect.value);
        const currentIndex = speedOptions.findIndex(opt => Math.abs(opt.value - currentValue) < 0.0001);

        // Update down button
        if (currentIndex > 0) {
            speedDownBtn.disabled = false;
            speedDownBtn.textContent = `◄ ${speedOptions[currentIndex - 1].label}`;
        } else {
            speedDownBtn.disabled = true;
            speedDownBtn.textContent = '◄';
        }

        // Update up button
        if (currentIndex < speedOptions.length - 1) {
            speedUpBtn.disabled = false;
            speedUpBtn.textContent = `${speedOptions[currentIndex + 1].label} ►`;
        } else {
            speedUpBtn.disabled = true;
            speedUpBtn.textContent = '►';
        }
    }

    speedDownBtn.addEventListener('click', () => {
        const currentValue = parseFloat(playbackSpeedSelect.value);
        const currentIndex = speedOptions.findIndex(opt => Math.abs(opt.value - currentValue) < 0.0001);
        if (currentIndex > 0) {
            playbackSpeedSelect.value = speedOptions[currentIndex - 1].value;
            timelineState.speed = speedOptions[currentIndex - 1].value;
            updateSpeedButtons();
        }
    });

    speedUpBtn.addEventListener('click', () => {
        const currentValue = parseFloat(playbackSpeedSelect.value);
        const currentIndex = speedOptions.findIndex(opt => Math.abs(opt.value - currentValue) < 0.0001);
        if (currentIndex < speedOptions.length - 1) {
            playbackSpeedSelect.value = speedOptions[currentIndex + 1].value;
            timelineState.speed = speedOptions[currentIndex + 1].value;
            updateSpeedButtons();
        }
    });

    // Initialize button states
    updateSpeedButtons();
}

function setupLaunchPopup() {
    const addLaunchBtn = document.getElementById('add-launch-btn');
    const launchPopup = document.getElementById('launch-popup');
    const closeLaunchBtn = document.getElementById('close-launch-popup');
    const saveLaunchBtn = document.getElementById('save-launch-btn');
    const deleteLaunchBtn = document.getElementById('delete-launch-btn');
    const launchMarker = document.getElementById('launch-marker');

    const launchDateInput = document.getElementById('launch-date');
    const launchInclinationSelect = document.getElementById('launch-inclination');
    const launchOmegaSelect = document.getElementById('launch-omega');
    const launchRAANInput = document.getElementById('launch-raan');
    const launchPerigeeInput = document.getElementById('launch-perigee');
    const launchApogeeInput = document.getElementById('launch-apogee');
    const launchPeriodDisplay = document.getElementById('launch-period-display');

    // Update AOP options based on inclination
    function updateAOPOptions() {
        const inc = parseFloat(launchInclinationSelect.value);
        launchOmegaSelect.innerHTML = '';

        if (inc === 21.5) {
            launchOmegaSelect.innerHTML = '<option value="178">178°</option>';
        } else if (inc === 41.8) {
            launchOmegaSelect.innerHTML = '<option value="198">198°</option><option value="203">203°</option>';
        }
    }

    launchInclinationSelect.addEventListener('change', updateAOPOptions);

    // Update period display
    function updatePeriodDisplay() {
        const perigee = parseFloat(launchPerigeeInput.value);
        const apogee = parseFloat(launchApogeeInput.value);
        const period = calculateOrbitalPeriod(perigee, apogee);
        launchPeriodDisplay.textContent = formatPeriod(period);
    }

    launchPerigeeInput.addEventListener('input', updatePeriodDisplay);
    launchApogeeInput.addEventListener('input', updatePeriodDisplay);

    // Open popup
    addLaunchBtn.addEventListener('click', () => {
        if (launchEvent.exists) {
            // Edit existing launch
            addLaunchBtn.textContent = '✏️ Edit Launch';
            const localDateString = new Date(launchEvent.date.getTime() - launchEvent.date.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16);
            launchDateInput.value = localDateString;
            launchInclinationSelect.value = launchEvent.inclination;
            updateAOPOptions();
            launchOmegaSelect.value = launchEvent.omega;
            launchRAANInput.value = launchEvent.raan;
            launchPerigeeInput.value = launchEvent.perigeeAlt;
            launchApogeeInput.value = launchEvent.apogeeAlt;
            deleteLaunchBtn.style.display = 'block';
        } else {
            // New launch - default to current timeline date
            addLaunchBtn.textContent = '🚀 Add Launch';
            const localDateString = new Date(timelineState.currentDate.getTime() - timelineState.currentDate.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16);
            launchDateInput.value = localDateString;
            launchInclinationSelect.value = '21.5';
            updateAOPOptions();
            launchRAANInput.value = '0';
            launchPerigeeInput.value = '180';
            launchApogeeInput.value = '384400';
            deleteLaunchBtn.style.display = 'none';
        }

        updatePeriodDisplay();
        launchPopup.style.display = 'flex';
    });

    // Close popup
    function closePopup() {
        launchPopup.style.display = 'none';
    }

    closeLaunchBtn.addEventListener('click', closePopup);
    launchPopup.addEventListener('click', (e) => {
        if (e.target === launchPopup) closePopup();
    });

    // Save launch
    saveLaunchBtn.addEventListener('click', () => {
        launchEvent.exists = true;
        launchEvent.date = new Date(launchDateInput.value);
        launchEvent.inclination = parseFloat(launchInclinationSelect.value);
        launchEvent.omega = parseFloat(launchOmegaSelect.value);
        launchEvent.raan = parseFloat(launchRAANInput.value);
        launchEvent.perigeeAlt = parseFloat(launchPerigeeInput.value);
        launchEvent.apogeeAlt = parseFloat(launchApogeeInput.value);

        // Invalidate cache since launch parameters changed
        invalidateOrbitalParamsCache();

        // Update button text
        addLaunchBtn.textContent = '✏️ Edit Launch';

        // Update launch marker position
        updateLaunchMarker();

        // Update countdown timer
        updateCountdownTimer();

        // Sync GUI controls with launch event in Game mode
        syncGUIWithLaunchEvent();

        // Update period display
        updateChandrayaanPeriodDisplay();

        closePopup();
    });

    // Delete launch
    deleteLaunchBtn.addEventListener('click', () => {
        launchEvent.exists = false;
        launchEvent.date = null;
        launchMarker.style.display = 'none';
        addLaunchBtn.textContent = '🚀 Add Launch';

        // Invalidate cache since reverting to manual parameters
        invalidateOrbitalParamsCache();

        // Hide countdown timer
        updateCountdownTimer();

        // Sync GUI controls with manual parameters in Game mode
        syncGUIWithLaunchEvent();

        // Update orbit to show manual parameters
        updateChandrayaanOrbit();

        // Update period display
        updateChandrayaanPeriodDisplay();

        closePopup();
    });

    // Update launch marker position on timeline
    function updateLaunchMarker() {
        if (!launchEvent.exists) {
            launchMarker.style.display = 'none';
            return;
        }

        // Calculate days from start
        const daysFromStart = (launchEvent.date.getTime() - timelineState.startDate.getTime()) / (24 * 60 * 60 * 1000);

        // Clamp to [0, 90] range to handle small timing differences
        const clampedDays = Math.max(0, Math.min(90, daysFromStart));

        // Hide if significantly outside window (more than 1 day before or after)
        if (daysFromStart < -1 || daysFromStart > 91) {
            launchMarker.style.display = 'none';
            return;
        }

        // Show marker at relative position (0-100%)
        const percentage = (clampedDays / 90) * 100;
        launchMarker.style.display = 'block';
        launchMarker.style.left = `${percentage}%`;
    }

    // Drag launch marker
    let isDraggingMarker = false;

    launchMarker.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDraggingMarker = true;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingMarker) return;

        // Use timeline-wrapper rect since marker is positioned relative to it
        const wrapper = document.getElementById('timeline-wrapper');
        const wrapperRect = wrapper.getBoundingClientRect();
        const x = e.clientX - wrapperRect.left;
        const percentage = Math.max(0, Math.min(1, x / wrapperRect.width));
        const days = percentage * 90;

        // Update launch date
        launchEvent.date = new Date(timelineState.startDate.getTime() + days * 24 * 60 * 60 * 1000);

        // Directly set marker position during drag (no recalculation)
        launchMarker.style.left = `${percentage * 100}%`;

        // If we dragged past current timeline position, stop animation
        if (timelineState.daysElapsed >= days) {
            timelineState.isPlaying = false;
            document.getElementById('play-pause-btn').textContent = '▶ Play';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingMarker) {
            isDraggingMarker = false;
            // Recalculate position after drag ends to ensure consistency
            updateLaunchMarker();
        }
    });

    // Update marker when timeline start date changes
    const startDateInput = document.getElementById('start-date');
    const originalStartDateHandler = startDateInput.onchange;
    startDateInput.addEventListener('change', () => {
        updateLaunchMarker();
    });

    // Click on marker to edit
    launchMarker.addEventListener('click', (e) => {
        if (!isDraggingMarker) {
            e.stopPropagation();
            addLaunchBtn.click();
        }
    });
}

function updateCountdownTimer() {
    const countdownEl = document.getElementById('countdown-timer');

    if (!launchEvent.exists) {
        countdownEl.style.display = 'none';
        return;
    }

    countdownEl.style.display = 'block';

    // Calculate time difference in seconds
    const diffMs = timelineState.currentDate.getTime() - launchEvent.date.getTime();
    const diffSec = Math.abs(diffMs / 1000);

    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = Math.floor(diffSec % 60);

    const sign = diffMs < 0 ? '-' : '+';
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    countdownEl.textContent = `T${sign}${formattedTime}`;
}

// Update marker sizes based on camera distance (zoom-aware rendering)
function updateMarkerSizes() {
    const baseDistance = 150; // Reference distance (initial camera position)
    const baseScale = 1.0; // Original size at base distance

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
        let scale = (distance / baseDistance) * baseScale;

        // Cap the scale: min 0.3x (when very close), max 1.5x (when far)
        // This prevents tiny dots when far AND huge spheres when close
        const minScale = 0.3;
        const maxScale = 1.5;
        scale = Math.max(minScale, Math.min(maxScale, scale));

        node.scale.setScalar(scale);
    });

    // Aries marker (sprite): same caps as nodes
    if (ariesMarker) {
        const distance = camera.position.distanceTo(ariesMarker.position);
        let scale = (distance / baseDistance) * baseScale;

        const minScale = 0.3;
        const maxScale = 1.5;
        scale = Math.max(minScale, Math.min(maxScale, scale));

        // Sprites use uniform scale on X and Y (Z is always 1)
        const baseSize = 8; // Original scale from creation
        ariesMarker.scale.set(baseSize * scale, baseSize * scale, 1);
    }

    // Spacecraft: slightly larger caps
    if (chandrayaan) {
        const distance = camera.position.distanceTo(chandrayaan.position);

        let scale = (distance / baseDistance) * baseScale;

        // Cap: min 0.5x, max 2.0x (allow slightly larger than nodes)
        const minScale = 0.5;
        const maxScale = 2.0;
        scale = Math.max(minScale, Math.min(maxScale, scale));

        chandrayaan.scale.setScalar(scale);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastFrameTime = Date.now();

function animate() {
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

        // Clamp to 90 days max
        if (timelineState.daysElapsed >= 90) {
            timelineState.daysElapsed = 90;
            timelineState.isPlaying = false;
            document.getElementById('play-pause-btn').textContent = '▶ Play';
        }

        // Update current date
        timelineState.currentDate = new Date(
            timelineState.startDate.getTime() + timelineState.daysElapsed * 24 * 60 * 60 * 1000
        );

        // Update slider and display
        const slider = document.getElementById('timeline-slider');
        slider.value = timelineState.daysElapsed;

        const currentDateSpan = document.getElementById('current-date');
        currentDateSpan.textContent = timelineState.currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Update countdown timer if launch exists
        updateCountdownTimer();

        // Update moon position if in Real mode
        if (params.moonMode === 'Real') {
            updateMoonFromRealPosition();
        }

        // Update chandrayaan orbit if launched
        if (launchEvent.exists) {
            updateChandrayaanOrbit();
            // Sync GUI controls with current orbital state in Game mode
            syncGUIWithLaunchEvent();
        }
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
