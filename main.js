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
let raanLine1, raanLine2, raanArc, raanPie, raanLabel; // RAAN angle visualization
let aopLine1, aopLine2, aopArc, aopPie, aopLabel; // AOP angle visualization

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
    showRAANAngle: false,
    showAOPAngle: false,

    // Lunar orbit parameters (plane only, with Moon on circular orbit)
    lunarInclination: 23.44, // degrees (relative to equator)
    lunarNodes: 0, // RAAN - Right Ascension of Ascending Node
    moonRA: 0, // Moon's Right Ascension from First Point of Aries (degrees)

    // Chandrayaan orbit parameters (elliptical)
    chandrayaanInclination: 30, // degrees
    chandrayaanNodes: 0, // RAAN - Right Ascension of Ascending Node
    chandrayaanOmega: 45, // Argument of periapsis (degrees)
    chandrayaanPerigeeAlt: 180, // Perigee altitude in km (apogee fixed at lunar orbit distance)
    chandrayaanTrueAnomaly: 0, // True anomaly (position along orbit, degrees)
};

const SPHERE_RADIUS = 100;
const LUNAR_ORBIT_DISTANCE = 384400; // Lunar orbit distance in km
const SCALE_FACTOR = SPHERE_RADIUS / LUNAR_ORBIT_DISTANCE; // Scale lunar distance to fit scene
const EARTH_RADIUS = 6371; // Earth radius in km

// Helper function to calculate Chandrayaan orbit eccentricity
function calculateChandrayaanEccentricity() {
    const perigeeDistance = EARTH_RADIUS + params.chandrayaanPerigeeAlt;
    const apogeeDistance = LUNAR_ORBIT_DISTANCE;
    const e = (apogeeDistance - perigeeDistance) / (apogeeDistance + perigeeDistance);
    return e;
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
    // Recreate Chandrayaan orbit with current parameters
    scene.remove(chandrayaanOrbitCircle3D);

    // Calculate orbital parameters
    const e = calculateChandrayaanEccentricity();
    const perigeeDistance = (EARTH_RADIUS + params.chandrayaanPerigeeAlt) * SCALE_FACTOR;
    const a = perigeeDistance / (1 - e); // Semi-major axis

    const segments = 128;
    const points = [];

    const omega = THREE.MathUtils.degToRad(params.chandrayaanOmega);
    const inc = THREE.MathUtils.degToRad(params.chandrayaanInclination);
    const raan = THREE.MathUtils.degToRad(params.chandrayaanNodes);

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
    const nu = THREE.MathUtils.degToRad(params.chandrayaanTrueAnomaly);
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
        updateAOPLines();
        updateOrbitalElements();
    });
    chandrayaanFolder.add(params, 'chandrayaanNodes', 0, 360, 1).name('Nodes (RAAN) (°)').onChange(() => {
        updateChandrayaanOrbitCircle();
        updateChandrayaanOrbit();
        updateChandrayaanNodePositions();
        updateRAANLines();
        updateAOPLines();
        updateOrbitalElements();
    });
    chandrayaanFolder.add(params, 'chandrayaanOmega', 0, 360, 1).name('ω (Arg. Periapsis) (°)').onChange(() => {
        updateChandrayaanOrbit();
        updateAOPLines();
        updateOrbitalElements();
    });
    chandrayaanFolder.add(params, 'chandrayaanPerigeeAlt', 180, 10000, 10).name('Perigee Altitude (km)').onChange(() => {
        updateChandrayaanOrbit();
        updateOrbitalElements();
    });
    chandrayaanFolder.add(params, 'chandrayaanTrueAnomaly', 0, 360, 1).name('True Anomaly (°)').onChange(() => {
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
