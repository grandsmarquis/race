"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";

import { CAMERA_SETTINGS, CAR_HANDLING } from "@/game/config";
import { clamp, damp, lerp } from "@/game/math";
import { getRoadMetricsAtDistance } from "@/game/road";
import { useRaceStore } from "@/game/store/useRaceStore";

function shortestAngleDelta(from: number, to: number): number {
  return ((((to - from) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

export function ChaseCamera() {
  const targetPosition = useMemo(() => new Vector3(), []);
  const lookAtPosition = useMemo(() => new Vector3(), []);
  const driftYawRef = useRef(0);

  useFrame((state, dt) => {
    const camera = state.camera as PerspectiveCamera;
    const { car, seed } = useRaceStore.getState();

    const speedRatio = Math.min(1, car.speedMps / CAR_HANDLING.maxSpeed);
    const distance = CAMERA_SETTINGS.baseDistance + speedRatio * 2.2;
    const height = CAMERA_SETTINGS.baseHeight + speedRatio * 0.6;
    const roadNow = getRoadMetricsAtDistance(car.position.z, seed);
    const roadAhead = getRoadMetricsAtDistance(car.position.z + CAMERA_SETTINGS.turnLookAhead, seed);
    const upcomingTurn = shortestAngleDelta(roadNow.heading, roadAhead.heading);
    const targetDrift = clamp(
      upcomingTurn * CAMERA_SETTINGS.turnDriftStrength,
      -CAMERA_SETTINGS.turnDriftMax,
      CAMERA_SETTINGS.turnDriftMax,
    );
    driftYawRef.current = damp(
      driftYawRef.current,
      targetDrift,
      CAMERA_SETTINGS.turnDriftDamping,
      dt,
    );

    const chaseHeading = car.heading - driftYawRef.current;
    const lookHeading = car.heading + driftYawRef.current * 0.35;

    targetPosition.set(
      car.position.x - Math.sin(chaseHeading) * distance,
      car.position.y + height,
      car.position.z - Math.cos(chaseHeading) * distance,
    );

    lookAtPosition.set(
      car.position.x + Math.sin(lookHeading) * CAMERA_SETTINGS.lookAhead,
      car.position.y + 1.25,
      car.position.z + Math.cos(lookHeading) * CAMERA_SETTINGS.lookAhead,
    );

    const lerpFactor = 1 - Math.exp(-CAMERA_SETTINGS.damping * dt);
    camera.position.lerp(targetPosition, lerpFactor);
    camera.lookAt(lookAtPosition);

    const targetFov = CAMERA_SETTINGS.baseFov + speedRatio * CAMERA_SETTINGS.speedFovBoost;
    camera.fov = damp(camera.fov, targetFov, 8, dt);
    camera.fov = lerp(camera.fov, targetFov, 0.15);
    camera.updateProjectionMatrix();
  });

  return null;
}
