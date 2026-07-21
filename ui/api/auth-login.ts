import { generateRandomString, generateCodeChallenge } from "./_lib/pkce.js";
import { buildCookie, OAUTH_STATE_COOKIE } from "./_lib/session.js";

const APP_SLUG = process.env.GITHUB_APP_SLUG ?? "coach-phelps";
const OAUTH_STATE_MAX_AGE_SEC = 600; // 10 min - just needs to survive the redirect round trip

export default {
  async fetch(req: Request): Promise<Response> {
    const state = generateRandomString(24);
    const codeVerifier = generateRandomString(48);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const url = new URL(req.url);
    const redirectUri = `${url.origin}/api/auth-callback`;

    // GitHub App install-and-authorize flow (not classic OAuth authorize) - this is what
    // gives the user a per-repo picker instead of blanket account access. "Request user
    // authorization (OAuth) during installation" must be enabled on the App for state/
    // code_challenge to carry through to the callback.
    const authorizeUrl = new URL(`https://github.com/apps/${APP_SLUG}/installations/new`);
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
