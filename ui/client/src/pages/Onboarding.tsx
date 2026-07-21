import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {loading && <p className="text-muted-foreground text-sm">Looking for your coach repo…</p>}

          {!loading && error && <p className="text-destructive text-sm">{error}</p>}

          {!loading && !error && candidates.length === 0 && (
            <>
              <h2 className="text-xl font-semibold">No coach-phelps repo found</h2>
              <p className="text-muted-foreground text-sm">
                We couldn't find a repo in your GitHub account with a SOUL.md and
                training/challenge_v2.json. Set one up first, then sign in again.
              </p>
            </>
          )}

          {!loading && !error && candidates.length > 0 && (
            <>
              <h2 className="text-xl font-semibold">Which repo is yours?</h2>
              <div className="space-y-2">
                {candidates.map((c) => (
                  <Button
                    key={c}
                    variant="outline"
                    disabled={selecting}
                    onClick={() => selectRepo(c)}
                    className="w-full justify-start"
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
