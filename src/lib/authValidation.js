export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function friendlyErrorMessage(error) {
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
