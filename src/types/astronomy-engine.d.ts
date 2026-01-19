declare module 'astronomy-engine' {
  export class Vector {
    x: number;
    y: number;
    z: number;
    t: AstroTime;
  }

  export class AstroTime {
    constructor(date: Date | number);
    date: Date;
    tt: number;
    ut: number;
    AddDays(days: number): AstroTime;
  }

  export class Equator {
    ra: number;
    dec: number;
    dist: number;
    vec: Vector;
  }

  export class Observer {
    constructor(latitude: number, longitude: number, height: number);
    latitude: number;
    longitude: number;
    height: number;
  }

  export interface LibrationInfo {
    elat: number;      // Ecliptic latitude libration (degrees)
    elon: number;      // Ecliptic longitude libration (degrees)
    mlat: number;      // Moon's ecliptic latitude (degrees)
    mlon: number;      // Moon's ecliptic longitude (degrees)
    dist_km: number;   // Earth-Moon distance in kilometers
    diam_deg: number;  // Moon's apparent angular diameter (degrees)
  }

  export interface AxisInfo {
    ra: number;        // Right ascension of the rotation axis (degrees)
    dec: number;       // Declination of the rotation axis (degrees)
    spin: number;      // Spin angle about the rotation axis (degrees)
    north: Vector;     // North pole direction unit vector
  }

  export enum Body {
    Sun = 'Sun',
    Moon = 'Moon',
    Mercury = 'Mercury',
    Venus = 'Venus',
    Earth = 'Earth',
    Mars = 'Mars',
    Jupiter = 'Jupiter',
    Saturn = 'Saturn',
    Uranus = 'Uranus',
    Neptune = 'Neptune',
    Pluto = 'Pluto'
  }

  export function MakeTime(date: Date | number): AstroTime;
  export function GeoMoon(time: AstroTime): Vector;
  export function GeoMoonState(time: AstroTime): { position: Vector; velocity: Vector } | (Vector & { vx: number; vy: number; vz: number });
  export function GeoVector(body: Body, time: AstroTime, aberration: boolean): Vector;
  export function HelioVector(body: Body, time: AstroTime): Vector;
  export function Equator(body: string, time: AstroTime, observer: Observer | null, ofdate: boolean, aberration: boolean): Equator;
  export function EquatorFromVector(vector: Vector): Equator;
  export function MoonPhase(time: AstroTime): number;
  export function Libration(time: AstroTime): LibrationInfo;
  export function RotationAxis(body: string, time: AstroTime): AxisInfo;
  export function Search(func: (time: AstroTime) => number, t1: AstroTime, t2: AstroTime, options?: { dt_tolerance_seconds?: number }): AstroTime | null;
  export function Ecliptic(vector: Vector): { elat: number; elon: number };
}
