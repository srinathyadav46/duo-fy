import React from "react";

/**
 * Music visualizer — a row of vertical bars that animate when `playing` is true.
 */
export default function Visualizer({ playing = false, bars = 24, className = "" }) {
  return (
    <div
      className={`flex items-end gap-[3px] h-10 ${className}`}
      aria-hidden="true"
      data-testid="music-visualizer"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: "linear-gradient(180deg,#fda4af 0%,#e11d48 80%)",
            height: "100%",
            transformOrigin: "bottom",
            transform: playing ? undefined : "scaleY(0.18)",
            animation: playing
              ? `vbar 0.${6 + (i % 6)}s ${i * 0.06}s ease-in-out infinite`
              : "none",
            opacity: playing ? 0.95 : 0.35,
            transition: "opacity 0.3s",
          }}
        />
      ))}
    </div>
  );
}
