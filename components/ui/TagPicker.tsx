"use client";

import { CheckIcon } from "@phosphor-icons/react";
import { INTERESTS, type InterestId } from "@/lib/interests";

type Props = {
  legend: string;
  selected: readonly string[];
  onToggle: (id: InterestId) => void;
};

/**
 * Checkboxes wearing chips. The native input keeps the label, the keyboard and
 * the announcement; the styling only changes what the box looks like. Selected
 * carries a tick as well as a fill, so the state does not rest on colour alone.
 */
export function TagPicker({ legend, selected, onToggle }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium text-text-primary">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((interest) => {
          const on = selected.includes(interest.id);
          return (
            <label
              key={interest.id}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ${
                on
                  ? "bg-bg-inverse text-text-inverse"
                  : "bg-bg-sunken text-text-body hover:bg-paper-300"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onToggle(interest.id)}
                className="sr-only"
              />
              {on ? <CheckIcon size={13} weight="bold" aria-hidden /> : null}
              {interest.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
