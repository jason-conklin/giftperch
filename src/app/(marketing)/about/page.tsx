import Image from "next/image";

const features = [
  {
    title: "Recipient profiles",
    description:
      "Log interests, budgets, occasions, and preferences so every person has a living profile.",
  },
  {
    title: "PerchPal AI copilot",
    description:
      "Ask for tailored gift ideas that include rationale grounded in your profile notes.",
  },
  {
    title: "Gift history & notes",
    description:
      "Track what you have already given, how it landed, and what to avoid next time.",
  },
  {
    title: "Gift guides & articles",
    description:
      "Browse curated guides and inspiration when you need a jump-start on gifting.",
  },
  {
    title: "Email reminders",
    description:
      "Enable notifications so PerchPal nudges you before birthdays, anniversaries, and milestones.",
  },
  {
    title: "Wishlist identity",
    description:
      "Optionally maintain your own shareable profile so others always know what you love.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="space-y-10 py-6 sm:py-10 lg:py-12">
      <section className="gp-card overflow-hidden">
        <Image
          src="/giftperch_banner.png"
          alt="GiftPerch banner"
          width={1200}
          height={400}
          className="h-auto w-full rounded-3xl object-cover"
          priority
        />
      </section>

      <section className="gp-card-soft space-y-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
            About GiftPerch
          </p>
          <h1 className="text-3xl font-semibold text-gp-evergreen">
            Gifting that stays thoughtful, even when life gets busy
          </h1>
        </div>
        <p className="text-base text-gp-evergreen/80">
          GiftPerch helps you build living recipient profiles, so you are never
          scrambling to remember sizes, favorite brands, or budgets. Layer in
          PerchPal—the AI gifting copilot—and you can ask for ideas with
          context, rationale, and affiliate-ready links that feel genuinely
          personal. Everything is saved in one place: wishlists, past gifts, and
          the gentle nudges that keep you ahead of every occasion.
        </p>
        <p className="text-base text-gp-evergreen/80">
          The goal is simple: avoid last-minute stress, dodge awkward repeat
          gifts, and make gifting feel fun again—for you and the people you care
          about.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
            Features
          </p>
          <h2 className="text-2xl font-semibold text-gp-evergreen">
            What GiftPerch includes
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="gp-card flex flex-col gap-2"
            >
              <h3 className="text-lg font-semibold text-gp-evergreen">
                {feature.title}
              </h3>
              <p className="text-sm text-gp-evergreen/80">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <a
        href="https://jasonconklin.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="gp-card flex flex-col gap-4 transition hover:border-gp-evergreen/40 hover:bg-white sm:flex-row sm:items-center sm:gap-6"
      >
        <Image
          src="/jasonconklin.png"
          alt="Jason Conklin"
          width={80}
          height={80}
          className="h-20 w-20 rounded-full border border-gp-evergreen/15 object-cover"
        />
        <div className="space-y-2 text-left">
          <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
            Built by
          </p>
          <h3 className="text-xl font-semibold text-gp-evergreen">
            Jason Conklin
          </h3>
          <p className="text-sm text-gp-evergreen/80">
            GiftPerch was created by Jason Conklin, a Bachelor of Science in
            Computer Science graduate from NJIT who loves building AI-powered
            tools that feel personal and genuinely helpful. PerchPal is his way
            of making thoughtful gifting effortless for families, couples, and
            teams.
          </p>
        </div>
      </a>
    </div>
  );
}
