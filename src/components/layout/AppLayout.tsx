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

const iconClasses = "h-4 w-4";

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
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${iconClasses} ${className ?? ""}`}
  >
    <path d="M7 20v-2a4 4 0 0 1 4-4h2" />
    <circle cx="9" cy="7" r="3" />
    <path d="M21 20v-2a4 4 0 0 0-4-4h-2" />
    <circle cx="17" cy="7" r="3" />
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

const BookIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`${iconClasses} ${className ?? ""}`}
  >
    <path d="M4 19.5a2.5 2.5 0 0 1 2.5-2.5H20" />
    <path d="M6.5 4.5H20v14H6.5A2.5 2.5 0 0 0 4 21" />
    <path d="M6.5 4.5a2.5 2.5 0 0 0-2.5 2.5V21" />
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
    <path d="M19.4 15a1.78 1.78 0 0 0 .37 2l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.78 1.78 0 0 0-2-.37 1.78 1.78 0 0 0-1 1.62v.17a2 2 0 1 1-4 0v-.17a1.78 1.78 0 0 0-1-1.62 1.78 1.78 0 0 0-2 .37l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.78 1.78 0 0 0 .37-2 1.78 1.78 0 0 0-1.62-1H4a2 2 0 1 1 0-4h.17a1.78 1.78 0 0 0 1.62-1 1.78 1.78 0 0 0-.37-2l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.78 1.78 0 0 0 2 .37h.09a1.78 1.78 0 0 0 1-1.62V2a2 2 0 1 1 4 0v.17a1.78 1.78 0 0 0 1 1.62h.09a1.78 1.78 0 0 0 2-.37l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.78 1.78 0 0 0-.37 2v.09a1.78 1.78 0 0 0 1.62 1H22a2 2 0 1 1 0 4h-.17a1.78 1.78 0 0 0-1.62 1Z" />
  </svg>
);

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "Recipients", href: "/recipients", icon: RecipientsIcon },
  { label: "Gift Ideas", href: "/gifts", icon: SparkIcon },
  { label: "History", href: "/history", icon: ClockIcon },
  { label: "Occasions", href: "/occasions", icon: CalendarIcon },
  { label: "Gift Guides", href: "/gift-guides", icon: BookIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

const initialsFromText = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
          className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold transition ${
            active
              ? "bg-gp-cream text-gp-evergreen"
              : "bg-white/10 text-gp-cream/70 hover:bg-white/20"
          }`}
        >
          <Icon className="h-4 w-4" />
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
          active
            ? "bg-gp-cream text-gp-evergreen shadow-sm"
            : "text-gp-cream/80 hover:bg-white/10 hover:text-gp-cream"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
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
          desktopSidebarExpanded ? "w-64" : "w-16"
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
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border border-white/20 object-cover transition hover:scale-[1.02]"
                priority
              />
            </Link>
            {desktopSidebarExpanded ? (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold leading-tight">
                  GiftPerch
                </span>
                <span className="text-xs text-gp-cream/70">PerchPal HQ</span>
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
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gp-cream text-xs font-semibold text-gp-evergreen">
                {effectiveProfileSummary.avatar_url ? (
                  <Image
                    src={effectiveProfileSummary.avatar_url}
                    alt="Account avatar"
                    width={36}
                    height={36}
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

      <div className="flex min-h-screen flex-col pl-20 sm:pl-24 lg:pl-28">
        <div className="md:hidden">
          <div className="flex items-center justify-between border-b border-gp-evergreen/10 bg-white/90 px-4 py-3 text-gp-evergreen shadow-sm">
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
