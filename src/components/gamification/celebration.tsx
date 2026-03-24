"use client";

import { useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
}

const COLORS = [
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#f97316",
  "#06b6d4",
];

let uid = 0;

function makeParticles(): Particle[] {
  return Array.from({ length: 20 }, (_, i) => ({
    id: ++uid,
    angle: (i / 20) * 360 + Math.random() * 18 - 9,
    distance: 60 + Math.random() * 80,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
}

export interface CelebrationRef {
  trigger: () => void;
}

export const CelebrationBurst = forwardRef<CelebrationRef, { className?: string }>(
  function CelebrationBurst({ className }, ref) {
    const [groups, setGroups] = useState<Particle[][]>([]);

    useImperativeHandle(ref, () => ({
      trigger() {
        const particles = makeParticles();
        setGroups((g) => [...g, particles]);
        setTimeout(() => {
          setGroups((g) => g.filter((pg) => pg !== particles));
        }, 1200);
      },
    }));

    return (
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      >
        <AnimatePresence>
          {groups.flatMap((particles) =>
            particles.map((p) => {
              const rad = (p.angle * Math.PI) / 180;
              const dx = Math.cos(rad) * p.distance;
              const dy = Math.sin(rad) * p.distance;
              return (
                <motion.div
                  key={p.id}
                  initial={{
                    left: "calc(50% - 4px)",
                    top: "calc(50% - 4px)",
                    opacity: 1,
                    scale: 1,
                  }}
                  animate={{
                    left: `calc(50% - 4px + ${dx}px)`,
                    top: `calc(50% - 4px + ${dy}px)`,
                    opacity: 0,
                    scale: 0.3,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    width: p.size,
                    height: p.size,
                    borderRadius: "50%",
                    backgroundColor: p.color,
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
