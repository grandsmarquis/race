"use client";

import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, DoubleSide, Group, InstancedMesh, Mesh, Object3D, SRGBColorSpace } from "three";

import { BIOME_ATMOSPHERE, getBiomeVisibilityInTransition, getBlendedRoadAtmosphere } from "@/game/biome";
import { ROAD_SETTINGS, VISUAL_SETTINGS } from "@/game/config";
import { hash01 } from "@/game/math";
import { buildRoadWindow } from "@/game/road";
import { useRaceStore } from "@/game/store/useRaceStore";
import { RoadBiome, RoadSegmentSpec } from "@/game/types";

function BiomeColor({ biome }: { biome: RoadSegmentSpec["biome"] }) {
  const atmosphere = BIOME_ATMOSPHERE[biome];
  return <meshStandardMaterial color={atmosphere.shoulderColor} roughness={0.95} />;
}

function BiomeDecor({ biome }: { biome: RoadBiome }) {
  if (biome === "desert") {
    return (
      <>
        <mesh castShadow position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 1.6, 7]} />
          <meshStandardMaterial color="#4f7e40" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0.3, 1.05, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 0.72, 6]} />
          <meshStandardMaterial color="#5a8f4a" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[-0.28, 0.95, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.62, 6]} />
          <meshStandardMaterial color="#5a8f4a" roughness={0.9} />
        </mesh>
      </>
    );
  }

  if (biome === "alps") {
    return (
      <>
        <mesh castShadow position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.11, 0.15, 0.84, 6]} />
          <meshStandardMaterial color="#6f4e37" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 1.22, 0]}>
          <coneGeometry args={[0.55, 1.25, 6]} />
          <meshStandardMaterial color="#507c54" roughness={0.85} />
        </mesh>
      </>
    );
  }

  return (
    <>
      <mesh castShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.11, 1.1, 6]} />
        <meshStandardMaterial color="#7f5539" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.2, 1.16, 0]}>
        <sphereGeometry args={[0.34, 6, 6]} />
        <meshStandardMaterial color="#4f8f57" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[-0.22, 1.22, 0]}>
        <sphereGeometry args={[0.29, 6, 6]} />
        <meshStandardMaterial color="#5a9c62" roughness={0.82} />
      </mesh>
    </>
  );
}

function BiomeBlockerMaterial({ biome }: { biome: RoadBiome }) {
  const atmosphere = BIOME_ATMOSPHERE[biome];
  return <meshStandardMaterial color={atmosphere.blockerColor} roughness={0.65} />;
}

const CHECKPOINT_COLORS: Record<RoadBiome, { pole: string; banner: string; trim: string; text: string; shadow: string }> =
  {
    seaside: {
      pole: "#f7b267",
      banner: "#ffd166",
      trim: "#ef4444",
      text: "#111827",
      shadow: "#7f1d1d",
    },
    desert: {
      pole: "#e5986c",
      banner: "#ffbf69",
      trim: "#be123c",
      text: "#2b2115",
      shadow: "#7f1d1d",
    },
    alps: {
      pole: "#8ecae6",
      banner: "#ade8f4",
      trim: "#2563eb",
      text: "#0f172a",
      shadow: "#1e3a8a",
    },
  };
const CHECKPOINT_SCALE = 2;

