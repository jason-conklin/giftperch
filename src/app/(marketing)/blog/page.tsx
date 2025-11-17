import Link from "next/link";

const blogPosts = [
  {
    slug: "ai-gift-generator-for-hard-to-shop-for-people",
    title: "AI gift generator for hard-to-shop-for people",
    description:
      "How PerchPal analyzes recipient profiles to surface ideas that feel personal, not random.",
  },
  {
    slug: "gift-ideas-for-busy-professionals",
    title: "Gift ideas for busy professionals",
    description:
      "What to buy for the friend or partner whose calendar is always packed--without defaulting to another mug.",
  },
  {
    slug: "how-to-use-recipient-profiles-to-avoid-bad-gifts",
    title: "How to use recipient profiles to avoid bad gifts",
    description:
      "Make GiftPerch your Gift CRM by logging budgets, misfires, and hints so you never repeat mistakes.",
  },
] as const;

export default function BlogIndexPage() {
  return (
    <section className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
          Blog
        </p>
        <h1 className="text-4xl font-semibold text-gp-evergreen">
          GiftPerch Journal -- AI, gifting & thoughtful ideas
        </h1>
        <p className="text-base text-gp-evergreen/80">
          Guides for him, her, friends, coworkers, teacher appreciation--and deep
          dives on how to use AI and recipient profiles without losing the human
          heart of gifting.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {blogPosts.map((post) => (
          <article
            key={post.slug}
            className="rounded-3xl border border-gp-evergreen/15 bg-white/90 p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-gp-evergreen">
              {post.title}
            </h2>
            <p className="mt-2 text-sm text-gp-evergreen/80">
              {post.description}
            </p>
            <Link
              href={`/blog/${post.slug}`}
              className="mt-4 inline-flex items-center text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
            >
              Read more
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
