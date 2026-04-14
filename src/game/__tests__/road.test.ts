import {
  BIOME_CYCLE,
  getBiomeSpanSegments,
  getBiomeVisibilityInTransition,
  getBlendedRoadAtmosphere,
  getRoadBiomeAtSegment,
} from "@/game/biome";
import { ROAD_SETTINGS } from "@/game/config";
import { buildRoadSegment, buildRoadWindow, getLaneOffset } from "@/game/road";

describe("road generation", () => {
  it("maintains segment continuity", () => {
    for (let index = 0; index < 80; index += 1) {
      const current = buildRoadSegment(index, 42);
      const next = buildRoadSegment(index + 1, 42);

      expect(current.end.x).toBeCloseTo(next.start.x, 6);
      expect(current.end.y).toBeCloseTo(next.start.y, 6);
      expect(current.end.z).toBeCloseTo(next.start.z, 6);
    }
  });

  it("keeps lane offsets inside drivable bounds", () => {
    const halfRoad = ROAD_SETTINGS.width * 0.5;

    for (let lane = 0; lane < ROAD_SETTINGS.laneCount; lane += 1) {
      const offset = Math.abs(getLaneOffset(lane));
      expect(offset).toBeLessThan(halfRoad - ROAD_SETTINGS.shoulder + 0.001);
    }
  });

  it("creates deterministic windows for the same seed", () => {
    const a = buildRoadWindow(12, 20, 987);
    const b = buildRoadWindow(12, 20, 987);

    expect(a).toEqual(b);
  });

  it("places checkpoints at fixed segment intervals", () => {
    const window = buildRoadWindow(0, 140, 101);
    const checkpoints = window.filter((segment) => segment.checkpoint).map((segment) => segment.index);

    for (const index of checkpoints) {
      expect(index % ROAD_SETTINGS.checkpointEverySegments).toBe(0);
    }
  });

  it("keeps biome stable for multiple checkpoints and then rotates", () => {
    const span = getBiomeSpanSegments();
    const first = getRoadBiomeAtSegment(0, 123);
    const sameZone = getRoadBiomeAtSegment(span - 1, 123);
    const nextZone = getRoadBiomeAtSegment(span, 123);

    expect(first).toBe(sameZone);
    expect(nextZone).not.toBe(first);
  });

  it("uses a shuffled biome order across zone batches", () => {
    const span = getBiomeSpanSegments();
    const firstBatch = new Set(
      BIOME_CYCLE.map((_, index) => getRoadBiomeAtSegment(index * span, 321)),
    );
    expect(firstBatch.size).toBe(BIOME_CYCLE.length);
  });

  it("blends atmosphere in the final checkpoint before the next biome zone", () => {
    const span = getBiomeSpanSegments();
    const transitionStart = span - ROAD_SETTINGS.checkpointEverySegments;

    const beforeBlend = getBlendedRoadAtmosphere((transitionStart - 0.5) * ROAD_SETTINGS.segmentLength, 123);
    const nearBoundary = getBlendedRoadAtmosphere((span - 1) * ROAD_SETTINGS.segmentLength, 123);

    expect(beforeBlend.blend).toBe(0);
    expect(nearBoundary.blend).toBeGreaterThan(0.9);
    expect(nearBoundary.biome).not.toBe(nearBoundary.nextBiome);
  });

  it("keeps biome transition visibility normalized", () => {
    const span = getBiomeSpanSegments();
    const nearBoundary = getBlendedRoadAtmosphere((span - 1) * ROAD_SETTINGS.segmentLength, 123);

    const fromVisibility = getBiomeVisibilityInTransition(nearBoundary.biome, nearBoundary);
    const toVisibility = getBiomeVisibilityInTransition(nearBoundary.nextBiome, nearBoundary);

    expect(fromVisibility + toVisibility).toBeCloseTo(1, 5);
  });
});
