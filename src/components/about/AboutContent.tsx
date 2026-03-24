import Image from "next/image";
import Link from "next/link";

const featureHighlights = [
  {
    title: "Recipient profiles",
    description:
      "Log preferences, budgets, and sizes for everyone you shop for so PerchPal learns their personality.",
  },
  {
    title: "PerchPal AI",
    description:
      "Chat about budgets or occasions and get rationale-backed ideas grounded in the data you already saved.",
  },
  {
    title: "Gift suggestions & history",
    description:
      "Save AI ideas, log what you actually purchased, and keep a running record so you never repeat a surprise.",
  },
  {
    title: "Occasions calendar",
    description:
      "Track birthdays, anniversaries, and seasonal events so reminders hit before shipping deadlines do.",
  },
  {
    title: "Wishlists & sharing",
    description:
      "Optional public wishlists let you curate your own favorites or share guides with friends and family.",
  },
] as const;

export function AboutContent() {
  return (
    <div className="space-y-8">
      <section className="gp-card flex flex-col gap-6">
        <div className="space-y-3">
          <p className="gp-pill">About GiftPerch</p>
          <h2 className="text-3xl font-semibold text-gp-evergreen">
            Thoughtful gifting powered by profiles + PerchPal
          </h2>
          <p className="text-base text-gp-evergreen/80">
            GiftPerch is your command center for every person you shop for. Capture
            hints, log budgets, and let PerchPal fetch AI-powered ideas that still
            feel personal.
          </p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-gp-evergreen/15 shadow-sm">
          <Image
            src="/giftperch_banner.png"
            alt="GiftPerch hero artwork"
            width={1200}
            height={540}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      </section>

      <section className="gp-card-soft space-y-4">
        <div>
          <p className="gp-pill">Key features</p>
          <p className="mt-2 text-sm text-gp-evergreen/70">
            Every workflow is designed to keep relationships warm and reduce the
            mental load of planning.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {featureHighlights.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-gp-evergreen/15 bg-white/95 p-4"
            >
              <h3 className="text-lg font-semibold text-gp-evergreen">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-gp-evergreen/70">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="gp-card grid gap-6 md:grid-cols-[14rem_minmax(0,1fr)] md:items-start">
        <div className="space-y-3">
          <Image
            src="/jasonconklin.png"
            alt="Jason Conklin"
            width={112}
            height={112}
            className="h-28 w-28 rounded-full border border-gp-evergreen/15 object-cover"
            priority
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gp-evergreen/60">
              About the creator
            </p>
            <h3 className="text-2xl font-semibold text-gp-evergreen">
              Jason Conklin
            </h3>
            <p className="text-sm text-gp-evergreen/70">
              Creator of GiftPerch · B.S. in Computer Science, NJIT
            </p>
          </div>
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

            <h4 className="text-2xl font-semibold text-gp-evergreen">
              Why I built GiftPerch
            </h4>

            <p className="text-lg leading-relaxed text-gp-evergreen/90">
              &ldquo;I built GiftPerch because my family group chats were full of
              ‘what should we get?’ panic.&rdquo;
            </p>

            <p className="text-base leading-relaxed text-gp-evergreen/80">
              By combining structured recipient profiles with a friendly AI
              co-pilot, I wanted gifting to feel thoughtful again instead of
              last-minute.
            </p>

            <Link
              href="https://jasonconklin.dev"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm font-semibold text-gp-evergreen hover:text-gp-evergreen/80 hover:underline"
            >
              Learn more about Jason →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
