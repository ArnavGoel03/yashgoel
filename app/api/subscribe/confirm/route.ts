import { commitRepoFile, readRepoFile } from "@/lib/github";
import { createLimiter } from "@/lib/rate-limit";

const SUBSCRIBERS_PATH = "content/_subscribers.json";

// This endpoint did one GitHub Contents-API read on EVERY hit, with no
// throttle, an unauthenticated flood could exhaust the shared
// GITHUB_TOKEN's 5000 req/hr quota and take down ALL repo writes (admin
// publishing, subscribe, inbox). Gate it before any GitHub call.
const limit = createLimiter({ name: "confirm", max: 8, windowSeconds: 60 });

// Vercel sets the real client IP as x-real-ip, or the RIGHTMOST
// x-forwarded-for entry. Reading the leftmost trusts the caller.
function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "0.0.0.0"
  );
}

type Subscriber = {
  id: string;
  email: string;
  source: string;
  confirmed: boolean;
  unsubscribed: boolean;
  unsubscribeToken: string;
  confirmToken: string;
  createdAt: string;
};



/**
 * GET /api/subscribe/confirm?token=...   confirms an opt-in
 * GET /api/subscribe/confirm?unsub=...   processes an unsubscribe
 *
 * Returns a tiny inline HTML response rather than a redirect so the
 * reader sees a clear status without bouncing through the SPA.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const unsub = url.searchParams.get("unsub");

  if (!token && !unsub) {
    return reply("Missing token.", 400);
  }

  // Throttle BEFORE the GitHub read so a flood can't burn the token quota.
  const gate = await limit(clientIp(req));
  if (!gate.ok) {
    return reply("Too many attempts. Try again in a minute.", 429);
  }

  const raw = (await readRepoFile(SUBSCRIBERS_PATH)) ?? "[]";
  let list: Subscriber[];
  try {
    list = JSON.parse(raw) as Subscriber[];
  } catch {
    // _subscribers.json is corrupted, don't kill the whole opt-in /
    // unsub flow with a 500 trace. Show the same generic message as
    // an expired link.
    return reply(
      "Could not verify that link right now. Try again in a moment.",
      503,
    );
  }
  let found = false;
  let action: "confirmed" | "unsubscribed" | null = null;
  const next = list.map((s) => {
    if (token && s.confirmToken === token && !s.confirmed) {
      found = true;
      action = "confirmed";
      return { ...s, confirmed: true };
    }
    if (unsub && s.unsubscribeToken === unsub && !s.unsubscribed) {
      found = true;
      action = "unsubscribed";
      return { ...s, unsubscribed: true };
    }
    return s;
  });

  if (!found) {
    return reply(
      "That link is no longer valid. It may have already been used.",
      404,
    );
  }

  await commitRepoFile({
    path: SUBSCRIBERS_PATH,
    content: JSON.stringify(next, null, 2) + "\n",
    message: `subscribe: ${action}`,
  });

  if (action === "confirmed") {
    return reply(
      "Confirmed. Next review hits your inbox the day it ships.",
      200,
    );
  }
  return reply("Unsubscribed. Sorry to see you go.", 200);
}

function reply(message: string, status: number): Response {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${message}</title>
    <style>
      body{font-family: 'Fraunces', Georgia, serif; background:#fafaf9; color:#1c1917;
           display:flex; align-items:center; justify-content:center; min-height:100vh;
           margin:0; padding:2rem;}
      .card{max-width: 36rem; padding: 2.5rem; border-radius: 1rem;
            border: 1px solid #e7e5e4; background:#fff; text-align:center;}
      h1{font-size: 1.75rem; font-style: italic; margin: 0 0 1rem; font-weight: 400;}
      a{color:#1c1917; text-underline-offset: 4px;}
      .rose{color:#fb7185}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${message}</h1>
      <p><a href="/">← Back to yashgoel.com</a> <span class="rose" aria-hidden>❋</span></p>
    </div>
  </body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
