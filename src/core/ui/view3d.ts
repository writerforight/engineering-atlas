import type { Vec } from '../math/matrix';

/** Orthographic camera looking at the origin from azimuth/elevation (radians), z up. */
export interface Camera3 {
  right: Vec;
  up: Vec;
  /** Unit vector from the origin toward the viewer. */
  toViewer: Vec;
}

export function camera(az: number, el: number): Camera3 {
  const toViewer = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
  const right = [-Math.sin(az), Math.cos(az), 0];
  const up = [
    toViewer[1]! * right[2]! - toViewer[2]! * right[1]!,
    toViewer[2]! * right[0]! - toViewer[0]! * right[2]!,
    toViewer[0]! * right[1]! - toViewer[1]! * right[0]!,
  ];
  return { right, up, toViewer };
}

const dot = (a: Vec, b: Vec) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

/** World point -> 2D screen-plane coordinates (same units as the world). */
export function project(cam: Camera3, p: Vec): [number, number] {
  return [dot(p, cam.right), dot(p, cam.up)];
}

/** Signed distance toward the viewer (larger = closer). */
export function depth(cam: Camera3, p: Vec): number {
  return dot(p, cam.toViewer);
}
