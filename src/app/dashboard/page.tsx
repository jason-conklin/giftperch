import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { DashboardHighlights } from "@/components/dashboard/DashboardHighlights";
import { AdminMetrics } from "./AdminMetrics";
import { WelcomeOnboardingModal } from "@/components/dashboard/WelcomeOnboardingModal";
import { GettingStartedCard } from "@/components/dashboard/GettingStartedCard";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "GiftPerch - Dashboard",
};

export default async function DashboardHome() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let recipientCountValue = 0;
  let suggestionCountValue = 0;
  let savedGiftCountValue = 0;

  if (user?.id) {
    const userId = user.id;

    const [{ count: recipientCount }, { count: suggestionCount }, { count: savedCount }] =
      await Promise.all([
      supabase
        .from("recipient_profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_self", false),
      supabase
        .from("gift_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("recipient_saved_gift_ideas")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    recipientCountValue = recipientCount ?? 0;
    suggestionCountValue = suggestionCount ?? 0;
    savedGiftCountValue = savedCount ?? 0;
  }

  const onboardingCompletedByData =
    recipientCountValue > 0 &&
    (suggestionCountValue > 0 || savedGiftCountValue > 0);

  const heroBanner = (
    <section className="relative isolate min-h-[22rem] overflow-hidden rounded-[18px] border border-gp-app-evergreen/10 bg-[#f7eed8] shadow-[0_18px_45px_rgba(15,61,62,0.08)] sm:min-h-[21rem] lg:min-h-[18rem]">
      <Image
        src="/dashboard-scenic-hero.png"
        alt="Mountain lake surrounded by evergreen trees at sunset"
        fill
        sizes="(min-width: 768px) calc(100vw - 15.5rem), 100vw"
        className="object-cover object-center"
        priority
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,251,240,0.98)_0%,rgba(255,251,240,0.91)_35%,rgba(255,251,240,0.35)_66%,rgba(255,251,240,0.04)_100%)] max-sm:bg-[linear-gradient(90deg,rgba(255,251,240,0.97)_0%,rgba(255,251,240,0.85)_62%,rgba(255,251,240,0.48)_100%)]" />

      <div className="relative z-10 flex min-h-[22rem] max-w-3xl flex-col justify-end px-6 pb-7 pt-28 sm:min-h-[21rem] sm:justify-center sm:px-8 sm:py-10 lg:min-h-[18rem] lg:max-w-[64%] lg:px-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#8b6218]">
          Welcome back
        </p>
        <h1 className="font-display text-4xl font-semibold leading-[1.05] text-gp-app-evergreen sm:text-5xl">
          Your gifting command center
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-gp-app-evergreen/75 sm:text-base">
          Track your recipients, upcoming occasions, saved gifts, and get
          personalized recommendations from PerchPal, all in one place.
        </p>
      </div>

      <Link
        href="/gifts"
        className="absolute right-4 top-4 z-20 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-white/70 bg-white/92 px-4 py-3 text-gp-app-evergreen shadow-[0_12px_32px_rgba(15,61,62,0.14)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold sm:right-5 sm:top-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3c8]">
          <Image
            src="/giftperch_perchpal_front.png"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
          />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-lg font-semibold leading-tight">
            Chat with PerchPal
          </span>
          <span className="block text-xs text-gp-app-muted">
            Get personalized advice
          </span>
        </span>
        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      </Link>
    </section>
  );

  return (
    <PageShell hero={heroBanner}>
      <WelcomeOnboardingModal />
      <section className="space-y-5">
        <GettingStartedCard
          recipientCount={recipientCountValue}
          userId={user?.id ?? null}
          onboardingCompleted={onboardingCompletedByData}
        />
        <DashboardHighlights
          recipientCount={recipientCountValue}
          suggestionCount={suggestionCountValue}
          savedGiftCount={savedGiftCountValue}
        />
        <AdminMetrics />
      </section>
    </PageShell>
  );
}
