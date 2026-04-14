"use client";

import styles from "./GameShell.module.css";

import { PLAYER_CAR_PRESETS, getPlayerCarPreset } from "@/game/playerCars";
import { useRaceStore } from "@/game/store/useRaceStore";
import { WEATHER_OPTIONS, WEATHER_PRESETS } from "@/game/weather";

export function HudOverlay() {
  const race = useRaceStore((state) => state.race);
  const car = useRaceStore((state) => state.car);
  const selectedPlayerCarId = useRaceStore((state) => state.selectedPlayerCarId);
  const selectedWeatherId = useRaceStore((state) => state.selectedWeatherId);

  const startRace = useRaceStore((state) => state.startRace);
  const restartRace = useRaceStore((state) => state.restartRace);
  const setSelectedPlayerCar = useRaceStore((state) => state.setSelectedPlayerCar);
  const setSelectedWeather = useRaceStore((state) => state.setSelectedWeather);

  const time = race.remainingTime.toFixed(1);
  const speed = race.speedKph.toFixed(0);
  const score = Math.round(race.score).toString();
  const distance = Math.round(race.distance).toString();
  const selectedPlayerCar = getPlayerCarPreset(selectedPlayerCarId);
  const selectedWeather = WEATHER_PRESETS[selectedWeatherId];
  const showRaceHud = race.status === "running" || race.status === "paused";

  return (
    <div className={styles.hudRoot}>
      {showRaceHud && <div className={styles.timeReadout}>{time}</div>}
      {showRaceHud && <div className={styles.speedReadout}>{speed}</div>}

      {race.status === "menu" && (
        <div className={styles.centerCard}>
          <h1>HORIZON RUN</h1>
          <p>
            Low-poly endless sprint inspired by classic coastal arcade racers. Reach checkpoints to
            extend time and weave through traffic.
          </p>
          <ul>
            <li>Keyboard: WASD or Arrows, Shift handbrake</li>
            <li>Mobile: steer pad + accel/brake pedals</li>
            <li>Avoid blockers and traffic impacts</li>
          </ul>

          <div className={styles.carSelector}>
            <strong className={styles.carSelectorTitle}>Select Car</strong>
            <div className={styles.carSelectorGrid}>
              {PLAYER_CAR_PRESETS.map((preset) => {
                const isSelected = preset.id === selectedPlayerCarId;
                const buttonClassName = isSelected
                  ? `${styles.carOption} ${styles.carOptionSelected}`
                  : styles.carOption;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={buttonClassName}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedPlayerCar(preset.id)}
                  >
                    <span className={styles.carOptionName}>{preset.label}</span>
                    <span className={styles.carOptionDescription}>{preset.description}</span>
                  </button>
                );
              })}
            </div>
            <p className={styles.carSelectorStatus}>
              Current pick: <strong>{selectedPlayerCar.label}</strong>
            </p>
          </div>

          <div className={styles.carSelector}>
            <strong className={styles.carSelectorTitle}>Select Weather</strong>
            <div className={styles.weatherSelectorGrid}>
              {WEATHER_OPTIONS.map((weatherId) => {
                const preset = WEATHER_PRESETS[weatherId];
                const isSelected = weatherId === selectedWeatherId;
                const buttonClassName = isSelected
                  ? `${styles.carOption} ${styles.carOptionSelected}`
                  : styles.carOption;

                return (
                  <button
                    key={weatherId}
                    type="button"
                    className={buttonClassName}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedWeather(weatherId)}
                  >
                    <span className={styles.carOptionName}>{preset.label}</span>
                    <span className={styles.carOptionDescription}>{preset.description}</span>
                  </button>
                );
              })}
            </div>
            <p className={styles.carSelectorStatus}>
              Current weather: <strong>{selectedWeather.label}</strong>
            </p>
          </div>

          <button type="button" className={styles.primaryActionButton} onClick={startRace}>
            Start Race
          </button>
        </div>
      )}

      {race.status === "gameover" && (
        <div className={styles.centerCard}>
          <h2>Time Up</h2>
          <p>
            Score: <strong>{score}</strong>
          </p>
          <p>
            Distance: <strong>{distance}m</strong>
          </p>
          {car.offRoad && <p className={styles.warning}>You finished off-road. Stay on asphalt for pace.</p>}
          <button type="button" className={styles.primaryActionButton} onClick={restartRace}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
