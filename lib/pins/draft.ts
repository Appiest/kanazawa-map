"use client";

import type { NewPin } from "./repository";

/**
 * Signing in by email link means leaving the page and coming back, so what
 * someone has already written is held locally and saved once they return.
 * Browser storage can throw in a private window, and a lost draft is only a
 * retype, so every access is guarded.
 */
const KEY = "kanazawa.pin-draft";

export function saveDraft(draft: NewPin): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Nothing to do: the draft stays in component state for this visit.
  }
}

export function readDraft(): NewPin | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as NewPin) : null;
  } catch {
    return null;
  }
}

/**
 * Planting a pin from a restored draft swaps the whole corner control, which
 * destroys the confirmation before anyone can read it. This note survives that
 * swap so the person lands on their own pin instead of on silence.
 */
const PLANTED_KEY = "kanazawa.just-planted";

export function markJustPlanted(): void {
  try {
    window.sessionStorage.setItem(PLANTED_KEY, "1");
  } catch {
    // Without it the pin is still planted; only the greeting is missed.
  }
}

export function takeJustPlanted(): boolean {
  try {
    const found = window.sessionStorage.getItem(PLANTED_KEY) === "1";
    window.sessionStorage.removeItem(PLANTED_KEY);
    return found;
  } catch {
    return false;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Already unreachable, which is the state we wanted.
  }
}
