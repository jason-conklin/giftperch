"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
] as const;

const MenuIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      d="M4 7h16M4 12h16M4 17h16"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </svg>
);

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();
  const pathname = usePathname();
  const isLandingPage = pathname === "/";
  const [landingIntroComplete, setLandingIntroComplete] = useState(
    !isLandingPage,
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    const queueStateUpdate = (callback: () => void) => {
      timers.push(window.setTimeout(callback, 0));
    };

    if (!isLandingPage) {
      queueStateUpdate(() => setLandingIntroComplete(true));
      return () => timers.forEach((timerId) => window.clearTimeout(timerId));
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleIntroComplete = () => setLandingIntroComplete(true);

    if (reducedMotion.matches) {
      queueStateUpdate(() => setLandingIntroComplete(true));
      return () => timers.forEach((timerId) => window.clearTimeout(timerId));
    }

    queueStateUpdate(() => setLandingIntroComplete(false));
    window.addEventListener(
      "giftperch:landing-intro-complete",
      handleIntroComplete,
    );

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      window.removeEventListener(
        "giftperch:landing-intro-complete",
        handleIntroComplete,
      );
    };
  }, [isLandingPage, pathname]);

  const renderNavLink = (
    item: (typeof navItems)[number],
    variant: "desktop" | "mobile" = "desktop",
  ) => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);

    const desktopClasses = isLandingPage
      ? active
        ? "text-gp-evergreen font-semibold underline underline-offset-4"
        : "text-gp-evergreen/80 hover:text-gp-evergreen hover:underline underline-offset-4"
      : active
      ? "text-gp-cream font-semibold underline underline-offset-4"
      : "text-gp-cream/90 hover:text-gp-cream hover:underline underline-offset-4";
    const mobileClasses = isLandingPage
      ? active
        ? "text-gp-evergreen font-semibold"
        : "text-gp-evergreen/80"
      : active
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
    <div
      className="gp-marketing-shell gp-marketing-bg-premium relative flex min-h-screen w-full flex-col text-gp-evergreen"
      data-landing-intro={
        isLandingPage
          ? landingIntroComplete
            ? "complete"
            : "running"
          : "none"
      }
    >
      {isLandingPage ? (
        <style>{`
          .gp-marketing-shell[data-landing-intro="running"] .gp-landing-header {
            opacity: 0;
            transform: translateY(-110%);
          }

          .gp-marketing-shell[data-landing-intro="complete"] .gp-landing-header {
            opacity: 1;
            transform: translateY(0);
            transition:
              transform 700ms cubic-bezier(0.18, 0.72, 0.22, 1),
              opacity 450ms ease;
          }

          .gp-marketing-shell[data-landing-intro="running"] .gp-marketing-landing-arc::before {
            opacity: 0;
            transform: translateY(-110%);
          }

          .gp-marketing-shell[data-landing-intro="complete"] .gp-marketing-landing-arc::before {
            opacity: 1;
            transform: translateY(0);
            transition:
              transform 760ms cubic-bezier(0.18, 0.72, 0.22, 1),
              opacity 500ms ease;
          }

          @media (prefers-reduced-motion: reduce) {
            .gp-marketing-shell[data-landing-intro] .gp-landing-header,
            .gp-marketing-shell[data-landing-intro] .gp-marketing-landing-arc::before {
              opacity: 1;
              transform: none;
              transition: none;
            }
          }
        `}</style>
      ) : null}
      <header
        className={`sticky top-0 z-40 ${
          isLandingPage
            ? "gp-landing-header pt-3"
            : "border-b border-gp-evergreen/30 bg-gp-evergreen pt-2"
        }`}
      >
        <div
          className={`mx-auto flex max-w-5xl items-center justify-between ${
            isLandingPage
              ? "rounded-[1.85rem] border border-gp-evergreen/15 bg-white/82 px-3 py-2 shadow-sm backdrop-blur-sm sm:px-5 lg:px-6"
              : "px-3 pb-2 sm:px-6 lg:px-0 lg:pb-3"
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-full bg-white/90 px-3.5 py-1.5 text-gp-evergreen shadow-sm sm:gap-3 sm:px-5 sm:py-2"
          >
            <Image
              src="/giftperch_logo_background.png"
              alt="GiftPerch logo"
              width={68}
              height={68}
              className="h-9 w-9 rounded-full border border-gp-cream/30 object-cover sm:h-10 sm:w-10 lg:h-11 lg:w-11"
              priority
            />
            <div className="text-gp-evergreen">
              <p className="text-xl font-semibold leading-tight text-gp-evergreen drop-shadow-[0_1px_2px_rgba(15,61,62,0.2)] sm:text-2xl">
                GiftPerch
              </p>
              <p className="max-w-[170px] text-[9px] font-semibold uppercase tracking-[0.3em] text-gp-evergreen/70 sm:max-w-none sm:text-[10px] sm:tracking-[0.35em]">
                Thoughtful gifting, reimagined
              </p>
            </div>
          </Link>
          <div className="hidden items-center gap-2.5 sm:flex">
            <nav className="flex items-center gap-4">
              {navItems.map((item) => renderNavLink(item, "desktop"))}
            </nav>
            <Link
              href="/auth/login"
              className="gp-btn gp-btn--secondary gp-btn--sm px-4"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="gp-btn gp-btn--gold gp-btn--sm px-4"
            >
              Sign Up
            </Link>
          </div>
          <button
            type="button"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-gp-evergreen shadow-sm transition sm:hidden ${
              isLandingPage
                ? "border-gp-evergreen/25 bg-white hover:bg-gp-cream/80"
                : "border-gp-cream/40 bg-gp-cream/90 hover:bg-gp-cream"
            }`}
            aria-expanded={mobileNavOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            <MenuIcon className="h-4 w-4" />
          </button>
        </div>
        {mobileNavOpen ? (
          <div
            className={`px-4 py-3 text-sm sm:hidden ${
              isLandingPage
                ? "border-t border-gp-evergreen/12 bg-white/95 text-gp-evergreen"
                : "border-t border-gp-cream/20 bg-gp-evergreen text-gp-cream"
            }`}
          >
            <div className="flex flex-col gap-3">
              {navItems.map((item) => renderNavLink(item, "mobile"))}
              <Link
                href="/auth/login"
                className={`w-full justify-center ${
                  isLandingPage
                    ? "gp-btn gp-btn--ghost"
                    : "gp-btn gp-btn--secondary"
                }`}
                onClick={() => setMobileNavOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className={`w-full justify-center ${
                  isLandingPage
                    ? "gp-btn gp-btn--primary"
                    : "gp-btn gp-btn--gold"
                }`}
                onClick={() => setMobileNavOpen(false)}
              >
                Get started
              </Link>
            </div>
          </div>
        ) : null}
      </header>
      <div
        className={`gp-marketing-bottom-fade flex flex-1 flex-col ${
          isLandingPage ? "gp-marketing-landing-arc gp-hero-arc" : ""
        }`}
      >
        <main
          id="gp-main-content"
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-6"
        >
          {children}
        </main>
        <footer className="bg-transparent px-4 pb-8 sm:px-6 lg:px-6">
          <div className="mx-auto w-full max-w-4xl space-y-2 rounded-3xl border border-gp-evergreen/12 bg-white/42 px-5 py-5 text-center text-sm text-gp-evergreen/70 backdrop-blur-sm">
            <p>
              © {year} GiftPerch. Built by{" "}
              <Link
                href="https://jasonconklin.dev"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
              >
                Jason Conklin
              </Link>
              .
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs uppercase tracking-wide">
              <Link href="/privacy" className="hover:text-gp-evergreen">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-gp-evergreen">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-gp-evergreen">
                Contact
              </Link>
            </div>
            <p className="text-xs text-gp-evergreen/70">
              As an Amazon Associate, I earn from qualifying purchases.
            </p>
            <Link
              href="/recommended-amazon-gifts"
              className="text-xs text-gp-evergreen/70 hover:text-gp-evergreen hover:underline"
            >
              Curated Amazon gift ideas
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
