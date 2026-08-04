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
 * PERF: hand-rolled instead of importing THREE.MathUtils.smoothstep. This
 * module is reached EAGERLY (page.tsx -> act1.tsx -> halftone-burst.tsx ->
 * phases.ts), entirely outside the `dynamic(ssr:false)` boundary that keeps
 * three.js/@react-three/fiber/drei out of the initial bundle (see act1.tsx's
 * Task 12 perf comment on the `Scene` import) -- a single `import "three"`
 * here for one function would have dragged three.js core back onto the
 * critical path. This is byte-for-byte the same algorithm as
 * THREE.MathUtils.smoothstep(x, min, max): clamp to 0/1 outside [min, max],
 * then the classic cubic Hermite ease (3t^2-2t^3) inside it.
 */
function smoothstep(x: number, min: number, max: number) {
  if (x <= min) return 0;
  if (x >= max) return 1;
  const t = (x - min) / (max - min);
  return t * t * (3 - 2 * t);
}

/**
 * Smoothstepped 0..1 position of `p` within phase [start, end]: 0 at/before
 * start, 1 at/after end, eased in between. Use to drive any per-phase
 * interpolation (camera, material, UV) without linear jerkiness at the
 * phase boundaries.
 */
export function phaseT(p: number, [start, end]: readonly [number, number]) {
  return smoothstep(p, start, end);
}
