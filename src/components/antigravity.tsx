"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type AntigravityProps = {
  count?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  color?: string;
  autoAnimate?: boolean;
  particleVariance?: number;
};

function AntigravityParticles({
  count = 460,
  magnetRadius = 11,
  ringRadius = 5,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 1.5,
  lerpSpeed = 0.05,
  color = "#FAF9F6",
  autoAnimate = true,
  particleVariance = 1,
}: AntigravityProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastPointer = useRef({ x: 0, y: 0, time: 0 });
  const fieldCenter = useRef({ x: 0, y: 0 });
  const particles = useMemo(() => {
    // Stable positions avoid a different particle field on every render.
    const random = (seed: number) => {
      const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
      return value - Math.floor(value);
    };
    return Array.from({ length: count }, (_, index) => {
      const x = (random(index * 7 + 1) - 0.5) * viewport.width * 1.08;
      const y = (random(index * 7 + 2) - 0.5) * viewport.height * 1.08;
      return {
        x,
        y,
        z: (random(index * 7 + 3) - 0.5) * 3,
        currentX: x,
        currentY: y,
        phase: random(index * 7 + 4) * Math.PI * 2,
        variance: random(index * 7 + 5),
      };
    });
  }, [count, viewport.width, viewport.height]);

  useFrame(({ clock, pointer, viewport: view }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = clock.getElapsedTime();
    const moved = Math.hypot(pointer.x - lastPointer.current.x, pointer.y - lastPointer.current.y) > 0.001;
    if (moved) lastPointer.current = { x: pointer.x, y: pointer.y, time };
    const idle = autoAnimate && time - lastPointer.current.time > 2;
    const destinationX = idle ? Math.sin(time * 0.35) * 1.2 : (pointer.x * view.width) / 2;
    const destinationY = idle ? Math.cos(time * 0.3) * 0.8 : (pointer.y * view.height) / 2;
    fieldCenter.current.x += (destinationX - fieldCenter.current.x) * 0.045;
    fieldCenter.current.y += (destinationY - fieldCenter.current.y) * 0.045;

    particles.forEach((particle, index) => {
      const dx = particle.x - fieldCenter.current.x;
      const dy = particle.y - fieldCenter.current.y;
      const distance = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - distance / magnetRadius);
      const angle = Math.atan2(dy, dx) + time * 0.08;
      const wave = Math.sin(time * waveSpeed * 2 + particle.phase + angle * 3) * waveAmplitude * 0.32;
      const radius = ringRadius + wave + (particle.variance - 0.5) * 2.3;
      const targetX = particle.x * (1 - influence) + (fieldCenter.current.x + Math.cos(angle) * radius) * influence;
      const targetY = particle.y * (1 - influence) + (fieldCenter.current.y + Math.sin(angle) * radius) * influence;
      particle.currentX += (targetX - particle.currentX) * lerpSpeed;
      particle.currentY += (targetY - particle.currentY) * lerpSpeed;

      dummy.position.set(particle.currentX, particle.currentY, particle.z);
      dummy.rotation.set(0, 0, angle + Math.PI / 2);
      const pulse = 0.85 + Math.sin(time * 2.1 + particle.phase) * 0.15 * particleVariance;
      const scale = (0.22 + influence * 0.62) * pulse * particleSize;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <capsuleGeometry args={[0.055, 0.25, 3, 5]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
    </instancedMesh>
  );
}

export default function Antigravity(props: AntigravityProps) {
  return (
    <Canvas camera={{ position: [0, 0, 32], fov: 35 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: false }}>
      <AntigravityParticles {...props} />
    </Canvas>
  );
}
