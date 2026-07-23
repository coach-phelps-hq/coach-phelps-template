import "@/components/home-warm/warm-instrument.css";
import "@/components/login/login.css";

const MESSAGES: Record<string, { heading: string; body: string; cta: string; href: string }> = {
  not_installed: {
    heading: "Not installed yet",
    body: "You're signed into GitHub, but Coach Phelps isn't installed on your account yet. Sign up to install it and pick your repo.",
    cta: "Sign up with GitHub",
    href: "/api/auth-install",
  },
  lookup_failed: {
    heading: "Something went wrong",
    body: "Couldn't check your GitHub installation just now - this is usually a transient GitHub API hiccup. Try again.",
    cta: "Try logging in again",
    href: "/api/auth-login",
  },
  state_mismatch: {
    heading: "Sign-in expired",
    body: "That sign-in link looks stale or was tampered with. Try again.",
    cta: "Try logging in again",
    href: "/api/auth-login",
  },
  missing_oauth_session: {
    heading: "Sign-in expired",
    body: "Your sign-in session expired before GitHub redirected back. Try again.",
    cta: "Try logging in again",
    href: "/api/auth-login",
  },
  corrupt_oauth_session: {
    heading: "Sign-in expired",
    body: "Your sign-in session expired before GitHub redirected back. Try again.",
    cta: "Try logging in again",
    href: "/api/auth-login",
  },
  missing_params: {
    heading: "Sign-in incomplete",
    body: "GitHub didn't send back what we needed to finish signing you in. Try again.",
    cta: "Try logging in again",
    href: "/api/auth-login",
  },
  token_exchange_failed: {
    heading: "Something went wrong",
    body: "GitHub rejected the sign-in exchange. Try again.",
    cta: "Try logging in again",
    href: "/api/auth-login",
  },
  user_fetch_failed: {
    heading: "Something went wrong",
    body: "Couldn't fetch your GitHub profile just now. Try again.",
    cta: "Try logging in again",
    href: "/api/auth-login",
  },
  config_error: {
    heading: "Site misconfigured",
    body: "The site isn't set up correctly - this isn't something you can fix. Let Skanda or Akash know.",
    cta: "Try logging in again",
    href: "/api/auth-login",
  },
};

const FALLBACK = MESSAGES.token_exchange_failed;

export default function AuthError({ type }: { type: string }) {
  const msg = MESSAGES[type] ?? FALLBACK;

  return (
    <div className="wi-shell">
      <div className="auth-card-shell">
        <div className="auth-card">
          <span className="auth-card__eyebrow">Sign-in error</span>
          <h1 className="auth-card__heading">{msg.heading}</h1>
          <p className="auth-card__body">{msg.body}</p>
          <div className="auth-card__buttons">
            <a href={msg.href} className="auth-card__button auth-card__button--primary">
              {msg.cta}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
