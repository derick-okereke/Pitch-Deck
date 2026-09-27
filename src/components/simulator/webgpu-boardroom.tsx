"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import { color, float, mix, positionLocal, sin, uniform, vec3 } from "three/tsl";
import type { BoardroomProps } from "./simulator-boardroom";

const PARTICLE_COUNT = 160;

// Both tiers retain the same chairs and architecture. WebGPU adds only a
// transparent field of independent particles, so loading/fallback cannot swap rooms.
export function WebGPUBoardroom({ amplitude, allowRecovery, reducedMotion, onFailure, onReady }: BoardroomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const amplitudeRef = useRef(amplitude);
  const recoveryRef = useRef(allowRecovery);
  const motionRef = useRef(reducedMotion);
  useEffect(() => { amplitudeRef.current = amplitude; }, [amplitude]);
  useEffect(() => { recoveryRef.current = allowRecovery; }, [allowRecovery]);
  useEffect(() => { motionRef.current = reducedMotion; }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let generation = 0;
    let recoveries = 0;
    let frame = 0;
    let visible = true;
    let renderer: THREE.WebGPURenderer | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.PointsNodeMaterial | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let visibilityListener: (() => void) | null = null;

    const cleanup = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      canvas.classList.remove("is-ready");
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      if (visibilityListener) document.removeEventListener("visibilitychange", visibilityListener);
      resizeObserver = null;
      intersectionObserver = null;
      visibilityListener = null;
      geometry?.dispose();
      material?.dispose();
      geometry = null;
      material = null;
      renderer?.dispose();
      renderer = null;
    };

    const initialise = async () => {
      if (disposed) return;
      const currentGeneration = ++generation;
      cleanup();
      try {
        const nextRenderer = new THREE.WebGPURenderer({ canvas, alpha: true, antialias: false });
        renderer = nextRenderer;
        nextRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        nextRenderer.setClearColor(0x000000, 0);
        await nextRenderer.init();
        if (disposed || generation !== currentGeneration) { nextRenderer.dispose(); return; }
        const backend = (nextRenderer as unknown as {
          backend?: { isWebGPUBackend?: boolean; device?: { lost: Promise<{ reason?: string }> } };
        }).backend;
        if (!backend?.isWebGPUBackend) throw new Error("WebGPU unavailable");

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 30);
        camera.position.z = 8;
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        let seed = 9127;
        const random = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        for (let index = 0; index < PARTICLE_COUNT; index += 1) {
          positions.set([(random() - 0.5) * 12, (random() - 0.5) * 5, (random() - 0.5) * 4], index * 3);
        }
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const elapsed = uniform(0);
        const voice = uniform(0);
        const phase = elapsed.mul(0.5).add(positionLocal.x.mul(1.7)).add(positionLocal.z);
        const shimmer = sin(phase).mul(0.5).add(0.5);
        material = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
        material.colorNode = mix(color(0x568dcf), color(0x9ce6f0), shimmer);
        material.opacityNode = float(0.18).add(shimmer.mul(0.28));
        material.sizeNode = float(1.3).add(shimmer.mul(1.2)).add(voice.mul(0.6));
        material.positionNode = positionLocal.add(vec3(sin(phase).mul(0.075), sin(phase.mul(0.65)).mul(0.12), 0));
        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        const resize = () => {
          const width = Math.max(1, canvas.clientWidth);
          const height = Math.max(1, canvas.clientHeight);
          nextRenderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
        resize();
        await nextRenderer.compileAsync(scene, camera);
        if (disposed || generation !== currentGeneration) return;

        let lastFrame = 0;
        let ready = false;
        const render = (now: number) => {
          frame = 0;
          if (disposed || generation !== currentGeneration || !visible || document.visibilityState !== "visible") return;
          elapsed.value += lastFrame && !motionRef.current ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
          lastFrame = now;
          voice.value += (amplitudeRef.current - voice.value) * 0.15;
          particles.rotation.y = Math.sin(elapsed.value * 0.08) * 0.04;
          try {
            nextRenderer.render(scene, camera);
          } catch {
            cleanup();
            onFailure("Full experience interrupted. Retry graphics.");
            return;
          }
          if (!ready) {
            ready = true;
            canvas.classList.add("is-ready");
            onReady();
          }
          frame = requestAnimationFrame(render);
        };
        const syncLoop = () => {
          if (!visible || document.visibilityState !== "visible") {
            cancelAnimationFrame(frame);
            frame = 0;
            lastFrame = 0;
          } else if (!frame && !disposed) {
            frame = requestAnimationFrame(render);
          }
        };
        intersectionObserver = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          syncLoop();
        }, { threshold: 0.05 });
        intersectionObserver.observe(canvas);
        visibilityListener = syncLoop;
        document.addEventListener("visibilitychange", syncLoop);
        backend.device?.lost.then((info) => {
          if (disposed || generation !== currentGeneration || info.reason === "destroyed") return;
          if (recoveryRef.current && recoveries < 1) {
            recoveries += 1;
            void initialise();
          } else {
            cleanup();
            onFailure("Full experience interrupted. Retry graphics.");
          }
        });
        syncLoop();
      } catch {
        if (disposed || generation !== currentGeneration) return;
        cleanup();
        onFailure("Full experience interrupted. Retry graphics.");
      }
    };
    void initialise();
    return () => {
      disposed = true;
      generation += 1;
      cleanup();
    };
  }, [onFailure, onReady]);

  return <canvas className="webgpu-boardroom" ref={canvasRef} aria-hidden="true" />;
}
