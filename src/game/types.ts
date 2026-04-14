export type RaceStatus = "menu" | "running" | "paused" | "gameover";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CarHandlingConfig {
  acceleration: number;
  brakeForce: number;
  drag: number;
  maxSpeed: number;
  reverseMaxSpeed: number;
  offRoadSpeedMultiplier: number;
  minSteer: number;
  maxSteer: number;
  steerSpeedFalloff: number;
  steerInputCurve: number;
  steerInputSmoothing: number;
  highSpeedSteerInputSmoothing: number;
  steerResponse: number;
  yawRateSmoothing: number;
  lateralSlip: number;
  lateralDamping: number;
  gripRecovery: number;
  handbrakeSlipMultiplier: number;
  offRoadGripMultiplier: number;
}

export interface InputState {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: number;
}

export type RoadBiome = "seaside" | "desert" | "alps";
export type WeatherType = "sunny" | "sunset" | "rain" | "night";

export interface RoadSegmentSpec {
  index: number;
  start: Vec3;
  end: Vec3;
  width: number;
  elevation: number;
  biome: RoadBiome;
  checkpoint: boolean;
  laneCount: number;
}

export interface TrafficProfile {
  id: string;
  targetSpeedRange: [number, number];
  spawnWeight: number;
  collider: {
    halfExtents: [number, number, number];
  };
  color: string;
}

export interface TrafficVehicle {
  id: string;
  profileId: string;
  lane: number;
  speed: number;
  z: number;
  respawnCount: number;
}

export interface CarTelemetry {
  position: Vec3;
  heading: number;
  speedMps: number;
  rpmNormalized: number;
  segmentIndex: number;
  offRoad: boolean;
  recoveryTimer: number;
}

export interface RaceState {
  remainingTime: number;
  score: number;
  distance: number;
  speedKph: number;
  status: RaceStatus;
  nextCheckpointSegment: number;
  checkpointHits: number;
  lastDistanceSample: number;
}

export interface SaveDataV1 {
  schemaVersion: 1;
  bestScore: number;
  bestDistance: number;
  updatedAt: string;
}
