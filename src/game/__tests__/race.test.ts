import { GAMEPLAY_SETTINGS, ROAD_SETTINGS } from "@/game/config";
import { applyCheckpointReward, createInitialRaceState, startRace, updateRaceState } from "@/game/race";

describe("race state loop", () => {
  it("starts in running state with reset counters", () => {
    const race = startRace(12);

    expect(race.status).toBe("running");
    expect(race.score).toBe(0);
    expect(race.distance).toBe(0);
    expect(race.lastDistanceSample).toBe(12);
  });

  it("adds checkpoint time and advances next checkpoint", () => {
    const running = startRace(0);
    const rewarded = applyCheckpointReward(running, ROAD_SETTINGS.checkpointEverySegments);

    expect(rewarded.checkpointHits).toBe(1);
    expect(rewarded.remainingTime).toBeGreaterThan(running.remainingTime);
    expect(rewarded.remainingTime).toBeLessThanOrEqual(GAMEPLAY_SETTINGS.maxTime);
    expect(rewarded.nextCheckpointSegment).toBe(ROAD_SETTINGS.checkpointEverySegments * 2);
  });

  it("transitions to gameover on timeout", () => {
    const running = {
      ...createInitialRaceState("running"),
      remainingTime: 0.1,
    };

    const next = updateRaceState(running, {
      dt: 0.2,
      speedMps: 10,
      distanceSample: 2,
    });

    expect(next.status).toBe("gameover");
    expect(next.remainingTime).toBe(0);
  });

  it("increments score and distance while running", () => {
    const running = {
      ...startRace(2),
      lastDistanceSample: 2,
    };

    const next = updateRaceState(running, {
      dt: 1,
      speedMps: 20,
      distanceSample: 30,
    });

    expect(next.status).toBe("running");
    expect(next.distance).toBeGreaterThan(0);
    expect(next.score).toBeGreaterThan(0);
  });
});
