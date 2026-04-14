export interface PlayerCarPreset {
  id: string;
  label: string;
  description: string;
  modelRootName: string;
  bodyColor: string;
  cabinColor: string;
  bumperColor: string;
  bodySize: [number, number, number];
  cabinSize: [number, number, number];
  cabinOffset: [number, number, number];
  bumperSize: [number, number, number];
  bumperOffset: [number, number, number];
  colliderHalfExtents: [number, number, number];
  mass: number;
}

export const PLAYER_CAR_PRESETS: PlayerCarPreset[] = [
  {
    id: "sunset",
    label: "Sunset GT",
    description: "Balanced coupe with stable corner feel.",
    modelRootName: "car_a03_001",
    bodyColor: "#d1495b",
    cabinColor: "#f4f1de",
    bumperColor: "#1f2421",
    bodySize: [1.9, 0.55, 3.7],
    cabinSize: [1.35, 0.42, 1.9],
    cabinOffset: [0, 0.88, 0.05],
    bumperSize: [1.7, 0.2, 0.3],
    bumperOffset: [0, 0.2, -1.55],
    colliderHalfExtents: [0.95, 0.45, 1.8],
    mass: 920,
  },
  {
    id: "azure",
    label: "Azure Sprint",
    description: "Narrow body and clean visibility.",
    modelRootName: "car_a01_002",
    bodyColor: "#2f6ea9",
    cabinColor: "#dfe6ec",
    bumperColor: "#13161b",
    bodySize: [1.78, 0.5, 3.45],
    cabinSize: [1.22, 0.38, 1.7],
    cabinOffset: [0, 0.84, -0.02],
    bumperSize: [1.58, 0.18, 0.26],
    bumperOffset: [0, 0.2, -1.47],
    colliderHalfExtents: [0.89, 0.43, 1.68],
    mass: 880,
  },
  {
    id: "atlas",
    label: "Atlas Hauler",
    description: "Boxy heavyweight silhouette.",
    modelRootName: "truck_a02_001",
    bodyColor: "#5b6c7d",
    cabinColor: "#d4c29a",
    bumperColor: "#1f2937",
    bodySize: [2.05, 0.62, 4.1],
    cabinSize: [1.45, 0.48, 2.05],
    cabinOffset: [0, 0.93, 0.1],
    bumperSize: [1.86, 0.24, 0.34],
    bumperOffset: [0, 0.21, -1.72],
    colliderHalfExtents: [1.02, 0.48, 1.96],
    mass: 1000,
  },
];

export const DEFAULT_PLAYER_CAR_ID = PLAYER_CAR_PRESETS[0].id;

const PLAYER_CAR_PRESET_MAP = new Map(PLAYER_CAR_PRESETS.map((preset) => [preset.id, preset]));

export function getPlayerCarPreset(id: string): PlayerCarPreset {
  return PLAYER_CAR_PRESET_MAP.get(id) ?? PLAYER_CAR_PRESETS[0];
}
