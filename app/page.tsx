import MapCanvas from "@/components/map/MapCanvas";
import { listAnchorPlaces } from "@/lib/pins/repository";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapCanvas anchors={listAnchorPlaces()} />
    </main>
  );
}
