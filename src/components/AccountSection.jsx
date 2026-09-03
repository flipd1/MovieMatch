import { useEffect, useRef, useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function friendlyErrorMessage(error) {
  if (error?.name === "AuthSessionMissingError") {
    return "Still setting up your session — wait a moment and try again.";
  }

  switch (error?.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts — please wait a bit before trying again.";
    case "weak_password":
      return `Choose a stronger password (at least ${MIN_PASSWORD_LENGTH} characters).`;
    case "email_exists":
    case "user_already_exists":
      return "An account with that email already exists — try signing in instead.";
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "Confirm your email first — check your inbox for the confirmation link.";
    case "same_password":
      return "That's already your password.";
    default:
      return error?.message || "Something went wrong. Try again.";
  }
}

export default function AccountSection({
  userId,
  email,
  isAnonymous,
  hasLocalRatings,
  createAccount,
  signIn,
  signInAndMerge,
  signOut,
  requestPasswordReset,
  focusTarget,
  onFocusHandled,
}) {
  const [copied, setCopied] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const signInEmailRef = useRef(null);
  const createEmailRef = useRef(null);

  // Create Account
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createStatus, setCreateStatus] = useState("idle"); // idle | sending | sent | done | error
  const [createErrorMessage, setCreateErrorMessage] = useState(null);
  const [createdEmail, setCreatedEmail] = useState(null);

  // Sign In
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInStatus, setSignInStatus] = useState("idle"); // idle | sending | error
  const [signInErrorMessage, setSignInErrorMessage] = useState(null);
  const [pendingSignIn, setPendingSignIn] = useState(null);

  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("idle"); // idle | sending | sent | error
  const [forgotErrorMessage, setForgotErrorMessage] = useState(null);

  const linked = !isAnonymous && Boolean(email);

  // Scrolls to and focuses the Sign In or Create Account form when the
  // header's "Sign In" button (or the cross-link between the two forms) is
  // clicked — this section stays mounted at all times (Settings is a tab
  // whose content is only CSS-hidden, not unmounted), so a plain effect
  // keyed off the target is enough; no need to wait for anything to mount.
  const focusField = (ref) => {
    ref.current?.focus();
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    if (!focusTarget || linked) return;
    if (focusTarget === "signin") focusField(signInEmailRef);
    if (focusTarget === "create") focusField(createEmailRef);
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

  const performSignIn = async (nextEmail, nextPassword, merge) => {
    setSignInStatus("sending");
    setSignInErrorMessage(null);

    const signInFn = merge ? signInAndMerge : signIn;
    const { error } = await signInFn({ email: nextEmail, password: nextPassword });
    if (error) {
      setSignInStatus("error");
      setSignInErrorMessage(friendlyErrorMessage(error));
      return;
    }

    // Success re-renders this component into the `linked` branch once the
    // session swap comes through onAuthStateChange — no separate "done"
    // state needed here.
    setSignInStatus("idle");
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    const trimmed = signInEmail.trim();

    if (!EMAIL_REGEX.test(trimmed)) {
      setSignInStatus("error");
      setSignInErrorMessage("Enter a valid email address.");
      return;
    }
    if (!signInPassword) {
      setSignInStatus("error");
      setSignInErrorMessage("Enter your password.");
      return;
    }

    if (hasLocalRatings) {
      setPendingSignIn({ email: trimmed, password: signInPassword });
      return;
    }

    await performSignIn(trimmed, signInPassword);
  };

  const handleConfirmCollision = async (merge) => {
    const pending = pendingSignIn;
    setPendingSignIn(null);
    if (pending) await performSignIn(pending.email, pending.password, merge);
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    const trimmed = forgotEmail.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setForgotStatus("error");
      setForgotErrorMessage("Enter a valid email address.");
      return;
    }

    setForgotStatus("sending");
    setForgotErrorMessage(null);

    const { error } = await requestPasswordReset(trimmed);
    if (error) {
      setForgotStatus("error");
      setForgotErrorMessage(friendlyErrorMessage(error));
      return;
    }

    setForgotStatus("sent");
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
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-fg mb-1">Sign In</p>
            <p className="text-sm text-fg-muted mb-3">
              Already created an account on another device? Sign in to bring
              your ratings and lists here instead of starting fresh.
            </p>

            {showForgotPassword ? (
              <div className="space-y-2">
                {forgotStatus === "sent" ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    If an account exists for{" "}
                    <span className="font-medium">{forgotEmail.trim()}</span>,
                    we&apos;ve sent a password reset link to it.
                  </p>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-2">
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
                    />
                    <button
                      type="submit"
                      disabled={
                        forgotStatus === "sending" || !forgotEmail.trim()
                      }
                      className="w-full text-sm font-medium bg-fill hover:bg-fill-hover disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-fg rounded-lg py-2 transition-colors cursor-pointer"
                    >
                      {forgotStatus === "sending"
                        ? "Sending…"
                        : "Send Reset Link"}
                    </button>
                  </form>
                )}
                {forgotStatus === "error" && forgotErrorMessage && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {forgotErrorMessage}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotStatus("idle");
                    setForgotErrorMessage(null);
                  }}
                  className="text-xs font-medium text-fg-muted hover:text-fg underline cursor-pointer"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <form onSubmit={handleSignInSubmit} className="space-y-2">
                  <input
                    ref={signInEmailRef}
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
                  />
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
                  />
                  <button
                    type="submit"
                    disabled={
                      signInStatus === "sending" ||
                      !signInEmail.trim() ||
                      !signInPassword
                    }
                    className="w-full text-sm font-medium bg-fill hover:bg-fill-hover disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-fg rounded-lg py-2 transition-colors cursor-pointer"
                  >
                    {signInStatus === "sending" ? "Signing in…" : "Sign In"}
                  </button>
                </form>
                {signInStatus === "error" && signInErrorMessage && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {signInErrorMessage}
                  </p>
                )}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-medium text-fg-muted hover:text-fg underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={() => focusField(createEmailRef)}
                    className="text-xs font-medium text-fg-muted hover:text-fg underline cursor-pointer"
                  >
                    Don&apos;t have an account? Create one
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-fg mb-1">
                Create Account
              </p>
              <p className="text-sm text-fg-muted">
                Right now your ratings and lists are saved only to this
                browser on this device — switch to a different phone,
                computer, or even a different browser on the same device,
                and they won&apos;t be there.
              </p>
              <p className="text-sm text-fg-muted mt-2">
                Creating an account fixes that: sign in with the same email
                and password anywhere, and everything you&apos;ve rated and
                saved comes with you. It&apos;s completely optional —
                MovieMatch works fine without it.
              </p>
            </div>

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
                  {createStatus === "sending"
                    ? "Creating…"
                    : "Create Account"}
                </button>
              </form>
            )}

            {createStatus === "error" && createErrorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                {createErrorMessage}
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

      {pendingSignIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPendingSignIn(null)}
        >
          <div
            className="w-full max-w-sm bg-surface-strong border border-border rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-medium text-fg mb-1">
                This browser has unsaved ratings
              </h3>
              <p className="text-sm text-fg-muted">
                This browser already has some ratings that aren&apos;t tied
                to any account. Signing in will switch to{" "}
                <span className="font-medium">{pendingSignIn.email}</span>
                &apos;s account — you can bring this browser&apos;s local
                ratings along (movies your account hasn&apos;t already
                rated), or leave them behind (they&apos;re not deleted,
                just no longer tied to your active session).
              </p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleConfirmCollision(true)}
                className="w-full text-sm font-medium bg-amber-400 hover:bg-amber-300 text-black rounded-lg py-2 transition-colors cursor-pointer"
              >
                Sign In &amp; Merge Ratings
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCollision(false)}
                className="w-full text-sm font-medium bg-fill hover:bg-fill-hover text-fg rounded-lg py-2 transition-colors cursor-pointer"
              >
                Sign In, Discard Local Ratings
              </button>
              <button
                type="button"
                onClick={() => setPendingSignIn(null)}
                className="w-full text-xs font-medium text-fg-muted hover:text-fg underline cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
