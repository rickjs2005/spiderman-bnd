/**
 * Shared state for Act 1, outside React: ScrollTrigger writes `raw`, a rAF
 * loop damps it into `progress`. No setState per frame, no re-render.
 *
 * Handoff: until the R3F scene mounts (Task 4), Act1's own rAF loop owns the
 * damp propagation (raw -> progress) so the DOM overlay and the capture
 * script see movement immediately. Once the canvas's useFrame takes over it
 * flips act1Flags.sceneOwnsProgress = true and Act1's loop stops writing
 * `progress` (it still forwards `raw`, which is harmless / idempotent).
 */
export const act1State = {
  /** raw progress from ScrollTrigger (0..1) */
  raw: 0,
  /** damped progress, updated every frame -- what the camera/overlay read */
  progress: 0,
  /** normalized mouse (-1..1), damping applied by whoever owns the rig */
  mouseX: 0,
  mouseY: 0,
};

/** Set by the R3F scene (Task 4) once its own useFrame starts damping
 * act1State.progress, so the Act1 shell's temporary rAF loop backs off. */
export const act1Flags = {
  sceneOwnsProgress: false,
};

/** Framerate-independent exponential damping. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
