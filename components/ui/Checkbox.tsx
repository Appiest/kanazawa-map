"use client";

import { useId } from "react";

type Props = {
  label: string;
  detail?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** A native checkbox, so keyboard, grouping and announcement come for free. */
export function Checkbox({ label, detail, checked, onChange }: Props) {
  const detailId = useId();

  return (
    <label
      className={`flex cursor-pointer gap-2.5 rounded-control p-2.5 transition-colors duration-150 ${
        checked ? "bg-bg-sunken" : "hover:bg-bg-hover"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={detail ? detailId : undefined}
        className="mt-0.5 size-4 shrink-0 accent-paper-900"
      />
      <span className="block">
        <span className="block text-[0.9375rem] font-medium text-text-primary">{label}</span>
        {detail ? (
          <span id={detailId} className="mt-0.5 block text-sm leading-snug text-text-secondary">
            {detail}
          </span>
        ) : null}
      </span>
    </label>
  );
}
