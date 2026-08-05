/**
 * OAuth proxy for the content editor.
 *
 * This is the missing piece that makes "Sign In with GitHub" work on static
 * hosting. GitHub's OAuth flow hands back a short-lived `code`, and something
 * has to swap that for a real token using the app's client secret. A secret
 * cannot live in a page anyone can view source on, and cPanel has no runtime to
 * hold one — so this Worker does it, and nothing else.
 *
 * It stores no data and has no database. A request comes in, a token goes back
 * to the browser, the Worker forgets everything.
 *
 * ── Deploying ────────────────────────────────────────────────────────────────
 * See README.md in this folder. Two secrets, one command.
 *
 * ── The handshake ────────────────────────────────────────────────────────────
 * This implements the protocol Decap and Sveltia expect, which Netlify defined:
 *
 *   /auth      → redirect the browser to GitHub's consent screen
 *   /callback  → GitHub sends the user back here with a code; swap it for a
 *                token and postMessage that token to the window that opened us
 */

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";

/** Escapes a string for embedding inside a <script> block. */
function jsSafe(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * The set of sites allowed to receive a token from this Worker.
 *
 * Without this, anyone could point their own CMS at this Worker, complete a
 * login, and be handed a token with write access to the repository. The check
 * is what stops the Worker being an open token-minting service.
 */
function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // This page carries a token in its script. Never let anything cache it.
      "cache-control": "no-store, max-age=0",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
    },
  });
}

function errorPage(message) {
  return htmlResponse(
    `<!doctype html><meta charset="utf-8"><title>Sign-in failed</title>
     <body style="font:16px/1.6 system-ui;margin:12vh auto;max-width:34rem;padding:0 1.5rem;color:#1e2a38">
       <h1 style="color:#0a2540;font-size:1.35rem">Sign-in failed</h1>
       <p>${message}</p>
       <p style="color:#5b6b7c;font-size:.9rem">You can close this window and try again.</p>
     </body>`,
    400
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return errorPage("This Worker is missing its GitHub credentials. See oauth-worker/README.md.");
    }

    // ── Step 1: send the user to GitHub ──────────────────────────────────────
    if (url.pathname === "/auth") {
      /*
       * A random state, echoed back by GitHub and checked on return. Without it
       * an attacker can start a login in their own browser and finish it in the
       * victim's, which is CSRF with a token at the end of it.
       *
       * It rides in a cookie rather than storage because the Worker keeps no
       * state of its own — the browser holds it for the round trip.
       */
      const state = crypto.randomUUID();

      const authorize = new URL(GITHUB_AUTHORIZE);
      authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorize.searchParams.set("scope", url.searchParams.get("scope") || "repo");
      authorize.searchParams.set("state", state);
      authorize.searchParams.set("redirect_uri", `${url.origin}/callback`);

      return new Response(null, {
        status: 302,
        headers: {
          location: authorize.toString(),
          // 10 minutes is longer than any sane consent screen takes.
          "set-cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
          "cache-control": "no-store",
        },
      });
    }

    // ── Step 2: GitHub sends the user back ───────────────────────────────────
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (url.searchParams.get("error")) {
        return errorPage(`GitHub refused the sign-in: ${url.searchParams.get("error_description") || url.searchParams.get("error")}`);
      }
      if (!code) return errorPage("GitHub did not send an authorisation code.");

      const cookie = request.headers.get("cookie") ?? "";
      const expected = cookie.match(/(?:^|;\s*)oauth_state=([^;]+)/)?.[1];
      if (!expected || !state || expected !== state) {
        return errorPage("This sign-in could not be verified. Start again from the editor.");
      }

      let token;
      try {
        const res = await fetch(GITHUB_TOKEN, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: `${url.origin}/callback`,
          }),
        });
        const data = await res.json();
        if (data.error || !data.access_token) {
          // Never echo the raw body — it can contain the client secret.
          return errorPage(`GitHub would not issue a token (${data.error || "no token returned"}).`);
        }
        token = data.access_token;
      } catch {
        return errorPage("Could not reach GitHub to complete the sign-in.");
      }

      const origins = allowedOrigins(env);
      if (!origins.length) {
        return errorPage("This Worker has no ALLOWED_ORIGINS configured, so it will not release a token.");
      }

      /*
       * Hand the token to the window that opened this one.
       *
       * The editor speaks first ("authorizing:github"), and we reply to the
       * origin that message came from — after checking it is on the allowlist.
       * Replying to "*" would broadcast a repository write token to whatever
       * page happened to be listening.
       */
      return htmlResponse(`<!doctype html><meta charset="utf-8"><title>Signing in…</title>
<body style="font:16px/1.6 system-ui;margin:12vh auto;max-width:34rem;padding:0 1.5rem;color:#1e2a38">
  <p>Signing you in…</p>
  <p id="stuck" hidden style="color:#5b6b7c;font-size:.9rem">
    If this window does not close, open the editor again and retry.
  </p>
  <script>
    (function () {
      var allowed = ${jsSafe(origins)};
      var payload = "authorization:github:success:" + ${jsSafe(JSON.stringify({ token, provider: "github" }))};

      function onMessage(e) {
        if (allowed.indexOf(e.origin) === -1) return;
        window.removeEventListener("message", onMessage, false);
        e.source.postMessage(payload, e.origin);
        setTimeout(function () { window.close() }, 400);
      }

      if (!window.opener) {
        document.getElementById("stuck").hidden = false;
        return;
      }
      window.addEventListener("message", onMessage, false);
      // Tell the editor we are ready; it answers and we reply to its origin.
      window.opener.postMessage("authorizing:github", "*");
      setTimeout(function () { document.getElementById("stuck").hidden = false }, 4000);
    })();
  </script>
</body>`);
    }

    // Anything else: say what this is, without implying it is a website.
    return new Response("OAuth proxy for the Advanced Solar Tech content editor.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
