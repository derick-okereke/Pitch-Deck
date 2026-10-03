"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import strength from "../../assets/mc2-transparent.png";
import growth from "../../assets/mc3.png";
import conviction from "../../assets/mc4.png";
import rest from "../../assets/mc5.png";
import outlook from "../../assets/mc6.png";
import connection from "../../assets/mc7.png";
import conversation from "../../assets/mc8.png";
import styles from "./hero-image-loop.module.css";

const illustrations = [
  { src: strength, alt: "Founder lifting a barbell while holding a briefcase" },
  { src: growth, alt: "Founder tending a growing investment" },
  { src: conviction, alt: "Founder raising a hand with an idea" },
  { src: rest, alt: "Founder reclining on a sofa" },
  { src: outlook, alt: "Founder looking ahead from an open hand" },
  { src: connection, alt: "Two founders shaking hands" },
  { src: conversation, alt: "Two founders talking across a table" },
];

export function HeroImageLoop() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealed, setRevealed] = useState(true);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    illustrations.forEach(({ src }) => {
      const preload = new window.Image();
      preload.src = src.src;
    });

    let intervalId: number | undefined;
    let swapId: number | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const inView = () => {
      const bounds = stage.getBoundingClientRect();
      return bounds.bottom > 0 && bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth;
    };

    const stop = (reveal = true) => {
      window.clearInterval(intervalId);
      window.clearTimeout(swapId);
      intervalId = undefined;
      swapId = undefined;
      if (reveal) setRevealed(true);
    };
    const syncPlayback = () => {
      stop();
      if (!inView() || document.hidden || reducedMotion.matches) return;
      intervalId = window.setInterval(() => {
        setRevealed(false);
        swapId = window.setTimeout(() => {
          setActiveIndex((index) => (index + 1) % illustrations.length);
          setRevealed(true);
        }, 420);
      }, 8000);
    };
    window.addEventListener("scroll", syncPlayback, { passive: true });
    window.addEventListener("resize", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    reducedMotion.addEventListener("change", syncPlayback);
    syncPlayback();

    return () => {
      stop(false);
      window.removeEventListener("scroll", syncPlayback);
      window.removeEventListener("resize", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      reducedMotion.removeEventListener("change", syncPlayback);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      role="img"
      aria-label="Illustrations of founders and investors shown one at a time"
    >
      <div className={styles.frame} data-revealed={revealed} aria-hidden="true">
        <Image
          className={styles.artwork}
          src={illustrations[activeIndex].src}
          alt=""
          sizes="(max-width: 720px) 80vw, (max-width: 1100px) 65vw, 42vw"
          priority
          unoptimized
        />
      </div>
      <span className="sr-only">{illustrations.map(({ alt }) => alt).join(". ")}</span>
    </div>
  );
}
