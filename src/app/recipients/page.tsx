import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RecipientsManager } from "@/components/recipients/RecipientsManager";

export const metadata: Metadata = {
  title: "GiftPerch - Recipients",
};

export default function RecipientsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading recipients...
        </div>
      }
    >
      <AuthGuard>
        <AppLayout>
          <PageShell>
            <RecipientsManager />
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
