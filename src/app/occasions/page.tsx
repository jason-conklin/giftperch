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
              <OccasionsManager />
            </div>
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
