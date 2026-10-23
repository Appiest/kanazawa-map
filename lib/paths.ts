/**
 * Where this app lives. next.config.ts reads BASE_PATH too, so every page,
 * asset and API route moves together when it changes.
 */
export const BASE_PATH = "";

/** A path inside this app, for anything Next does not prefix by itself. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}

export function apiPath(path: string): string {
  return withBasePath(`/api${path}`);
}

function publicOrigin(): string {
  const origin = process.env.NEXT_PUBLIC_HOST_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return origin.replace(/\/+$/, "");
}

/** A full link to a page of this app, for emails. */
export function appUrl(path: string): string {
  return `${publicOrigin()}${withBasePath(path)}`;
}
