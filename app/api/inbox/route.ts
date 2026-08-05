import { NextResponse } from "next/server";
import { commitRepoFile, readRepoFile } from "@/lib/github";
import { createLimiter } from "@/lib/rate-limit";
import { isKind } from "@/lib/types";

/**
 * Private reader-feedback inbox. Submissions land in
 * content/_inbox.json (a single append-only JSON array) via a GitHub
 * commit so the inbox is durable even if the runtime KV layer changes.
 *
 * Public form -> POST /api/inbox -> commitRepoFile -> /admin/inbox.
 *
 * Reasons for the JSON-in-repo design over a database:
 *   - the dataset is tiny and infrequent;
 *   - the author already has a GitHub commit pipeline wired (admin
 *     uses the same primitive);
 *   - keeping content in the repo means it survives any redeploy or
 *     project move without a separate backup story.
 *
 * Spam controls:
 *   - honeypot field "companion" (bots fill every input);
 *   - hard cap on note length (2000 chars) and name length (120);
 *   - per-IP, per-minute throttle via an in-memory map (resets across
 *     deploys, which is fine for the volume this site sees).
 */



const INBOX_PATH = "content/_inbox.json";

type InboxEntry = {
  id: string;
  kind: string;
  slug: string;
  name?: string;
  note: string;
  createdAt: string;
  read: boolean;
  ip?: string;
  ua?: string;
};

type Body = {
  kind?: unknown;
  slug?: unknown;
  name?: unknown;
  note?: unknown;
  companion?: unknown;
};

// Upstash-backed when configured; per-instance Map fallback otherwise.
// 4 submissions/min/IP.
const limit = createLimiter({ name: "inbox", max: 4, windowSeconds: 60 });

function asString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }

  // Honeypot: any value at all on this field is a bot. Previous check
  // only fired on non-empty strings, so JSON clients sending booleans,
  // numbers, or arrays trivially bypassed it.
  if (body.companion != null && body.companion !== "") {
    return NextResponse.json({ ok: true });
  }

  const note = asString(body.note, 2000);
  if (!note || note.length < 4) {
    return NextResponse.json(
      { error: "Notes need to be between 4 and 2000 characters." },
      { status: 400 },
    );
  }

  const kind = typeof body.kind === "string" ? body.kind : "";
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!isKind(kind) || !/^[a-z0-9-]{2,120}$/.test(slug)) {
    return NextResponse.json(
      { error: "Unknown product reference." },
      { status: 400 },
    );
  }

  const name = asString(body.name, 120) ?? undefined;

  // Vercel guarantees the real client IP is in `x-real-ip`, or as the
  // RIGHTMOST entry in `x-forwarded-for` (Vercel appends it). Reading
  // the leftmost entry trusts the caller and lets a bot rotate fake
  // IPs to bypass rate-limiting.
  const xff = req.headers.get("x-forwarded-for");
  const ip =
    req.headers.get("x-real-ip") ||
    xff?.split(",").at(-1)?.trim() ||
    "0.0.0.0";
  const gate = await limit(ip);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Slow down a moment, then try again." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  const ua = req.headers.get("user-agent") ?? undefined;

  // IP + UA are PII; do NOT persist them to the repo (where they live in
  // public commit history forever). Log to stderr for abuse investigation
  // only, Vercel function logs are visible solely to the project owner.
  // (Mirrors the subscribe route's red-team fix; inbox had been
  // committing both fields.)
  console.info("inbox", { ip, ua, kind, slug });

  const entry: InboxEntry = {
    id: crypto.randomUUID(),
    kind,
    slug,
    name,
    note,
    createdAt: new Date().toISOString(),
    read: false,
  };

  let existing: InboxEntry[] = [];
  try {
    const raw = await readRepoFile(INBOX_PATH);
    if (raw) existing = JSON.parse(raw) as InboxEntry[];
  } catch {
    // First write, file does not exist yet.
  }
  const next = [entry, ...existing].slice(0, 5000); // hard cap

  try {
    await commitRepoFile({
      path: INBOX_PATH,
      content: JSON.stringify(next, null, 2) + "\n",
      message: `inbox: note on ${kind}/${slug}`,
    });
  } catch (err) {
    console.error("inbox commit failed:", err);
    return NextResponse.json(
      { error: "Could not save. Try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
