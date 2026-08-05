"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createReview, updateReview, type ActionState } from "./actions";
import { ProductPhotoUpload } from "./product-photo-upload";
import { cn } from "@/lib/utils";
import { KINDS, KIND_LABEL } from "@/lib/types";
import {
  careRegionSummary,
  GARMENT_CARE_FAMILIES,
  GARMENT_CARE_LABEL,
  GARMENT_CONDITIONS,
  GARMENT_CONDITION_LABEL,
  GARMENT_FITS,
  GARMENT_FIT_LABEL,
  GARMENT_SEASONS,
  GARMENT_SEASON_LABEL,
} from "@/lib/garment-types";
import type { Kind } from "@/lib/types";
import type { Garment } from "@/lib/garment-types";

const today = () => new Date().toISOString().slice(0, 10);

function slugPreview(brand: string, name: string): string {
  return (
    (brand + " " + name)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "…"
  );
}

const labelCls = "block text-xs uppercase tracking-wider text-stone-500 mb-1.5";
const optionalCls = "ml-1 text-stone-400 normal-case tracking-normal";
const inputCls =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400";
const textareaCls = cn(inputCls, "resize-y font-mono");

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="border-b border-stone-200 pb-2">
        <h2 className="font-serif text-lg text-stone-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-stone-500">{description}</p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Optional() {
  return <span className={optionalCls}>(optional)</span>;
}

export type ProductFormInitial = {
  slug: string;
  kind: Kind;
  name: string;
  brand: string;
  category: string;
  verdict?: "recommend" | "okay" | "bad";
  ratings?: { effect?: number; value?: number; tolerance?: number };
  hidden?: boolean;
  retired?: boolean;
  retiredReason?: string;
  price?: string | { in?: string; us?: string; uk?: string };
  servingsPerContainer?: number;
  dailyServings?: number;
  skinType?: string[];
  goal?: string[];
  routines?: ("morning" | "evening" | "stack" | "shower" | "oral")[];
  photo?: string;
  boughtFromUrl?: string;
  indiaLinks?: { retailer: string; url: string }[];
  westernLinks?: { retailer: string; url: string }[];
  ukLinks?: { retailer: string; url: string }[];
  ingredients?: string[];
  garment?: Garment;
  pros: string[];
  cons: string[];
  repurchase?: boolean;
  datePublished: string;
  summary: string;
  body: string;
};

