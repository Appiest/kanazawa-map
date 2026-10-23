"use client";

import { XIcon } from "@phosphor-icons/react";
import { SignInForm } from "@/components/landing/SignInForm";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { SITE } from "@/lib/content";
import { useEscapeKey } from "@/lib/useEscapeKey";

/** Signing in from the map itself, so nobody has to leave it to join. */
export function SignInPanel({ returnTo, onClose }: { returnTo: string | null; onClose: () => void }) {
  useEscapeKey(true, onClose);

  return (
    <Panel label="Sign in">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-text-primary">Put yourself on the map</h2>
        <Button variant="icon" onClick={onClose} aria-label="Close" className="-mt-1 -mr-2 shrink-0">
          <XIcon size={18} aria-hidden />
        </Button>
      </div>
      <SignInForm returnTo={returnTo} />
      <p className="mt-4 border-t border-separator pt-3 text-sm leading-relaxed text-text-secondary">
        {SITE.privacy}
      </p>
    </Panel>
  );
}
