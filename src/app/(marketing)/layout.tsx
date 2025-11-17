import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-6">
      <SiteHeader variant="marketing" />
      <main className="flex-1 rounded-3xl border border-gp-gold/30 bg-white/80 px-6 py-8 shadow-sm">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
