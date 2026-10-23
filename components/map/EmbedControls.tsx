"use client";

import { MapPinIcon, SignInIcon } from "@phosphor-icons/react";
import { ButtonLink } from "@/components/ui/Button";
import { fullMapUrl } from "@/lib/embed/fullMapLink";

const CORNER =
  "pointer-events-auto absolute right-4 bottom-4 z-10 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6";

type Props = { signedIn: boolean; onMap: boolean | null };

/** Leaves the frame for the full map. Clicked at the moment of use, so the return path is current. */
function openTop(signIn: boolean) {
  return (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const url = fullMapUrl(signIn);
    try {
      window.top!.location.assign(url);
    } catch {
      window.location.assign(url);
    }
  };
}

function PrimaryAction({ signedIn, onMap }: Props) {
  if (!signedIn) {
    return (
      <ButtonLink href={fullMapUrl(true)} target="_top" onClick={openTop(true)}>
        <SignInIcon size={16} aria-hidden />
        Sign in
      </ButtonLink>
    );
  }
  if (onMap !== false) return null;
  return (
    <ButtonLink href={fullMapUrl(false)} target="_top" onClick={openTop(false)}>
      <MapPinIcon size={16} weight="fill" aria-hidden />
      Put yourself on the map
    </ButtonLink>
  );
}

/** The embed's only control: a way in. The page around the frame links to the full map. */
export function EmbedControls(props: Props) {
  return (
    <div className={CORNER} data-touch-target>
      <PrimaryAction {...props} />
    </div>
  );
}
