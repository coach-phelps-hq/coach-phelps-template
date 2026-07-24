/**
 * AuthContext — gates the app on /api/auth-me.
 *
 * "local" status covers plain `npm run dev`/self-hosted single-repo use, where
 * there's no hosted auth layer at all. Keyed off Vite's own import.meta.env.DEV
 * flag, not response shape - inferring "no /api layer" from a non-JSON or
 * failed response is wrong: a genuine production error would look identical
 * and silently unlock the dashboard instead of showing a gate. Any real
 * fetch/parse failure on the hosted deployment falls back to "unauthenticated"
 * (the login screen), never "local".
 *
 * VITE_FORCE_HOSTED_AUTH: an escape hatch for the one case where you're running
 * in dev mode but actually want the real flow - testing GitHub login and
 * authenticated /api/* routes (Coach Chat included) locally via `vercel dev`,
 * which serves those functions but is still Vite's dev server underneath, so
 * import.meta.env.DEV is still true. Without this override there'd be no way
 * to exercise real auth + a real session cookie on localhost at all. Set it in
 * your own .env.local (see .env.local.example) - unset, everything behaves
 * exactly as before this existed.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AuthStatus = "loading" | "local" | "unauthenticated" | "onboarding" | "authenticated";

interface AuthState {
  status: AuthStatus;
  login?: string;
  repoFullName?: string | null;
}

const AuthContext = createContext<AuthState>({ status: "loading" });

const isLocalBypass = import.meta.env.DEV && import.meta.env.VITE_FORCE_HOSTED_AUTH !== "true";

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(isLocalBypass ? { status: "local" } : { status: "loading" });

  useEffect(() => {
    if (isLocalBypass) return; // no hosted auth layer wanted here - already set above

    let cancelled = false;

    fetch("/api/auth-me")
      .then(async (res) => {
        if (cancelled) return;

        if (!res.ok) {
          setState({ status: "unauthenticated" });
          return;
        }

        const data = await res.json();
        if (!data.repo_full_name) {
          setState({ status: "onboarding", login: data.login });
        } else {
          setState({ status: "authenticated", login: data.login, repoFullName: data.repo_full_name });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "unauthenticated" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
