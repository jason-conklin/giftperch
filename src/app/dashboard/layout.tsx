import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-6">
        <SiteHeader variant="dashboard" />
        <main className="flex-1 rounded-3xl border border-gp-evergreen/15 bg-white/90 px-6 py-8 shadow-sm">
          {children}
        </main>
        <SiteFooter />
      </div>
    </AuthGuard>
  );
}
