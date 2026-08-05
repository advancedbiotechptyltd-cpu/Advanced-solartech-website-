# One-click sign-in for the content editor

Deploy this once and the **Sign In with GitHub** button works. No tokens, for
anyone, ever again — staff click it, approve once, and they are in. New staff
need nothing but access to the repository.

Free. Cloudflare's Worker free tier is 100,000 requests a day; a sign-in is one
request.

---

## Why this exists

GitHub's login hands back a short-lived `code`, and something has to swap that
for a real token using the app's **client secret**. A secret cannot sit in a web
page — anyone could read it — and cPanel has no server to hold one.

This Worker is that server, and it does nothing else. No database, no stored
data. A request comes in, a token goes back to the browser, it forgets.

---

## Setup — four steps, about ten minutes

### 1. Create a GitHub OAuth App

Go to **https://github.com/settings/developers** → **OAuth Apps** →
**New OAuth App**

| Field | Value |
|---|---|
| Application name | `Advanced Solar Tech content editor` |
| Homepage URL | `https://advancedsolartec.com.au` |
| Authorization callback URL | *leave for now — step 3 fills it in* |

Put anything valid in the callback for the moment (e.g. the homepage URL); you
will come back and correct it once the Worker has a real address.

**Register the app under `advancedbiotechptyltd-cpu`**, not a personal account.

Click **Generate a new client secret** and keep both the **Client ID** and the
**secret** open — GitHub shows the secret once.

> This is an **OAuth App**, not a GitHub App. They are different things in the
> same menu, and only the OAuth App speaks the flow this Worker implements.

### 2. Deploy the Worker

From this folder:

```bash
npx wrangler login       # opens a browser, one time
npx wrangler deploy
```

It prints the address, e.g. `https://ast-cms-auth.your-name.workers.dev`.
Keep it.

### 3. Give the Worker its credentials

```bash
npx wrangler secret put GITHUB_CLIENT_ID       # paste the Client ID
npx wrangler secret put GITHUB_CLIENT_SECRET   # paste the secret
```

These are encrypted by Cloudflare and never appear in this repository — which
matters, because this repository is public.

Now go back to the GitHub OAuth App and set the **Authorization callback URL**
to your Worker address plus `/callback`:

```
https://ast-cms-auth.your-name.workers.dev/callback
```

It must match exactly. A trailing slash or a missing `/callback` gives a
"redirect_uri mismatch" error at sign-in.

### 4. Point the editor at it

In `public/admin/config.yml`, uncomment `base_url` under `backend:` and set it
to your Worker address (no trailing slash, no `/auth`):

```yaml
backend:
  name: github
  repo: advancedbiotechptyltd-cpu/Advanced-solartech-website-
  branch: claude/advanced-solartech-488d5g
  base_url: https://ast-cms-auth.your-name.workers.dev
  auth_endpoint: auth
```

Commit that. The deploy Action publishes it, and the button works.

---

## Before launch

`ALLOWED_ORIGINS` in `wrangler.toml` lists which sites may receive a token. It
is the security boundary: without it, anyone could point their own copy of the
editor at this Worker and be handed write access to the repository.

It currently allows `https://advancedsolartec.com.au`, which covers the staging
site at `/new/` too — an origin is scheme + host, so paths do not matter.

If the site ever moves domain, update it and redeploy, or sign-in stops working.

---

## Checking it

- `https://<worker>/` returns a plain 404 line. That means it is up.
- `https://<worker>/auth` should redirect to a GitHub consent screen. If it
  says "missing its GitHub credentials", step 3 did not take.
- Sign-in failures show a plain-English reason, not a blank window.

## Turning it off

Delete `base_url` from `config.yml` and the editor falls back to
**Sign In Using Access Token**. Nothing else changes, and no content is
affected — the Worker holds nothing.
