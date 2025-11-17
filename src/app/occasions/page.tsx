import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageShell } from "@/components/layout/PageShell";
import { OccasionsManager } from "@/components/occasions/OccasionsManager";

export default function OccasionsPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <PageShell
          title="Occasions"
          subtitle="Track birthdays, anniversaries, and seasonal moments so PerchPal can send timely nudges."
        >
          <OccasionsManager />
        </PageShell>
      </AppLayout>
    </AuthGuard>
  );
}
