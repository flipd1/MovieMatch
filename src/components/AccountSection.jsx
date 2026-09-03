import { useEffect, useRef, useState } from "react";
import { EMAIL_REGEX, MIN_PASSWORD_LENGTH, friendlyErrorMessage } from "../lib/authValidation";

export default function AccountSection({
  userId,
  email,
  isAnonymous,
  createAccount,
  signOut,
  focusTarget,
  onFocusHandled,
}) {
  const [copied, setCopied] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const createEmailRef = useRef(null);

  // Create Account
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createStatus, setCreateStatus] = useState("idle"); // idle | sending | sent | done | error
  const [createErrorMessage, setCreateErrorMessage] = useState(null);
  const [createdEmail, setCreatedEmail] = useState(null);

  const linked = !isAnonymous && Boolean(email);

  // Scrolls to and focuses the Create Account form when the "Don't have an
  // account? Create one" link in the Sign In modal is clicked — this
  // section stays mounted at all times (Settings is a tab whose content is
  // only CSS-hidden, not unmounted), so a plain effect keyed off the target
  // is enough; no need to wait for anything to mount.
  useEffect(() => {
    if (focusTarget !== "create" || linked) return;
    createEmailRef.current?.focus();
    createEmailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    onFocusHandled?.();
  }, [focusTarget, linked, onFocusHandled]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail silently; the ID is still selectable.
    }
  };

  const handleSignOut = async () => {
    setSignOutPending(true);
    await signOut();
    setSignOutPending(false);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const trimmed = createEmail.trim();

    if (!EMAIL_REGEX.test(trimmed)) {
      setCreateStatus("error");
      setCreateErrorMessage("Enter a valid email address.");
      return;
    }
    if (createPassword.length < MIN_PASSWORD_LENGTH) {
      setCreateStatus("error");
      setCreateErrorMessage(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }
    if (createPassword !== createConfirmPassword) {
      setCreateStatus("error");
      setCreateErrorMessage("Passwords don't match.");
      return;
    }

    setCreateStatus("sending");
    setCreateErrorMessage(null);

    const { error, isAnonymous: stillAnonymous } = await createAccount({
      email: trimmed,
      password: createPassword,
    });

    if (error) {
      setCreateStatus("error");
      setCreateErrorMessage(friendlyErrorMessage(error));
      return;
    }

    setCreatedEmail(trimmed);
    setCreateStatus(stillAnonymous ? "sent" : "done");
  };

  return (
    <div className="space-y-4">
      {linked ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm text-fg">
              Signed in as <span className="font-medium text-fg">{email}</span>
            </p>
            <p className="text-sm text-fg-muted">
              Your ratings, lists, and preferences are tied to this account
              and follow you to any device you sign into it from.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signOutPending}
            className="text-sm font-medium bg-fill hover:bg-fill-hover disabled:opacity-60 disabled:cursor-not-allowed text-fg rounded-lg px-4 py-2 transition-colors cursor-pointer"
          >
            {signOutPending ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-fg mb-1">Create Account</p>
          <p className="text-sm text-fg-muted">
            Right now your ratings and lists are saved only to this browser
            on this device — switch to a different phone, computer, or even
            a different browser on the same device, and they won&apos;t be
            there.
          </p>
          <p className="text-sm text-fg-muted mt-2">
            Creating an account fixes that: sign in with the same email and
            password anywhere, and everything you&apos;ve rated and saved
            comes with you. It&apos;s completely optional — MovieMatch works
            fine without it.
          </p>

          {createStatus === "sent" || createStatus === "done" ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-3">
              {createStatus === "done"
                ? "Account created — you're all set."
                : `We sent a confirmation link to ${createdEmail}. Your password is already set — click the link to finish creating your account.`}
            </p>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-2 mt-3">
              <input
                ref={createEmailRef}
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
              />
              <input
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Password (min. 8 characters)"
                autoComplete="new-password"
                className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
              />
              <input
                type="password"
                value={createConfirmPassword}
                onChange={(e) => setCreateConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
              />
              <button
                type="submit"
                disabled={
                  createStatus === "sending" ||
                  !createEmail.trim() ||
                  !createPassword
                }
                className="w-full text-sm font-medium bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black rounded-lg py-2 transition-colors cursor-pointer"
              >
                {createStatus === "sending" ? "Creating…" : "Create Account"}
              </button>
            </form>
          )}

          {createStatus === "error" && createErrorMessage && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              {createErrorMessage}
            </p>
          )}
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
