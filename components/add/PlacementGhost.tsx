"use client";

/**
 * A tag held at the centre of the screen while the map moves underneath it.
 * Steering the map rather than tapping a spot keeps placement accurate on a
 * phone, where a fingertip covers the target.
 */
export function PlacementGhost() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <svg
        width="40"
        height="52"
        viewBox="0 0 20 26"
        className="-translate-y-[13px] drop-shadow-md motion-safe:animate-plant"
        aria-hidden
      >
        <rect x="9.25" y="10" width="1.5" height="16" className="fill-green-700" />
        <rect x="2" y="0" width="16" height="11" rx="2" className="fill-green-600" />
        <circle cx="10" cy="5.5" r="1.6" className="fill-green-100" />
      </svg>
      <span className="absolute size-1.5 rounded-full bg-paper-900/40" aria-hidden />
    </div>
  );
}
