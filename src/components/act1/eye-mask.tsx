"use client";

/* eslint-disable react-hooks/immutability -- three.js textures returned by
   useTexture() are configured and animated by mutating their properties
   (colorSpace once, offset/repeat every frame); that's the standard R3F
   pattern and matches the task's "no setState per frame" requirement, not
   an accidental hook-return mutation. */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { act1State } from "@/lib/act1-store";
import { MEDIA } from "@/lib/media";
import { PHASE_EYE, PHASE_CROSS, phaseT } from "./phases";

/**
 * public/media/mask-eye.jpg is a loose head-and-shoulders crop (2048x1152),
 * not a tight eye macro (deferred finding from Task 2). We solve this with
 * *panning*, not cropping: `repeat` stays fixed at (1,1) -- the full,
 * undistorted photo is always mapped onto the plane -- and only `offset`
 * animates, from EYE_OFFSET (p=0) to (0,0) (p=0.35).
 *
 * Why panning instead of a `repeat` crop: PLANE_WIDTH below is sized so the
 * plane covers the camera's frustum at the *far* end of the dolly
 * (CAMERA_Z_EYE_END, in scene.tsx). That means at the *near* end
 * (CAMERA_Z_START) the plane already fills only a small slice of its own
 * UV space on screen -- the physical dolly is already doing serious
 * magnification on its own (about 4.4x at CAMERA_Z_START for this
 * PLANE_WIDTH). Adding a `repeat` crop on top compounds multiplicatively
 * with that (visible-plane-fraction x repeat), which blew the effective
 * magnification past 40x in testing and turned the eye into an
 * unrecognizable blur. Panning via `offset` alone rides the dolly's
 * existing magnification and just aims it at the eye instead of the
 * photo's geometric center -- see task-4-report.md for the full derivation.
 */
// Texture UV of the eye-lens region's center (source pixel ~(1000,320) of
// the 2048x1152 photo), expressed as an offset from image-center so that
// point lands at the plane's own center (mesh UV 0.5,0.5) when repeat=1.
const EYE_OFFSET = { x: 1000 / 2048 - 0.5, y: 1 - 320 / 1152 - 0.5 };
const FULL_OFFSET = { x: 0, y: 0 };

// Matches the source photo's 2048x1152 (16:9) aspect so the texture maps
// onto the plane without distortion. Sized (with ~20% margin) so the plane
// covers the camera's frustum at CAMERA_Z_EYE_END for a 16:9 viewport --
// see scene.tsx. At CAMERA_Z_START this same plane fills only a small
// fraction of the screen's worth of UV space, which is *the* mechanism
// behind the eye macro (see comment above).
const PLANE_WIDTH = 6.9;
const PLANE_HEIGHT = PLANE_WIDTH * (1152 / 2048);

export function EyeMask() {
  const [map, normalMap] = useTexture([MEDIA.maskEye, MEDIA.maskEyeNormal]);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
  }, [map, normalMap]);

  useFrame(() => {
    const p = act1State.progress;
    const eyeT = phaseT(p, PHASE_EYE);

    const ox = THREE.MathUtils.lerp(EYE_OFFSET.x, FULL_OFFSET.x, eyeT);
    const oy = THREE.MathUtils.lerp(EYE_OFFSET.y, FULL_OFFSET.y, eyeT);

    map.offset.set(ox, oy);
    normalMap.offset.set(ox, oy);

    if (materialRef.current) {
      // Crossfades out during PHASE_CROSS; Task 5's diorama takes over what
      // shows through once opacity reaches 0.
      materialRef.current.opacity = 1 - phaseT(p, PHASE_CROSS);
    }
  });

  return (
    <mesh>
      <planeGeometry args={[PLANE_WIDTH, PLANE_HEIGHT]} />
      <meshStandardMaterial
        ref={materialRef}
        map={map}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(1.4, 1.4)}
        roughness={0.55}
        transparent
      />
    </mesh>
  );
}
