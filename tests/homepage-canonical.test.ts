import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { metadata as aboutMetadata } from "@/app/about/page";
import { metadata as homeMetadata } from "@/app/page";
import { DEFAULT_SITE_URL } from "@/lib/site";

describe("canonical metadata", () => {
  it("uses the Reviews host for relative metadata by default", () => {
    expect(DEFAULT_SITE_URL).toBe("https://reviews.arnavgoel.dev");
  });

  it("sets the homepage canonical at the page boundary", () => {
    expect(homeMetadata.alternates).toMatchObject({ canonical: "/" });
    expect(aboutMetadata.alternates).toMatchObject({ canonical: "/about" });

    const rootLayout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
    expect(rootLayout).not.toMatch(/alternates:\s*\{\s*canonical:/);
  });
});
