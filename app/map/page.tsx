import type { Metadata } from "next";
import { MapScreen } from "@/components/map/MapScreen";
import { listAnchorPlaces } from "@/lib/pins/repository";

/** Behind the sign-in, so there is nothing here for a crawler to read. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MapPage() {
  return <MapScreen anchors={listAnchorPlaces()} />;
}
