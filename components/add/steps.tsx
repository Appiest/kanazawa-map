"use client";

import { CheckCircleIcon, CrosshairIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

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
        Anyone visiting the map sees this exact spot, so many people pick a nearby corner or cafe
        rather than their home.
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

export function DescribeStep({
  displayName,
  neighborhood,
  note,
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
  onChange: (patch: { displayName?: string; neighborhood?: string; note?: string }) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel: string;
  saving: boolean;
  error: string | null;
}) {
  const ready = displayName.trim().length > 0 && neighborhood.trim().length > 0;

  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Tell people who they are meeting</h2>
      <div className="mt-4 space-y-3">
        <Field
          label="Name"
          value={displayName}
          onChange={(value) => onChange({ displayName: value })}
          placeholder="Mika"
          autoFocus
          maxLength={40}
        />
        <Field
          label="Neighborhood"
          value={neighborhood}
          onChange={(value) => onChange({ neighborhood: value })}
          placeholder="Sawtelle"
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
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-clay-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onSubmit} disabled={!ready || saving}>
          {saving ? "Saving" : submitLabel}
        </Button>
        <Button variant="quiet" onClick={onBack}>
          Move my tag
        </Button>
      </div>
    </>
  );
}

export function SignInStep({
  email,
  onChange,
  onSend,
  onBack,
  sending,
  error,
}: {
  email: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onBack: () => void;
  sending: boolean;
  error: string | null;
}) {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Confirm it is you</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        We send a link that signs you in. It also lets you edit or remove your pin later.
      </p>
      <div className="mt-4">
        <Field
          label="Email"
          value={email}
          onChange={onChange}
          placeholder="name@example.com"
          hint="Kept private. Only people who are on the map can ask to reach you."
          autoFocus
        />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-clay-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onSend} disabled={!email.includes("@") || sending}>
          <EnvelopeSimpleIcon size={16} weight="regular" aria-hidden />
          {sending ? "Sending" : "Send my link"}
        </Button>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>
    </>
  );
}

export function SentStep({ email, onClose }: { email: string; onClose: () => void }) {
  return (
    <>
      <h2 className="text-xl font-semibold text-text-primary">Check your email</h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-text-body">
        A sign-in link is on its way to {email}. Open it and your pin goes up.
      </p>
      <div className="mt-4">
        <Button onClick={onClose}>Done</Button>
      </div>
    </>
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
