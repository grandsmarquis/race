import {
  DEFAULT_PLAYER_CAR_ID,
  PLAYER_CAR_PRESETS,
  getPlayerCarPreset,
} from "@/game/playerCars";

describe("player car presets", () => {
  it("contains unique ids", () => {
    const ids = PLAYER_CAR_PRESETS.map((preset) => preset.id);
    const unique = new Set(ids);

    expect(unique.size).toBe(ids.length);
  });

  it("resolves known ids", () => {
    const preset = getPlayerCarPreset("atlas");

    expect(preset.id).toBe("atlas");
    expect(preset.label).toBe("Atlas Hauler");
  });

  it("falls back to default for unknown ids", () => {
    const preset = getPlayerCarPreset("invalid-id");

    expect(preset.id).toBe(DEFAULT_PLAYER_CAR_ID);
  });
});
