"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const renderNavLink = (
    item: (typeof navItems)[number],
    variant: "desktop" | "mobile" = "desktop",
  ) => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);

    const desktopClasses = active
      ? "text-gp-cream font-semibold underline underline-offset-4"
      : "text-gp-cream/90 hover:text-gp-cream hover:underline underline-offset-4";
    const mobileClasses = active
      ? "text-gp-cream font-semibold"
      : "text-gp-cream/80";

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`rounded-full px-3 py-1 text-base font-semibold transition ${
          variant === "desktop" ? desktopClasses : mobileClasses
        }`}
        onClick={() => setMobileNavOpen(false)}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gp-cream/80 text-gp-evergreen">
      <header className="sticky top-0 z-40 border-b border-gp-evergreen/30 bg-gp-evergreen">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 sm:px-6 lg:px-0">
          <Link
            href="/"
            className="flex items-center gap-4 rounded-full bg-white/90 px-7 py-3 text-gp-evergreen shadow-sm"
          >
            <Image
              src="/giftperch_logo_background.png"
              alt="GiftPerch logo"
              width={68}
              height={68}
              className="h-16 w-16 rounded-full border border-gp-cream/30 object-cover"
              priority
            />
            <div className="text-gp-evergreen">
              <p className="text-3xl font-semibold text-gp-evergreen leading-tight">
                GiftPerch
              </p>
              <p className="text-xs uppercase tracking-[0.4em] text-gp-evergreen/70">
                Thoughtful gifting, reimagined
              </p>
            </div>
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <nav className="flex items-center gap-5">
              {navItems.map((item) => renderNavLink(item, "desktop"))}
            </nav>
            <Link
              href="/auth/login"
              className="rounded-full border border-gp-cream/40 bg-white/90 px-5 py-2 text-base font-semibold text-gp-evergreen transition hover:bg-gp-cream"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-gp-gold px-5 py-2 text-base font-semibold text-gp-evergreen transition hover:bg-gp-gold/90"
            >
              Get started
            </Link>
          </div>
          <button
            type="button"
            className="rounded-full border border-gp-cream/40 px-4 py-2 text-base font-semibold text-gp-cream transition hover:bg-gp-cream/20 sm:hidden"
            aria-expanded={mobileNavOpen}
            aria-label="Toggle navigation"
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            {mobileNavOpen ? "Close" : "Menu"}
          </button>
        </div>
        {mobileNavOpen ? (
          <div className="border-t border-gp-cream/20 bg-gp-evergreen px-4 py-4 text-sm text-gp-cream sm:hidden">
            <div className="flex flex-col gap-3">
              {navItems.map((item) => renderNavLink(item, "mobile"))}
              <Link
                href="/auth/login"
                className="rounded-full border border-gp-cream/40 px-3 py-2 text-center font-semibold text-gp-cream"
                onClick={() => setMobileNavOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-gp-gold px-4 py-2 text-center font-semibold text-gp-evergreen hover:bg-gp-gold/90"
                onClick={() => setMobileNavOpen(false)}
              >
                Get started
              </Link>
            </div>
          </div>
        ) : null}
      </header>
      <main
        id="gp-main-content"
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-6"
      >
        {children}
      </main>
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6 lg:px-6">
        <SiteFooter />
      </div>
    </div>
  );
}
