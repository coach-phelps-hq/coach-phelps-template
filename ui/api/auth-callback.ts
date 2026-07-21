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
const APP_SLUG = process.env.GITHUB_APP_SLUG ?? "coach-phelps";

export default {
  async fetch(req: Request): Promise<Response> {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return Response.json({ error: "GitHub App not configured" }, { status: 500 });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    // Present when GitHub redirects from the install flow; not guaranteed on the plain
    // /login/oauth/authorize entry point auth-login.ts uses (that's the actual sign-in
    // endpoint - see auth-login.ts for why). Falls back to looking the installation up
    // via the API below if absent, rather than hard-requiring it here.
    const installationIdParam = url.searchParams.get("installation_id");

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

    // Token exchange endpoint/shape is unchanged from the classic OAuth App flow - GitHub
    // Apps' user-to-server tokens use the same endpoint, just keyed by the App's client
    // credentials. PKCE is well-supported here since auth-login.ts now goes through the
    // direct /login/oauth/authorize entry point (not the install-first path, which had
    // this unconfirmed).
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

    let installationId: number | null = installationIdParam ? Number(installationIdParam) : null;
    if (!installationId) {
      const installationsRes = await fetch("https://api.github.com/user/installations", {
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (installationsRes.ok) {
        const { installations } = (await installationsRes.json()) as {
          installations: Array<{ id: number; app_slug: string }>;
        };
        const match = installations.find((i) => i.app_slug === APP_SLUG);
        installationId = match?.id ?? null;
      }
    }

    if (!installationId) {
      return Response.json(
        { error: "Couldn't find a Coach Phelps installation on your account - install the app first" },
        { status: 400 }
      );
    }

    const session = await encryptSession({
      github_user_id: user.id,
      login: user.login,
      gh_token: ghToken,
      installation_id: installationId,
    });

    const headers = new Headers();
    headers.set("Location", "/");
    headers.append("Set-Cookie", buildCookie(SESSION_COOKIE, session, SESSION_MAX_AGE_SEC));
    headers.append("Set-Cookie", clearCookie(OAUTH_STATE_COOKIE));

    return new Response(null, { status: 302, headers });
  },
};
