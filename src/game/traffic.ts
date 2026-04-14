import { ROAD_SETTINGS, TRAFFIC_PROFILES, TRAFFIC_SETTINGS } from "./config";
import { clamp, hash01, lerp } from "./math";
import { getLaneOffset } from "./road";
import { TrafficProfile, TrafficVehicle } from "./types";

function weightedProfile(index: number, seed: number): TrafficProfile {
  const sum = TRAFFIC_PROFILES.reduce((acc, profile) => acc + profile.spawnWeight, 0);
  const roll = hash01(index * 1.37, seed * 0.89) * sum;
  let cursor = 0;

  for (const profile of TRAFFIC_PROFILES) {
    cursor += profile.spawnWeight;
    if (roll <= cursor) {
      return profile;
    }
  }

  return TRAFFIC_PROFILES[0];
}

function laneForIndex(index: number, seed: number): number {
  return Math.floor(hash01(index * 2.13, seed * 0.61) * ROAD_SETTINGS.laneCount);
}

function speedForProfile(profile: TrafficProfile, index: number, seed: number): number {
  const n = hash01(index * 0.43, seed * 1.31);
  return lerp(profile.targetSpeedRange[0], profile.targetSpeedRange[1], n);
}

function respawnVehicle(vehicle: TrafficVehicle, playerDistance: number, seed: number): TrafficVehicle {
  const tag = Number(vehicle.id.replace("traffic-", "")) + vehicle.respawnCount * 97;
  const ahead = lerp(
    TRAFFIC_SETTINGS.spawnAheadMin,
    TRAFFIC_SETTINGS.spawnAheadMax,
    hash01(tag * 0.73, seed * 0.19),
  );
  const profile = weightedProfile(tag + 13, seed);

  return {
    ...vehicle,
    lane: laneForIndex(tag + 71, seed),
    profileId: profile.id,
    speed: speedForProfile(profile, tag + 29, seed) +
      (hash01(tag * 0.31, seed) - 0.5) * TRAFFIC_SETTINGS.speedVariance,
    z: playerDistance + ahead,
    respawnCount: vehicle.respawnCount + 1,
  };
}

export function createInitialTraffic(seed: number): TrafficVehicle[] {
  return Array.from({ length: TRAFFIC_SETTINGS.count }, (_, i) => {
    const profile = weightedProfile(i, seed);
    const ahead = lerp(
      TRAFFIC_SETTINGS.initialSpawnDistance,
      TRAFFIC_SETTINGS.spawnAheadMax,
      hash01(i * 0.37, seed * 0.77),
    );

    return {
      id: `traffic-${i}`,
      profileId: profile.id,
      lane: laneForIndex(i, seed),
      speed: speedForProfile(profile, i, seed),
      z: ahead,
      respawnCount: 0,
    };
  });
}

export function advanceTraffic(
  vehicles: TrafficVehicle[],
  dt: number,
  playerDistance: number,
  seed: number,
): TrafficVehicle[] {
  const moved = vehicles.map((vehicle) => ({
    ...vehicle,
    speed: clamp(vehicle.speed, 12, 44),
    z: vehicle.z + clamp(vehicle.speed, 12, 44) * dt,
  }));

  for (let lane = 0; lane < ROAD_SETTINGS.laneCount; lane += 1) {
    const laneCars = moved
      .filter((vehicle) => vehicle.lane === lane)
      .sort((a, b) => b.z - a.z);

    for (let i = 1; i < laneCars.length; i += 1) {
      const front = laneCars[i - 1];
      const back = laneCars[i];
      const gap = front.z - back.z;

      if (gap < TRAFFIC_SETTINGS.minGapByLane) {
        back.speed = clamp(front.speed - 2, 12, 40);
      }
    }
  }

  return moved.map((vehicle) => {
    if (vehicle.z < playerDistance - TRAFFIC_SETTINGS.despawnBehind) {
      return respawnVehicle(vehicle, playerDistance, seed);
    }

    return vehicle;
  });
}

export function trafficLaneOffset(lane: number): number {
  return getLaneOffset(lane, ROAD_SETTINGS.laneCount);
}

export function getTrafficProfile(profileId: string): TrafficProfile {
  return TRAFFIC_PROFILES.find((profile) => profile.id === profileId) ?? TRAFFIC_PROFILES[0];
}
