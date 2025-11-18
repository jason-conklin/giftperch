import Link from "next/link";

const posts = {
  "ai-gift-generator-for-hard-to-shop-for-people": {
    title: "AI gift generator for hard-to-shop-for people",
    intro:
      'When someone shrugs and says "I do not need anything," GiftPerch pairs your profile data with PerchPal so the search still feels thoughtful.',
    sections: [
      {
        heading: "Capture the clues hiding in conversations",
        paragraphs: [
          "Log the things your recipient casually mentions -- travel plans, materials they dislike, boutiques they follow, or the classic \"please do not get me another scarf\" warning.",
          "Profiles hold more than demographics. Add context like recent life changes, budget comfort zones, and any past wins or misses so PerchPal keeps suggestions grounded in reality.",
        ],
      },
      {
        heading: "Let PerchPal remix context with AI",
        paragraphs: [
          "When you request ideas, PerchPal blends those notes with seasonal cues and gift history to avoid the copy-and-paste lists you might get from a generic chatbot.",
          "Each recommendation includes a short rationale so you can instantly see why a book bundle, workshop, or experience matches that \"impossible\" person.",
        ],
      },
      {
        heading: "Close the loop with gift history",
        paragraphs: [
          "Log what you actually purchased and how it landed. That feedback feeds directly into future PerchPal prompts so it never suggests the same dud twice.",
          "Move any standout idea into your wishlist to resurface or share when someone asks what to buy them.",
        ],
      },
    ],
  },
  "gift-ideas-for-busy-professionals": {
    title: "Gift ideas for busy professionals",
    intro:
      "Your most overbooked friends crave gifts that feel restorative or that upgrade their daily systems. These themes keep utility and delight balanced.",
    sections: [
      {
        heading: "Design gifts that create breathing room",
        paragraphs: [
          "PerchPal loves recommending cozy rituals: curated tea flights, guided journaling kits, or memberships that pre-plan dinner for hectic weeks.",
          "Think experiences that force them to pause -- sound bath passes, float therapy, or even a housekeeping credit bundled with a personal note.",
        ],
      },
      {
        heading: "Upgrade their everyday tools",
        paragraphs: [
          "Smart travel organizers, weighted pens, or premium laptop stands give utilitarian items a glow-up without feeling generic.",
          "Pair each idea with personal context (\"he is on red-eyes twice a month\") inside GiftPerch so PerchPal understands why that recommendation mattered.",
        ],
      },
      {
        heading: "Document reactions for the next crunch season",
        paragraphs: [
          "After gifting, record what sparked joy and what missed. Busy people rarely have time to elaborate, so jot down even the smallest \"this was perfect\" DM.",
          "The next time you ask PerchPal for ideas, it will lean on that feedback to keep the streak going.",
        ],
      },
    ],
  },
  "how-to-use-recipient-profiles-to-avoid-bad-gifts": {
    title: "How to use recipient profiles to avoid bad gifts",
    intro:
      "Recipient profiles are your mini gift CRM. The more details you capture, the easier it becomes to dodge repeat misfires.",
    sections: [
      {
        heading: "Log intel right after conversations",
        paragraphs: [
          "When someone mentions a new brand or trip, open GiftPerch and add it immediately before the memory fades.",
          "Over time you will build a searchable log of likes, dislikes, and hints so you never rely on guesswork.",
        ],
      },
      {
        heading: "Track budgets, sizes, and anti-gifts",
        paragraphs: [
          "Budgets are not just dollar signs -- they tell PerchPal how bold or safe it should go. Record min and max ranges plus annual spend so the AI respects financial comfort.",
          "Add shoe sizes, allergies, or \"never again\" items. Future you (or a partner logging in) will be grateful.",
        ],
      },
      {
        heading: "Share context with collaborators",
        paragraphs: [
          "Use the self-profile link or export notes so siblings, partners, or teammates all see the same source of truth.",
          "When everyone works from the same profile, the chances of duplicate or awkward gifts drop dramatically.",
        ],
      },
    ],
  },
} as const;

type BlogPostPageProps = {
  params: Promise<{
    slug: keyof typeof posts | string;
  }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = posts[slug as keyof typeof posts];

  if (!post) {
    return (
      <section className="space-y-4 py-10">
        <h1 className="text-3xl font-semibold text-gp-evergreen">
          Post not found
        </h1>
        <p className="text-gp-evergreen/80">
          Check back soon for more GiftPerch stories and ideas.
        </p>
        <Link
          href="/blog"
          className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Return to the GiftPerch Journal
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6 py-6 sm:py-10 lg:py-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
          GiftPerch Journal
        </p>
        <h1 className="text-3xl font-semibold text-gp-evergreen">
          {post.title}
        </h1>
        <p className="text-base text-gp-evergreen/80">{post.intro}</p>
      </header>

      <div className="space-y-5">
        {post.sections.map((section) => (
          <article key={section.heading} className="space-y-2">
            <h2 className="text-xl font-semibold text-gp-evergreen">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph, index) => (
              <p
                key={`${section.heading}-${index}`}
                className="text-base text-gp-evergreen/80"
              >
                {paragraph}
              </p>
            ))}
          </article>
        ))}
      </div>

      <div className="gp-card-soft text-sm text-gp-evergreen/80">
        Want more thoughtful gifting frameworks?{" "}
        <Link
          href="/about"
          className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Learn about GiftPerch
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
    </section>
  );
}
