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
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -48, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 select-none"
        >
          <span className="text-xl font-extrabold text-amber-500 drop-shadow-md">
            +{points}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
