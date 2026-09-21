"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { sendSignInLink } from "@/lib/supabase/browser";
import { useSession } from "@/lib/supabase/useSession";

type State = { status: "idle" } | { status: "sending" } | { status: "sent" } | { status: "failed"; message: string };

export function SignInForm() {
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  if (session.status === "in") {
    return (
      <div className="space-y-3">
        <Button onClick={() => router.push("/map")}>Open the map</Button>
        <p className="text-sm text-text-secondary">You are already signed in.</p>
      </div>
    );
  }

  if (state.status === "sent") {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Check your email</h2>
        <p className="text-[0.9375rem] leading-relaxed text-text-body">
          A link is on its way to {email}. Open it and the map opens with you signed in.
        </p>
      </div>
    );
  }

  const send = async () => {
    setState({ status: "sending" });
    try {
      await sendSignInLink(email.trim());
      setState({ status: "sent" });
    } catch (cause) {
      setState({
        status: "failed",
        message: cause instanceof Error ? cause.message : "Could not send the link",
      });
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
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="name@example.com"
        required
        type="email"
        inputMode="email"
        autoComplete="email"
      />
      {state.status === "failed" ? (
        <p role="alert" className="text-sm text-clay-700">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={state.status === "sending"}>
        <EnvelopeSimpleIcon size={16} weight="regular" aria-hidden />
        {state.status === "sending" ? "Sending" : "Send me a link"}
      </Button>
      <p className="text-sm leading-snug text-text-secondary">
        No password. The link signs you in and lets you edit or remove your pin later.
      </p>
    </form>
  );
}