function createCheckpointBannerTexture(
  colors: (typeof CHECKPOINT_COLORS)[RoadBiome],
  seedShift: number,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  if (!context) {
    return texture;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(seedShift * 6, 0);

  context.beginPath();
  context.moveTo(28, 20);
  context.lineTo(900, 20);
  context.lineTo(992, 128);
  context.lineTo(900, 236);
  context.lineTo(28, 236);
  context.closePath();
  context.fillStyle = colors.banner;
  context.fill();

  context.fillStyle = colors.trim;
  context.fillRect(28, 20, 860, 28);
  context.fillRect(28, 208, 860, 28);

  context.strokeStyle = colors.shadow;
  context.lineWidth = 10;
  context.stroke();

  context.globalAlpha = 0.28;
  context.fillStyle = "#ffffff";
  context.fillRect(54, 62, 660, 18);
  context.globalAlpha = 1;

  context.fillStyle = colors.text;
  context.font = "900 112px 'Arial Black', 'Impact', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("CHECKPOINT", 470, 132);

  context.fillStyle = colors.trim;
  context.fillRect(930, 94, 42, 68);
  context.restore();

  texture.needsUpdate = true;
  return texture;
}

function CheckpointArch({ biome, phase }: { biome: RoadBiome; phase: number }) {
  const colors = CHECKPOINT_COLORS[biome];
  const flagRef = useRef<Group>(null);
  const bannerTexture = useMemo(() => createCheckpointBannerTexture(colors, phase), [colors, phase]);

  useFrame(({ clock }) => {
    if (!flagRef.current) {
      return;
    }
    const t = clock.elapsedTime + phase;
    flagRef.current.position.y = 2.84 + Math.sin(t * 2.1) * 0.09;
    flagRef.current.rotation.z = Math.sin(t * 2.8) * 0.05;
    flagRef.current.rotation.y = Math.sin(t * 1.4) * 0.08;
  });

  useEffect(
    () => () => {
      bannerTexture.dispose();
    },
    [bannerTexture],
  );

  return (
    <group scale={[CHECKPOINT_SCALE, CHECKPOINT_SCALE, CHECKPOINT_SCALE]}>
      <mesh position={[-ROAD_SETTINGS.width * 0.43, 1.34, 0]} castShadow>
        <boxGeometry args={[0.28, 2.95, 0.28]} />
        <meshStandardMaterial color={colors.pole} roughness={0.55} />
      </mesh>
      <mesh position={[ROAD_SETTINGS.width * 0.43, 1.34, 0]} castShadow>
        <boxGeometry args={[0.28, 2.95, 0.28]} />
        <meshStandardMaterial color={colors.pole} roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.78, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, ROAD_SETTINGS.width * 0.82, 10]} />
        <meshStandardMaterial color={colors.pole} roughness={0.44} metalness={0.18} />
      </mesh>

      <group ref={flagRef}>
        <mesh position={[0, 0, 0.2]} castShadow>
          <planeGeometry args={[ROAD_SETTINGS.width * 0.74, 1.2]} />
          <meshStandardMaterial
            map={bannerTexture}
            transparent
            alphaTest={0.1}
            roughness={0.64}
            metalness={0.05}
            side={DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

function RoadSegment({ segment, seed }: { segment: RoadSegmentSpec; seed: number }) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const dz = segment.end.z - segment.start.z;

  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const yaw = Math.atan2(dx, dz);
  const pitch = -Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));

  const mx = (segment.start.x + segment.end.x) * 0.5;
  const my = (segment.start.y + segment.end.y) * 0.5;
  const mz = (segment.start.z + segment.end.z) * 0.5;

  const laneMarkers = Array.from({ length: segment.laneCount - 1 }, (_, i) => {
    const offset = ((i + 1) / segment.laneCount - 0.5) * (segment.width - ROAD_SETTINGS.shoulder * 2);
    return offset;
  });

  const propNoise = hash01(segment.index * 0.61, seed * 0.13);
  const blockerNoise = hash01(segment.index * 0.31, seed * 0.43);
  const hasDecor = propNoise > 0.7;
  const decorSide = hash01(segment.index * 0.11, seed * 0.77) > 0.5 ? 1 : -1;
  const hasBlocker = segment.index % 19 === 0 && blockerNoise > 0.45;
  const blockerSide = hash01(segment.index * 0.79, seed * 0.27) > 0.5 ? 1 : -1;

  return (
    <group position={[mx, my, mz]} rotation={[pitch, yaw, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[segment.width, 0.45, length]} />
        <meshStandardMaterial color={VISUAL_SETTINGS.asphaltColor} roughness={0.92} />
      </mesh>

      <mesh position={[0, -0.31, 0]} receiveShadow>
        <boxGeometry args={[segment.width + 11, 0.2, length]} />
        <BiomeColor biome={segment.biome} />
      </mesh>

      {laneMarkers.map((offset, idx) => (
        <mesh key={idx} position={[offset, 0.24, 0]}>
          <boxGeometry args={[0.13, 0.02, 4]} />
          <meshStandardMaterial color={VISUAL_SETTINGS.laneColor} emissive="#faf9f6" emissiveIntensity={0.08} />
        </mesh>
      ))}

      {segment.checkpoint && (
        <group>
          <CheckpointArch biome={segment.biome} phase={segment.index * 0.27} />
        </group>
      )}

      {hasDecor && (
        <group position={[decorSide * (segment.width * 0.65), 0.2, 0]}>
          <BiomeDecor biome={segment.biome} />
        </group>
      )}

      {hasBlocker && (
        <RigidBody type="fixed" colliders={false} position={[blockerSide * (segment.width * 0.48), 0.65, 0]}>
          <CuboidCollider args={[0.7, 0.7, 0.9]} />
          <mesh castShadow>
            <boxGeometry args={[1.4, 1.4, 1.8]} />
            <BiomeBlockerMaterial biome={segment.biome} />
          </mesh>
        </RigidBody>
      )}
    </group>
  );
}

