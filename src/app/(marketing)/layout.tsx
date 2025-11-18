"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";

const navItems = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
] as const;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const renderNavLink = (item: (typeof navItems)[number]) => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);

    const baseClasses =
      "rounded-full px-3 py-1 text-sm font-semibold transition";
    const activeClasses = active
      ? "bg-white/90 text-gp-evergreen shadow-sm"
      : "text-gp-cream/80 hover:text-gp-cream";

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`${baseClasses} ${activeClasses}`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gp-cream/80 text-gp-evergreen">
      <header className="bg-gp-evergreen text-gp-cream shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-0">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/giftperch_logo_background.png"
              alt="GiftPerch logo"
              width={44}
              height={44}
              className="h-11 w-11 rounded-full border border-white/30 object-cover"
              priority
            />
            <div>
              <p className="text-lg font-semibold text-gp-cream">GiftPerch</p>
              <p className="text-xs uppercase tracking-wide text-gp-cream/70">
                Thoughtful gifting, reimagined
              </p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-3">
            {navItems.map(renderNavLink)}
            <Link
              href="/auth/login"
              className="gp-secondary-button border border-white/40 text-gp-evergreen hover:bg-white/15"
            >
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
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-0"
      >
        {children}
      </main>
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6 lg:px-0">
        <SiteFooter />
      </div>
    </div>
  );
}
