"use client";

import { useCallback, useEffect, useState } from "react";
import { ProhibitIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import type { BusySender, OpenReport } from "@/lib/moderation/repository";
import { authorizedFetch, jsonBody, readFailure } from "@/lib/http/client";

type Queue = { reports: OpenReport[]; busySenders: BusySender[] };

type State = { status: "checking" } | { status: "denied" } | ({ status: "ready" } & Queue);

type Action = { action: "dismiss"; reportId: string } | { action: "remove"; seq: number; ban: boolean };

async function loadQueue(): Promise<State> {
  const response = await authorizedFetch("/moderation/reports");
  if (!response?.ok) return { status: "denied" };
  return { status: "ready", ...((await response.json()) as Queue) };
}

async function act(action: Action): Promise<string | null> {
  const response = await authorizedFetch("/moderation/reports", jsonBody(action, { method: "POST" }));
  if (response?.ok) return null;
  return (await readFailure(response, "That did not go through. Try again.")).message;
}

type Act = (action: Action) => void;

function RemoveButtons({ seq, onAct, busy }: { seq: number; onAct: Act; busy: boolean }) {
  return (
    <>
      <Button onClick={() => onAct({ action: "remove", seq, ban: false })} disabled={busy}>
        Remove this pin
      </Button>
      <Button variant="quiet" onClick={() => onAct({ action: "remove", seq, ban: true })} disabled={busy}>
        <ProhibitIcon size={16} aria-hidden className="text-clay-500" />
        Remove and ban
      </Button>
    </>
  );
}

function ReportedPin({ pin }: { pin: OpenReport["pin"] }) {
  if (!pin) return <h2 className="mt-1 text-lg font-semibold text-text-secondary">This pin is already gone</h2>;
  return (
    <>
      <h2 className="mt-1 text-lg font-semibold text-text-primary">
        {pin.displayName}, {pin.neighborhood}
      </h2>
      {pin.note ? <p className="mt-1 text-[0.9375rem] leading-relaxed text-text-body">{pin.note}</p> : null}
    </>
  );
}

function Report({ report, onAct, busy }: { report: OpenReport; onAct: Act; busy: boolean }) {
  return (
    <li className="rounded-sheet bg-bg-surface p-5 shadow-sm">
      <p className="text-sm text-text-secondary">Reported {new Date(report.createdAt).toLocaleDateString()}</p>
      <ReportedPin pin={report.pin} />
      <p className="mt-3 border-t border-separator pt-3 text-[0.9375rem] leading-relaxed text-text-body">
        {report.reason}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {report.pin ? <RemoveButtons seq={report.pin.seq} onAct={onAct} busy={busy} /> : null}
        <Button variant="quiet" onClick={() => onAct({ action: "dismiss", reportId: report.id })} disabled={busy}>
          Leave it up
        </Button>
      </div>
    </li>
  );
}

function BusySenders({ senders, onAct, busy }: { senders: BusySender[]; onAct: Act; busy: boolean }) {
  if (senders.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-text-primary">Sending a lot of messages</h2>
      <ul className="mt-4 space-y-3">
        {senders.map((sender) => (
          <li key={sender.seq} className="flex flex-wrap items-center gap-3 rounded-sheet bg-bg-surface p-4 shadow-sm">
            <span className="mr-auto">
              <span className="block font-medium text-text-primary">
                {sender.displayName}, {sender.neighborhood}
              </span>
              <span className="block text-sm text-text-secondary">{sender.messagesToday} messages in the last day</span>
            </span>
            <RemoveButtons seq={sender.seq} onAct={onAct} busy={busy} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function useQueue() {
  const [state, setState] = useState<State>({ status: "checking" });
  const refresh = useCallback(() => {
    loadQueue().then(setState, () => setState({ status: "denied" }));
  }, []);

  useEffect(() => {
    let current = true;
    loadQueue().then(
      (next) => current && setState(next),
      () => current && setState({ status: "denied" }),
    );
    return () => {
      current = false;
    };
  }, []);

  return { state, refresh };
}

/**
 * The moderation queue. Anyone who is not a moderator gets the same answer as
 * somebody visiting a page that does not exist, so the queue does not announce
 * itself.
 */
export function Queue() {
  const { state, refresh } = useQueue();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAct = (action: Action) => {
    setBusy(true);
    setError(null);
    void act(action).then((failure) => {
      setError(failure);
      setBusy(false);
      refresh();
    });
  };

  if (state.status === "checking") return <p className="text-sm text-text-secondary">Checking</p>;
  if (state.status === "denied") return <p className="text-[0.9375rem] text-text-body">This page is not available.</p>;

  return (
    <>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-clay-700">
          {error}
        </p>
      ) : null}
      {state.reports.length === 0 ? (
        <p className="font-medium text-text-primary">Nothing to review</p>
      ) : (
        <ul className="space-y-4">
          {state.reports.map((report) => (
            <Report key={report.id} report={report} busy={busy} onAct={onAct} />
          ))}
        </ul>
      )}
      <BusySenders senders={state.busySenders} onAct={onAct} busy={busy} />
    </>
  );
}
