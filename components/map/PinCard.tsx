"use client";

import { AnimatePresence } from "motion/react";
import { LockSimpleIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Panel, TagHole } from "@/components/ui/Panel";
import type { PinDetail } from "@/lib/pins/repository";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; pin: PinDetail }
  | { status: "error" };

function CardBody({ state }: { state: State }) {
  if (state.status === "loading") {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-7 w-32 rounded bg-bg-sunken" />
        <div className="h-4 w-24 rounded bg-bg-sunken" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-sm text-text-secondary">
        That pin would not load. Check your connection and try again.
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
      <p className="mt-3 flex items-start gap-2 text-sm text-text-secondary">
        <LockSimpleIcon size={16} weight="regular" aria-hidden className="mt-0.5 shrink-0" />
        Add your own pin to see how to reach {state.pin.displayName}
      </p>
    </>
  );
}

export function PinCard({ state, onClose }: { state: State; onClose: () => void }) {
  return (
    <AnimatePresence initial={false}>
      {state.status !== "idle" ? (
        <Panel key="pin-card" label="Person on the map">
          <div className="mb-3 flex items-start justify-between">
            <TagHole />
            <Button variant="icon" onClick={onClose} aria-label="Close">
              <XIcon size={18} weight="regular" aria-hidden />
            </Button>
          </div>
          <CardBody state={state} />
        </Panel>
      ) : null}
    </AnimatePresence>
  );
}
