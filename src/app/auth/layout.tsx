import Image from "next/image";
import Link from "next/link";

const navItems = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
] as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="gp-marketing-shell gp-marketing-bg-premium relative flex min-h-screen w-full flex-col text-gp-evergreen">
      <header className="sticky top-0 z-40 pt-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between rounded-[1.85rem] border border-gp-evergreen/15 bg-white/82 px-3 py-2 shadow-sm backdrop-blur-sm sm:px-5 lg:px-6">
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
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1 text-base font-semibold text-gp-evergreen/80 transition hover:text-gp-evergreen hover:underline underline-offset-4"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link href="/auth/login" className="gp-btn gp-btn--secondary gp-btn--sm px-4">
              Login
            </Link>
            <Link href="/auth/signup" className="gp-btn gp-btn--gold gp-btn--sm px-4">
              Sign Up
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <Link href="/auth/login" className="gp-btn gp-btn--secondary gp-btn--sm px-3">
              Login
            </Link>
            <Link href="/auth/signup" className="gp-btn gp-btn--gold gp-btn--sm px-3">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <div className="gp-marketing-bottom-fade gp-marketing-landing-arc gp-hero-arc flex flex-1 flex-col">
        <main
          id="gp-main-content"
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
