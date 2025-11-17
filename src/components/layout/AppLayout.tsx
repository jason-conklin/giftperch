"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Recipients", href: "/recipients" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Gift Ideas", href: "/gifts" },
  { label: "History", href: "/history" },
  { label: "Occasions", href: "/occasions" },
  { label: "Gift Guides", href: "/gift-guides" },
  { label: "Blog", href: "/blog" },
  { label: "Settings", href: "/settings" },
];

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const renderLink = (item: NavItem, variant: "desktop" | "mobile") => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const baseClasses =
      "flex items-center rounded-2xl px-3 py-2 text-sm font-semibold transition";
    const desktopStates = active
      ? "bg-gp-cream text-gp-evergreen"
      : "text-gp-cream/80 hover:bg-white/10 hover:text-gp-cream";
    const mobileStates = active
      ? "bg-gp-evergreen text-gp-cream"
      : "text-gp-evergreen hover:bg-gp-cream/70";

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`${baseClasses} ${
          variant === "desktop" ? desktopStates : mobileStates
        }`}
        onClick={
          variant === "mobile" ? () => setMobileNavOpen(false) : undefined
        }
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gp-cream/80 text-gp-evergreen">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col border-r border-gp-evergreen/15 bg-gradient-to-b from-gp-evergreen to-[#0b2d2d] text-gp-cream md:flex">
          <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
            <Link
              href="/dashboard"
              aria-label="Go to dashboard"
              className="inline-flex"
            >
              <Image
                src="/giftperch_logo_background.png"
                alt="GiftPerch logo"
                width={44}
                height={44}
                className="h-11 w-11 rounded-full border border-white/20 object-cover transition hover:scale-[1.02]"
                priority
              />
            </Link>
            <div>
              <p className="text-sm font-semibold leading-tight">GiftPerch</p>
              <p className="text-xs uppercase tracking-wide text-gp-cream/70">
                PerchPal HQ
              </p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6 text-sm">
            {navItems.map((item) => renderLink(item, "desktop"))}
          </nav>
          <div className="border-t border-white/10 px-6 py-4 text-xs text-gp-cream/70">
            &copy; {currentYear} GiftPerch
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-gp-evergreen/10 bg-white/90 px-4 py-3 text-gp-evergreen shadow-sm md:hidden">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                aria-label="Go to dashboard"
                className="inline-flex"
              >
                <Image
                  src="/giftperch_logo_background.png"
                  alt="GiftPerch logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full border border-gp-evergreen/20 object-cover transition hover:scale-[1.02]"
                  priority
                />
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
                  PerchPal HQ
                </p>
                <p className="text-sm font-semibold">Your gifting workspace</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="gp-secondary-button px-3 py-1 text-xs font-semibold"
            >
              {mobileNavOpen ? "Close" : "Menu"}
            </button>
          </div>
          {mobileNavOpen ? (
            <nav className="space-y-1 border-b border-gp-evergreen/10 bg-white px-4 py-4 text-sm text-gp-evergreen md:hidden">
              {navItems.map((item) => renderLink(item, "mobile"))}
            </nav>
          ) : null}
          <main
            id="gp-main-content"
            role="main"
            className="flex flex-1 flex-col bg-gp-cream/40"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
