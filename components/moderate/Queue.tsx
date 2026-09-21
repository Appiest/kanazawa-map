"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { OpenReport } from "@/lib/pins/repository";
import { currentAccessToken } from "@/lib/supabase/browser";

type State =
  | { status: "checking" }
  | { status: "denied" }
  | { status: "ready"; reports: OpenReport[] };

async function loadQueue(): Promise<State> {
  const token = await currentAccessToken();
  if (!token) return { status: "denied" };

  const response = await fetch("/api/moderation/reports", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { status: "denied" };

  const body = (await response.json()) as { reports: OpenReport[] };
  return { status: "ready", reports: body.reports };
}

function Report({ report, onResolve, busy }: { report: OpenReport; onResolve: (outcome: "dismiss" | "remove") => void; busy: boolean }) {
  return (
    <li className="rounded-sheet bg-bg-surface p-5 shadow-sm">
      <p className="text-sm text-text-secondary">
        Reported {new Date(report.createdAt).toLocaleDateString()}
      </p>

      {report.pin ? (
        <>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">
            {report.pin.displayName}, {report.pin.neighborhood}
          </h2>
          {report.pin.note ? (
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-text-body">{report.pin.note}</p>
          ) : null}
        </>
      ) : (
        <h2 className="mt-1 text-lg font-semibold text-text-secondary">This pin is already gone</h2>
      )}

      <p className="mt-3 border-t border-separator pt-3 text-[0.9375rem] leading-relaxed text-text-body">
        {report.reason}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={() => onResolve("remove")} disabled={busy}>
          Remove this pin
        </Button>
        <Button variant="quiet" onClick={() => onResolve("dismiss")} disabled={busy}>
          Leave it up
        </Button>
      </div>
    </li>
  );
}

/**
 * The moderation queue. Anyone who is not a moderator gets the same answer as
 * somebody visiting a page that does not exist, so the queue does not announce
 * itself.
 */
export function Queue() {
  const [state, setState] = useState<State>({ status: "checking" });
  const [busy, setBusy] = useState(false);

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

  const resolve = async (id: string, outcome: "dismiss" | "remove") => {
    setBusy(true);
    const token = await currentAccessToken();
    await fetch("/api/moderation/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, outcome }),
    }).catch(() => undefined);
    setBusy(false);
    refresh();
  };

  if (state.status === "checking") {
    return <p className="text-sm text-text-secondary">Checking</p>;
  }

  if (state.status === "denied") {
    return <p className="text-[0.9375rem] text-text-body">This page is not available.</p>;
  }

  if (state.reports.length === 0) {
    return (
      <div>
        <p className="font-medium text-text-primary">Nothing to review</p>
        <p className="mt-1 text-sm text-text-secondary">
          Reports from people on the map arrive here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {state.reports.map((report) => (
        <Report
          key={report.id}
          report={report}
          busy={busy}
          onResolve={(outcome) => void resolve(report.id, outcome)}
        />
      ))}
    </ul>
  );
}
