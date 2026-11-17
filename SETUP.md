# Setup guide

This tool posts the latest rates from the عُملة app to your Facebook Page,
up to 4 times a day, using GitHub Actions.

You need to do 5 things, in this order:

1. Create a Meta app
2. Get a Page access token (one that does not expire)
3. Find your Page ID
4. Put the Page ID and the token in GitHub Secrets
5. Test: a dry run first, then one real post

**Keep your token secret.** Never paste it into a file, a commit, a chat, or an
issue. It goes into GitHub Secrets only.

---

## 1. Create a Meta app

1. Go to <https://developers.facebook.com> and log in with the Facebook account
   that is an **admin of your Page**.
2. If Meta asks, register as a developer (accept the terms, verify your phone).
3. Click **My Apps** → **Create App**.
4. App name: for example `3omla poster`. Enter your email.
5. When asked for a **use case**, choose **Manage everything on your Page**.
6. Finish the steps and create the app.
7. In the app **Dashboard**, open the use case and click
   **Customize the Manage everything on your Page use case**.
   Make sure these permissions are added (click **Add** if one is missing):
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_manage_metadata` (Facebook refuses photo posts without it)

## 2. Get a Page access token (does not expire)

The token you get first is short (about 1 hour). You will turn it into a
long one in three steps.

**Step A: short user token**

1. Open the **Graph API Explorer**: <https://developers.facebook.com/tools/explorer/>
2. On the right, under **Meta App**, choose your app (`3omla poster`).
3. Under **User or Page**, choose **User Token**.
4. Under **Permissions**, add: `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`,
   `pages_manage_posts`.
5. Click **Generate Access Token**. A Facebook window opens. Choose your Page
   and allow everything it asks.

**Step B: long user token (about 60 days)**

1. Click the small **i** (info) icon next to the token, then
   **Open in Access Token Tool**. (Or open
   <https://developers.facebook.com/tools/debug/accesstoken/> and paste it there.)
2. At the bottom, click **Extend Access Token**. Enter your password if asked.
3. A new, long token appears. Copy it.

**Step C: Page token (no expiry date)**

1. Back in the **Graph API Explorer**, paste the long token from Step B into the
   **Access Token** box at the top.
2. In the query box, type `me/accounts` with method **GET**, then click **Submit**.
3. The result shows your Pages. For your Page you see:
   - `"id"`: this is your **Page ID** (see section 3)
   - `"access_token"`: this is your **Page token**. Copy it (it is long).
4. Check it: paste the Page token into the Access Token Tool
   (<https://developers.facebook.com/tools/debug/accesstoken/>).
   **Expires** should say **Never**, and **Type** should say **Page**.

Meta says a Page token from a long user token has no expiry date. It can still
stop working if you change your Facebook password, remove the app, or lose admin
rights on the Page. If that happens, repeat section 2 and update the secret.

## 3. Find your Page ID

You already saw it in step 2C (`"id"` next to your Page name). It is only digits.

Use **this** ID. Do not use the number in your Page's web address
(`facebook.com/profile.php?id=...`): for new-style Pages that is a different
number, and posting to it fails with error 283.

## 4. Put the secrets in GitHub

1. Open your repository on GitHub (`3omla-poster`).
2. Click **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret**:
   - Name: `FB_PAGE_ID` → Value: your Page ID (digits only) → **Add secret**
4. Click **New repository secret** again:
   - Name: `FB_PAGE_TOKEN` → Value: your Page token → **Add secret**

GitHub hides secret values in logs. The code never prints the token.

## 5. Test

### 5a. Dry run on GitHub (no post)

1. In the repository, click **Actions** → **Post rates to Facebook**.
2. Click **Run workflow**. Leave **Dry run** checked. Click **Run workflow**.
3. Wait until it finishes (green tick). Open the run.
4. At the bottom, under **Artifacts**, download **post**. It has `post.png` and
   `caption.txt`. Check them.

### 5b. One real test post

1. **Actions** → **Post rates to Facebook** → **Run workflow**.
2. **Uncheck Dry run**. **Check Force** (so it posts even if no rate changed).
3. Click **Run workflow**. When it is green, open your Page and look at the post.

**Can't other people see the post?** Meta says that while your Meta app is in
**Development** mode, posts it makes are only visible to people with a role on
the app (you). To make posts public, publish the app: in the app dashboard,
click **Publish** in the left menu and follow the steps. Meta may ask for an app
icon, a **Privacy Policy URL** (you can use the same one as the عُملة app on
Google Play) and a **data deletion** URL or instructions. Delete the test post
first if you don't want it visible later.

After this, the schedule runs by itself.

---

## How it works

- Runs at **09:00, 13:00, 17:00, 21:00 Libya time** (07:00, 11:00, 15:00, 19:00 UTC).
- Gets rates from the 3omla API: USD, EUR, GBP and gold 18 (per gram). If the
  server is asleep it keeps trying for about 2 minutes.
- If any rate is missing or not a valid positive number, it **does not post**
  and the run shows as failed (red).
- Posts only if a rate changed since the last post (compared at 2 decimals).
  The **09:00** run always posts.
- After a post, it saves the posted values in `state/last-posted.json` and
  commits that file. That is how it knows what changed, and draws ▲ / ▼.
- GitHub may start scheduled runs some minutes late. That is normal.
- GitHub turns off scheduled workflows in repositories with no activity for 60
  days. The daily 09:00 post commits `state/last-posted.json`, which keeps the
  repository active. If posts stop, check **Actions** for a message about it.

## Run it on your computer (dry run)

You need Node.js 20 or newer.

```bash
npm ci
npx playwright install chromium
npm run dry-run
```

Then open `out/post.png` and `out/caption.txt`. Nothing is posted and the state
file is not changed.

On Windows you can skip `npx playwright install chromium` and use Microsoft
Edge, which is already installed:

```bash
PW_CHANNEL=msedge npm run dry-run
```

## Settings

All settings are in `src/config.js`:

- `APP_LINK`: the Google Play link. Empty now, so the caption has no link line.
  When the app is public, put the link here and commit.
- `GRAPH_API_VERSION`: the Facebook API version (now `v27.0`). Meta supports
  each version for about 2 years. Update it when Meta warns you.
- `MORNING_CRON`: must match the first `cron:` line in
  `.github/workflows/post.yml`.

## Fonts and logo

`assets/fonts/` has Noto Kufi Arabic and Tajawal, licensed under the SIL Open
Font License 1.1 (license texts are in the same folder). `assets/logo.png` is
the عُملة logo.
