import { ImageResponse } from "next/og";
import { getPhotos } from "@/lib/photos";


export const alt = "Photos by Yash Goel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * /photos social-share card. Shows the current hero photo at 1200×630
 * with a quiet caption overlay. Generated at build time so iMessage /
 * Slack / Twitter previews show the actual hero, not the site's generic
 * "An honest catalog of yash." card.
 *
 * Falls back to the first editorial photo if no `hero: true` is flagged.
 */
export default async function Image() {
  const photos = getPhotos();
  const hero = photos.find((p) => p.hero) ?? photos[0];
  if (!hero) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%", width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#1c1917", color: "#fafaf8",
            fontSize: 64, fontFamily: "Georgia, serif",
          }}
        >
          Photos
        </div>
      ),
      size,
    );
  }

  // Use the optimized URL for the hero photo at the right size for OG cards.
  const heroUrl = hero.src.startsWith("http")
    ? hero.src
    : `https://yashgoel.vercel.app${hero.src}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%", width: "100%",
          display: "flex", position: "relative",
          background: "#0c0a09",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <img
          src={heroUrl}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
          }}
        />
        {/* Gradient overlay so the caption stays readable */}
        <div
          style={{
            position: "absolute", inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            padding: "56px 72px",
            display: "flex", flexDirection: "column",
            color: "#fafaf8",
          }}
        >
          <div
            style={{
              display: "flex", alignItems: "baseline", gap: 16,
              fontSize: 18, letterSpacing: 4, textTransform: "uppercase",
              color: "#d6d3d1", marginBottom: 18,
              fontFamily: "ui-sans-serif, -apple-system, system-ui, sans-serif",
            }}
          >
            <span style={{ color: "#fb7185" }}>❋</span>
            <span>Photographs</span>
            {hero.location && (
              <>
                <span style={{ color: "#78716c" }}>·</span>
                <span style={{ color: "#a8a29e" }}>{hero.location}</span>
              </>
            )}
          </div>
          <div
            style={{
              display: "flex",
              fontStyle: "italic",
              fontSize: 78, lineHeight: 1.05,
              letterSpacing: -1,
              maxWidth: 1000,
            }}
          >
            {hero.caption || "Photos."}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
