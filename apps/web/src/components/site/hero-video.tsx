"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// Only tablets and up, and only for people who haven't asked for less motion.
// Phones keep the still photo (it is also the video's first frame).
const QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Seamless loop generated from the hero photograph (same first and last
 * frame), layered over the still and faded in once it is actually playing.
 */
export function HeroVideo({ className = "" }: { className?: string }) {
  const enabled = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!enabled || !video) return;
    video.muted = true; // required for autoplay; set as a property to be safe
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [enabled]);

  if (!enabled) return null;

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => setPlaying(true)}
      className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${
        playing ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      <source src="/video/hero.mp4" type="video/mp4" />
    </video>
  );
}
