"use client";

import { useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/types";

const BLUR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=";

const INITIAL = 60;
const STEP = 60;

/**
 * Contact-sheet grid for archive frames. Renders only the first
 * INITIAL frames on mount to keep initial hydration light; user
 * expands STEP-at-a-time via the Load-more button. Each tile carries
 * `data-lightbox-index` so the LightboxRoot picks it up identically
 * to the editorial frames.
 */
export function ContactSheet({
  photos,
}: {
  photos: { photo: Photo; index: number }[];
}) {
  const [visible, setVisible] = useState(Math.min(INITIAL, photos.length));

  const slice = photos.slice(0, visible);
  const remaining = photos.length - visible;

  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 md:grid-cols-5 lg:grid-cols-6">
        {slice.map(({ photo, index }) => (
          <li
            key={photo.src}
            data-lightbox-index={index}
            className="relative aspect-square cursor-zoom-in overflow-hidden bg-stone-100 dark:bg-stone-900"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
              quality={70}
              placeholder="blur"
              blurDataURL={BLUR}
              draggable={false}
              className="object-cover transition-transform duration-700 ease-out hover:scale-[1.04]"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-1 right-1 select-none font-mono text-[8px] uppercase tracking-[0.18em] text-white/80 mix-blend-difference"
            >
              ❋
            </span>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <div className="mt-12 flex flex-col items-center gap-3 sm:mt-16">
          <button
            type="button"
            onClick={() =>
              setVisible((v) => Math.min(v + STEP, photos.length))
            }
            className="rounded-full border border-stone-300 bg-white px-6 py-2.5 font-serif text-sm italic text-stone-800 transition-colors hover:border-rose-400 hover:text-rose-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-rose-400"
          >
            Load {Math.min(STEP, remaining)} more frames
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-400 tabular-nums dark:text-stone-500">
            {visible} of {photos.length} shown · {remaining} remaining
          </span>
        </div>
      )}
    </>
  );
}
