import {
  encryptSession,
  buildCookie,
  clearCookie,
  parseCookies,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  OAUTH_STATE_COOKIE,
} from "./_lib/session.js";

const CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GITHUB_APP_CLIENT_SECRET ?? "";

export default {
  async fetch(req: Request): Promise<Response> {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return Response.json({ error: "GitHub App not configured" }, { status: 500 });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    // Present because auth-login.ts goes through the App's install-and-authorize flow
    // (/apps/<slug>/installations/new), not a bare authorize call - GitHub appends this
    // once the user finishes installing. Absent only if something in that flow was skipped.
    const installationId = url.searchParams.get("installation_id");

    if (!code || !state) {
      return Response.json({ error: "Missing code or state" }, { status: 400 });
    }
    if (!installationId) {
      return Response.json(
        { error: "Missing installation_id - did the GitHub App install step complete?" },
        { status: 400 }
      );
    }

    const cookies = parseCookies(req);
    const tempRaw = cookies[OAUTH_STATE_COOKIE];
    if (!tempRaw) {
      return Response.json({ error: "Missing OAuth session - try signing in again" }, { status: 400 });
    }

    let tempData: { state: string; codeVerifier: string };
    try {
      tempData = JSON.parse(tempRaw);
    } catch {
      return Response.json({ error: "Corrupt OAuth session - try signing in again" }, { status: 400 });
    }

    if (tempData.state !== state) {
      return Response.json({ error: "State mismatch - possible CSRF, try signing in again" }, { status: 400 });
    }

    const redirectUri = `${url.origin}/api/auth-callback`;

    // Token exchange endpoint/shape is unchanged from the classic OAuth App flow - GitHub
    // Apps' user-to-server tokens use the same endpoint, just keyed by the App's client
    // credentials. NOTE: GitHub's docs primarily document PKCE for the direct
    // /login/oauth/authorize entry point; whether code_verifier survives the
    // install-first (/apps/<slug>/installations/new) path used in auth-login.ts is not
    // fully confirmed - verify this exchange actually succeeds during real end-to-end
    // testing. If GitHub rejects it, drop code_verifier here and code_challenge in
    // auth-login.ts (state alone still covers CSRF).
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        code_verifier: tempData.codeVerifier,
      }),
    });

    const tokenBody = await tokenRes.json();
    if (!tokenRes.ok || tokenBody.error || !tokenBody.access_token) {
      return Response.json({ error: "Token exchange failed", detail: tokenBody }, { status: 400 });
    }

    const ghToken = tokenBody.access_token as string;

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userRes.ok) {
      return Response.json({ error: "Failed to fetch GitHub user" }, { status: 502 });
    }

    const user = await userRes.json();

    const session = await encryptSession({
      github_user_id: user.id,
      login: user.login,
      gh_token: ghToken,
      installation_id: Number(installationId),
    });

    const headers = new Headers();
    headers.set("Location", "/");
    headers.append("Set-Cookie", buildCookie(SESSION_COOKIE, session, SESSION_MAX_AGE_SEC));
    headers.append("Set-Cookie", clearCookie(OAUTH_STATE_COOKIE));

    return new Response(null, { status: 302, headers });
  },
};
