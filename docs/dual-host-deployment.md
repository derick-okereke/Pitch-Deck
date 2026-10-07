# Run Peekytoe on Vercel and Pxxl

Both hosts can deploy the same `main` branch and use the same Supabase project. They are separate web origins, so each needs its own application URL settings and browser sign-in session. The Pxxl build-minute limit must reset or be increased before Pxxl can deploy newer commits; a Vercel deployment does not update Pxxl.

## 1. Connect and configure Vercel

In the existing Vercel project, confirm **Settings → Git** points to `derick-okereke/peekytoe` with `main` as the production branch. Set the root directory to the repository root and use the Next.js framework preset. Confirm that the latest production deployment includes the current `main` commit.

In **Settings → Environment Variables**, set these for **Production**:

```text
APP_BASE_URL=https://peekytoeapp.vercel.app
AUTH_EMAIL_REDIRECT_ORIGIN=https://peekytoeapp.vercel.app
NEXT_PUBLIC_SUPABASE_URL=<same Supabase project URL as Pxxl>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<same publishable key as Pxxl>
SUPABASE_SECRET_KEY=<same server secret as Pxxl>
GROQ_API_KEY=<the configured Groq key>
ELEVENLABS_API_KEY=<the configured ElevenLabs key>
```

Copy any other enabled integration settings from the Pxxl environment using the names in [`.env.example`](../.env.example), including Bachs sandbox, WatchUp, and PostHog when those features are used. Keep server secrets out of `NEXT_PUBLIC_` variables and source control. After changing Vercel variables, create a new production deployment; variable changes do not affect an existing deployment.

On Pxxl, keep `APP_BASE_URL` and `AUTH_EMAIL_REDIRECT_ORIGIN` set to `https://peekytoe.pxxl.click`.

## 2. Allow both authentication destinations

In the shared Supabase project, keep **Authentication → URL Configuration → Site URL** at `https://peekytoe.pxxl.click` while the older Pxxl deployment remains active. Add these **Redirect URLs**:

```text
https://peekytoeapp.vercel.app
https://peekytoeapp.vercel.app/auth/callback
https://peekytoe.pxxl.click/auth/callback
```

The first URL is used for new Vercel signup emails. The callback URLs are used for password recovery and previously issued emails. Add localhost URLs only if local email testing is needed. Use exact production URLs rather than a wildcard.

Once the updated code is deployed on Vercel, replace the Supabase **Confirm signup** email HTML with [`supabase/email-templates/confirm-signup.html`](../supabase/email-templates/confirm-signup.html). Its Vercel branch sends the confirmation link to Vercel, while its fallback keeps confirmation links from the old Pxxl deployment on Pxxl. The confirmation page verifies the token only after the user presses the button.

## 3. Billing webhook

If Founder Pro sandbox billing is enabled, set the Bachs sandbox variables on Vercel. Point the Bachs webhook to one healthy endpoint, for example `https://peekytoeapp.vercel.app/api/v1/billing/webhook`, and set that destination's signing secret as `BACHS_WEBHOOK_SECRET` on Vercel. Both hosts read the same Supabase subscription state, so one working webhook destination can update entitlements for both. Keep checkout return URLs host-specific through `APP_BASE_URL`.

## 4. Verify each host

On Vercel, sign in, save a founder draft, submit it for review, test signup confirmation and password recovery, and verify billing only if configured. Check Vercel function logs for the founder profile reference code if submission still fails. Repeat the same checks on Pxxl after it can deploy the latest commit. A failed Pxxl build does not prove that its previous live deployment stopped serving traffic.
