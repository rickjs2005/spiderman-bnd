"use client";

/* eslint-disable react-hooks/immutability -- react-three-fiber/three.js are
   inherently mutation-based (see scene.tsx/eye-mask.tsx for the same
   rationale): materials, textures and object3D transforms here are all
   written every frame from useFrame, straight onto three.js objects, never
   through React state. */

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { act1State } from "@/lib/act1-store";
import { MEDIA } from "@/lib/media";
import { PHASE_CROSS, PHASE_DIVE, phaseT } from "./phases";

/** World-z of the five NYC layers, spaced a constant 3 units apart. That
 * constant spacing matters: combined with the fade windows below and
 * Spidey tracking close behind the camera (not at a fixed world z), it
 * guarantees a layer is already dissolved into fog before the camera (or
 * Spidey) gets close enough to it to visually overlap -- the "Spidey never
 * glued to a layer" requirement from the brief. */
const LAYER_Z = [-2, -5, -8, -11, -14] as const;

/** Indices rendered on coarse-pointer (touch) devices: front, mid, back --
 * keeps the depth story with fewer draw calls. */
const MOBILE_LAYER_INDICES = new Set([0, 2, 4]);

const PLANE_WIDTH = 10;
const PLANE_HEIGHT = 6;
const CURVE_SEGMENTS = 24;
/** Parabolic bend at the plane's left/right edges (world units of z) --
 * sells volume on a flat mesh without extra draw cost. */
const CURVE_DEPTH = 0.35;

/** Camera-distance windows (world units) that drive each layer's opacity:
 * invisible beyond FAR_IN, fully opaque between MID_IN and NEAR_OUT, gone
 * by GONE. Distance shrinks monotonically as the camera dives, so every
 * layer gets one clean fade-in -> hold -> fade-out arc as it's "passed".
 *
 * MID_IN must stay below the camera's "edge-safe" distance -- the distance
 * at which the plane (PLANE_HEIGHT=6) stops overfilling the frustum
 * (fov=42 vertical => half-height = distance*tan(21deg); solving
 * distance*0.384 <= 3 gives ~7.8, tighter still on width at ~7.3 for a
 * 16:9 viewport). Caught in verification: with MID_IN=8 (above that
 * threshold) a layer reached opacity=1 *before* it was close enough to
 * crop full-frame, showing a hard rectangular edge against the fog. 6.5
 * keeps a safety margin below the ~7.3-7.8 threshold across viewports. */
const FADE_FAR_IN = 10;
const FADE_MID_IN = 6.5;
const FADE_NEAR_OUT = 4;
const FADE_GONE = 0.5;

// Duotone grade: near layers warm/red, far layers cool/blue -- the suit's
// red/blue motif read through depth instead of a flat photo cutout. Kept
// fairly light (not a near-black tint) because these are already-dark
// night-city photos: MeshBasicMaterial multiplies map*color, so a heavy
// dark tint on top of an already-dark photo crushed the far layers to
// near-invisible in verification, undermining the depth read for the back
// half of the dive.
const NEAR_TINT = new THREE.Color("#ffcdb8");
const FAR_TINT = new THREE.Color("#5b7ca8");

// Fog "opens" across the same PHASE_CROSS window the eye-mask fades out in
// (see eye-mask.tsx) -- FOG_EYE_* matches scene.tsx's static <fog> args so
// there's no visible pop when Dive starts driving it.
const FOG_EYE_NEAR = 3;
const FOG_EYE_FAR = 9;
const FOG_DIVE_NEAR = 2;
const FOG_DIVE_FAR = 17;

/** Spidey stays a near-constant distance in front of the camera (rather
 * than at a fixed world z) so it reads as a consistent foreground swinger
 * throughout the dive instead of being "passed" like the backdrop layers. */
