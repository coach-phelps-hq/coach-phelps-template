/**
 * AuthContext — gates the app on /api/auth-me.
 *
 * "local" status covers plain `npm run dev`/self-hosted single-repo use, where
 * no /api routes are actually served — Vite's dev server falls back to
 * index.html (200, text/html) for any unmatched path rather than a real 404,
 * so we can't key off status code alone. Checking Content-Type instead: a
 * real deployment's auth-me always answers with application/json.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AuthStatus = "loading" | "local" | "unauthenticated" | "onboarding" | "authenticated";

interface AuthState {
  status: AuthStatus;
  login?: string;
  repoFullName?: string | null;
}

const AuthContext = createContext<AuthState>({ status: "loading" });

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth-me")
      .then(async (res) => {
        if (cancelled) return;

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
          // No real /api/auth-me handler behind this - local single-repo dev.
          setState({ status: "local" });
          return;
        }

        if (res.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }
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
        if (!cancelled) setState({ status: "local" });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
