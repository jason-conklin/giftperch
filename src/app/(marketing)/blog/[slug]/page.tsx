import Image from "next/image";
import Link from "next/link";

const posts = {
  "ai-gift-generator-for-hard-to-shop-for-people": {
    title: "AI gift generator for hard-to-shop-for people",
    intro:
      'When someone shrugs and says "I do not need anything," GiftPerch pairs your profile data with PerchPal so the search still feels thoughtful.',
    meta: {
      published: "Updated 2025",
      readingTime: "4 min read",
      category: "Thoughtful gifting",
    },
    coverImage: {
      src: "/blog/ai-gift-generator-hero.png",
      alt: "Illustration of the GiftPerch bird and a gift box surrounded by abstract icons representing different hobbies, symbolizing AI-powered gift ideas.",
    },
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
    meta: {
      published: "Updated 2025",
      readingTime: "3 min read",
      category: "Practical gifting",
    },
    coverImage: {
      src: "/blog/gifts-for-busy-professionals-hero.png",
      alt: "Illustration of a laptop, calendar, coffee cup, and gift box on a tidy desk, representing thoughtful gifts for busy professionals.",
    },
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
    meta: {
      published: "Updated 2025",
      readingTime: "3 min read",
      category: "Recipient profiles",
    },
    coverImage: {
      src: "/blog/recipient-profiles-hero.png",
      alt: "Stylized cards with profile avatars, tags, and gift icons arranged like a simple CRM board, representing GiftPerch recipient profiles.",
    },
    sections: [
      {
        heading: "Log intel right after conversations",
        paragraphs: [
          "When someone mentions a new brand or trip, open GiftPerch and add it immediately before the memory fades.",
          "Over time you will build a searchable log of likes, dislikes, and hints so you never rely on guesswork.",
        ],
      },
      {
        heading: "Track budgets, sizes, and interests",
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

  const meta = post.meta ?? {
    published: "Updated recently",
    readingTime: "3 min read",
    category: "GiftPerch Journal",
  };
  const coverImage = post.coverImage;

  return (
    <section className="py-8 sm:py-10 lg:py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="w-full space-y-6 lg:max-w-3xl">
          <header className="space-y-3 rounded-3xl border border-gp-evergreen/10 bg-white/95 p-6 shadow-sm lg:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gp-evergreen/60">
              GiftPerch Journal
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-gp-evergreen sm:text-4xl">
              {post.title}
            </h1>
            <p className="text-base text-gp-evergreen/80">{post.intro}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-gp-evergreen/60">
              <span className="rounded-full border border-gp-evergreen/20 bg-gp-cream/70 px-3 py-1">
                {meta.published}
              </span>
              <span className="rounded-full border border-gp-evergreen/20 bg-gp-cream/70 px-3 py-1">
                {meta.readingTime}
              </span>
              <span className="rounded-full border border-gp-gold/40 bg-gp-gold/20 px-3 py-1 text-gp-evergreen">
                {meta.category}
              </span>
            </div>

            {coverImage ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-gp-evergreen/10 bg-white shadow-sm">
                <div className="relative aspect-[16/9] w-full">
                  <Image
                    src={coverImage.src}
                    alt={coverImage.alt}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            ) : null}
          </header>

          <ArticleBody sections={post.sections} />

          <BottomCta />
        </div>

        <aside className="w-full space-y-4 lg:max-w-sm">
          <div className="rounded-3xl border border-gp-evergreen/10 bg-white/90 p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gp-evergreen/60">
              About GiftPerch
            </h3>
            <p className="mt-2 text-sm text-gp-evergreen/80 leading-relaxed">
              GiftPerch helps you craft living recipient profiles, track
              occasions, and lean on PerchPal to surface AI-ready gift ideas
              with context.
            </p>
            <Link
              href="/about"
              className="mt-3 inline-flex text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
            >
              Learn more →
            </Link>
          </div>

          <div className="rounded-3xl border border-gp-evergreen/15 bg-gp-gold/70 p-5 shadow-sm">
            <p className="text-sm font-semibold text-gp-evergreen">
              Ready to try GiftPerch?
            </p>
            <p className="mt-2 text-sm text-gp-evergreen/80 leading-relaxed">
              Create your account or log in to start building recipient
              profiles, budgets, and gift history.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/auth/signup"
                className="gp-primary-button px-4 py-2 text-xs"
              >
                Sign up
              </Link>
              <Link
                href="/"
                className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
              >
                See how it works
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ArticleBody({
  sections,
}: {
  sections: ReadonlyArray<{
    heading: string;
    paragraphs: ReadonlyArray<string>;
  }>;
}) {
  return (
    <div className="space-y-6">
      {sections.map((section, index) => (
        <article key={section.heading} className="space-y-3">
          <h2 className="text-xl font-semibold text-gp-evergreen sm:text-2xl">
            {section.heading}
          </h2>
          <div className="space-y-3 text-base leading-relaxed text-gp-evergreen/80">
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`${section.heading}-${paragraphIndex}`}>{paragraph}</p>
            ))}
          </div>

          {index === 1 ? <MidArticleCallout /> : null}
        </article>
      ))}
    </div>
  );
}

function MidArticleCallout() {
  return (
    <div className="rounded-3xl border border-gp-gold/40 bg-gp-gold/15 p-5 text-sm text-gp-evergreen shadow-sm sm:p-6">
      <p className="font-semibold text-gp-evergreen">Want more thoughtful gifting workflows?</p>
      <p className="mt-2 leading-relaxed text-gp-evergreen/80">
        GiftPerch keeps profiles, budgets, and gift history in one place so your
        future searches feel more personal.
      </p>
      <Link
        href="/auth/signup"
        className="mt-3 inline-flex text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
      >
        Try GiftPerch →
      </Link>
    </div>
  );
}

function BottomCta() {
  return (
    <div className="rounded-3xl border border-gp-evergreen/10 bg-gp-cream/80 p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gp-evergreen">
            Want more thoughtful gifting ideas?
          </p>
          <p className="text-sm text-gp-evergreen/80">
            Explore GiftPerch or browse more articles from the Journal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="gp-primary-button px-5 py-2 text-sm"
          >
            Explore GiftPerch features
          </Link>
          <Link
            href="/blog"
            className="gp-secondary-button px-4 py-2 text-sm"
          >
            Browse more articles
          </Link>
        </div>
      </div>
    </div>
  );
}
