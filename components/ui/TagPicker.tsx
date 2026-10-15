"use client";

import { CheckIcon } from "@phosphor-icons/react";
import type { Term } from "@/lib/vocabulary";

type Props<Id extends string> = {
  legend: string;
  options: readonly Term<Id>[];
  selected: readonly string[];
  onToggle: (id: Id) => void;
};

/**
 * Checkboxes wearing chips. The native input keeps the label, the keyboard and
 * the announcement; the styling only changes what the box looks like. Selected
 * carries a tick as well as a fill, so the state does not rest on colour alone.
 */
export function TagPicker<Id extends string>({ legend, options, selected, onToggle }: Props<Id>) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium text-text-primary">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-focus-ring ${
                on
                  ? "bg-bg-inverse text-text-inverse"
                  : "bg-bg-sunken text-text-body hover:bg-paper-300"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(option.id)}
                className="sr-only"
              />
              {on ? <CheckIcon size={13} weight="bold" aria-hidden /> : null}
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
