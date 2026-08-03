"use client";

/* eslint-disable react-hooks/immutability -- consistent with dive.tsx/eye-mask.tsx/
   scene.tsx: three.js buffer attributes and materials here are mutated in place
   every frame from useFrame (curve/dust positions written directly into
   preallocated Float32Arrays, opacity written onto existing materials), never
   through React state. This deliberately avoids drei's <Line> component: its
   Line2/LineGeometry.setPositions() allocates a new InstancedInterleavedBuffer
   + attributes on every call (see node_modules/three-stdlib/lines/
   LineSegmentsGeometry.js), which would violate the project's no-allocation-
   in-useFrame rule if called every frame to track a moving endpoint. A plain
   THREE.Line with a hand-mutated BufferAttribute gets the same quadratic-curve
   visual with zero per-frame allocations. */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { act1State } from "@/lib/act1-store";
import { PHASE_DIVE, phaseT } from "./phases";

/**
 * Spidey pendulum constants, duplicated from dive.tsx (not exported there).
 * SOURCE OF TRUTH: src/components/act1/dive.tsx -- its SPIDEY_CAM_OFFSET /
 * SPIDEY_X_AMPLITUDE / SPIDEY_Y_AMPLITUDE / SPIDEY_Y_BASELINE / SWAY_CYCLES
 * constants and the `u`/`x`/`y` computation inside its useFrame. Keep these
 * in sync if dive.tsx's pendulum math ever changes -- the web lines' end
 * point must land exactly where Spidey actually renders.
 */
const SPIDEY_CAM_OFFSET = 2.5;
const SPIDEY_X_AMPLITUDE = 2.2;
const SPIDEY_Y_AMPLITUDE = 0.8;
const SPIDEY_Y_BASELINE = 0.6;
const SWAY_CYCLES = 2;

/** Off-screen anchor points (camera-relative x/y, plus how much nearer the
 * camera than Spidey's own depth each anchor sits) that each web line
 * stretches from. Spread across the frame's corners/edges so the 4 strands
 * don't read as parallel duplicates of each other. */
const WEB_ANCHORS = [
  { x: -4.6, y: 3.1, camDepthOffset: 1.1 },
  { x: 4.8, y: 2.6, camDepthOffset: 1.6 },
  { x: -5.1, y: -0.6, camDepthOffset: 0.7 },
  { x: 4.6, y: -1.4, camDepthOffset: 1.3 },
] as const;
const WEB_COUNT = WEB_ANCHORS.length;
const WEB_SEGMENTS = 12; // -> 13 sampled points per quadratic curve
const WEB_POINTS = WEB_SEGMENTS + 1;
/** Vertical sag of the curve's control point below the anchor/end midpoint
 * -- reads as a web strand catching a slight droop, not a laser-straight
 * line. */
const WEB_SAG = 0.55;
/** Each line's firing phase is offset from the others by a fraction of the
 * quarter-swing reversal period (pi/2 in `u`, see the pulse comment below)
 * so the 4 strands fire in a staggered sequence across the dive instead of
 * all flashing at once. */
const WEB_PHASE_STEP = Math.PI / 2 / WEB_COUNT;
const WEB_COLOR = "#eef4ff";
const WEB_MAX_OPACITY = 0.85;
/** Power the (0..1) reversal pulse is raised to -- higher = a snappier
 * "flash and fade" instead of a slow sine breathing. */
const WEB_PULSE_SHARPNESS = 4;

const DUST_COUNT = 400; // hard cap -- project-wide particle budget
const DUST_BOX = { x: 12, y: 8, z: 16 } as const;
/** Local-space z drift per second, toward the camera (z=0). Dust starts
 * spread through the box's full depth ahead of the camera and streams past
 * it, wrapping back to the far end -- a cheap per-particle scalar add, not
 * a from-scratch position recompute, and it's what sells forward speed. */
