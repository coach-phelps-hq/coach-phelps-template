/**
 * list-my-repos.ts — repo resolution: find the signed-in user's coach-phelps
 * repo and remember it in their session.
 *
 * With the GitHub App migration, candidates come directly from the repos the
 * user chose during install (GET /user/installations/{id}/repositories) -
 * already exactly the set they granted, no name-pattern filtering needed.
 * The training/challenge_v2.json marker check stays as a sanity check.
 *
 * GET                          → list/confirm candidates, auto-select if exactly one.
 * GET ?select=<owner>/<name>   → confirm and persist a specific pick (2+ case).
 */
import {
  decryptSession,
  encryptSession,
  buildCookie,
  parseCookies,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
} from "./_lib/session.js";

interface GhRepo {
  full_name: string;
  name: string;
}

const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function hasMarkerFile(repoFullName: string, token: string): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/repos/${repoFullName}/contents/training/challenge_v2.json`,
    { headers: GH_HEADERS(token) }
  );
  return res.status === 200;
}

function withUpdatedSession(body: unknown, sessionToken: string, status = 200): Response {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.append("Set-Cookie", buildCookie(SESSION_COOKIE, sessionToken, SESSION_MAX_AGE_SEC));
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(req: Request): Promise<Response> {
    const cookies = parseCookies(req);
    const raw = cookies[SESSION_COOKIE];
    if (!raw) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const session = await decryptSession(raw);
    if (!session) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const url = new URL(req.url);
    const selected = url.searchParams.get("select");

    // Explicit pick from a 2+ candidate list.
    if (selected) {
      const ok = await hasMarkerFile(selected, session.gh_token);
      if (!ok) {
        return Response.json(
          { error: "That repo doesn't look like a coach-phelps repo (no training/challenge_v2.json)" },
          { status: 400 }
        );
      }
      const newSession = await encryptSession({ ...session, repo_full_name: selected });
      return withUpdatedSession({ repo_full_name: selected }, newSession);
    }

    // Re-confirm an already-resolved repo still exists/is accessible before trusting it.
    if (session.repo_full_name) {
      const stillOk = await hasMarkerFile(session.repo_full_name, session.gh_token);
      if (stillOk) {
        return Response.json({ repo_full_name: session.repo_full_name });
      }
      // Falls through to re-resolve below if it 404s (deleted/renamed/access lost).
    }

    // Exactly the repos this installation was granted - no name-pattern filtering needed,
    // that's the whole point of installation-scoped access over blanket repo scope.
    const reposRes = await fetch(
      `https://api.github.com/user/installations/${session.installation_id}/repositories?per_page=100`,
      { headers: GH_HEADERS(session.gh_token) }
    );

    if (!reposRes.ok) {
      return Response.json({ error: "Failed to list repos granted to this installation" }, { status: 502 });
    }

    const { repositories } = (await reposRes.json()) as { repositories: GhRepo[] };

    const confirmed: string[] = [];
    for (const repo of repositories) {
      if (await hasMarkerFile(repo.full_name, session.gh_token)) {
        confirmed.push(repo.full_name);
      }
    }

    if (confirmed.length === 1) {
      const newSession = await encryptSession({ ...session, repo_full_name: confirmed[0] });
      return withUpdatedSession({ repo_full_name: confirmed[0] }, newSession);
    }

    // 0 or 2+ - client decides what to render (empty state / picker).
    return Response.json({ candidates: confirmed });
  },
};
