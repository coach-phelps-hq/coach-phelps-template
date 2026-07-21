import {
  encryptSession,
  buildCookie,
  clearCookie,
  parseCookies,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  OAUTH_STATE_COOKIE,
} from "./_lib/session";

const CLIENT_ID = process.env.GITHUB_OAUTH_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "";

export default {
  async fetch(req: Request): Promise<Response> {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return Response.json({ error: "OAuth app not configured" }, { status: 500 });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return Response.json({ error: "Missing code or state" }, { status: 400 });
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
    });

    const headers = new Headers();
    headers.set("Location", "/");
    headers.append("Set-Cookie", buildCookie(SESSION_COOKIE, session, SESSION_MAX_AGE_SEC));
    headers.append("Set-Cookie", clearCookie(OAUTH_STATE_COOKIE));

    return new Response(null, { status: 302, headers });
  },
};
