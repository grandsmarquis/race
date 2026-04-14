"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState } from "react";

import styles from "./GameShell.module.css";

import { AudioEngine } from "./AudioEngine";
import { ChaseCamera } from "./ChaseCamera";
import { GameLoopSystem } from "./GameLoopSystem";
import { HudOverlay } from "./HudOverlay";
import { PlayerCar } from "./PlayerCar";
import { RoadScene } from "./RoadScene";
import { TouchControls } from "./TouchControls";
import { TrafficSystem } from "./TrafficSystem";
import { useKeyboardControls } from "./useKeyboardControls";

import { getBlendedRoadAtmosphere } from "@/game/biome";
import { PHYSICS_STEP } from "@/game/config";
import { useRaceStore } from "@/game/store/useRaceStore";
import { WEATHER_OPTIONS, WEATHER_PRESETS } from "@/game/weather";

const WEATHER_CHANGE_INTERVAL_MS = 30_000;
const WEATHER_TRANSITION_MS = 6_000;

function blendHexColors(baseHex: string, tintHex: string, amount: number): string {
  const clamped = Math.min(Math.max(amount, 0), 1);
  const parseHex = (hex: string) => Number.parseInt(hex.replace("#", ""), 16);
  const base = parseHex(baseHex);
  const tint = parseHex(tintHex);

  const baseR = (base >> 16) & 255;
  const baseG = (base >> 8) & 255;
  const baseB = base & 255;

  const tintR = (tint >> 16) & 255;
  const tintG = (tint >> 8) & 255;
  const tintB = tint & 255;

  const r = Math.round(baseR + (tintR - baseR) * clamped);
  const g = Math.round(baseG + (tintG - baseG) * clamped);
  const b = Math.round(baseB + (tintB - baseB) * clamped);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function blendNumber(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export default function GameShell() {
  useKeyboardControls();

  const [showTouchControls, setShowTouchControls] = useState(false);
  const seed = useRaceStore((state) => state.seed);
  const carDistance = useRaceStore((state) => state.car.position.z);
  const atmosphereTestOffset = useRaceStore((state) => state.atmosphereTestOffset);
  const selectedWeatherId = useRaceStore((state) => state.selectedWeatherId);
  const setSelectedWeather = useRaceStore((state) => state.setSelectedWeather);
  const atmosphere = getBlendedRoadAtmosphere(carDistance, seed, atmosphereTestOffset);
  const [weatherTransition, setWeatherTransition] = useState(() => ({
    from: selectedWeatherId,
    to: selectedWeatherId,
    progress: 1,
  }));
  const weatherTransitionRef = useRef(weatherTransition);
  const weatherRuntimeRef = useRef({
    from: selectedWeatherId,
    to: selectedWeatherId,
    startedAt: 0,
  });
  const selectedWeatherRef = useRef(selectedWeatherId);

  const weatherMixLinear = weatherTransition.progress;
  const weatherMix = weatherMixLinear * weatherMixLinear * (3 - 2 * weatherMixLinear);

  const blendedWeather = useMemo(() => {
    const from = WEATHER_PRESETS[weatherTransition.from];
    const to = WEATHER_PRESETS[weatherTransition.to];
    const skyTint = blendHexColors(from.skyTint, to.skyTint, weatherMix);
    const fogTint = blendHexColors(from.fogTint, to.fogTint, weatherMix);
    const skyBlend = blendNumber(from.skyBlend, to.skyBlend, weatherMix);
    const fogBlend = blendNumber(from.fogBlend, to.fogBlend, weatherMix);
    const fogNearMultiplier = blendNumber(from.fogNearMultiplier, to.fogNearMultiplier, weatherMix);
    const fogFarMultiplier = blendNumber(from.fogFarMultiplier, to.fogFarMultiplier, weatherMix);
    const ambientIntensity = blendNumber(from.ambientIntensity, to.ambientIntensity, weatherMix);
    const directionalIntensity = blendNumber(from.directionalIntensity, to.directionalIntensity, weatherMix);
    const directionalColor = blendHexColors(from.directionalColor, to.directionalColor, weatherMix);
    const sunPosition: [number, number, number] = [
      blendNumber(from.sunPosition[0], to.sunPosition[0], weatherMix),
      blendNumber(from.sunPosition[1], to.sunPosition[1], weatherMix),
      blendNumber(from.sunPosition[2], to.sunPosition[2], weatherMix),
    ];
    const rainAmount = blendNumber(from.hasRain ? 1 : 0, to.hasRain ? 1 : 0, weatherMix);
    const nightAmount = blendNumber(from.hasNightSky ? 1 : 0, to.hasNightSky ? 1 : 0, weatherMix);

    return {
      skyTint,
      fogTint,
      skyBlend,
      fogBlend,
      fogNearMultiplier,
      fogFarMultiplier,
      ambientIntensity,
      directionalIntensity,
      directionalColor,
      sunPosition,
      rainAmount,
      nightAmount,
    };
  }, [weatherMix, weatherTransition.from, weatherTransition.to]);

  const skyColor = blendHexColors(atmosphere.skyColor, blendedWeather.skyTint, blendedWeather.skyBlend);
  const fogColor = blendHexColors(atmosphere.skyColor, blendedWeather.fogTint, blendedWeather.fogBlend);
  const fogNear = atmosphere.fogNear * blendedWeather.fogNearMultiplier;
  const fogFar = atmosphere.fogFar * blendedWeather.fogFarMultiplier;

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const sync = () => setShowTouchControls(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    selectedWeatherRef.current = selectedWeatherId;
  }, [selectedWeatherId]);

  useEffect(() => {
    weatherTransitionRef.current = weatherTransition;
  }, [weatherTransition]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentWeatherId = selectedWeatherRef.current;
      const candidates = WEATHER_OPTIONS.filter((weatherId) => weatherId !== currentWeatherId);
      if (candidates.length === 0) {
        return;
      }
      const nextWeather = candidates[Math.floor(Math.random() * candidates.length)];
      setSelectedWeather(nextWeather);
    }, WEATHER_CHANGE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [setSelectedWeather]);

  useEffect(() => {
    let rafId = 0;

    const animate = (now: number) => {
      const runtime = weatherRuntimeRef.current;
      const selected = selectedWeatherRef.current;
      if (runtime.to !== selected) {
        runtime.from = runtime.to;
        runtime.to = selected;
        runtime.startedAt = now;
      }

      const progress =
        runtime.from === runtime.to
          ? 1
          : Math.min(1, (now - runtime.startedAt) / WEATHER_TRANSITION_MS);

      const prev = weatherTransitionRef.current;
      if (prev.from !== runtime.from || prev.to !== runtime.to || Math.abs(prev.progress - progress) > 0.001) {
        const next = {
          from: runtime.from,
          to: runtime.to,
          progress,
        };
        weatherTransitionRef.current = next;
        setWeatherTransition(next);
      }

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className={styles.shell}>
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.8]}
        camera={{ position: [0, 5, -10], fov: 58, near: 0.1, far: 2400 }}
        shadows
      >
        <color attach="background" args={[skyColor]} />
        <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

        <ambientLight intensity={blendedWeather.ambientIntensity} />
        <directionalLight
          castShadow
          position={blendedWeather.sunPosition}
          intensity={blendedWeather.directionalIntensity}
          color={blendedWeather.directionalColor}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={140}
          shadow-camera-top={36}
          shadow-camera-bottom={-36}
          shadow-camera-left={-36}
          shadow-camera-right={36}
        />

        <Physics gravity={[0, -9.81, 0]} timeStep={PHYSICS_STEP} interpolate>
          <GameLoopSystem />
          <RoadScene rainAmount={blendedWeather.rainAmount} nightAmount={blendedWeather.nightAmount} />
          <TrafficSystem />
          <PlayerCar />
        </Physics>

        <ChaseCamera />
      </Canvas>

      <HudOverlay />
      {showTouchControls && <TouchControls />}
      <AudioEngine />
    </div>
  );
}
