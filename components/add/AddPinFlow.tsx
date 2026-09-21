"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { authIsAvailable } from "@/lib/supabase/browser";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { PlacementGhost } from "./PlacementGhost";
import { DescribeStep, DoneStep, PlacementStep, SentStep, SignInStep } from "./steps";
import { useAddPin, type AddPinFlowState, type Step } from "./useAddPin";

type OpenStep = Exclude<Step, "closed">;

const LABELS: Record<OpenStep, string> = {
  placing: "Choose where your tag goes",
  describing: "Describe yourself",
  signingIn: "Confirm your email",
  sent: "Check your email",
  done: "You are on the map",
};

/** One entry per step, so adding a step never adds a branch to the component. */
function stepViews(flow: AddPinFlowState): Record<OpenStep, ReactNode> {
  return {
    placing: (
      <PlacementStep
        onLocate={flow.locate}
        onConfirm={flow.confirmPlacement}
        onCancel={flow.close}
        locating={flow.busy}
      />
    ),
    describing: (
      <DescribeStep
        displayName={flow.details.displayName}
        neighborhood={flow.details.neighborhood}
        note={flow.details.note}
        onChange={flow.patchDetails}
        onBack={flow.back}
        onSubmit={flow.submit}
        submitLabel={authIsAvailable ? "Continue" : "Add me to the map"}
        saving={flow.busy}
        error={flow.error}
      />
    ),
    signingIn: (
      <SignInStep
        email={flow.email}
        onChange={flow.setEmail}
        onSend={flow.sendLink}
        onBack={flow.backToDetails}
        sending={flow.busy}
        error={flow.error}
      />
    ),
    sent: <SentStep email={flow.email} onClose={flow.close} />,
    done: <DoneStep name={flow.details.displayName} onClose={flow.close} />,
  };
}

type Props = { map: MapLibreMap | null; onPlanted: () => void; onOpen: () => void };

export function AddPinFlow({ map, onPlanted, onOpen }: Props) {
  const flow = useAddPin(map, onPlanted);
  useEscapeKey(flow.step !== "closed", flow.close);

  if (flow.step === "closed") {
    return (
      <div className="pointer-events-auto absolute right-4 bottom-4 z-10 sm:right-6 sm:bottom-6">
        <Button
          onClick={() => {
            onOpen();
            flow.open();
          }}
        >
          <PlusIcon size={16} weight="bold" aria-hidden />
          Add your pin
        </Button>
      </div>
    );
  }

  return (
    <>
      {flow.step === "placing" ? <PlacementGhost /> : null}
      <Panel label={LABELS[flow.step]} focusKey={flow.step}>
        {/* Keyed so each step fades in on mount. No exit animation, because a
            step must never wait on one finishing to become visible. */}
        <motion.div
          key={flow.step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
        >
          {stepViews(flow)[flow.step]}
        </motion.div>
      </Panel>
    </>
  );
}
