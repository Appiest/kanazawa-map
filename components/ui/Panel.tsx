"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Every floating surface on the map takes its shape and motion from here. */
export const PANEL_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { type: "spring", duration: 0.3, bounce: 0 },
} as const;

const SURFACE =
  "pointer-events-auto absolute inset-x-4 bottom-4 z-10 rounded-sheet bg-bg-surface p-5 " +
  "shadow-lg sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[22rem]";

type Props = {
  children: ReactNode;
  label: string;
  className?: string;
};

/**
 * One dialog at a time. A multi-step flow swaps what is inside rather than
 * mounting a second panel, so a screen reader is never handed two dialogs.
 */
export function Panel({ children, label, className = "" }: Props) {
  return (
    <motion.aside role="dialog" aria-label={label} {...PANEL_MOTION} className={`${SURFACE} ${className}`}>
      {children}
    </motion.aside>
  );
}

/** The punched hole a plant tag hangs by, the mark the pins carry too. */
export function TagHole() {
  return <span className="block size-2 rounded-full bg-paper-300" aria-hidden />;
}
