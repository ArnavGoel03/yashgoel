import { NextResponse } from "next/server";
import { purgeExpiredTrash } from "@/lib/trash";



/**
 * Daily cron endpoint that physically deletes any soft-deleted R2
 * image asset whose 30-day grace window has elapsed. Wired up via the
 * `crons` block in vercel.json.
 *
 * Auth: Vercel Cron sends a fixed Authorization header derived from
 * the project's CRON_SECRET env var. Anything without that header
 * gets a 401, so a curious passer-by can't trigger purges.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { purged, scanned } = await purgeExpiredTrash();
    return NextResponse.json({
      ok: true,
      scanned,
      purgedCount: purged.length,
      purged,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
