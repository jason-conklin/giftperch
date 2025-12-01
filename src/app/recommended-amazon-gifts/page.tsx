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
      "A soft, cozy fleece throw that adds warmth and style to any living room or bedroom. Great for movie nights, reading sessions, or gifting to someone who loves comfort and homey touches.",
    url: "https://amzn.to/4pA4ixk",
  },
  {
    name: "Temperature-Controlled, Self-Heating Coffee Mug",
    description:
      "Keeps coffee or tea at the perfect sip-ready temperature for hours. Ideal for remote workers, busy students, or anyone who gets distracted and hates cold coffee.",
    url: "https://amzn.to/3XvEFlh",
  },
  {
    name: "LED Desk Lamp for Home Office",
    description:
      "A slim, adjustable LED lamp that brightens your workspace without glare. Perfect for late-night work, studying, or creating a clean, modern desk setup.",
    url: "https://amzn.to/4pHmcOv",
  },
  {
    name: "Waterless Essential Oil Diffuser",
    description:
      "A compact, waterless diffuser that releases pure essential oils for a clean, consistent scent. Great for bedrooms, offices, or anyone who enjoys aromatherapy without the mess of water tanks.",
    url: "https://amzn.to/4pMS9Fr",
  },
  {
    name: "Lined Leather Journal Notebook and Pen Set",
    description:
      "A premium leather-bound journal paired with a smooth-writing pen. Ideal for writers, students, professionals, or anyone who enjoys planning, reflection, or daily journaling.",
    url: "https://amzn.to/4pbNJrD",
  },
  {
    name: "Aluminum Metal Adjustable Cell Phone Stand Desk",
    description:
      "A sturdy, adjustable aluminum phone stand that keeps your device upright for calls, videos, or multitasking. Great for desks, nightstands, or improving posture during long sessions.",
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
                rel="noopener noreferrer sponsored"
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
