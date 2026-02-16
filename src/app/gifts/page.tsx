"use client";

import { Suspense, useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PerchPalChatPanel } from "@/components/perchpal/PerchPalChatPanel";
import { GiftSuggestionsPanel } from "@/components/gifts/GiftSuggestionsPanel";
import { FirstGenerationGuideBanner } from "@/components/gifts/FirstGenerationGuideBanner";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { useLocalFlag } from "@/hooks/useLocalFlag";

export default function GiftsPage() {
  const { user, status } = useSupabaseSession();
  const supabase = getSupabaseBrowserClient();
  const [hasRecipients, setHasRecipients] = useState(false);
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

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading gift ideas...
        </div>
      }
    >
      <AuthGuard>
        <AppLayout>
          <PageShell
            title="Gift Ideas"
            subtitle="Chat with PerchPal and generate tailored gift suggestion lists for the people you shop for most."
          >
            <div id="smart-gift-suggestions" className="space-y-6 2xl:pr-[26rem]">
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
          <PerchPalChatPanel userId={user?.id ?? null} />
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