const SPIDEY_CAM_OFFSET = 2.5;
const SPIDEY_X_AMPLITUDE = 2.2;
const SPIDEY_Y_AMPLITUDE = 0.8;
const SPIDEY_Y_BASELINE = 0.6;
const SPIDEY_WIDTH = 1.2;
const SPIDEY_HEIGHT = 1.8;
/** Must match scene.tsx's DIVE_SWAY_CYCLES -- Spidey's pendulum and the
 * camera's sway share the same frequency so the camera reads as "following"
 * even though it's a smaller-amplitude, independently-computed sine. */
const SWAY_CYCLES = 2;

function buildCurvedPlane(width: number, height: number, segments: number, depth: number) {
  const geometry = new THREE.PlaneGeometry(width, height, segments, 1);
  const position = geometry.attributes.position;
  const halfWidth = width / 2;
  for (let i = 0; i < position.count; i++) {
    const nx = position.getX(i) / halfWidth; // -1..1
    position.setZ(i, -depth * nx * nx); // bend edges away from camera
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** 0 -> 1 -> 0 window over camera-distance `d`. NOTE: THREE.MathUtils.smoothstep(x,min,max)
 * requires min < max (it short-circuits on `x <= min`), so the descending
 * (far->near) half below is built as `1 - smoothstep(ascending)`, not a
 * smoothstep with swapped args. */
function layerOpacity(d: number) {
  if (d >= FADE_FAR_IN) return 0;
  if (d > FADE_MID_IN) return 1 - THREE.MathUtils.smoothstep(d, FADE_MID_IN, FADE_FAR_IN);
  if (d > FADE_NEAR_OUT) return 1;
  if (d > FADE_GONE) return THREE.MathUtils.smoothstep(d, FADE_GONE, FADE_NEAR_OUT);
  return 0;
}

/**
 * Detected once on mount (not per frame) per the brief -- via a LAZY
 * useState initializer, not an effect. This used to be effect-deferred (like
 * act1.tsx's mode detection), which was harmless while `textures` below
 * unconditionally fetched all 5 layers regardless of isMobile. Task 12 made
 * that fetch itself conditional (fewer files on coarse pointers, not just
 * fewer rendered meshes) -- an effect-deferred isMobile would render once
 * with the wrong guess (isMobile=false), kick off all 5 fetches, THEN
 * correct to isMobile=true and fetch the 3-layer subset on top of that,
 * downloading MORE than the pre-Task-12 baseline instead of less. The lazy
 * initializer avoids that: this component (like eye-mask.tsx's own copy of
 * this same fix) only ever mounts post-hydration -- nested inside Scene,
 * which Act1 (act1.tsx) only renders once its own `mode` state has already
 * resolved to "scene" via a client-only effect -- so reading
 * `window.matchMedia` synchronously on first render here can never mismatch
 * an SSR pass that never happened for this subtree.
 */
function useIsCoarsePointer() {
  const [coarse] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  return coarse;
}

/**
 * Act 1 "The Dive": a 2.5D NYC diorama the camera dives through during
 * PHASE_DIVE, with a Spidey cutout swinging pendulum-style in the
 * foreground. Mounted inside Scene's <Canvas>, after <EyeMask/>. Camera
 * z/x motion for PHASE_DIVE lives in scene.tsx's Rig (single camera owner);
 * this component only reads camera.position (already updated for the
 * current frame, since Rig is mounted before Dive) to drive layer opacity,
 * fog, and Spidey's own transform.
 */
export function Dive() {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const isMobile = useIsCoarsePointer();
  // Coarse pointers only ever render 3 of the 5 layers (MOBILE_LAYER_INDICES,
  // see the JSX below) -- fetch only those 3 files instead of all 5, since
  // the other 2 are never displayed on that device class. `loadedTextures`
  // is in the SAME order as `nycUrls`, so `textureForLayer(i)` below maps a
  // layer's *original* LAYER_Z index back to its slot in that (possibly
  // reordered/shortened) array.
  const nycUrls = isMobile ? [...MOBILE_LAYER_INDICES].map((i) => MEDIA.nyc[i]) : [...MEDIA.nyc];
  const loadedTextures = useTexture(nycUrls);
  const textureForLayer = (i: number) => {
    if (!isMobile) return loadedTextures[i];
    const slot = [...MOBILE_LAYER_INDICES].indexOf(i);
    return slot === -1 ? undefined : loadedTextures[slot];
  };
  const spideyTexture = useTexture(MEDIA.spidey);

  const curvedGeometry = useMemo(
    () => buildCurvedPlane(PLANE_WIDTH, PLANE_HEIGHT, CURVE_SEGMENTS, CURVE_DEPTH),
    [],
  );

  const materialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([null, null, null, null, null]);
  const spideyGroupRef = useRef<THREE.Group>(null);
  const spideyMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const prevSpidey = useRef({ x: 0, y: SPIDEY_Y_BASELINE - SPIDEY_Y_AMPLITUDE });

  useEffect(() => {
    for (const t of loadedTextures) t.colorSpace = THREE.SRGBColorSpace;
    spideyTexture.colorSpace = THREE.SRGBColorSpace;
  }, [loadedTextures, spideyTexture]);

  useFrame((_, delta) => {
    const p = act1State.progress;
    // 0->1 across PHASE_CROSS: the diorama's overall reveal, timed to the
    // exact window EyeMask fades out in (no black gap, no hard cut).
    const diveIntro = phaseT(p, PHASE_CROSS);
    const diveT = phaseT(p, PHASE_DIVE);

    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = THREE.MathUtils.lerp(FOG_EYE_NEAR, FOG_DIVE_NEAR, diveIntro);
      fog.far = THREE.MathUtils.lerp(FOG_EYE_FAR, FOG_DIVE_FAR, diveIntro);
    }

    for (let i = 0; i < LAYER_Z.length; i++) {
      const mat = materialRefs.current[i];
      if (!mat) continue;
      const distance = camera.position.z - LAYER_Z[i];
      mat.opacity = layerOpacity(distance) * diveIntro;
    }

    // Spidey pendulum: two full swings across PHASE_DIVE.
    const u = diveT * Math.PI * 2 * SWAY_CYCLES;
    const x = Math.sin(u) * SPIDEY_X_AMPLITUDE;
    const y = -Math.abs(Math.cos(u)) * SPIDEY_Y_AMPLITUDE + SPIDEY_Y_BASELINE;

    if (spideyGroupRef.current) {
      const dt = Math.max(delta, 1 / 240);
      const vx = (x - prevSpidey.current.x) / dt;
      const vy = (y - prevSpidey.current.y) / dt;
      prevSpidey.current.x = x;
      prevSpidey.current.y = y;
      const tangent = vx === 0 && vy === 0 ? 0 : Math.atan2(vx, vy);
      spideyGroupRef.current.position.set(x, y, camera.position.z - SPIDEY_CAM_OFFSET);
      // Damped, clamped -- a full tangent-angle swing reads as spinning,
      // not leaning; a scaled/clamped one reads as a pendulum lean.
      spideyGroupRef.current.rotation.z = THREE.MathUtils.clamp(tangent * 0.5, -0.6, 0.6);
    }
    if (spideyMaterialRef.current) {
      spideyMaterialRef.current.opacity = diveIntro;
    }
  });

  return (
    <group>
      {LAYER_Z.map((z, i) => {
        if (isMobile && !MOBILE_LAYER_INDICES.has(i)) return null;
        const depthT = i / (LAYER_Z.length - 1);
        const tint = NEAR_TINT.clone().lerp(FAR_TINT, depthT);
        return (
          <mesh key={z} position={[0, 0, z]} geometry={curvedGeometry}>
            <meshBasicMaterial
              ref={(m) => {
                materialRefs.current[i] = m;
              }}
              map={textureForLayer(i)}
              color={tint}
              transparent
              opacity={0}
              fog
              depthWrite={false}
            />
          </mesh>
        );
      })}
      <group ref={spideyGroupRef}>
        <mesh>
          <planeGeometry args={[SPIDEY_WIDTH, SPIDEY_HEIGHT]} />
          <meshBasicMaterial
            ref={spideyMaterialRef}
            map={spideyTexture}
            transparent
            opacity={0}
            fog
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
