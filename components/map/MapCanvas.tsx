"use client";

import { useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { AnchorPlace } from "@/lib/pins/repository";
import { useMapInstance } from "./useMapInstance";
import { usePinSource } from "./usePinSource";

export default function MapCanvas({ anchors }: { anchors: AnchorPlace[] }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useMapInstance(container);
  usePinSource(map, anchors);

  return (
    <div className="absolute inset-0 bg-bg-page">
      <div ref={container} className="h-full w-full" />
    </div>
  );
}
