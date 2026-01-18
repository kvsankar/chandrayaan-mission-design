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

  export function MakeTime(date: Date | number): AstroTime;
  export function GeoMoon(time: AstroTime): Vector;
  export function GeoMoonState(time: AstroTime): { position: Vector; velocity: Vector };
  export function Equator(body: string, time: AstroTime, observer: Observer | null, ofdate: boolean, aberration: boolean): Equator;
  export function EquatorFromVector(vector: Vector): Equator;
  export function MoonPhase(time: AstroTime): number;
}
