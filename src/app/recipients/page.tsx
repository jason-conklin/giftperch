import { PageShell } from "@/components/layout/PageShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RecipientsManager } from "@/components/recipients/RecipientsManager";

export default function RecipientsPage() {
  return (
    <AuthGuard>
      <PageShell
        title="Recipient Profiles"
        subtitle="Understand every person you shop for. Save their preferences, budgets, and key dates so PerchPal can help you find the perfect gift."
      >
        <RecipientsManager />
      </PageShell>
    </AuthGuard>
  );
}
