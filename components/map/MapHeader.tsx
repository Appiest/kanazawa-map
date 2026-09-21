"use client";

import { APP_NAME } from "@/lib/config";

type Props = {
  count: number | null;
  error: string | null;
  ready: boolean;
};

/** One line under the title, for whichever of these is true right now. */
function Status({ count, error, ready }: Props) {
  if (error) {
    return (
      <p role="status" className="mt-2 text-sm leading-snug text-clay-700">
        The pins would not load. Check your connection and refresh.
      </p>
    );
  }

  if (!ready) {
    return (
      <p role="status" className="mt-2 text-sm leading-snug text-text-secondary">
        Loading the map
      </p>
    );
  }

  if (count === 0) {
    return (
      <p role="status" className="mt-2 text-sm leading-snug text-person-text">
        Nobody has added themselves yet. You can be first.
      </p>
    );
  }

  return null;
}

/**
 * Sits on the paper rather than on a card, the way a title sits on a printed
 * map. It is the only thing telling a first-time visitor what this is, so it
 * stays to a name, one sentence, and whatever the map is doing.
 */
export function MapHeader(props: Props) {
  return (
    <header className="pointer-events-none absolute top-4 left-4 z-10 max-w-[19rem] sm:top-6 sm:left-6">
      <h1 className="text-lg font-semibold text-text-primary">{APP_NAME}</h1>
      <p className="mt-0.5 text-sm leading-snug text-text-secondary">
        Find Asian Americans near you, and let them find you.
      </p>
      <Status {...props} />
    </header>
  );
}
