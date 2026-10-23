"use client";

import { useCallback, useState } from "react";
import { SiteFrame } from "@/components/ui/SiteFrame";
import MapCanvas from "./MapCanvas";
import { MarkerLegend } from "./MarkerLegend";
import type { MarkerGroup } from "./pin-layers";
import { SHOW_EVERYTHING, type Shown } from "./useMarkerVisibility";
import { useSignIn } from "./useSignIn";
import type { AnchorPlace } from "@/lib/pins/types";
import { useSession } from "@/lib/supabase/useSession";

/**
 * The full map. Anybody can look; signing in is what lets you add yourself,
 * message people and post gatherings, and it happens in a panel on the map
 * rather than on a page of its own.
 */
export function MapScreen({ anchors }: { anchors: AnchorPlace[] }) {
  const session = useSession();
  const signIn = useSignIn(session);
  const [shown, setShown] = useState<Shown>(SHOW_EVERYTHING);
  const toggle = useCallback(
    (group: MarkerGroup) => setShown((current) => ({ ...current, [group]: !current[group] })),
    [],
  );

  return (
    <SiteFrame fit="screen" footer={<MarkerLegend shown={shown} onToggle={toggle} />}>
      <main className="relative h-full w-full overflow-hidden">
        <MapCanvas anchors={anchors} shown={shown} session={session} variant={{ kind: "full", signIn }} />
      </main>
    </SiteFrame>
  );
}
