import { test, expect } from "@playwright/test";

test("public pages, navigation and photo lightbox remain usable", async ({ page }, info) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/", "/skincare", "/photos"]) {
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
    await expect(page.locator("main")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: info.outputPath(`${info.project.name}-${route.slice(1) || "home"}.png`) });
  }

  await page.evaluate(() => {
    document.dispatchEvent(new MouseEvent("mouseenter"));
    document.dispatchEvent(new MouseEvent("click"));
  });
  await page.locator("[data-lightbox-index]").first().click();
  const overlay = page.locator("[data-lightbox-overlay]");
  await expect(overlay).toBeVisible();
  const photo = overlay.locator("img").first();
  await expect.poll(() => photo.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  const first = await photo.getAttribute("src");
  await page.getByRole("button", { name: "Next photo", exact: true }).click();
  await expect(photo).not.toHaveAttribute("src", first);
  await expect.poll(() => photo.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await photo.evaluate(img => img.decode());
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation =>
      animation.effect?.getTiming().iterations !== Infinity,
    ).map(animation => animation.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: info.outputPath(`${info.project.name}-lightbox.png`) });
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);

  if (info.project.name === "phone") {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Site navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu", exact: true }).click();
  }
  await page.goto("/search");
  await page.getByRole("searchbox", { name: "Search", exact: true }).fill("sunscreen");
  await expect(page.locator("main a[href^='/skincare/']").first()).toBeVisible();
  expect(errors).toEqual([]);
});
