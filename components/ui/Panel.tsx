"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";

/** Every floating surface on the map takes its shape and motion from here. */
export const PANEL_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { type: "spring", duration: 0.3, bounce: 0 },
} as const;

const SURFACE =
  "pointer-events-auto absolute inset-x-4 bottom-4 z-20 rounded-sheet bg-bg-surface p-5 " +
  "shadow-lg outline-none sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[22rem]";

type Props = {
  children: ReactNode;
  label: string;
  /** Changing this moves focus back to the panel, for a flow that swaps steps. */
  focusKey?: string;
  className?: string;
};

/**
 * One dialog at a time. A multi-step flow swaps what is inside rather than
 * mounting a second panel, so a screen reader is never handed two dialogs.
 *
 * Opening moves focus in and closing puts it back where it was, so a keyboard
 * is never left stranded on the body after a panel disappears.
 */
export function Panel({ children, label, focusKey, className = "" }: Props) {
  const panel = useRef<HTMLElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    return () => returnTo.current?.focus?.();
  }, []);

  useEffect(() => {
    const node = panel.current;
    if (!node || node.contains(document.activeElement)) return;
    node.focus({ preventScroll: true });
  }, [focusKey]);

  return (
    <motion.aside
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      tabIndex={-1}
      {...PANEL_MOTION}
      className={`${SURFACE} ${className}`}
    >
      {children}
    </motion.aside>
  );
}

/** The punched hole a plant tag hangs by, the mark the pins carry too. */
export function TagHole() {
  return <span className="block size-2 rounded-full bg-paper-300" aria-hidden />;
}
