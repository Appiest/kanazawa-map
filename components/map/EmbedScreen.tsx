"use client";

import MapCanvas from "./MapCanvas";
import { SHOW_EVERYTHING } from "./useMarkerVisibility";
import type { AnchorPlace } from "@/lib/pins/types";
import { useSession } from "@/lib/supabase/useSession";

const EMBED = { kind: "embed" } as const;

/** The map alone, for an iframe on the website. No frame, no editing. */
export function EmbedScreen({ anchors }: { anchors: AnchorPlace[] }) {
  const session = useSession();
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg-page">
      <MapCanvas anchors={anchors} shown={SHOW_EVERYTHING} session={session} variant={EMBED} />
    </main>
  );
}
