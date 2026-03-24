"use client";

import { AnimatePresence, motion } from "framer-motion";

interface PointsPopupProps {
  points: number;
  show: boolean;
}

export function PointsPopup({ points, show }: PointsPopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={`points-popup-${Date.now()}`}
          initial={{ opacity: 1, y: 0, scale: 0.5 }}
          animate={[
            { opacity: 1, y: 0, scale: 1.2, transition: { duration: 0.2, ease: "easeOut" } },
            { opacity: 1, y: 0, scale: 1.0, transition: { duration: 0.1, ease: "easeIn" } },
            { opacity: 0, y: -60, scale: 1.0, transition: { duration: 0.8, ease: "easeOut" } },
          ]}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 select-none"
        >
          <span
            className="text-2xl font-extrabold drop-shadow-lg flex items-center gap-1"
            style={{
              background: "linear-gradient(135deg, #F59E0B, #FBBF24, #FDE68A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "var(--font-heading), sans-serif",
            }}
          >
            ★ +{points} pts
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
