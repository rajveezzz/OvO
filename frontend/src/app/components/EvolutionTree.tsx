"use client";

import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  Float,
  MeshDistortMaterial,
  Billboard,
} from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { type TrackNode } from "../data";

/* ─────────────── Layout: compute 3D positions ─────────────── */

function compute3DPositions(tracks: TrackNode[]) {
  const positions: Record<string, [number, number, number]> = {};
  const roots = tracks.filter((t) => !t.parent_id);
  const children = (pid: string) => tracks.filter((t) => t.parent_id === pid);

  let col = 0;
  function layout(node: TrackNode, depth: number) {
    const kids = children(node.id);
    if (kids.length === 0) {
      positions[node.id] = [col * 2.8 - 2.5, -depth * 2.4, 0];
      col++;
    } else {
      kids.forEach((k) => layout(k, depth + 1));
      const childXs = kids.map((k) => positions[k.id][0]);
      const avgX = (Math.min(...childXs) + Math.max(...childXs)) / 2;
      positions[node.id] = [avgX, -depth * 2.4, 0];
    }
  }

  roots.forEach((r) => layout(r, 0));

  // Add Z-depth variation for visual interest
  Object.keys(positions).forEach((id, i) => {
    positions[id][2] = Math.sin(i * 1.7) * 1.2;
  });

  return positions;
}

/* ─────────────── Glowing Node Sphere ─────────────── */

function NodeSphere({
  track,
  position,
  isActive,
  onClick,
}: {
  track: TrackNode;
  position: [number, number, number];
  isActive: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const isRaw = track.type === "raw_capture";
  const baseColor = isActive ? "#22d3ee" : isRaw ? "#22d3ee" : "#8b5cf6";
  const emissiveIntensity = isActive ? 2.5 : hovered ? 1.5 : 0.6;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Gentle bob
    meshRef.current.position.y =
      position[1] + Math.sin(t * 0.8 + position[0]) * 0.06;

    // Active node pulse
    if (isActive && meshRef.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.08;
      meshRef.current.scale.setScalar(pulse);
    }

    // Glow pulse
    if (glowRef.current) {
      const glowPulse = isActive
        ? 1.8 + Math.sin(t * 2.5) * 0.4
        : hovered
          ? 1.5
          : 1.2;
      glowRef.current.scale.setScalar(glowPulse);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = isActive
        ? 0.12 + Math.sin(t * 2.5) * 0.06
        : hovered
          ? 0.08
          : 0.04;
    }

    // Spinning ring for active
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.5;
      ringRef.current.rotation.x = Math.sin(t * 0.3) * 0.3;
    }
  });

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "default";
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick();
    },
    [onClick]
  );

  return (
    <group position={position}>
      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>

      {/* Active ring */}
      {isActive && (
        <mesh ref={ringRef}>
          <torusGeometry args={[0.65, 0.015, 16, 64]} />
          <meshBasicMaterial
            color="#22d3ee"
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Main sphere */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.2}>
        <mesh
          ref={meshRef}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <sphereGeometry args={[0.35, 64, 64]} />
          <MeshDistortMaterial
            color={baseColor}
            emissive={baseColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.2}
            metalness={0.8}
            distort={isActive ? 0.15 : hovered ? 0.1 : 0.05}
            speed={isActive ? 4 : 2}
          />
        </mesh>
      </Float>

      {/* Node title label */}
      <Billboard>
        <Text
          position={[0, 0, 0]}
          fontSize={0.12}
          color="white"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
          maxWidth={1.8}
        >
          {track.title ? track.title.slice(0, 12) : track.id.toUpperCase()}
        </Text>
      </Billboard>

      {/* Track metadata underneath */}
      <Billboard>
        <Text
          position={[0, -0.55, 0]}
          fontSize={0.09}
          color="#ffffff"
          fillOpacity={0.5}
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
        >
          {track.key} · {track.bpm} BPM
        </Text>
      </Billboard>

      {/* Type badge */}
      <Billboard>
        <Text
          position={[0, -0.75, 0]}
          fontSize={0.07}
          color={isRaw ? "#22d3ee" : "#a78bfa"}
          anchorX="center"
          anchorY="middle"
        >
          {isRaw ? "RAW CAPTURE" : "AI SPLIT"}
        </Text>
      </Billboard>
    </group>
  );
}

/* ─────────────── Glowing Edge Tube ─────────────── */

