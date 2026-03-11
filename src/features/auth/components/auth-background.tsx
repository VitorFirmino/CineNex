"use client";

import { useRef, useMemo, type ElementRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Text,
  PerspectiveCamera,
  Points,
  PointMaterial,
  MeshDistortMaterial,
  MeshWobbleMaterial,
} from "@react-three/drei";
import * as THREE from "three";
import { BRAND } from "@styles/brand";

type DistortMaterial = ElementRef<typeof MeshDistortMaterial>;

const TARGET_TEXT_COLOR = new THREE.Color("#f0f9ff");

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function buildPositions(
  count: number,
  spreadX: number,
  spreadY: number,
  spreadZ: number,
  seedOffset: number,
) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const seed = i + seedOffset;
    positions[i * 3] = (pseudoRandom(seed * 3 + 1) - 0.5) * spreadX;
    positions[i * 3 + 1] = (pseudoRandom(seed * 3 + 2) - 0.5) * spreadY;
    positions[i * 3 + 2] = (pseudoRandom(seed * 3 + 3) - 0.5) * spreadZ;
  }
  return positions;
}

function DigitalParticles({ count = 4000 }: { count?: number }) {
  const positions1 = useMemo(() => buildPositions(count, 350, 250, 200, 42), [count]);
  const nearCount = Math.floor(count / 1.5);
  const positions2 = useMemo(() => buildPositions(nearCount, 250, 200, 150, 2024), [nearCount]);

  const ref1 = useRef<THREE.Points>(null!);
  const ref2 = useRef<THREE.Points>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref1.current) {
      ref1.current.rotation.y = t * 0.003;
      ref1.current.rotation.z = Math.sin(t * 0.005) * 0.05;
    }
    if (ref2.current) {
      ref2.current.rotation.y = -t * 0.006;
      ref2.current.rotation.x = Math.cos(t * 0.008) * 0.04;
    }
  });

  return (
    <group>
      <Points ref={ref1} positions={positions1} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={BRAND.hex}
          size={0.15}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.35}
        />
      </Points>
      <Points ref={ref2} positions={positions2} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#8b5cf6"
          size={0.12}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.5}
        />
      </Points>
    </group>
  );
}

function CameraRig({ cameraRef }: { cameraRef: { current: THREE.PerspectiveCamera | null } }) {
  useFrame(({ clock, mouse }) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const t = clock.getElapsedTime();

    const targetX = (mouse.x * 5) + Math.sin(t * 0.3) * 3;
    const targetY = (mouse.y * 3) + Math.cos(t * 0.25) * 2;

    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (targetY - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function ExplorerLogo() {
  const distortRef = useRef<DistortMaterial>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (!distortRef.current) return;
    const t = clock.getElapsedTime();
    distortRef.current.distort = 0.3 + Math.sin(t * 0.6) * 0.15;
    distortRef.current.emissiveIntensity = 0.5 + Math.sin(t * 1.2) * 0.3;
    distortRef.current.color.lerp(TARGET_TEXT_COLOR, 0.05);

    if (!groupRef.current) return;
    groupRef.current.position.y = Math.sin(t * 0.9) * 1.4;
    groupRef.current.rotation.y = Math.sin(t * 0.35) * 0.12;
    groupRef.current.rotation.x = Math.cos(t * 0.28) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <Text
        fontSize={18}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
      >
        CINENEX
        <MeshDistortMaterial
          ref={distortRef}
          color="#f0f9ff"
          emissive={BRAND.hex}
          emissiveIntensity={0.6}
          distort={0.3}
          speed={2}
          transparent
          opacity={0.9}
          metalness={1}
          roughness={0}
        />
      </Text>

      <mesh position={[0, 0, -5]}>
        <planeGeometry args={[100, 40]} />
        <MeshWobbleMaterial
          color="#8b5cf6"
          transparent
          opacity={0.05}
          factor={0.4}
          speed={1}
        />
      </mesh>
    </group>
  );
}

export function AuthBackground() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);

  return (
    <div className="fixed inset-0 z-0 bg-black w-full h-full">
      <Canvas dpr={[1, 1.5]} gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}>
        <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 80]} fov={50} />
        <color attach="background" args={["#000000"]} />

        <ambientLight intensity={0.4} />
        <pointLight position={[50, 50, 30]} intensity={2} color={BRAND.hex} />
        <pointLight position={[-50, -50, 30]} intensity={1.5} color="#8b5cf6" />
        <spotLight position={[0, 100, 50]} angle={0.3} penumbra={1} intensity={1} color={BRAND.lightHex} />

        <DigitalParticles />
        <CameraRig cameraRef={cameraRef} />
        <ExplorerLogo />
      </Canvas>

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60 pointer-events-none" />
    </div>
  );
}
