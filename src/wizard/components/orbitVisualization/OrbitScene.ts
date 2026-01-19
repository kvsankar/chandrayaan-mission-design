/**
 * Orbit Scene - Three.js Scene Setup
 *
 * Handles all Three.js rendering. This is part of the imperative shell.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    SPHERE_RADIUS,
    SCALE_FACTOR,
    EARTH_RADIUS,
    COLORS,
    ORBIT_SEGMENTS_DETAILED
} from '../../../constants.js';
import { calculateSpacecraftPosition } from './orbitCore.js';
import { Position3D, OrbitalParams } from './types.js';

export class OrbitScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    // Scene objects
    private moon: THREE.Mesh;
    private spacecraft: THREE.Mesh;
    private transferOrbit: THREE.Line | null = null;
    private lunarOrbit: THREE.Line | null = null;
    private lunarOrbitEllipse: THREE.Line | null = null;
    private ariesMarker: THREE.Sprite | null = null;
    private equatorLabels: THREE.Sprite[] = [];
    private viewOptions = {
        moon: true,
        transferOrbit: true,
        lunarPlane: true,
        lunarEllipse: true,
        spacecraft: true,
        labels: true
    };

    private disposed = false;

    constructor(container: HTMLElement, width: number, height: number) {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
        this.camera.position.set(180, 120, 180);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x0a0a1e, 1);
        container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 400;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        pointLight.position.set(150, 150, 150);
        this.scene.add(pointLight);

        // Create scene objects
        this.createCelestialSphere();
        this.createEquator();
        this.createEarth();
        this.moon = this.createMoon();
        this.spacecraft = this.createSpacecraft();
        this.createAxes();
        this.createAriesMarker();
        this.createEquatorLabels();
    }

    private createCelestialSphere(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0x1a1a2e,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            wireframe: false,
            depthWrite: false
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.renderOrder = 0;
        this.scene.add(sphere);
        return sphere;
    }

    private createEquator(): THREE.Line {
        const segments = 128;
        const points = Array.from({ length: segments + 1 }, (_, i) => {
            const theta = (i / segments) * Math.PI * 2;
            return new THREE.Vector3(
                SPHERE_RADIUS * Math.cos(theta),
                0,
                -SPHERE_RADIUS * Math.sin(theta)
            );
        });
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: COLORS.equator, linewidth: 2 });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        return line;
    }

    private createEarth(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(EARTH_RADIUS * SCALE_FACTOR, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0x2e6dd8,
            emissive: 0x08244c,
            shininess: 20
        });
        const earth = new THREE.Mesh(geometry, material);
        this.scene.add(earth);
        return earth;
    }

    private createMoon(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshPhongMaterial({ color: COLORS.moon });
        const moon = new THREE.Mesh(geometry, material);
        this.scene.add(moon);
        return moon;
    }

    private createSpacecraft(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: COLORS.chandrayaan });
        const spacecraft = new THREE.Mesh(geometry, material);
        this.scene.add(spacecraft);
        return spacecraft;
    }

    private createAxes(): void {
        // X-axis (to First Point of Aries) - Red, dashed
        const xPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(SPHERE_RADIUS * 1.2, 0, 0)];
        const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
        const xMaterial = new THREE.LineDashedMaterial({ color: COLORS.xAxis, dashSize: 3, gapSize: 2 });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        xAxis.computeLineDistances();
        this.scene.add(xAxis);

        // Y-axis (celestial) - Green, dashed
        const yPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -SPHERE_RADIUS * 1.2)];
        const yGeometry = new THREE.BufferGeometry().setFromPoints(yPoints);
        const yMaterial = new THREE.LineDashedMaterial({ color: COLORS.yAxis, dashSize: 3, gapSize: 2 });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        yAxis.computeLineDistances();
        this.scene.add(yAxis);

        // Z-axis (to North Celestial Pole) - Blue, dashed
        const zPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, SPHERE_RADIUS * 1.2, 0)];
        const zGeometry = new THREE.BufferGeometry().setFromPoints(zPoints);
        const zMaterial = new THREE.LineDashedMaterial({ color: COLORS.zAxis, dashSize: 3, gapSize: 2 });
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        zAxis.computeLineDistances();
        this.scene.add(zAxis);
    }

    private createTextSprite(label: string, color: string, size: number = 64): THREE.Sprite {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = size;
        canvas.height = size;
        context.clearRect(0, 0, size, size);
        context.fillStyle = color;
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(label, size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(8, 8, 1);
        return sprite;
    }

    private createEquatorLabels(): void {
        const radius = SPHERE_RADIUS * 1.05;
        const labels = [
            { text: '0°', pos: new THREE.Vector3(radius, 0, 0) },
            { text: '90°', pos: new THREE.Vector3(0, 0, -radius) },
            { text: '180°', pos: new THREE.Vector3(-radius, 0, 0) },
            { text: '270°', pos: new THREE.Vector3(0, 0, radius) }
        ];

        labels.forEach(({ text, pos }) => {
            const sprite = this.createTextSprite(text, '#ffffff');
            sprite.position.copy(pos);
            sprite.renderOrder = 5;
            this.scene.add(sprite);
            this.equatorLabels.push(sprite);
        });
    }

    private createAriesMarker(): void {
        const sprite = this.createTextSprite('♈', '#ff0000');
        const offset = SPHERE_RADIUS * 1.25;
        sprite.position.set(offset, 0, 0);
        sprite.scale.set(10, 10, 1);
        sprite.renderOrder = 6;
        this.scene.add(sprite);
        this.ariesMarker = sprite;
    }

    /**
     * Update Moon position (in km, Three.js coords)
     */
    updateMoonPosition(positionKm: Position3D): void {
        this.moon.position.set(
            positionKm.x * SCALE_FACTOR,
            positionKm.y * SCALE_FACTOR,
            positionKm.z * SCALE_FACTOR
        );
        this.moon.visible = this.viewOptions.moon;
    }

    /**
     * Update spacecraft position (in km, Three.js coords)
     */
    updateSpacecraftPosition(positionKm: Position3D): void {
        this.spacecraft.position.set(
            positionKm.x * SCALE_FACTOR,
            positionKm.y * SCALE_FACTOR,
            positionKm.z * SCALE_FACTOR
        );
        this.spacecraft.visible = this.viewOptions.spacecraft;
    }

    /**
     * Set spacecraft appearance (visible, grayed out, hidden)
     */
    setSpacecraftAppearance(mode: 'normal' | 'preLaunch' | 'captured'): void {
        const material = this.spacecraft.material as THREE.MeshPhongMaterial;

        switch (mode) {
            case 'normal':
                this.spacecraft.visible = this.viewOptions.spacecraft;
                material.color.setHex(COLORS.chandrayaan);
                material.emissive.setHex(0x222222);
                break;
            case 'preLaunch':
                this.spacecraft.visible = this.viewOptions.spacecraft;
                material.color.setHex(0x888888);
                material.emissive.setHex(0x000000);
                break;
            case 'captured':
                // Hide spacecraft once captured
                this.spacecraft.visible = false;
                material.color.setHex(0x00ff99);
                material.emissive.setHex(0x004422);
                break;
        }
    }

    /**
     * Create/update the transfer orbit line
     */
    updateTransferOrbit(orbital: OrbitalParams): void {
        // Remove existing orbit
        if (this.transferOrbit) {
            this.scene.remove(this.transferOrbit);
            this.transferOrbit.geometry.dispose();
            (this.transferOrbit.material as THREE.Material).dispose();
        }

        const segments = ORBIT_SEGMENTS_DETAILED;
        const points = Array.from({ length: segments + 1 }, (_, i) => {
            const trueAnomalyDeg = (i / segments) * 360;
            const posKm = calculateSpacecraftPosition(trueAnomalyDeg, orbital);
            return new THREE.Vector3(
                posKm.x * SCALE_FACTOR,
                posKm.y * SCALE_FACTOR,
                posKm.z * SCALE_FACTOR
            );
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: COLORS.chandrayaanOrbit,
            dashSize: 3,
            gapSize: 2
        });
        this.transferOrbit = new THREE.Line(geometry, material);
        this.transferOrbit.computeLineDistances();
        this.transferOrbit.visible = this.viewOptions.transferOrbit;
        this.scene.add(this.transferOrbit);
    }

    /**
     * Create/update lunar orbit visualization
     */
    updateLunarOrbit(inclination: number, raan: number): void {
        // Remove existing
        if (this.lunarOrbit) {
            this.scene.remove(this.lunarOrbit);
            this.lunarOrbit.geometry.dispose();
            (this.lunarOrbit.material as THREE.Material).dispose();
        }

        const segments = 128;
        const incRad = THREE.MathUtils.degToRad(inclination);
        const raanRad = THREE.MathUtils.degToRad(raan);

        const points = Array.from({ length: segments + 1 }, (_, i) => {
            const theta = (i / segments) * Math.PI * 2;
            const point = new THREE.Vector3(
                SPHERE_RADIUS * Math.cos(theta),
                0,
                -SPHERE_RADIUS * Math.sin(theta)
            );
            point.applyAxisAngle(new THREE.Vector3(1, 0, 0), incRad);
            point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);
            return point;
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: COLORS.lunarOrbitPlane, linewidth: 2 });
        this.lunarOrbit = new THREE.Line(geometry, material);
        this.lunarOrbit.visible = this.viewOptions.lunarPlane;
        this.scene.add(this.lunarOrbit);
    }

    /**
     * Create/update lunar orbit ellipse (ephemeris-based)
     */
    updateLunarOrbitEllipse(params: { semiMajorAxisKm: number; eccentricity: number; inclination: number; raan: number; omega: number }): void {
        if (this.lunarOrbitEllipse) {
            this.scene.remove(this.lunarOrbitEllipse);
            this.lunarOrbitEllipse.geometry.dispose();
            (this.lunarOrbitEllipse.material as THREE.Material).dispose();
            this.lunarOrbitEllipse = null;
        }

        const { semiMajorAxisKm, eccentricity, inclination, raan, omega } = params;
        const a = semiMajorAxisKm * SCALE_FACTOR;
        const e = Math.max(0, Math.min(0.99, eccentricity));
        const incRad = THREE.MathUtils.degToRad(inclination);
        const raanRad = THREE.MathUtils.degToRad(raan);
        const omegaRad = THREE.MathUtils.degToRad(omega);
        const segments = ORBIT_SEGMENTS_DETAILED;

        const points = Array.from({ length: segments + 1 }, (_, i) => {
            const theta = (i / segments) * Math.PI * 2;
            const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
            const point = new THREE.Vector3(
                r * Math.cos(theta),
                0,
                -r * Math.sin(theta)
            );

            point.applyAxisAngle(new THREE.Vector3(0, 1, 0), omegaRad);
            point.applyAxisAngle(new THREE.Vector3(1, 0, 0), incRad);
            point.applyAxisAngle(new THREE.Vector3(0, 1, 0), raanRad);

            return point;
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: COLORS.moon,
            dashSize: 3,
            gapSize: 2
        });
        this.lunarOrbitEllipse = new THREE.Line(geometry, material);
        this.lunarOrbitEllipse.computeLineDistances();
        this.lunarOrbitEllipse.visible = this.viewOptions.lunarEllipse;
        this.scene.add(this.lunarOrbitEllipse);
    }

    /**
     * Toggle visibility of scene elements
     */
    setViewOptions(options: Partial<typeof this.viewOptions>): void {
        this.viewOptions = { ...this.viewOptions, ...options };

        if (this.moon) this.moon.visible = this.viewOptions.moon;
        if (this.transferOrbit) this.transferOrbit.visible = this.viewOptions.transferOrbit;
        if (this.lunarOrbit) this.lunarOrbit.visible = this.viewOptions.lunarPlane;
        if (this.lunarOrbitEllipse) this.lunarOrbitEllipse.visible = this.viewOptions.lunarEllipse;
        if (this.spacecraft) this.spacecraft.visible = this.viewOptions.spacecraft;
        if (this.ariesMarker) this.ariesMarker.visible = this.viewOptions.labels;
        this.equatorLabels.forEach(label => label.visible = this.viewOptions.labels);
    }

    /**
     * Resize the renderer
     */
    resize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Render one frame
     */
    render(): void {
        if (this.disposed) return;
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Get the canvas element
     */
    getCanvas(): HTMLCanvasElement {
        return this.renderer.domElement;
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.disposed = true;

        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
            if (object instanceof THREE.Line) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach(m => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
            if (object instanceof THREE.Sprite) {
                object.material.map?.dispose();
                object.material.dispose();
            }
        });

        this.renderer.dispose();
        this.controls.dispose();

        const canvas = this.renderer.domElement;
        if (canvas.parentElement) {
            canvas.parentElement.removeChild(canvas);
        }
    }
}
