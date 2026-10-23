"use client";

import { useCallback, useState } from "react";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/auth/Turnstile";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { sendSignInLink } from "@/lib/supabase/browser";

type State = { status: "idle" } | { status: "sending" } | { status: "sent" } | { status: "failed"; message: string };

function failureOf(cause: unknown): State {
  return { status: "failed", message: cause instanceof Error ? cause.message : "Could not send the link" };
}

function SentNotice({ email }: { email: string }) {
  return (
    <div className="space-y-2" role="status">
      <h2 className="text-lg font-semibold text-text-primary">Check your email</h2>
      <p className="text-[0.9375rem] leading-relaxed text-text-body">
        A link is on its way to {email}. Open it and the map opens with you signed in.
      </p>
    </div>
  );
}

/** `returnTo` is a same-origin path to land on after the link is opened. */
export function SignInForm({ returnTo = null }: { returnTo?: string | null }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRound, setCaptchaRound] = useState(0);
  const onToken = useCallback((token: string | null) => setCaptchaToken(token), []);

  if (state.status === "sent") return <SentNotice email={email} />;

  const waitingOnCaptcha = Boolean(TURNSTILE_SITE_KEY) && !captchaToken;

  const send = async () => {
    setState({ status: "sending" });
    try {
      await sendSignInLink(email.trim(), { captchaToken, returnTo });
      setState({ status: "sent" });
    } catch (cause) {
      setState(failureOf(cause));
      // A captcha token works once, so a failed attempt needs a new one.
      setCaptchaToken(null);
      setCaptchaRound((round) => round + 1);
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
      <Turnstile onToken={onToken} round={captchaRound} />
      {state.status === "failed" ? (
        <p role="alert" className="text-sm text-clay-700">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={state.status === "sending" || waitingOnCaptcha}>
        <EnvelopeSimpleIcon size={16} weight="regular" aria-hidden />
        {state.status === "sending" ? "Sending" : "Send me a link"}
      </Button>
      <p className="text-sm leading-snug text-text-secondary">
        No password. The link signs you in and lets you edit or remove your pin later.
      </p>
    </form>
  );
}
