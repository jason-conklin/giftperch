import Link from "next/link";

const featureGroups = [
  {
    title: "Recipient Profiles - Your Gift CRM",
    description:
      "Capture interests, vibes, budgets, and special memories in one reusable profile so you never guess.",
    bullets: [
      "Interests, hobbies, favorite rituals",
      "Budget preferences and constraints",
      "Past gifts to avoid repeats",
      "Occasion reminders and notes",
    ],
  },
  {
    title: "PerchPal - AI gifting copilot",
    description:
      "PerchPal reads each profile, understands the occasion, and suggests thoughtful ideas with rationale.",
    bullets: [
      "Auto-fill profiles from a quick description",
      "Budget-aware suggestions grounded in taste",
      "Why-this-gift blurbs you can reuse in cards",
      "Seamless handoff to your wishlist or shopping list",
    ],
  },
  {
    title: "Two-sided experience",
    description:
      "GiftPerch works for the people you shop for--and for the people who want to shop for you.",
    bullets: [
      "Create recipient profiles for friends and family",
      "Share your own wishlist identity for others to browse",
      "Great for families, couples, friend groups, and teams",
      "Future: collaborative gift planning and group gifting",
    ],
  },
  {
    title: "Affiliate-aware gift suggestions",
    description:
      "GiftPerch taps Amazon Associates (and future partners) responsibly, giving you more curated options.",
    bullets: [
      "Product links that prioritize fit, not ads",
      "Transparent affiliate support keeps GiftPerch sustainable",
      "Future support for niche shops and creator catalogs",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <section className="space-y-10">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
          Features
        </p>
        <h1 className="text-4xl font-semibold text-gp-evergreen">
          Why GiftPerch?
        </h1>
        <p className="text-base text-gp-evergreen/80">
          More than a wishlist. GiftPerch is your AI-powered Gift CRM that blends
          recipient profiles, wishlists, and the PerchPal assistant so you can
          give with confidence every time.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {featureGroups.map((feature) => (
          <article
            key={feature.title}
            className="rounded-3xl border border-gp-evergreen/15 bg-white/90 p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-gp-evergreen">
              {feature.title}
            </h2>
            <p className="mt-2 text-sm text-gp-evergreen/80">
              {feature.description}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gp-evergreen">
              {feature.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="inline-block h-2 w-2 translate-y-1 rounded-full bg-gp-gold" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="rounded-3xl border border-dashed border-gp-gold/50 bg-gp-cream/80 p-6 text-center text-base text-gp-evergreen/80">
        Built to be private, organized, and stress-free--no more last-minute panic
        shopping. Save the thoughtful details once, and reuse them for years.
      </div>

      <div className="rounded-3xl border border-gp-evergreen/15 bg-white/90 p-6 text-center">
        <h2 className="text-2xl font-semibold text-gp-evergreen">
          Ready to simplify gifting?
        </h2>
        <p className="mt-2 text-sm text-gp-evergreen/80">
          Create an account to start building recipient profiles, or explore the
          GiftPerch Journal for thoughtful gifting frameworks and AI ideas.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signup"
            className="rounded-full bg-gp-gold px-6 py-3 text-sm font-semibold text-gp-evergreen transition hover:bg-[#bda775]"
          >
            Create your account
          </Link>
          <Link
            href="/blog"
            className="rounded-full border border-gp-evergreen px-6 py-3 text-sm font-semibold text-gp-evergreen transition hover:bg-gp-evergreen hover:text-gp-cream"
          >
            Read the blog
          </Link>
        </div>
      </div>
    </section>
  );
}
