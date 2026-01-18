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
  export function GeoMoonState(time: AstroTime): { position: Vector; velocity: Vector };
  export function GeoVector(body: Body, time: AstroTime, aberration: boolean): Vector;
  export function HelioVector(body: Body, time: AstroTime): Vector;
  export function Equator(body: string, time: AstroTime, observer: Observer | null, ofdate: boolean, aberration: boolean): Equator;
  export function EquatorFromVector(vector: Vector): Equator;
  export function MoonPhase(time: AstroTime): number;
  export function Libration(time: AstroTime): LibrationInfo;
}
