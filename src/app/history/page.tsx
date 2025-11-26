import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PageShell } from "@/components/layout/PageShell";
import { AppLayout } from "@/components/layout/AppLayout";
import { GiftHistoryTable } from "@/components/gifts/GiftHistoryTable";

export const metadata: Metadata = {
  title: "GiftPerch - History",
};

export default function GiftHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading gift history...
        </div>
      }
    >
      <AuthGuard>
        <AppLayout>
          <PageShell
            title="Gift Log & Saved Ideas"
            subtitle="Track every gift you've given and every idea you’ve saved—so PerchPal can avoid repeats and surface better, more personalized suggestions."
          >
            <GiftHistoryTable />
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
