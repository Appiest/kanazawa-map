"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { CalendarPlusIcon } from "@phosphor-icons/react";
import { PlacementGhost } from "@/components/add/PlacementGhost";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import type { NewGathering } from "@/lib/gatherings/repository";
import { useEscapeKey } from "@/lib/useEscapeKey";

type Step = "closed" | "placing" | "describing" | "done";

type Values = { title: string; place: string; note: string; when: string };

const EMPTY: Values = { title: "", place: "", note: "", when: "" };

/** Two hours from now, rounded to the hour: the most likely thing somebody means. */
function defaultWhen(): string {
  const at = new Date(Date.now() + 2 * 3600000);
  at.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

type Props = {
  map: MapLibreMap | null;
  onPost: (gathering: NewGathering) => Promise<void>;
  onOpen: () => void;
};

export function GatheringFlow({ map, onPost, onOpen }: Props) {
  const [step, setStep] = useState<Step>("closed");
  const [values, setValues] = useState<Values>(EMPTY);
  const [point, setPoint] = useState<{ lng: number; lat: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(step !== "closed", () => setStep("closed"));

  const patch = (next: Partial<Values>) => setValues((current) => ({ ...current, ...next }));

  const start = () => {
    onOpen();
    setValues({ ...EMPTY, when: defaultWhen() });
    setStep("placing");
  };

  const placeHere = () => {
    const centre = map?.getCenter();
    if (!centre) return;
    setPoint({ lng: centre.lng, lat: centre.lat });
    setStep("describing");
  };

  const submit = async () => {
    if (!point) return;
    setBusy(true);
    setError(null);
    try {
      await onPost({
        title: values.title.trim(),
        place: values.place.trim(),
        note: values.note.trim() || null,
        lng: point.lng,
        lat: point.lat,
        startsAt: new Date(values.when).toISOString(),
      });
      setStep("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not post that");
    } finally {
      setBusy(false);
    }
  };

  if (step === "closed") {
    return (
      <div className="pointer-events-auto absolute right-4 bottom-20 z-10 sm:right-6 sm:bottom-24" data-touch-target>
        <Button variant="quiet" onClick={start} className="bg-bg-surface shadow-sm">
          <CalendarPlusIcon size={16} weight="regular" aria-hidden />
          Post a gathering
        </Button>
      </div>
    );
  }

  return (
    <>
      {step === "placing" ? <PlacementGhost /> : null}
      <Panel label="Post a gathering" focusKey={step}>
        <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
          {step === "placing" ? (
            <PlaceStep onConfirm={placeHere} onCancel={() => setStep("closed")} />
          ) : null}
          {step === "describing" ? (
            <DetailsStep
              values={values}
              onChange={patch}
              onSubmit={submit}
              onBack={() => setStep("placing")}
              busy={busy}
              error={error}
            />
          ) : null}
          {step === "done" ? <DoneStep onClose={() => setStep("closed")} /> : null}
        </motion.div>
      </Panel>
    </>
  );
}

function PlaceStep({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Where are you going to be?</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        Move the map to the cafe, park or hall. Everyone on the map can see a gathering and the spot
        it names, so pick somewhere public.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onConfirm}>This spot</Button>
        <Button variant="quiet" onClick={onCancel} className="ml-auto">
          Cancel
        </Button>
      </div>
    </>
  );
}

function DetailsStep({
  values,
  onChange,
  onSubmit,
  onBack,
  busy,
  error,
}: {
  values: Values;
  onChange: (patch: Partial<Values>) => void;
  onSubmit: () => void;
  onBack: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h2 className="text-xl font-semibold text-text-primary">What is happening?</h2>
      <div className="mt-4 max-h-[48vh] space-y-3 overflow-y-auto pr-1">
        <Field
          label="What it is"
          value={values.title}
          onChange={(v) => onChange({ title: v })}
          placeholder="Coffee and a chat"
          required
          autoFocus
          maxLength={80}
        />
        <Field
          label="Where to find you"
          value={values.place}
          onChange={(v) => onChange({ place: v })}
          placeholder="Tsujita, the back tables"
          required
          maxLength={80}
        />
        <div className="space-y-1.5">
          <label htmlFor="gathering-when" className="block text-sm font-medium text-text-primary">
            When
          </label>
          <input
            id="gathering-when"
            type="datetime-local"
            required
            value={values.when}
            onChange={(event) => onChange({ when: event.target.value })}
            className="w-full rounded-control border border-field-border bg-bg-surface px-3 py-2 text-[0.9375rem] text-text-primary focus:border-paper-600 focus:outline-none"
          />
        </div>
        <Field
          label="Anything else"
          value={values.note}
          onChange={(v) => onChange({ note: v })}
          placeholder="I'll have a green tote bag. Come say hi."
          hint="Optional."
          maxLength={280}
          multiline
        />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-clay-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Posting" : "Post it"}
        </Button>
        <Button variant="quiet" onClick={onBack}>
          Move it
        </Button>
      </div>
    </form>
  );
}

function DoneStep({ onClose }: { onClose: () => void }) {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">It is on the map</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        It disappears on its own once the time passes. You can call it off from your own pin.
      </p>
      <div className="mt-4">
        <Button onClick={onClose}>Done</Button>
      </div>
    </>
  );
}
