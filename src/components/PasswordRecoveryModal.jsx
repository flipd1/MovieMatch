import { useState } from "react";

const MIN_PASSWORD_LENGTH = 8;

function friendlyErrorMessage(error) {
  if (error?.code === "weak_password") {
    return `Choose a stronger password (at least ${MIN_PASSWORD_LENGTH} characters).`;
  }
  if (error?.code === "same_password") {
    return "That's already your password.";
  }
  return error?.message || "Couldn't update your password. Try again.";
}

// Shown app-wide (see App.jsx) whenever the session arrived via clicking a
// "forgot password" email link — Supabase signs the browser into a
// temporary recovery session automatically, and this is the only thing
// that session should be used for before a real password is set.
export default function PasswordRecoveryModal({ onUpdatePassword, onDismiss }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setStatus("error");
      setErrorMessage(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords don't match.");
      return;
    }

    setStatus("sending");
    setErrorMessage(null);

    const { error } = await onUpdatePassword(password);
    if (error) {
      setStatus("error");
      setErrorMessage(friendlyErrorMessage(error));
      return;
    }

    setStatus("done");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-surface-strong border border-border rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/60 p-5 space-y-4">
        {status === "done" ? (
          <>
            <div>
              <h3 className="text-base font-semibold text-fg mb-1">
                Password updated
              </h3>
              <p className="text-sm text-fg-muted">
                You&apos;re signed in with your new password.
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full text-sm font-medium bg-amber-400 hover:bg-amber-300 text-black rounded-lg py-2 transition-colors cursor-pointer"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <div>
              <h3 className="text-base font-semibold text-fg mb-1">
                Set a new password
              </h3>
              <p className="text-sm text-fg-muted">
                Choose a new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min. 8 characters)"
                autoComplete="new-password"
                autoFocus
                className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="w-full bg-surface-muted border border-border rounded-lg px-3 py-2 text-base text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-border-strong"
              />
              <button
                type="submit"
                disabled={status === "sending" || !password}
                className="w-full text-sm font-medium bg-amber-400 hover:bg-amber-300 disabled:bg-surface-muted disabled:text-fg-faint disabled:cursor-not-allowed text-black rounded-lg py-2 transition-colors cursor-pointer"
              >
                {status === "sending" ? "Updating…" : "Update Password"}
              </button>
            </form>

            {status === "error" && errorMessage && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
