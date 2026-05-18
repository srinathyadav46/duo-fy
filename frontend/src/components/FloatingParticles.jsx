import React from "react";
import { motion } from "framer-motion";

/**
 * Floating glowing dust particles for hero sections.
 * Pure CSS animation — performant and lightweight.
 */
const PARTICLES = Array.from({ length: 28 }).map((_, i) => ({
  id: i,
  left: Math.random() * 100,
  size: 2 + Math.random() * 5,
  delay: Math.random() * 12,
  duration: 14 + Math.random() * 18,
  opacity: 0.35 + Math.random() * 0.55,
}));

export default function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true" data-testid="floating-particles">
      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          className="absolute bottom-[-10%] rounded-full"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background:
              "radial-gradient(circle, rgba(255,200,210,0.95) 0%, rgba(225,29,72,0.6) 40%, rgba(225,29,72,0) 75%)",
            filter: "blur(0.4px)",
            opacity: p.opacity,
            animation: `float-up ${p.duration}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}
