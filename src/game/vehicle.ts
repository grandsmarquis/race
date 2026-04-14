import { CAR_HANDLING } from "./config";
import { clamp, damp, lerp, smoothstep } from "./math";
import { CarHandlingConfig, InputState } from "./types";

export interface VehicleDynamicsState {
  forwardSpeed: number;
  lateralSpeed: number;
  heading: number;
  steerInput?: number;
  yawRate?: number;
}

export function getSteerAuthority(
  speedAbs: number,
  config: CarHandlingConfig = CAR_HANDLING,
): number {
  const speedRatio = clamp(speedAbs / config.maxSpeed, 0, 1);
  const eased = smoothstep(0, 1, Math.pow(speedRatio, config.steerSpeedFalloff));
  return lerp(config.maxSteer, config.minSteer, eased);
}

export function stepVehicleDynamics(
  state: VehicleDynamicsState,
  input: InputState,
  dt: number,
  offRoad: boolean,
  config: CarHandlingConfig = CAR_HANDLING,
): VehicleDynamicsState {
  const traction = offRoad ? config.offRoadGripMultiplier : 1;
  const speedLimit = offRoad ? config.maxSpeed * config.offRoadSpeedMultiplier : config.maxSpeed;
  const speedRatio = clamp(Math.abs(state.forwardSpeed) / config.maxSpeed, 0, 1);
  const steerSmoothing = lerp(
    config.steerInputSmoothing,
    config.highSpeedSteerInputSmoothing,
    speedRatio,
  );
  const steerTarget = Math.sign(input.steer) * Math.pow(Math.abs(input.steer), config.steerInputCurve);

  const steerInput = damp(state.steerInput ?? 0, steerTarget, steerSmoothing, dt);

  const accel = input.throttle * config.acceleration;
  const brake = input.brake * config.brakeForce;
  const drive = accel - brake;
  const drag = config.drag * state.forwardSpeed * Math.abs(state.forwardSpeed);

  let forwardSpeed = state.forwardSpeed + (drive - drag) * dt;
  forwardSpeed = clamp(forwardSpeed, -config.reverseMaxSpeed, speedLimit);

  const steerAuthority = getSteerAuthority(Math.abs(forwardSpeed), config);
  const direction = Math.abs(forwardSpeed) < 0.5 ? 1 : Math.sign(forwardSpeed);
  const targetYawRate = steerInput * steerAuthority * config.steerResponse * direction;
  const yawRate = damp(state.yawRate ?? 0, targetYawRate, config.yawRateSmoothing * traction, dt);

  const slipMultiplier = input.handbrake > 0.1 ? config.handbrakeSlipMultiplier : 1;
  let lateralSpeed = state.lateralSpeed;
  lateralSpeed += steerInput * Math.abs(forwardSpeed) * config.lateralSlip * slipMultiplier * dt;
  lateralSpeed *= Math.exp(-config.lateralDamping * traction * dt);

  const heading = state.heading + yawRate * dt;

  if (input.throttle < 0.01 && input.brake < 0.01) {
    forwardSpeed *= Math.exp(-config.gripRecovery * 0.25 * dt);
  }

  return {
    forwardSpeed,
    lateralSpeed,
    heading,
    steerInput,
    yawRate,
  };
}
