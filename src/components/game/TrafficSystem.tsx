"use client";

import { useFBX } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo } from "react";
import { Group } from "three";

import { buildModelFromFbx, disposeObjectMaterials } from "@/components/game/carModel";
import { hash01 } from "@/game/math";
import { PLAYER_CAR_PRESETS } from "@/game/playerCars";
import { getRoadMetricsAtDistance } from "@/game/road";
import { useRaceStore } from "@/game/store/useRaceStore";
import { getTrafficProfile, trafficLaneOffset } from "@/game/traffic";

function FallbackTrafficBody({
  halfExtents,
  color,
}: {
  halfExtents: [number, number, number];
  color: string;
}) {
  return (
    <>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[halfExtents[0] * 2, halfExtents[1] * 2, halfExtents[2] * 2]} />
        <meshStandardMaterial color={color} roughness={0.62} metalness={0.04} />
      </mesh>
      <mesh position={[0, halfExtents[1] * 0.65, 0]} castShadow>
        <boxGeometry args={[halfExtents[0] * 1.35, halfExtents[1] * 0.7, halfExtents[2] * 1.1]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
      </mesh>
    </>
  );
}

function TrafficVehicleEntity({
  seed,
  lane,
  z,
  profileId,
  vehicleId,
  respawnCount,
  playerCarsFbx,
}: {
  seed: number;
  lane: number;
  z: number;
  profileId: string;
  vehicleId: string;
  respawnCount: number;
  playerCarsFbx: Group;
}) {
  const profile = getTrafficProfile(profileId);
  const road = getRoadMetricsAtDistance(z, seed);

  const modelPreset = useMemo(() => {
    const vehicleIndex = Number(vehicleId.replace("traffic-", "")) || 0;
    const roll = hash01(vehicleIndex * 0.53 + respawnCount * 1.17, seed * 0.71);
    const presetIndex = Math.min(
      PLAYER_CAR_PRESETS.length - 1,
      Math.floor(roll * PLAYER_CAR_PRESETS.length),
    );

    return PLAYER_CAR_PRESETS[presetIndex];
  }, [vehicleId, respawnCount, seed]);

  const model = useMemo(
    () =>
      buildModelFromFbx(playerCarsFbx, modelPreset, {
        tintHex: profile.color,
        targetLength: profile.collider.halfExtents[2] * 2,
        name: `${vehicleId}-${respawnCount}-traffic-model`,
      }),
    [playerCarsFbx, modelPreset, profile.color, profile.collider.halfExtents, respawnCount, vehicleId],
  );

  useEffect(() => {
    return () => {
      if (!model) {
        return;
      }
      disposeObjectMaterials(model);
    };
  }, [model]);

  const x = road.centerX + trafficLaneOffset(lane);
  const y = road.centerY + profile.collider.halfExtents[1] + 0.35;

  return (
    <RigidBody
      type="kinematicPosition"
      position={[x, y, z]}
      rotation={[0, road.heading, 0]}
      colliders={false}
    >
      <CuboidCollider args={profile.collider.halfExtents} />
      {model ? (
        <primitive object={model} />
      ) : (
        <FallbackTrafficBody halfExtents={profile.collider.halfExtents} color={profile.color} />
      )}
    </RigidBody>
  );
}

export function TrafficSystem() {
  const seed = useRaceStore((state) => state.seed);
  const traffic = useRaceStore((state) => state.traffic);
  const playerCarsFbx = useFBX("/models/cars.fbx");

  return (
    <group>
      {traffic.map((vehicle) => (
        <TrafficVehicleEntity
          key={vehicle.id}
          seed={seed}
          lane={vehicle.lane}
          z={vehicle.z}
          profileId={vehicle.profileId}
          vehicleId={vehicle.id}
          respawnCount={vehicle.respawnCount}
          playerCarsFbx={playerCarsFbx}
        />
      ))}
    </group>
  );
}
