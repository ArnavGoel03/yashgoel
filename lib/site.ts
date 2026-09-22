export const DEFAULT_SITE_URL = "https://reviews.arnavgoel.dev";

export function resolveSiteUrl(
  vercelEnvironment: string | undefined,
  configuredUrl: string | undefined,
) {
  if (vercelEnvironment === "production") return DEFAULT_SITE_URL;
  return configuredUrl ?? DEFAULT_SITE_URL;
}

export const site = {
  name: "Yash Goel",
  shortName: "Yash",
  tagline: "Honest reviews of the stuff I actually put on, in, and around my body.",
  bio: "I'm Yash. I write first-person reviews of skincare, supplements, oral care, hair care, and body care, every product here lived in my routine for at least a month before it earned a rating. No sponsorships, no PR boxes, no hype.",
  description:
    "First-person reviews of skincare, supplements, oral care, hair care, and body care. Every product used for a month before it earns a verdict. No sponsorships, no PR boxes, no hype.",
  url: resolveSiteUrl(
    process.env.VERCEL_ENV,
    process.env.NEXT_PUBLIC_SITE_URL,
  ),
  location: "San Diego, CA",
  professionalUrl: "https://arnavgoel.dev",
  professionalName: "arnavgoel.dev",
} as const;
