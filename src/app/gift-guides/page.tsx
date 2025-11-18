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
          subtitle="Guides bundle curated ideas so you can duplicate, tweak, and share them with the people you shop for."
        >
          <GiftGuidesManager />
        </PageShell>
      </AppLayout>
    </AuthGuard>
  );
}
