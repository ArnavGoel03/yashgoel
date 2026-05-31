# Start here (pick up fast, don't re-derive)

1. Read the **Quickstart** + **Current architecture** at the top of
   `STATE.md` — verified against the tree, unlike the session history
   below it. Trust the code over old session notes.
2. Run `pnpm test` first — the seconds-fast data-integrity gate
   (`tests/data-integrity.test.ts`). Green = content layer healthy; red
   names the exact broken file/field. Run it again before every push.
3. `CLAUDE.md` is the canonical rulebook — content voice, the data
   model, the "retailers before URLs" invariant, and scalability posture.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes, APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
