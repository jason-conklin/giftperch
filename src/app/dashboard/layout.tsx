import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppLayout } from "@/components/layout/AppLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading your dashboard...
        </div>
      }
    >
      <AuthGuard>
        <AppLayout>{children}</AppLayout>
      </AuthGuard>
    </Suspense>
  );
}
