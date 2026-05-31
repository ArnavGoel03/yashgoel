import { cacheLife, cacheTag } from "next/cache";
import { getAllReviews, getPrimers } from "@/lib/content";
import { site } from "@/lib/site";

type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  categories: string[];
};

// Escape the five XML-unsafe characters. Hand-rolled rather than pulling a
// library in for 10 lines of code.
function esc(s: string): string {
  return (
    s
      // XML 1.0 FORBIDS most C0 control chars entirely, they can't appear
      // even as numeric entities. A single stray \x00/\x07/\x0B/\x1B in any
      // review name/summary (easy to paste in from a PDF/terminal) makes the
      // ENTIRE feed unparseable for every reader, not just that item. Strip
      // them before escaping.
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
  );
}

function rfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

function render(items: FeedItem[]): string {
  const now = new Date().toUTCString();
  const entries = items
    .map(
      (i) => `
    <item>
      <title>${esc(i.title)}</title>
      <link>${esc(i.link)}</link>
      <guid isPermaLink="true">${esc(i.link)}</guid>
      <description>${esc(i.description)}</description>
      <pubDate>${rfc822(i.pubDate)}</pubDate>${i.categories
        .map((c) => `\n      <category>${esc(c)}</category>`)
        .join("")}
    </item>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)}</title>
    <link>${esc(site.url)}</link>
    <atom:link href="${esc(site.url)}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(site.description)}</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>${entries}
  </channel>
</rss>`;
}

async function buildFeed(): Promise<string> {
  "use cache";
  cacheLife("max");
  cacheTag("reviews", "primers", "feed");

  const items: FeedItem[] = [];

  for (const r of getAllReviews()) {
    items.push({
      title: `${r.brand}, ${r.name}`,
      link: `${site.url}/${r.kind}/${r.slug}`,
      description: r.summary || `${r.brand} ${r.name}, review.`,
      pubDate: r.datePublished,
      categories: [r.kind, r.category],
    });
  }

  for (const p of getPrimers()) {
    items.push({
      title: `${p.title}, Primer`,
      link: `${site.url}/primers/${p.slug}`,
      description:
        p.subtitle ?? `${p.title}, a primer on ${p.domain}.`,
      pubDate: p.datePublished,
      categories: ["primer", p.domain, p.kind],
    });
  }

  items.sort((a, b) => b.pubDate.localeCompare(a.pubDate));
  return render(items);
}

export async function GET() {
  const body = await buildFeed();
  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