function WorldGround({ shoulderColor, blockerColor }: { shoulderColor: string; blockerColor: string }) {
  const carPosition = useRaceStore((state) => state.car.position);

  return (
    <group position={[carPosition.x, 0, carPosition.z]}>
      <mesh position={[0, -0.56, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1300, 48]} />
        <meshStandardMaterial color={shoulderColor} roughness={0.98} />
      </mesh>
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1900, 40]} />
        <meshStandardMaterial color={blockerColor} roughness={1} />
      </mesh>
    </group>
  );
}

function AlpsBackdrop({ seed, visibility }: { seed: number; visibility: number }) {
  const carPosition = useRaceStore((state) => state.car.position);
  const mountainRanges = useMemo(
    () =>
      [0, 1].flatMap((ring) => {
        const rangeCount = ring === 0 ? 12 : 14;
        return Array.from({ length: rangeCount }, (_, idx) => {
          const id = ring * 100 + idx;
          const angleJitter = (hash01(seed * 0.19 + ring * 3.4, idx * 0.73) - 0.5) * 0.12;
          const angle = (idx / rangeCount) * Math.PI * 2 + angleJitter;
          const radiusBase = ring === 0 ? 1100 : 1450;
          const radius = radiusBase + hash01(seed * 0.41 + ring * 7.8, idx * 0.27) * 220;
          const scaleBase = ring === 0 ? 1.6 : 2.1;
          const scale = scaleBase + hash01(seed * 0.89 + ring * 11.3, idx * 1.13) * 1.15;
          const yOffsetBase = ring === 0 ? -142 : -198;
          const yOffset = yOffsetBase + hash01(seed * 1.07 + ring * 5.1, idx * 0.51) * 12;
          const peakCount = 4 + Math.floor(hash01(seed * 2.37 + ring, idx * 0.97) * 3);
          const span = 280 + hash01(seed * 0.63 + ring, idx * 1.41) * 240;
          const bodyColor = ring === 0 ? "#627287" : "#6f8095";
          const snowColor = ring === 0 ? "#edf5ff" : "#f5f9ff";
          const hazeColor = ring === 0 ? "#bfd1e4" : "#cddded";
          const bodyOpacity = ring === 0 ? 0.9 : 0.78;
          const snowOpacity = ring === 0 ? 0.95 : 0.84;
          const emissiveIntensity = ring === 0 ? 0.05 : 0.08;
          return {
            id,
            angle,
            radius,
            scale,
            yOffset,
            peakCount,
            span,
            bodyColor,
            snowColor,
            hazeColor,
            bodyOpacity,
            snowOpacity,
            emissiveIntensity,
          };
        });
      }),
    [seed],
  );

  return (
    <group position={[carPosition.x, 0, carPosition.z]}>
      {mountainRanges.map((range) => {
        const mountainX = Math.cos(range.angle) * range.radius;
        const mountainZ = Math.sin(range.angle) * range.radius;
        const yaw = -range.angle + Math.PI * 0.5;

        return (
          <group key={range.id} position={[mountainX, range.yOffset, mountainZ]} rotation={[0, yaw, 0]}>
            {Array.from({ length: range.peakCount }, (_, peakIdx) => {
              const t = peakIdx / Math.max(1, range.peakCount - 1);
              const xOffset = (t - 0.5) * range.span;
              const noise = hash01(range.id * 0.71, peakIdx * 1.37);
              const peakScale = 0.72 + noise * 0.95;
              const peakHeight = (58 + noise * 52) * range.scale;
              const peakRadius = (34 + noise * 20) * range.scale;
              const snowHeight = Math.max(10, peakHeight * 0.24);
              const snowRadius = peakRadius * 0.38;
              const snowY = peakHeight * 0.5 - snowHeight * 0.33;

              return (
                <group key={peakIdx} position={[xOffset, 0, 0]}>
                  <mesh position={[0, peakHeight * 0.5, 0]}>
                    <coneGeometry args={[peakRadius, peakHeight, 8]} />
                    <meshStandardMaterial
                      color={range.bodyColor}
                      roughness={0.98}
                      fog={false}
                      transparent
                      opacity={range.bodyOpacity * visibility}
                      emissive={range.hazeColor}
                      emissiveIntensity={range.emissiveIntensity * visibility}
                    />
                  </mesh>
                  <mesh position={[0, snowY, 0]}>
                    <coneGeometry args={[snowRadius, snowHeight, 8]} />
                    <meshStandardMaterial
                      color={range.snowColor}
                      roughness={0.84}
                      fog={false}
                      transparent
                      opacity={range.snowOpacity * visibility}
                    />
                  </mesh>
                  {peakScale > 1.15 && (
                    <mesh position={[peakRadius * 0.45, peakHeight * 0.35, 0]}>
                      <coneGeometry args={[peakRadius * 0.55, peakHeight * 0.7, 8]} />
                      <meshStandardMaterial
                        color={range.bodyColor}
                        roughness={0.98}
                        fog={false}
                        transparent
                        opacity={range.bodyOpacity * visibility}
                        emissive={range.hazeColor}
                        emissiveIntensity={range.emissiveIntensity * visibility}
                      />
                    </mesh>
                  )}
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

interface SeasideBirdSpec {
  id: number;
  radius: number;
  height: number;
  phase: number;
  speed: number;
  flapSpeed: number;
  bobAmplitude: number;
  scale: number;
}

function SeasideBird({ spec, visibility }: { spec: SeasideBirdSpec; visibility: number }) {
  const rootRef = useRef<Group>(null);
  const leftWingRef = useRef<Mesh>(null);
  const rightWingRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const orbit = t * spec.speed + spec.phase;
    const x = Math.cos(orbit) * spec.radius;
    const z = Math.sin(orbit) * spec.radius;
    const y = spec.height + Math.sin(t * 0.8 + spec.phase) * spec.bobAmplitude;
    const flap = Math.sin(t * spec.flapSpeed + spec.phase) * 0.62;

    if (rootRef.current) {
      rootRef.current.position.set(x, y, z);
      rootRef.current.rotation.y = -orbit + Math.PI * 0.5;
    }

    if (leftWingRef.current) {
      leftWingRef.current.rotation.z = flap;
    }

    if (rightWingRef.current) {
      rightWingRef.current.rotation.z = -flap;
    }
  });

  return (
    <group ref={rootRef} scale={spec.scale}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#25303f" roughness={0.72} fog={false} transparent opacity={visibility} />
      </mesh>
      <mesh ref={leftWingRef} position={[-0.38, 0, 0]}>
        <boxGeometry args={[0.72, 0.03, 0.24]} />
        <meshStandardMaterial color="#2f3d4f" roughness={0.68} fog={false} transparent opacity={visibility} />
      </mesh>
      <mesh ref={rightWingRef} position={[0.38, 0, 0]}>
        <boxGeometry args={[0.72, 0.03, 0.24]} />
        <meshStandardMaterial color="#2f3d4f" roughness={0.68} fog={false} transparent opacity={visibility} />
      </mesh>
    </group>
  );
}

function SeasideBirds({ seed, visibility }: { seed: number; visibility: number }) {
  const carPosition = useRaceStore((state) => state.car.position);
  const birdSpecs = useMemo(
    () =>
      Array.from({ length: 13 }, (_, idx) => {
        const ring = idx % 2;
        const radiusBase = ring === 0 ? 190 : 310;
        const radius = radiusBase + hash01(seed * 0.47, idx * 1.31) * 130;
        const height = 24 + hash01(seed * 1.79, idx * 0.83) * 28;
        const phase = hash01(seed * 0.29, idx * 2.19) * Math.PI * 2;
        const speed = 0.07 + hash01(seed * 0.97, idx * 1.43) * 0.1;
        const flapSpeed = 7 + hash01(seed * 2.11, idx * 0.63) * 5;
        const bobAmplitude = 0.5 + hash01(seed * 1.53, idx * 1.07) * 1.4;
        const scale = 1 + hash01(seed * 0.61, idx * 1.19) * 0.6;
        return { id: idx, radius, height, phase, speed, flapSpeed, bobAmplitude, scale };
      }),
    [seed],
  );

  return (
    <group position={[carPosition.x, 0, carPosition.z]}>
      {birdSpecs.map((spec) => (
        <SeasideBird key={spec.id} spec={spec} visibility={visibility} />
      ))}
    </group>
  );
}

interface CloudPuffSpec {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
}

interface CloudSpec {
  id: number;
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  puffs: CloudPuffSpec[];
}

function SkyClouds({ seed, visibility }: { seed: number; visibility: number }) {
  const carPosition = useRaceStore((state) => state.car.position);
  const clouds = useMemo<CloudSpec[]>(
    () =>
      Array.from({ length: 24 }, (_, idx) => {
        const ring = idx % 3;
        const radiusBase = ring === 0 ? 170 : ring === 1 ? 280 : 390;
        const radius = radiusBase + hash01(seed * 0.17, idx * 0.83) * 130;
        const angle = hash01(seed * 0.41, idx * 1.19) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = 52 + hash01(seed * 0.71, idx * 1.37) * 56;
        const scale = 4.4 + hash01(seed * 1.31, idx * 0.67) * 6.2;
        const opacity = 0.42 + hash01(seed * 1.53, idx * 0.97) * 0.24;
        const puffCount = 4 + Math.floor(hash01(seed * 2.37, idx * 0.61) * 3);
        const puffs = Array.from({ length: puffCount }, (_, puffIdx) => {
          const xOffset = (hash01(seed * 2.89 + idx * 0.31, puffIdx * 0.73) - 0.5) * 2.2;
          const yOffset = (hash01(seed * 1.67 + idx * 0.47, puffIdx * 0.39) - 0.35) * 0.75;
          const zOffset = (hash01(seed * 1.11 + idx * 0.79, puffIdx * 0.57) - 0.5) * 1.3;
          const radiusScale = 0.4 + hash01(seed * 0.97 + idx * 0.21, puffIdx * 0.89) * 0.42;
          return { id: puffIdx, x: xOffset, y: yOffset, z: zOffset, radius: radiusScale };
        });
        return { id: idx, x, y, z, scale, opacity, puffs };
      }),
    [seed],
  );

  return (
    <group position={[carPosition.x, 0, carPosition.z]}>
      {clouds.map((cloud) => (
        <group key={cloud.id} position={[cloud.x, cloud.y, cloud.z]} scale={cloud.scale}>
          {cloud.puffs.map((puff) => (
            <mesh key={puff.id} position={[puff.x, puff.y, puff.z]}>
              <sphereGeometry args={[puff.radius, 9, 9]} />
              <meshStandardMaterial
                color="#fbfdff"
                roughness={0.86}
                fog={false}
                transparent
                opacity={cloud.opacity * visibility}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function RainField({ seed, intensity }: { seed: number; intensity: number }) {
  const carPosition = useRaceStore((state) => state.car.position);
  const drops = useMemo(
    () =>
      Array.from({ length: 380 }, (_, idx) => {
        const x = (hash01(seed * 0.37, idx * 1.03) - 0.5) * 110;
        const z = (hash01(seed * 1.23, idx * 0.71) - 0.5) * 150;
        const phase = hash01(seed * 0.61, idx * 0.47);
        const speed = 0.75 + hash01(seed * 1.83, idx * 0.89) * 0.75;
        const slant = -0.09 - hash01(seed * 0.93, idx * 0.57) * 0.18;
        return { x, z, phase, speed, slant };
      }),
    [seed],
  );
  const helper = useMemo(() => new Object3D(), []);
  const rainRef = useRef<InstancedMesh>(null);

  useFrame(({ clock }) => {
    const rain = rainRef.current;
    if (!rain) {
      return;
    }

    const t = clock.elapsedTime;
    for (let index = 0; index < drops.length; index += 1) {
      const drop = drops[index];
      const loop = (t * drop.speed + drop.phase) % 1;
      const y = 36 - loop * 44;
      helper.position.set(carPosition.x + drop.x, y, carPosition.z + drop.z);
      helper.rotation.set(0, 0, drop.slant);
      helper.updateMatrix();
      rain.setMatrixAt(index, helper.matrix);
    }
    rain.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={rainRef} args={[undefined, undefined, drops.length]} frustumCulled={false}>
      <boxGeometry args={[0.03, 1.2, 0.03]} />
      <meshStandardMaterial
        color="#c1d7eb"
        roughness={0.28}
        metalness={0.04}
        transparent
        opacity={0.45 * intensity}
      />
    </instancedMesh>
  );
}

function NightSky({ seed, intensity }: { seed: number; intensity: number }) {
  const carPosition = useRaceStore((state) => state.car.position);
  const starRefs = useRef<Array<Mesh | null>>([]);
  const stars = useMemo(
    () =>
      Array.from({ length: 90 }, (_, idx) => {
        const radius = 220 + hash01(seed * 0.77, idx * 0.53) * 360;
        const angle = hash01(seed * 1.57, idx * 0.83) * Math.PI * 2;
        const height = 58 + hash01(seed * 0.19, idx * 1.31) * 105;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const size = 0.32 + hash01(seed * 0.41, idx * 0.29) * 0.58;
        const twinkle = hash01(seed * 2.13, idx * 0.91) * Math.PI * 2;
        return { id: idx, x, y: height, z, size, twinkle };
      }),
    [seed],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let index = 0; index < stars.length; index += 1) {
      const star = starRefs.current[index];
      if (!star) {
        continue;
      }
      const pulse = 0.8 + Math.sin(t * 2.2 + stars[index].twinkle) * 0.16;
      star.scale.setScalar(pulse);
    }
  });

  return (
    <group position={[carPosition.x, 0, carPosition.z]}>
      <mesh position={[230, 108, -240]}>
        <sphereGeometry args={[18, 20, 20]} />
        <meshBasicMaterial color="#cadfff" fog={false} transparent opacity={0.9 * intensity} />
      </mesh>
      {stars.map((star, index) => (
        <mesh
          key={star.id}
          ref={(node) => {
            starRefs.current[index] = node;
          }}
          position={[star.x, star.y, star.z]}
        >
          <sphereGeometry args={[star.size, 6, 6]} />
          <meshBasicMaterial color="#f6fbff" fog={false} transparent opacity={0.88 * intensity} />
        </mesh>
      ))}
    </group>
  );
}

export function RoadScene({ rainAmount, nightAmount }: { rainAmount: number; nightAmount: number }) {
  const seed = useRaceStore((state) => state.seed);
  const carDistance = useRaceStore((state) => state.car.position.z);
  const segmentIndex = useRaceStore((state) => state.car.segmentIndex);
  const atmosphereTestOffset = useRaceStore((state) => state.atmosphereTestOffset);
  const atmosphere = getBlendedRoadAtmosphere(carDistance, seed, atmosphereTestOffset);
  const seasideVisibility = getBiomeVisibilityInTransition("seaside", atmosphere);
  const alpsVisibility = getBiomeVisibilityInTransition("alps", atmosphere);
  const cloudVisibility = Math.max(0, (1 - nightAmount * 1.18) * (1 - rainAmount * 0.24));

  const startIndex = Math.max(0, segmentIndex - ROAD_SETTINGS.segmentsBehind);
  const segments = useMemo(
    () => buildRoadWindow(startIndex, ROAD_SETTINGS.windowSegments, seed, atmosphereTestOffset),
    [atmosphereTestOffset, seed, startIndex],
  );

  return (
    <group>
      {cloudVisibility > 0.001 && <SkyClouds seed={seed} visibility={cloudVisibility} />}
      {nightAmount > 0.001 && <NightSky seed={seed} intensity={nightAmount} />}
      <WorldGround shoulderColor={atmosphere.shoulderColor} blockerColor={atmosphere.blockerColor} />
      {seasideVisibility > 0.001 && <SeasideBirds seed={seed} visibility={seasideVisibility} />}
      {alpsVisibility > 0.001 && <AlpsBackdrop seed={seed} visibility={alpsVisibility} />}
      {rainAmount > 0.001 && <RainField seed={seed} intensity={rainAmount} />}
      {segments.map((segment, slot) => (
        <RoadSegment key={slot} segment={segment} seed={seed} />
      ))}
    </group>
  );
}