export function ProductForm({ initial }: { initial?: ProductFormInitial }) {
  const isEdit = !!initial;
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    isEdit ? updateReview : createReview,
    null,
  );
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "skincare");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [name, setName] = useState(initial?.name ?? "");

  const slug = useMemo(
    () => initial?.slug ?? slugPreview(brand, name),
    [initial?.slug, brand, name],
  );

  return (
    <form action={action} className="space-y-12">
      <input type="hidden" name="kind" value={kind} />
      {isEdit && <input type="hidden" name="slug" value={initial!.slug} />}

      <Section
        title="Basics"
        description="Only brand, name, and category are required. Everything else can wait."
      >
        <div>
          <span className={labelCls}>Kind</span>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => !isEdit && setKind(k)}
                disabled={isEdit}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  kind === k
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300",
                  isEdit && "cursor-not-allowed opacity-60",
                )}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          {isEdit && (
            <p className="mt-2 text-xs text-stone-500">
              Kind is locked when editing.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="brand" className={labelCls}>Brand</label>
            <input
              id="brand"
              name="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Beauty of Joseon"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="name" className={labelCls}>Product name</label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Radiance Cleansing Balm"
              required
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={labelCls}>Category</label>
            <input
              id="category"
              name="category"
              defaultValue={initial?.category ?? ""}
              placeholder={
                kind === "skincare"
                  ? "cleanser"
                  : kind === "supplements"
                    ? "mineral"
                    : kind === "fashion"
                      ? "shirt"
                      : "electric toothbrush"
              }
              required
              className={inputCls}
            />
          </div>
          <div>
            <span className={labelCls}>
              Price <Optional />
            </span>
            <div className="grid grid-cols-3 gap-2">
              <input
                id="priceIn"
                name="priceIn"
                aria-label="Price in India"
                defaultValue={
                  typeof initial?.price === "string"
                    ? ""
                    : (initial?.price?.in ?? "")
                }
                placeholder="₹2,400"
                className={inputCls}
              />
              <input
                id="priceUs"
                name="priceUs"
                aria-label="Price in USA"
                defaultValue={
                  typeof initial?.price === "string"
                    ? initial.price
                    : (initial?.price?.us ?? "")
                }
                placeholder="$34"
                className={inputCls}
              />
              <input
                id="priceUk"
                name="priceUk"
                aria-label="Price in UK"
                defaultValue={
                  typeof initial?.price === "string"
                    ? ""
                    : (initial?.price?.uk ?? "")
                }
                placeholder="£28"
                className={inputCls}
              />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Per region with native currency. Leave blank where unsold.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="servingsPerContainer" className={labelCls}>
              Servings per container <Optional />
            </label>
            <input
              id="servingsPerContainer"
              name="servingsPerContainer"
              type="number"
              step="1"
              min="1"
              defaultValue={initial?.servingsPerContainer ?? ""}
              placeholder="e.g. 60"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-stone-500">
              Used to compute cost-per-day.
            </p>
          </div>
          <div>
            <label htmlFor="dailyServings" className={labelCls}>
              Daily servings <Optional />
            </label>
            <input
              id="dailyServings"
              name="dailyServings"
              type="number"
              step="0.5"
              min="0.5"
              defaultValue={initial?.dailyServings ?? ""}
              placeholder="1"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-stone-500">
              Defaults to 1 if left blank.
            </p>
          </div>
        </div>

        <div>
          <span className={labelCls}>
            Verdict <Optional />
          </span>
          <div className="flex flex-wrap gap-4 pt-2 text-sm text-stone-700">
            {(
              [
                { value: "", label: "Still testing" },
                { value: "recommend", label: "Would recommend" },
                { value: "okay", label: "Okayish" },
                { value: "bad", label: "Bad" },
              ] as const
            ).map((opt) => {
              const checked =
                opt.value === ""
                  ? initial?.verdict === undefined
                  : initial?.verdict === opt.value;
              return (
                <label key={opt.value} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="verdict"
                    value={opt.value}
                    defaultChecked={checked}
                    className="size-4"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            One-word shortcut. The 3 axes below carry the nuance.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="effectRating" className={labelCls}>
              Effect <Optional />
            </label>
            <input
              id="effectRating"
              name="effectRating"
              type="number"
              step="0.1"
              min="0"
              max="10"
              defaultValue={initial?.ratings?.effect ?? ""}
              placeholder="0-10"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-stone-500">Does it work?</p>
          </div>
          <div>
            <label htmlFor="valueRating" className={labelCls}>
              Value <Optional />
            </label>
            <input
              id="valueRating"
              name="valueRating"
              type="number"
              step="0.1"
              min="0"
              max="10"
              defaultValue={initial?.ratings?.value ?? ""}
              placeholder="0-10"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-stone-500">Worth the price?</p>
          </div>
          <div>
            <label htmlFor="toleranceRating" className={labelCls}>
              Tolerance <Optional />
            </label>
            <input
              id="toleranceRating"
              name="toleranceRating"
              type="number"
              step="0.1"
              min="0"
              max="10"
              defaultValue={initial?.ratings?.tolerance ?? ""}
              placeholder="0-10"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-stone-500">Easy to live with?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="datePublished" className={labelCls}>
              Date published
            </label>
            <input
              id="datePublished"
              name="datePublished"
              type="date"
              defaultValue={initial?.datePublished ?? today()}
              required
              className={inputCls}
            />
          </div>
          <div>
            <span className={labelCls}>Repurchase?</span>
            <div className="flex gap-4 pt-2 text-sm text-stone-700">
              {(
                [
                  { value: "undecided", label: "Not yet" },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ] as const
              ).map((opt) => {
                const checked =
                  opt.value === "undecided"
                    ? initial?.repurchase === undefined
                    : opt.value === "yes"
                      ? initial?.repurchase === true
                      : initial?.repurchase === false;
                return (
                  <label key={opt.value} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="repurchase"
                      value={opt.value}
                      defaultChecked={checked}
                      className="size-4"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          <input
            type="checkbox"
            name="hidden"
            value="true"
            defaultChecked={initial?.hidden ?? false}
            className="mt-0.5 size-4 rounded border-stone-300"
          />
          <span className="flex-1">
            <span className="font-medium">Hide from the catalogue.</span>{" "}
            <span className="text-stone-500">
              The product stays in the repo and at its direct URL, but won&apos;t
              appear on listing pages, the home &ldquo;just added&rdquo; row, or
              in sitemap/filters. Useful when you&apos;ve stopped using
              something or want to draft without publishing.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          <input
            type="checkbox"
            name="retired"
            value="true"
            defaultChecked={initial?.retired ?? false}
            className="mt-0.5 size-4 rounded border-stone-300"
          />
          <span className="flex-1 space-y-2">
            <span>
              <span className="font-medium">Retire this product.</span>{" "}
              <span className="text-stone-500">
                Moves it off the category listing into /retired, still indexed,
                still browsable, but signals you no longer keep it in rotation.
              </span>
            </span>
            <input
              type="text"
              name="retiredReason"
              defaultValue={initial?.retiredReason ?? ""}
              placeholder="Why you stopped (one sentence)"
              className={inputCls}
            />
          </span>
        </label>
      </Section>


      {kind === "fashion" && (
        <Section
          title="Garment"
          description="What a shirt has that a bottle doesn't. Drawn as diagrams on the page, so keep it as data, not prose."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="garmentFit" className={labelCls}>Fit</label>
              <select
                id="garmentFit"
                name="garmentFit"
                defaultValue={initial?.garment?.fit ?? "regular"}
                className={inputCls}
              >
                {GARMENT_FITS.map((f) => (
                  <option key={f} value={f}>
                    {GARMENT_FIT_LABEL[f]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="garmentCondition" className={labelCls}>
                Condition now
              </label>
              <select
                id="garmentCondition"
                name="garmentCondition"
                defaultValue={initial?.garment?.condition ?? "as-new"}
                className={inputCls}
              >
                {GARMENT_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {GARMENT_CONDITION_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="garmentSize" className={labelCls}>
                Size as labelled
              </label>
              <input
                id="garmentSize"
                name="garmentSize"
                defaultValue={initial?.garment?.size ?? ""}
                placeholder="M, 32x32, 40 EU"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="garmentSizeNote" className={labelCls}>
                How it ran <Optional />
              </label>
              <input
                id="garmentSizeNote"
                name="garmentSizeNote"
                defaultValue={initial?.garment?.sizeNote ?? ""}
                placeholder="Runs one size small in the shoulder"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="garmentFabric" className={labelCls}>
              Fabric
            </label>
            <input
              id="garmentFabric"
              name="garmentFabric"
              defaultValue={(initial?.garment?.fabric ?? [])
                .map((f) => `${f.material} ${f.percent}`)
                .join(", ")}
              placeholder="Cotton 98, Elastane 2"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-stone-500">
              Comma separated, copied off the label. Percentages must add
              up to 100.
            </p>
          </div>

          <div>
            <span className={labelCls}>Care symbols</span>
            <p className="pb-2 pt-1 text-xs text-stone-500">
              Grouped the way they sit on a label. Tick only what is
              actually printed; a US label uses dots where an Indian,
              British or EU one uses a number, but the instruction is
              the same, so pick by meaning.
            </p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {GARMENT_CARE_FAMILIES.map((family) => (
                <fieldset key={family.key}>
                  <legend className="pb-1 font-mono text-[10px] uppercase tracking-wider text-stone-500">
                    {family.label}
                  </legend>
                  <div className="grid grid-cols-1 gap-y-1.5 text-sm text-stone-700">
                    {family.codes.map((code) => (
                      <label key={code} className="flex items-start gap-1.5">
                        <input
                          type="checkbox"
                          name="garmentCare"
                          value={code}
                          defaultChecked={initial?.garment?.care?.includes(
                            code,
                          )}
                          className="mt-0.5 size-4 flex-none"
                        />
                        <span>
                          {GARMENT_CARE_LABEL[code]}
                          {careRegionSummary(code) && (
                            <span className="block font-mono text-[10px] uppercase tracking-wider text-stone-400">
                              {careRegionSummary(code)}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <div>
            <span className={labelCls}>Wearable window</span>
            <div className="flex flex-wrap gap-4 pt-1 text-sm text-stone-700">
              {GARMENT_SEASONS.map((season) => (
                <label key={season} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="garmentSeason"
                    value={season}
                    defaultChecked={initial?.garment?.season?.includes(season)}
                    className="size-4"
                  />
                  {GARMENT_SEASON_LABEL[season]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="garmentFirstWorn" className={labelCls}>
                First worn
              </label>
              <input
                id="garmentFirstWorn"
                name="garmentFirstWorn"
                defaultValue={initial?.garment?.firstWorn ?? ""}
                placeholder="2026-01 or 2026-01-14"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-stone-500">
                Anchors months owned and cost per wear.
              </p>
            </div>
            <div>
              <label htmlFor="garmentWearsPerMonth" className={labelCls}>
                Wears per month <Optional />
              </label>
              <input
                id="garmentWearsPerMonth"
                name="garmentWearsPerMonth"
                type="number"
                step="0.5"
                min="0.5"
                max="31"
                defaultValue={initial?.garment?.wearsPerMonth ?? ""}
                placeholder="8"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-stone-500">
                Honest estimate. Cost per wear stays hidden without it.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="garmentAging" className={labelCls}>
              How it has aged <Optional />
            </label>
            <textarea
              id="garmentAging"
              name="garmentAging"
              rows={4}
              defaultValue={(initial?.garment?.aging ?? [])
                .map((a) => `${a.date} | ${a.note}`)
                .join("\n")}
              placeholder={"2026-03 | First honeycombs behind the knee\n2026-06 | Collar still holding shape"}
              className={textareaCls}
            />
            <p className="mt-1 text-xs text-stone-500">
              One dated observation per line: date, pipe, note.
            </p>
          </div>
        </Section>
      )}

      <Section
        title="Photo"
        description="Drop an image here. Stored at original quality."
      >
        <ProductPhotoUpload initialUrl={initial?.photo} fieldName="photo" />
      </Section>

      <Section
        title="Tags"
        description="Helps with filtering. All optional."
      >
        {kind === "skincare" ? (
          <div>
            <label htmlFor="skinType" className={labelCls}>
              Skin type <Optional />
            </label>
            <input
              id="skinType"
              name="skinType"
              defaultValue={initial?.skinType?.join(", ") ?? ""}
              placeholder="dry, sensitive, normal"
              className={inputCls}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="goal" className={labelCls}>
              {kind === "supplements" ? "Goal" : "Best for"} <Optional />
            </label>
            <input
              id="goal"
              name="goal"
              defaultValue={initial?.goal?.join(", ") ?? ""}
              placeholder={
                kind === "supplements"
                  ? "sleep, recovery, stress"
                  : "plaque, gum health, whitening"
              }
              className={inputCls}
            />
          </div>
        )}

        <div>
          <span className={labelCls}>
            Routines <Optional />
          </span>
          <div className="flex flex-wrap gap-4 pt-2 text-sm text-stone-700">
            {(["morning", "evening", "stack", "shower", "oral"] as const).map((r) => (
              <label key={r} className="flex items-center gap-1.5 capitalize">
                <input
                  type="checkbox"
                  name="routines"
                  value={r}
                  defaultChecked={initial?.routines?.includes(r) ?? false}
                  className="size-4"
                />
                {r}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Tag the product into any routine pages it&apos;s part of.
          </p>
        </div>

        <div>
          <label htmlFor="ingredients" className={labelCls}>
            Ingredients <Optional />
          </label>
          <input
            id="ingredients"
            name="ingredients"
            defaultValue={initial?.ingredients?.join(", ") ?? ""}
            placeholder="Rice Bran Oil, Ginseng Extract, Shea Butter"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-stone-500">Comma-separated.</p>
        </div>
      </Section>

      <Section
        title="Purchase links"
        description="Bought-from URL is shown as the prominent button. India and West sections each accept multiple URLs (one per line), readers see them all."
      >
        <div>
          <label htmlFor="boughtFromUrl" className={labelCls}>
            Bought from <Optional />
          </label>
          <input
            id="boughtFromUrl"
            name="boughtFromUrl"
            type="url"
            defaultValue={initial?.boughtFromUrl ?? ""}
            placeholder="https://… (where you actually bought it)"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="indiaLinks" className={labelCls}>
            India retailers <Optional />
          </label>
          <textarea
            id="indiaLinks"
            name="indiaLinks"
            rows={3}
            defaultValue={
              initial?.indiaLinks
                ?.map((l) => `${l.retailer} | ${l.url}`)
                .join("\n") ?? ""
            }
            placeholder={
              "https://www.amazon.in/dp/...\nhttps://www.nykaa.com/...\nhttps://www.myntra.com/..."
            }
            className={textareaCls}
          />
          <p className="mt-1 text-xs text-stone-500">
            One URL per line. Retailer name is auto-detected from the domain;
            override with <code>Retailer | URL</code>. Paste raw Amazon URLs
            from the address bar, they get auto-stripped to the clean{" "}
            <code>/dp/&lt;ASIN&gt;</code> form, and the affiliate tag is
            applied at render time. No SiteStripe round-trip needed.
          </p>
        </div>
        <div>
          <label htmlFor="westernLinks" className={labelCls}>
            USA retailers <Optional />
          </label>
          <textarea
            id="westernLinks"
            name="westernLinks"
            rows={3}
            defaultValue={
              initial?.westernLinks
                ?.map((l) => `${l.retailer} | ${l.url}`)
                .join("\n") ?? ""
            }
            placeholder={
              "https://www.amazon.com/dp/...\nhttps://www.target.com/p/...\nhttps://www.sephora.com/..."
            }
            className={textareaCls}
          />
          <p className="mt-1 text-xs text-stone-500">
            Same format as India.
          </p>
        </div>
        <div>
          <label htmlFor="ukLinks" className={labelCls}>
            UK retailers <Optional />
          </label>
          <textarea
            id="ukLinks"
            name="ukLinks"
            rows={3}
            defaultValue={
              initial?.ukLinks
                ?.map((l) => `${l.retailer} | ${l.url}`)
                .join("\n") ?? ""
            }
            placeholder={
              "https://www.amazon.co.uk/dp/...\nhttps://www.boots.com/...\nhttps://www.lookfantastic.com/..."
            }
            className={textareaCls}
          />
          <p className="mt-1 text-xs text-stone-500">
            Same format as India.
          </p>
        </div>
      </Section>

      <Section
        title="Review"
        description="Add as much or as little as you want. The summary shows on the card; the body is the full prose."
      >
        <div>
          <label htmlFor="summary" className={labelCls}>
            Summary <Optional />
          </label>
          <input
            id="summary"
            name="summary"
            defaultValue={initial?.summary ?? ""}
            placeholder="The first cleanse I've actually stuck with."
            className={inputCls}
          />
          <p className="mt-1 text-xs text-stone-500">
            Shown on the listing card. One sentence.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="pros" className={labelCls}>
              Pros <Optional />
            </label>
            <textarea
              id="pros"
              name="pros"
              rows={4}
              defaultValue={initial?.pros?.join("\n") ?? ""}
              placeholder={"Melts sunscreen off\nRinses clean"}
              className={textareaCls}
            />
            <p className="mt-1 text-xs text-stone-500">One per line.</p>
          </div>
          <div>
            <label htmlFor="cons" className={labelCls}>
              Cons <Optional />
            </label>
            <textarea
              id="cons"
              name="cons"
              rows={4}
              defaultValue={initial?.cons?.join("\n") ?? ""}
              placeholder={"Jar packaging\nGoes fast"}
              className={textareaCls}
            />
            <p className="mt-1 text-xs text-stone-500">One per line.</p>
          </div>
        </div>

        <div>
          <label htmlFor="body" className={labelCls}>
            Body (markdown) <Optional />
          </label>
          <textarea
            id="body"
            name="body"
            rows={12}
            defaultValue={initial?.body ?? ""}
            placeholder={"## Why I bought it\n\n…\n\n## How I use it\n\n…"}
            className={textareaCls}
          />
        </div>
      </Section>

      <div className="sticky bottom-4 z-10">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 font-mono text-xs text-stone-600">
            {isEdit ? "Editing" : "Saves to"}{" "}
            <span className="text-stone-900">
              content/{kind}/{slug}.mdx
            </span>
          </div>

          {state?.ok === false && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {state.error}
            </div>
          )}

          {state?.ok && (
            <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
              {state.message}{" "}
              {state.kind && state.slug && (
                <Link
                  href={`/${state.kind}/${state.slug}`}
                  className="font-medium underline underline-offset-2"
                >
                  View →
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-6 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50 sm:w-auto"
          >
            {pending
              ? "Committing…"
              : isEdit
                ? "Update review"
                : "Save review"}
          </button>
        </div>
      </div>
    </form>
  );
}
