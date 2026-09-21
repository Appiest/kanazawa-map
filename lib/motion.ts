"use client";

/**
 * The map animates in JavaScript, so the CSS rule that disables motion does
 * not reach it. Every camera move asks for its duration here, which collapses
 * to an instant jump for anyone who has asked for less movement.
 */
export function cameraDuration(preferred: number): number {
  if (typeof window === "undefined") return preferred;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : preferred;
}
