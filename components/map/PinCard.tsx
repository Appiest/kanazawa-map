"use client";

import { AnimatePresence } from "motion/react";
import { EnvelopeSimpleIcon, InstagramLogoIcon, LinkSimpleIcon, LockSimpleIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Panel, TagHole } from "@/components/ui/Panel";
import type { PinContact, PinDetail } from "@/lib/pins/repository";
import { labelFor } from "@/lib/interests";
import { ReportPin } from "./ReportPin";
import { safeUrl } from "@/lib/safeUrl";

type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; pin: PinDetail }
  | { status: "error"; message: string };

type ContactState =
  | { status: "hidden" }
  | { status: "loading" }
  | { status: "locked" }
  | { status: "ready"; contact: PinContact };

const ROW = "flex items-center gap-2 text-sm text-text-body";
const LINK = "underline decoration-paper-400 underline-offset-2 hover:decoration-paper-700";

function ContactRows({ contact, name }: { contact: PinContact; name: string }) {
  const handle = contact.instagram?.replace(/^@/, "");
  const website = safeUrl(contact.website);
  return (
    <div className="mt-3 space-y-1.5 border-t border-separator pt-3">
      {contact.email ? (
        <p className={ROW}>
          <EnvelopeSimpleIcon size={16} aria-hidden className="shrink-0 text-text-secondary" />
          <a href={`mailto:${contact.email}`} className={LINK}>
            {contact.email}
          </a>
        </p>
      ) : null}
      {handle ? (
        <p className={ROW}>
          <InstagramLogoIcon size={16} aria-hidden className="shrink-0 text-text-secondary" />
          <a href={`https://instagram.com/${handle}`} target="_blank" rel="noreferrer" className={LINK}>
            {`@${handle}`}
          </a>
        </p>
      ) : null}
      {website ? (
        <p className={ROW}>
          <LinkSimpleIcon size={16} aria-hidden className="shrink-0 text-text-secondary" />
          <a href={website} target="_blank" rel="noreferrer" className={LINK}>
            {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </p>
      ) : null}
      {!contact.email && !handle && !website ? (
        <p className="text-sm text-text-secondary">{name} has not added a way to get in touch yet.</p>
      ) : null}
    </div>
  );
}

function Contact({ state, name }: { state: ContactState; name: string }) {
  if (state.status === "ready") return <ContactRows contact={state.contact} name={name} />;

  if (state.status === "loading") {
    return <div className="mt-3 h-4 w-40 rounded bg-bg-sunken" aria-hidden />;
  }

  return (
    <p className="mt-3 flex items-start gap-2 text-sm text-text-secondary">
      <LockSimpleIcon size={16} aria-hidden className="mt-0.5 shrink-0" />
      Add your own pin to see how to reach {name}
    </p>
  );
}

function CardBody({ detail, contact }: { detail: DetailState; contact: ContactState }) {
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
      <Contact state={contact} name={pin.displayName} />
      <ReportPin pin={pin} />
    </>
  );
}

export function PinCard({
  detail,
  contact,
  onClose,
}: {
  detail: DetailState;
  contact: ContactState;
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
          <CardBody detail={detail} contact={contact} />
        </Panel>
      ) : null}
    </AnimatePresence>
  );
}
