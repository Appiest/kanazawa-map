import type { Metadata } from "next";
import { MapScreen } from "@/components/map/MapScreen";
import { listAnchorPlaces } from "@/lib/pins/repository";

/** Names of real people, so it stays out of search results even though anyone can look. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MapPage() {
  return <MapScreen anchors={listAnchorPlaces()} />;
}
