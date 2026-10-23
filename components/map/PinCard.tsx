"use client";

import { AnimatePresence } from "motion/react";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Panel, TagHole } from "@/components/ui/Panel";
import type { HandlesState } from "@/lib/contact/usePinHandles";
import type { PinDetail } from "@/lib/pins/types";
import { labelFor } from "@/lib/interests";
import { ConnectionLine } from "@/components/ui/ConnectionLine";
import { PinContact, type Viewer } from "./PinContact";
import { ReportPin } from "./ReportPin";

type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; pin: PinDetail }
  | { status: "error"; message: string };

function CardBody({ detail, contact, viewer }: { detail: DetailState; contact: HandlesState; viewer: Viewer }) {
  if (detail.status === "loading") {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-7 w-32 rounded bg-bg-sunken" />
        <div className="h-4 w-24 rounded bg-bg-sunken" />
      </div>
    );
  }

  if (detail.status === "error") {
    return (
      <>
        <p className="text-[0.9375rem] text-text-body">That pin would not load.</p>
        {/* The real reason, rather than a guess at it. Blaming the connection
            when the connection is fine sends people hunting in the wrong
            place. */}
        <p className="mt-1 text-sm text-text-secondary">{detail.message}</p>
      </>
    );
  }

  if (detail.status !== "ready") return null;
  const { pin } = detail;

  return (
    <>
      <h2 className="text-2xl font-semibold text-text-primary">{pin.displayName}</h2>
      <p className="text-sm text-text-secondary">{pin.neighborhood}</p>
      <ConnectionLine connections={pin.connections} />
      {pin.note ? (
        <p className="mt-3 border-t border-separator pt-3 text-[0.9375rem] leading-relaxed text-text-body">
          {pin.note}
        </p>
      ) : null}
      {pin.interests.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {pin.interests.map((id) => (
            <li
              key={id}
              className="rounded-full bg-bg-sunken px-2.5 py-1 text-sm text-text-body"
            >
              {labelFor(id)}
            </li>
          ))}
        </ul>
      ) : null}
      <PinContact seq={pin.seq} name={pin.displayName} state={contact} viewer={viewer} />
      {viewer.signedIn ? <ReportPin pin={pin} /> : null}
    </>
  );
}

export function PinCard({
  detail,
  contact,
  viewer,
  onClose,
}: {
  detail: DetailState;
  contact: HandlesState;
  viewer: Viewer;
  onClose: () => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {detail.status !== "idle" ? (
        <Panel key="pin-card" label="Person on the map">
          <div className="mb-3 flex items-start justify-between">
            <TagHole />
            <Button variant="icon" onClick={onClose} aria-label="Close">
              <XIcon size={18} weight="regular" aria-hidden />
            </Button>
          </div>
          <CardBody detail={detail} contact={contact} viewer={viewer} />
        </Panel>
      ) : null}
    </AnimatePresence>
  );
}
