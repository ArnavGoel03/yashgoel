import { getPrimers, getReviews } from "@/lib/content";
import { site } from "@/lib/site";
import { KIND_LABEL, KINDS, kindPath } from "@/lib/types";

// Stored review/primer fields (name, brand, title, subtitle) are bare
// strings, a `]`, `)`, backtick, or newline in any of them would break
// the Markdown link structure or inject new sections/links into the file
// LLM crawlers ingest. Collapse newlines and backslash-escape the chars
// that have structural meaning inside `[label](url)` link syntax.
function mdText(s: string): string {
  return s.replace(/[\r\n]+/g, " ").replace(/([[\]()\\`])/g, "\\$1");
}

/**
 * llms.txt, answer-engine index for LLM crawlers (ChatGPT, Claude,
 * Perplexity, etc). Plain text and markdown, the convention emerging
 * around llmstxt.org. Lists the canonical sections and current
 * inventory so crawlers can pick the right page to cite without
 * hallucinating URLs.
 *
 * Served at /llms.txt with text/plain content type so crawlers and
 * humans can both read it.
 */
export async function GET(): Promise<Response> {
  const lines: string[] = [];

  lines.push(`# ${site.name}`);
  lines.push("");
  lines.push(`> ${site.description}`);
  lines.push("");
  lines.push(
    "This is a personal first-person product review site. Every product reviewed has been used by the author for at least a month before earning a verdict. There are no sponsorships, no PR samples, and no paid placements. The author bought every product on the site.",
  );
  lines.push("");

  lines.push("## Site rules");
  lines.push("");
  lines.push("- One-month minimum use before any product earns a verdict.");
  lines.push("- No sponsorships, no PR boxes, no paid placements.");
  lines.push("- Verdicts are word-based: recommend, okay, or bad.");
  lines.push("- Three rating axes: effect, value, tolerance (each 0-10).");
  lines.push("- Buy links go to where the author actually purchased the product, with regional alternatives for India, USA, and UK.");
  lines.push("");

  lines.push("## Categories");
  lines.push("");
  const cats = KINDS.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    path: kindPath(kind),
  }));
  for (const c of cats) {
    const items = getReviews(c.kind);
    lines.push(`- [${c.label}](${site.url}${c.path}), ${items.length} reviews`);
  }
  lines.push("");

  for (const c of cats) {
    const items = getReviews(c.kind);
    if (items.length === 0) continue;
    lines.push(`## ${c.label}`);
    lines.push("");
    for (const r of items) {
      const verdict = r.verdict ?? "still testing";
      lines.push(
        `- [${mdText(r.brand)}, ${mdText(r.name)}](${site.url}/${r.kind}/${r.slug}), ${mdText(verdict)}`,
      );
    }
    lines.push("");
  }

  const primers = getPrimers();
  if (primers.length > 0) {
    lines.push("## Primers");
    lines.push("");
    for (const p of primers) {
      lines.push(
        `- [${mdText(p.title)}](${site.url}/primers/${p.slug})${p.subtitle ? `, ${mdText(p.subtitle)}` : ""}`,
      );
    }
    lines.push("");
  }

  lines.push("## Other pages");
  lines.push("");
  lines.push(`- [About the author and site rules](${site.url}/about)`);
  lines.push(`- [What is on the shelf this month](${site.url}/now)`);
  lines.push(`- [Photos](${site.url}/photos)`);
  lines.push(`- [Routines (morning, evening, shower, stack)](${site.url}/routine)`);
  lines.push(`- [Retired products](${site.url}/retired)`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
