import { CAR_HANDLING } from "@/game/config";
import { NEUTRAL_INPUT } from "@/game/input";
import { getSteerAuthority, stepVehicleDynamics } from "@/game/vehicle";

describe("vehicle dynamics", () => {
  it("enforces top speed cap", () => {
    let state = {
      forwardSpeed: 0,
      lateralSpeed: 0,
      heading: 0,
    };

    for (let i = 0; i < 1200; i += 1) {
      state = stepVehicleDynamics(
        state,
        { ...NEUTRAL_INPUT, throttle: 1 },
        1 / 60,
        false,
      );
    }

    expect(state.forwardSpeed).toBeLessThanOrEqual(CAR_HANDLING.maxSpeed + 0.01);
  });

  it("reduces steering authority at high speed", () => {
    const low = getSteerAuthority(8);
    const high = getSteerAuthority(CAR_HANDLING.maxSpeed);

    expect(low).toBeGreaterThan(high);
  });

  it("applies off-road speed penalty", () => {
    let onRoad = { forwardSpeed: 0, lateralSpeed: 0, heading: 0 };
    let offRoad = { forwardSpeed: 0, lateralSpeed: 0, heading: 0 };

    for (let i = 0; i < 900; i += 1) {
      onRoad = stepVehicleDynamics(onRoad, { ...NEUTRAL_INPUT, throttle: 1 }, 1 / 60, false);
      offRoad = stepVehicleDynamics(offRoad, { ...NEUTRAL_INPUT, throttle: 1 }, 1 / 60, true);
    }

    expect(offRoad.forwardSpeed).toBeLessThan(onRoad.forwardSpeed * 0.9);
  });

  it("smooths abrupt steering input changes", () => {
    const dt = 1 / 60;
    let state = { forwardSpeed: 22, lateralSpeed: 0, heading: 0, steerInput: 0, yawRate: 0 };

    state = stepVehicleDynamics(state, { ...NEUTRAL_INPUT, steer: 1 }, dt, false);

    expect(state.steerInput).toBeGreaterThan(0);
    expect(state.steerInput).toBeLessThan(1);
    expect(state.heading).toBeLessThan(0.05);

    for (let i = 0; i < 120; i += 1) {
      state = stepVehicleDynamics(state, { ...NEUTRAL_INPUT, steer: 1 }, dt, false);
    }

    expect(state.steerInput).toBeGreaterThan(0.95);
  });

  it("builds yaw rate progressively under sustained steering", () => {
    const dt = 1 / 60;
    const state = { forwardSpeed: 30, lateralSpeed: 0, heading: 0, steerInput: 0, yawRate: 0 };

    const first = stepVehicleDynamics(state, { ...NEUTRAL_INPUT, steer: 1 }, dt, false);
    const second = stepVehicleDynamics(first, { ...NEUTRAL_INPUT, steer: 1 }, dt, false);

    expect(Math.abs(first.yawRate ?? 0)).toBeGreaterThan(0);
    expect(Math.abs(second.yawRate ?? 0)).toBeGreaterThan(Math.abs(first.yawRate ?? 0));
  });
});
