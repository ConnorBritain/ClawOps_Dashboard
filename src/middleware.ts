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

  // Unauthorized — return simple login page
  return new NextResponse(
    `<!DOCTYPE html>
    <html><head><title>ClawOps Dashboard</title>
    <style>
      body { background: #0A0A0A; color: #E5E5E5; font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
      .login { text-align: center; }
      h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
      p { color: #666; font-size: 0.875rem; margin-bottom: 1.5rem; }
      input { background: #141414; border: 1px solid #333; color: #E5E5E5; padding: 0.75rem 1rem; border-radius: 8px; font-size: 1rem; width: 300px; }
      button { background: #FF7D45; color: #000; border: none; padding: 0.75rem 2rem; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600; margin-top: 0.75rem; }
      button:hover { background: #ff9566; }
    </style></head>
    <body>
      <div class="login">
        <h1>🦅 ClawOps Dashboard</h1>
        <p>Enter access token</p>
        <form method="GET">
          <input type="password" name="token" placeholder="Token" autofocus />
          <br/>
          <button type="submit">Enter</button>
        </form>
      </div>
    </body></html>`,
    {
      status: 401,
      headers: { "Content-Type": "text/html" },
    }
  );
}

export const config = {
  // Apply to all routes except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
