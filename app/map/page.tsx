import { MapScreen } from "@/components/map/MapScreen";
import { listAnchorPlaces } from "@/lib/pins/repository";

export default function MapPage() {
  return <MapScreen anchors={listAnchorPlaces()} />;
}
