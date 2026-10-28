"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  ChevronRight,
  Heart,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import {
  APP_EVERGREEN_ACTION,
  APP_GOLD_ACTION,
} from "@/components/ui/appActionStyles";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import {
  filterAndSortRecipients,
  hasSavedPreferences,
  recipientOccasions,
  upcomingOccasionCount,
  type RecipientOccasion,
  type RecipientSort,
} from "@/lib/recipientOverview";
import type { RecipientInterest, RecipientProfile } from "./RecipientsManager";
import styles from "./RecipientsOverview.module.css";

type Props = {
  recipients: RecipientProfile[];
  interests: RecipientInterest[];
  events: RecipientOccasion[] | null;
  savedCounts: Record<string, number> | null;
  preferencesLoaded: boolean;
  loading: boolean;
  notices?: ReactNode;
  onCreate: () => void;
  onView: (recipient: RecipientProfile) => void;
  onEdit: (recipient: RecipientProfile) => void;
  onDelete: (id: string) => void;
  onSaved: (recipient: RecipientProfile) => void;
  avatarFor: (
    recipient: RecipientProfile,
  ) =>
    | { kind: "image" | "preset"; src: string; alt: string }
    | { kind: "initials"; text: string };
  relationshipFor: (recipient: RecipientProfile) => string;
  budgetFor: (min: number | null, max: number | null) => string | null;
};

function RecipientActions({
  recipient,
  onEdit,
  onDelete,
}: Pick<Props, "onEdit" | "onDelete"> & { recipient: RecipientProfile }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (ref.current) ref.current.open = false;
  };
  return (
    <details
      ref={ref}
      className={styles.menu}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          close();
          ref.current?.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className={styles.iconButton}
        aria-label={`Actions for ${recipient.name}`}
        title={`Actions for ${recipient.name}`}
      >
        <MoreHorizontal size={20} aria-hidden="true" />
      </summary>
      <div className={styles.menuItems}>
        <button
          type="button"
          onClick={() => {
            close();
            onEdit(recipient);
          }}
        >
          <Pencil size={16} aria-hidden="true" />
          Edit
        </button>
        <Link href={`/history?recipient=${encodeURIComponent(recipient.id)}`}>
          <CalendarDays size={16} aria-hidden="true" />
          Gift history
        </Link>
        <button
          type="button"
          className={styles.delete}
          onClick={() => {
            close();
            onDelete(recipient.id);
          }}
        >
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </button>
      </div>
    </details>
  );
}