const DUST_DRIFT_SPEED = 7;
/** Closest a particle is ever allowed to get to the camera before wrapping
 * back to the box's far edge. PointsMaterial's `sizeAttenuation` scales a
 * point's on-screen size inversely with camera distance -- letting
 * particles drift all the way to z~0 (right at the lens) would blow their
 * projected size up into huge soft blobs. Keeping every particle at least
 * this far out caps how large sizeAttenuation can ever scale a point. */
const DUST_NEAR_Z = -0.8;
/** Draw order for the web lines and dust, both well above the diorama
 * layers' default 0. Three.js sorts transparent objects back-to-front for
 * blending using a single per-object distance (their geometry's bounding
 * sphere) -- fine for dive.tsx's compact planes, but the dust cloud's
 * bounding sphere spans the whole 16-unit box, so its one sort-distance
 * frequently landed "behind" whichever NYC layer was at full opacity,
 * which then painted over the *entire* points draw call in one shot
 * (verified: this made the dust and even a giant diagnostic test mesh
 * invisible regardless of depthTest/depthWrite -- draw order, not depth
 * testing, was the actual bug). Forcing renderOrder makes both always draw
 * after the diorama, independent of that unreliable distance heuristic --
 * appropriate anyway, since this is meant to read as close-to-camera set
 * dressing, not backdrop geometry. */
const FOREGROUND_RENDER_ORDER = 10;
const DUST_SIZE = 0.03;
const DUST_MAX_OPACITY = 0.55;
const DUST_COLOR = "#bfe0ff";

function makeWebBuffer() {
  return new Float32Array(WEB_POINTS * 3);
}

function randomDustBox(): Float32Array {
  const arr = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    arr[i * 3] = (Math.random() - 0.5) * DUST_BOX.x;
    arr[i * 3 + 1] = (Math.random() - 0.5) * DUST_BOX.y;
    // Spread through the full box depth, but never closer than DUST_NEAR_Z.
    arr[i * 3 + 2] = DUST_NEAR_Z - Math.random() * DUST_BOX.z;
  }
  return arr;
}

/**
 * Act 1 "The Dive" set dressing: web lines that fire toward Spidey's
 * pendulum position on each swing reversal, plus a drifting dust field that
 * sells forward speed. Active only during PHASE_DIVE -- see the early-out
 * at the top of useFrame, which skips all per-line/per-particle work (and
 * hides the group) outside that window. Mounted inside Scene's <Canvas>,
 * alongside <Dive/> (reads camera.position, never writes it -- Rig owns the
 * camera).
 */
