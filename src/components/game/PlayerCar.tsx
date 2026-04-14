"use client";

import { useFBX } from "@react-three/drei";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Quaternion, Vector3 } from "three";

import { buildModelFromFbx, disposeObjectMaterials } from "@/components/game/carModel";
import { CAR_HANDLING, PHYSICS_STEP } from "@/game/config";
import { NEUTRAL_INPUT } from "@/game/input";
import { PlayerCarPreset, getPlayerCarPreset } from "@/game/playerCars";
import { getRoadMetricsAtDistance, isOffRoad } from "@/game/road";
import { useRaceStore } from "@/game/store/useRaceStore";
import { stepVehicleDynamics } from "@/game/vehicle";

const UP_AXIS = new Vector3(0, 1, 0);

function FallbackCarBody({ selectedCar }: { selectedCar: PlayerCarPreset }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]}>
        <boxGeometry args={selectedCar.bodySize} />
        <meshStandardMaterial color={selectedCar.bodyColor} roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh castShadow receiveShadow position={selectedCar.cabinOffset}>
        <boxGeometry args={selectedCar.cabinSize} />
        <meshStandardMaterial color={selectedCar.cabinColor} roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh castShadow receiveShadow position={selectedCar.bumperOffset}>
        <boxGeometry args={selectedCar.bumperSize} />
        <meshStandardMaterial color={selectedCar.bumperColor} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function PlayerCar() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const accumulatorRef = useRef(0);
  const collisionCooldownRef = useRef(0);
  const steerInputRef = useRef(0);
  const yawRateRef = useRef(0);
  const selectedPlayerCarId = useRaceStore((state) => state.selectedPlayerCarId);
  const selectedCar = useMemo(
    () => getPlayerCarPreset(selectedPlayerCarId),
    [selectedPlayerCarId],
  );
  const playerCarsFbx = useFBX("/models/cars.fbx");
  const selectedModel = useMemo(
    () =>
      buildModelFromFbx(playerCarsFbx, selectedCar, {
        name: `${selectedCar.id}-player-model`,
      }),
    [playerCarsFbx, selectedCar],
  );

  const headingQuat = useMemo(() => new Quaternion(), []);
  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);

  useEffect(() => {
    return () => {
      if (!selectedModel) {
        return;
      }
      disposeObjectMaterials(selectedModel);
    };
  }, [selectedModel]);

  useFrame((_, dt) => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }

    collisionCooldownRef.current = Math.max(0, collisionCooldownRef.current - dt);
    accumulatorRef.current += Math.min(dt, 0.1);

    while (accumulatorRef.current >= PHYSICS_STEP) {
      accumulatorRef.current -= PHYSICS_STEP;

      const state = useRaceStore.getState();
      const translation = body.translation();
      const linvel = body.linvel();

      const road = getRoadMetricsAtDistance(translation.z, state.seed);
      const alignedHeading = road.heading;
      const isOff = isOffRoad(translation.x, road.centerX);

      forward.set(Math.sin(alignedHeading), 0, Math.cos(alignedHeading));
      right.set(forward.z, 0, -forward.x);

      const forwardSpeed = linvel.x * forward.x + linvel.z * forward.z;
      const lateralSpeed = linvel.x * right.x + linvel.z * right.z;

      const running = state.race.status === "running";
      const controlInput = running ? state.input : NEUTRAL_INPUT;
      const recoveryPenalty = state.car.recoveryTimer > 0 ? 0.55 : 1;

      const next = stepVehicleDynamics(
        {
          forwardSpeed,
          lateralSpeed,
          heading: alignedHeading,
          steerInput: steerInputRef.current,
          yawRate: yawRateRef.current,
        },
        {
          throttle: controlInput.throttle * recoveryPenalty,
          brake: Math.max(controlInput.brake, state.car.recoveryTimer > 0 ? 0.35 : 0),
          steer: controlInput.steer,
          handbrake: controlInput.handbrake,
        },
        PHYSICS_STEP,
        isOff,
      );
      steerInputRef.current = next.steerInput ?? 0;
      yawRateRef.current = next.yawRate ?? 0;

      const vx = forward.x * next.forwardSpeed + right.x * next.lateralSpeed;
      const vz = forward.z * next.forwardSpeed + right.z * next.lateralSpeed;
      const y = road.centerY + 0.95;

      body.setTranslation({ x: translation.x, y, z: translation.z }, true);
      body.setLinvel({ x: vx, y: 0, z: vz }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);

      headingQuat.setFromAxisAngle(UP_AXIS, alignedHeading);
      body.setRotation(headingQuat, true);

      state.setCarTelemetry({
        position: {
          x: translation.x,
          y,
          z: translation.z,
        },
        heading: alignedHeading,
        speedMps: Math.max(0, next.forwardSpeed),
        rpmNormalized: Math.min(1, Math.abs(next.forwardSpeed) / CAR_HANDLING.maxSpeed),
        segmentIndex: road.segmentIndex,
        offRoad: isOff,
      });
    }
  });

  return (
    <RigidBody
      key={selectedCar.id}
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      mass={selectedCar.mass}
      position={[0, 1.2, 4]}
      canSleep={false}
      enabledRotations={[false, true, false]}
      linearDamping={0.02}
      angularDamping={2.8}
      onCollisionEnter={() => {
        if (collisionCooldownRef.current > 0) {
          return;
        }

        const state = useRaceStore.getState();
        if (state.race.status !== "running") {
          return;
        }

        collisionCooldownRef.current = 0.28;
        state.registerCollision();
      }}
    >
      <CuboidCollider args={selectedCar.colliderHalfExtents} />
      {selectedModel ? (
        <primitive object={selectedModel} />
      ) : (
        <FallbackCarBody selectedCar={selectedCar} />
      )}
    </RigidBody>
  );
}

useFBX.preload("/models/cars.fbx");
