import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { spawn } from "node:child_process";

function check(base, overrides = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/check-overflow.mjs"], {
      env: { ...process.env, BASE: base, CDP_PORT: "9333", ...overrides },
      stdio: "inherit",
      timeout: 480_000,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => signal ? reject(new Error(`Overflow runner ended with ${signal}`)) : resolve(code));
  });
}

test("existing full overflow gate accepts a clean fixture and detects overflow", async ({ page, baseURL }) => {
  test.setTimeout(600_000);
  await page.goto("/");
  let wide = false;
  const fixture = createServer((_request, response) => {
    response.setHeader("Content-Type", "text/html");
    response.end(`<html><body><div style="width:${wide ? "200vw" : "100%"};height:10px"></div></body></html>`);
  });
  await new Promise(resolve => fixture.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${fixture.address().port}`;
    const one = { ROUTES: "/", WIDTHS: "390" };
    expect(await check(base, one)).toBe(0);
    wide = true;
    expect(await check(base, one)).toBe(1);
  } finally {
    await new Promise(resolve => fixture.close(resolve));
  }
  expect(await check(baseURL)).toBe(0);
});
