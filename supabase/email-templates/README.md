# Confirm signup email

In the Supabase project dashboard, open **Authentication → Email Templates → Confirm signup** and replace its HTML with [`confirm-signup.html`](confirm-signup.html). Set the Auth **Site URL** to `https://peekytoe.pxxl.click`.

The link goes to `/auth/confirm`, which displays a button before calling `verifyOtp` with the token hash. The first GET does not consume the token, so email link previews cannot confirm the account before the recipient opens it. The confirmation action sets the session cookie and routes the user by account role.

The existing `/auth/callback` continues to handle previously issued confirmation links and password recovery emails. Existing confirmation emails cannot be changed after sending.