export function Webs() {
  const camera = useThree((s) => s.camera);
  const groupRef = useRef<THREE.Group>(null);

  const webBuffers = useMemo(() => Array.from({ length: WEB_COUNT }, makeWebBuffer), []);
  const webAttrRefs = useRef<(THREE.BufferAttribute | null)[]>(new Array(WEB_COUNT).fill(null));
  const webMaterialRefs = useRef<(THREE.LineBasicMaterial | null)[]>(new Array(WEB_COUNT).fill(null));

  const dustPositions = useMemo(() => randomDustBox(), []);
  const dustAttrRef = useRef<THREE.BufferAttribute>(null);
  const dustMaterialRef = useRef<THREE.PointsMaterial>(null);
  const dustPointsRef = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    const p = act1State.progress;
    const diveT = phaseT(p, PHASE_DIVE);
    const active = diveT > 0.0005;
    if (groupRef.current) groupRef.current.visible = active;
    if (!active) return; // cheap early-out: no per-line/per-particle work outside PHASE_DIVE

    const camZ = camera.position.z;

    // Spidey's current pendulum position -- see the SOURCE OF TRUTH comment
    // above; must match dive.tsx exactly so the web lines land on him.
    const u = diveT * Math.PI * 2 * SWAY_CYCLES;
    const sx = Math.sin(u) * SPIDEY_X_AMPLITUDE;
    const sy = -Math.abs(Math.cos(u)) * SPIDEY_Y_AMPLITUDE + SPIDEY_Y_BASELINE;
    const sz = camZ - SPIDEY_CAM_OFFSET;

    for (let i = 0; i < WEB_COUNT; i++) {
      const anchor = WEB_ANCHORS[i];
      const ax = anchor.x;
      const ay = anchor.y;
      const az = camZ - anchor.camDepthOffset;
      const cx = (ax + sx) * 0.5;
      const cy = (ay + sy) * 0.5 - WEB_SAG;
      const cz = (az + sz) * 0.5;

      const buf = webBuffers[i];
      for (let s = 0; s < WEB_POINTS; s++) {
        const t = s / WEB_SEGMENTS;
        const it = 1 - t;
        const w0 = it * it;
        const w1 = 2 * it * t;
        const w2 = t * t;
        const idx = s * 3;
        buf[idx] = w0 * ax + w1 * cx + w2 * sx;
        buf[idx + 1] = w0 * ay + w1 * cy + w2 * sy;
        buf[idx + 2] = w0 * az + w1 * cz + w2 * sz;
      }
      const attr = webAttrRefs.current[i];
      if (attr) attr.needsUpdate = true;

      // Fires (opacity spikes) at each quarter-swing reversal of the
      // pendulum -- dive.tsx's y uses Math.abs(Math.cos(u)), whose extremes
      // (both peaks and the cusp at 0) land at every multiple of pi/2.
      // cos(2*u) is exactly +-1 at those same points and 0 at the midpoints
      // between them, so squaring it gives a clean 0..1 pulse train synced
      // to the reversals with no extra state to track. Raised to
      // WEB_PULSE_SHARPNESS for a snappy flash-and-fade instead of a slow
      // breathing glow.
      const localU = u + i * WEB_PHASE_STEP;
      const pulse = Math.cos(2 * localU) ** 2;
      const mat = webMaterialRefs.current[i];
      if (mat) mat.opacity = pulse ** WEB_PULSE_SHARPNESS * diveT * WEB_MAX_OPACITY;
    }

    // Dust: positions stored in local space (a box straddling the camera);
    // re-centered on the camera every frame via .position.set (a plain
    // Vector3 mutation, not a rewrite of the buffer) so the field always
    // surrounds wherever the dive currently is.
    if (dustPointsRef.current) {
      dustPointsRef.current.position.set(camera.position.x, camera.position.y, camZ);
    }
    const dt = Math.max(delta, 1 / 240);
    for (let i = 0; i < DUST_COUNT; i++) {
      const zi = i * 3 + 2;
      let z = dustPositions[zi] + DUST_DRIFT_SPEED * dt;
      if (z > DUST_NEAR_Z) z -= DUST_BOX.z;
      dustPositions[zi] = z;
    }
    if (dustAttrRef.current) dustAttrRef.current.needsUpdate = true;
    if (dustMaterialRef.current) dustMaterialRef.current.opacity = DUST_MAX_OPACITY * diveT;
  });

  return (
    <group ref={groupRef} visible={false}>
      {WEB_ANCHORS.map((_, i) => (
        // threeLine, not <line>: R3F deliberately omits `line` from its JSX
        // intrinsics (it collides with SVG's <line>) and exposes THREE.Line
        // as threeLine instead -- see @react-three/fiber's three-types.d.ts.
        <threeLine key={i} frustumCulled={false} renderOrder={FOREGROUND_RENDER_ORDER}>
          <bufferGeometry>
            <bufferAttribute
              ref={(attr) => {
                webAttrRefs.current[i] = attr;
              }}
              attach="attributes-position"
              args={[webBuffers[i], 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            ref={(m) => {
              webMaterialRefs.current[i] = m;
            }}
            color={WEB_COLOR}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            fog
          />
        </threeLine>
      ))}
      <points ref={dustPointsRef} frustumCulled={false} renderOrder={FOREGROUND_RENDER_ORDER}>
        <bufferGeometry>
          <bufferAttribute ref={dustAttrRef} attach="attributes-position" args={[dustPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={dustMaterialRef}
          color={DUST_COLOR}
          size={DUST_SIZE}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          fog
        />
      </points>
    </group>
  );
}
