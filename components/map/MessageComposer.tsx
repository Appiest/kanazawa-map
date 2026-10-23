"use client";

import { useState } from "react";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { sendMessage } from "@/lib/contact/usePinHandles";

type State =
  | { status: "closed" }
  | { status: "writing" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "failed"; message: string };

const MESSAGE_LIMIT = 1000;

/**
 * A note to the owner of a pin. It travels by email from a no-reply address,
 * so neither person sees the other's address unless the recipient replies.
 */
export function MessageComposer({ seq, name }: { seq: number; name: string }) {
  const [state, setState] = useState<State>({ status: "closed" });
  const [message, setMessage] = useState("");

  if (state.status === "closed") {
    return (
      <Button variant="quiet" className="-ml-3" onClick={() => setState({ status: "writing" })}>
        <EnvelopeSimpleIcon size={16} aria-hidden />
        Message {name}
      </Button>
    );
  }

  if (state.status === "sent") {
    return <p role="status" className="text-sm text-text-body">Sent. If {name} replies, it lands in your inbox.</p>;
  }

  const send = async () => {
    setState({ status: "sending" });
    try {
      await sendMessage(seq, message.trim());
      setState({ status: "sent" });
    } catch (cause) {
      setState({ status: "failed", message: cause instanceof Error ? cause.message : "Your message did not send." });
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <Field
        label={`Your message to ${name}`}
        value={message}
        onChange={setMessage}
        hint={`${name} gets this by email. If they reply, they will see your email address.`}
        maxLength={MESSAGE_LIMIT}
        required
        multiline
        autoFocus
      />
      {state.status === "failed" ? (
        <p role="alert" className="text-sm text-clay-700">
          {state.message}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={state.status === "sending"}>
          {state.status === "sending" ? "Sending" : "Send message"}
        </Button>
        <Button variant="quiet" onClick={() => setState({ status: "closed" })}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
