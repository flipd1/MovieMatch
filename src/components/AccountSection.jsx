import { useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyErrorMessage(error) {
  if (error?.code === "over_email_send_rate_limit") {
    return "Too many attempts — please wait a bit before trying again.";
  }
  return error?.message || "Couldn't send the link. Try again.";
}

export default function AccountSection({
  userId,
  email,
  isAnonymous,
  linkEmail,
  resendLinkEmail,
  signInWithEmail,
}) {
  const [inputEmail, setInputEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [pendingEmail, setPendingEmail] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInStatus, setSignInStatus] = useState("idle"); // idle | sending | sent | error
  const [signInErrorMessage, setSignInErrorMessage] = useState(null);

  const linked = !isAnonymous && Boolean(email);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail silently; the ID is still selectable.
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = inputEmail.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setStatus("error");
      setErrorMessage("Enter a valid email address.");
      return;
    }

    setStatus("sending");
    setErrorMessage(null);

    const { error } = await linkEmail(trimmed);
    if (error) {
      setStatus("error");
      setErrorMessage(friendlyErrorMessage(error));
      return;
    }

    setPendingEmail(trimmed);
    setStatus("sent");
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setStatus("sending");
    setErrorMessage(null);

    const { error } = await resendLinkEmail(pendingEmail);
    if (error) {
      setStatus("error");
      setErrorMessage(friendlyErrorMessage(error));
      return;
    }

    setStatus("sent");
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    const trimmed = signInEmail.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setSignInStatus("error");
      setSignInErrorMessage("Enter a valid email address.");
      return;
    }

    setSignInStatus("sending");
    setSignInErrorMessage(null);

    const { error } = await signInWithEmail(trimmed);
    if (error) {
      setSignInStatus("error");
      setSignInErrorMessage(friendlyErrorMessage(error));
      return;
    }

    setSignInStatus("sent");
  };

  return (
    <div className="space-y-4">
      {linked ? (
        <div className="space-y-1.5">
          <p className="text-sm text-fg">
            Signed in as{" "}
            <span className="font-medium text-fg">{email}</span>
          </p>
          <p className="text-sm text-fg-muted">
            You can sign in on another device or browser with this email to
            access the same ratings and preferences there.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-fg mb-1">
              Save your account
            </p>
            <p className="text-sm text-fg-muted">
              Right now your ratings and lists are saved only to this
              browser on this device — switch to a different phone,
              computer, or even a different browser on the same device, and
              they won&apos;t be there.
            </p>
            <p className="text-sm text-fg-muted mt-2">
              Adding an email fixes that: sign in with the same email
              anywhere, and everything you&apos;ve rated and saved comes
              with you. It&apos;s completely optional — MovieMatch works
              fine without it, this just carries your data across devices.
            </p>
          </div>

          {status === "sent" ? (
            <div className="space-y-2">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                We sent a confirmation link to{" "}
                <span className="font-medium">{pendingEmail}</span>. Click it
                to finish linking your account.
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={status === "sending"}
                className="text-xs font-medium text-fg-muted hover:text-fg underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Didn&apos;t get it? Resend
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 min-w-0 bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
              />
              <button
                type="submit"
                disabled={status === "sending" || !inputEmail.trim()}
                className="shrink-0 text-sm font-medium bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black rounded-lg px-4 py-2 transition-colors cursor-pointer"
              >
                {status === "sending" ? "Sending…" : "Send Verification Link"}
              </button>
            </form>
          )}

          {status === "error" && errorMessage && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          )}

          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium text-fg mb-1">
              Already saved your account on another device?
            </p>
            <p className="text-sm text-fg-muted mb-3">
              Sign in with that email to bring your ratings and lists to
              this device instead of starting fresh here.
            </p>

            {signInStatus === "sent" ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                If an account exists for{" "}
                <span className="font-medium">{signInEmail.trim()}</span>,
                we&apos;ve sent it a sign-in link. Click it on this device to
                switch to that account.
              </p>
            ) : (
              <form
                onSubmit={handleSignInSubmit}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 min-w-0 bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
                />
                <button
                  type="submit"
                  disabled={signInStatus === "sending" || !signInEmail.trim()}
                  className="shrink-0 text-sm font-medium bg-fill hover:bg-fill-hover disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-fg rounded-lg px-4 py-2 transition-colors cursor-pointer"
                >
                  {signInStatus === "sending" ? "Sending…" : "Send Sign-In Link"}
                </button>
              </form>
            )}

            {signInStatus === "error" && signInErrorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                {signInErrorMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {userId && (
        <div className="border-t border-border pt-3">
          <p className="text-xs text-fg-faint mb-1.5">
            Your ID (reference for support only — on its own it doesn&apos;t
            grant access to your data):
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate bg-surface-muted border border-border rounded-lg px-2.5 py-2 text-xs text-fg-secondary font-mono">
              {userId}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 text-xs font-medium bg-fill hover:bg-fill-hover text-fg rounded-lg px-3 py-2 transition-colors cursor-pointer"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
