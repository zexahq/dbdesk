/**
 * Minimal HTML login page for the desktop PKCE auth flow.
 *
 * Served at GET /auth/desktop?code_challenge=...
 * Allows email/password sign-up or sign-in, then creates a one-time
 * auth code tied to the PKCE code_challenge and redirects back to
 * the desktop app via dbdesk:// deep link.
 */

export function desktopLoginPage(codeChallenge: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DBDesk — Sign In</title>
  <style>
    *, *::after, *::before { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0a0a0a; color: #e5e5e5;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 1rem;
    }
    .card {
      background: #171717; border: 1px solid #262626; border-radius: 12px;
      padding: 2rem; width: 100%; max-width: 400px;
    }
    h1 { font-size: 1.5rem; font-weight: 600; text-align: center; margin-bottom: 0.25rem; }
    .subtitle { color: #a3a3a3; text-align: center; font-size: 0.875rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.875rem; color: #a3a3a3; margin-bottom: 0.25rem; }
    input {
      width: 100%; padding: 0.625rem 0.75rem; border-radius: 8px;
      border: 1px solid #262626; background: #0a0a0a; color: #e5e5e5;
      font-size: 0.875rem; margin-bottom: 0.75rem; outline: none;
    }
    input:focus { border-color: #525252; }
    button {
      width: 100%; padding: 0.625rem; border-radius: 8px; border: none;
      background: #e5e5e5; color: #0a0a0a; font-weight: 600; font-size: 0.875rem;
      cursor: pointer; margin-top: 0.25rem;
    }
    button:hover { background: #d4d4d4; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { color: #ef4444; font-size: 0.8rem; margin-bottom: 0.75rem; display: none; }
    .toggle { text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #a3a3a3; }
    .toggle a { color: #e5e5e5; cursor: pointer; text-decoration: underline; }
    .success { text-align: center; }
    .success p { color: #a3a3a3; font-size: 0.875rem; margin-top: 0.5rem; }
    .success a { color: #e5e5e5; text-decoration: underline; }
    .name-field { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div id="form-view">
      <h1>DBDesk</h1>
      <p class="subtitle">Sign in to connect your desktop app</p>
      <div id="error" class="error"></div>
      <form id="auth-form" autocomplete="on">
        <div id="name-group" class="name-field">
          <label for="name">Name</label>
          <input id="name" name="name" type="text" placeholder="Your name" autocomplete="name">
        </div>
        <label for="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required autocomplete="email">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" placeholder="••••••••" required minlength="8" autocomplete="current-password">
        <button type="submit" id="submit-btn">Sign In</button>
      </form>
      <div class="toggle">
        <span id="toggle-text">Don't have an account?</span>
        <a id="toggle-link" onclick="toggleMode()">Sign Up</a>
      </div>
    </div>
    <div id="success-view" class="success" style="display:none">
      <h1>✓ Authenticated</h1>
      <p>Redirecting to DBDesk desktop app…</p>
      <p style="margin-top:1rem"><a id="deep-link">Click here if nothing happened</a></p>
    </div>
  </div>
  <script>
    const CODE_CHALLENGE = ${JSON.stringify(codeChallenge)};
    const BASE = window.location.origin;
    let isSignUp = false;

    function toggleMode() {
      isSignUp = !isSignUp;
      document.getElementById("name-group").style.display = isSignUp ? "block" : "none";
      document.getElementById("submit-btn").textContent = isSignUp ? "Sign Up" : "Sign In";
      document.getElementById("toggle-text").textContent = isSignUp ? "Already have an account?" : "Don't have an account?";
      document.getElementById("toggle-link").textContent = isSignUp ? "Sign In" : "Sign Up";
      document.getElementById("password").autocomplete = isSignUp ? "new-password" : "current-password";
      hideError();
    }

    function showError(msg) {
      const el = document.getElementById("error");
      el.textContent = msg; el.style.display = "block";
    }
    function hideError() { document.getElementById("error").style.display = "none"; }

    document.getElementById("auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();
      const btn = document.getElementById("submit-btn");
      btn.disabled = true;
      btn.textContent = isSignUp ? "Signing up…" : "Signing in…";

      try {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const name = document.getElementById("name").value || email.split("@")[0];

        // 1. Sign up or sign in via better-auth
        const authUrl = isSignUp
          ? BASE + "/api/auth/sign-up/email"
          : BASE + "/api/auth/sign-in/email";

        const authBody = isSignUp
          ? { email, password, name }
          : { email, password };

        const authRes = await fetch(authUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(authBody),
          credentials: "include",
        });

        if (!authRes.ok) {
          const data = await authRes.json().catch(() => null);
          throw new Error(data?.message || data?.error || "Authentication failed");
        }

        // 2. Create a one-time code tied to the PKCE challenge
        const codeRes = await fetch(BASE + "/api/auth/desktop/create-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codeChallenge: CODE_CHALLENGE }),
          credentials: "include",
        });

        if (!codeRes.ok) {
          const data = await codeRes.json().catch(() => null);
          throw new Error(data?.error || "Failed to create auth code");
        }

        const { code } = await codeRes.json();

        // 3. Redirect to desktop app via deep link
        const deepLink = "dbdesk://auth?code=" + encodeURIComponent(code);
        document.getElementById("deep-link").href = deepLink;
        document.getElementById("form-view").style.display = "none";
        document.getElementById("success-view").style.display = "block";
        window.location.href = deepLink;

      } catch (err) {
        showError(err.message || "Something went wrong");
        btn.disabled = false;
        btn.textContent = isSignUp ? "Sign Up" : "Sign In";
      }
    });
  </script>
</body>
</html>`;
}
