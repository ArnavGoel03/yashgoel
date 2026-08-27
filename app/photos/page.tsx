import type { Metadata } from "next";
import { Container } from "@/components/container";
import { PhotoHero, PhotoSideCaption, PhotoTile } from "@/components/photo-tile";
import { photos } from "@/lib/photos";
import { site } from "@/lib/site";
import type { Photo } from "@/lib/types";
import { JumpToFrame } from "./jump-to-frame";
import { LightboxRoot } from "./lightbox";
import { ChapterNav } from "./chapter-nav";
import { ContactSheet } from "./contact-sheet";
import { ImageProtection } from "./protect";

// Edge runtime attempt reverted , something in the /photos dependency
// chain still imports node:fs (probably @/lib/site or a transitive
// dependency). Build failed with "Native module not found: node:fs".
// Re-enable once we trace + remove the fs reference.
// export const runtime = "edge";

export const metadata: Metadata = {
  title: "Photos",
  description: `DSLR photography by ${site.name}.`,
  alternates: { canonical: "/photos" },
  // Signals to compliant AI crawlers (OpenAI, Anthropic, Google AI, Meta AI)
  // that these images are not licensed for training-corpus use. Combines
  // with the robots.txt user-agent blocks at app/robots.ts.
  other: {
    "robots": "index, follow, noai, noimageai",
    "X-Robots-Tag": "noai, noimageai",
  },
};

/**
 * Editorial chapters with mixed-scale rhythm. Each chapter opens with
 * a typographic header, an oversize anchor frame, and then cycles a
 * pattern of full / fullBleed / asymmetric diptych / right / left /
 * sideCaption slots so the eye keeps recalibrating instead of falling
 * into a feed cadence. Chapter closes with a quiet ❋ glyph that
 * stamps the section like a printed photo essay.
 */

type Slot =
  | { kind: "full"; photos: [Photo] }
  | { kind: "fullBleed"; photos: [Photo] }
  | { kind: "diptych"; photos: [Photo, Photo] }
  | { kind: "sideCaptionLeft"; photos: [Photo] }
  | { kind: "sideCaptionRight"; photos: [Photo] }
  | { kind: "left"; photos: [Photo] }
  | { kind: "right"; photos: [Photo] };

const SECTION_RHYTHM: Slot["kind"][] = [
  "diptych",
  "sideCaptionLeft",
  "right",
  "diptych",
  "fullBleed",
  "left",
  "sideCaptionRight",
  "diptych",
  "full",
];

function buildSlots(input: Photo[]): Slot[] {
  const slots: Slot[] = [];
  let i = 0;
  let p = 0;
  while (i < input.length) {
    if (input[i].featured) {
      slots.push({ kind: "fullBleed", photos: [input[i]] });
      i += 1;
      continue;
    }
    const kind = SECTION_RHYTHM[p % SECTION_RHYTHM.length];
    p++;
    if (kind === "diptych") {
      if (i + 1 < input.length && !input[i + 1].featured) {
        slots.push({ kind: "diptych", photos: [input[i], input[i + 1]] });
        i += 2;
      } else {
        slots.push({ kind: "full", photos: [input[i]] });
        i += 1;
      }
    } else {
      slots.push({ kind, photos: [input[i]] } as Slot);
      i += 1;
    }
  }
  return slots;
}

type SectionKey = "san-diego" | "joshua-tree" | "elsewhere";

const SECTION_META: Record<SectionKey, { place: string; region: string }> = {
  "san-diego": { place: "San Diego", region: "California" },
  "joshua-tree": { place: "Joshua Tree", region: "California" },
  elsewhere: { place: "Elsewhere", region: "" },
};

function sectionKeyOf(photo: Photo): SectionKey {
  const loc = (photo.location ?? "").toLowerCase();
  if (loc.includes("joshua tree")) return "joshua-tree";
  if (loc.includes("san diego") || loc.includes("ucsd")) return "san-diego";
  return "elsewhere";
}

type Section = {
  key: SectionKey;
  number: string;
  place: string;
  region: string;
  monthLabel: string;
  count: number;
  anchor: Photo;
  rest: Photo[];
};

function monthLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function buildSections(photos: Photo[]): Section[] {
  const groups = new Map<SectionKey, Photo[]>();
  for (const p of photos) {
    const k = sectionKeyOf(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }
  const ordered: { key: SectionKey; photos: Photo[]; latest: number }[] = [];
  for (const [key, ps] of groups) {
    ps.sort((a, b) => b.date.localeCompare(a.date));
    const latest = new Date(ps[0].date).getTime();
    ordered.push({ key, photos: ps, latest });
  }
  ordered.sort((a, b) => b.latest - a.latest);
  return ordered.map((o, idx) => ({
    key: o.key,
    number: String(idx + 1).padStart(2, "0"),
    place: SECTION_META[o.key].place,
    region: SECTION_META[o.key].region,
    monthLabel: monthLabel(o.photos[0].date),
    count: o.photos.length,
    anchor: o.photos[0],
    rest: o.photos.slice(1),
  }));
}

export default function PhotosPage() {
  const earliest = photos.length
    ? new Date(Math.min(...photos.map((p) => new Date(p.date).getTime())))
    : null;
  const latest = photos.length
    ? new Date(Math.max(...photos.map((p) => new Date(p.date).getTime())))
    : null;

  // Two tiers: editorial frames live in the chapter layout; archive
  // frames go in a dense contact-sheet grid after the curated content
  // so they're browsable without diluting the curated experience.
  const editorialPhotos = photos.filter((p) => p.tier !== "archive");
  const archivePhotos = photos
    .filter((p) => p.tier === "archive")
    .sort((a, b) => b.date.localeCompare(a.date));

  const heroIdx = editorialPhotos.findIndex((p) => p.hero);
  const hero =
    heroIdx >= 0 ? editorialPhotos[heroIdx] : editorialPhotos[0];
  const rest = editorialPhotos.filter((p) => p.src !== hero?.src);
  const sections = buildSections(rest);

  // Build the lightbox photo list in DOM render order so data-lightbox-index
  // values are stable and the prev/next buttons walk the page sequentially.
  const lightboxList: Photo[] = [];
  if (hero) lightboxList.push(hero);
  for (const s of sections) {
    lightboxList.push(s.anchor);
    let i = 0;
    let p = 0;
    const RHYTHM = ["diptych","sideCaptionLeft","right","diptych","fullBleed","left","sideCaptionRight","diptych","full"] as const;
    while (i < s.rest.length) {
      if (s.rest[i].featured) { lightboxList.push(s.rest[i]); i++; continue; }
      const k = RHYTHM[p % RHYTHM.length]; p++;
      if (k === "diptych" && i + 1 < s.rest.length && !s.rest[i+1].featured) {
        lightboxList.push(s.rest[i], s.rest[i+1]); i += 2;
      } else {
        lightboxList.push(s.rest[i]); i += 1;
      }
    }
  }
  lightboxList.push(...archivePhotos);

  // Map src -> global lightbox index for use in JSX data attrs.
  const srcToIdx = new Map(lightboxList.map((p, i) => [p.src, i]));
  const lb = (p: Photo) => srcToIdx.get(p.src) ?? 0;

  // Chapters for the sticky nav (cover, each chapter, contact sheet).
  const navChapters = [
    { id: "cover", label: hero ? "Cover" : "Top" },
    ...sections.map((s) => ({
      id: `chapter-${s.key}`,
      label: s.place,
    })),
    ...(archivePhotos.length > 0
      ? [{ id: "contact-sheet", label: "Contact sheet" }]
      : []),
  ];

  let frame = 1;

  return (
    <>
      {/* Preconnect to image origins so the first <img> doesn't pay
          the DNS + TLS handshake on the request path. */}
      <link
        rel="preconnect"
        href="https://pub-81726e3b98da43bb906dabff81db14a2.r2.dev"
        crossOrigin=""
      />
      <link
        rel="preconnect"
        href="https://objects.githubusercontent.com"
        crossOrigin=""
      />

      {/* Hero preload , fires the browser fetch for the hero's optimized
          AVIF/WebP before the parser even reaches the <Image>. Combined
          with the inline AVIF (which paints from the HTML itself with
          zero network), the hero is visible faster than physically
          possible by any other means. */}
      {hero?.src && (
        <link
          rel="preload"
          as="image"
          href={`/_next/image?url=${encodeURIComponent(hero.src)}&w=1920&q=92`}
          fetchPriority="high"
          type="image/avif"
        />
      )}

      {/* Masthead , quiet eyebrow, dramatic title, italic subtitle,
          one hairline rule, a single tight stat line. Press "/" to
          jump to any frame. */}
      <Container className="max-w-5xl">
        <div className="pt-20 sm:pt-28">
          <div className="mb-12 flex items-baseline justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.32em] text-stone-400 dark:text-stone-500">
            <span className="flex items-baseline gap-3">
              <span className="text-rose-400">❋</span>
              <span>Contact Sheet</span>
            </span>
            {earliest && latest && (
              <span className="tabular-nums">
                {earliest.getFullYear()} — {latest.getFullYear()}
              </span>
            )}
          </div>

          <h1 className="font-serif text-[18vw] leading-[0.85] tracking-[-0.05em] text-stone-900 sm:text-[13rem] dark:text-stone-50">
            Photos<span className="text-rose-400">.</span>
          </h1>
          <p className="mt-10 max-w-2xl font-serif text-2xl italic leading-[1.3] text-stone-600 sm:text-3xl sm:leading-[1.25] dark:text-stone-300">
            A slow-growing roll. Shot when the camera was in the bag and the
            light was doing something.
          </p>

          <div className="mt-16 flex flex-wrap items-baseline gap-x-10 gap-y-2 border-t border-stone-200/70 pt-6 font-serif italic text-stone-500 dark:border-stone-800/70 dark:text-stone-400 sm:mt-20">
            <span>
              <span className="not-italic font-mono text-stone-900 tabular-nums dark:text-stone-50">
                {String(editorialPhotos.length).padStart(2, "0")}
              </span>{" "}
              edited
            </span>
            {archivePhotos.length > 0 && (
              <span>
                <span className="not-italic font-mono text-stone-900 tabular-nums dark:text-stone-50">
                  {String(archivePhotos.length).padStart(2, "0")}
                </span>{" "}
                in the contact sheet
              </span>
            )}
            <span>
              <span className="not-italic font-mono text-stone-900 tabular-nums dark:text-stone-50">
                {String(sections.length).padStart(2, "0")}
              </span>{" "}
              {sections.length === 1 ? "chapter" : "chapters"}
            </span>
            <span className="ml-auto font-mono text-[10px] not-italic uppercase tracking-[0.28em] text-stone-400 dark:text-stone-500">
              press <kbd className="rounded border border-stone-300 px-1.5 py-0.5 font-mono dark:border-stone-700">/</kbd> to jump
            </span>
          </div>
        </div>
      </Container>
      <JumpToFrame max={editorialPhotos.length} />
      <ImageProtection />

      <ChapterNav chapters={navChapters} />

      {hero && (
        <div
          id="cover"
          data-lightbox-index={lb(hero)}
          className="scroll-mt-24 mt-16 mb-32 cursor-zoom-in sm:mt-24 sm:mb-44"
        >
          <div id="frame-1">
            <PhotoHero photo={hero} index={0} />
          </div>
        </div>
      )}

      {sections.map((section, sectionIdx) => {
        const slots = buildSlots(section.rest);
        const anchorIdx = frame++;
        const isLast = sectionIdx === sections.length - 1;
        return (
          <section
            key={section.key}
            id={`chapter-${section.key}`}
            className="scroll-mt-24"
          >
            {/* Chapter cover spread , book-style title page. Anchor
                photo bleeds the whole frame at low opacity, chapter
                number / place / month set in editorial type on top.
                Background routes through Next/Image at a small width
                so we don't fetch the full camera JPG just for an 8%
                opacity wash. */}
            <div className="relative overflow-hidden border-y border-stone-200 dark:border-stone-800">
              <div className="pointer-events-none absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/_next/image?url=${encodeURIComponent(section.anchor.src)}&w=1920&q=65`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full select-none object-cover opacity-[0.08] dark:opacity-[0.12]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/60 to-white/85 dark:from-stone-950/70 dark:via-stone-950/60 dark:to-stone-950/85" />
              </div>
              <Container className="relative max-w-5xl">
                <div className="flex min-h-[70vh] flex-col justify-center py-24 sm:min-h-[80vh] sm:py-32">
                  <div className="mb-10 flex items-baseline gap-4 sm:mb-16">
                    <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-rose-400">
                      Chapter {section.number}
                    </span>
                    <span className="h-px flex-1 bg-stone-300/70 dark:bg-stone-700/70" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500 tabular-nums dark:text-stone-400">
                      {String(section.count).padStart(2, "0")} frames
                    </span>
                  </div>
                  <h2 className="font-serif text-[18vw] leading-[0.86] italic tracking-[-0.04em] text-stone-900 sm:text-[12rem] dark:text-stone-50">
                    {section.place}
                    <span className="not-italic text-rose-400">.</span>
                  </h2>
                  <p className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-serif text-xl italic text-stone-600 sm:mt-10 sm:text-2xl dark:text-stone-300">
                    <span>{section.monthLabel}</span>
                    {section.region && (
                      <>
                        <span aria-hidden className="text-stone-400 not-italic dark:text-stone-600">
                          ·
                        </span>
                        <span className="not-italic font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-stone-400">
                          {section.region}
                        </span>
                      </>
                    )}
                  </p>
                  <div className="mt-16 flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-stone-400 dark:text-stone-500 sm:mt-24">
                    <span className="h-px w-12 bg-stone-300 dark:bg-stone-700" />
                    <span>Scroll to read</span>
                  </div>
                </div>
              </Container>
            </div>

            <div className="pt-16 pb-24 sm:pt-24 sm:pb-32">

            {/* Section anchor */}
            <div
              id={`frame-${anchorIdx}`}
              data-lightbox-index={lb(section.anchor)}
              className="scroll-mt-24 mt-16 mb-24 cursor-zoom-in sm:mt-24 sm:mb-36"
            >
              <PhotoHero photo={section.anchor} index={anchorIdx - 1} />
            </div>

            {/* Rhythm slots */}
            <div className="space-y-28 sm:space-y-40">
              {slots.map((slot, slotIdx) => {
                if (slot.kind === "fullBleed") {
                  const idx = frame++;
                  return (
                    <div
                      key={`fb-${sectionIdx}-${slotIdx}`}
                      id={`frame-${idx}`}
                      data-lightbox-index={lb(slot.photos[0])}
                      className="scroll-mt-24 cursor-zoom-in"
                    >
                      <PhotoHero photo={slot.photos[0]} index={idx - 1} />
                    </div>
                  );
                }
                if (slot.kind === "full") {
                  const idx = frame++;
                  return (
                    <Container key={`f-${sectionIdx}-${slotIdx}`} className="max-w-5xl">
                      <div id={`frame-${idx}`} data-lightbox-index={lb(slot.photos[0])} className="scroll-mt-24 cursor-zoom-in">
                        <PhotoTile photo={slot.photos[0]} index={idx} />
                      </div>
                    </Container>
                  );
                }
                if (slot.kind === "diptych") {
                  const a = frame++;
                  const b = frame++;
                  const bigOnLeft = (slotIdx % 2) === 0;
                  return (
                    <Container key={`d-${sectionIdx}-${slotIdx}`} className="max-w-6xl">
                      <div className="grid grid-cols-1 gap-y-16 sm:grid-cols-12 sm:gap-x-8 sm:gap-y-0">
                        {bigOnLeft ? (
                          <>
                            <div id={`frame-${a}`} data-lightbox-index={lb(slot.photos[0])} className="scroll-mt-24 cursor-zoom-in sm:col-span-7">
                              <PhotoTile photo={slot.photos[0]} index={a} />
                            </div>
                            <div id={`frame-${b}`} data-lightbox-index={lb(slot.photos[1])} className="scroll-mt-24 cursor-zoom-in sm:col-span-5 sm:mt-32">
                              <PhotoTile photo={slot.photos[1]} index={b} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div id={`frame-${a}`} data-lightbox-index={lb(slot.photos[0])} className="scroll-mt-24 cursor-zoom-in sm:col-span-5 sm:mt-32">
                              <PhotoTile photo={slot.photos[0]} index={a} />
                            </div>
                            <div id={`frame-${b}`} data-lightbox-index={lb(slot.photos[1])} className="scroll-mt-24 cursor-zoom-in sm:col-span-7">
                              <PhotoTile photo={slot.photos[1]} index={b} />
                            </div>
                          </>
                        )}
                      </div>
                    </Container>
                  );
                }
                if (slot.kind === "sideCaptionLeft") {
                  const idx = frame++;
                  return (
                    <Container key={`sl-${sectionIdx}-${slotIdx}`} className="max-w-6xl">
                      <div id={`frame-${idx}`} data-lightbox-index={lb(slot.photos[0])} className="scroll-mt-24 cursor-zoom-in">
                        <PhotoSideCaption photo={slot.photos[0]} index={idx} side="left" />
                      </div>
                    </Container>
                  );
                }
                if (slot.kind === "sideCaptionRight") {
                  const idx = frame++;
                  return (
                    <Container key={`sr-${sectionIdx}-${slotIdx}`} className="max-w-6xl">
                      <div id={`frame-${idx}`} data-lightbox-index={lb(slot.photos[0])} className="scroll-mt-24 cursor-zoom-in">
                        <PhotoSideCaption photo={slot.photos[0]} index={idx} side="right" />
                      </div>
                    </Container>
                  );
                }
                if (slot.kind === "right") {
                  const idx = frame++;
                  return (
                    <div key={`r-${sectionIdx}-${slotIdx}`} className="px-6">
                      <div id={`frame-${idx}`} data-lightbox-index={lb(slot.photos[0])} className="scroll-mt-24 ml-auto max-w-3xl cursor-zoom-in">
                        <PhotoTile photo={slot.photos[0]} index={idx} />
                      </div>
                    </div>
                  );
                }
                const idx = frame++;
                return (
                  <div key={`l-${sectionIdx}-${slotIdx}`} className="px-6">
                    <div id={`frame-${idx}`} data-lightbox-index={lb(slot.photos[0])} className="scroll-mt-24 mr-auto max-w-3xl cursor-zoom-in">
                      <PhotoTile photo={slot.photos[0]} index={idx} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chapter closer , quiet typographic stamp */}
            <div
              aria-hidden
              className="mx-auto mt-28 flex max-w-5xl flex-col items-center gap-4 px-6 text-center sm:mt-36"
            >
              <span className="text-2xl text-rose-400">❋</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-stone-400 dark:text-stone-500">
                End of Chapter {section.number}
                {!isLast && (
                  <>
                    <span aria-hidden className="mx-3 text-stone-300 dark:text-stone-700">·</span>
                    <span>Turn the page</span>
                  </>
                )}
              </span>
            </div>
            </div>
          </section>
        );
      })}

      {/* Contact sheet , archive frames in a dense grid. Bulk-imported
          unedited camera JPGs that didn't earn an editorial slot but
          stay browsable. Square crops keep the grid even; the rich
          chapter layout above stays the focus. */}
      {archivePhotos.length > 0 && (
        <section id="contact-sheet" className="scroll-mt-24 border-t border-stone-200 pt-20 pb-24 sm:pt-28 sm:pb-32 dark:border-stone-800">
          <Container className="max-w-6xl">
            <div className="mb-12 flex items-baseline gap-4 sm:mb-16">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-rose-400">
                Contact Sheet
              </span>
              <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-stone-400 tabular-nums dark:text-stone-500">
                {String(archivePhotos.length).padStart(3, "0")} frames
              </span>
            </div>
            <h2 className="font-serif text-5xl italic leading-[0.95] tracking-tight text-stone-900 sm:text-7xl dark:text-stone-100">
              The rest of the roll
              <span className="not-italic text-rose-400">.</span>
            </h2>
            <p className="mt-4 max-w-xl font-serif text-base italic text-stone-500 sm:text-lg dark:text-stone-400">
              Unedited frames kept on file. Some will earn a permanent slot
              upstairs once they get a proper develop. Most will stay here.
            </p>
          </Container>

          <Container className="mt-12 max-w-7xl sm:mt-16">
            <ContactSheet
              photos={archivePhotos.map((photo) => ({
                photo,
                index: lb(photo),
              }))}
            />
          </Container>
        </section>
      )}

      <LightboxRoot
        photos={lightboxList.map((p) => ({
          src: p.src,
          alt: p.alt,
          caption: p.caption,
          width: p.width,
          height: p.height,
          location: p.location,
          date: p.date,
        }))}
      />
    </>
  );
}
