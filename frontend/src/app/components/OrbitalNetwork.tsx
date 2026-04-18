"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  Float,
  MeshDistortMaterial,
  Billboard,
} from "@react-three/drei";
import * as THREE from "three";

type LayoutNode = {
  id: string;
  type: "hub" | "planet" | "moon";
  label: string;
  position: [number, number, number];
  color: string;
  size: number;
};

type Edge = {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
};

const MOCK_PROJECTS = [
  {
    id: "p1",
    title: "Project A:\nSynth Arps",
    color: "#22d3ee",
    metas: ["Tempo\n124", "Key\nA Min", "Tags:\nElectronic"],
  },
  {
    id: "p2",
    title: "Project B:\nVocal Cuts",
    color: "#a78bfa",
    metas: ["Type:\nSample", "Stems:\n4", "Mood:\nEthereal"],
  },
  {
    id: "p3",
    title: "Project C:\nDrum Groove",
    color: "#fbbf24",
    metas: ["BPM\n124", "Tags:\nBreakbeat", "Vocal\nStem"],
  },
];

function computeOrbitalLayout() {
  const nodes: LayoutNode[] = [];
  const edges: Edge[] = [];

  // Hub
  nodes.push({
    id: "hub",
    type: "hub",
    label: "Recent\nWorks",
    position: [0, 0, 0],
    color: "#ffffff",
    size: 1.2,
  });

  MOCK_PROJECTS.forEach((proj, index) => {
    const angle = (index / MOCK_PROJECTS.length) * Math.PI * 2 - Math.PI / 6;
    const r = 6.5 + (index % 2) * 1.5;
    const px = Math.cos(angle) * r;
    const pz = Math.sin(angle) * r;
    const py = Math.sin(index * 2) * 1.5;

    nodes.push({
      id: proj.id,
      type: "planet",
      label: proj.title,
      position: [px, py, pz],
      color: proj.color,
      size: 0.8,
    });

    edges.push({
      id: `hub-${proj.id}`,
      from: [0, 0, 0],
      to: [px, py, pz],
    });

    proj.metas.forEach((meta, mIndex) => {
      const mAngle = (mIndex / proj.metas.length) * Math.PI * 2 + angle;
      const mr = 2.4;
      const mx = px + Math.cos(mAngle) * mr;
      const mz = pz + Math.sin(mAngle) * mr;
      const my = py + Math.sin(mAngle * 2) * 0.8;

      const mId = `meta-${proj.id}-${mIndex}`;
      nodes.push({
        id: mId,
        type: "moon",
        label: meta,
        position: [mx, my, mz],
        color: "rgba(255,255,255,0.6)",
        size: 0.5,
      });

      edges.push({
        id: `edge-${mId}`,
        from: [px, py, pz],
        to: [mx, my, mz],
      });
    });
  });

  return { nodes, edges };
}

function EdgeCurve({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const curve = useMemo(() => {
    const midX = (from[0] + to[0]) / 2;
    const midY = (from[1] + to[1]) / 2;
    const midZ = (from[2] + to[2]) / 2;
    const dist = new THREE.Vector3(...from).distanceTo(new THREE.Vector3(...to));
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...from),
      new THREE.Vector3(midX, midY - dist * 0.15, midZ),
      new THREE.Vector3(...to)
    );
  }, [from, to]);

  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.02, 8, false), [curve]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="rgba(255,255,255,0.15)" transparent depthWrite={false} />
    </mesh>
  );
}

