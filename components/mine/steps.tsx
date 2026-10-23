"use client";

import { TrashSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { TagPicker } from "@/components/ui/TagPicker";
import { CONNECTIONS, type ConnectionId } from "@/lib/connections";
import { ConnectionLine } from "@/components/ui/ConnectionLine";
import { INTERESTS, type InterestId } from "@/lib/interests";
import type { ChosenPrecision, OwnPin } from "@/lib/pins/types";
import { toggled } from "@/lib/vocabulary";

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
      <ConnectionLine connections={pin.connections} />
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
  shareHandles: boolean;
  interests: InterestId[];
  connections: ConnectionId[];
};

function EditFields({
  values,
  onChange,
}: {
  values: EditValues;
  onChange: (patch: Partial<EditValues>) => void;
}) {
  return (
    <>
      <Field
        label="Name"
        value={values.displayName}
        onChange={(v) => onChange({ displayName: v })}
        required
        maxLength={40}
      />
      <Field
        label="Place name on your pin"
        value={values.neighborhood}
        onChange={(v) => onChange({ neighborhood: v })}
        required
        maxLength={60}
      />
      <TagPicker
        legend="How you are connected to Japan"
        options={CONNECTIONS}
        selected={values.connections}
        onToggle={(id) => onChange({ connections: toggled(values.connections, id) })}
      />
      <TagPicker
        legend="What you are into"
        options={INTERESTS}
        selected={values.interests}
        onToggle={(id) => onChange({ interests: toggled(values.interests, id) })}
      />
      {/* After the tags, so nobody writes out what the tags already say. */}
      <Field
        label="Anything the tags do not cover"
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
        maxLength={31}
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
      <Checkbox
        label="Show these to people on the map"
        detail="Off means only you see them. Your email is never shown either way."
        checked={values.shareHandles}
        onChange={(checked) => onChange({ shareHandles: checked })}
      />
    </>
  );
}

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
        <EditFields values={values} onChange={onChange} />
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

const MOVE_LANDS_ON: Record<ChosenPrecision, string> = {
  city: "Your tag goes on the middle of whichever city you move it to.",
  region: "Your tag goes on the middle of whichever region you move it to.",
};

export function MoveStep({
  level,
  onConfirm,
  onCancel,
  saving,
}: {
  level: ChosenPrecision;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Move your tag</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        Move the map until the tag sits where you want to be found.
      </p>
      <p className="mt-3 border-t border-separator pt-3 text-sm text-text-secondary">
        {MOVE_LANDS_ON[level]}
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
        Your tag comes down and your Instagram and website are deleted. You can add a new pin
        whenever you like.
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
