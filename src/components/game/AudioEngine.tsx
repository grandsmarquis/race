"use client";

import { useEffect, useRef } from "react";

import { useRaceStore } from "@/game/store/useRaceStore";

export function AudioEngine() {
  const checkpointPulse = useRaceStore((state) => state.checkpointPulse);
  const collisionPulse = useRaceStore((state) => state.collisionPulse);

  const contextRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const unlock = async () => {
      if (contextRef.current) {
        return;
      }

      const ctx = new AudioContext();
      const gain = ctx.createGain();
      const osc = ctx.createOscillator();

      osc.type = "sawtooth";
      osc.frequency.value = 80;
      gain.gain.value = 0.0001;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();

      contextRef.current = ctx;
      engineOscRef.current = osc;
      engineGainRef.current = gain;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }
    };

    const onInteract = () => {
      void unlock();
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };

    window.addEventListener("pointerdown", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const state = useRaceStore.getState();
      const gain = engineGainRef.current;
      const osc = engineOscRef.current;

      if (gain && osc) {
        const running = state.race.status === "running";
        const rpm = state.car.rpmNormalized;
        const now = gain.context.currentTime;

        osc.frequency.setTargetAtTime(90 + rpm * 190, now, 0.05);
        gain.gain.setTargetAtTime(running ? 0.04 + rpm * 0.08 : 0.0001, now, 0.08);
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 980;
    gain.gain.value = 0.0001;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.start(now);
    osc.stop(now + 0.2);
  }, [checkpointPulse]);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = 160;
    gain.gain.value = 0.0001;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    osc.start(now);
    osc.stop(now + 0.28);
  }, [collisionPulse]);

  useEffect(() => {
    return () => {
      engineOscRef.current?.stop();
      engineOscRef.current?.disconnect();
      engineGainRef.current?.disconnect();
      void contextRef.current?.close();
    };
  }, []);

  return null;
}
