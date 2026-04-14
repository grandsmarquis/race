import { SAVE_KEY } from "./config";
import { SaveDataV1 } from "./types";

const DEFAULT_SAVE: SaveDataV1 = {
  schemaVersion: 1,
  bestScore: 0,
  bestDistance: 0,
  updatedAt: new Date(0).toISOString(),
};

export function loadSaveData(): SaveDataV1 {
  if (typeof window === "undefined") {
    return DEFAULT_SAVE;
  }

  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return DEFAULT_SAVE;
    }

    const parsed = JSON.parse(raw) as Partial<SaveDataV1>;
    if (parsed.schemaVersion !== 1) {
      return DEFAULT_SAVE;
    }

    return {
      schemaVersion: 1,
      bestScore: Number(parsed.bestScore ?? 0),
      bestDistance: Number(parsed.bestDistance ?? 0),
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return DEFAULT_SAVE;
  }
}

export function persistSaveData(data: SaveDataV1): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function getDefaultSaveData(): SaveDataV1 {
  return DEFAULT_SAVE;
}
