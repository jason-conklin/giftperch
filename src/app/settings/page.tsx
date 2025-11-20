import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageShell } from "@/components/layout/PageShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading settings...
        </div>
      }
    >
      <AuthGuard>
        <AppLayout>
          <PageShell
            title="Settings"
            subtitle="Tune your profile, reminders, and connections that power the GiftPerch experience."
          >
            <SettingsPanel />
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
