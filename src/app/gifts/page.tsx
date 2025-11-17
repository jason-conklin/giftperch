import { PageShell } from "@/components/layout/PageShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PerchPalChat } from "@/components/perchpal/PerchPalChat";
import { GiftSuggestionsPanel } from "@/components/gifts/GiftSuggestionsPanel";

export default function GiftsPage() {
  return (
    <AuthGuard>
      <PageShell
        title="AI Gift Ideas"
        subtitle="Chat with PerchPal and generate tailored gift suggestion lists for the people you shop for most."
      >
        <div className="space-y-6">
          <PerchPalChat />
          <GiftSuggestionsPanel />
        </div>
      </PageShell>
    </AuthGuard>
  );
}
