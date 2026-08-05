import type { MetadataRoute } from "next";
import { getPrimers, getReviews } from "@/lib/content";
import { getRoutinesList, getSubroutinesList } from "@/lib/routines";
import { site } from "@/lib/site";
import { KINDS, kindPath } from "@/lib/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${site.url}/`, lastModified: now, priority: 1 },
    { url: `${site.url}/about`, lastModified: now, priority: 0.8 },
    { url: `${site.url}/now`, lastModified: now, priority: 0.9 },
    { url: `${site.url}/photos`, lastModified: now, priority: 0.8 },
    ...KINDS.map((kind) => ({
      url: `${site.url}${kindPath(kind)}`,
      lastModified: now,
      priority: 0.8,
    })),
    { url: `${site.url}/primers`, lastModified: now, priority: 0.8 },
    { url: `${site.url}/routine`, lastModified: now, priority: 0.8 },
    { url: `${site.url}/retired`, lastModified: now, priority: 0.5 },
    { url: `${site.url}/search`, lastModified: now, priority: 0.5 },
    // /compare is disallowed in robots.ts, don't surface it here.
    { url: `${site.url}/links`, lastModified: now, priority: 0.7 },
    { url: `${site.url}/subscribe`, lastModified: now, priority: 0.6 },
    { url: `${site.url}/library`, lastModified: now, priority: 0.7 },
    { url: `${site.url}/glossary`, lastModified: now, priority: 0.7 },
    { url: `${site.url}/build`, lastModified: now, priority: 0.8 },
    { url: `${site.url}/best-of/2026`, lastModified: now, priority: 0.8 },
  ];
  const routineRoutes: MetadataRoute.Sitemap = [
    ...getRoutinesList().map((r) => ({
      url: `${site.url}/routine/${r}`,
      lastModified: now,
      priority: 0.7,
    })),
    ...getSubroutinesList().map((s) => ({
      url: `${site.url}/routine/${s}`,
      lastModified: now,
      priority: 0.6,
    })),
  ];
  // Weight reviews by verdict: products I stand behind deserve more crawl
  // budget than "still testing" placeholders.
  const priorityForVerdict = (v?: "recommend" | "okay" | "bad"): number => {
    if (v === "recommend") return 0.85;
    if (v === "okay") return 0.7;
    if (v === "bad") return 0.5;
    return 0.55; // still testing
  };
  const reviewRoutes: MetadataRoute.Sitemap = KINDS.flatMap((kind) =>
    getReviews(kind).map((r) => ({
      url: `${site.url}${kindPath(kind)}/${r.slug}`,
      lastModified: new Date(r.datePublished),
      priority: priorityForVerdict(r.verdict),
    })),
  );
  const primerRoutes: MetadataRoute.Sitemap = getPrimers().map((p) => ({
    url: `${site.url}/primers/${p.slug}`,
    lastModified: new Date(p.lastUpdated ?? p.datePublished),
    priority: 0.7,
  }));
  return [
    ...staticRoutes,
    ...reviewRoutes,
    ...primerRoutes,
    ...routineRoutes,
  ];
}
