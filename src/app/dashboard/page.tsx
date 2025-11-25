import type { Metadata } from "next";
import Image from "next/image";
import { PageShell } from "@/components/layout/PageShell";
import { DashboardHighlights } from "@/components/dashboard/DashboardHighlights";
import { PerchPalFlyingAvatar } from "@/components/perchpal/PerchPalLoader";
import Link from "next/link";
import { AdminMetrics } from "./AdminMetrics";
import { WelcomeOnboardingModal } from "@/components/dashboard/WelcomeOnboardingModal";
import { GettingStartedCard } from "@/components/dashboard/GettingStartedCard";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "GiftPerch - Dashboard",
};

const actions = [
  {
    href: "/recipients",
    title: "Create a new recipient profile",
    description:
      "Capture their interests, budgets, key dates, and gift history in one place.",
  },
  {
    href: "/gifts",
    title: "Ask PerchPal for a gift idea",
    description:
      "Choose a recipient and let your AI co-pilot suggest thoughtful gift ideas.",
  },
  {
    href: "/history",
    title: "View gift history",
    description:
      "Review past gifts so you don’t repeat yourself and can level them up next time.",
  },
];

export default async function DashboardHome() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let recipientCountValue = 0;
  let suggestionCountValue = 0;
  let engagementCountValue = 0;

  if (user?.id) {
    const userId = user.id;

    const [{ count: recipientCount }, { count: suggestionCount }, { count: savedCount }, { count: feedbackCount }] =
      await Promise.all([
        supabase
          .from("recipient_profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("gift_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("recipient_saved_gift_ideas")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("recipient_gift_feedback")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

    recipientCountValue = recipientCount ?? 0;
    suggestionCountValue = suggestionCount ?? 0;
    engagementCountValue = (savedCount ?? 0) + (feedbackCount ?? 0);
  }

  const onboardingCompletedByData =
    recipientCountValue > 0 && (suggestionCountValue > 0 || engagementCountValue > 0);

  const heroBanner = (
    <div className="overflow-hidden rounded-3xl">
      <Image
        src="/GiftPerch_custom_banner.png"
        alt="GiftPerch dashboard banner"
        width={1200}
        height={260}
        className="h-auto w-full rounded-3xl object-cover"
        priority
      />
    </div>
  );

  return (
    <PageShell
      hero={heroBanner}
      eyebrow="PerchPal HQ"
      title="Your gifting command center"
      subtitle="Track every recipient, wishlist, and AI suggestion from one warm, PerchPal-guided workspace."
    >
      <WelcomeOnboardingModal />
      <section className="space-y-8">
        <GettingStartedCard
          recipientCount={recipientCountValue}
          userId={user?.id ?? null}
          onboardingCompleted={onboardingCompletedByData}
        />
        <DashboardHighlights />
        <div className="grid gap-4 md:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="gp-card flex h-full flex-col gap-2 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <h2 className="text-lg font-semibold text-gp-evergreen">
                {action.title}
              </h2>
              <p className="text-sm text-gp-evergreen/80">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
        <div className="gp-card-soft flex w-full items-center gap-4">
          <PerchPalFlyingAvatar size="lg" className="shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gp-evergreen">
              PerchPal is syncing upcoming gifting moments...
            </p>
            <p className="text-xs text-gp-evergreen/70">
              We will surface reminders, budgets, and fresh ideas the moment
              something special is around the corner.
            </p>
          </div>
        </div>
        <AdminMetrics />
      </section>
    </PageShell>
  );
}
