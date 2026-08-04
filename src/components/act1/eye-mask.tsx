"use client";

/* eslint-disable react-hooks/immutability -- three.js textures returned by
   useTexture() are configured and animated by mutating their properties
   (colorSpace once, offset/repeat every frame); that's the standard R3F
   pattern and matches the task's "no setState per frame" requirement, not
   an accidental hook-return mutation. */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { act1State } from "@/lib/act1-store";
import { MEDIA } from "@/lib/media";
import { PHASE_EYE, PHASE_CROSS, phaseT } from "./phases";

/**
 * Detected via a lazy useState initializer (same pattern as dive.tsx's own
 * copy of this hook -- both components need it for the same reason, see
 * below). useTexture's argument selects WHICH FILE to fetch: an
 * effect-deferred value would render once with the wrong guess (desktop's
 * 2048px mask-eye.jpg), kick off that fetch, THEN correct to
 * mask-eye-sm.jpg on coarse pointers -- downloading both and defeating the
 * point of serving a smaller texture on mobile (confirmed in verification:
 * exactly this double-fetch before switching to the lazy initializer below).
 * A lazy initializer is safe here specifically because EyeMask only ever
 * mounts once Act1's own `mode` state (act1.tsx) flips to "scene" --
 * itself deferred to a post-hydration effect -- so EyeMask's very first
 * render already happens client-side; there's no SSR pass for this
 * subtree to mismatch. `typeof window !== "undefined"` below is a
 * defense-in-depth guard on top of that (see also dive.tsx), not the
 * primary safety mechanism.
 */
function useIsCoarsePointer() {
  const [coarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );
  return coarse;
}

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
  const isMobile = useIsCoarsePointer();
  // Coarse pointers (phones/tablets) get the 1024px map+normalMap pair
  // instead of the 2048px desktop pair -- same UV panning math either way
  // (see the module comment above), just fewer texels for the GPU to
  // sample/upload (and far less to download -- see prepare-media.mjs's
  // buildNormalMap() for why the normal map specifically mattered).
  const [map, normalMap] = useTexture([
    isMobile ? MEDIA.maskEyeSm : MEDIA.maskEye,
    isMobile ? MEDIA.maskEyeNormalSm : MEDIA.maskEyeNormal,
  ]);
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
