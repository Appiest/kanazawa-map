"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, MapGeoJSONFeature, Map as MapLibreMap } from "maplibre-gl";
import { PIN_SOURCE_ID } from "@/lib/config";
import type { PinDetail } from "@/lib/pins/repository";
import { cameraDuration } from "@/lib/motion";
import { CLUSTER_LAYER_ID, PIN_LAYER_ID } from "./pin-layers";

const MAX_TARGETS = 80;

type Target = {
  key: string;
  x: number;
  y: number;
  label: string;
  seq: number | null;
  clusterId: number | null;
};

async function fetchNames(seqs: number[]): Promise<Map<number, PinDetail>> {
  if (seqs.length === 0) return new Map();
  const response = await fetch(`/api/pins/details?seqs=${seqs.join(",")}`);
  if (!response.ok) return new Map();
  const body = (await response.json()) as { pins: PinDetail[] };
  return new Map(body.pins.map((pin) => [pin.seq, pin]));
}

const numberOrNull = (value: unknown) => (typeof value === "number" ? value : null);

function toTarget(map: MapLibreMap, feature: MapGeoJSONFeature): Target | null {
  if (feature.geometry.type !== "Point") return null;

  const clusterId = numberOrNull(feature.properties.cluster_id);
  const seq = numberOrNull(feature.properties.seq);
  const point = map.project(feature.geometry.coordinates as [number, number]);

  return {
    key: clusterId === null ? `p${seq}` : `c${clusterId}`,
    x: point.x,
    y: point.y,
    seq,
    clusterId,
    label:
      clusterId === null
        ? "Person on the map"
        : `Open this group of ${feature.properties.point_count} people`,
  };
}

function readTargets(map: MapLibreMap): { targets: Target[]; seqs: number[] } {
  const layers = [PIN_LAYER_ID, CLUSTER_LAYER_ID].filter((id) => map.getLayer(id));
  if (layers.length === 0) return { targets: [], seqs: [] };

  const byKey = new Map<string, Target>();
  for (const feature of map.queryRenderedFeatures({ layers })) {
    if (byKey.size >= MAX_TARGETS) break;
    const target = toTarget(map, feature);
    if (target && !byKey.has(target.key)) byKey.set(target.key, target);
  }

  const targets = [...byKey.values()];
  return { targets, seqs: targets.map((t) => t.seq).filter((seq): seq is number => seq !== null) };
}

function withNames(targets: Target[], names: Map<number, PinDetail>): Target[] {
  return targets.map((target) => {
    const pin = target.seq === null ? undefined : names.get(target.seq);
    return pin ? { ...target, label: `${pin.displayName}, ${pin.neighborhood}` } : target;
  });
}

type Props = {
  map: MapLibreMap | null;
  layersReady: boolean;
  onSelect: (seq: number) => void;
};

/**
 * The map is a canvas, so a pointer reaches every pin and a keyboard reaches
 * none. These are real buttons over each pin in view: invisible until focused,
 * when the focus ring lands on the tag itself. Positions refresh when the map
 * settles rather than every frame, which is enough for something nobody can
 * see mid-pan.
 */
export function KeyboardPins({ map, layersReady, onSelect }: Props) {
  const [targets, setTargets] = useState<Target[]>([]);
  const known = useRef(new Map<number, PinDetail>());

  useEffect(() => {
    if (!map || !layersReady) return;

    let current = true;
    const sync = () => {
      const { targets: found, seqs } = readTargets(map);

      // Panning fires both moveend and idle, and a pan usually reveals nobody
      // new. Only names we have never seen are worth a request.
      const missing = seqs.filter((seq) => !known.current.has(seq));
      if (missing.length === 0) {
        setTargets(withNames(found, known.current));
        return;
      }

      fetchNames(missing).then(
        (names) => {
          for (const [seq, pin] of names) known.current.set(seq, pin);
          if (current) setTargets(withNames(found, known.current));
        },
        () => current && setTargets(withNames(found, known.current)),
      );
    };

    sync();
    map.on("moveend", sync);
    map.on("idle", sync);

    return () => {
      current = false;
      map.off("moveend", sync);
      map.off("idle", sync);
    };
  }, [map, layersReady]);

  const activate = (target: Target) => {
    if (target.seq !== null) return onSelect(target.seq);
    if (target.clusterId === null || !map) return;

    void map
      .getSource<GeoJSONSource>(PIN_SOURCE_ID)
      ?.getClusterExpansionZoom(target.clusterId)
      .then((zoom) => map.easeTo({ center: map.unproject([target.x, target.y]), zoom, duration: cameraDuration(420) }));
  };

  if (targets.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {targets.map((target) => (
        <button
          key={target.key}
          type="button"
          onClick={() => activate(target)}
          aria-label={target.label}
          className="pointer-events-auto absolute size-7 -translate-x-1/2 -translate-y-full rounded-sm bg-transparent"
          style={{ left: target.x, top: target.y }}
        />
      ))}
    </div>
  );
}
