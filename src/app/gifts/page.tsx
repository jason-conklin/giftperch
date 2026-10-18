"use client";

import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  AppLayout,
  type AppEndRail,
} from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  PerchPalChatPanel,
  type PerchPalChatPanelHandle,
} from "@/components/perchpal/PerchPalChatPanel";
import { GiftSuggestionsPanel } from "@/components/gifts/GiftSuggestionsPanel";
import { FirstGenerationGuideBanner } from "@/components/gifts/FirstGenerationGuideBanner";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { useLocalFlag } from "@/hooks/useLocalFlag";
import { Sparkles } from "lucide-react";

export default function GiftsPage() {
  const { user, status } = useSupabaseSession();
  const supabase = getSupabaseBrowserClient();
  const [hasRecipients, setHasRecipients] = useState(false);
  const [desktopChatCollapsed, setDesktopChatCollapsed] = useState(true);
  const perchPalPanelRef = useRef<PerchPalChatPanelHandle | null>(null);
  const [, setFirstGenerationDone] = useLocalFlag(
    "gp_onboarding_first_generation_done",
  );

  useEffect(() => {
    if (status !== "authenticated" || !user?.id) return;
    let active = true;
    const loadRecipients = async () => {
      const { count } = await supabase
        .from("recipient_profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!active) return;
      setHasRecipients((count ?? 0) > 0);
    };
    void loadRecipients();
    return () => {
      active = false;
    };
  }, [status, supabase, user?.id]);

  const handleFirstRunComplete = () => setFirstGenerationDone(true);
  const endRail: AppEndRail = desktopChatCollapsed
    ? "none"
    : "perchpal-expanded";

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading gift ideas...
        </div>
      }
    >
      <AppLayout endRail={endRail}>
        <AuthGuard>
          <PageShell
            hero={
              <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-[#fbf1d9] text-[#b17d13]">
                    <Sparkles className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <div>
                    <h1 className="font-display text-4xl font-semibold leading-none text-gp-app-evergreen sm:text-[2.75rem]">
                      Gift Ideas
                    </h1>
                    <p className="mt-1.5 text-sm text-gp-app-muted sm:text-base">
                      Personalized recommendations from PerchPal, matched with real products you can buy.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => perchPalPanelRef.current?.openDesktop()}
                  className="hidden min-w-[18rem] items-center gap-3 rounded-2xl border border-gp-app-evergreen/10 bg-white px-4 py-3 text-left shadow-[0_10px_28px_rgba(15,61,62,0.08)] transition hover:border-gp-app-gold hover:shadow-[0_14px_34px_rgba(15,61,62,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold xl:flex"
                  aria-label="Open PerchPal chat"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fbf1d9]">
                    <Image
                      src="/giftperch_perchpal_front.png"
                      alt=""
                      width={34}
                      height={34}
                      className="h-8 w-8 object-contain"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gp-app-evergreen">
                      Chat with PerchPal
                    </span>
                    <span className="block text-xs text-gp-app-muted">
                      Get personalized advice
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-lg text-gp-app-evergreen">→</span>
                </button>
              </header>
            }
          >
            <div id="smart-gift-suggestions" className="space-y-4">
              <FirstGenerationGuideBanner
                hasRecipients={hasRecipients}
                onScrollToForm={() => {
                  const el = document.getElementById("smart-gift-suggestions");
                  if (el)
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
              <GiftSuggestionsPanel onFirstRunComplete={handleFirstRunComplete} />
            </div>
          </PageShell>
          <PerchPalChatPanel
            ref={perchPalPanelRef}
            userId={user?.id ?? null}
            onDesktopCollapsedChange={setDesktopChatCollapsed}
          />
        </AuthGuard>
      </AppLayout>
    </Suspense>
  );
}
