/**
 * URL-scheme sanitizers, the single backstop against `javascript:` /
 * `data:` / `vbscript:` URIs reaching an `<a href>` or `<img src>`.
 *
 * Why this exists: the site's CSP keeps `'unsafe-inline'` (the Next 16
 * cacheComponents prerender can't carry a per-request nonce), so CSP is
 * NOT a backstop against an injected `javascript:` link. React does not
 * strip dangerous schemes from href/src either, it only warns in dev.
 * So every place that renders a URL derived from content, a share-link
 * payload, or MDX must pass it through here first.
 *
 * Two levels:
 *   - `safeExternalHref` , allows http(s)/mailto + same-origin paths,
 *     for buy links and author-written MDX anchors that legitimately
 *     point off-site.
 *   - `safeInternalHref` , allows ONLY same-origin relative paths,
 *     for the stack/routine-builder share URLs whose `href` field is
 *     always an in-catalog `/kind/slug` link. Anything else is dropped.
 */

// Schemes we will never emit into an href/src. Compared after stripping
// embedded whitespace/NULs/controls so `java\tscript:` and
// `java\0script:` can't sneak past the check.
const DANGEROUS_SCHEME = /^(javascript|data|vbscript|file|blob):/i;

function normalizeForSchemeCheck(raw: string): string {
  // Strip characters browsers ignore inside a scheme token (space, TAB,
  // LF, CR, NUL and other C0/C1 controls + DEL) so they can't be used to
  // obfuscate the scheme, then lowercase for the comparison.

  return raw.replace(/[\u0000-\u0020\u007f-\u009f]/g, "").toLowerCase();
}

/**
 * Allow http(s), mailto, same-origin relative paths, and bare fragments.
 * Returns `undefined` for anything dangerous so callers can render plain
 * text instead of a live link.
 */
export function safeExternalHref(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const href = raw.trim();
  if (!href) return undefined;
  const probe = normalizeForSchemeCheck(href);
  if (DANGEROUS_SCHEME.test(probe)) return undefined;
  // Relative path, fragment, or query, all same-origin.
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) {
    // Reject protocol-relative `//host` and backslash variants that some
    // routers treat as off-origin.
    if (href.startsWith("//") || href.startsWith("/\\")) return undefined;
    return href;
  }
  // Absolute URL: only http(s) and mailto are allowed through.
  if (/^(https?:|mailto:)/i.test(probe)) return href;
  return undefined;
}

/**
 * Allow ONLY same-origin relative paths (`/kind/slug`, optionally with a
 * query or fragment). Used where the URL must never leave the site -
 * notably share-link payloads decoded from an attacker-controllable
 * `?s=` param. Returns `undefined` for anything else.
 */
export function safeInternalHref(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const href = raw.trim();
  if (!href) return undefined;
  if (!href.startsWith("/")) return undefined;
  // Block protocol-relative `//evil.com` and `/\evil.com`.
  if (href.startsWith("//") || href.startsWith("/\\")) return undefined;
  // Defense in depth: no control chars, no embedded scheme.
  const probe = normalizeForSchemeCheck(href);
  if (DANGEROUS_SCHEME.test(probe)) return undefined;
  return href;
}