export function RecipientsOverview(props: Props) {
  const {
    recipients,
    interests,
    events,
    savedCounts,
    preferencesLoaded,
    loading,
  } = props;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<RecipientSort>("newest");
  const occasions = useMemo(
    () => recipientOccasions(recipients, events ?? []),
    [recipients, events],
  );
  const filtered = useMemo(
    () => filterAndSortRecipients(recipients, search, sort, occasions),
    [recipients, search, sort, occasions],
  );
  const interestsByRecipient = useMemo(() => {
    const map = new Map<string, RecipientInterest[]>();
    for (const item of interests)
      map.set(item.recipient_id, [...(map.get(item.recipient_id) ?? []), item]);
    return map;
  }, [interests]);
  const preferences = recipients.filter((recipient) =>
    hasSavedPreferences(
      recipient,
      interestsByRecipient.get(recipient.id) ?? [],
    ),
  ).length;

  return (
    <div className={styles.overview}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>RECIPIENTS</p>
          <h1>Your recipient profiles</h1>
          <p className={styles.subtitle}>
            Keep track of the people who matter. Save their preferences,
            interests, budgets, and key dates so PerchPal can help you find the
            perfect gift.
          </p>
        </div>
        <button
          type="button"
          onClick={props.onCreate}
          className={`${APP_GOLD_ACTION} ${styles.add}`}
        >
          <Plus size={20} aria-hidden="true" />
          Add Recipient
        </button>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={21} aria-hidden="true" />
          <span className="sr-only">
            Search recipients by name or relationship
          </span>
          <input
            type="search"
            placeholder="Search recipients by name or relationship..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className={styles.sort}>
          <SlidersHorizontal size={19} aria-hidden="true" />
          <span>
            <span className={styles.sortLabel}>Sort by</span>
            <select
              aria-label="Sort recipients"
              value={sort}
              onChange={(event) => setSort(event.target.value as RecipientSort)}
            >
              <option value="newest">Newest Added</option>
              <option value="updated">Recently Updated</option>
              <option value="name">Name A-Z</option>
              <option value="occasion">Next Occasion</option>
            </select>
          </span>
        </label>
      </div>

      <div className={styles.summaries}>
        <div className={styles.summary}>
          <span className={styles.summaryIcon}>
            <Users aria-hidden="true" />
          </span>
          <div>
            <strong>{loading ? "—" : recipients.length}</strong>
            <span>Total Recipients</span>
          </div>
        </div>
        <div
          className={styles.summary}
          title="Profiles with saved notes, interests, vibes, personality traits, brands, or budgets"
        >
          <span className={styles.summaryIcon}>
            <Heart aria-hidden="true" />
          </span>
          <div>
            <strong>{loading || !preferencesLoaded ? "—" : preferences}</strong>
            <span>With Saved Preferences</span>
          </div>
        </div>
        <div
          className={styles.summary}
          title="Recipient birthdays and saved occasions in the next 30 days"
        >
          <span className={styles.summaryIcon}>
            <CalendarDays aria-hidden="true" />
          </span>
          <div>
            <strong>
              {loading || events === null
                ? "—"
                : upcomingOccasionCount(occasions)}
            </strong>
            <span>Upcoming Occasions</span>
            <small>Next 30 days</small>
          </div>
        </div>
        <Link href="/gifts" className={`${styles.summary} ${styles.help}`}>
          <span className={styles.summaryIcon}>
            <Image
              src="/giftperch_perchpal_front.png"
              alt=""
              fill
              sizes="58px"
              className={styles.mascot}
              aria-hidden="true"
              unoptimized
            />
          </span>
          <div>
            <b>Let PerchPal Help</b>
            <span>Find a thoughtful gift.</span>
          </div>
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
      </div>

      {props.notices}
      {loading ? (
        <PerchPalLoader
          variant="block"
          size="md"
          message="PerchPal is organizing your recipient profiles..."
        />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <Users size={32} aria-hidden="true" />
          <h2>
            {recipients.length
              ? "No matching recipients"
              : "No recipient profiles yet"}
          </h2>
          <p>
            {recipients.length
              ? "Try a different name or relationship."
              : "Add someone to start keeping their preferences and important dates together."}
          </p>
          <button
            type="button"
            className={APP_GOLD_ACTION}
            onClick={recipients.length ? () => setSearch("") : props.onCreate}
          >
            {recipients.length ? "Clear search" : "Add Recipient"}
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((recipient) => {
            const avatar = props.avatarFor(recipient);
            const tags = [
              ...new Set(
                (interestsByRecipient.get(recipient.id) ?? [])
                  .filter((item) => item.category?.toLowerCase() !== "avoid")
                  .map((item) => item.label.trim())
                  .filter(Boolean),
              ),
            ];
            const next = occasions.find(
              (occasion) => occasion.recipientId === recipient.id,
            );
            const count =
              savedCounts?.[recipient.id] ?? (savedCounts ? 0 : null);
            return (
              <article
                key={recipient.id}
                className={styles.card}
                aria-label={`${recipient.name}'s profile`}
              >
                <div className={styles.cardTop}>
                  <div className={styles.avatar}>
                    {avatar.kind === "initials" ? (
                      avatar.text
                    ) : (
                      <Image
                        src={avatar.src}
                        alt={avatar.alt}
                        width={72}
                        height={72}
                        unoptimized
                        className={
                          avatar.kind === "preset" ? styles.preset : undefined
                        }
                      />
                    )}
                  </div>
                  <div className={styles.identity}>
                    <h2>{recipient.name}</h2>
                    <p>{props.relationshipFor(recipient)}</p>
                  </div>
                  <div className={styles.cardTools}>
                    <button
                      type="button"
                      className={styles.saved}
                      onClick={() => props.onSaved(recipient)}
                      aria-label={`Saved Gifts for ${recipient.name}${count === null ? "" : ` (${count})`}`}
                      title={`Saved Gifts for ${recipient.name}`}
                    >
                      <Bookmark size={18} aria-hidden="true" />
                      {count !== null && <span>{count}</span>}
                    </button>
                    <RecipientActions
                      recipient={recipient}
                      onEdit={props.onEdit}
                      onDelete={props.onDelete}
                    />
                  </div>
                </div>
                {recipient.notes?.trim() ? (
                  <p className={styles.description}>{recipient.notes.trim()}</p>
                ) : !tags.length ? (
                  <p className={styles.description}>
                    No preferences added yet.
                  </p>
                ) : null}
                {tags.length > 0 && (
                  <ul className={styles.tags} aria-label="Preferences">
                    {tags.slice(0, 4).map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                    {tags.length > 4 && (
                      <li title={tags.slice(4).join(", ")}>
                        +{tags.length - 4}
                      </li>
                    )}
                  </ul>
                )}
                <dl className={styles.facts}>
                  <div>
                    <Tag size={20} aria-hidden="true" />
                    <div>
                      <dt>Budget</dt>
                      <dd>
                        {props.budgetFor(
                          recipient.gift_budget_min,
                          recipient.gift_budget_max,
                        ) ?? "Not set"}
                      </dd>
                    </div>
                  </div>
                  <div>
                    <CalendarDays size={20} aria-hidden="true" />
                    <div>
                      <dt>Next Occasion</dt>
                      <dd>
                        {events === null ? (
                          "Unavailable"
                        ) : next ? (
                          <>
                            <time
                              dateTime={`${next.date.getFullYear()}-${String(next.date.getMonth() + 1).padStart(2, "0")}-${String(next.date.getDate()).padStart(2, "0")}`}
                            >
                              {next.date.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </time>
                            <small>{next.label}</small>
                          </>
                        ) : (
                          "Not set"
                        )}
                      </dd>
                    </div>
                  </div>
                </dl>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={APP_GOLD_ACTION}
                    onClick={() => props.onView(recipient)}
                  >
                    View Profile
                  </button>
                  <Link
                    className={APP_EVERGREEN_ACTION}
                    href={`/gifts?recipientId=${encodeURIComponent(recipient.id)}`}
                  >
                    Get Gift Ideas
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
