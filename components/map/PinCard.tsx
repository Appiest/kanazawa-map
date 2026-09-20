"use client";

import { AnimatePresence, motion } from "motion/react";
import { XIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import type { PinDetail } from "@/lib/pins/repository";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; pin: PinDetail }
  | { status: "error" };

const ENTER = { type: "spring", duration: 0.3, bounce: 0 } as const;

/** The punched hole a plant tag hangs by, the mark the pin carries too. */
function TagHole() {
  return <span className="block size-2 rounded-full bg-paper-300" aria-hidden />;
}

function CardBody({ state }: { state: State }) {
  if (state.status === "loading") {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-6 w-32 rounded bg-bg-sunken" />
        <div className="h-4 w-24 rounded bg-bg-sunken" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-sm text-text-secondary">
        That pin would not load. It may have been taken down.
      </p>
    );
  }

  if (state.status !== "ready") return null;

  return (
    <>
      <h2 className="text-2xl font-semibold text-text-primary">{state.pin.displayName}</h2>
      <p className="text-sm text-text-secondary">{state.pin.neighborhood}</p>
      {state.pin.note ? (
        <p className="mt-3 border-t border-separator pt-3 text-[0.9375rem] leading-relaxed text-text-body">
          {state.pin.note}
        </p>
      ) : null}
      <p className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
        <LockSimpleIcon size={16} weight="regular" aria-hidden />
        Pin yourself to see how to reach {state.pin.displayName}
      </p>
    </>
  );
}

export function PinCard({ state, onClose }: { state: State; onClose: () => void }) {
  const open = state.status !== "idle";

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.aside
          key="pin-card"
          role="dialog"
          aria-label="Person on the map"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={ENTER}
          className="pointer-events-auto absolute inset-x-4 bottom-4 z-10 max-w-sm rounded-sheet bg-bg-surface p-5 shadow-lg sm:inset-x-auto sm:left-6 sm:bottom-6"
        >
          <div className="mb-3 flex items-start justify-between">
            <TagHole />
            <Button variant="icon" onClick={onClose} aria-label="Close">
              <XIcon size={18} weight="regular" aria-hidden />
            </Button>
          </div>
          <CardBody state={state} />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
