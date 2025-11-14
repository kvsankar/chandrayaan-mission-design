import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';

// Three.js scene setup
let scene, camera, renderer, controls;
let celestialSphere;
let equatorCircle, lunarOrbitCircle, chandrayaanOrbitCircle;
let lunarAscendingNode, lunarDescendingNode;
let chandrayaanAscendingNode, chandrayaanDescendingNode;
let chandrayaanOrbitCircle3D, chandrayaan;
let moon;
let xAxis, yAxis, zAxis, ariesMarker;

// Parameters
const params = {
    // Visibility toggles
    showEquator: true,
    showAxes: true,
    showLunarOrbitPlane: true,
    showLunarNodes: true,
    showMoon: true,
    showChandrayaanOrbitPlane: true,
    showChandrayaanOrbit: true,
    showChandrayaanNodes: true,

    // Lunar orbit parameters (plane only, with Moon on circular orbit)
    lunarInclination: 23.44, // degrees (relative to equator)
    lunarNodes: 0, // RAAN - Right Ascension of Ascending Node
    moonRA: 0, // Moon's Right Ascension from First Point of Aries (degrees)

    // Chandrayaan orbit parameters (circular)
    chandrayaanInclination: 30, // degrees
    chandrayaanNodes: 0, // RAAN - Right Ascension of Ascending Node
    chandrayaanOmega: 0, // Argument of periapsis (degrees)
    chandrayaanRadius: 6371 + 400, // Earth radius + 400km altitude (scaled)
};

const SPHERE_RADIUS = 100;
const SCALE_FACTOR = SPHERE_RADIUS / 384400; // Scale lunar distance to fit scene

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

    // Setup GUI
    setupGUI();

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
        wireframe: false
    });
    celestialSphere = new THREE.Mesh(geometry, material);
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
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: COLORS.ariesMarker });
    ariesMarker = new THREE.Mesh(geometry, material);
    ariesMarker.position.set(SPHERE_RADIUS, 0, 0);
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
    // Create a circular orbit for Chandrayaan
    const radius = params.chandrayaanRadius * SCALE_FACTOR;
    const segments = 128;
    const points = [];

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(theta);
        const z = -radius * Math.sin(theta); // Negative for counter-clockwise from above
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

    // Position Chandrayaan at periapsis (in direction of omega)
    chandrayaan.position.set(radius, 0, 0);

    scene.add(chandrayaan);

    // Apply orbital rotations (after spacecraft is created)
    updateChandrayaanOrbit();
}

function updateChandrayaanOrbit() {
    // Recreate Chandrayaan orbit with current parameters
    scene.remove(chandrayaanOrbitCircle3D);

    const radius = params.chandrayaanRadius * SCALE_FACTOR;
    const segments = 128;
    const points = [];

    const omega = THREE.MathUtils.degToRad(params.chandrayaanOmega);
    const inc = THREE.MathUtils.degToRad(params.chandrayaanInclination);
    const raan = THREE.MathUtils.degToRad(params.chandrayaanNodes);

    // Create circular orbit in XZ plane (counter-clockwise from above)
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const point = new THREE.Vector3(
            radius * Math.cos(theta),
            0,
            -radius * Math.sin(theta)  // Negative for counter-clockwise viewing from above
        );

        // Apply rotations: omega, then inclination, then RAAN
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

    // Update Chandrayaan position (at periapsis direction, omega = 0 in orbital plane)
    const spacecraftPos = new THREE.Vector3(radius, 0, 0);
    spacecraftPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), omega);
    spacecraftPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inc);
    spacecraftPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), raan);

    chandrayaan.position.copy(spacecraftPos);
}

function updateOrbitalElements() {
    // Info panel removed - orbital elements now shown in GUI controls
}

function setupGUI() {
    const gui = new GUI();

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
    visibilityFolder.open();

    // Lunar orbit folder
    const lunarFolder = gui.addFolder('Lunar Orbit Parameters');
    lunarFolder.add(params, 'lunarInclination', 18.3, 28.6, 0.1).name('Inclination (°)').onChange(() => {
        updateLunarOrbitCircle();
        updateLunarNodePositions();
        updateMoonPosition();
        updateOrbitalElements();
    });
    lunarFolder.add(params, 'lunarNodes', 0, 360, 1).name('Nodes (RAAN) (°)').onChange(() => {
        updateLunarOrbitCircle();
        updateLunarNodePositions();
        updateMoonPosition();
        updateOrbitalElements();
    });
    lunarFolder.add(params, 'moonRA', 0, 360, 1).name('Moon RA (°)').onChange(() => {
        updateMoonPosition();
        updateOrbitalElements();
    });
    lunarFolder.open();

    // Chandrayaan orbit folder
    const chandrayaanFolder = gui.addFolder('Chandrayaan Orbit Parameters');
    chandrayaanFolder.add(params, 'chandrayaanInclination', 0, 90, 0.1).name('Inclination (°)').onChange(() => {
        updateChandrayaanOrbitCircle();
        updateChandrayaanOrbit();
        updateChandrayaanNodePositions();
        updateOrbitalElements();
    });
    chandrayaanFolder.add(params, 'chandrayaanNodes', 0, 360, 1).name('Nodes (RAAN) (°)').onChange(() => {
        updateChandrayaanOrbitCircle();
        updateChandrayaanOrbit();
        updateChandrayaanNodePositions();
        updateOrbitalElements();
    });
    chandrayaanFolder.add(params, 'chandrayaanOmega', 0, 360, 1).name('ω (Arg. Periapsis) (°)').onChange(() => {
        updateChandrayaanOrbit();
        updateOrbitalElements();
    });
    chandrayaanFolder.open();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
