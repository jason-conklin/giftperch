import Image from "next/image";
import Link from "next/link";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";

const steps = [
  {
    title: "Capture recipient profiles",
    description:
      "Build a reusable Gift CRM with interests, budgets, occasions, and preferences.",
  },
  {
    title: "Ask PerchPal",
    description:
      "Give PerchPal a vibe, budget, or occasion and get curated suggestions with rationale.",
  },
  {
    title: "Track every gift",
    description:
      "Log past gifts, wishlists, and affiliate-ready ideas so you never scramble last minute.",
  },
];

const sampleIdeas = [
  "Handmade ceramic mug set",
  "Outdoor adventure gift card",
  "Organic tea & book pairing",
];

export default function MarketingHome() {
  return (
    <div className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-gp-gold/60 bg-gp-gold/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gp-evergreen">
            <span>Introducing PerchPal,</span>
            <span>Your AI gifting assistant</span>
          </div>
          <div className="flex items-center gap-3">
            <Image
              src="/giftperch_logo_only.png"
              alt="GiftPerch"
              width={56}
              height={56}
              className="h-24 w-24"
              priority
            />
            <p className="text-lg font-semibold uppercase tracking-wide text-gp-evergreen/70">
              GiftPerch
            </p>
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-gp-evergreen">
            Thoughtful gifting, reimagined with AI
          </h1>
          <p className="text-base text-gp-evergreen/80">
            Create living recipient profiles, maintain your wishlist identity,
            and lean on PerchPal—the AI gifting copilot that surfaces
            Amazon/affiliate-ready suggestions with genuine context.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/auth/signup"
              className="rounded-full bg-gp-gold px-6 py-3 text-center text-sm font-semibold text-gp-evergreen transition hover:bg-[#bda775]"
            >
              Get Started
            </Link>
            <Link
              href="/about"
              className="rounded-full bg-gp-evergreen px-6 py-3 text-center text-sm font-semibold text-gp-cream transition hover:bg-gp-evergreen/90"
            >
              See how it works
            </Link>
          </div>
        </div>
        <div className="gp-card p-6 sm:p-8">
          <div className="space-y-5">
            <div className="rounded-2xl border border-gp-evergreen/20 bg-gp-cream/60 p-5">
              <p className="text-xs uppercase tracking-wide text-gp-evergreen/70">
                Sample profile
              </p>
              <p className="mt-2 text-lg font-semibold text-gp-evergreen">
                Maya Thompson
              </p>
              <p className="text-sm text-gp-evergreen/80">
                Loves cozy rituals, hikes, indie bookstores. Prefers gifts
                under $150.
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-gp-gold/50 bg-gp-cream/40 p-5">
              <PerchPalLoader
                variant="inline"
                size="lg"
                message="PerchPal is fetching sample gift ideas..."
              />
            </div>
            <div className="rounded-2xl border border-gp-evergreen/15 bg-white p-5">
              <p className="text-sm uppercase tracking-wide text-gp-evergreen/70">
                Gift ideas
              </p>
              <ul className="mt-3 space-y-2">
                {sampleIdeas.map((idea) => (
                  <li
                    key={idea}
                    className="flex items-center gap-2 text-sm text-gp-evergreen"
                  >
                    <span className="inline-flex h-2 w-2 rounded-full bg-gp-gold" />
                    {idea}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/50">
            Product tour
          </p>
          <h2 className="text-2xl font-semibold text-gp-evergreen">
            How GiftPerch works
          </h2>
          <p className="text-base text-gp-evergreen/80">
            From profiles to personalized ideas
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="gp-card h-full space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-gp-evergreen/60">
                Step
              </p>
              <h3 className="text-lg font-semibold text-gp-evergreen">
                {step.title}
              </h3>
              <p className="text-sm text-gp-evergreen/80">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="gp-card border-dashed border-gp-gold/50 bg-gp-cream/70 text-center text-sm text-gp-evergreen/80">
        Coming soon: success stories and favorite gift combinations from real
        GiftPerch families, couples, and teams. Want updates?{" "}
        <Link
          href="/blog"
          className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Visit the GiftPerch Journal
        </Link>
        .
      </section>
    </div>
  );
}
