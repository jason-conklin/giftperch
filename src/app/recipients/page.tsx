import { PageShell } from "@/components/layout/PageShell";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RecipientsManager } from "@/components/recipients/RecipientsManager";

export default function RecipientsPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <PageShell
          title="Recipient Profiles"
          subtitle="Understand every person you shop for. Save their preferences, budgets, and key dates so PerchPal can help you find the perfect gift."
        >
          <RecipientsManager />
        </PageShell>
      </AppLayout>
    </AuthGuard>
  );
}
