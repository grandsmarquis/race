import { WeatherType } from "./types";

export interface WeatherPreset {
  label: string;
  description: string;
  skyTint: string;
  fogTint: string;
  skyBlend: number;
  fogBlend: number;
  fogNearMultiplier: number;
  fogFarMultiplier: number;
  ambientIntensity: number;
  directionalIntensity: number;
  directionalColor: string;
  sunPosition: [number, number, number];
  hasRain: boolean;
  hasNightSky: boolean;
}

export const WEATHER_OPTIONS: WeatherType[] = ["sunny", "sunset", "rain", "night"];

export const DEFAULT_WEATHER: WeatherType = "sunny";

export const WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  sunny: {
    label: "Sunny",
    description: "Crisp daylight with long visibility.",
    skyTint: "#bfe4ff",
    fogTint: "#cce9ff",
    skyBlend: 0.14,
    fogBlend: 0.1,
    fogNearMultiplier: 1.04,
    fogFarMultiplier: 1.08,
    ambientIntensity: 0.84,
    directionalIntensity: 1.4,
    directionalColor: "#fff3d6",
    sunPosition: [22, 26, -16],
    hasRain: false,
    hasNightSky: false,
  },
  sunset: {
    label: "Sunset",
    description: "Warm horizon with softer contrast.",
    skyTint: "#f68c62",
    fogTint: "#f7ad74",
    skyBlend: 0.46,
    fogBlend: 0.4,
    fogNearMultiplier: 0.95,
    fogFarMultiplier: 0.84,
    ambientIntensity: 0.66,
    directionalIntensity: 1.06,
    directionalColor: "#ffc28a",
    sunPosition: [-30, 13, -10],
    hasRain: false,
    hasNightSky: false,
  },
  rain: {
    label: "Rain",
    description: "Heavy clouds and wet-road mood.",
    skyTint: "#70879b",
    fogTint: "#6b7c8e",
    skyBlend: 0.6,
    fogBlend: 0.7,
    fogNearMultiplier: 0.78,
    fogFarMultiplier: 0.68,
    ambientIntensity: 0.56,
    directionalIntensity: 0.74,
    directionalColor: "#bfd0df",
    sunPosition: [12, 18, -22],
    hasRain: true,
    hasNightSky: false,
  },
  night: {
    label: "Night",
    description: "Dark ambience with moonlit highlights.",
    skyTint: "#101728",
    fogTint: "#101d33",
    skyBlend: 0.9,
    fogBlend: 0.94,
    fogNearMultiplier: 0.66,
    fogFarMultiplier: 0.58,
    ambientIntensity: 0.24,
    directionalIntensity: 0.32,
    directionalColor: "#8aafdf",
    sunPosition: [-14, 28, -8],
    hasRain: false,
    hasNightSky: true,
  },
};
