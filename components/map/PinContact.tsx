"use client";

import { InstagramLogoIcon, LinkSimpleIcon, LockSimpleIcon, SignInIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import type { HandlesState } from "@/lib/contact/usePinHandles";
import type { ContactHandles } from "@/lib/pins/types";
import { safeUrl } from "@/lib/safeUrl";
import { MessageComposer } from "./MessageComposer";

export type Viewer = {
  signedIn: boolean;
  /** Where "Sign in" goes. Null hides contact entirely for signed-out viewers. */
  onSignIn: (() => void) | null;
};

const ROW = "flex items-center gap-2 text-sm text-text-body";
const LINK = "underline decoration-paper-400 underline-offset-2 hover:decoration-paper-700";
const SECTION = "mt-3 space-y-2 border-t border-separator pt-3";

function HandleRows({ handles }: { handles: ContactHandles }) {
  const website = safeUrl(handles.website);
  return (
    <>
      {handles.instagram ? (
        <p className={ROW}>
          <InstagramLogoIcon size={16} aria-hidden className="shrink-0 text-text-secondary" />
          <a href={`https://instagram.com/${handles.instagram}`} target="_blank" rel="noreferrer" className={LINK}>
            {`@${handles.instagram}`}
          </a>
        </p>
      ) : null}
      {website ? (
        <p className={ROW}>
          <LinkSimpleIcon size={16} aria-hidden className="shrink-0 text-text-secondary" />
          <a href={website} target="_blank" rel="noreferrer nofollow" className={LINK}>
            {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </p>
      ) : null}
    </>
  );
}

function Locked({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 text-sm text-text-secondary">
      <LockSimpleIcon size={16} aria-hidden className="mt-0.5 shrink-0" />
      {text}
    </p>
  );
}

function SignedOut({ name, onSignIn }: { name: string; onSignIn: () => void }) {
  return (
    <Button variant="quiet" className="-ml-3" onClick={onSignIn}>
      <SignInIcon size={16} aria-hidden />
      Sign in to message {name}
    </Button>
  );
}

function SignedIn({ seq, name, state }: { seq: number; name: string; state: HandlesState }) {
  if (state.status === "loading") return <div className="h-9 w-40 rounded-control bg-bg-sunken" aria-hidden />;
  if (state.status === "needsPin") return <Locked text={`Add your own pin to message ${name}`} />;
  if (state.status === "unavailable") return <p className="text-sm text-text-secondary">{state.message}</p>;
  if (state.status !== "ready") return null;

  return (
    <>
      {state.handles ? <HandleRows handles={state.handles} /> : null}
      <MessageComposer seq={seq} name={name} />
    </>
  );
}

/** How to reach somebody. An email address is never part of it. */
export function PinContact({ seq, name, state, viewer }: { seq: number; name: string; state: HandlesState; viewer: Viewer }) {
  if (!viewer.signedIn) {
    if (!viewer.onSignIn) return null;
    return (
      <div className={SECTION}>
        <SignedOut name={name} onSignIn={viewer.onSignIn} />
      </div>
    );
  }

  return (
    <div className={SECTION}>
      <SignedIn seq={seq} name={name} state={state} />
    </div>
  );
}
