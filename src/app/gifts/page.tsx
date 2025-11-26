"use client";

import { Suspense, useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PerchPalChat } from "@/components/perchpal/PerchPalChat";
import { GiftSuggestionsPanel } from "@/components/gifts/GiftSuggestionsPanel";
import { FirstGenerationGuideBanner } from "@/components/gifts/FirstGenerationGuideBanner";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { useLocalFlag } from "@/hooks/useLocalFlag";
import type { Metadata } from "next";

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
            <div className="space-y-6">
              <FirstGenerationGuideBanner
                hasRecipients={hasRecipients}
                onScrollToForm={() => {
                  const el = document.getElementById("perchpal-input");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              />
              <PerchPalChat />
              <GiftSuggestionsPanel onFirstRunComplete={handleFirstRunComplete} />
            </div>
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
export const metadata: Metadata = {
  title: "GiftPerch - Gift Ideas",
};