function EdgeTube({
  from,
  to,
}: {
  from: [number, number, number];
  to: [number, number, number];
}) {
  const tubeRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    const midY = (from[1] + to[1]) / 2;
    const midZ = (from[2] + to[2]) / 2 + 0.5;
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(...from),
      new THREE.Vector3(from[0], midY, midZ),
      new THREE.Vector3(to[0], midY, midZ),
      new THREE.Vector3(...to),
    ]);
  }, [from, to]);

  const tubeGeometry = useMemo(
    () => new THREE.TubeGeometry(curve, 48, 0.02, 8, false),
    [curve]
  );

  const glowGeometry = useMemo(
    () => new THREE.TubeGeometry(curve, 48, 0.06, 8, false),
    [curve]
  );

  useFrame((state) => {
    if (!tubeRef.current) return;
    const mat = tubeRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
  });

  return (
    <group>
      {/* Glow tube (wider, faded) */}
      <mesh geometry={glowGeometry}>
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      {/* Core tube */}
      <mesh ref={tubeRef} geometry={tubeGeometry}>
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ─────────────── Floating Particles ─────────────── */

function FloatingParticles({ count = 120 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 14,
      y: (Math.random() - 0.5) * 12,
      z: (Math.random() - 0.5) * 8,
      speed: 0.1 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
      scale: 0.01 + Math.random() * 0.025,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.3,
        p.y + Math.cos(t * p.speed * 0.7 + p.offset) * 0.4,
        p.z + Math.sin(t * p.speed * 0.5 + p.offset * 2) * 0.2
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
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.3} />
    </instancedMesh>
  );
}

/* ─────────────── Grid Floor ─────────────── */

function GridFloor() {
  return (
    <group position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <gridHelper
        args={[30, 30, "#1a1a2e", "#0d0d1a"]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

/* ─────────────── Scene Content ─────────────── */

function Scene({
  tracks,
  activeTrackId,
  onSelectTrack,
}: {
  tracks: TrackNode[];
  activeTrackId: string | null;
  onSelectTrack: (id: string) => void;
}) {
  const positions = useMemo(() => compute3DPositions(tracks), [tracks]);

  const edges = useMemo(
    () =>
      tracks
        .filter((t) => t.parent_id && positions[t.parent_id])
        .map((t) => ({
          from: positions[t.parent_id!],
          to: positions[t.id],
          id: `${t.parent_id}-${t.id}`,
        })),
    [tracks, positions]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]} intensity={0.4} color="#22d3ee" />
      <pointLight position={[-5, -3, 3]} intensity={0.3} color="#8b5cf6" />
      <pointLight position={[0, 3, -5]} intensity={0.2} color="#4c1d95" />

      {/* Edges */}
      {edges.map((e) => (
        <EdgeTube key={e.id} from={e.from} to={e.to} />
      ))}

      {/* Nodes */}
      {tracks.map((track) =>
        positions[track.id] ? (
          <NodeSphere
            key={track.id}
            track={track}
            position={positions[track.id]}
            isActive={activeTrackId === track.id}
            onClick={() => onSelectTrack(track.id)}
          />
        ) : null
      )}

      {/* Ambient particles */}
      <FloatingParticles />

      {/* Grid floor */}
      <GridFloor />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={4}
        maxDistance={16}
        autoRotate
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI / 1.6}
        minPolarAngle={Math.PI / 4}
      />
    </>
  );
}

/* ─────────────── Empty Tree State ─────────────── */

function EmptyTreeScene() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]} intensity={0.3} color="#22d3ee" />
      <pointLight position={[-5, -3, 3]} intensity={0.2} color="#8b5cf6" />
      <FloatingParticles count={60} />
      <GridFloor />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.5}
      />
      <Billboard>
        <Text
          position={[0, 0, 0]}
          fontSize={0.3}
          color="#ffffff"
          fillOpacity={0.15}
          anchorX="center"
          anchorY="middle"
        >
          Upload a .wav to see your tree
        </Text>
      </Billboard>
    </>
  );
}

/* ─────────────── Main Component ─────────────── */

interface EvolutionTreeProps {
  tracks: TrackNode[];
  activeTrackId: string | null;
  onSelectTrack: (id: string) => void;
}

export default function EvolutionTree({
  tracks,
  activeTrackId,
  onSelectTrack,
}: EvolutionTreeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isEmpty = tracks.length === 0;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.2 }}
      className="rounded-2xl mb-6 relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(40px)",
        height: "420px",
      }}
    >
      {/* Header bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4"
        style={{ pointerEvents: "none" }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          Evolution Tree
        </h2>
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-mono px-2 py-1 rounded-full"
            style={{
              color: "rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {tracks.length} nodes · 3D
          </span>
        </div>
      </div>

      {/* Orbit hint */}
      {!isEmpty && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        >
          <span
            className="text-[9px] font-medium"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Drag to orbit · Scroll to zoom
          </span>
        </div>
      )}

      {/* 3D Canvas */}
      {mounted && (
        <Canvas
          camera={{ position: [0, 1, 9], fov: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          style={{ background: "transparent" }}
          dpr={[1, 2]}
        >
          {isEmpty ? (
            <EmptyTreeScene />
          ) : (
            <Scene
              tracks={tracks}
              activeTrackId={activeTrackId}
              onSelectTrack={onSelectTrack}
            />
          )}
        </Canvas>
      )}
    </motion.div>
  );
}
