import { useEffect, useRef, useState } from "react";
import { EMAIL_REGEX, friendlyErrorMessage } from "../lib/authValidation";

export default function SignInModal({
  onClose,
  hasLocalRatings,
  signIn,
  signInAndMerge,
  requestPasswordReset,
  onCreateAccount,
}) {
  const emailRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [pendingSignIn, setPendingSignIn] = useState(null);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState("idle"); // idle | sending | sent | error
  const [forgotErrorMessage, setForgotErrorMessage] = useState(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const performSignIn = async (nextEmail, nextPassword, merge) => {
    setStatus("sending");
    setErrorMessage(null);

    const signInFn = merge ? signInAndMerge : signIn;
    const { error } = await signInFn({ email: nextEmail, password: nextPassword });
    if (error) {
      setStatus("error");
      setErrorMessage(friendlyErrorMessage(error));
      return;
    }

    // Success re-renders Settings into its "Signed in as…" state once the
    // session swap comes through onAuthStateChange — this modal's job ends
    // as soon as the request succeeds.
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!EMAIL_REGEX.test(trimmed)) {
      setStatus("error");
      setErrorMessage("Enter a valid email address.");
      return;
    }
    if (!password) {
      setStatus("error");
      setErrorMessage("Enter your password.");
      return;
    }

    if (hasLocalRatings) {
      setPendingSignIn({ email: trimmed, password });
      return;
    }

    await performSignIn(trimmed, password);
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-surface-strong rounded-xl ring-1 ring-border sm:my-auto p-6 sm:p-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-fill hover:bg-fill-hover text-fg transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 20 20"
            className="w-4 h-4 fill-none stroke-current stroke-2"
          >
            <line x1="4" y1="4" x2="16" y2="16" />
            <line x1="16" y1="4" x2="4" y2="16" />
          </svg>
        </button>

        <div>
          <h2 className="text-xl font-semibold text-fg mb-1">Sign In</h2>
          <p className="text-sm text-fg-secondary">
            Already created an account on another device? Sign in to bring
            your ratings and lists here instead of starting fresh.
          </p>
        </div>

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
                  disabled={forgotStatus === "sending" || !forgotEmail.trim()}
                  className="w-full text-sm font-medium bg-fill hover:bg-fill-hover disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-fg rounded-lg py-2 transition-colors cursor-pointer"
                >
                  {forgotStatus === "sending" ? "Sending…" : "Send Reset Link"}
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
            <form onSubmit={handleSubmit} className="space-y-2">
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
              />
              <button
                type="submit"
                disabled={status === "sending" || !email.trim() || !password}
                className="w-full text-sm font-medium bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black rounded-lg py-2 transition-colors cursor-pointer"
              >
                {status === "sending" ? "Signing in…" : "Sign In"}
              </button>
            </form>
            {status === "error" && errorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errorMessage}
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
                onClick={onCreateAccount}
                className="text-xs font-medium text-fg-muted hover:text-fg underline cursor-pointer"
              >
                Don&apos;t have an account? Create one
              </button>
            </div>
          </div>
        )}
      </div>

      {pendingSignIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            e.stopPropagation();
            setPendingSignIn(null);
          }}
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
                rated), or leave them behind (they&apos;re not deleted, just
                no longer tied to your active session).
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
