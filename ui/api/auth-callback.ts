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

    // Resolve installation_id via GET /user/installations, verified against BOTH app_slug
    // and account.login. app_slug alone isn't enough: this endpoint returns every
    // installation the calling user has *any visibility into*, which GitHub grants based on
    // repo access - not just installations the user personally created. A collaborator on
    // someone else's repo that already has the App installed will see that installation too.
    // Confirmed in practice: without the account.login check, a collaborator's session
    // resolved to the repo owner's installation, not their own (a real cross-account data
    // exposure - see coach-phelps-hq/coach-phelps-template#30). account.login is the account
    // the App is actually installed *on*, which is what "is this actually my installation"
    // has to mean.
    const installationsRes = await fetch("https://api.github.com/user/installations", {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    let installationId: number | null = null;
    if (installationsRes.ok) {
      const { installations } = (await installationsRes.json()) as {
        installations: Array<{ id: number; app_slug: string; account: { login: string } }>;
      };
      const match = installations.find(
        (i) =>
          i.app_slug === APP_SLUG &&
          i.account.login.toLowerCase() === (user.login as string).toLowerCase()
      );
      installationId = match?.id ?? null;
    }

    if (!installationId) {
      const installUrl = `https://github.com/apps/${APP_SLUG}/installations/new`;
      return Response.json(
        {
          error: "You haven't installed Coach Phelps on your own GitHub account yet.",
          install_url: installUrl,
        },
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
