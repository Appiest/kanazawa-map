"use client";

import { FunnelIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TagPicker } from "@/components/ui/TagPicker";
import { labelFor, type InterestId } from "@/lib/interests";
import { useEscapeKey } from "@/lib/useEscapeKey";

/** Names the one thing being filtered, or counts them. */
function summarise(selected: InterestId[]): string {
  if (selected.length === 0) return "Filter by interest";
  if (selected.length === 1) return labelFor(selected[0]);
  return `${selected.length} interests`;
}

type ButtonProps = {
  selected: InterestId[];
  onOpen: () => void;
  onClear: () => void;
};

/**
 * Sits under the title, because it describes what the map is showing. When a
 * filter is on the button says which, so the map never quietly hides people
 * with nothing on screen to explain it.
 *
 * Only the button belongs in the header. The header is positioned, so a panel
 * rendered inside it would lay itself out against that little box in the
 * corner rather than against the map.
 */
export function InterestFilterButton({ selected, onOpen, onClear }: ButtonProps) {
  const summary = summarise(selected);
  const filtering = selected.length > 0;

  return (
    <div className="pointer-events-auto mt-3 flex max-w-full items-center gap-2" data-touch-target>
      <Button
        variant="quiet"
        onClick={onOpen}
        className={`min-w-0 ${filtering ? "bg-bg-inverse text-text-inverse" : "bg-bg-surface shadow-sm"}`}
        aria-label={filtering ? `Filtering by ${summary}. Change it` : "Filter the map by interest"}
      >
        <FunnelIcon size={15} weight={filtering ? "fill" : "regular"} aria-hidden className="shrink-0" />
        <span className="truncate">{summary}</span>
      </Button>

      {filtering ? (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-full bg-bg-surface p-1.5 text-text-secondary shadow-sm hover:text-text-primary"
          aria-label="Show everyone again"
        >
          <XIcon size={14} weight="bold" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

type PanelProps = {
  selected: InterestId[];
  onToggle: (id: InterestId) => void;
  onClear: () => void;
  onClose: () => void;
};

/** Rendered beside the map's other panels, not inside the header. */
export function InterestFilterPanel({ selected, onToggle, onClear, onClose }: PanelProps) {
  useEscapeKey(true, onClose);

  return (
    <Panel label="Filter the map by interest">
      <div className="mb-3 flex items-start justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Show people into</h2>
        <Button variant="icon" onClick={onClose} aria-label="Close">
          <XIcon size={18} weight="regular" aria-hidden />
        </Button>
      </div>
      <div className="max-h-[46vh] overflow-y-auto pr-1">
        <TagPicker legend="Interests" selected={selected} onToggle={onToggle} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={onClose}>Show these</Button>
        {selected.length > 0 ? (
          <Button variant="quiet" onClick={onClear}>
            Show everyone
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
