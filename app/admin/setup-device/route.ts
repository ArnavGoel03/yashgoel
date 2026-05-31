import { NextResponse } from "next/server";
import { DEVICE_COOKIE, mintDeviceCookieValue, verifySetupToken } from "@/lib/device-lock";
import { createLimiter } from "@/lib/rate-limit";

// This is the ONLY /admin route a no-cookie attacker can reach, and its
// safety rests on the entropy of ADMIN_DEVICE_SETUP_TOKEN. Throttle so a
// weak token can't be hammered. Exceeding the limit returns the same 404
// as a bad token, so the endpoint stays invisible.
const limit = createLimiter({ name: "setup-device", max: 10, windowSeconds: 60 });

function clientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "0.0.0.0"
  );
}

/**
 * One-shot device enrollment endpoint.
 *
 * GET /admin/setup-device?token=<ADMIN_DEVICE_SETUP_TOKEN>
 *   - On the MacBook: paste this URL once, the cookie sticks for 1 year.
 *   - Anywhere else: the token is the only way to mint the cookie, so a
 *     would-be intruder needs both the deployed URL AND the env var to
 *     get past the device gate.
 *
 * Returns a 404 if the token is wrong or missing, so this endpoint is
 * indistinguishable from a non-existent route in the wild.
 */


const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? undefined;

  // Throttle brute-force attempts; 404 on exceed (indistinguishable from
  // a wrong token) so the route stays invisible to scanners.
  const gate = await limit(clientIp(req));
  if (!gate.ok) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!verifySetupToken(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const value = await mintDeviceCookieValue();
  if (!value) {
    return new NextResponse(
      "Device lock not configured. ADMIN_DEVICE_SECRET env var is missing.",
      { status: 500 },
    );
  }

  // Stripping the token from the URL after success keeps the secret out
  // of browser history and the back button.
  const redirect = NextResponse.redirect(new URL("/admin/login", url.origin));
  redirect.cookies.set(DEVICE_COOKIE, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return redirect;
}
