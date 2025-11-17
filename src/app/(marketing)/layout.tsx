import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gp-cream/80 text-gp-evergreen">
      <header className="bg-white/90 shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gp-evergreen text-lg font-semibold text-gp-cream">
              GP
            </div>
            <div>
              <p className="text-lg font-semibold text-gp-evergreen">GiftPerch</p>
              <p className="text-xs uppercase tracking-wide text-gp-evergreen/70">
                Thoughtful gifting, reimagined
              </p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-gp-evergreen/80">
            <Link href="/features" className="hover:text-gp-evergreen">
              Features
            </Link>
            <Link href="/about" className="hover:text-gp-evergreen">
              About
            </Link>
            <Link href="/blog" className="hover:text-gp-evergreen">
              Blog
            </Link>
            <Link href="/auth/login" className="gp-secondary-button">
              Sign in
            </Link>
            <Link href="/auth/signup" className="gp-primary-button">
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main
        id="gp-main-content"
        className="mx-auto min-h-[60vh] w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-0"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
