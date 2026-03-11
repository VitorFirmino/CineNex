"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { BRAND } from "@styles/brand";

function generateParticlePositions(count: number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 10;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  return pos;
}

function Particles({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null!);
  const positions = useMemo(() => generateParticlePositions(count), [count]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 0.1;
    if (points.current) {
      points.current.rotation.x = Math.cos(t / 4) * 0.2 + state.pointer.y * 0.1;
      points.current.rotation.y = Math.sin(t / 2) * 0.2 + state.pointer.x * 0.1;
    }
  });

  return (
    <Points ref={points} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#67e8f9"
        size={0.015}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function MovingGrid() {
  const gridRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (gridRef.current) {
      gridRef.current.position.y = Math.sin(t * 0.2) * 0.1;
      gridRef.current.rotation.x = -Math.PI / 2 + Math.sin(t * 0.1) * 0.05;
    }
  });

  return (
    <group ref={gridRef} position={[0, -1, 0]}>
      <gridHelper args={[20, 40, "#22d3ee", "#083344"]}>
        <lineBasicMaterial attach="material" transparent opacity={0.2} vertexColors />
      </gridHelper>
    </group>
  );
}

function AdaptiveDpr() {
  const { setDpr } = useThree();
  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio, 1.5));
  }, [setDpr]);
  return null;
}

function FloatingParticles({ count }: { count: number }) {
  const particlesGroupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const group = particlesGroupRef.current;
    if (!group) return;

    const t = state.clock.getElapsedTime();
    group.position.y = Math.sin(t * 0.35) * 0.12;
    group.rotation.z = Math.sin(t * 0.18) * 0.03;
  });

  return (
    <group ref={particlesGroupRef}>
      <Particles count={count} />
    </group>
  );
}

export function ThreeBackground() {
  const [particleCount, setParticleCount] = useState(1000);

  useEffect(() => {
    const timer = setTimeout(() => {
       const isMobile = window.innerWidth < 768;
       setParticleCount(isMobile ? 600 : 2500);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 -z-[3] bg-[var(--bg-base)]">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} dpr={[1, 1.5]}>
        <AdaptiveDpr />
        <color attach="background" args={[BRAND.bgBase]} />
        <fog attach="fog" args={[BRAND.bgBase, 5, 15]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color={BRAND.lightHex} />

        <FloatingParticles count={particleCount} />

        <MovingGrid />

        <mesh position={[-5, 2, -5]}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial color={BRAND.darkHex} transparent opacity={0.05} />
        </mesh>
        <mesh position={[5, -2, -5]}>
          <sphereGeometry args={[3, 32, 32]} />
          <meshBasicMaterial color={BRAND.hex} transparent opacity={0.05} />
        </mesh>
      </Canvas>
    </div>
  );
}
