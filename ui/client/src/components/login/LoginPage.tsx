import { useMemo } from "react";
import { buildEngineSnapshot } from "@/components/home-warm/WarmInstrumentHome";
import { buildLiveWeekContract } from "@/components/home-warm/liveWeekContract";
import { buildWarmHomeModel } from "@/components/home-warm/warmHomeModel";
import { LoginEngineHero } from "@/components/login/LoginEngineHero";
import type { CurrentWeekContract } from "@/components/home-warm/currentWeek.fixture";
import type { Activity } from "@/lib/activities";
import type { ChallengeV2 } from "@/lib/challenge";
import type { SyncStatusPayload } from "@/components/home-warm/warmHomeModel";
import "@/components/home-warm/warm-instrument.css";
import "./login.css";

interface LoginPageProps {
  activities: Activity[];
  challengeData: ChallengeV2;
  currentWeek?: CurrentWeekContract;
  syncStatus: SyncStatusPayload;
}

function GitHubIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

export function LoginPage({
  activities,
  challengeData,
  currentWeek,
  syncStatus,
}: LoginPageProps) {
  const engine = useMemo(() => {
    const effectiveWeek = currentWeek ?? buildLiveWeekContract(activities, challengeData);
    const model = buildWarmHomeModel(activities, challengeData, syncStatus, effectiveWeek);
    return buildEngineSnapshot(activities, model.engine);
  }, [activities, challengeData, currentWeek, syncStatus]);

  return (
    <div className="wi-shell login-page">
      <header className="login-page__header">
        <span className="login-page__brand">COACH PHELPS</span>
        <span className="login-page__beta">PRIVATE BETA</span>
      </header>

      <main className="login-page__main">
        <div className="login-page__grid">
          <section className="login-page__form" aria-labelledby="login-title">
            <h1 id="login-title" className="login-page__title">
              Welcome back.
            </h1>
            <p className="login-page__voice">
              The engine&apos;s still warm — let&apos;s pick up where the block left off.{" "}
              <span className="login-page__voice-sign">— PHELPS</span>
            </p>

            <p className="login-page__hint">
              Already set up? Log in. First time, or adding another repo? Sign up.
            </p>

            <a href="/api/auth-login" className="login-page__github">
              <GitHubIcon />
              Log in with GitHub
            </a>

            <a href="/api/auth-install" className="login-page__github login-page__github--secondary">
              <GitHubIcon />
              Sign up with GitHub
            </a>
          </section>

          <div className="login-page__hero">
            <LoginEngineHero engine={engine} />
          </div>
        </div>
      </main>

      <footer className="login-page__footer">
        <span className="login-page__legal">
          BY SIGNING IN YOU AGREE TO THE <a href="#">TERMS</a> · <a href="#">PRIVACY</a>
        </span>
      </footer>
    </div>
  );
}
