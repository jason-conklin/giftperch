import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "GiftPerch - About",
};

const features = [
  {
    id: "profiles",
    title: "Set up recipient profiles",
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
            <article key={feature.title} className="gp-card h-full p-5">
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

      <section className="gp-card grid gap-5 md:grid-cols-[minmax(21rem,23rem)_minmax(0,1fr)] md:items-start md:gap-6">
        <div className="space-y-3 md:self-center">
          <p className="pl-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-gp-evergreen/55">
            Built by
          </p>

          <div className="rounded-2xl border border-gp-evergreen/12 bg-white/70 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <Image
                src="/jasonconklin.png"
                alt="Jason Conklin"
                width={256}
                height={256}
                quality={100}
                unoptimized
                className="h-24 w-24 shrink-0 rounded-full border border-gp-evergreen/15 object-cover shadow-sm sm:h-28 sm:w-28"
              />
              <div className="min-w-0 space-y-1 text-left">
                <h2 className="whitespace-nowrap text-2xl font-semibold leading-tight text-gp-evergreen">
                  Jason Conklin
                </h2>
                <p className="whitespace-nowrap text-sm font-medium text-gp-evergreen/80">
                  Creator of GiftPerch
                </p>
                <span className="mt-2 inline-flex whitespace-nowrap rounded-full border border-gp-gold/35 bg-gp-cream/60 px-3 py-1 text-xs font-medium text-gp-evergreen/75">
                  B.S. Computer Science, NJIT
                </span>
              </div>
            </div>
          </div>

          <Link
            href="https://jasonconklin.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
          >
            Learn more about Jason
          </Link>
        </div>

        <div className="gp-founder-note-glow rounded-2xl border border-gp-gold/20 bg-white/65 px-5 py-5 sm:px-6">
          <div className="space-y-3">
            <span
              className="inline-flex h-6 w-6 items-center justify-center text-gp-gold/90"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-90">
                <path
                  d="M10 6.5c-2.1 1.4-3.4 3.7-3.4 6.4v4.6h6.2v-4.2H9.8c.1-1.6.9-2.9 2.2-4l-2-2.8Zm8 0c-2.1 1.4-3.4 3.7-3.4 6.4v4.6h6.2v-4.2h-3c.1-1.6.9-2.9 2.2-4l-2-2.8Z"
                  fill="currentColor"
                />
              </svg>
            </span>

            <h3 className="text-2xl font-semibold text-gp-evergreen">
              Why I built GiftPerch
            </h3>

            <p className="text-lg leading-relaxed text-gp-evergreen/90">
              &ldquo;Thoughtful gifting should feel personal, not chaotic.&rdquo;
            </p>

            <p className="text-sm leading-relaxed text-gp-evergreen/80">
              Capturing interests, budgets, past wins, and subtle hints in one
              place and pairing it with AI makes gifting easier and more
              meaningful. My goal is to help families, couples, and teams avoid
              last-minute stress and keep traditions special.
            </p>

          </div>
        </div>
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
