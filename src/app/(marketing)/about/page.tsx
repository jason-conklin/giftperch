import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GiftPerch - About",
};

const features = [
  {
    id: "profiles",
    title: "Capture recipient profiles",
    description:
      "Log interests, budgets, sizes, and occasions so every person has a living gift CRM.",
  },
  {
    id: "perchpal",
    title: "Ask PerchPal",
    description:
      "Give PerchPal a vibe, budget, or occasion and receive AI-curated ideas with rationale.",
  },
  {
    id: "history",
    title: "Track every gift",
    description:
      "Record past gifts, notes, and affiliate-ready links so you never scramble last minute.",
  },
] as const;

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4.5 20.4a7.5 7.5 0 0 1 15 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d="M4.5 9.5h15v10h-15zM12 9.5v10M4.5 13h15M4 9.5h16M9.6 7.1c0 1-1 2.4-2.4 2.4S5 8.1 5 7.1c0-1.1.9-2 2-2 1.4 0 2.6 1 3.1 2.4m1.3-.4c.4-1.3 1.7-2.3 3.1-2.3 1.1 0 2 .9 2 2 0 1-1 2.4-2.2 2.4-1.4 0-2.4-1.4-2.4-2.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <path
        d="M12 7.5v4.8l3.1 1.9"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureBadge({ featureId }: { featureId: (typeof features)[number]["id"] }) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gp-gold/30 bg-gp-cream/60 text-gp-evergreen">
      {featureId === "profiles" ? <ProfileIcon /> : null}
      {featureId === "history" ? <ClockIcon /> : null}
      {featureId === "perchpal" ? (
        <>
          <Image
            src="/giftperch_perchpal_front.png"
            alt=""
            width={30}
            height={30}
            className="h-7 w-7 rounded-full object-contain"
            aria-hidden="true"
          />
          <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gp-gold/40 bg-white text-gp-evergreen shadow-sm">
            <GiftIcon />
          </span>
        </>
      ) : null}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/50">
            About GiftPerch
          </p>
          <h1 className="text-3xl font-semibold text-gp-evergreen">
            Gifting that stays thoughtful, even when life gets busy
          </h1>
        </div>
        <div className="gp-card space-y-4 text-base text-gp-evergreen/80">
          <p className="max-w-3xl">
            GiftPerch keeps recipient profiles, PerchPal AI, wishlists, and gift
            history in a single workspace. Add the people you shop for, log
            budgets, interests, and what makes them smile, then ask PerchPal for
            context-rich recommendations.
          </p>
          <p className="max-w-3xl">
            Every idea comes with rationale, so you can see how it maps back to
            the profile you crafted. Save confirmed winners, note reactions, and
            stay ahead of each birthday, anniversary, or just-because surprise.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/50">
            Features
          </p>
          <h2 className="text-2xl font-semibold text-gp-evergreen">
            From profiles to PerchPal ideas
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="gp-card-soft h-full p-5">
              <div className="flex items-start gap-3">
                <FeatureBadge featureId={feature.id} />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gp-evergreen">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gp-evergreen/80">
                    {feature.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="gp-card space-y-4 transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="flex items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Image
            src="/jasonconklin.png"
            alt="Jason Conklin"
            width={256}
            height={256}
            quality={100}
            unoptimized
            className="h-20 w-20 rounded-full border border-gp-evergreen/15 object-cover sm:h-28 sm:w-28"
          />
          <div className="space-y-1 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/60">
              Built by
            </p>
            <h2 className="text-lg font-semibold text-gp-evergreen sm:text-xl">
              Jason Conklin
            </h2>
            <p className="text-sm text-gp-evergreen/70">
              Creator of GiftPerch
            </p>
            <p className="text-sm text-gp-evergreen/70">
              B.S. Computer Science, NJIT
            </p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-gp-evergreen/80">
          <p>
            I created GiftPerch because thoughtful gifting should feel personal,
            not chaotic. Capturing interests, budgets, past wins, and subtle hints
            in one place—and pairing it with AI—makes gifting easier and more
            meaningful.
          </p>
          <p>
            My goal is to help families, couples, and teams avoid last-minute
            stress and keep traditions special.
          </p>
        </div>
        <Link
          href="https://jasonconklin.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Learn more about Jason
        </Link>
      </section>

      <section className="gp-card border border-white bg-gp-gold text-center text-base text-black">
        Ready to keep gifting personal?{" "}
        <Link
          href="/auth/signup"
          className="font-semibold text-black underline-offset-4 hover:underline"
        >
          Create your account
        </Link>{" "}
        or explore the latest stories on the{" "}
        <Link
          href="/blog"
          className="font-semibold text-black underline-offset-4 hover:underline"
        >
          GiftPerch Journal.
        </Link>
      </section>

      <section className="text-sm text-gp-evergreen text-center">
        Want to browse on your own?{" "}
        <a
          href="https://www.amazon.com/?tag=giftperch-20"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gp-evergreen underline underline-offset-4 transition hover:text-gp-gold"
        >
          Explore Amazon’s gift categories »
        </a>
      </section>

    </div>
  );
}
