import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageShell } from "@/components/layout/PageShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function SettingsPage() {
  return (
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
  );
}
