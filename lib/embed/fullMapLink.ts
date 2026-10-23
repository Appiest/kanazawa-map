import { withBasePath } from "@/lib/paths";

/**
 * The page the embed sits on, when it sits on one. The website serves this
 * app on its own origin, so the frame may read the top window's location.
 */
function hostPagePath(): string | null {
  try {
    if (window.top === window.self || !window.top) return null;
    return `${window.top.location.pathname}${window.top.location.search}`;
  } catch {
    return null;
  }
}

/** The full map, opened in the top window. With `signIn`, the sign-in panel opens and returns here after. */
export function fullMapUrl(signIn: boolean): string {
  const map = withBasePath("/map");
  if (!signIn) return map;

  const params = new URLSearchParams({ signin: "1" });
  const back = hostPagePath();
  if (back) params.set("next", back);
  return `${map}?${params}`;
}
