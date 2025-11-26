"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const EMPTY_PROFILE_SUMMARY = {
  display_name: null,
  avatar_url: null,
};

type AppLayoutProps = {
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
  icon: (props: { className?: string }) => ReactElement;
};

const iconClasses = "h-10 w-10";

const DashboardIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${iconClasses} ${className ?? ""}`}
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

const RecipientsIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`${iconClasses} ${className ?? ""}`}
    fill="currentColor"
  >
    {/* Back person */}
    <circle cx="15.5" cy="9.4" r="2.8" />
    <path d="M11.2 20v-2c0-2.8 2-4.8 4.2-4.8s4.2 2 4.2 4.8v2h-8.4z" />

    {/* Front person */}
    <circle cx="8.5" cy="8.4" r="3.2" />
    <path d="M3 20v-2c0-3.2 2.4-5.5 5.5-5.5S14 14.8 14 18v2H3z" />
  </svg>
);



const SparkIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${iconClasses} ${className ?? ""}`}
  >
    <path d="M12 3v4" />
    <path d="M12 17v4" />
    <path d="m4.93 4.93 2.83 2.83" />
    <path d="m16.24 16.24 2.83 2.83" />
    <path d="M3 12h4" />
    <path d="M17 12h4" />
    <path d="m4.93 19.07 2.83-2.83" />
    <path d="m16.24 7.76 2.83-2.83" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${iconClasses} ${className ?? ""}`}
  >
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${iconClasses} ${className ?? ""}`}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${iconClasses} ${className ?? ""}`}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.17a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.17a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.17a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.17a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "Recipients", href: "/recipients", icon: RecipientsIcon },
  { label: "Gift Ideas", href: "/gifts", icon: SparkIcon },
  { label: "Occasions", href: "/occasions", icon: CalendarIcon },
  { label: "History", href: "/history", icon: ClockIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

const initialsFromText = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const MenuIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M4 7h16M4 12h16M4 17h16"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </svg>
);

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(false);
  const currentYear = new Date().getFullYear();
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const [profileSummary, setProfileSummary] = useState<{
    display_name: string | null;
    avatar_url: string | null;
  }>(EMPTY_PROFILE_SUMMARY);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          setProfileSummary({
            display_name: data.display_name,
            avatar_url: data.avatar_url,
          });
        } else {
          setProfileSummary(EMPTY_PROFILE_SUMMARY);
        }
      });
    return () => {
      active = false;
    };
  }, [supabase, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfileSummary({
            display_name:
              (payload.new as { display_name: string | null })?.display_name ??
              null,
            avatar_url:
              (payload.new as { avatar_url: string | null })?.avatar_url ?? null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id]);

  const effectiveProfileSummary = user ? profileSummary : EMPTY_PROFILE_SUMMARY;

  const accountInitials = initialsFromText(
    effectiveProfileSummary.display_name || user?.email || "GP"
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const renderDesktopNavLink = (item: NavItem, expanded: boolean) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    if (!expanded) {
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          title={item.label}
          className={`flex h-16 w-16 items-center justify-center rounded-2xl text-base font-semibold transition ${
            active
              ? "bg-gp-cream text-gp-evergreen"
              : "bg-white/10 text-gp-cream/70 hover:bg-white/20"
          }`}
        >
          <Icon className="h-6 w-6" />
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-base font-semibold transition ${
          active
            ? "bg-gp-cream text-gp-evergreen shadow-sm"
            : "text-gp-cream/80 hover:bg-white/10 hover:text-gp-cream"
        }`}
      >
        <Icon className="h-12 w-12 shrink-0" />
        <span className="whitespace-nowrap">{item.label}</span>
      </Link>
    );
  };

  const renderMobileNavLink = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
          active
            ? "bg-gp-evergreen text-gp-cream"
            : "text-gp-evergreen hover:bg-gp-cream/70"
        }`}
        onClick={() => setMobileNavOpen(false)}
      >
        {item.label}
      </Link>
    );
  };

  const handleSidebarBlur = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(next)) {
      setDesktopSidebarExpanded(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gp-cream/80 text-gp-evergreen">
      <aside
        ref={sidebarRef}
        tabIndex={0}
        onFocusCapture={() => setDesktopSidebarExpanded(true)}
        onBlurCapture={handleSidebarBlur}
        onMouseEnter={() => setDesktopSidebarExpanded(true)}
        onMouseLeave={() => {
          const activeElement =
            typeof document !== "undefined" ? document.activeElement : null;
          if (activeElement && sidebarRef.current?.contains(activeElement)) {
            return;
          }
          setDesktopSidebarExpanded(false);
        }}
        className={`fixed left-0 top-0 bottom-0 z-40 hidden overflow-hidden border-r border-gp-evergreen/15 bg-gradient-to-b from-gp-evergreen to-[#0b2d2d] text-gp-cream shadow-sm transition-[width] duration-200 ease-out md:flex ${
          desktopSidebarExpanded ? "w-64" : "w-20"
        }`}
      >
        <div className="flex h-full w-full flex-col">
          <div
            className={`flex items-center border-b border-gp-evergreen/20 px-3 py-4 ${
              desktopSidebarExpanded ? "gap-3" : "justify-center"
            }`}
          >
            <Link
              href="/dashboard"
              aria-label="Go to dashboard"
              className="inline-flex"
            >
              <Image
                src="/giftperch_logo_background.png"
                alt="GiftPerch logo"
                width={72}
                height={72}
                className="h-14 w-14 rounded-full border border-white/20 object-cover transition hover:scale-[1.02]"
                priority
              />
            </Link>
            {desktopSidebarExpanded ? (
              <div className="flex flex-col overflow-hidden">
                <span className="text-lg font-semibold leading-tight">
                  GiftPerch
                </span>
                <span className="text-sm text-gp-cream/70">PerchPal HQ</span>
              </div>
            ) : null}
          </div>

          <nav className="flex-1 space-y-2 px-2 py-4">
            {navItems.map((item) =>
              renderDesktopNavLink(item, desktopSidebarExpanded)
            )}
          </nav>

          <div className="border-t border-white/10 px-2 py-4">
            <Link
              href="/settings"
              className={`flex items-center rounded-2xl px-2 py-2 transition hover:bg-white/10 ${
                desktopSidebarExpanded ? "gap-3" : "justify-center"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gp-cream text-sm font-semibold text-gp-evergreen">
                {effectiveProfileSummary.avatar_url ? (
                  <Image
                    src={effectiveProfileSummary.avatar_url}
                    alt="Account avatar"
                    width={44}
                    height={44}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  accountInitials
                )}
              </div>
              <div
                className={`min-w-0 flex-1 transition-opacity duration-150 ${
                  desktopSidebarExpanded
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                <p className="truncate text-xs font-semibold">
                  {effectiveProfileSummary.display_name ||
                    user?.email ||
                    "Manage account"}
                </p>
                <p className="truncate text-[11px] text-gp-cream/70">
                  Manage account
                </p>
              </div>
            </Link>
            <p
              className={`mt-3 text-center text-[11px] text-gp-cream/50 transition-opacity duration-150 ${
                desktopSidebarExpanded
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }`}
            >
              &copy; {currentYear} GiftPerch
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-28">
        <div className="md:hidden">
          <div className="flex items-center justify-between border-b border-gp-evergreen/20 bg-gp-evergreen px-4 py-3 text-gp-cream shadow-sm">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                aria-label="Go to dashboard"
                className="inline-flex"
              >
                <Image
                  src="/giftperch_logo_background.png"
                  alt="GiftPerch logo"
                  width={72}
                  height={72}
                  className="h-18 w-18 rounded-full border border-gp-cream/40 object-cover transition hover:scale-[1.02]"
                  priority
                />
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gp-cream/70">
                  PerchPal HQ
                </p>
                <p className="text-base font-semibold text-gp-cream">Your gifting workspace</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex items-center justify-center rounded-full border border-gp-cream/40 bg-gp-cream/90 px-3 py-2 text-gp-evergreen shadow-sm transition hover:bg-gp-cream"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
          </div>
          {mobileNavOpen ? (
            <nav className="space-y-1 border-b border-gp-evergreen/10 bg-white px-4 py-4 text-sm text-gp-evergreen">
              {navItems.map((item) => renderMobileNavLink(item))}
            </nav>
          ) : null}
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
