import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageShell } from "@/components/layout/PageShell";
import { GiftGuidesManager } from "@/components/gift-guides/GiftGuidesManager";

export default function GiftGuidesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading gift guides...
        </div>
      }
    >
      <AuthGuard>
        <AppLayout>
          <PageShell
            title="Gift Guides Library"
            subtitle="Guides bundle curated ideas so you can duplicate, tweak, and share them with the people you shop for."
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gp-gold/40 bg-gp-cream/80 px-3 py-1 text-xs font-semibold text-gp-evergreen">
              <span>Experimental · Internal only</span>
              <span className="text-gp-evergreen/70">
                This Gift Guides workspace is still in early design and not part
                of the main GiftPerch experience yet.
              </span>
            </div>
            <GiftGuidesManager />
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
