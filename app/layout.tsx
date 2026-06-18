import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono, Instrument_Serif, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ToastHost } from "@/components/toast-host";
import { WebsiteJsonLd } from "@/components/json-ld";
import { themeInitScript } from "@/lib/theme-script";
import { CompareProvider } from "@/components/compare-bar";
import { CommandPaletteMount } from "@/components/command-palette-mount";
import { SiteTourMount } from "@/components/site-tour-mount";
import { RouteWarmer } from "@/components/route-warmer";
import { SwRegister } from "@/components/sw-register";
// AudioCues mount + CursorHalo mount were removed — both were ambient
// decoration without UX value (cursor halo ran a continuous RAF loop
// on every page; audio cues fought the editorial calm). If they come
// back, gate them behind a user-toggleable setting, not a global mount.
import { LongPageChrome } from "@/components/long-page-chrome";
import { HapticClickEffect } from "@/components/haptic-click-effect";
import { site } from "@/lib/site";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: true,
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  preload: true,
});
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  creator: site.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: site.shortName,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} · ${site.tagline}`,
    description: site.description,
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
  },
  robots: { index: true, follow: true },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: site.name }],
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  // Site defaults to dark regardless of OS preference, so the theme
  // color on every platform should match the dark body. Users who
  // manually toggle to light accept a small chrome-tint mismatch.
  themeColor: "#1c1917",
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The inline theme-init script is authorized in CSP via a SHA-256
  // hash (see lib/theme-script.ts + proxy.ts), not a per-request nonce.
  // Keeping `headers()` out of the root layout is what lets /_not-found
  // (and the rest of the shell) prerender under Next 16 cacheComponents.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} ${fraunces.variable} antialiased`}
    >
      <head>
        {/* Preconnect to the Cloudflare R2 origin that hosts every
            product photo. The handshake (DNS + TCP + TLS) costs
            100-300 ms and blocks the first image fetch otherwise, so
            preconnecting kicks it off in parallel with the HTML
            response and the LCP image lands sooner on every page.
            crossOrigin is required for the connection to be reusable
            for fetches. */}
        <link
          rel="preconnect"
          href="https://pub-81726e3b98da43bb906dabff81db14a2.r2.dev"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://pub-81726e3b98da43bb906dabff81db14a2.r2.dev"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans text-stone-900 dark:text-stone-100">
        <WebsiteJsonLd />
        <CompareProvider>
          {/* Header + RouteWarmer + main use client hooks like
              usePathname / useSearchParams; under Next 16
              cacheComponents these must be inside a Suspense
              boundary so the static shell can prerender. */}
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <Suspense fallback={null}>
            <RouteWarmer />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
          <CommandPaletteMount />
          {/* ReadingProgress + BackToTop only mount on long-form
              routes (primers / reviews / photos). Short pages like
              the homepage or category indexes don't pay the listener
              cost. */}
          <Suspense fallback={null}>
            <LongPageChrome />
          </Suspense>
          <ToastHost />
          {/* Suspense wrap is required because SiteTourMount calls
              useSearchParams(); without it, static prerender of /404
              bails and the whole build fails. */}
          <Suspense fallback={null}>
            <SiteTourMount />
          </Suspense>
        </CompareProvider>
        {/* Haptic click feedback via navigator.vibrate on touch. */}
        <HapticClickEffect />
        <SwRegister />
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics gaId="G-DK22JR55RB" />
      </body>
    </html>
  );
}
