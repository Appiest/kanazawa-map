"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type { PinDetail } from "@/lib/pins/repository";
import { currentAccessToken } from "@/lib/supabase/browser";

type State = "closed" | "open" | "sending" | "filed" | "failed";

const QUIET_LINK =
  "text-sm text-text-secondary underline decoration-paper-400 underline-offset-2 hover:text-clay-700";

/**
 * Reporting goes into a queue a moderator works through, not to an inbox
 * somebody has to remember to read. Kept small and out of the way: it is the
 * least used thing on the card and should look like it.
 */
export function ReportPin({ pin }: { pin: PinDetail }) {
  const [state, setState] = useState<State>("closed");
  const [reason, setReason] = useState("");

  if (state === "filed") {
    return (
      <p className="mt-3 border-t border-separator pt-3 text-sm text-text-secondary">
        Thank you. Someone will look at this pin.
      </p>
    );
  }

  if (state === "closed") {
    return (
      <p className="mt-3 border-t border-separator pt-3">
        <button type="button" onClick={() => setState("open")} className={QUIET_LINK}>
          Report this pin
        </button>
      </p>
    );
  }

  const file = async () => {
    setState("sending");
    const token = await currentAccessToken();
    const response = await fetch(`/api/pins/${pin.seq}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: reason.trim() }),
    }).catch(() => null);

    setState(response?.ok ? "filed" : "failed");
  };

  return (
    <form
      className="mt-3 border-t border-separator pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        void file();
      }}
    >
      <Field
        label="What is wrong with this pin?"
        value={reason}
        onChange={setReason}
        placeholder="This is not a real person."
        required
        maxLength={500}
        multiline
        autoFocus
      />
      {state === "failed" ? (
        <p role="alert" className="mt-2 text-sm text-clay-700">
          That report did not send. Try again in a moment.
        </p>
      ) : null}
      <div className="mt-3 flex items-center gap-2">
        <Button type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending" : "Send report"}
        </Button>
        <Button variant="quiet" onClick={() => setState("closed")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
