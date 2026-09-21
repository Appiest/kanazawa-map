"use client";

import { APP_NAME } from "@/lib/config";

type Props = {
  count: number | null;
  visible: number | null;
  error: string | null;
  ready: boolean;
};

const QUIET = "text-text-secondary";

/**
 * Whichever of these is true right now, or nothing. An empty view is the one
 * people will meet most at first, and it has to read as early rather than
 * broken, so it says where the map is not empty instead of only what is
 * missing.
 */
function statusMessage({ count, visible, error, ready }: Props): { text: string; tone: string } | null {
  if (error) return { text: "The pins would not load. Check your connection and refresh.", tone: "text-clay-700" };
  if (!ready) return { text: "Loading the map", tone: "text-text-secondary" };
  if (count === 0) return { text: "Nobody has added themselves yet. You can be first.", tone: "text-person-text" };
  if (visible === 0) return { text: "Nobody here yet. Add your pin, or zoom out to find people.", tone: QUIET };
  return null;
}

/**
 * Sits on the paper rather than on a card, the way a title sits on a printed
 * map. It is the only thing telling a first-time visitor what this is, so it
 * stays to a name, one sentence, and whatever the map is doing.
 */
export function MapHeader(props: Props) {
  const status = statusMessage(props);

  return (
    <header className="pointer-events-none absolute top-4 left-4 z-10 max-w-[min(19rem,calc(100vw-7rem))] sm:top-6 sm:left-6">
      <h1 className="text-lg font-semibold text-text-primary">{APP_NAME}</h1>
      <p className="mt-0.5 text-sm leading-snug text-text-secondary">
        Find Asian Americans near you, and let them find you.
      </p>
      {/* The region stays in the document so a later message is announced.
          Swapping the element in and out can leave a screen reader silent. */}
      <p role="status" className={`mt-2 text-sm leading-snug ${status ? status.tone : ""}`}>
        {status?.text ?? ""}
      </p>
    </header>
  );
}
