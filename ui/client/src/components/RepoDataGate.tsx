import type { ReactNode } from "react";
import "@/components/home-warm/warm-instrument.css";
import "@/components/login/login.css";

interface Props {
  loading: boolean;
  error: string | null;
  schemaUnsupported: boolean;
  children: ReactNode;
}

/** Loading/error/schema-mismatch states shared by every page reading useRepoData(). */
export function RepoDataGate({ loading, error, schemaUnsupported, children }: Props) {
  if (loading) {
    return (
      <div className="wi-shell">
        <div className="auth-card-shell">
          <p className="auth-card__eyebrow">Loading your data…</p>
        </div>
      </div>
    );
  }

  if (schemaUnsupported) {
    return (
      <div className="wi-shell">
        <div className="auth-card-shell">
          <div className="auth-card">
            <h2 className="auth-card__heading">Repo needs updating</h2>
            <p className="auth-card__body">
              Your repo's data format is newer than what this dashboard supports. Pull the
              latest template changes and sync again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wi-shell">
        <div className="auth-card-shell">
          <div className="auth-card">
            <h2 className="auth-card__heading">Couldn't load your data</h2>
            <p className="auth-card__body auth-card__body--error">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
