"use client";

import { useState } from "react";
import { FunnelIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TagPicker } from "@/components/ui/TagPicker";
import { labelFor, type InterestId } from "@/lib/interests";
import { useEscapeKey } from "@/lib/useEscapeKey";

type Props = {
  selected: InterestId[];
  onToggle: (id: InterestId) => void;
  onClear: () => void;
  onOpen: () => void;
};

/** Names the one thing being filtered, or counts them. */
function summarise(selected: InterestId[]): string {
  if (selected.length === 0) return "Filter by interest";
  if (selected.length === 1) return labelFor(selected[0]);
  return `${selected.length} interests`;
}

/**
 * Sits under the title rather than in a corner, because it describes what the
 * map is currently showing. When something is filtered the button says what,
 * so the map is never quietly hiding people with no explanation on screen.
 */
export function InterestFilter({ selected, onToggle, onClear, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  useEscapeKey(open, () => setOpen(false));

  const summary = summarise(selected);

  return (
    <>
      <div className="pointer-events-auto mt-3 flex items-center gap-2" data-touch-target>
        <Button
          variant="quiet"
          onClick={() => {
            onOpen();
            setOpen(true);
          }}
          className={selected.length > 0 ? "bg-bg-inverse text-text-inverse" : "bg-bg-surface shadow-sm"}
          aria-label={
            selected.length === 0 ? "Filter the map by interest" : `Filtering by ${summary}. Change it`
          }
        >
          <FunnelIcon size={15} weight={selected.length > 0 ? "fill" : "regular"} aria-hidden />
          {summary}
        </Button>

        {selected.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full bg-bg-surface p-1.5 text-text-secondary shadow-sm hover:text-text-primary"
            aria-label="Show everyone again"
          >
            <XIcon size={14} weight="bold" aria-hidden />
          </button>
        ) : null}
      </div>

      {open ? (
        <Panel label="Filter the map by interest">
          <div className="mb-3 flex items-start justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Show people into</h2>
            <Button variant="icon" onClick={() => setOpen(false)} aria-label="Close">
              <XIcon size={18} weight="regular" aria-hidden />
            </Button>
          </div>
          <div className="max-h-[46vh] overflow-y-auto pr-1">
            <TagPicker legend="Interests" selected={selected} onToggle={onToggle} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => setOpen(false)}>Show these</Button>
            {selected.length > 0 ? (
              <Button variant="quiet" onClick={onClear}>
                Show everyone
              </Button>
            ) : null}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
