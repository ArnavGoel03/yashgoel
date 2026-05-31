import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * PWA manifest. Dark-first, matching the site's house style:
 *   - theme_color / background_color point at the stone-950 body so
 *     Android's status bar and iOS splash screens blend into the page
 *     rather than flashing a cream plate between launch and hydration.
 *   - Icons ship at 192 and 512, with the 512 doubling as a maskable
 *     source for Android adaptive launchers (the glyph is padded inside
 *     the safe zone in icon2.tsx).
 *   - Shortcuts surface the three review shelves directly from the
 *     home-screen icon on platforms that honor them (Android, Samsung,
 *     Windows Start Menu).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name}, ${site.tagline}`,
    short_name: site.shortName,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1c1917",
    theme_color: "#1c1917",
    categories: ["lifestyle", "health", "magazines"],
    icons: [
      {
        src: "/icon1",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    // Web Share Target, once the site is installed as a PWA the OS
    // share sheet lists Yash as a destination. Anything shared (URL,
    // text, or title) lands at /search?q=… so the catalog can resolve
    // it. Honored on Android Chrome, Samsung, Edge, and Windows; iOS
    // ignores it but the rest of the manifest is unaffected.
    share_target: {
      action: "/search",
      method: "GET",
      params: { title: "q", text: "q", url: "q" },
    },
    shortcuts: [
      {
        name: "Today",
        short_name: "Today",
        description: "Check off today's habits, brush, skincare, supplements.",
        url: "/today",
      },
      {
        name: "Skincare",
        short_name: "Skincare",
        description: "Cleansers, serums, moisturizers, sunscreens.",
        url: "/skincare",
      },
      {
        name: "Supplements",
        short_name: "Supplements",
        description: "Vitamins, minerals, nootropics, adaptogens.",
        url: "/supplements",
      },
      {
        name: "Oral care",
        short_name: "Oral care",
        description: "Electric brushes, pastes, mouthwash, floss.",
        url: "/oral-care",
      },
      {
        name: "Now",
        short_name: "Now",
        description: "What's on the shelf this month.",
        url: "/now",
      },
    ],
  };
}
