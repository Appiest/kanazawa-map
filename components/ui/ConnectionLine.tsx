import { connectionLabel } from "@/lib/connections";

/** How somebody is connected to Japan, under their place name on a pin. */
export function ConnectionLine({ connections }: { connections: readonly string[] }) {
  if (connections.length === 0) return null;
  return <p className="mt-1 text-sm text-text-body">{connections.map(connectionLabel).join(", ")}</p>;
}
