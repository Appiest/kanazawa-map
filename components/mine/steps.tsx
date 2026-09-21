"use client";

import { TrashSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type { OwnPin } from "@/lib/pins/repository";

const QUIET_LINK = "text-text-secondary underline decoration-paper-400 underline-offset-2";

export function SummaryStep({
  pin,
  onEdit,
  onMove,
  onRemove,
  onSignOut,
  onClose,
}: {
  pin: OwnPin;
  onEdit: () => void;
  onMove: () => void;
  onRemove: () => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <h2 className="text-2xl font-semibold text-text-primary">{pin.displayName}</h2>
      <p className="text-sm text-text-secondary">{pin.neighborhood}</p>
      {pin.note ? (
        <p className="mt-3 border-t border-separator pt-3 text-[0.9375rem] leading-relaxed text-text-body">
          {pin.note}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={onEdit}>Edit details</Button>
        <Button variant="quiet" onClick={onMove}>
          Move my tag
        </Button>
        <Button variant="quiet" onClick={onClose} className="ml-auto">
          Close
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm">
        <button type="button" onClick={onRemove} className={QUIET_LINK + " hover:text-clay-700"}>
          Take myself off the map
        </button>
        <button type="button" onClick={onSignOut} className={QUIET_LINK + " hover:text-text-primary"}>
          Sign out
        </button>
      </div>
    </>
  );
}

export type EditValues = {
  displayName: string;
  neighborhood: string;
  note: string;
  instagram: string;
  website: string;
};

export function EditStep({
  values,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
}: {
  values: EditValues;
  onChange: (patch: Partial<EditValues>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <h2 className="text-xl font-semibold text-text-primary">Edit your details</h2>
      <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
        <Field
          label="Name"
          value={values.displayName}
          onChange={(v) => onChange({ displayName: v })}
          required
          maxLength={40}
        />
        <Field
          label="Neighborhood"
          value={values.neighborhood}
          onChange={(v) => onChange({ neighborhood: v })}
          required
          maxLength={60}
        />
        <Field
          label="A line about you"
          value={values.note}
          onChange={(v) => onChange({ note: v })}
          maxLength={180}
          multiline
        />
        <Field
          label="Instagram"
          value={values.instagram}
          onChange={(v) => onChange({ instagram: v })}
          placeholder="yourhandle"
          hint="Optional. Shown to people who are on the map."
          maxLength={30}
        />
        <Field
          label="Website"
          value={values.website}
          onChange={(v) => onChange({ website: v })}
          placeholder="example.com"
          type="url"
          inputMode="url"
          maxLength={200}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-clay-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving" : "Save changes"}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function MoveStep({ onConfirm, onCancel, saving }: { onConfirm: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Move your tag</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        Move the map until the tag sits where you want to be found.
      </p>
      <p className="mt-3 border-t border-separator pt-3 text-sm text-text-secondary">
        Your tag keeps the precision it has now. Change that under Edit details.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onConfirm} disabled={saving}>
          {saving ? "Saving" : "Place my tag here"}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}

export function RemoveStep({
  onConfirm,
  onCancel,
  removing,
  error,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  removing: boolean;
  error: string | null;
}) {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Take yourself off the map?</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        Your tag comes down and your contact details are deleted. You can add a new pin whenever you
        like.
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-clay-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        {/* The accent marks the action rather than filling it: controls stay in
            the neutral ramp, and the heading already states the consequence. */}
        <Button onClick={onConfirm} disabled={removing}>
          <TrashSimpleIcon size={16} weight="regular" aria-hidden className="text-clay-500" />
          {removing ? "Removing" : "Remove my pin"}
        </Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}
