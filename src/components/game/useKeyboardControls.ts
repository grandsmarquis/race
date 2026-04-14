"use client";

import { useEffect } from "react";

import { inputFromKeyMap } from "@/game/input";
import { useRaceStore } from "@/game/store/useRaceStore";

const CONTROL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ShiftLeft",
  "ShiftRight",
]);

export function useKeyboardControls(): void {
  const setKeyboardInput = useRaceStore((state) => state.setKeyboardInput);

  useEffect(() => {
    const keyMap: Record<string, boolean> = {};

    const emit = () => {
      setKeyboardInput(inputFromKeyMap(keyMap));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!CONTROL_KEYS.has(event.code)) {
        return;
      }

      keyMap[event.code] = true;
      emit();
      event.preventDefault();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!CONTROL_KEYS.has(event.code)) {
        return;
      }

      keyMap[event.code] = false;
      emit();
      event.preventDefault();
    };

    const onBlur = () => {
      for (const key of Object.keys(keyMap)) {
        keyMap[key] = false;
      }
      emit();
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      onBlur();
    };
  }, [setKeyboardInput]);
}
