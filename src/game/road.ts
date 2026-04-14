import { ROAD_SETTINGS } from "./config";
import { clamp, lerp, lerpAngle } from "./math";
import { RoadSegmentSpec } from "./types";
import { getRoadBiomeAtSegment } from "./biome";

export interface RoadMetrics {
  centerX: number;
  centerY: number;
  heading: number;
  slope: number;
  segmentIndex: number;
}

function roadCurve(t: number, seed: number): number {
  return (
    Math.sin(t * 0.142 + seed * 0.19) * 0.78 +
    Math.sin(t * 0.061 + seed * 0.73) * 0.42 +
    Math.sin((t + Math.sin(t * 0.024 + seed * 0.37) * 9) * 0.034 + seed * 1.91) * 0.28
  );
}

function roadElevation(t: number, seed: number): number {
  return (
    Math.sin(t * 0.026 + seed * 0.41) * 0.72 +
    Math.sin(t * 0.011 + seed * 1.13) * 0.34 +
    Math.sin(t * 0.057 + seed * 0.23) * 0.18
  );
}

export function getRoadPointAtSegment(index: number, seed = ROAD_SETTINGS.seed) {
  const i = Math.max(0, index);
  const z = i * ROAD_SETTINGS.segmentLength;
  const x = roadCurve(i, seed) * ROAD_SETTINGS.maxCurve;
  const y = roadElevation(i, seed) * ROAD_SETTINGS.maxHill;

  const prevX = roadCurve(i - 1, seed) * ROAD_SETTINGS.maxCurve;
  const nextX = roadCurve(i + 1, seed) * ROAD_SETTINGS.maxCurve;
  const prevY = roadElevation(i - 1, seed) * ROAD_SETTINGS.maxHill;
  const nextY = roadElevation(i + 1, seed) * ROAD_SETTINGS.maxHill;

  const heading = Math.atan2(nextX - prevX, ROAD_SETTINGS.segmentLength * 2);
  const slope = (nextY - prevY) / (ROAD_SETTINGS.segmentLength * 2);

  return { x, y, z, heading, slope };
}

export function buildRoadSegment(
  index: number,
  seed = ROAD_SETTINGS.seed,
  biomeZoneOffset = 0,
): RoadSegmentSpec {
  const start = getRoadPointAtSegment(index, seed);
  const end = getRoadPointAtSegment(index + 1, seed);

  return {
    index,
    start: { x: start.x, y: start.y, z: start.z },
    end: { x: end.x, y: end.y, z: end.z },
    width: ROAD_SETTINGS.width,
    elevation: (start.y + end.y) * 0.5,
    biome: getRoadBiomeAtSegment(index, seed, biomeZoneOffset),
    checkpoint: index > 0 && index % ROAD_SETTINGS.checkpointEverySegments === 0,
    laneCount: ROAD_SETTINGS.laneCount,
  };
}

export function buildRoadWindow(
  startIndex: number,
  windowSize = ROAD_SETTINGS.windowSegments,
  seed = ROAD_SETTINGS.seed,
  biomeZoneOffset = 0,
): RoadSegmentSpec[] {
  const from = Math.max(0, startIndex);
  return Array.from({ length: windowSize }, (_, offset) => buildRoadSegment(from + offset, seed, biomeZoneOffset));
}

export function getRoadMetricsAtDistance(distance: number, seed = ROAD_SETTINGS.seed): RoadMetrics {
  const safeDistance = Math.max(0, distance);
  const segmentIndex = Math.floor(safeDistance / ROAD_SETTINGS.segmentLength);
  const segmentStart = segmentIndex * ROAD_SETTINGS.segmentLength;
  const alpha = clamp((safeDistance - segmentStart) / ROAD_SETTINGS.segmentLength, 0, 1);

  const a = getRoadPointAtSegment(segmentIndex, seed);
  const b = getRoadPointAtSegment(segmentIndex + 1, seed);

  return {
    centerX: lerp(a.x, b.x, alpha),
    centerY: lerp(a.y, b.y, alpha),
    heading: lerpAngle(a.heading, b.heading, alpha),
    slope: lerp(a.slope, b.slope, alpha),
    segmentIndex,
  };
}

export function getLaneOffset(lane: number, laneCount = ROAD_SETTINGS.laneCount): number {
  const normalized = ((lane + 0.5) / laneCount) * 2 - 1;
  const usableWidth = ROAD_SETTINGS.width - ROAD_SETTINGS.shoulder * 2;
  return normalized * 0.5 * usableWidth;
}

export function getSegmentIndexFromDistance(distance: number): number {
  return Math.floor(Math.max(0, distance) / ROAD_SETTINGS.segmentLength);
}

export function isOffRoad(x: number, centerX: number): boolean {
  const halfRoad = ROAD_SETTINGS.width * 0.5;
  return Math.abs(x - centerX) > halfRoad - ROAD_SETTINGS.shoulder;
}
