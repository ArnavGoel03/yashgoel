import Link from "next/link";
import { getAllReviewsIncludingHidden } from "@/lib/content";
import { KIND_LABEL, KINDS } from "@/lib/types";
import type { Kind, ReviewSummary } from "@/lib/types";

const SECTIONS: { kind: Kind; label: string }[] = KINDS.map((kind) => ({
  kind,
  label: KIND_LABEL[kind],
}));

function verdictDisplay(review: ReviewSummary): string {
  switch (review.verdict) {
    case "recommend":
      return "would recommend";
    case "okay":
      return "okayish";
    case "bad":
      return "bad";
    default:
      return "still testing";
  }
}

function Row({ kind, review }: { kind: Kind; review: ReviewSummary }) {
  const hidden = review.hidden === true;
  return (
    <div
      className={
        "group flex items-center justify-between gap-4 border-b border-stone-100 px-4 py-3 last:border-none hover:bg-stone-50 " +
        (hidden ? "opacity-55" : "")
      }
    >
      <Link
        href={`/admin/edit/${kind}/${review.slug}`}
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-2 truncate text-sm font-medium text-stone-900">
          {review.name}
          {hidden && (
            <span className="rounded-sm bg-stone-200 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-stone-600">
              Hidden
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-stone-500">
          {review.brand} · {review.category} · {verdictDisplay(review)}
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-3 text-xs">
        {!hidden && (
          <Link
            href={`/${kind}/${review.slug}`}
            target="_blank"
            className="text-stone-400 transition-colors hover:text-stone-900"
          >
            View ↗
          </Link>
        )}
        <Link
          href={`/admin/edit/${kind}/${review.slug}`}
          className="text-stone-400 transition-colors hover:text-stone-900"
        >
          Edit →
        </Link>
      </div>
    </div>
  );
}

function Group({ kind, label }: { kind: Kind; label: string }) {
  const items = getAllReviewsIncludingHidden(kind);
  const visibleCount = items.filter((r) => !r.hidden).length;
  const hiddenCount = items.length - visibleCount;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-serif text-xl text-stone-900">{label}</h3>
        <span className="text-xs text-stone-500">
          {visibleCount} live
          {hiddenCount > 0 && (
            <span className="text-stone-400"> · {hiddenCount} hidden</span>
          )}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
          None yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {items.map((r) => (
            <Row key={r.slug} kind={kind} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EditList() {
  return (
    <div className="space-y-8">
      {SECTIONS.map((s) => (
        <Group key={s.kind} kind={s.kind} label={s.label} />
      ))}
    </div>
  );
}
