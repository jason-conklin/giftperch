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
          <PageShell>
            <GiftHistoryTable />
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
