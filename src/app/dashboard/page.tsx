import { PageShell } from "@/components/layout/PageShell";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import Link from "next/link";

const actions = [
  {
    href: "/recipients",
    title: "Add your first recipient",
    description:
      "Capture personality traits, budgets, occasions, and shared history.",
  },
  {
    href: "/wishlist",
    title: "Set up your wishlist",
    description:
      "Document what you are loving right now so others can shop with confidence.",
  },
  {
    href: "/gifts",
    title: "Ask PerchPal for a gift idea",
    description:
      "Let the AI co-pilot suggest thoughtful surprises powered by profile data.",
  },
];

export default function DashboardHome() {
  return (
    <PageShell
      title="Your gifting command center"
      subtitle="Track every recipient, wishlist, and AI suggestion from one warm, PerchPal-guided workspace."
    >
      <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
        Welcome to GiftPerch
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col rounded-2xl border border-gp-gold/40 bg-gp-cream/70 p-5 transition hover:-translate-y-0.5 hover:border-gp-gold hover:bg-white"
          >
            <h2 className="text-lg font-semibold text-gp-evergreen">
              {action.title}
            </h2>
            <p className="mt-2 text-sm text-gp-evergreen/80">
              {action.description}
            </p>
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <PerchPalLoader
          variant="inline"
          size="sm"
          message="PerchPal is syncing upcoming gifting moments..."
        />
        {/* TODO: Show while fetching upcoming events or reminders. */}
      </div>
    </PageShell>
  );
}
