import Link from "next/link";

import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Next.js + R3F + Rapier</p>
        <h1>Horizon Run</h1>
        <p className={styles.subtitle}>
          OutRun-inspired low-poly racing prototype with third-person driving, endless checkpoint runs,
          and responsive touch + keyboard control.
        </p>
        <div className={styles.actions}>
          <Link href="/game" className={styles.primary}>
            Start Driving
          </Link>
        </div>
      </section>
    </main>
  );
}
