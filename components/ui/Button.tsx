"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "quiet" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control font-medium " +
  "transition-[background-color,color,scale,box-shadow] duration-150 ease-press " +
  "active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40";

/** Controls stay in the neutral ramp; green is reserved for people. */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-bg-inverse text-text-inverse px-4 h-10 text-sm hover:bg-paper-800 shadow-sm",
  quiet: "bg-transparent text-text-body px-3 h-9 text-sm hover:bg-bg-hover",
  icon: "bg-transparent text-text-secondary size-9 hover:bg-bg-hover hover:text-text-primary",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  return (
    <button type="button" className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
