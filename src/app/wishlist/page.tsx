import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { WishlistManager } from "@/components/wishlist/WishlistManager";

export default function WishlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading wishlists...
        </div>
      }
    >
      <AuthGuard>
        <AppLayout>
          <PageShell
            title="My wishlists (optional)"
            subtitle="Keep a personal list of things you love for when friends ask. Skip it entirely if it’s not your style."
          >
            <WishlistManager />
          </PageShell>
        </AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
