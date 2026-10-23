import type { Metadata } from "next";
import { EmbedScreen } from "@/components/map/EmbedScreen";
import { listAnchorPlaces } from "@/lib/pins/repository";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedPage() {
  return <EmbedScreen anchors={listAnchorPlaces()} />;
}
