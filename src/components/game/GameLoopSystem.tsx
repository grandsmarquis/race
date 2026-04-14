"use client";

import { useFrame } from "@react-three/fiber";

import { PHYSICS_STEP } from "@/game/config";
import { advanceTraffic } from "@/game/traffic";
import { useRaceStore } from "@/game/store/useRaceStore";

export function GameLoopSystem() {
  useFrame((_, dt) => {
    const state = useRaceStore.getState();
    const safeDt = Math.min(dt, PHYSICS_STEP * 2);

    state.tickRace(safeDt);
    state.registerCheckpoint(state.car.segmentIndex);

    if (state.race.status !== "running") {
      return;
    }

    const nextTraffic = advanceTraffic(state.traffic, safeDt, state.car.position.z, state.seed);
    state.setTraffic(nextTraffic);
  });

  return null;
}
