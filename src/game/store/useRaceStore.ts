"use client";

import { create } from "zustand";

import { ROAD_SETTINGS } from "../config";
import { mergeInputSources, NEUTRAL_INPUT, normalizeInputState } from "../input";
import { DEFAULT_PLAYER_CAR_ID, getPlayerCarPreset } from "../playerCars";
import { applyCheckpointReward, createInitialRaceState, pauseRace, resumeRace, startRace, updateRaceState } from "../race";
import { getDefaultSaveData, loadSaveData, persistSaveData } from "../storage";
import { createInitialTraffic } from "../traffic";
import { CarTelemetry, InputState, RaceState, SaveDataV1, TrafficVehicle, Vec3, WeatherType } from "../types";
import { DEFAULT_WEATHER } from "../weather";

interface RaceStore {
  seed: number;
  race: RaceState;
  saveData: SaveDataV1;
  keyboardInput: InputState;
  touchInput: InputState;
  input: InputState;
  car: CarTelemetry;
  traffic: TrafficVehicle[];
  checkpointPulse: number;
  collisionPulse: number;
  atmosphereTestOffset: number;
  selectedPlayerCarId: string;
  selectedWeatherId: WeatherType;

  setKeyboardInput: (patch: Partial<InputState>) => void;
  setTouchInput: (patch: Partial<InputState>) => void;
  clearTouchInput: () => void;
  setCarTelemetry: (patch: Partial<CarTelemetry>) => void;
  setTraffic: (vehicles: TrafficVehicle[]) => void;
  setSelectedPlayerCar: (carId: string) => void;
  setSelectedWeather: (weatherId: WeatherType) => void;

  startRace: () => void;
  restartRace: () => void;
  pauseRace: () => void;
  resumeRace: () => void;

  tickRace: (dt: number) => void;
  registerCheckpoint: (segmentIndex: number) => void;
  registerCollision: () => void;
  cycleAtmosphereForTesting: () => void;
}

const defaultVec3: Vec3 = { x: 0, y: 1.6, z: 0 };
const defaultTelemetry: CarTelemetry = {
  position: defaultVec3,
  heading: 0,
  speedMps: 0,
  rpmNormalized: 0,
  segmentIndex: 0,
  offRoad: false,
  recoveryTimer: 0,
};

function mergePatch(base: InputState, patch: Partial<InputState>): InputState {
  return normalizeInputState({ ...base, ...patch });
}

function loadInitialSave(): SaveDataV1 {
  if (typeof window === "undefined") {
    return getDefaultSaveData();
  }
  return loadSaveData();
}

export const useRaceStore = create<RaceStore>((set) => {
  const saveData = loadInitialSave();

  return {
    seed: ROAD_SETTINGS.seed,
    race: createInitialRaceState("menu"),
    saveData,
    keyboardInput: NEUTRAL_INPUT,
    touchInput: NEUTRAL_INPUT,
    input: NEUTRAL_INPUT,
    car: defaultTelemetry,
    traffic: createInitialTraffic(ROAD_SETTINGS.seed),
    checkpointPulse: 0,
    collisionPulse: 0,
    atmosphereTestOffset: 0,
    selectedPlayerCarId: DEFAULT_PLAYER_CAR_ID,
    selectedWeatherId: DEFAULT_WEATHER,

    setKeyboardInput: (patch) => {
      set((state) => {
        const keyboardInput = mergePatch(state.keyboardInput, patch);
        return {
          keyboardInput,
          input: mergeInputSources(keyboardInput, state.touchInput),
        };
      });
    },

    setTouchInput: (patch) => {
      set((state) => {
        const touchInput = mergePatch(state.touchInput, patch);
        return {
          touchInput,
          input: mergeInputSources(state.keyboardInput, touchInput),
        };
      });
    },

    clearTouchInput: () => {
      set((state) => ({
        touchInput: NEUTRAL_INPUT,
        input: mergeInputSources(state.keyboardInput, NEUTRAL_INPUT),
      }));
    },

    setCarTelemetry: (patch) => {
      set((state) => ({
        car: {
          ...state.car,
          ...patch,
          position: patch.position ?? state.car.position,
          recoveryTimer: Math.max(0, patch.recoveryTimer ?? state.car.recoveryTimer),
        },
      }));
    },

    setTraffic: (traffic) => set({ traffic }),
    setSelectedPlayerCar: (carId) => {
      const preset = getPlayerCarPreset(carId);
      set({ selectedPlayerCarId: preset.id });
    },
    setSelectedWeather: (weatherId) => {
      set({ selectedWeatherId: weatherId });
    },

    startRace: () => {
      set((state) => ({
        race: startRace(state.car.position.z),
        traffic: createInitialTraffic(state.seed),
        collisionPulse: state.collisionPulse,
        atmosphereTestOffset: 0,
      }));
    },

    restartRace: () => {
      set((state) => ({
        race: startRace(state.car.position.z),
        traffic: createInitialTraffic(state.seed),
        atmosphereTestOffset: 0,
      }));
    },

    pauseRace: () => {
      set((state) => ({ race: pauseRace(state.race) }));
    },

    resumeRace: () => {
      set((state) => ({ race: resumeRace(state.race) }));
    },

    tickRace: (dt) => {
      set((state) => {
        const nextRace = updateRaceState(state.race, {
          dt,
          speedMps: state.car.speedMps,
          distanceSample: state.car.position.z,
        });

        const wasRunning = state.race.status === "running";
        const nowGameOver = nextRace.status === "gameover";

        const recoveryTimer = Math.max(0, state.car.recoveryTimer - dt);

        if (wasRunning && nowGameOver) {
          const nextSave: SaveDataV1 = {
            schemaVersion: 1,
            bestScore: Math.max(state.saveData.bestScore, Math.round(nextRace.score)),
            bestDistance: Math.max(state.saveData.bestDistance, Math.round(nextRace.distance)),
            updatedAt: new Date().toISOString(),
          };

          persistSaveData(nextSave);

          return {
            race: nextRace,
            saveData: nextSave,
            car: {
              ...state.car,
              recoveryTimer,
            },
          };
        }

        return {
          race: nextRace,
          car: {
            ...state.car,
            recoveryTimer,
          },
        };
      });
    },

    registerCheckpoint: (segmentIndex) => {
      set((state) => {
        const nextRace = applyCheckpointReward(state.race, segmentIndex);
        if (nextRace.checkpointHits === state.race.checkpointHits) {
          return state;
        }

        return {
          race: nextRace,
          checkpointPulse: state.checkpointPulse + 1,
        };
      });
    },

    registerCollision: () => {
      set((state) => ({
        collisionPulse: state.collisionPulse + 1,
        car: {
          ...state.car,
          recoveryTimer: 0.75,
        },
      }));
    },

    cycleAtmosphereForTesting: () => {
      set((state) => ({
        atmosphereTestOffset: state.atmosphereTestOffset + 1,
      }));
    },
  };
});
