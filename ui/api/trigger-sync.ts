const REPO = process.env.GITHUB_REPO ?? "";
const WORKFLOW = process.env.GITHUB_WORKFLOW ?? "";
const COOLDOWN_MS = 60_000;

let lastDispatchTime = 0;

export default {
  async fetch(req: Request): Promise<Response> {
    if (!REPO || !WORKFLOW) {
      return Response.json({ error: "GITHUB_REPO or GITHUB_WORKFLOW not configured" }, { status: 500 });
    }

    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const token = process.env.GITHUB_PAT;
    if (!token) {
      return Response.json({ error: "GITHUB_PAT not configured" }, { status: 500 });
    }

    const now = Date.now();
    if (now - lastDispatchTime < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - lastDispatchTime)) / 1000);
      return Response.json({ ok: false, error: `Sync already triggered. Try again in ${waitSec}s.` }, { status: 429 });
    }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({ ref: "main" }),
        }
      );

      if (res.status === 204) {
        lastDispatchTime = now;
        return Response.json({ ok: true, message: "Sync triggered" });
      }

      const body = await res.text();
      return Response.json({ ok: false, error: `GitHub API returned ${res.status}`, detail: body }, { status: res.status });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  },
};
