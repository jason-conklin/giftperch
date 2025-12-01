import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GiftPerch — Recommended Amazon Gifts",
  description:
    "A small curated collection of thoughtful Amazon gift ideas from GiftPerch.",
};

const products = [
  {
    name: "Sage Green Fleece Throw Blanket",
    description:
      "A linen-bound journal paired with a smooth-writing pen. Ideal for reflective writers, new grads, or anyone starting a fresh chapter and needing a calm space to capture ideas and gratitude.",
    url: "https://amzn.to/4pA4ixk",
  },
  {
    name: "Temperature-Controlled, Self-Heating Coffee Mug",
    description:
      "A soft, breathable throw that layers well on a sofa or reading chair. Great for movie nights, chilly offices, or sending warmth to someone recovering or settling into a new home.",
    url: "https://amzn.to/3XvEFlh",
  },
  {
    name: "LED Desk Lamp for Home Office",
    description:
      "Keeps coffee or tea at a perfect sip temperature without overheating. A practical desk companion for remote workers, avid readers, or anyone who multitasks and forgets their mug.",
    url: "https://amzn.to/4pHmcOv",
  },
  {
    name: "Waterless Essential Oil Diffuser",
    description:
      "A beautifully illustrated puzzle with a wooden tray for building and displaying. Great for mindful breaks, creative friends, or family coffee tables where people gather and unwind together.",
    url: "https://amzn.to/4pMS9Fr",
  },
  {
    name: "Lined Leather Journal Notebook and Pen Set",
    description:
      "A shatter-resistant bottle with a built-in infuser for fruit or herbs. Perfect for walkers, commuters, or anyone building a healthier hydration habit with flavor variety.",
    url: "https://amzn.to/4pbNJrD",
  },
  {
    name: "Aluminum Metal Adjustable Cell Phone Stand Desk",
    description:
      "A compact, quiet diffuser that adds a gentle scent and calm light to small rooms. Suits dorms, apartments, or bedside tables for those who enjoy a relaxing evening wind-down.",
    url: "https://amzn.to/48qWpmJ",
  },
];

export default function RecommendedAmazonGiftsPage() {
  return (
    <div className="min-h-screen bg-gp-cream/80 text-gp-evergreen">
      <header className="border-b border-gp-evergreen/25 bg-gp-evergreen">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-0">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-gp-evergreen shadow-sm sm:gap-4 sm:px-5 sm:py-3"
          >
            <Image
              src="/giftperch_logo_background.png"
              alt="GiftPerch logo"
              width={64}
              height={64}
              className="h-12 w-12 rounded-full border border-gp-cream/30 object-cover sm:h-14 sm:w-14"
              priority
            />
            <div className="text-gp-evergreen">
              <p className="text-xl font-semibold leading-tight sm:text-2xl">
                GiftPerch
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gp-evergreen/70 sm:text-xs">
                Thoughtful gifting, reimagined
              </p>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex items-center gap-4 text-sm font-semibold text-gp-cream">
              <Link
                href="/about"
                className="rounded-full px-3 py-1 transition hover:underline hover:underline-offset-4"
              >
                About
              </Link>
              <Link
                href="/blog"
                className="rounded-full px-3 py-1 transition hover:underline hover:underline-offset-4"
              >
                Blog
              </Link>
            </nav>
            <Link
              href="/auth/login"
              className="rounded-full border border-gp-cream/40 bg-white/90 px-4 py-2 text-sm font-semibold text-gp-evergreen transition hover:bg-gp-cream"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-gp-gold px-4 py-2 text-sm font-semibold text-gp-evergreen transition hover:bg-gp-gold/90"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gp-evergreen/60">
          Recommended Amazon Gifts
        </p>
        <h1 className="text-2xl font-semibold text-gp-evergreen sm:text-3xl">
          Curated Amazon Gift Ideas
        </h1>
        <div className="space-y-2 text-sm text-gp-evergreen/80 sm:text-base">
          <p>
            A small, hand-picked set of Amazon products we like as examples of
            thoughtful, versatile gifts.
          </p>
          <p>
            GiftPerch may earn commission via Amazon affiliate links. This list
            is curated and not AI-generated.
          </p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <article
            key={product.name}
            className="gp-card flex flex-col gap-2 rounded-2xl p-4 sm:p-5"
          >
            <h2 className="text-lg font-semibold text-gp-evergreen">
              {product.name}
            </h2>
            <p className="text-sm text-gp-evergreen/80">{product.description}</p>
            <div className="mt-1">
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="gp-primary-button inline-flex items-center justify-center"
              >
                View on Amazon
              </a>
              <p className="mt-1 text-xs text-gp-evergreen/60">
                As an Amazon Associate, GiftPerch earns from qualifying
                purchases.
              </p>
            </div>
          </article>
        ))}
      </section>
      </main>
    </div>
  );
}
