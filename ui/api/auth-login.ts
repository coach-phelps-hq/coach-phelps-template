import { generateRandomString, generateCodeChallenge } from "./_lib/pkce.js";
import { buildCookie, OAUTH_STATE_COOKIE } from "./_lib/session.js";

const CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID ?? "";
const OAUTH_STATE_MAX_AGE_SEC = 600; // 10 min - just needs to survive the redirect round trip

export default {
  async fetch(req: Request): Promise<Response> {
    if (!CLIENT_ID) {
      return Response.json({ error: "GITHUB_APP_CLIENT_ID not configured" }, { status: 500 });
    }

    const state = generateRandomString(24);
    const codeVerifier = generateRandomString(48);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const url = new URL(req.url);
    const redirectUri = `${url.origin}/api/auth-callback`;

    // The standard OAuth authorize endpoint, using the GitHub App's client_id - NOT
    // /apps/<slug>/installations/new. That URL is GitHub's install/manage-installation
    // entry point: every visit treats the user as (re-)installing, showing the repo
    // picker again even if they already installed the app. /login/oauth/authorize is
    // the actual sign-in endpoint - it recognizes an existing installation and skips
    // straight to authorization, only prompting install+repo-picker for genuinely new
    // users (since "Request user authorization during installation" ties them together
    // on the App's settings). This also matches GitHub's own PKCE docs, which describe
    // this endpoint as the primary one for GitHub App user-to-server auth.
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    // state + verifier ride through the redirect in a short-lived cookie, matched
    // against the params GitHub sends back to auth-callback.
    const tempValue = JSON.stringify({ state, codeVerifier });

    const headers = new Headers();
    headers.set("Location", authorizeUrl.toString());
    headers.append("Set-Cookie", buildCookie(OAUTH_STATE_COOKIE, tempValue, OAUTH_STATE_MAX_AGE_SEC));

    return new Response(null, { status: 302, headers });
  },
};
