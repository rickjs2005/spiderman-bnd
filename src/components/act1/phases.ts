import { MathUtils } from "three";

/**
 * Progress ranges (0..1 of Act 1's scroll) for the four narrative beats of
 * "The Eye" sequence. This is the single source of truth for phase timing --
 * re-exported from scene.tsx so Tasks 5-7 only need one import path.
 */
export const PHASE_EYE: [number, number] = [0, 0.35];
export const PHASE_CROSS: [number, number] = [0.35, 0.45];
export const PHASE_DIVE: [number, number] = [0.45, 0.95];
export const PHASE_BURST: [number, number] = [0.95, 1];

/**
 * Smoothstepped 0..1 position of `p` within phase [start, end]: 0 at/before
 * start, 1 at/after end, eased in between. Use to drive any per-phase
 * interpolation (camera, material, UV) without linear jerkiness at the
 * phase boundaries.
 */
export function phaseT(p: number, [start, end]: readonly [number, number]) {
  return MathUtils.smoothstep(p, start, end);
}
