import type { Metadata } from "next";
import { Container } from "@/components/container";
import { signIn } from "@/auth";
import { safeInternalHref } from "@/lib/safe-url";

export const metadata: Metadata = {
  title: "Admin · Sign in",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ from?: string; error?: string }>;
};

/** Auth.js sends users back here with ?error=AccessDenied when their
 *  email isn't in the allow-list, and ?error=Configuration for missing
 *  env vars. Map both to friendlier copy. */
const errorCopy: Record<string, string> = {
  AccessDenied:
    "This Google account is not on the admin allow-list. Ask the site owner to add your email, then try again.",
  Configuration:
    "Google OAuth is not configured on this deployment. Set AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET, and ALLOWED_ADMIN_EMAIL in environment variables.",
  Verification: "That sign-in link has expired or already been used.",
  default: "Something went wrong signing in. Try again.",
};

export default async function LoginPage({ searchParams }: Props) {
  const { from, error } = await searchParams;

  const hasGoogleEnv =
    !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
  const hasAllowList = !!process.env.ALLOWED_ADMIN_EMAIL;

  async function googleSignIn() {
    "use server";
    // safeInternalHref rejects absolute/protocol-relative/backslash
    // (`//evil`, `https://evil`, `/\evil`) targets, only same-origin
    // relative paths pass, defaulting to /admin.
    const target = safeInternalHref(from) ?? "/admin";
    await signIn("google", { redirectTo: target });
  }

  return (
    <Container className="max-w-sm py-20">
      <div className="mb-10 flex items-baseline gap-2 text-[11px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
        <span className="text-rose-400">❋</span>
        <span>Admin</span>
      </div>

      <h1 className="mb-2 font-serif text-4xl leading-tight text-stone-900 sm:text-5xl dark:text-stone-100">
        Sign in<span className="text-rose-400">.</span>
      </h1>
      <p className="mb-8 font-serif text-lg italic text-stone-500 dark:text-stone-400">
        Private. The dashboard that commits to GitHub.
      </p>

      {!hasGoogleEnv || !hasAllowList ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="font-medium">Google OAuth isn&apos;t wired up.</p>
          <p className="mt-1 text-amber-800 dark:text-amber-300">
            Missing{" "}
            <code className="font-mono text-xs">
              {!hasGoogleEnv ? "AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET" : ""}
              {!hasGoogleEnv && !hasAllowList ? " and " : ""}
              {!hasAllowList ? "ALLOWED_ADMIN_EMAIL" : ""}
            </code>
            . Configure in Vercel env vars, then redeploy.
          </p>
        </div>
      ) : (
        <form action={googleSignIn} className="space-y-4">
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-stone-200 bg-white px-6 text-sm font-medium text-stone-900 transition-colors hover:border-stone-900 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-400 dark:border-stone-800"
          >
            <GoogleMark />
            Continue with Google
          </button>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              {errorCopy[error] ?? errorCopy.default}
            </p>
          )}

          <p className="text-xs italic text-stone-500 dark:text-stone-400">
            Only the email on the admin allow-list can sign in. Everyone else
            gets bounced.
          </p>
        </form>
      )}
    </Container>
  );
}

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.63-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.72v2.26h2.9c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.46-.8 5.95-2.18l-2.9-2.26c-.8.54-1.83.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l2.99-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
