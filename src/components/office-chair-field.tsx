"use client";

import { useEffect, useRef, useState } from "react";
import Antigravity from "@/components/antigravity";
import styles from "./office-chair-field.module.css";

function OfficeChair() {
  return (
    <svg viewBox="0 0 320 390" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M110 54c5-14 18-22 34-22h44c16 0 29 8 34 22l16 113c2 15-8 28-23 30l-104 10c-16 2-29-10-29-26L110 54Z" />
        <path d="M116 55c31 15 67 16 101 1M93 163c43 18 92 18 136 1" opacity=".62" />
        <path d="M71 174v35c0 14 11 25 25 25h128c14 0 25-11 25-25v-35" />
        <path d="M67 174h24m158 0h24M91 226l19 27h99l40-27" />
        <path d="M108 253c4 14 15 22 30 22h45c15 0 26-8 30-22" />
        <path d="M160 276v49m0 0-80 27m80-27 80 27m-80-27-48 32m48-32 48 32" />
        <circle cx="76" cy="359" r="10" />
        <circle cx="244" cy="359" r="10" />
        <circle cx="107" cy="365" r="9" />
        <circle cx="213" cy="365" r="9" />
      </g>
    </svg>
  );
}

export function OfficeChairField() {
  const stageRef = useRef<HTMLDivElement>(null);
  const chairRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(motion.matches);
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(stage);
    motion.addEventListener("change", syncMotion);
    syncMotion();
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", syncMotion);
    };
  }, []);

  const moveChair = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!chairRef.current || reducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    chairRef.current.style.transform = `translate(${x * 14}px, ${y * 10}px) rotate(${x * 4}deg)`;
  };

  return (
    <div
      ref={stageRef}
      className={styles.stage}
      role="img"
      aria-label="Office chair surrounded by interactive ivory particles that follow the pointer"
      onPointerMove={moveChair}
      onPointerLeave={() => { if (chairRef.current) chairRef.current.style.transform = ""; }}
    >
      <div className={styles.field} aria-hidden="true">
        {active && !reducedMotion && <Antigravity color="#FAF9F6" />}
      </div>
      <div ref={chairRef} className={styles.chair} aria-hidden="true"><OfficeChair /></div>
    </div>
  );
}
