"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "./GameShell.module.css";

import { useRaceStore } from "@/game/store/useRaceStore";

interface HoldButtonProps {
  label: string;
  className?: string;
  onPress: (pressed: boolean) => void;
}

function HoldButton({ label, className, onPress }: HoldButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onPointerDown={() => onPress(true)}
      onPointerUp={() => onPress(false)}
      onPointerCancel={() => onPress(false)}
      onPointerLeave={() => onPress(false)}
    >
      {label}
    </button>
  );
}

export function TouchControls() {
  const setTouchInput = useRaceStore((state) => state.setTouchInput);
  const clearTouchInput = useRaceStore((state) => state.clearTouchInput);

  const [throttle, setThrottle] = useState(false);
  const [brake, setBrake] = useState(false);
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [handbrake, setHandbrake] = useState(false);

  const steer = useMemo(() => {
    if (left && !right) {
      return 1;
    }
    if (right && !left) {
      return -1;
    }
    return 0;
  }, [left, right]);

  useEffect(() => {
    setTouchInput({
      throttle: throttle ? 1 : 0,
      brake: brake ? 1 : 0,
      steer,
      handbrake: handbrake ? 1 : 0,
    });
  }, [brake, handbrake, setTouchInput, steer, throttle]);

  useEffect(() => {
    return () => {
      clearTouchInput();
    };
  }, [clearTouchInput]);

  return (
    <div className={styles.touchRoot}>
      <div className={styles.touchLeftCluster}>
        <HoldButton label="Left" className={styles.touchButton} onPress={setLeft} />
        <HoldButton label="Right" className={styles.touchButton} onPress={setRight} />
      </div>

      <div className={styles.touchRightCluster}>
        <HoldButton label="Brake" className={styles.touchButton} onPress={setBrake} />
        <HoldButton label="Gas" className={styles.touchButtonAccent} onPress={setThrottle} />
        <HoldButton label="Drift" className={styles.touchButton} onPress={setHandbrake} />
      </div>
    </div>
  );
}
