import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface RepoResult {
  candidates?: string[];
  repo_full_name?: string;
  error?: string;
}

export default function Onboarding() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    fetch("/api/list-my-repos")
      .then(async (res) => {
        const data: RepoResult = await res.json();
        if (data.repo_full_name) {
          window.location.href = "/";
          return;
        }
        if (data.candidates) {
          setCandidates(data.candidates);
        } else if (data.error) {
          setError(data.error);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to look up your repos.");
        setLoading(false);
      });
  }, []);

  async function selectRepo(fullName: string) {
    setSelecting(true);
    const res = await fetch(`/api/list-my-repos?select=${encodeURIComponent(fullName)}`);
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Couldn't select that repo - try again.");
      setSelecting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="border-2 border-foreground p-8 w-full max-w-sm text-center space-y-4">
        {loading && (
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Looking for your coach repo…
          </p>
        )}

        {!loading && error && <p className="text-sm text-destructive">{error}</p>}

        {!loading && !error && candidates.length === 0 && (
          <>
            <h2 className="text-xl font-bold uppercase tracking-widest">No repo found</h2>
            <p className="text-sm text-muted-foreground">
              None of the repos you granted access to have a SOUL.md and
              training/challenge_v2.json. Check the GitHub App's install settings to make
              sure you selected the right repo, or set one up first and sign in again.
            </p>
          </>
        )}

        {!loading && !error && candidates.length > 0 && (
          <>
            <h2 className="text-xl font-bold uppercase tracking-widest">Which repo is yours?</h2>
            <div className="space-y-2">
              {candidates.map((c) => (
                <Button
                  key={c}
                  variant="outline"
                  disabled={selecting}
                  onClick={() => selectRepo(c)}
                  className="w-full justify-start rounded-none border-2 border-foreground font-mono text-xs"
                >
                  {c}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
