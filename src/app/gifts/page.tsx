import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PerchPalChat } from "@/components/perchpal/PerchPalChat";
import { GiftSuggestionsPanel } from "@/components/gifts/GiftSuggestionsPanel";

export default function GiftsPage() {
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
            title="AI Gift Ideas"
            subtitle="Chat with PerchPal and generate tailored gift suggestion lists for the people you shop for most."
          >
            <div className="space-y-6">
              <PerchPalChat />
              <GiftSuggestionsPanel />
            </div>
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
