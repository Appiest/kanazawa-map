import type { ReactNode } from "react";
import { SITE } from "@/lib/content";

type Props = {
  children: ReactNode;
  /** Sits in the bottom band, before the sponsor. */
  footer?: ReactNode;
  /** `screen` pins the frame to the viewport for the map; `page` lets it grow with its content. */
  fit: "screen" | "page";
};

const FIT = {
  screen: { outer: "h-dvh", inner: "min-h-0 flex-1" },
  page: { outer: "min-h-dvh", inner: "flex-1" },
} as const;

function HostName() {
  const name = <span className="text-lg font-semibold text-frame-text sm:text-xl">{SITE.host.name}</span>;
  if (!SITE.host.href) return name;
  return (
    <a href={SITE.host.href} className="rounded-control hover:underline">
      {name}
    </a>
  );
}

/**
 * The host site's band around every page, so anybody who arrives here from
 * Nikkei Counts can see they never left it.
 */
export function SiteFrame({ children, footer, fit }: Props) {
  return (
    <div className={`flex flex-col bg-frame ${FIT[fit].outer}`}>
      <header className="flex h-12 shrink-0 items-center justify-center px-4 sm:h-14">
        <HostName />
      </header>
      <div className={`relative overflow-hidden bg-bg-landing sm:mx-4 sm:rounded-sheet ${FIT[fit].inner}`}>
        {children}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-8 gap-y-1 px-4 py-2 sm:relative sm:min-h-14">
        {footer}
        <p className={`text-sm text-frame-text-muted ${footer ? "hidden sm:absolute sm:right-6 sm:block" : ""}`}>
          Sponsored by <span className="font-medium text-frame-text">{SITE.sponsor}</span>
        </p>
      </footer>
    </div>
  );
}
