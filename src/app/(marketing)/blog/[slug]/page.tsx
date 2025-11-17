import { PageShell } from "@/components/layout/PageShell";
import Link from "next/link";

const posts = {
  "ai-gift-generator-for-hard-to-shop-for-people": {
    title: "AI gift generator for hard-to-shop-for people",
    intro:
      "PerchPal turns a handful of profile notes into a curated list of ideas. Here is how the AI engine keeps things personal.",
    sections: [
      {
        heading: "Start with real recipient profiles",
        body: "GiftPerch encourages you to log personality traits, interests, and past gift wins or misses. PerchPal reads that context to avoid generic ideas.",
      },
      {
        heading: "Let PerchPal explain why",
        body: "Each suggestion comes with a rationale so you can see the thread between the profile and the gift. It's an assist, not a black box.",
      },
      {
        heading: "Turn insights into your plan",
        body: "Save favorites to a wishlist, log which items you actually purchased, and keep the relationship context updated for future occasions.",
      },
    ],
  },
  "gift-ideas-for-busy-professionals": {
    title: "Gift ideas for busy professionals",
    intro:
      "Whether it is a partner with a hectic travel schedule or a colleague who lives in back-to-back meetings, these ideas keep thoughtfulness front and center.",
    sections: [
      {
        heading: "Prioritize rejuvenation",
        body: "PerchPal often recommends gifts that create intentional downtime: curated tea kits, guided journaling sets, or pre-planned dining experiences.",
      },
      {
        heading: "Make utility beautiful",
        body: "Rechargeable desk accessories, smart travel organizers, and wellness subscriptions balance practicality with a personal touch.",
      },
      {
        heading: "Document what lands",
        body: "Use GiftPerch to log which gifts brought the biggest smiles so your future suggestions get smarter every occasion.",
      },
    ],
  },
  "how-to-use-recipient-profiles-to-avoid-bad-gifts": {
    title: "How to use recipient profiles to avoid bad gifts",
    intro:
      "Recipient profiles turn fuzzy memories into a clear snapshot. Here is a simple framework to keep them useful.",
    sections: [
      {
        heading: "Log preferences right after conversations",
        body: "When a friend mentions a new hobby or favorite shop, add it to their profile before it disappears from your brain.",
      },
      {
        heading: "Track budgets and anti-gifts",
        body: "Not every idea is a winner. Record misses, price sensitivity, and brands to avoid so you never double up.",
      },
      {
        heading: "Pair profiles with PerchPal",
        body: "Profiles are powerful on their own. Feed them into PerchPal to unlock AI-driven suggestions rooted in what makes each person unique.",
      },
    ],
  },
} as const;

type BlogPostPageProps = {
  params: {
    slug: keyof typeof posts | string;
  };
};

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = posts[params.slug as keyof typeof posts];

  if (!post) {
    return (
      <PageShell title="Post not found" subtitle="Check back soon for new stories.">
        <Link
          href="/blog"
          className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Return to the GiftPerch Journal
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell title={post.title} subtitle={post.intro}>
      {post.sections.map((section) => (
        <article key={section.heading} className="space-y-2">
          <h2 className="text-xl font-semibold text-gp-evergreen">
            {section.heading}
          </h2>
          <p className="text-base text-gp-evergreen/80">{section.body}</p>
        </article>
      ))}
      <div className="rounded-3xl border border-gp-evergreen/15 bg-white/90 p-4 text-sm text-gp-evergreen/80">
        Want more thoughtful gifting frameworks?{" "}
        <Link
          href="/features"
          className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Explore GiftPerch features
        </Link>{" "}
        or{" "}
        <Link
          href="/auth/signup"
          className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          create your account
        </Link>
        .
      </div>
    </PageShell>
  );
}
