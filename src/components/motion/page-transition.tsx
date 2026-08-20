"use client";

import { motion, useReducedMotion } from "motion/react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
