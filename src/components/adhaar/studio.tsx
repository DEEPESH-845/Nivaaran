"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
// Type-only: erased at compile time, so it cannot drag three.js into the
// main bundle. The runtime import lives inside the effect below.
import type * as ThreeNS from "three";
import type { Tilt } from "./card-stage";

/**
 * The studio: the room the card is sitting in.
 *
 * This is the only WebGL in the product, and it is an upgrade rather than a
 * requirement (AGENTS.md rule 14). The card is finished before this module
 * exists, and everything here happens in the margin *around* it — a pool of
 * light on the surface below, a contact shadow, and motes drifting through
 * it. The card itself is DOM, painted on top.
 *
 * Four things keep the promise that it costs nothing on a bad connection:
 *
 *   1. `three` is imported inside the effect, so it is its own chunk and is
 *      absent from first load. A static import here would quietly undo that.
 *   2. `card-stage.tsx` only imports this module behind `shouldEnhance()`,
 *      inside `requestIdleCallback`.
 *   3. Nothing is fetched. The light pool is a gradient painted into a canvas
 *      at runtime — no HDRI, no textures, no loaders, zero network bytes.
 *   4. It rides `gsap.ticker` (the app's single clock — see
 *      SmoothScrollProvider) and is removed from it the moment the stage
 *      leaves the screen or the tab is hidden, rather than scheduling frames
 *      it then throws away.
 */

/** Matches the DOM card's own damping, so the room and the card arrive
 *  together instead of the room snapping ahead of it. */
const FOLLOW = 0.08;

export default function Studio({
  tiltRef,
  active,
}: {
  tiltRef: React.RefObject<Tilt>;
  active: boolean;
}) {
  const hostRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);

  // In an effect, not during render: the codebase's rule for latest-value refs.
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = hostRef.current;
    if (!canvas) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      // 1.5 is the point past which a soft shadow stops looking better and
      // starts costing frames on the phones this has to run on.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 9);

      /* ---------------------------------------------------------- the card */

      // Shadow-only: `visible = false` would take it out of the shadow pass
      // as well as the colour pass, which is how this scene spent its first
      // life rendering an entirely empty canvas. A fully transparent material
      // paints nothing and still casts.
      const casterMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const caster = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.4, 0.1), casterMaterial);
      caster.castShadow = true;
      scene.add(caster);

      /* --------------------------------------------------------- the floor */

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 40),
        new THREE.ShadowMaterial({ opacity: 0.42 }),
      );
      floor.position.z = -1.5;
      floor.receiveShadow = true;
      scene.add(floor);

      // The pool of light the card sits in. Painted here rather than fetched:
      // a 256px gradient is a few microseconds and no request at all.
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = glowCanvas.height = 256;
      const g = glowCanvas.getContext("2d")!;
      const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, "rgba(150,170,255,0.5)");
      grad.addColorStop(0.45, "rgba(110,130,230,0.16)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);

      const glowTexture = new THREE.CanvasTexture(glowCanvas);
      const glowMaterial = new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), glowMaterial);
      glow.position.z = -1.4;
      scene.add(glow);

      /* --------------------------------------------------------- the light */

      const key = new THREE.DirectionalLight(0xffffff, 2.6);
      key.position.set(-3.4, 4.6, 6.5);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.radius = 9;
      key.shadow.bias = -0.0005;
      // Fit the shadow camera to the card instead of leaving it on the default
      // 10-unit box. The same 1024 map then covers a third of the area, which
      // is the difference between a soft edge and a visibly stepped one — and
      // it costs nothing, unlike raising the resolution.
      key.shadow.camera.left = -5;
      key.shadow.camera.right = 5;
      key.shadow.camera.top = 5;
      key.shadow.camera.bottom = -5;
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 24;
      key.shadow.camera.updateProjectionMatrix();
      scene.add(key);

      const fill = new THREE.PointLight(0x8ea2ff, 30, 40);
      fill.position.set(5, -2, 4);
      scene.add(fill);

      scene.add(new THREE.AmbientLight(0xffffff, 0.35));

      /* --------------------------------------------------------- the motes */

      const COUNT = 140;
      const positions = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 16;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      }
      const moteGeometry = new THREE.BufferGeometry();
      moteGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const moteMaterial = new THREE.PointsMaterial({
        // In device pixels, not world units: with attenuation these came out
        // around one pixel across and were invisible at every viewport.
        sizeAttenuation: false,
        size: 2.2,
        color: 0xc7d2fe,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const motes = new THREE.Points(moteGeometry, moteMaterial);
      scene.add(motes);

      /* ---------------------------------------------------------- plumbing */

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = canvas;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);

      const clock = new THREE.Clock();
      // Followed, not copied: the DOM card is eased into place over ~0.6s, so
      // snapping the camera to the raw pointer target would have the room
      // arrive before the card it belongs to.
      const eased = { x: 0, y: 0 };

      const render = () => {
        const t = clock.getElapsedTime();
        const tilt = tiltRef.current ?? { x: 0, y: 0 };
        eased.x += (tilt.x - eased.x) * FOLLOW;
        eased.y += (tilt.y - eased.y) * FOLLOW;

        camera.position.x = (eased.y / 26) * 1.6;
        camera.position.y = (eased.x / 18) * 1.1;
        camera.lookAt(0, 0, 0);
        caster.rotation.y = THREE.MathUtils.degToRad(eased.y);
        caster.rotation.x = THREE.MathUtils.degToRad(eased.x);

        fill.position.x = Math.cos(t * 0.35) * 6;
        fill.position.y = Math.sin(t * 0.28) * 3.5;
        glow.position.x = Math.cos(t * 0.18) * 0.6;
        motes.rotation.y = t * 0.02;
        motes.position.y = Math.sin(t * 0.15) * 0.3;

        renderer.render(scene, camera);
      };

      // One clock for the whole app. Adding and removing rather than checking
      // a flag inside the loop means an off-screen stage costs nothing at all,
      // which is the rule the narrative's canvases already follow.
      let running = false;
      const sync = () => {
        const want = activeRef.current && document.visibilityState === "visible";
        if (want === running) return;
        running = want;
        if (want) gsap.ticker.add(render);
        else gsap.ticker.remove(render);
      };
      const poll = () => sync();
      gsap.ticker.add(poll);
      document.addEventListener("visibilitychange", sync);
      sync();

      cleanup = () => {
        gsap.ticker.remove(poll);
        gsap.ticker.remove(render);
        document.removeEventListener("visibilitychange", sync);
        ro.disconnect();
        moteGeometry.dispose();
        moteMaterial.dispose();
        caster.geometry.dispose();
        casterMaterial.dispose();
        floor.geometry.dispose();
        (floor.material as ThreeNS.Material).dispose();
        glow.geometry.dispose();
        glowMaterial.dispose();
        glowTexture.dispose();
        key.shadow.map?.dispose();
        renderer.dispose();
        // dispose() frees the objects but leaves the context alive. In
        // development React mounts twice, so without this each visit spends
        // one of the browser's handful of WebGL contexts for good.
        renderer.forceContextLoss();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [tiltRef]);

  return (
    <canvas
      ref={hostRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 size-full"
    />
  );
}
