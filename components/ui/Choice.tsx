"use client";

import { useId } from "react";

export type Option<T extends string> = {
  value: T;
  label: string;
  detail: string;
};

type Props<T extends string> = {
  legend: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
};

/**
 * Radios rather than a toggle, because each option carries a consequence that
 * has to be readable before it is chosen. Native inputs keep the arrow keys,
 * the grouping and the announcement without any of it being rebuilt.
 */
export function Choice<T extends string>({ legend, value, options, onChange }: Props<T>) {
  const name = useId();

  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 block text-sm font-medium text-text-primary">{legend}</legend>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer gap-2.5 rounded-control p-2.5 transition-colors duration-150 ${
              selected ? "bg-bg-sunken" : "hover:bg-bg-hover"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 shrink-0 accent-paper-900"
            />
            <span className="block">
              <span className="block text-[0.9375rem] font-medium text-text-primary">{option.label}</span>
              <span className="mt-0.5 block text-sm leading-snug text-text-secondary">{option.detail}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
