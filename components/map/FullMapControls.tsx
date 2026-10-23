"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { SignInIcon } from "@phosphor-icons/react";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { GatheringFlow } from "@/components/gatherings/GatheringFlow";
import { MyPin } from "@/components/mine/MyPin";
import { PinControls } from "@/components/mine/PinControls";
import { Button } from "@/components/ui/Button";
import type { NewGathering } from "@/lib/gatherings/repository";
import type { useMyPin } from "@/lib/pins/useMyPin";
import type { SignInControl } from "./useSignIn";

type Props = {
  map: MapLibreMap | null;
  signedIn: boolean;
  mine: ReturnType<typeof useMyPin>;
  managing: boolean;
  setManaging: (managing: boolean) => void;
  onChanged: () => void;
  onPostGathering: (gathering: NewGathering) => Promise<void>;
  onOpenPanel: () => void;
  signIn: SignInControl;
};

function SignedOutControls({ signIn, onOpenPanel }: Pick<Props, "signIn" | "onOpenPanel">) {
  if (signIn.isOpen) return <SignInPanel returnTo={signIn.returnTo} onClose={signIn.close} />;
  return (
    <div className="pointer-events-auto absolute right-4 bottom-4 z-10 sm:right-6 sm:bottom-6" data-touch-target>
      <Button
        onClick={() => {
          onOpenPanel();
          signIn.open();
        }}
      >
        <SignInIcon size={16} aria-hidden />
        Sign in to add yourself
      </Button>
    </div>
  );
}

/** The full map's corner: sign in when signed out; your pin and gatherings once in. */
export function FullMapControls(props: Props) {
  const { map, mine, managing, setManaging, onOpenPanel } = props;
  if (!props.signedIn) return <SignedOutControls signIn={props.signIn} onOpenPanel={onOpenPanel} />;

  return (
    <>
      <PinControls
        map={map}
        controls={mine}
        onChanged={props.onChanged}
        onManage={() => setManaging(true)}
        onOpen={onOpenPanel}
      />
      {managing && mine.state.status === "mine" ? (
        <MyPin pin={mine.state.pin} map={map} controls={mine} onClose={() => setManaging(false)} />
      ) : null}
      <GatheringFlow map={map} onPost={props.onPostGathering} onOpen={onOpenPanel} />
    </>
  );
}
