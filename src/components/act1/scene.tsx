"use client";

/* eslint-disable react-hooks/immutability -- react-three-fiber/three.js are
   inherently mutation-based: the camera returned by useThree() is meant to
   be written every frame (that's how R3F moves a camera), which is exactly
   what this file's useFrame rig does, per the task's "no setState per
   frame" requirement. This isn't an accidental hook-return mutation. */

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { act1State, act1Flags, damp } from "@/lib/act1-store";
import { EyeMask } from "./eye-mask";
import { Dive } from "./dive";
import { PHASE_EYE, PHASE_DIVE, phaseT } from "./phases";

export { PHASE_EYE, PHASE_CROSS, PHASE_DIVE, PHASE_BURST } from "./phases";

/** Damping lambda for the progress rig, per the plan (see act1-store.ts's
 * handoff note -- Act1's shell used 9 only as a temporary stand-in). */
const RIG_LAMBDA = 4.5;

const CAMERA_Z_START = 1.15;
const CAMERA_Z_EYE_END = 4.2;
const TILT_START = 0.04;
const TILT_END = 0;
const DRIFT_X = 0.1;
const DRIFT_Y = 0.06;

/** Task 5: PHASE_DIVE takes the camera from the held eye-shot position on
 * through the NYC diorama (dive.tsx). CAMERA_Z_DIVE_END must stay past
 * LAYER_Z's deepest layer (-14 in dive.tsx) so the last layer is still
 * comfortably ahead of the camera at diveT=1, not behind it. */
const CAMERA_Z_DIVE_END = -12;
/** Amplitude/cycle-count of the camera's x sway during PHASE_DIVE -- must
 * match dive.tsx's SWAY_CYCLES so the camera reads as loosely "following"
 * Spidey's own (larger-amplitude) pendulum, not fighting it. */
const DIVE_SWAY_AMPLITUDE = 0.8;
const DIVE_SWAY_CYCLES = 2;

/**
 * Owns act1State.progress and the camera. Mounting flips
 * act1Flags.sceneOwnsProgress so Act1's temporary rAF loop backs off --
 * without this there would be two writers damping `progress` every frame.
 */
function Rig() {
  const camera = useThree((s) => s.camera);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    act1Flags.sceneOwnsProgress = true;
    return () => {
      act1Flags.sceneOwnsProgress = false;
    };
  }, []);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      act1State.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      act1State.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(0.1, delta);
    act1State.progress = damp(act1State.progress, act1State.raw, RIG_LAMBDA, dt);
    const p = act1State.progress;

    mouse.current.x = damp(mouse.current.x, act1State.mouseX, RIG_LAMBDA, dt);
    mouse.current.y = damp(mouse.current.y, act1State.mouseY, RIG_LAMBDA, dt);

    // PHASE_EYE: dolly back from inches-from-the-mask to a held medium
    // shot, with a slight dutch tilt easing out as we pull away.
    const eyeT = phaseT(p, PHASE_EYE);
    const z = THREE.MathUtils.lerp(CAMERA_Z_START, CAMERA_Z_EYE_END, eyeT);
    const tilt = THREE.MathUtils.lerp(TILT_START, TILT_END, eyeT);

    // PHASE_DIVE: continue on from wherever PHASE_EYE left off. `z` above
    // is already pinned at CAMERA_Z_EYE_END for the whole PHASE_CROSS/
    // PHASE_DIVE range (eyeT saturates at 1 past p=0.35), and `diveZ` is
    // exactly CAMERA_Z_EYE_END while diveT is 0 (p<=0.45) -- so adding
    // (diveZ - CAMERA_Z_EYE_END) on top of `z` composes cleanly with no
    // branch: it's a no-op until PHASE_DIVE starts, then takes over.
    const diveT = phaseT(p, PHASE_DIVE);
    const diveZ = THREE.MathUtils.lerp(CAMERA_Z_EYE_END, CAMERA_Z_DIVE_END, diveT);
    const swayX = Math.sin(diveT * Math.PI * 2 * DIVE_SWAY_CYCLES) * DIVE_SWAY_AMPLITUDE;

    camera.position.x = mouse.current.x * DRIFT_X + swayX;
    camera.position.y = -mouse.current.y * DRIFT_Y;
    camera.position.z = z + (diveZ - CAMERA_Z_EYE_END);
    camera.rotation.z = tilt;
  });

  return null;
}

/**
 * Act 1 "The Eye": the R3F canvas mounted inside Act1's sticky frame.
 * `Rig` owns act1State.progress + camera; `EyeMask` owns its own material
 * fade during PHASE_CROSS. No React state is touched per frame anywhere in
 * this tree -- all motion is refs/useFrame writes straight to three objects.
 */
export function Scene() {
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 1.75]}
      camera={{ fov: 42, near: 0.05, far: 20, position: [0, 0, CAMERA_Z_START] }}
      className="absolute inset-0 h-full w-full"
    >
      <color attach="background" args={["#0a0a0f"]} />
      <fog attach="fog" args={["#0a0a0f", 3, 9]} />
      <ambientLight intensity={0.5} color="#3d4f73" />
      <spotLight
        position={[2.4, 2.6, 4]}
        angle={1.05}
        penumbra={0.5}
        decay={1.3}
        intensity={12}
        color="#bfe3ff"
      />
      <directionalLight position={[-2, -1, 3]} intensity={0.3} color="#ffe9d6" />
      <Rig />
      <EyeMask />
      <Dive />
    </Canvas>
  );
}
