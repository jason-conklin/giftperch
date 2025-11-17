import { AuthGuard } from "@/components/auth/AuthGuard";
import { PageShell } from "@/components/layout/PageShell";
import { GiftHistoryTable } from "@/components/gifts/GiftHistoryTable";

export default function GiftHistoryPage() {
  return (
    <AuthGuard>
      <PageShell
        title="Gift History"
        subtitle="See what you’ve given, when, and to whom—so you never repeat a gift or lose a great idea."
      >
        <GiftHistoryTable />
      </PageShell>
    </AuthGuard>
  );
}
