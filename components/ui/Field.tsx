"use client";

import { useId } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  multiline?: boolean;
  autoFocus?: boolean;
};

/**
 * A thin neutral border on a rounded input is the one place a border and a
 * radius belong together; everything else here takes depth from shadow.
 */
const CONTROL =
  "w-full rounded-control border border-field-border bg-bg-surface px-3 py-2 text-[0.9375rem] " +
  "text-text-primary placeholder:text-text-disabled transition-[border-color] duration-150 " +
  "focus:border-paper-600 focus:outline-none";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  maxLength,
  multiline = false,
  autoFocus = false,
}: Props) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const shared = {
    id,
    value,
    placeholder,
    maxLength,
    autoFocus,
    "aria-describedby": hintId,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={3} className={`${CONTROL} resize-none`} />
      ) : (
        <input {...shared} type="text" className={CONTROL} />
      )}
      {hint ? (
        <p id={hintId} className="text-sm text-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
