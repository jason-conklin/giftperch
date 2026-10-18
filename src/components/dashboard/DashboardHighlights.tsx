"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Gift,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getDefaultUsHolidaysForYear } from "@/lib/holidays";
import {
  getMatchedProductPresentation,
  getSafeImageUrl,
} from "@/lib/affiliateProduct";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import { GettingStartedCard } from "@/components/dashboard/GettingStartedCard";
import { RotatingImageStack } from "@/components/dashboard/RotatingImageStack";
import {
  fetchDashboardStats,
  type DashboardStats,
} from "@/lib/dashboardStats";
import {
  buildRecipientPreviewGroups,
  buildSavedGiftPreviewGroups,
  buildSuggestionRunPreviewGroups,
  type DashboardSuggestionRunPreview,
} from "@/lib/dashboardPreviews";

type RecipientSummary = {
  id: string;
  name: string;
  birthday: string | null;
  avatar_url: string | null;
  avatar_icon: string | null;
};

type RecipientEventRow = {
  id: string;
  label: string | null;
  event_date: string | null;
  recipient_id: string | null;
};

type AiInteraction = {
  message: string;
  created_at: string;
};

type SavedGiftSummary = {
  id: string;
  recipient_id: string;
  title: string;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  image_url: string | null;
  product_match: unknown;
  created_at: string;
};

type UpcomingEvent = {
  id: string;
  date: Date;
  label: string;
};

type OccasionType =
  | "birthday"
  | "christmas"
  | "anniversary"
  | "graduation"
  | "gift"
  | "valentines"
  | "mothersday"
  | "fathersday"
  | "newyears"
  | "thanksgiving"
  | "halloween";

const parseDateOnly = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  return new Date(year, month, day);
};

const formatFullDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const buildCountdownLabel = (target: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(target);
  targetDay.setHours(0, 0, 0, 0);
  const days = Math.max(
    0,
    Math.round((targetDay.getTime() - today.getTime()) / 86_400_000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "1 day away";
  return `${days} days away`;
};

const getOccasionType = (name: string): OccasionType => {
  const normalized = name.toLowerCase();
  if (normalized.includes("birthday")) return "birthday";
  if (normalized.includes("christmas")) return "christmas";
  if (normalized.includes("anniversary") || normalized.includes("wedding")) {
    return "anniversary";
  }
  if (normalized.includes("graduation")) return "graduation";
  if (normalized.includes("valentine")) return "valentines";
  if (normalized.includes("mother")) return "mothersday";
  if (normalized.includes("father")) return "fathersday";
  if (normalized.includes("new year")) return "newyears";
  if (normalized.includes("thanksgiving")) return "thanksgiving";
  if (normalized.includes("halloween")) return "halloween";
  return "gift";
};

const getOccasionIcon = (type: OccasionType) => {
  const icons: Record<OccasionType, { src: string; alt: string }> = {
    birthday: {
      src: "/icons/occasions/icon-occasion-birthday.png",
      alt: "Birthday",
    },
    christmas: {
      src: "/icons/occasions/icon-occasion-christmas.png",
      alt: "Christmas",
    },
    anniversary: {
      src: "/icons/occasions/icon-occasion-anniversary.png",
      alt: "Anniversary",
    },
    graduation: {
      src: "/icons/occasions/icon-occasion-graduation.png",
      alt: "Graduation",
    },
    gift: {
      src: "/icons/occasions/icon-occasion-gift.png",
      alt: "Occasion",
    },
    valentines: {
      src: "/icons/occasions/icon-occasion-valentines.png",
      alt: "Valentine's Day",
    },
    mothersday: {
      src: "/icons/occasions/icon-occasion-mothersday.png",
      alt: "Mother's Day",
    },
    fathersday: {
      src: "/icons/occasions/icon-occasion-fathersday.png",
      alt: "Father's Day",
    },
    newyears: {
      src: "/icons/occasions/icon-occasion-newyears.png",
      alt: "New Year's Day",
    },
    thanksgiving: {
      src: "/icons/occasions/icon-occasion-thanksgiving.png",
      alt: "Thanksgiving",
    },
    halloween: {
      src: "/icons/occasions/icon-occasion-halloween.png",
      alt: "Halloween",
    },
  };
  return icons[type];
};

const formatEstimatedPrice = (gift: SavedGiftSummary) => {
  const min = gift.estimated_price_min;
  const max = gift.estimated_price_max;
  if (min === null && max === null) return null;
  if (min !== null && max !== null && min !== max) {
    return `$${min.toFixed(0)}–$${max.toFixed(0)}`;
  }
  return `$${(min ?? max ?? 0).toFixed(2)}`;
};

function DashboardPanel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gp-app-evergreen/10 bg-white/94 p-4 shadow-[0_10px_30px_rgba(15,61,62,0.055)] sm:p-5">
      {children}
    </section>
  );
}

