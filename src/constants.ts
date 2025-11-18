// Timeline constants
export const TIMELINE_MAX_DAYS = 90;

// Scene and orbital constants
export const SPHERE_RADIUS = 100;
export const LUNAR_ORBIT_DISTANCE = 384400;
export const SCALE_FACTOR = SPHERE_RADIUS / LUNAR_ORBIT_DISTANCE;
export const EARTH_RADIUS = 6371;
export const MOON_RADIUS = 1737;
export const EARTH_MU = 398600.4418;

// Camera configuration
export const CAMERA_FOV = 45;
export const CAMERA_NEAR_PLANE = 0.1;
export const CAMERA_FAR_PLANE = 10000;
export const CAMERA_INITIAL_X = 240;
export const CAMERA_INITIAL_Y = 160;
export const CAMERA_INITIAL_Z = 240;

// Rendering constants
export const ORBIT_SEGMENTS_DETAILED = 512;
export const ORBIT_SEGMENTS_STANDARD = 128;
export const SPRITE_CANVAS_SIZE = 128;
export const SPRITE_FONT_SIZE = 80;

// Zoom-aware scaling constants
export const ZOOM_BASE_DISTANCE = 240;
export const ZOOM_BASE_SCALE = 1.0;
export const ZOOM_NODE_MIN_SCALE = 0.3;
export const ZOOM_NODE_MAX_SCALE = 1.5;
export const ZOOM_ARIES_MIN_SCALE = 0.2;
export const ZOOM_ARIES_MAX_SCALE = 0.8;
export const ZOOM_SPACECRAFT_MIN_SCALE = 0.5;
export const ZOOM_SPACECRAFT_MAX_SCALE = 2.0;

// Sprite base sizes
export const ARIES_MARKER_BASE_SIZE = 8;

// Color scheme
export interface Colors {
    xAxis: number;
    yAxis: number;
    zAxis: number;
    ariesMarker: number;
    equator: number;
    lunarOrbitPlane: number;
    lunarAscending: number;
    lunarDescending: number;
    moon: number;
    chandrayaanPlane: number;
    chandrayaanOrbit: number;
    chandrayaanAscending: number;
    chandrayaanDescending: number;
    chandrayaan: number;
}

export const COLORS: Colors = {
    xAxis: 0xff0000,
    yAxis: 0x00ff00,
    zAxis: 0x0000ff,
    ariesMarker: 0xff0000,
    equator: 0xffffff,
    lunarOrbitPlane: 0xff00ff,
    lunarAscending: 0x00ffff,
    lunarDescending: 0xff8800,
    moon: 0xaaaaaa,
    chandrayaanPlane: 0xffff00,
    chandrayaanOrbit: 0xffff00,
    chandrayaanAscending: 0x88ff88,
    chandrayaanDescending: 0xff88ff,
    chandrayaan: 0xffffff
};
