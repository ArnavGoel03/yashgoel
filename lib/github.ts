const API = "https://api.github.com";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function branch(): string {
  return process.env.GITHUB_BRANCH ?? "main";
}

function repoUrl(repoPath: string): string {
  return `${API}/repos/${env("GITHUB_OWNER")}/${env("GITHUB_REPO")}/contents/${repoPath}`;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${env("GITHUB_TOKEN")}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getFile(
  repoPath: string,
): Promise<{ sha: string; content: string } | null> {
  const r = await fetch(`${repoUrl(repoPath)}?ref=${branch()}`, {
    headers: authHeaders(),
    cache: "no-store",
    // GitHub Contents API has been known to stall for tens of seconds
    // during regional incidents. Hard 8s cap so a single GitHub blip
    // doesn't pin a Vercel function instance.
    signal: AbortSignal.timeout(8000),
  });
  if (r.status === 404) return null;
  if (!r.ok) {
    throw new Error(`GitHub GET ${repoPath} failed: ${r.status} ${await r.text()}`);
  }
  const data = (await r.json()) as { sha: string; content: string; encoding: string };
  const content =
    data.encoding === "base64"
      ? Buffer.from(data.content, "base64").toString("utf8")
      : data.content;
  return { sha: data.sha, content };
}

export async function readRepoFile(repoPath: string): Promise<string | null> {
  const file = await getFile(repoPath);
  return file?.content ?? null;
}

export async function commitRepoFile(args: {
  path: string;
  content: string;
  message: string;
  expectExisting?: boolean;
}): Promise<{ commit: string }> {
  // Read-modify-write against the GitHub Contents API is optimistic-
  // concurrency: the PUT carries the base blob `sha`, and a concurrent
  // writer who lands first makes our sha stale → GitHub 409/422. Without
  // a retry the losing write was dropped (surfaced as a 500), so under a
  // traffic spike two simultaneous subscribers could clobber each other.
  // Re-read the fresh sha and retry a few times before giving up.
  const MAX_ATTEMPTS = 4;
  let lastErr = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const existing = await getFile(args.path);
    if (existing && args.expectExisting === false) {
      throw new Error(`Refusing to overwrite existing file: ${args.path}`);
    }
    const body = {
      message: args.message,
      content: Buffer.from(args.content, "utf8").toString("base64"),
      branch: branch(),
      ...(existing ? { sha: existing.sha } : {}),
    };
    const r = await fetch(repoUrl(args.path), {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Writes can be slower than reads but 12s is the longest a healthy
      // GitHub commit takes; anything past that is a stall, not a slow path.
      signal: AbortSignal.timeout(12000),
    });
    if (r.ok) {
      const data = (await r.json()) as { commit: { sha: string } };
      return { commit: data.commit.sha };
    }
    // 409 Conflict / 422 Unprocessable = stale sha from a concurrent
    // write. Re-read and retry. Any other status is a hard failure.
    if (r.status === 409 || r.status === 422) {
      lastErr = `${r.status} ${await r.text()}`;
      continue;
    }
    throw new Error(
      `GitHub PUT ${args.path} failed: ${r.status} ${await r.text()}`,
    );
  }
  throw new Error(
    `GitHub PUT ${args.path} failed after ${MAX_ATTEMPTS} attempts (sha conflict): ${lastErr}`,
  );
}
