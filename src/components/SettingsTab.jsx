import { useState } from "react";
import ServiceCheckboxes from "./ServiceCheckboxes";
import AccountSection from "./AccountSection";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import BetaBadge from "./BetaBadge";

export default function SettingsTab({
  userId,
  email,
  isAnonymous,
  hasLocalRatings,
  createAccount,
  signIn,
  signInAndMerge,
  signOut,
  requestPasswordReset,
  services,
  onServicesChange,
  isPro,
  onIsProChange,
  earlyAccess,
  onEarlyAccessChange,
  accountFocusTarget,
  onAccountFocusHandled,
}) {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const toggleService = (id) => {
    onServicesChange(
      services.includes(id)
        ? services.filter((s) => s !== id)
        : [...services, id]
    );
  };

  return (
    <div className="max-w-2xl space-y-10">
      <section>
        <h2 className="text-lg font-medium text-fg-secondary mb-3">
          Account
        </h2>
        <AccountSection
          userId={userId}
          email={email}
          isAnonymous={isAnonymous}
          hasLocalRatings={hasLocalRatings}
          createAccount={createAccount}
          signIn={signIn}
          signInAndMerge={signInAndMerge}
          signOut={signOut}
          requestPasswordReset={requestPasswordReset}
          focusTarget={accountFocusTarget}
          onFocusHandled={onAccountFocusHandled}
        />
      </section>

      <section>
        <h2 className="text-lg font-medium text-fg-secondary mb-1">
          My Streaming Services
        </h2>
        <p className="text-sm text-fg-muted mb-3">
          Used to filter recommendations to what you can actually watch, and
          to pre-fill Watch Tonight.
        </p>
        <ServiceCheckboxes selected={services} onToggle={toggleService} />
      </section>

      {import.meta.env.DEV && (
        <section>
          <h2 className="text-lg font-medium text-fg-secondary mb-1">
            Pro Access
          </h2>
          <p className="text-sm text-fg-muted mb-3">
            MovieMatch doesn&apos;t have payments set up yet, so this is a
            stand-in for a future subscription — flip it on to preview
            Pro-only features like Your Stats.{" "}
            <span className="text-fg-faint">
              (Dev-only — this panel doesn&apos;t appear in production.)
            </span>
          </p>
          <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
            <input
              type="checkbox"
              checked={isPro}
              onChange={(e) => onIsProChange(e.target.checked)}
              className="accent-amber-400 w-3.5 h-3.5"
            />
            Enable Pro Access (Demo)
          </label>

          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="flex items-center gap-2 text-sm font-medium text-fg mb-1">
              Early Access <BetaBadge />
            </h3>
            <p className="text-sm text-fg-muted mb-3">
              Opt into beta features before they&apos;re released to
              everyone else. Nothing&apos;s in beta right now — this just
              turns it on for when something is. Requires Pro Access.
            </p>
            <label
              className={`flex items-center gap-2 text-sm text-fg ${
                isPro ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
              }`}
            >
              <input
                type="checkbox"
                checked={earlyAccess}
                disabled={!isPro}
                onChange={(e) => onEarlyAccessChange(e.target.checked)}
                className="accent-sky-400 w-3.5 h-3.5"
              />
              Enable Early Access (Beta)
            </label>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium text-fg-secondary mb-1">
          Privacy
        </h2>
        <button
          type="button"
          onClick={() => setPrivacyOpen(true)}
          className="text-sm font-medium text-fg-muted hover:text-fg underline cursor-pointer"
        >
          Privacy Policy
        </button>
      </section>

      {privacyOpen && (
        <PrivacyPolicyModal onClose={() => setPrivacyOpen(false)} />
      )}
    </div>
  );
}
