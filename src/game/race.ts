import { GAMEPLAY_SETTINGS, ROAD_SETTINGS } from "./config";
import { clamp } from "./math";
import { RaceState, RaceStatus } from "./types";

export function createInitialRaceState(status: RaceStatus = "menu"): RaceState {
  return {
    remainingTime: GAMEPLAY_SETTINGS.startTime,
    score: 0,
    distance: 0,
    speedKph: 0,
    status,
    nextCheckpointSegment: ROAD_SETTINGS.checkpointEverySegments,
    checkpointHits: 0,
    lastDistanceSample: 0,
  };
}

export function startRace(distanceSample = 0): RaceState {
  return {
    ...createInitialRaceState("running"),
    lastDistanceSample: Math.max(0, distanceSample),
  };
}

export function pauseRace(state: RaceState): RaceState {
  if (state.status !== "running") {
    return state;
  }
  return { ...state, status: "paused" };
}

export function resumeRace(state: RaceState): RaceState {
  if (state.status !== "paused") {
    return state;
  }
  return { ...state, status: "running" };
}

interface TickParams {
  dt: number;
  speedMps: number;
  distanceSample: number;
}

export function updateRaceState(state: RaceState, params: TickParams): RaceState {
  if (state.status !== "running") {
    return state;
  }

  const speedKph = Math.max(0, params.speedMps * 3.6);
  const distanceSample = Math.max(0, params.distanceSample);
  const distanceDelta = Math.max(0, distanceSample - state.lastDistanceSample);
  const timeAfterDrain = Math.max(0, state.remainingTime - params.dt);

  const scoreDelta =
    distanceDelta * GAMEPLAY_SETTINGS.distanceScoreFactor +
    speedKph * params.dt * GAMEPLAY_SETTINGS.speedScoreFactor;

  return {
    ...state,
    remainingTime: timeAfterDrain,
    score: state.score + scoreDelta,
    distance: state.distance + distanceDelta,
    speedKph,
    lastDistanceSample: distanceSample,
    status: timeAfterDrain <= 0 ? "gameover" : "running",
  };
}

export function applyCheckpointReward(state: RaceState, segmentIndex: number): RaceState {
  if (state.status !== "running") {
    return state;
  }

  let next = { ...state };

  while (segmentIndex >= next.nextCheckpointSegment) {
    next = {
      ...next,
      remainingTime: clamp(
        next.remainingTime + GAMEPLAY_SETTINGS.checkpointTimeBonus,
        0,
        GAMEPLAY_SETTINGS.maxTime,
      ),
      score: next.score + GAMEPLAY_SETTINGS.checkpointScoreBonus,
      checkpointHits: next.checkpointHits + 1,
      nextCheckpointSegment: next.nextCheckpointSegment + ROAD_SETTINGS.checkpointEverySegments,
    };
  }

  return next;
}
