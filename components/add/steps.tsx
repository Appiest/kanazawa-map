"use client";

import { CheckCircleIcon, CrosshairIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Choice, type Option } from "@/components/ui/Choice";
import { Field } from "@/components/ui/Field";
import type { Precision } from "@/lib/pins/repository";

export function PlacementStep({
  onLocate,
  onConfirm,
  onCancel,
  locating,
}: {
  onLocate: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  locating: boolean;
}) {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Put yourself on the map</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        Move the map until the tag sits where you want to be found.
      </p>
      <p className="mt-3 border-t border-separator pt-3 text-sm text-text-secondary">
        Nobody sees this exact spot unless you ask for that on the next step. By default your tag
        sits on the neighborhood.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onConfirm}>Place my tag here</Button>
        <Button variant="quiet" onClick={onLocate} disabled={locating}>
          <CrosshairIcon size={16} weight="regular" aria-hidden />
          {locating ? "Finding you" : "Find me"}
        </Button>
        <Button variant="quiet" onClick={onCancel} className="ml-auto">
          Cancel
        </Button>
      </div>
    </>
  );
}

/** Named for what each does to the map, not for how precise it sounds. */
function precisionOptions(neighborhood: string): readonly Option<Precision>[] {
  const place = neighborhood.trim() || "your neighborhood";
  return [
    {
      value: "neighborhood",
      label: `Somewhere in ${place}`,
      detail: "Your tag sits on the neighborhood. Nobody can tell which street.",
    },
    {
      value: "exact",
      label: "The exact spot I picked",
      detail: "Your tag sits where you placed it, for anyone on the map to see.",
    },
  ];
}

type DescribeValues = {
  displayName: string;
  neighborhood: string;
  note: string;
  precision: Precision;
  onChange: (patch: {
    displayName?: string;
    neighborhood?: string;
    note?: string;
    precision?: Precision;
  }) => void;
};

function DescribeFields({ displayName, neighborhood, note, precision, onChange }: DescribeValues) {
  return (
    <>
      <Field
        label="Name"
        value={displayName}
        onChange={(value) => onChange({ displayName: value })}
        placeholder="Mika"
        autoFocus
        required
        maxLength={40}
        autoComplete="given-name"
      />
      <Field
        label="Neighborhood"
        value={neighborhood}
        onChange={(value) => onChange({ neighborhood: value })}
        placeholder="Sawtelle"
        required
        maxLength={60}
      />
      <Field
        label="A line about you"
        value={note}
        onChange={(value) => onChange({ note: value })}
        placeholder="Looking for a taiko group that takes beginners."
        hint="Optional. What you are into, or what you are looking for."
        maxLength={180}
        multiline
      />
      <Choice
        legend="Where your tag sits"
        value={precision}
        options={precisionOptions(neighborhood)}
        onChange={(value) => onChange({ precision: value })}
      />
    </>
  );
}

export function DescribeStep({
  displayName,
  neighborhood,
  note,
  precision,
  onChange,
  onBack,
  onSubmit,
  submitLabel,
  saving,
  error,
}: {
  displayName: string;
  neighborhood: string;
  note: string;
  precision: Precision;
  onChange: (patch: {
    displayName?: string;
    neighborhood?: string;
    note?: string;
    precision?: Precision;
  }) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel: string;
  saving: boolean;
  error: string | null;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h2 className="text-xl font-semibold text-text-primary">Tell people who they are meeting</h2>
      <div className="mt-4 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
        <DescribeFields
          displayName={displayName}
          neighborhood={neighborhood}
          note={note}
          precision={precision}
          onChange={onChange}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-clay-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        {/* Kept enabled so the browser can point at the empty field and say
            why, rather than leaving a dead button with no explanation. */}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving" : submitLabel}
        </Button>
        <Button variant="quiet" onClick={onBack}>
          Move my tag
        </Button>
      </div>
    </form>
  );
}

export function DoneStep({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-text-primary">
        <CheckCircleIcon size={22} weight="fill" aria-hidden className="text-person" />
        You are on the map
      </h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        Welcome, {name}. Open a nearby tag to see who else is around.
      </p>
      <div className="mt-4">
        <Button onClick={onClose}>Look around</Button>
      </div>
    </>
  );
}
