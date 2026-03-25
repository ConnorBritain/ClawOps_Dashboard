import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = process.env.DASHBOARD_TOKEN;

  // If no token configured, allow all (local dev / Tailscale-only mode)
  if (!token || token === "changeme") {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("dashboard_auth")?.value;
  if (authCookie === token) {
    return NextResponse.next();
  }

  // Check for Bearer token in header (for API clients)
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${token}`) {
    return NextResponse.next();
  }

  // Check for token in query param (for initial login)
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken === token) {
    // Set cookie and redirect to clean URL
    url.searchParams.delete("token");
    const response = NextResponse.redirect(url);
    response.cookies.set("dashboard_auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  // Unauthorized — return login page with logo
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="en"><head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ClawOps Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #0A0A0A; color: #E5E5E5; font-family: 'Inter', system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
      .login { text-align: center; width: 100%; max-width: 360px; padding: 0 1.5rem; }
      .logo { width: 80px; height: 80px; border-radius: 16px; margin-bottom: 1.5rem; }
      h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.375rem; }
      .subtitle { color: #666; font-size: 0.875rem; margin-bottom: 2rem; }
      input { background: #141414; border: 1px solid #333; color: #E5E5E5; padding: 0.875rem 1rem; border-radius: 10px; font-size: 1rem; width: 100%; font-family: inherit; outline: none; transition: border-color 0.2s; }
      input:focus { border-color: #FF7D45; }
      input::placeholder { color: #555; }
      button { background: #FF7D45; color: #000; border: none; padding: 0.875rem 2rem; border-radius: 10px; font-size: 1rem; cursor: pointer; font-weight: 600; margin-top: 0.875rem; width: 100%; font-family: inherit; transition: background 0.2s; }
      button:hover { background: #ff9566; }
      .footer { color: #333; font-size: 0.75rem; margin-top: 2.5rem; }
    </style></head>
    <body>
      <div class="login">
        <img src="/clawops-logo.png" alt="ClawOps" class="logo" onerror="this.style.display='none'" />
        <h1>ClawOps Dashboard</h1>
        <p class="subtitle">Enter access token</p>
        <form method="GET">
          <input type="password" name="token" placeholder="Token" autofocus autocomplete="off" />
          <button type="submit">Enter</button>
        </form>
        <p class="footer">Pattern Engine LLC</p>
      </div>
    </body></html>`,
    {
      status: 401,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

export const config = {
  // Apply to all routes except static assets and images
  matcher: ["/((?!_next/static|_next/image|favicon.ico|clawops-logo.png).*)"],
};
