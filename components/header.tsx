"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronDown, Menu, Search, X } from "lucide-react";
import { Container } from "./container";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";
import { site } from "@/lib/site";

type NavGroup = "tools" | "personal" | "meta";

type NavItem = {
  href: string;
  label: string;
  tourId?: string;
  /**
   * Nav weight controls the surface a link lives on:
   *   "primary"  , visible inline at lg+ (six product categories +
   *                 Routine, always present in the masthead).
   *   "secondary", hidden behind a single "More ▾" button on lg+ so
   *                 the masthead never overflows. Mobile drawer
   *                 (below lg) shows everything regardless.
   *
   * Secondary items also carry a `group` so the More dropdown reads
   * as three labeled clusters (Tools / Personal / Meta) instead of a
   * flat list of 14 things.
   */
  weight: "primary" | "secondary";
  group?: NavGroup;
};

const GROUP_LABEL: Record<NavGroup, string> = {
  tools: "Tools",
  personal: "Personal",
  meta: "Meta",
};

const nav: NavItem[] = [
  { href: "/skincare", label: "Skincare", tourId: "tab-skincare", weight: "primary" },
  { href: "/supplements", label: "Supplements", tourId: "tab-supplements", weight: "primary" },
  { href: "/oral-care", label: "Oral care", tourId: "tab-oralcare", weight: "primary" },
  { href: "/hair-care", label: "Hair care", tourId: "tab-haircare", weight: "primary" },
  { href: "/body-care", label: "Body care", tourId: "tab-bodycare", weight: "primary" },
  { href: "/essentials", label: "Essentials", tourId: "tab-essentials", weight: "primary" },
  { href: "/routine", label: "Routine", weight: "primary" },

  // Tools, interactive, builders, references. The three builders
  // (routine, stack, simulator) share /build as a tabbed workshop.
  { href: "/today", label: "Today", weight: "secondary", group: "tools" },
  { href: "/build", label: "Build", weight: "secondary", group: "tools" },
  { href: "/glossary", label: "Glossary", weight: "secondary", group: "tools" },
  { href: "/primers", label: "Primers", weight: "secondary", group: "tools" },
  { href: "/miscellaneous", label: "Miscellaneous", weight: "secondary", group: "tools" },

  // Personal, voice and life surfaces.
  { href: "/library", label: "Library", weight: "secondary", group: "personal" },
  { href: "/photos", label: "Photos", weight: "secondary", group: "personal" },
  { href: "/now", label: "Now", weight: "secondary", group: "personal" },
  { href: "/shelf", label: "Shelf", weight: "secondary", group: "personal" },

  // Meta, about the site itself.
  { href: "/best-of/2026", label: "Best of 2026", weight: "secondary", group: "meta" },
  { href: "/about", label: "About", weight: "secondary", group: "meta" },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    function onClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const primaryItems = nav.filter((n) => n.weight === "primary");
  const secondaryItems = nav.filter((n) => n.weight === "secondary");
  const secondaryActive = secondaryItems.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href)),
  );

  // Group secondary items, preserving order within each group.
  const groupOrder: NavGroup[] = ["tools", "personal", "meta"];
  const grouped = groupOrder
    .map((g) => ({
      group: g,
      items: secondaryItems.filter((s) => s.group === g),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/80 backdrop-blur dark:border-stone-900/40 dark:bg-stone-950/80">
      <Container className="flex h-16 items-center justify-between gap-6">
        <div className="flex items-baseline gap-3">
          {/* Logo: editorial monogram. The Y is the brand mark, set
              large + bold-italic so it carries the masthead by itself.
              `ash` trails behind in a quieter weight + lower opacity,
              like an editorial subhead under the masthead initial.
              The rose ❋ keeps its house-style position to the right. */}
          <Link
            href="/"
            aria-label={site.shortName}
            className="group inline-flex items-baseline gap-1 text-stone-900 dark:text-stone-100"
          >
            <span className="font-serif text-[1.75rem] font-medium italic leading-none tracking-tight sm:text-3xl">
              Y
            </span>
            <span className="-ml-0.5 font-serif text-sm italic leading-none text-stone-400 dark:text-stone-500">
              ash
            </span>
            <span
              aria-hidden
              className="ml-1.5 text-rose-400 transition-transform duration-300 group-hover:rotate-90"
            >
              ❋
            </span>
          </Link>
          {/* The time-of-day greeting used to live here, but the
              category nav already eats the masthead at lg+ and the same
              info is rendered prominently in the homepage hero eyebrow.
              Keeping the masthead to logo + nav reads cleaner at every
              width and stops the greeting from wrapping behind the Y. */}
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <nav className="hidden items-center text-[11px] uppercase tracking-[0.16em] text-stone-500 lg:flex dark:text-stone-400">
            {primaryItems.map((item, i) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <span key={item.href} className="inline-flex items-center">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="mx-3 text-stone-300 dark:text-stone-700"
                    >
                      ·
                    </span>
                  )}
                  <NavLink
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    data-tour={item.tourId}
                    className={
                      "relative whitespace-nowrap py-1 transition-colors " +
                      (active
                        ? "text-stone-900 dark:text-stone-100 after:absolute after:-bottom-px after:left-0 after:right-0 after:h-px after:bg-rose-400"
                        : "hover:text-stone-900 dark:hover:text-stone-100")
                    }
                  >
                    {item.label}
                  </NavLink>
                </span>
              );
            })}
            <span
              aria-hidden
              className="mx-3 text-stone-300 dark:text-stone-700"
            >
              ·
            </span>
            <div ref={moreRef} className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                className={
                  "inline-flex items-center gap-1 whitespace-nowrap py-1 transition-colors " +
                  (secondaryActive || moreOpen
                    ? "text-stone-900 dark:text-stone-100"
                    : "hover:text-stone-900 dark:hover:text-stone-100")
                }
              >
                More
                <ChevronDown
                  className={
                    "h-3 w-3 transition-transform " +
                    (moreOpen ? "rotate-180" : "")
                  }
                />
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 grid origin-top-right grid-cols-1 gap-x-6 gap-y-2 rounded-xl border border-stone-200 bg-white p-3 shadow-lg sm:grid-cols-3 dark:border-stone-800 dark:bg-stone-950"
                  style={{ minWidth: 480 }}
                >
                  {grouped.map(({ group, items }) => (
                    <section key={group} className="min-w-[140px]">
                      <p className="mb-1 px-2 pt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
                        {GROUP_LABEL[group]}
                      </p>
                      <ul className="space-y-0">
                        {items.map((item) => {
                          const active =
                            pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href));
                          return (
                            <li key={item.href}>
                              <NavLink
                                href={item.href}
                                role="menuitem"
                                aria-current={active ? "page" : undefined}
                                className={
                                  "block rounded-md px-2 py-1.5 text-[11px] uppercase tracking-[0.16em] transition-colors " +
                                  (active
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-100")
                                }
                              >
                                {item.label}
                              </NavLink>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <button
            type="button"
            aria-label="Open search"
            data-tour="search"
            onClick={() => {
              window.dispatchEvent(new Event("palette:open"));
            }}
            className="group hidden h-8 shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-white pl-3 pr-1.5 text-[11px] uppercase tracking-[0.16em] text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-900 sm:inline-flex dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-100"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[10px] tracking-normal text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            aria-label="Open search"
            onClick={() => {
              window.dispatchEvent(new Event("palette:open"));
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 sm:hidden dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            <Search className="h-4 w-4" />
          </button>
          {/* Saved shelf, direct link so the reader can find their
              bookmarks without digging into the More menu. Hidden on
              phones (mobile drawer already lists /shelf under Personal)
              so the masthead stays uncluttered there. */}
          <Link
            href="/shelf"
            aria-label="Saved shelf"
            title="Saved shelf"
            className={
              "hidden h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors sm:flex " +
              (pathname === "/shelf"
                ? "text-rose-500 dark:text-rose-400"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100")
            }
          >
            <Bookmark className="h-4 w-4" />
          </Link>
          <div data-tour="theme">
            <ThemeToggle />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 lg:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <div
          className="fixed inset-x-0 top-16 z-40 origin-top animate-[menu-slide_180ms_cubic-bezier(0.22,1,0.36,1)] border-b border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-950 lg:hidden"
          style={{ maxHeight: "calc(100dvh - 4rem)", overflowY: "auto" }}
        >
          <Container>
            <nav aria-label="Site navigation" className="py-4">
              <ol className="divide-y divide-stone-100 dark:divide-stone-800">
                {primaryItems.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <NavLink
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className="flex items-baseline justify-between gap-4 py-4"
                      >
                        <span
                          className={
                            "font-serif text-xl " +
                            (active
                              ? "text-rose-700 dark:text-rose-400"
                              : "text-stone-900 dark:text-stone-100")
                          }
                        >
                          {item.label}
                        </span>
                        <span
                          aria-hidden
                          className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500"
                        >
                          {item.href}
                        </span>
                      </NavLink>
                    </li>
                  );
                })}
              </ol>
              {grouped.map(({ group, items }) => (
                <section key={group} className="mt-6">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500">
                    {GROUP_LABEL[group]}
                  </p>
                  <ol className="divide-y divide-stone-100 dark:divide-stone-800">
                    {items.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));
                      return (
                        <li key={item.href}>
                          <NavLink
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className="flex items-baseline justify-between gap-4 py-3"
                          >
                            <span
                              className={
                                "font-serif text-base " +
                                (active
                                  ? "text-rose-700 dark:text-rose-400"
                                  : "text-stone-700 dark:text-stone-200")
                              }
                            >
                              {item.label}
                            </span>
                            <span
                              aria-hidden
                              className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500"
                            >
                              {item.href}
                            </span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}
