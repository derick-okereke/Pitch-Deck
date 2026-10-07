# Confirm signup email

In the Supabase project dashboard, open **Authentication → Email Templates → Confirm signup** and replace its HTML with [`confirm-signup.html`](confirm-signup.html). Keep the Auth **Site URL** at `https://peekytoe.pxxl.click` while Pxxl remains active. Add the exact Vercel origin and callback URL to **Authentication → URL Configuration → Redirect URLs** as described in [`docs/dual-host-deployment.md`](../../docs/dual-host-deployment.md).

The template uses the signup redirect origin for `https://peekytoeapp.vercel.app` and keeps the existing Site URL path for Pxxl. This also keeps signups from the previous Pxxl deployment working until it can build again. Deploy the updated application to Vercel before replacing the shared Supabase template.

The link goes to `/auth/confirm`, which displays a button before calling `verifyOtp` with the token hash. The first GET does not consume the token, so email link previews cannot confirm the account before the recipient opens it. The confirmation action sets the session cookie and routes the user by account role.

The existing `/auth/callback` continues to handle previously issued confirmation links and password recovery emails. Existing confirmation emails cannot be changed after sending.
