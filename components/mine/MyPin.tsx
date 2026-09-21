"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Panel } from "@/components/ui/Panel";
import { PlacementGhost } from "@/components/add/PlacementGhost";
import type { OwnPin } from "@/lib/pins/repository";
import type { useMyPin } from "@/lib/pins/useMyPin";
import { cameraDuration } from "@/lib/motion";
import { signOut } from "@/lib/supabase/browser";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { EditStep, MoveStep, RemoveStep, SummaryStep, type EditValues } from "./steps";

type Screen = "summary" | "editing" | "moving" | "removing";

const LABELS: Record<Screen, string> = {
  summary: "Your pin",
  editing: "Edit your details",
  moving: "Move your tag",
  removing: "Take yourself off the map",
};

function toValues(pin: OwnPin): EditValues {
  return {
    displayName: pin.displayName,
    neighborhood: pin.neighborhood,
    note: pin.note ?? "",
    instagram: pin.instagram ?? "",
    website: pin.website ?? "",
  };
}

const trimmed = (value: string) => value.trim() || null;

type Props = {
  pin: OwnPin;
  map: MapLibreMap | null;
  controls: ReturnType<typeof useMyPin>;
  onClose: () => void;
};

export function MyPin({ pin, map, controls, onClose }: Props) {
  const [screen, setScreen] = useState<Screen>("summary");
  const [values, setValues] = useState<EditValues>(() => toValues(pin));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(true, onClose);

  // Opening "Your pin" should show you where it is, not just describe it.
  useEffect(() => {
    if (!map) return;
    map.easeTo({ center: [pin.lng, pin.lat], zoom: Math.max(map.getZoom(), 12), duration: cameraDuration(700) });
  }, [map, pin.lng, pin.lat]);

  const run = useCallback(async (job: () => Promise<void>, after: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await job();
      after();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something did not save");
    } finally {
      setBusy(false);
    }
  }, []);

  const saveEdits = () =>
    run(async () => {
      await controls.saveDetails({
        displayName: values.displayName.trim(),
        neighborhood: values.neighborhood.trim(),
        note: trimmed(values.note),
        lng: pin.lng,
        lat: pin.lat,
        precision: pin.precision,
      });
      await controls.saveHandles({
        instagram: trimmed(values.instagram),
        website: trimmed(values.website),
      });
    }, () => setScreen("summary"));

  const saveMove = () =>
    run(async () => {
      const center = map?.getCenter();
      if (!center) throw new Error("The map is not ready yet");
      await controls.saveDetails({
        displayName: pin.displayName,
        neighborhood: pin.neighborhood,
        note: pin.note,
        lng: center.lng,
        lat: center.lat,
        precision: pin.precision,
      });
    }, () => setScreen("summary"));

  const confirmRemove = () => run(() => controls.remove(), onClose);

  const leave = () =>
    run(async () => {
      await signOut();
      controls.reload();
    }, onClose);

  return (
    <>
      {screen === "moving" ? <PlacementGhost /> : null}
      <Panel label={LABELS[screen]} focusKey={screen}>
        <motion.div key={screen} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
          {screenViews({ pin, values, setValues, setScreen, busy, error, onClose, onSignOut: leave, saveEdits, saveMove, confirmRemove })[screen]}
        </motion.div>
      </Panel>
    </>
  );
}

type ViewArgs = {
  pin: OwnPin;
  values: EditValues;
  setValues: (update: (current: EditValues) => EditValues) => void;
  setScreen: (screen: Screen) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSignOut: () => void;
  saveEdits: () => void;
  saveMove: () => void;
  confirmRemove: () => void;
};

/** One entry per screen, so adding one never adds a branch to the component. */
function screenViews(args: ViewArgs): Record<Screen, ReactNode> {
  const { pin, values, setValues, setScreen, busy, error, onClose } = args;
  return {
    summary: (
      <SummaryStep
        pin={pin}
        onEdit={() => setScreen("editing")}
        onMove={() => setScreen("moving")}
        onRemove={() => setScreen("removing")}
        onSignOut={args.onSignOut}
        onClose={onClose}
      />
    ),
    editing: (
      <EditStep
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        onSave={args.saveEdits}
        onCancel={() => setScreen("summary")}
        saving={busy}
        error={error}
      />
    ),
    moving: <MoveStep onConfirm={args.saveMove} onCancel={() => setScreen("summary")} saving={busy} />,
    removing: (
      <RemoveStep
        onConfirm={args.confirmRemove}
        onCancel={() => setScreen("summary")}
        removing={busy}
        error={error}
      />
    ),
  };
}