export function DashboardHighlights() {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [events, setEvents] = useState<RecipientEventRow[]>([]);
  const [recentGifts, setRecentGifts] = useState<SavedGiftSummary[]>([]);
  const [recentRuns, setRecentRuns] = useState<
    DashboardSuggestionRunPreview[]
  >([]);
  const [latestInteraction, setLatestInteraction] =
    useState<AiInteraction | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [
          recipientResult,
          interactionResult,
          savedGiftResult,
          suggestionRunResult,
          statsResult,
        ] = await Promise.all([
            supabase
              .from("recipient_profiles")
              .select("id, name, birthday, avatar_url, avatar_icon")
              .eq("user_id", user.id)
              .eq("is_self", false)
              .order("created_at", { ascending: true }),
            supabase
              .from("ai_interactions")
              .select("message, created_at")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("recipient_saved_gift_ideas")
              .select(
                "id, recipient_id, title, estimated_price_min, estimated_price_max, image_url, product_match, created_at",
              )
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(10),
            supabase
              .from("gift_suggestions")
              .select("id, recipient_id, suggestions")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(10),
            fetchDashboardStats(supabase, user.id),
          ]);

        if (recipientResult.error) throw recipientResult.error;
        if (savedGiftResult.error) throw savedGiftResult.error;
        if (suggestionRunResult.error) throw suggestionRunResult.error;
        if (!active) return;

        const recipientList =
          (recipientResult.data ?? []) as RecipientSummary[];
        setRecipients(recipientList);
        setLatestInteraction(interactionResult.data ?? null);
        setRecentGifts((savedGiftResult.data ?? []) as SavedGiftSummary[]);
        setRecentRuns(
          (suggestionRunResult.data ?? []) as DashboardSuggestionRunPreview[],
        );
        setStats(statsResult);

        if (recipientList.length) {
          const { data: eventRows, error: eventError } = await supabase
            .from("recipient_events")
            .select("id, label, event_date, recipient_id")
            .in(
              "recipient_id",
              recipientList.map((recipient) => recipient.id),
            );
          if (eventError) throw eventError;
          if (active) setEvents((eventRows ?? []) as RecipientEventRow[]);
        } else {
          setEvents([]);
        }
      } catch (caught) {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load dashboard data.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [supabase, user?.id]);

  const upcomingOccasions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming: UpcomingEvent[] = [];

    recipients.forEach((recipient) => {
      const birthday = parseDateOnly(recipient.birthday);
      if (!birthday) return;
      const nextBirthday = new Date(
        today.getFullYear(),
        birthday.getMonth(),
        birthday.getDate(),
      );
      if (nextBirthday < today) {
        nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
      }
      upcoming.push({
        id: `birthday-${recipient.id}`,
        date: nextBirthday,
        label: `${recipient.name}'s birthday`,
      });
    });

    events.forEach((event) => {
      const eventDate = parseDateOnly(event.event_date);
      if (!eventDate || eventDate < today) return;
      upcoming.push({
        id: event.id,
        date: eventDate,
        label: event.label ?? "Upcoming occasion",
      });
    });

    [today.getFullYear(), today.getFullYear() + 1].forEach((year) => {
      getDefaultUsHolidaysForYear(year).forEach((holiday) => {
        const holidayDate = new Date(holiday.date);
        if (Number.isNaN(holidayDate.getTime())) return;
        holidayDate.setHours(0, 0, 0, 0);
        if (holidayDate < today) return;
        upcoming.push({
          id: holiday.id,
          date: holidayDate,
          label: holiday.title,
        });
      });
    });

    return upcoming
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);
  }, [events, recipients]);

  const recipientMap = useMemo(
    () => new Map(recipients.map((recipient) => [recipient.id, recipient])),
    [recipients],
  );
  const recipientPreviews = useMemo(
    () => buildRecipientPreviewGroups(recipients),
    [recipients],
  );
  const savedGiftPreviews = useMemo(
    () => buildSavedGiftPreviewGroups(recentGifts, recipientMap),
    [recentGifts, recipientMap],
  );
  const suggestionRunPreviews = useMemo(
    () => buildSuggestionRunPreviewGroups(recentRuns, recipientMap),
    [recentRuns, recipientMap],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-gp-app-evergreen/10 bg-white/80 p-6">
        <PerchPalLoader
          variant="inline"
          size="sm"
          message="Loading dashboard insights..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const nextOccasion = upcomingOccasions[0] ?? null;
  const nextOccasionIcon = getOccasionIcon(
    nextOccasion ? getOccasionType(nextOccasion.label) : "gift",
  );
  const dashboardStats = stats as DashboardStats;
  const onboardingCompletedByData =
    dashboardStats.recipientCount > 0 &&
    (dashboardStats.suggestionRunCount > 0 || dashboardStats.savedGiftCount > 0);

  return (
    <div className="space-y-5">
      <GettingStartedCard
        recipientCount={dashboardStats.recipientCount}
        userId={user?.id ?? null}
        onboardingCompleted={onboardingCompletedByData}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            recipientPreviews.length ? (
              <RotatingImageStack
                groups={recipientPreviews}
                label="Recipient avatars"
              />
            ) : (
              <Users aria-hidden="true" className="h-5 w-5" />
            )
          }
          label="Recipients"
          value={dashboardStats.recipientCount.toLocaleString()}
          detail="People in your gift list"
          emphasizeDetail
          href="/recipients"
          action="Manage recipients"
        />
        <SummaryCard
          icon={
            <span className="relative block h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-[#eef4e9] shadow-[0_3px_10px_rgba(15,61,62,0.14)]">
              <Image
                src={nextOccasionIcon.src}
                alt=""
                fill
                sizes="48px"
                className="object-contain p-1"
              />
            </span>
          }
          label="Next occasion"
          value={nextOccasion?.label ?? "Nothing scheduled"}
          detail={
            nextOccasion
              ? formatFullDate(nextOccasion.date)
              : "Add an occasion to get reminders"
          }
          badge={nextOccasion ? buildCountdownLabel(nextOccasion.date) : null}
          href="/occasions"
          action="View occasions"
        />
        <SummaryCard
          icon={
            savedGiftPreviews.length ? (
              <RotatingImageStack
                groups={savedGiftPreviews}
                label="Saved gift previews"
              />
            ) : (
              <Gift aria-hidden="true" className="h-5 w-5" />
            )
          }
          label="Saved gifts"
          value={dashboardStats.savedGiftCount.toLocaleString()}
          detail="Ideas you have saved"
          emphasizeDetail
          href="/history"
          action="View saved gifts"
        />
        <SummaryCard
          icon={
            suggestionRunPreviews.length ? (
              <RotatingImageStack
                groups={suggestionRunPreviews}
                label="Gift idea run previews"
              />
            ) : (
              <Sparkles aria-hidden="true" className="h-5 w-5" />
            )
          }
          label="Gift idea runs"
          value={dashboardStats.suggestionRunCount.toLocaleString()}
          detail="Personalized recommendation runs"
          emphasizeDetail
          href="/history"
          action="View history"
        />
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-gp-app-evergreen/10 bg-[linear-gradient(100deg,rgba(226,236,222,0.82),rgba(255,252,245,0.92))] px-5 py-4 shadow-[0_10px_28px_rgba(15,61,62,0.045)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fff4cf]">
            <Image
              src="/giftperch_perchpal_front.png"
              alt="PerchPal"
              width={52}
              height={52}
              className="h-12 w-12 object-contain"
            />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-gp-app-evergreen sm:text-2xl">
              Ask PerchPal for a gift idea
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-gp-app-muted">
              Not sure what to buy next? Get thoughtful recommendations based
              on your recipients, interests, and upcoming occasions.
            </p>
            {latestInteraction?.message ? (
              <p className="mt-1 truncate text-xs text-gp-app-evergreen/55">
                Recent activity: {latestInteraction.message}
              </p>
            ) : null}
          </div>
        </div>
        <Link
          href="/gifts"
          className="gp-btn gp-btn--primary gp-btn--md shrink-0 justify-center"
        >
          <MessageCircle aria-hidden="true" className="h-4 w-4" />
          Chat with PerchPal
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
        <DashboardPanel>
          <PanelHeading
            icon={<CalendarDays aria-hidden="true" className="h-5 w-5" />}
            title="Upcoming occasions"
            href="/occasions"
          />
          {upcomingOccasions.length ? (
            <ul className="mt-4 space-y-2">
              {upcomingOccasions.map((occasion) => {
                const occasionIcon = getOccasionIcon(
                  getOccasionType(occasion.label),
                );
                return (
                  <li key={occasion.id}>
                    <Link
                      href="/occasions"
                      className="group flex items-center gap-3 rounded-xl border border-gp-app-evergreen/8 bg-gp-app-surface-warm px-3 py-2.5 transition hover:border-gp-app-evergreen/18 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef4e9]">
                        <Image
                          src={occasionIcon.src}
                          alt={occasionIcon.alt}
                          width={36}
                          height={36}
                          className="h-8 w-8 object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gp-app-evergreen">
                          {occasion.label}
                        </span>
                        <span className="block truncate text-xs text-gp-app-muted">
                          {formatFullDate(occasion.date)}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[#fff4cf] px-2.5 py-1 text-[11px] font-semibold text-[#805a16]">
                        {buildCountdownLabel(occasion.date)}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-gp-app-muted transition group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl bg-gp-app-surface-warm p-5 text-sm text-gp-app-muted">
              Add birthdays or occasions to see what is coming up next.
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel>
          <PanelHeading
            icon={<Sparkles aria-hidden="true" className="h-5 w-5" />}
            title="Recent gift ideas"
            href="/history"
          />
          {recentGifts.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {recentGifts.slice(0, 3).map((gift) => (
                <RecentGiftCard key={gift.id} gift={gift} />
              ))}
            </div>
          ) : (
            <div className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gp-app-evergreen/15 bg-gp-app-surface-warm p-6 text-center">
              <Gift
                aria-hidden="true"
                className="h-7 w-7 text-gp-app-gold-strong"
              />
              <p className="mt-3 text-sm font-semibold text-gp-app-evergreen">
                No saved gift ideas yet
              </p>
              <p className="mt-1 text-xs text-gp-app-muted">
                Save a recommendation and it will appear here.
              </p>
              <Link
                href="/gifts"
                className="gp-btn gp-btn--secondary gp-btn--sm mt-4"
              >
                Find gift ideas
              </Link>
            </div>
          )}
        </DashboardPanel>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <QuickAction
          icon={<Gift aria-hidden="true" className="h-6 w-6" />}
          href="/recipients"
          title="Create a new recipient profile"
          description="Capture their interests, budgets, key dates, and gift history in one place."
        />
        <QuickAction
          icon={<Sparkles aria-hidden="true" className="h-6 w-6" />}
          href="/gifts"
          title="Generate fresh gift ideas"
          description="Get personalized recommendations from PerchPal in seconds."
        />
        <QuickAction
          icon={<Clock3 aria-hidden="true" className="h-6 w-6" />}
          href="/history"
          title="Explore your gift history"
          description="Review past ideas so you do not repeat yourself next time."
        />
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  emphasizeDetail = false,
  badge,
  href,
  action,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  emphasizeDetail?: boolean;
  badge?: string | null;
  href: string;
  action: string;
}) {
  return (
    <article className="flex min-h-44 flex-col rounded-2xl border border-gp-app-evergreen/10 bg-white/94 p-4 shadow-[0_10px_30px_rgba(15,61,62,0.05)]">
      <div className="flex min-h-12 items-center gap-3">
        <span className="flex shrink-0 items-center justify-center text-gp-app-evergreen">
          {icon}
        </span>
        <p className="min-w-0 break-words text-sm font-medium text-gp-app-evergreen/80">
          {label}
        </p>
      </div>
      <div className="mt-2 flex min-h-8 max-w-full flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="max-w-full shrink-0 break-words font-display text-[1.65rem] font-semibold leading-8 text-gp-app-evergreen">
          {value}
        </p>
        <div className="flex min-w-fit max-w-full flex-wrap items-center gap-2">
          <p
            className={`break-words leading-4 text-gp-app-muted ${
              emphasizeDetail ? "text-[13px]" : "text-xs"
            }`}
          >
            {detail}
          </p>
          {badge ? (
            <span className="shrink-0 rounded-full bg-[#fff3c8] px-2 py-1 text-[10px] font-semibold text-[#805a16]">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
      <Link
        href={href}
        className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-[#d8a628]/70 bg-[linear-gradient(180deg,#f4cf62_0%,#e6b438_100%)] px-3 py-2 text-xs font-semibold text-gp-app-evergreen shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_3px_8px_rgba(154,111,24,0.16)] transition hover:border-[#c68f17] hover:bg-[linear-gradient(180deg,#f7d979_0%,#e9ba42_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_5px_12px_rgba(154,111,24,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-evergreen focus-visible:ring-offset-2 active:translate-y-px active:shadow-[inset_0_1px_2px_rgba(128,90,22,0.18)]"
      >
        {action}
        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

function PanelHeading({
  icon,
  title,
  href,
}: {
  icon: ReactNode;
  title: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4e9] text-gp-app-evergreen">
          {icon}
        </span>
        <h2 className="font-display text-xl font-semibold text-gp-app-evergreen">
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gp-app-evergreen hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
      >
        View all
        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function RecentGiftCard({ gift }: { gift: SavedGiftSummary }) {
  const product = getMatchedProductPresentation(gift.product_match);
  const imageUrl =
    product?.match.imageUrl ?? getSafeImageUrl(gift.image_url) ?? null;
  const price = product?.priceDisplay ?? formatEstimatedPrice(gift);

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-gp-app-evergreen/10 bg-white">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f4f0e5]">
        <Image
          src={imageUrl ?? "/gift-thumbnails/default-gift.svg"}
          alt={imageUrl ? gift.title : "Gift idea placeholder"}
          fill
          sizes="(min-width: 1280px) 15vw, (min-width: 640px) 28vw, 90vw"
          className="object-cover"
          unoptimized={Boolean(imageUrl)}
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-gp-app-evergreen">
          {gift.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
          <span className="text-sm font-bold text-gp-app-evergreen">
            {price ?? "Saved idea"}
          </span>
          {product ? (
            <span className="truncate text-[11px] text-gp-app-muted">
              {product.match.merchant}
            </span>
          ) : null}
        </div>
        <Link
          href="/history"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-gp-app-evergreen px-3 py-2 text-xs font-semibold text-white transition hover:bg-gp-app-evergreen-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
        >
          View saved idea
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function QuickAction({
  icon,
  href,
  title,
  description,
}: {
  icon: ReactNode;
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-4 rounded-2xl border border-gp-app-evergreen/10 bg-white/92 p-4 shadow-[0_8px_24px_rgba(15,61,62,0.045)] transition hover:-translate-y-0.5 hover:border-gp-app-evergreen/18 hover:shadow-[0_12px_30px_rgba(15,61,62,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef4e9] text-gp-app-evergreen">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gp-app-evergreen">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-4 text-gp-app-muted">
          {description}
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-gp-app-evergreen transition group-hover:translate-x-0.5"
      />
    </Link>
  );
}
