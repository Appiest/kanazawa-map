"use client";

import { MarkerGlyph } from "@/components/ui/MarkerGlyph";
import type { MarkerKind } from "@/styles/markers";
import type { MarkerGroup } from "./pin-layers";
import type { Shown } from "./useMarkerVisibility";

const GROUPS: { group: MarkerGroup; label: string; marker: MarkerKind }[] = [
  { group: "people", label: "People", marker: "person" },
  { group: "places", label: "Places", marker: "place" },
  { group: "events", label: "Events", marker: "event" },
];

/**
 * Says what each kind of marker is, and doubles as the switch for it. A group
 * that is switched off loses its fill and its colour, and its name is struck
 * through, so the state never rests on one cue.
 */
export function MarkerLegend({ shown, onToggle }: { shown: Shown; onToggle: (group: MarkerGroup) => void }) {
  return (
    <ul className="flex items-center gap-1 sm:gap-3" aria-label="Markers on the map">
      {GROUPS.map(({ group, label, marker }) => {
        const on = shown[group];
        return (
          <li key={group}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(group)}
              className={`flex h-10 items-center gap-2 rounded-full pr-4 pl-3 text-[0.9375rem] font-medium transition-[background-color,color,scale] duration-150 ease-press active:scale-[0.96] ${
                on ? "bg-frame-raised text-frame-text" : "text-frame-text-muted line-through hover:bg-frame-raised/50"
              }`}
            >
              <MarkerGlyph
                kind={marker}
                height={20}
                className={`transition-[filter,opacity] duration-150 ${on ? "" : "opacity-50 grayscale"}`}
              />
              {label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
