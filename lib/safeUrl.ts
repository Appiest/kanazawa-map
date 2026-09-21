/**
 * A website comes from a text field, so it can carry a `javascript:` scheme
 * that would run when another member clicks the link. Only http and https are
 * ever handed to an href.
 */
export function safeUrl(value: string | null): string | null {
  if (!value) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
