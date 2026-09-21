"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MapCanvas from "./MapCanvas";
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

  useEffect(() => {
    if (session.status === "out") router.replace("/");
  }, [session.status, router]);

  if (session.status !== "in") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-land-100 px-6">
        <p role="status" className="text-sm text-text-secondary">
          {session.status === "checking" ? `Opening ${APP_NAME}` : "Taking you back to sign in"}
        </p>
      </main>
    );
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapCanvas anchors={anchors} />
    </main>
  );
}
