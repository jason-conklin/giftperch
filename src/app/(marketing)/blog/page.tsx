import Link from "next/link";

const blogPosts = [
  {
    slug: "ai-gift-generator-for-hard-to-shop-for-people",
    title: "AI gift generator for hard-to-shop-for people",
    description:
      "How GiftPerch helps with people who are impossible to shop for, using AI and profiles.",
  },
  {
    slug: "gift-ideas-for-busy-professionals",
    title: "Gift ideas for busy professionals",
    description:
      "What to buy for the friend or partner whose calendar is always packed — without defaulting to another mug.",
  },
  {
    slug: "how-to-use-recipient-profiles-to-avoid-bad-gifts",
    title: "How to use recipient profiles to avoid bad gifts",
    description:
      "Make GiftPerch your gift CRM by logging budgets, misfires, and hints so you never repeat mistakes.",
  },
] as const;

export default function BlogIndexPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
            GiftPerch Journal
          </p>
          <h1 className="text-3xl font-semibold text-gp-evergreen">
            Stories about thoughtful gifting
          </h1>
          <p className="text-base text-gp-evergreen/80">
            Practical ideas, PerchPal workflows, and the habits that keep
            gifting personal—even when life gets busy.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="gp-card flex h-full flex-col justify-between gap-3"
            >
              <div>
                <h2 className="text-xl font-semibold text-gp-evergreen">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-gp-evergreen/80">
                  {post.description}
                </p>
              </div>
              <Link
                href={`/blog/${post.slug}`}
                className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
              >
                Read more
              </Link>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-12 border-t border-gp-evergreen/10 pt-6 text-sm text-gp-evergreen">
        Looking for more ideas?{" "}
        <a
          href="https://www.amazon.com/?tag=giftperch-20"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gp-evergreen underline underline-offset-4 transition hover:text-gp-gold"
        >
          Explore Amazon’s full gift categories »
        </a>
      </div>
    </div>
  );
}
