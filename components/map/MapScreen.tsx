"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFrame } from "@/components/ui/SiteFrame";
import MapCanvas from "./MapCanvas";
import { MarkerLegend } from "./MarkerLegend";
import type { MarkerGroup } from "./pin-layers";
import { SHOW_EVERYTHING, type Shown } from "./useMarkerVisibility";
import type { AnchorPlace } from "@/lib/pins/repository";
import { APP_NAME } from "@/lib/config";
import { useSession } from "@/lib/supabase/useSession";

/**
 * The map is behind the sign-in, so everyone looking at it has already
 * confirmed an email and can put themselves on it in one go. While the session
 * is still being read the screen stays paper rather than flashing the map and
 * snatching it back.
 */
export function MapScreen({ anchors }: { anchors: AnchorPlace[] }) {
  const session = useSession();
  const router = useRouter();
  const [shown, setShown] = useState<Shown>(SHOW_EVERYTHING);
  const toggle = useCallback(
    (group: MarkerGroup) => setShown((current) => ({ ...current, [group]: !current[group] })),
    [],
  );

  useEffect(() => {
    if (session.status === "out") router.replace("/");
  }, [session.status, router]);

  if (session.status !== "in") {
    return (
      <SiteFrame fit="screen">
        <main className="flex h-full items-center justify-center px-6">
          <p role="status" className="text-sm text-text-secondary">
            {session.status === "checking" ? `Opening ${APP_NAME}` : "Taking you back to sign in"}
          </p>
        </main>
      </SiteFrame>
    );
  }

  return (
    <SiteFrame fit="screen" footer={<MarkerLegend shown={shown} onToggle={toggle} />}>
      <main className="relative h-full w-full overflow-hidden">
        <MapCanvas anchors={anchors} shown={shown} />
      </main>
    </SiteFrame>
  );
}
