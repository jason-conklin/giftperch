import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageShell } from "@/components/layout/PageShell";
import { OccasionsManager } from "@/components/occasions/OccasionsManager";

export const metadata: Metadata = {
  title: "GiftPerch - Occasions",
};

export default function OccasionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading occasions...
        </div>
      }
    >
      <AuthGuard>
        <AppLayout>
          <PageShell
            title="Occasions"
            subtitle="Track birthdays, anniversaries, and seasonal moments so PerchPal can send timely nudges."
          >
            <div className="mx-auto w-full max-w-6xl space-y-6">
              <section className="gp-card space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-gp-evergreen/60">
                  Plan ahead
                </p>
                <h2 className="text-2xl font-semibold text-gp-evergreen">
                  Your gifting planner
                </h2>
                <p className="text-sm text-gp-evergreen/70">
                  Keep every birthday, anniversary, and seasonal tradition in one
                  place. GiftPerch highlights each moment so you can line up ideas
                  and budgets before the rush hits.
                </p>
              </section>

              <OccasionsManager />
            </div>
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
