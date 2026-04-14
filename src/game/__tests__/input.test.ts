import { inputFromKeyMap, mergeInputSources, normalizeInputState } from "@/game/input";

describe("input mapping", () => {
  it("normalizes analog values into expected ranges", () => {
    const normalized = normalizeInputState({
      throttle: 2,
      brake: -1,
      steer: 3,
      handbrake: 0.4,
    });

    expect(normalized).toEqual({
      throttle: 1,
      brake: 0,
      steer: 1,
      handbrake: 0.4,
    });
  });

  it("maps keyboard state into equivalent normalized control values", () => {
    const keyboard = inputFromKeyMap({
      KeyW: true,
      ArrowLeft: true,
      ShiftLeft: true,
    });

    expect(keyboard).toEqual({
      throttle: 1,
      brake: 0,
      steer: 1,
      handbrake: 1,
    });
  });

  it("merges keyboard and touch into a single InputState", () => {
    const merged = mergeInputSources(
      {
        throttle: 1,
        brake: 0,
        steer: -0.35,
        handbrake: 0,
      },
      {
        throttle: 0,
        brake: 1,
        steer: 0.75,
        handbrake: 1,
      },
    );

    expect(merged).toEqual({
      throttle: 1,
      brake: 1,
      steer: 0.4,
      handbrake: 1,
    });
  });
});
