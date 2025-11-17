import { PageShell } from "@/components/layout/PageShell";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { WishlistManager } from "@/components/wishlist/WishlistManager";

export default function WishlistPage() {
  return (
    <AuthGuard>
      <AppLayout>
        <PageShell
          title="Your Wishlist"
          subtitle="This becomes your gifting identity - the place friends and family can shop from when they want to surprise you."
        >
          <WishlistManager />
        </PageShell>
      </AppLayout>
    </AuthGuard>
  );
}
