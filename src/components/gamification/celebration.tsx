"use client";

import { useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ParticleShape = "rect" | "circle" | "diamond";

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  shape: ParticleShape;
  rotate: number;
}

interface FlashRing {
  id: number;
}

const COLORS = [
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#FBBF24",
  "#10B981",
  "#F97316",
];

const SHAPES: ParticleShape[] = ["rect", "rect", "circle", "diamond"];

let uid = 0;

function makeParticles(): Particle[] {
  return Array.from({ length: 40 }, (_, i) => ({
    id: ++uid,
    angle: (i / 40) * 360 + Math.random() * 9 - 4.5,
    distance: 80 + Math.random() * 80,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    rotate: Math.random() * 360,
  }));
}

let ringUid = 0;

export interface CelebrationRef {
  trigger: () => void;
}

export const CelebrationBurst = forwardRef<CelebrationRef, { className?: string }>(
  function CelebrationBurst({ className }, ref) {
    const [groups, setGroups] = useState<Particle[][]>([]);
    const [rings, setRings] = useState<FlashRing[]>([]);

    useImperativeHandle(ref, () => ({
      trigger() {
        const particles = makeParticles();
        const ring: FlashRing = { id: ++ringUid };

        setGroups((g) => [...g, particles]);
        setRings((r) => [...r, ring]);

        setTimeout(() => {
          setGroups((g) => g.filter((pg) => pg !== particles));
        }, 1400);

        setTimeout(() => {
          setRings((r) => r.filter((rg) => rg !== ring));
        }, 500);
      },
    }));

    return (
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      >
        <AnimatePresence>
          {/* Flash rings */}
          {rings.map((ring) => (
            <motion.div
              key={`ring-${ring.id}`}
              initial={{ opacity: 0.8, scale: 0, left: "50%", top: "50%" }}
              animate={{ opacity: 0, scale: 4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{
                position: "absolute",
                width: 40,
                height: 40,
                borderRadius: "50%",
                marginLeft: -20,
                marginTop: -20,
                border: "2px solid #8B5CF6",
                boxShadow: "0 0 12px 4px rgba(139,92,246,0.5)",
              }}
            />
          ))}

          {/* Particles */}
          {groups.flatMap((particles) =>
            particles.map((p) => {
              const rad = (p.angle * Math.PI) / 180;
              const dx = Math.cos(rad) * p.distance;
              // gravity drift: dy increases downward over time
              const dy = Math.sin(rad) * p.distance + 20;

              const borderRadius =
                p.shape === "circle"
                  ? "50%"
                  : p.shape === "diamond"
                  ? "0%"
                  : "2px";

              const isRect = p.shape === "rect";
              const width = isRect ? p.size * 1.6 : p.size;
              const height = p.size;

              return (
                <motion.div
                  key={p.id}
                  initial={{
                    left: "calc(50% - 4px)",
                    top: "calc(50% - 4px)",
                    opacity: 1,
                    scale: 1,
                    rotate: 0,
                  }}
                  animate={{
                    left: `calc(50% - 4px + ${dx}px)`,
                    top: `calc(50% - 4px + ${dy}px)`,
                    opacity: 0,
                    scale: 0.3,
                    rotate: isRect ? p.rotate : 45,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    width,
                    height,
                    borderRadius,
                    backgroundColor: p.color,
                    transform: p.shape === "diamond" ? "rotate(45deg)" : undefined,
                  }}
                />
              );
            })
          )}
        </AnimatePresence>
      </div>
    );
  }
);

/**
 * Hook that returns a ref to attach to <CelebrationBurst> and a trigger function.
 *
 * Usage:
 *   const { celebrationRef, triggerCelebration } = useCelebration();
 *   <CelebrationBurst ref={celebrationRef} />
 *   <button onClick={triggerCelebration}>Done!</button>
 */
export function useCelebration() {
  const celebrationRef = useRef<CelebrationRef>(null);

  const triggerCelebration = useCallback(() => {
    celebrationRef.current?.trigger();
  }, []);

  return { celebrationRef, triggerCelebration };
}
