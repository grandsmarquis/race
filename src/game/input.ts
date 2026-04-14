import { clamp } from "./math";
import { InputState } from "./types";

export const NEUTRAL_INPUT: InputState = {
  throttle: 0,
  brake: 0,
  steer: 0,
  handbrake: 0,
};

export function normalizeInputState(input: Partial<InputState>): InputState {
  return {
    throttle: clamp(input.throttle ?? 0, 0, 1),
    brake: clamp(input.brake ?? 0, 0, 1),
    steer: clamp(input.steer ?? 0, -1, 1),
    handbrake: clamp(input.handbrake ?? 0, 0, 1),
  };
}

export function mergeInputSources(keyboard: InputState, touch: InputState): InputState {
  return {
    throttle: clamp(Math.max(keyboard.throttle, touch.throttle), 0, 1),
    brake: clamp(Math.max(keyboard.brake, touch.brake), 0, 1),
    steer: clamp(keyboard.steer + touch.steer, -1, 1),
    handbrake: clamp(Math.max(keyboard.handbrake, touch.handbrake), 0, 1),
  };
}

const THROTTLE_KEYS = ["ArrowUp", "KeyW"];
const BRAKE_KEYS = ["ArrowDown", "KeyS", "Space"];
const LEFT_KEYS = ["ArrowLeft", "KeyA"];
const RIGHT_KEYS = ["ArrowRight", "KeyD"];
const HANDBRAKE_KEYS = ["ShiftLeft", "ShiftRight"];

export function inputFromKeyMap(keyMap: Record<string, boolean>): InputState {
  const throttle = THROTTLE_KEYS.some((key) => keyMap[key]) ? 1 : 0;
  const brake = BRAKE_KEYS.some((key) => keyMap[key]) ? 1 : 0;
  const left = LEFT_KEYS.some((key) => keyMap[key]) ? 1 : 0;
  const right = RIGHT_KEYS.some((key) => keyMap[key]) ? 1 : 0;
  const handbrake = HANDBRAKE_KEYS.some((key) => keyMap[key]) ? 1 : 0;

  return {
    throttle,
    brake,
    steer: clamp(left - right, -1, 1),
    handbrake,
  };
}
