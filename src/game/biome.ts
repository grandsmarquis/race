import { ROAD_SETTINGS } from "./config";
import { clamp, hash01, lerp, smoothstep } from "./math";
import { RoadBiome } from "./types";

export const BIOME_CYCLE: RoadBiome[] = ["seaside", "desert", "alps"];

export const BIOME_ATMOSPHERE: Record<
  RoadBiome,
  {
    label: string;
    skyColor: string;
    fogNear: number;
    fogFar: number;
    shoulderColor: string;
    blockerColor: string;
  }
> = {
  seaside: {
    label: "Seaside",
    skyColor: "#9fd8ff",
    fogNear: 72,
    fogFar: 470,
    shoulderColor: "#d7c99d",
    blockerColor: "#7b94a6",
  },
  desert: {
    label: "Desert",
    skyColor: "#f4c58b",
    fogNear: 70,
    fogFar: 440,
    shoulderColor: "#c8a572",
    blockerColor: "#a77852",
  },
  alps: {
    label: "Alps",
    skyColor: "#bed7f4",
    fogNear: 68,
    fogFar: 420,
    shoulderColor: "#8ca184",
    blockerColor: "#7f8b97",
  },
};

const HEX_COLOR_CACHE = new Map<string, [number, number, number]>();

export function getBiomeSpanSegments(): number {
  return ROAD_SETTINGS.checkpointEverySegments * Math.max(1, ROAD_SETTINGS.biomeZoneCheckpointSpan);
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace(/^#/, "").toLowerCase();
  const cached = HEX_COLOR_CACHE.get(normalized);
  if (cached) {
    return cached;
  }

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : normalized;

  if (!/^[0-9a-f]{6}$/.test(expanded)) {
    return [0, 0, 0];
  }

  const rgb: [number, number, number] = [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
  HEX_COLOR_CACHE.set(normalized, rgb);
  return rgb;
}

function rgbChannelToHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function blendHexColor(fromHex: string, toHex: string, blend: number): string {
  const t = clamp(blend, 0, 1);
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);

  return `#${rgbChannelToHex(lerp(from[0], to[0], t))}${rgbChannelToHex(
    lerp(from[1], to[1], t),
  )}${rgbChannelToHex(lerp(from[2], to[2], t))}`;
}

function getBiomeOrderForBatch(batchIndex: number, seed: number): RoadBiome[] {
  const order = [...BIOME_CYCLE];

  // Deterministic Fisher-Yates shuffle so each batch gets a random biome order per seed.
  for (let i = 0; i < order.length - 1; i += 1) {
    const swapRange = order.length - i;
    const n = hash01(seed * 0.73 + batchIndex * 1.91, i * 0.67 + 17.3);
    const j = i + Math.floor(n * swapRange);

    const next = order[i];
    order[i] = order[j];
    order[j] = next;
  }

  return order;
}

export function getRoadBiomeAtSegment(index: number, seed = ROAD_SETTINGS.seed, zoneOffset = 0): RoadBiome {
  const segmentIndex = Math.max(0, index);
  const rawZoneIndex = Math.floor(segmentIndex / getBiomeSpanSegments()) + zoneOffset;
  const zoneIndex = Math.max(0, rawZoneIndex);
  const batchIndex = Math.floor(zoneIndex / BIOME_CYCLE.length);
  const zoneSlot = zoneIndex % BIOME_CYCLE.length;
  const order = getBiomeOrderForBatch(batchIndex, seed);
  return order[zoneSlot];
}

export interface BlendedRoadAtmosphere {
  biome: RoadBiome;
  nextBiome: RoadBiome;
  blend: number;
  skyColor: string;
  fogNear: number;
  fogFar: number;
  shoulderColor: string;
  blockerColor: string;
}

export function getBlendedRoadAtmosphere(
  distance: number,
  seed = ROAD_SETTINGS.seed,
  zoneOffset = 0,
): BlendedRoadAtmosphere {
  const span = getBiomeSpanSegments();
  const segmentProgress = Math.max(0, distance) / ROAD_SETTINGS.segmentLength;
  const zoneIndex = Math.floor(segmentProgress / span);
  const zoneStartSegment = zoneIndex * span;
  const localSegment = segmentProgress - zoneStartSegment;

  const transitionSegments = Math.max(1, Math.min(span - 1, ROAD_SETTINGS.checkpointEverySegments));
  const transitionStartSegment = span - transitionSegments;
  const rawBlend = clamp((localSegment - transitionStartSegment) / transitionSegments, 0, 1);

  const biome = getRoadBiomeAtSegment(zoneStartSegment, seed, zoneOffset);
  const nextBiome = getRoadBiomeAtSegment(zoneStartSegment + span, seed, zoneOffset);
  const blend = biome === nextBiome ? 0 : smoothstep(0, 1, rawBlend);

  const currentAtmosphere = BIOME_ATMOSPHERE[biome];
  const nextAtmosphere = BIOME_ATMOSPHERE[nextBiome];

  return {
    biome,
    nextBiome,
    blend,
    skyColor: blendHexColor(currentAtmosphere.skyColor, nextAtmosphere.skyColor, blend),
    fogNear: lerp(currentAtmosphere.fogNear, nextAtmosphere.fogNear, blend),
    fogFar: lerp(currentAtmosphere.fogFar, nextAtmosphere.fogFar, blend),
    shoulderColor: blendHexColor(currentAtmosphere.shoulderColor, nextAtmosphere.shoulderColor, blend),
    blockerColor: blendHexColor(currentAtmosphere.blockerColor, nextAtmosphere.blockerColor, blend),
  };
}

export function getBiomeVisibilityInTransition(biome: RoadBiome, transition: BlendedRoadAtmosphere): number {
  if (transition.biome === biome && transition.nextBiome === biome) {
    return 1;
  }
  if (transition.biome === biome) {
    return 1 - transition.blend;
  }
  if (transition.nextBiome === biome) {
    return transition.blend;
  }
  return 0;
}
