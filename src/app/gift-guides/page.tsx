import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageShell } from "@/components/layout/PageShell";
import { GiftGuidesManager } from "@/components/gift-guides/GiftGuidesManager";

export default function GiftGuidesPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <PageShell
          title="Gift Guides Library"
          subtitle="Curated collections you can duplicate, personalize, and share with your recipients."
        >
          <GiftGuidesManager />
        </PageShell>
      </AppLayout>
    </AuthGuard>
  );
}
