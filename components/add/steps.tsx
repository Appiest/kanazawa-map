"use client";

import { CheckCircleIcon, CrosshairIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Choice, type Option } from "@/components/ui/Choice";
import { TagPicker } from "@/components/ui/TagPicker";
import { INTERESTS, MIN_INTERESTS, type InterestId } from "@/lib/interests";
import { CONNECTIONS, MIN_CONNECTIONS, type ConnectionId } from "@/lib/connections";
import { Field } from "@/components/ui/Field";
import type { ChosenPrecision } from "@/lib/pins/repository";
import type { Surroundings } from "./usePlacement";

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
        Nobody sees this spot. Your tag goes on the middle of your city or region, whichever you
        pick.
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

export function ConnectionStep({
  selected,
  onToggle,
  onBack,
  onNext,
}: {
  selected: readonly string[];
  onToggle: (id: ConnectionId) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const enough = selected.length >= MIN_CONNECTIONS;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (enough) onNext();
      }}
    >
      <h2 className="text-xl font-semibold text-text-primary">How are you connected to Japan?</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        Pick all that are true. This shows on your pin.
      </p>
      <div className="mt-4">
        <TagPicker legend="Your connection" options={CONNECTIONS} selected={selected} onToggle={onToggle} />
      </div>
      <StepActions primary="Next" disabled={!enough} onBack={onBack} backLabel="Move my tag" missing={enough ? null : "Pick at least one"} />
    </form>
  );
}

/** Named for what each does to the map, not for how precise it sounds. */
function precisionOptions(surroundings: Surroundings): Option<ChosenPrecision>[] {
  const options: Option<ChosenPrecision>[] = [];
  if (surroundings.city) {
    options.push({
      value: "city",
      label: surroundings.city.name,
      detail: "Your tag sits in the middle of your city.",
    });
  }
  if (surroundings.region) {
    options.push({
      value: "region",
      label: surroundings.region.name,
      detail: "Your tag sits in the middle of the wider region, so you are harder to place.",
    });
  }
  return options;
}

function PlaceChoice({
  surroundings,
  precision,
  onChoose,
}: {
  surroundings: Surroundings | null;
  precision: ChosenPrecision;
  onChoose: (precision: ChosenPrecision) => void;
}) {
  if (!surroundings) {
    return <p role="status" className="text-sm text-text-secondary">Finding your city</p>;
  }

  const options = precisionOptions(surroundings);
  if (options.length === 0) {
    return (
      <p role="alert" className="text-sm text-clay-700">
        We could not work out which city that is. Move your tag a little and try again.
      </p>
    );
  }

  return <Choice legend="Where your tag sits" value={precision} options={options} onChange={onChoose} />;
}

type DescribeValues = {
  displayName: string;
  neighborhood: string;
  precision: ChosenPrecision;
  surroundings: Surroundings | null;
  onChange: (patch: { displayName?: string; neighborhood?: string }) => void;
  onChoosePrecision: (precision: ChosenPrecision) => void;
};

function DescribeFields(props: DescribeValues) {
  return (
    <>
      <Field
        label="Name"
        value={props.displayName}
        onChange={(value) => props.onChange({ displayName: value })}
        placeholder="Mika"
        autoFocus
        required
        maxLength={40}
        autoComplete="given-name"
      />
      <PlaceChoice surroundings={props.surroundings} precision={props.precision} onChoose={props.onChoosePrecision} />
      <Field
        label="Place name on your pin"
        value={props.neighborhood}
        onChange={(value) => props.onChange({ neighborhood: value })}
        placeholder="East Bay"
        hint="Rename it if people call it something else, like East Bay."
        required
        maxLength={60}
      />
    </>
  );
}

export function DescribeStep({
  onBack,
  onSubmit,
  saving,
  error,
  ...values
}: DescribeValues & {
  onBack: () => void;
  onSubmit: () => void;
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
        <DescribeFields {...values} />
      </div>
      <ErrorLine error={error} />
      {/* Kept enabled so the browser can point at the empty field and say
          why, rather than leaving a dead button with no explanation. */}
      <StepActions primary={saving ? "Saving" : "Next"} disabled={saving} onBack={onBack} backLabel="Back" missing={null} />
    </form>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-3 text-sm text-clay-700">
      {error}
    </p>
  );
}

function StepActions({
  primary,
  disabled,
  onBack,
  backLabel,
  missing,
}: {
  primary: string;
  disabled: boolean;
  onBack: () => void;
  backLabel: string;
  missing: string | null;
}) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <Button type="submit" disabled={disabled}>
        {primary}
      </Button>
      <Button variant="quiet" onClick={onBack}>
        {backLabel}
      </Button>
      {missing ? <span className="text-sm text-text-secondary">{missing}</span> : null}
    </div>
  );
}

export function InterestsStep({
  selected,
  note,
  onToggle,
  onNoteChange,
  onBack,
  onSubmit,
  saving,
  error,
}: {
  selected: readonly string[];
  note: string;
  onToggle: (id: InterestId) => void;
  onNoteChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
}) {
  const enough = selected.length >= MIN_INTERESTS;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (enough) onSubmit();
      }}
    >
      <h2 className="text-xl font-semibold text-text-primary">
        What parts of Japanese culture are you interested in?
      </h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        Pick whatever you would happily talk about. People can filter the map by these to find you.
      </p>
      <div className="mt-4 max-h-[42vh] space-y-4 overflow-y-auto pr-1">
        <TagPicker legend="Your interests" options={INTERESTS} selected={selected} onToggle={onToggle} />
        {/* After the tags, so nobody writes out something the tags already
            say and only then finds out they were there. */}
        <Field
          label="Anything the tags do not cover"
          value={note}
          onChange={onNoteChange}
          placeholder="Second gen, still working on my Japanese. Happy to practice with anyone."
          hint="Optional. This shows on your pin."
          maxLength={180}
          multiline
        />
      </div>
      <ErrorLine error={error} />
      <StepActions
        primary={saving ? "Saving" : "Add me to the map"}
        disabled={!enough || saving}
        onBack={onBack}
        backLabel="Back"
        missing={enough ? null : "Pick at least one"}
      />
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
