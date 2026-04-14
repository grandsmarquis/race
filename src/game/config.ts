import { CarHandlingConfig, TrafficProfile } from "./types";

export const PHYSICS_STEP = 1 / 60;

export const ROAD_SETTINGS = {
  seed: 2603,
  segmentLength: 16,
  width: 14,
  laneCount: 3,
  maxCurve: 24,
  maxHill: 3.4,
  shoulder: 1.2,
  windowSegments: 200,
  segmentsBehind: 48,
  checkpointEverySegments: 24,
  biomeZoneCheckpointSpan: 3,
};

export const GAMEPLAY_SETTINGS = {
  startTime: 45,
  maxTime: 78,
  checkpointTimeBonus: 12,
  checkpointScoreBonus: 300,
  distanceScoreFactor: 1.15,
  speedScoreFactor: 0.2,
};

export const CAR_HANDLING: CarHandlingConfig = {
  acceleration: 26,
  brakeForce: 34,
  drag: 0.012,
  maxSpeed: 68,
  reverseMaxSpeed: 16,
  offRoadSpeedMultiplier: 0.58,
  minSteer: 0.14,
  maxSteer: 0.92,
  steerSpeedFalloff: 0.72,
  steerInputCurve: 1.3,
  steerInputSmoothing: 9,
  highSpeedSteerInputSmoothing: 4.2,
  steerResponse: 4.2,
  yawRateSmoothing: 9.5,
  lateralSlip: 7.4,
  lateralDamping: 5.6,
  gripRecovery: 10,
  handbrakeSlipMultiplier: 1.8,
  offRoadGripMultiplier: 0.55,
};

export const TRAFFIC_SETTINGS = {
  count: 14,
  initialSpawnDistance: 130,
  spawnAheadMin: 180,
  spawnAheadMax: 420,
  despawnBehind: 70,
  minGapByLane: 24,
  speedVariance: 2.5,
};

export const TRAFFIC_PROFILES: TrafficProfile[] = [
  {
    id: "compact",
    targetSpeedRange: [20, 32],
    spawnWeight: 0.55,
    collider: { halfExtents: [0.8, 0.45, 1.45] },
    color: "#f4d35e",
  },
  {
    id: "sedan",
    targetSpeedRange: [24, 36],
    spawnWeight: 0.3,
    collider: { halfExtents: [0.85, 0.5, 1.65] },
    color: "#ee6c4d",
  },
  {
    id: "truck",
    targetSpeedRange: [18, 26],
    spawnWeight: 0.15,
    collider: { halfExtents: [0.95, 0.6, 2.1] },
    color: "#5e6472",
  },
];

export const CAMERA_SETTINGS = {
  baseDistance: 8.8,
  baseHeight: 3.2,
  lookAhead: 10,
  damping: 7,
  baseFov: 54,
  speedFovBoost: 14,
  turnLookAhead: 30,
  turnDriftStrength: 2.1,
  turnDriftMax: 0.3,
  turnDriftDamping: 2.4,
};

export const VISUAL_SETTINGS = {
  skyColor: "#9ad1f7",
  fogNear: 65,
  fogFar: 450,
  groundColor: "#d7e3b5",
  asphaltColor: "#363a3f",
  laneColor: "#f4f3ee",
};

export const SAVE_KEY = "racing3.save.v1";
