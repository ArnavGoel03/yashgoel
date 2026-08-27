import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Trove",
  description:
    "Trove — a native macOS productivity app I'm currently building. 30+ panes, ~5 MB, local-only.",
  alternates: { canonical: "/trove" },
};

const FEATURES: { label: string; body: string }[] = [
  {
    label: "Clipboard",
    body: "Stage, history, snippets, notes. Honors password-manager ConcealedType so 1Password pastes never get logged.",
  },
  {
    label: "Capture",
    body: "OCR with on-device Vision + live translate, snip, QR, recorder, color sampler — one pane, no app-switching.",
  },
  {
    label: "Files",
    body: "PDF merge / split / compress / OCR, image convert, hash, batch rename. Drop a folder and it expands.",
  },
  {
    label: "System",
    body: "Window snap, Alt-Tab, process viewer, network monitor, keep-awake, full Mac log viewer.",
  },
  {
    label: "GPU & thermals",
    body: "Live °C from Apple's private HID sensors. No kexts, no admin password. Step-up vs iStat Menus / TG Pro.",
  },
  {
    label: "Storage",
    body: "Disk overview, large-file scan, dev-cache cleaner, Downloads sweep, one-click DMG/installer nuke with Undo.",
  },
];

const TODO: { label: string; body: string }[] = [
  {
    label: "Windows version",
    body: "Avalonia 11 + .NET 9 scaffold is up, four panes ported, the rest stubbed. CI build pipeline pending.",
  },
  {
    label: "In-app auto-update",
    body: "Sparkle 2 swap planned. Currently the app checks a JSON manifest; full delta updates after the appcast is hosted.",
  },
  {
    label: "Notarization",
    body: "Today's release is ad-hoc signed — Gatekeeper accepts after right-click → Open. Notarization once the Apple Developer enrollment lands.",
  },
];

export default function TrovePage() {
  return (
    <Container className="max-w-5xl py-16 sm:py-20">
      <div className="mb-6 flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
        <span className="flex items-baseline gap-2">
          <span className="text-rose-400">❋</span>
          <span>Currently building</span>
        </span>
        <span className="hidden sm:inline">May 2026 → ongoing</span>
      </div>

      <h1 className="font-serif text-5xl leading-[1.02] tracking-tight text-stone-900 sm:text-6xl dark:text-stone-100">
        Trove<span className="text-rose-400">.</span>
      </h1>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-50/60 px-3 py-1 text-[12px] text-rose-700 dark:border-rose-400/30 dark:bg-rose-950/30 dark:text-rose-300">
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-rose-400 opacity-60" />
          <span className="relative inline-block h-2 w-2 rounded-full bg-rose-400" />
        </span>
        Work in progress — shipping pieces as they land
      </div>

      <p className="mt-6 max-w-2xl text-[17px] leading-[1.55] text-stone-700 dark:text-stone-300">
        Trove is the native macOS productivity app I&apos;m building right now —
        thirty-something panes for clipboard, capture, compute, files,
        system, and storage, all in one ~5 MB Swift binary. Local-only, no
        telemetry, no accounts. It replaces Raycast Pro + iStat Menus +
        CleanMyMac + Bartender + TextSniper (≈$181/yr bundle) for $10/yr.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          href="https://gettrove.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-5 py-2 text-[13.5px] font-medium text-stone-50 transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          Visit the site <span aria-hidden>→</span>
        </Link>
        <Link
          href="https://github.com/ArnavGoel03/trove"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-5 py-2 text-[13.5px] font-medium text-stone-700 transition-colors hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:text-stone-300 dark:hover:border-stone-500 dark:hover:text-stone-100"
        >
          GitHub
        </Link>
      </div>

      <hr className="mt-14 border-stone-200 dark:border-stone-800" />

      <section className="mt-12">
        <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
          What&apos;s in it
        </div>
        <div className="mt-5 grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.label}>
              <div className="font-serif text-xl text-stone-900 dark:text-stone-100">
                {f.label}
              </div>
              <div className="mt-1.5 text-[14.5px] leading-[1.55] text-stone-600 dark:text-stone-400">
                {f.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline gap-2 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
          <span className="text-rose-400">❋</span>
          <span>What&apos;s not done yet</span>
        </div>
        <div className="mt-5 space-y-5">
          {TODO.map((t) => (
            <div key={t.label}>
              <div className="font-serif text-[18px] text-stone-900 dark:text-stone-100">
                {t.label}
              </div>
              <div className="mt-1 text-[14.5px] leading-[1.55] text-stone-600 dark:text-stone-400">
                {t.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-14 text-[12px] text-stone-500 dark:text-stone-400">
        Local-only. No telemetry. macOS 13+. Apple Silicon and Intel.
      </p>
    </Container>
  );
}
