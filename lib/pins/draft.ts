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

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Already unreachable, which is the state we wanted.
  }
}
