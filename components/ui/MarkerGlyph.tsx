import { MARKERS, type MarkerKind } from "@/styles/markers";

/** A map marker at the size of a line of text, for legends and lists. */
export function MarkerGlyph({ kind, height = 22, className = "" }: { kind: MarkerKind; height?: number; className?: string }) {
  const shape = MARKERS[kind];
  return (
    <svg
      viewBox={`0 0 ${shape.width} ${shape.height}`}
      height={height}
      width={(height * shape.width) / shape.height}
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {shape.parts.map((part) => (
        <path key={part.d} d={part.d} fill={part.fill} />
      ))}
    </svg>
  );
}