function ConcentricRings() {
  const radii = [4, 6.5, 8, 10];
  return (
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      {radii.map((r, i) => (
        <mesh key={i}>
          <ringGeometry args={[r, r + 0.02, 64]} />
          <meshBasicMaterial color="rgba(255,255,255,0.06)" transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function FloatingParticles({ count = 150 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const rand = (n: number) => (Math.sin(n * 12.9898) * 43758.5453) % 1;
      return {
        x: (rand(i * 1.1) - 0.5) * 30,
        y: (rand(i * 2.2) - 0.5) * 20,
        z: (rand(i * 3.3) - 0.5) * 30,
        speed: 0.1 + Math.abs(rand(i * 4.4)) * 0.2,
        offset: Math.abs(rand(i * 5.5)) * Math.PI * 2,
        scale: 0.01 + Math.abs(rand(i * 6.6)) * 0.03,
      };
    });
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.5,
        p.y + Math.cos(t * p.speed * 0.7 + p.offset) * 0.5,
        p.z + Math.sin(t * p.speed * 0.5 + p.offset * 2) * 0.5
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
    </instancedMesh>
  );
}

function OrbitalNode({ node }: { node: LayoutNode }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.y = node.position[1] + Math.sin(t * 1.2 + node.position[0]) * 0.15;
    if (glowRef.current) {
      glowRef.current.position.y = meshRef.current.position.y;
      glowRef.current.scale.setScalar(node.type === "hub" ? 1.5 + Math.sin(t * 2) * 0.05 : 1.3);
    }
  });

  if (node.type === "moon") {
    return (
      <group position={node.position}>
        <Billboard>
          <mesh>
            <circleGeometry args={[node.size, 32]} />
            <meshBasicMaterial color="#030712" transparent opacity={0.85} depthWrite={false} />
          </mesh>
          <mesh>
            <ringGeometry args={[node.size - 0.02, node.size, 32]} />
            <meshBasicMaterial color="rgba(255,255,255,0.15)" transparent depthWrite={false} />
          </mesh>
          <Text fontSize={0.14} color="#94a3b8" anchorX="center" anchorY="middle" textAlign="center" maxWidth={node.size * 1.8}>
            {node.label}
          </Text>
        </Billboard>
      </group>
    );
  }

  return (
    <group position={[node.position[0], 0, node.position[2]]}>
      <mesh ref={glowRef} position={[0, node.position[1], 0]}>
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshBasicMaterial color={node.color} transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh ref={meshRef} position={[0, node.position[1], 0]}>
          <sphereGeometry args={[node.size, 64, 64]} />
          {node.type === "hub" ? (
            <MeshDistortMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} distort={0.15} speed={3} />
          ) : (
            <MeshDistortMaterial color={node.color} emissive={node.color} emissiveIntensity={0.6} roughness={0.3} metalness={0.8} distort={0.1} speed={2} />
          )}
        </mesh>
      </Float>

      <Billboard position={[0, node.position[1] + node.size + 0.4, 0]}>
        <Text fontSize={node.type === "hub" ? 0.35 : 0.25} color="white" fontWeight={700} anchorX="center" anchorY="middle" textAlign="center">
          {node.label}
        </Text>
      </Billboard>
    </group>
  );
}

export default function OrbitalNetwork() {
  const { nodes, edges } = useMemo(() => computeOrbitalLayout(), []);

  return (
    <div className="relative w-full h-screen z-10 bg-[#000000] border-t border-white/5 pt-12 flex flex-col items-center">
      {/* Title for the section */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
        <h2 className="text-3xl font-bold tracking-tight text-white/90">
          Recent Works
        </h2>
        <p className="text-xs font-mono tracking-widest text-white/40 mt-2 uppercase">
          Dynamic Constellation
        </p>
      </div>

      <Canvas
        camera={{ position: [0, 8, 18], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.15} />
        <pointLight position={[5, 5, 5]} intensity={0.5} color="#22d3ee" />
        <pointLight position={[-5, -3, 3]} intensity={0.4} color="#a78bfa" />

        <ConcentricRings />
        <FloatingParticles />

        {edges.map((e) => (
          <EdgeCurve key={e.id} from={e.from} to={e.to} />
        ))}

        {nodes.map((node) => (
          <OrbitalNode key={node.id} node={node} />
        ))}

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          autoRotate
          autoRotateSpeed={0.4}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          minDistance={8}
          maxDistance={30}
        />
      </Canvas>

      {/* Orbit hint */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-5 py-2 rounded-full"
        style={{
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.08)",
          pointerEvents: "none",
          backdropFilter: "blur(12px)",
        }}
      >
        <span
          className="text-[10px] font-medium tracking-widest uppercase"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Drag to orbit · Scroll to zoom
        </span>
      </div>
    </div>
  );
}
