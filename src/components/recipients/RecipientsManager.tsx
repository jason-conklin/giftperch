"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import { SavedGiftIdeasModal } from "@/components/recipients/SavedGiftIdeasModal";

export type RecipientInterest = {
  id: string;
  recipient_id: string;
  label: string;
  category: string | null;
  created_at: string;
};

type InterestCategory = "interest" | "vibe" | "personality" | "brand";

export type RecipientProfile = {
  id: string;
  user_id: string;
  name: string;
  relationship: string | null;
  pet_type: string | null;
  gender: "male" | "female" | "other" | null;
  notes: string | null;
  annual_budget: number | null;
  gift_budget_min: number | null;
  gift_budget_max: number | null;
  birthday: string | null;
  avatar_url: string | null;
  avatar_icon: string | null;
  is_self: boolean;
  self_slug: string | null;
  created_at: string;
  updated_at: string;
};

type AvatarIconKey =
  | "babyboy"
  | "babygirl"
  | "boy"
  | "girl"
  | "man"
  | "woman"
  | "dog"
  | "cat";

const PRESET_AVATAR_OPTIONS: ReadonlyArray<{
  key: AvatarIconKey;
  label: string;
  image: string;
}> = [
  { key: "babyboy", label: "Baby boy", image: "/babyboy_icon.png" },
  { key: "babygirl", label: "Baby girl", image: "/babygirl_icon.png" },
  { key: "boy", label: "Boy", image: "/boy_icon.png" },
  { key: "girl", label: "Girl", image: "/girl_icon.png" },
  { key: "man", label: "Man", image: "/man_icon.png" },
  { key: "woman", label: "Woman", image: "/woman_icon.png" },
  { key: "dog", label: "Dog", image: "/dog_icon.png" },
  { key: "cat", label: "Cat", image: "/cat_icon.png" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const YEAR_OPTIONS = (() => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= 1900; year -= 1) {
    years.push(year);
  }
  return years;
})();

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const padNumber = (value: number) => value.toString().padStart(2, "0");
const parseBirthdayParts = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d) ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    return null;
  }
  return { year: y, month: m - 1, day: d };
};

const formatBirthdayDisplay = (value: string) => {
  const parsed = parseBirthdayParts(value);
  if (!parsed) return "mm/dd/yyyy";
  return `${padNumber(parsed.month + 1)}/${padNumber(parsed.day)}/${parsed.year}`;
};

const isoFromParts = (year: number, month: number, day: number) =>
  `${year}-${padNumber(month + 1)}-${padNumber(day)}`;

type BirthdayFieldProps = {
  value: string;
  onChange: (value: string) => void;
  approxAge: number | null;
};

function BirthdayField({ value, onChange, approxAge }: BirthdayFieldProps) {
  const parsedParts = useMemo(() => parseBirthdayParts(value), [value]);
  const today = useMemo(() => new Date(), []);
  const [open, setOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [manualInput, setManualInput] = useState(
    value ? formatBirthdayDisplay(value) : "",
  );
  const [viewMonth, setViewMonth] = useState(
    () => parsedParts?.month ?? today.getMonth(),
  );
  const [viewYear, setViewYear] = useState(
    () => parsedParts?.year ?? today.getFullYear(),
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const yearDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inPopover = popoverRef.current?.contains(target);
      const inYearDropdown =
        yearDropdownRef.current?.contains(target) ?? false;

      if (!inTrigger && !inPopover && open) {
        setOpen(false);
      }
      if (!inYearDropdown && yearDropdownOpen) {
        setYearDropdownOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (open) setOpen(false);
        if (yearDropdownOpen) setYearDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, yearDropdownOpen]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const calendarCells: Array<number | null> = [];
  for (let i = 0; i < firstDayOfMonth; i += 1) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push(day);
  }
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  const handleSelectDay = (day: number) => {
    const iso = isoFromParts(viewYear, viewMonth, day);
    onChange(iso);
    setOpen(false);
  };

  const isSameDay = (day: number) => {
    if (!parsedParts) return false;
    return (
      parsedParts.year === viewYear &&
      parsedParts.month === viewMonth &&
      parsedParts.day === day
    );
  };

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const handleManualInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }
    setManualInput(formatted);

    if (!digits) {
      onChange("");
      return;
    }

    if (digits.length === 8) {
      const month = Number(digits.slice(0, 2));
      const day = Number(digits.slice(2, 4));
      const year = Number(digits.slice(4));
      const candidate = new Date(year, month - 1, day);
      const isValid =
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day;
      if (isValid) {
        onChange(isoFromParts(year, month - 1, day));
        setViewMonth(month - 1);
        setViewYear(year);
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gp-evergreen">Birthday</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="mm/dd/yyyy"
          value={manualInput}
          onChange={(event) => handleManualInputChange(event.target.value)}
          className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 pr-10 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70"
          onFocus={() => setOpen(false)}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-2 my-auto flex h-8 w-8 items-center justify-center rounded-full border border-gp-evergreen/20 bg-gp-cream/80 text-gp-evergreen transition hover:bg-gp-cream cursor-pointer"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Open birthday picker"
          ref={triggerRef}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
          </svg>
        </button>
        {open ? (
          <div
            ref={popoverRef}
            className="absolute z-30 mt-2 w-full max-w-md rounded-2xl border border-gp-evergreen/10 bg-gp-cream p-4 shadow-lg"
          >
            <div className="mb-3 border-b border-gp-evergreen/10 pb-2">
              <p className="text-xs font-medium text-gp-evergreen/70">
                Choose a birthday
              </p>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    className="appearance-none rounded-full border border-gp-evergreen/40 bg-gp-evergreen px-3 py-1.5 pr-8 text-sm text-gp-cream shadow-sm transition hover:bg-gp-evergreen/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold focus-visible:ring-offset-1 focus-visible:ring-offset-gp-cream"
                    value={viewMonth}
                    onChange={(event) => setViewMonth(Number(event.target.value))}
                  >
                    {MONTHS.map((month, index) => (
                      <option key={month} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gp-cream/90">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </div>
                <div className="relative" ref={yearDropdownRef}>
                  <button
                    type="button"
                    className="flex items-center rounded-full border border-gp-evergreen/40 bg-gp-evergreen px-3 py-1.5 text-sm font-semibold text-gp-cream shadow-sm transition hover:bg-gp-evergreen/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold focus-visible:ring-offset-1 focus-visible:ring-offset-gp-cream"
                    onClick={() => setYearDropdownOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={yearDropdownOpen}
                  >
                    {viewYear}
                    <span className="ml-2 text-gp-cream/80">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  {yearDropdownOpen ? (
                    <div className="absolute right-0 z-30 mt-2 w-28 max-h-56 overflow-y-auto rounded-2xl border border-gp-evergreen/20 bg-gp-evergreen text-gp-cream shadow-lg">
                      <ul className="py-1 text-sm text-gp-evergreen">
                        {YEAR_OPTIONS.map((year) => (
                          <li key={year}>
                            <button
                              type="button"
                              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-gp-cream transition ${
                                viewYear === year
                                  ? "bg-white/20 font-semibold"
                                  : "hover:bg-white/10"
                              }`}
                              onClick={() => {
                                setViewYear(year);
                                setYearDropdownOpen(false);
                              }}
                            >
                              {year}
                              {viewYear === year ? (
                                <span className="text-gp-gold"></span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
              {value ? (
                <button
                  type="button"
                  className="ml-auto text-xs font-semibold text-gp-evergreen/70 underline-offset-2 hover:text-gp-evergreen"
                  onClick={() => onChange("")}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs font-semibold uppercase tracking-wide text-gp-cream/80">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} className="text-center">
                  {weekday}
                </span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-px rounded-xl bg-gp-evergreen/5 text-sm">
              {calendarCells.map((day, index) =>
                day ? (
                  <div
                    key={`${viewMonth}-${viewYear}-${day}-${index}`}
                    className="flex"
                  >
                    <button
                      type="button"
                      className={`flex h-full w-full items-center justify-center border border-gp-evergreen/10 bg-gp-cream py-2 text-sm text-gp-evergreen transition hover:bg-gp-evergreen/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 ${
                        isSameDay(day)
                          ? "relative text-gp-cream"
                          : isToday(day)
                          ? "bg-white"
                          : ""
                      }`}
                      aria-pressed={isSameDay(day)}
                      tabIndex={0}
                      onClick={() => handleSelectDay(day)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelectDay(day);
                        }
                      }}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isSameDay(day)
                            ? "bg-gp-evergreen text-gp-cream"
                            : isToday(day)
                            ? "border border-gp-evergreen/40 text-gp-evergreen"
                            : ""
                        }`}
                      >
                        {day}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div
                    key={`empty-${index}`}
                    className="h-11 border border-gp-evergreen/10 bg-gp-cream"
                  />
                )
              )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                className="text-xs font-semibold text-gp-evergreen/70 underline-offset-2 hover:text-gp-evergreen"
                onClick={() => {
                  const todayIso = isoFromParts(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  );
                  onChange(todayIso);
                  setOpen(false);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-gp-evergreen/70 underline-offset-2 hover:text-gp-evergreen"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {value ? (
        <p className="text-xs text-gp-evergreen/70">
          Approx. age: {approxAge ?? "--"}
        </p>
      ) : null}
    </div>
  );
}

type FormState = {
  name: string;
  relationshipOption: string;
  customRelationship: string;
  petType: string;
  gender: string;
  notes: string;
  annualBudget: string;
  giftBudgetMin: string;
  giftBudgetMax: string;
  birthday: string;
  avatar_url: string;
  avatar_icon: AvatarIconKey | "";
};

const emptyFormState: FormState = {
  name: "",
  relationshipOption: "",
  customRelationship: "",
  petType: "",
  gender: "",
  notes: "",
  annualBudget: "",
  giftBudgetMin: "",
  giftBudgetMax: "",
  birthday: "",
  avatar_url: "",
  avatar_icon: "",
};

const RELATIONSHIP_OPTIONS = [
  "Mother",
  "Father",
  "Sister",
  "Brother",
  "Cousin",
  "Aunt",
  "Uncle",
  "Daughter",
  "Son",
  "Boyfriend",
  "Girlfriend",
  "Fiance",
  "Spouse",
  "Friend",
  "Coworker",
  "Grandparent",
  "Pet",
  "Other",
] as const;

const PET_TYPES = ["Dog", "Cat", "Bird", "Small animal", "Other"] as const;

const GENDER_OPTIONS = [
  { label: "Prefer not to say", value: "" },
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Other", value: "other" },
] as const;

const PET_RELATIONSHIP = "Pet";
const OTHER_RELATIONSHIP = "Other";

const NOTES_PLACEHOLDER = `Use any format you want. The more notes you add, the better PerchPal's recommendations will be.
Example:
- Likes cozy reading, coffee, candles
- Dislikes clutter, gag gifts
- Hobbies: hiking, drawing, gardening, video games
- Hates loud noises, has smelly feet (needs breathable/washable items), loses things often
- Favorite brands: Patagonia, Le Labo, Stanley, or anything handmade`;

const toNumberOrNull = (value: string): number | null => {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
};

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return null;
  return `$${value.toFixed(0)}`;
};

const formatGiftBudgetRange = (
  min: number | null,
  max: number | null,
): string | null => {
  if (min === null && max === null) return "Not set";
  if (min !== null && max !== null) {
    return `${formatCurrency(min)}–${formatCurrency(max)}`;
  }
  if (min !== null) return `From ${formatCurrency(min)}`;
  return `Up to ${formatCurrency(max ?? 0)}`;
};

const calculateAge = (birthday: string | null) => {
  if (!birthday) return null;
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const beforeBirthday =
    today <
    new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
};

const findRelationshipOption = (value: string | null) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return (
    RELATIONSHIP_OPTIONS.find(
      (option) => option.toLowerCase() === normalized,
    ) ?? null
  );
};

const describeRelationship = (recipient: RecipientProfile) => {
  if (!recipient.relationship) return "Relationship TBD";
  if (
    recipient.relationship === PET_RELATIONSHIP &&
    recipient.pet_type?.trim()
  ) {
    return `Pet (${recipient.pet_type})`;
  }
  return recipient.relationship;
};

const RECIPIENT_AVATAR_BUCKET = "recipient-avatars";

const getInitials = (name: string) => {
  const safe = name.trim();
  if (!safe) return "GP";
  return safe
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const formatRecipientBirthday = (value: string | null) => {
  if (!value) return null;
  const parsed = parseBirthdayParts(value);
  if (!parsed) return null;
  const monthLabel = MONTH_ABBREVIATIONS[parsed.month] ?? "";
  return `${monthLabel} ${parsed.day}`;
};

const getRecipientAvatarVisual = (recipient: RecipientProfile) => {
  if (recipient.avatar_url) {
    return {
      kind: "image" as const,
      src: recipient.avatar_url,
      alt: `${recipient.name} avatar`,
    };
  }
  if (recipient.avatar_icon) {
    const preset = PRESET_AVATAR_OPTIONS.find(
      (option) => option.key === recipient.avatar_icon
    );
    if (preset) {
      return {
        kind: "preset" as const,
        src: preset.image,
        alt: preset.label,
      };
    }
  }
  return {
    kind: "initials" as const,
    text: getInitials(recipient.name),
  };
};

export function RecipientsManager() {
  const router = useRouter();
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [recipients, setRecipients] = useState<RecipientProfile[]>([]);
  const [interests, setInterests] = useState<RecipientInterest[]>([]);
  const [selectedRecipient, setSelectedRecipient] =
    useState<RecipientProfile | null>(null);
  const [interestInputs, setInterestInputs] = useState<
    Record<string, Record<InterestCategory, string>>
  >({});
  const [interestSaving, setInterestSaving] = useState<
    Record<string, Record<InterestCategory, boolean>>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [activeRecipient, setActiveRecipient] =
    useState<RecipientProfile | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingRecipient, setIsDeletingRecipient] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [savedGiftsRecipient, setSavedGiftsRecipient] =
    useState<RecipientProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const recipientAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarOptionsVisible, setAvatarOptionsVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const recipientFormDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedRecipient) {
      setFormMessage("");
    }
  }, [selectedRecipient]);

  useEffect(() => {
    if (!selectedRecipient) {
      document.body.style.overflow = "";
      return undefined;
    }

    const previousActiveElement = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const focusDialog = () => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        focusableSelectors
      );
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
    };
    focusDialog();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedRecipient(null);
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements =
          dialogRef.current.querySelectorAll<HTMLElement>(focusableSelectors);
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement =
          focusableElements[focusableElements.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [selectedRecipient]);

  useEffect(() => {
    if (!isFormOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeForm();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFormOpen]);

  useEffect(() => {
    if (!user?.id) {
      setRecipients([]);
      setIsLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
    let isMounted = true;
    const fetchRecipients = async () => {
      setIsLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("recipient_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_self", false)
        .order("created_at", { ascending: false });
      if (!isMounted) return;
      if (error) {
        setError(error.message);
        setRecipients([]);
      } else {
        setRecipients(data ?? []);
      }
      setIsLoading(false);
    };

    fetchRecipients();
    return () => {
      isMounted = false;
    };
  }, [supabase, user?.id]);

  useEffect(() => {
    const fetchInterests = async () => {
      if (!recipients.length) {
        setInterests([]);
        return;
      }
      const ids = recipients.map((recipient) => recipient.id);
      const { data, error } = await supabase
        .from("recipient_interests")
        .select("*")
        .in("recipient_id", ids);
      if (error) {
        setError(error.message);
      } else {
        setInterests(data ?? []);
      }
    };

    fetchInterests();
  }, [recipients, supabase]);

  const filteredRecipients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recipients;

    return recipients.filter((recipient) => {
      const nameMatch = recipient.name.toLowerCase().includes(term);
      const relationshipMatch =
        recipient.relationship?.toLowerCase().includes(term) ?? false;
      const petMatch =
        recipient.pet_type?.toLowerCase().includes(term) ?? false;
      return nameMatch || relationshipMatch || petMatch;
    });
  }, [recipients, search]);

  const interestsByRecipient = useMemo(() => {
    return interests.reduce<Record<string, RecipientInterest[]>>(
      (acc, interest) => {
        if (!acc[interest.recipient_id]) acc[interest.recipient_id] = [];
        acc[interest.recipient_id].push(interest);
        return acc;
      },
      {}
    );
  }, [interests]);

  const approxAge = useMemo(
    () => calculateAge(formState.birthday || null),
    [formState.birthday],
  );
  const selectedPresetIcon = useMemo(
    () =>
      PRESET_AVATAR_OPTIONS.find(
        (option) => option.key === formState.avatar_icon
      ),
    [formState.avatar_icon]
  );

  const openCreateForm = () => {
    setFormMode("create");
    setActiveRecipient(null);
    setFormState(emptyFormState);
    setFormError("");
    setFormMessage("");
    setIsFormOpen(true);
  };

  const handleRecipientAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    setAvatarUploading(true);
    setFormError("");
    try {
      const fileExt = file.name.split(".").pop() ?? "png";
      const fileName = `recipient-${user.id}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from(RECIPIENT_AVATAR_BUCKET)
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from(RECIPIENT_AVATAR_BUCKET).getPublicUrl(fileName);
      setFormState((prev) => ({
        ...prev,
        avatar_url: publicUrl,
        avatar_icon: "",
      }));
      setAvatarOptionsVisible(false);
      setFormMessage("Photo uploaded. Save to keep changes.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to upload photo.";
      setFormError(message);
    } finally {
      setAvatarUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const openEditForm = (recipient: RecipientProfile) => {
    setFormMode("edit");
    setActiveRecipient(recipient);
    const relationshipValue = recipient.relationship ?? "";
    const matchedRelationship = findRelationshipOption(relationshipValue);
    const relationshipOption = matchedRelationship
      ? matchedRelationship
      : relationshipValue
      ? OTHER_RELATIONSHIP
      : "";
    const customRelationship =
      relationshipOption === OTHER_RELATIONSHIP && relationshipValue
        ? relationshipValue
        : "";
    setFormState({
      name: recipient.name ?? "",
      relationshipOption,
      customRelationship,
      petType:
        relationshipOption === PET_RELATIONSHIP
          ? recipient.pet_type ?? ""
          : "",
      gender: recipient.gender ?? "",
      notes: recipient.notes ?? "",
      annualBudget: recipient.annual_budget
        ? String(recipient.annual_budget)
        : "",
      giftBudgetMin: recipient.gift_budget_min
        ? String(recipient.gift_budget_min)
        : "",
      giftBudgetMax: recipient.gift_budget_max
        ? String(recipient.gift_budget_max)
        : "",
      birthday: recipient.birthday ?? "",
      avatar_url: recipient.avatar_url ?? "",
      avatar_icon: (recipient.avatar_icon as AvatarIconKey | "") ?? "",
    });
    setFormError("");
    setFormMessage("");
    setAvatarOptionsVisible(false);
    setIsFormOpen(true);
  };

  const closeForm = (options?: { preserveMessage?: boolean }) => {
    setIsFormOpen(false);
    setActiveRecipient(null);
    setFormState(emptyFormState);
    if (!options?.preserveMessage) {
      setFormMessage("");
    }
    setFormError("");
    setFormSaving(false);
    setAvatarOptionsVisible(false);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSaving(true);
    setFormError("");
    setFormMessage("");

    if (!user?.id) {
      setFormError("You must be signed in to save a recipient.");
      setFormSaving(false);
      return;
    }

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      setFormError("Name is required.");
      setFormSaving(false);
      return;
    }

    let relationshipValue: string | null = null;
    if (formState.relationshipOption === OTHER_RELATIONSHIP) {
      const customValue = formState.customRelationship.trim();
      if (!customValue) {
        setFormError("Please enter a custom relationship.");
        setFormSaving(false);
        return;
      }
      relationshipValue = customValue;
    } else if (formState.relationshipOption) {
      relationshipValue = formState.relationshipOption;
    }

    if (
      formState.relationshipOption === PET_RELATIONSHIP &&
      !formState.petType.trim()
    ) {
      setFormError("Please choose what type of pet this is.");
      setFormSaving(false);
      return;
    }

    const giftMin = toNumberOrNull(formState.giftBudgetMin);
    const giftMax = toNumberOrNull(formState.giftBudgetMax);
    if (giftMin && giftMax && giftMin > giftMax) {
      setFormError("Per-gift minimum cannot be greater than the maximum.");
      setFormSaving(false);
      return;
    }

    const payload = {
      name: trimmedName,
      relationship: relationshipValue,
      pet_type:
        formState.relationshipOption === PET_RELATIONSHIP &&
        formState.petType.trim()
          ? formState.petType.trim()
          : null,
      gender: formState.gender || null,
      notes: formState.notes.trim() || null,
      annual_budget: toNumberOrNull(formState.annualBudget),
      gift_budget_min: giftMin,
      gift_budget_max: giftMax,
      birthday: formState.birthday || null,
      avatar_url: formState.avatar_url || null,
      avatar_icon: formState.avatar_icon || null,
    };

    try {
      if (formMode === "create") {
        const { data, error } = await supabase
          .from("recipient_profiles")
          .insert({
            ...payload,
            user_id: user.id,
            is_self: false,
          })
          .select()
          .single();
        if (error) throw error;
        setRecipients((prev) => [data, ...prev]);
        setFormMessage("Recipient added successfully.");
        closeForm({ preserveMessage: true });
      } else if (formMode === "edit" && activeRecipient) {
        const { data, error } = await supabase
          .from("recipient_profiles")
          .update(payload)
          .eq("id", activeRecipient.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        setRecipients((prev) =>
          prev.map((recipient) =>
            recipient.id === data.id ? data : recipient,
          ),
        );
        setFormMessage("Recipient updated successfully.");
        closeForm({ preserveMessage: true });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save recipient.";
      setFormError(message);
    } finally {
      setFormSaving(false);
    }
  };

  const requestDelete = (id: string) => {
    setConfirmDeleteId(id);
    setDeleteError("");
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
    setDeleteError("");
  };

  const handleDelete = async () => {
    if (!confirmDeleteId || !user?.id) return;
    setDeleteError("");
    setIsDeletingRecipient(true);
    try {
      const { error } = await supabase
        .from("recipient_profiles")
        .delete()
        .eq("id", confirmDeleteId)
        .eq("user_id", user.id);
      if (error) throw error;
      setRecipients((prev) =>
        prev.filter((recipient) => recipient.id !== confirmDeleteId)
      );
      setConfirmDeleteId(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete recipient.";
      setDeleteError(message);
    } finally {
      setIsDeletingRecipient(false);
    }
  };

  const handleInterestInputChange = (
    recipientId: string,
    category: InterestCategory,
    value: string
  ) => {
    setInterestInputs((prev) => ({
      ...prev,
      [recipientId]: {
        ...(prev[recipientId] ?? {
          interest: "",
          vibe: "",
          personality: "",
          brand: "",
        }),
        [category]: value,
      },
    }));
  };

  const handleAddInterest = async (
    recipientId: string,
    category: InterestCategory
  ) => {
    const label =
      interestInputs[recipientId]?.[category]?.trim() ??
      "";
    if (!label) return;

    setInterestSaving((prev) => ({
      ...prev,
      [recipientId]: {
        ...(prev[recipientId] ?? {
          interest: false,
          vibe: false,
          personality: false,
          brand: false,
        }),
        [category]: true,
      },
    }));

    try {
      const { data, error } = await supabase
        .from("recipient_interests")
        .insert({
          recipient_id: recipientId,
          label,
          category,
        })
        .select()
        .single();

      if (error) throw error;
      setInterests((prev) => [...prev, data]);
      setInterestInputs((prev) => ({
        ...prev,
        [recipientId]: {
          ...(prev[recipientId] ?? {
            interest: "",
            vibe: "",
            personality: "",
            brand: "",
          }),
          [category]: "",
        },
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setInterestSaving((prev) => ({
        ...prev,
        [recipientId]: {
          ...(prev[recipientId] ?? {
            interest: false,
            vibe: false,
            personality: false,
            brand: false,
          }),
          [category]: false,
        },
      }));
    }
  };

  const handleRemoveInterest = async (interestId: string) => {
    try {
      const { error } = await supabase
        .from("recipient_interests")
        .delete()
        .eq("id", interestId);
      if (error) throw error;
      setInterests((prev) =>
        prev.filter((interest) => interest.id !== interestId)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const renderTags = (
    recipientId: string,
    category: InterestCategory,
    label: string
  ) => {
    const interestList = interestsByRecipient[recipientId] ?? [];
    const tags = interestList.filter(
      (interest) => (interest.category ?? "interest") === category
    );

    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
          {label}
        </p>
        <div className="flex flex-wrap gap-2">
          {tags.map((interest) => (
            <span
              key={interest.id}
              className="inline-flex items-center gap-2 rounded-full border border-gp-evergreen/20 bg-gp-cream px-3 py-1 text-xs font-medium text-gp-evergreen"
            >
              {interest.label}
              <button
                type="button"
                onClick={() => handleRemoveInterest(interest.id)}
                className="text-[10px] font-semibold uppercase tracking-wide text-gp-evergreen/70 transition hover:text-gp-evergreen"
                aria-label={`Remove ${interest.label}`}
              >
                ×
              </button>

            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-xs text-gp-evergreen/60">
              No tags yet.
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${recipientId}-${category}`} className="sr-only">
            {label}
          </label>
          <input
            id={`${recipientId}-${category}`}
            type="text"
            value={interestInputs[recipientId]?.[category] ?? ""}
            onChange={(event) =>
              handleInterestInputChange(
                recipientId,
                category,
                event.target.value
              )
            }
            placeholder={`Add ${label.toLowerCase()}`}
            className="flex-1 rounded-full border border-gp-evergreen/30 bg-transparent px-3 py-1 text-xs text-gp-evergreen focus:border-gp-evergreen focus:outline-none md:flex-none md:w-48"
          />
          <button
            type="button"
            disabled={interestSaving[recipientId]?.[category]}
            onClick={() => handleAddInterest(recipientId, category)}
            className="rounded-full bg-gp-gold px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-[#bda775] disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-gp-evergreen/15 bg-white/90 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <input
            type="text"
            placeholder="Search recipients by name or relationship..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex-1 rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132] cursor-pointer"
        >
          Add Recipient
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {formMessage && !isFormOpen && (
        <div className="rounded-2xl border border-green-200 bg-green-100 px-4 py-2 text-sm text-gp-evergreen">
          {formMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center">
          <PerchPalLoader
            variant="block"
            size="md"
            message="PerchPal is organizing your recipient profiles..."
          />
        </div>
      ) : filteredRecipients.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gp-evergreen/30 bg-gp-cream/70 p-6 text-center text-sm text-gp-evergreen">
          <p className="text-base font-semibold text-gp-evergreen">
            No recipient profiles yet
          </p>
          <p className="mt-2 text-sm text-gp-evergreen/80">
            Start by adding the people you shop for most. PerchPal will tailor
            suggestions once it knows them better.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-4 rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132]"
          >
            Create a new recipient profile
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRecipients.map((recipient) => (
            <div
              key={recipient.id}
              className="rounded-2xl border border-gp-evergreen/15 bg-white/90 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {(() => {
                    const avatar = getRecipientAvatarVisual(recipient);
                    return (
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gp-evergreen/20 bg-gp-cream/80 text-sm font-semibold text-gp-evergreen">
                        {avatar.kind === "image" ? (
                          <Image
                            src={avatar.src}
                            alt={avatar.alt}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : avatar.kind === "preset" ? (
                          <Image
                            src={avatar.src}
                            alt={avatar.alt}
                            width={40}
                            height={40}
                            className="h-10 w-10 object-contain"
                            unoptimized
                          />
                        ) : (
                          avatar.text
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-lg font-semibold text-gp-evergreen">
                      {recipient.name}
                    </p>
                    <p className="text-sm text-gp-evergreen/70">
                      {describeRelationship(recipient)}
                    </p>
                    <Link
                      href={`/history?recipient=${recipient.id}`}
                      className="mt-1 inline-flex text-xs font-semibold text-gp-evergreen underline-offset-4 hover:underline"
                    >
                      View gift history
                    </Link>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditForm(recipient)}
                    className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(recipient.id)}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm text-gp-evergreen/80">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold">Per-gift range</dt>
                  <dd className="max-w-[180px] whitespace-nowrap overflow-hidden text-ellipsis text-right">
                    {formatGiftBudgetRange(
                      recipient.gift_budget_min,
                      recipient.gift_budget_max,
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold">Annual budget</dt>
                  <dd>
                    {recipient.annual_budget
                      ? `$${recipient.annual_budget.toFixed(0)}`
                      : "Not set"}
                  </dd>
                </div>
                {recipient.birthday && (
                  <div className="flex justify-between">
                    <dt className="font-semibold">Birthday</dt>
                    <dd>{formatRecipientBirthday(recipient.birthday) ?? "—"}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecipient(recipient)}
                    className="flex-1 min-w-[150px] inline-flex items-center justify-center rounded-full border border-gp-evergreen/30 px-4 py-1.5 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 cursor-pointer"
                  >
                    Show details
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavedGiftsRecipient(recipient)}
                    className="flex-1 min-w-[150px] inline-flex items-center justify-center rounded-full bg-gp-evergreen px-4 py-1.5 text-xs font-semibold text-gp-cream transition hover:bg-[#0c3132] cursor-pointer"
                  >
                    View Saved Gifts
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/gifts?recipientId=${recipient.id}`)
                  }
                  className="inline-flex w-full items-center justify-center rounded-full bg-gp-gold px-5 py-2 text-sm font-semibold text-gp-evergreen animate-gp-gift-glow transition hover:scale-[1.04] hover:bg-[#d9c585] hover:shadow-[0_0_24px_rgba(217,193,137,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 cursor-pointer"
                >
                  Get gift ideas
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {confirmDeleteId ? (() => {
        const target = recipients.find((r) => r.id === confirmDeleteId);
        const titleId = `delete-recipient-${confirmDeleteId}`;
        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="w-full max-w-md space-y-4 rounded-2xl bg-gp-cream p-6 shadow-xl">
              <h2 id={titleId} className="text-xl font-semibold text-gp-evergreen">
                Delete this recipient?
              </h2>
              <div className="space-y-2 text-sm text-gp-evergreen/80">
                <p>
                  This will remove this recipient, their occasions, and any gift
                  suggestions associated with them from GiftPerch.
                </p>
                <p className="font-semibold text-red-700">This action cannot be undone.</p>
                {target?.name ? (
                  <p className="font-semibold text-gp-evergreen">
                    Recipient: {target.name}
                  </p>
                ) : null}
              </div>
              {deleteError ? (
                <p className="text-sm font-semibold text-red-700">{deleteError}</p>
              ) : null}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="gp-secondary-button"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingRecipient}
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl px-4 py-2 disabled:opacity-60"
                >
                  {isDeletingRecipient ? "Deleting..." : "Delete recipient"}
                </button>
              </div>
            </div>
          </div>
        );
      })() : null}

      {selectedRecipient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedRecipient(null)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`recipient-details-${selectedRecipient.id}`}
            className="relative z-10 flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-gp-cream shadow-xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-gp-evergreen/10 bg-gp-evergreen px-6 py-4 text-gp-cream">
              <div className="flex items-center gap-4">
                {(() => {
                  const avatar = getRecipientAvatarVisual(selectedRecipient);
                  return (
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gp-cream/30 bg-gp-cream/90 text-base font-semibold text-gp-evergreen">
                      {avatar.kind === "image" ? (
                        <Image
                          src={avatar.src}
                          alt={avatar.alt}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : avatar.kind === "preset" ? (
                        <Image
                          src={avatar.src}
                          alt={avatar.alt}
                          width={48}
                          height={48}
                          className="h-12 w-12 object-contain"
                          unoptimized
                        />
                      ) : (
                        avatar.text
                      )}
                    </div>
                  );
                })()}
                <div>
                  <p
                    id={`recipient-details-${selectedRecipient.id}`}
                    className="text-lg font-semibold"
                  >
                    {selectedRecipient.name}
                  </p>
                  <p className="text-sm text-gp-cream/80">
                    {describeRelationship(selectedRecipient)}
                  </p>
                  <Link
                    href={`/history?recipient=${selectedRecipient.id}`}
                    className="mt-1 inline-flex text-xs font-semibold text-gp-cream underline-offset-4 hover:text-gp-gold"
                  >
                    View gift history
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openEditForm(selectedRecipient);
                    setSelectedRecipient(null);
                  }}
                  className="rounded-full border border-gp-cream/30 px-4 py-1.5 text-xs font-semibold text-gp-cream transition hover:bg-white/15 cursor-pointer"
                >
                  Edit recipient
                </button>
                <button
                  type="button"
                  ref={closeButtonRef}
                  onClick={() => setSelectedRecipient(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gp-cream/30 text-gp-cream transition hover:bg-white/15 cursor-pointer"
                  aria-label="Close recipient details"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    { category: "interest", label: "Interests & hobbies" },
                    { category: "vibe", label: "Vibes & aesthetics" },
                    { category: "personality", label: "Personality traits" },
                    { category: "brand", label: "Favorite brands" },
                  ] as Array<{ category: InterestCategory; label: string }>
                ).map(({ category, label }) => (
                  <div
                    key={category}
                    className="rounded-2xl border border-gp-evergreen/15 bg-white/90 p-4"
                  >
                    {renderTags(selectedRecipient.id, category, label)}
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-gp-evergreen/15 bg-white/90 p-4 text-sm text-gp-evergreen">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
                    Budgets overview
                  </p>
                  {selectedRecipient.gift_budget_min ||
                  selectedRecipient.gift_budget_max ||
                  selectedRecipient.annual_budget ? (
                    <p className="mt-1">
                      {formatGiftBudgetRange(
                        selectedRecipient.gift_budget_min,
                        selectedRecipient.gift_budget_max,
                      ) ? (
                        <>
                          Typical gift range:{" "}
                          <span className="font-semibold">
                            {formatGiftBudgetRange(
                              selectedRecipient.gift_budget_min,
                              selectedRecipient.gift_budget_max,
                            )}
                          </span>
                        </>
                      ) : (
                        <>Per-gift range not set</>
                      )}
                      {selectedRecipient.annual_budget && (
                        <>
                          {" "}
                          (annual target{" "}
                          <span className="font-semibold">
                            {formatCurrency(selectedRecipient.annual_budget)}
                          </span>
                          )
                        </>
                      )}
                      .
                    </p>
                  ) : (
                    <p className="mt-1 text-gp-evergreen/70">
                      Budget not set yet.
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-gp-evergreen/15 bg-white/90 p-4 text-sm text-gp-evergreen">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
                    Notes
                  </p>
                  {selectedRecipient.notes ? (
                    <p className="mt-2 whitespace-pre-line text-gp-evergreen/80">
                      {selectedRecipient.notes}
                    </p>
                  ) : (
                    <p className="mt-2 text-gp-evergreen/60">
                      No notes yet. Add insight via the edit form.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gp-evergreen/10 px-6 py-3">
              <button
                type="button"
                className="gp-secondary-button cursor-pointer"
                onClick={() => setSelectedRecipient(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

{isFormOpen ? (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => closeForm()}
        >
          <div
            ref={recipientFormDialogRef}
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-gp-cream shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gp-evergreen/10 bg-gp-evergreen px-5 py-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-gp-cream/80">
                  {formMode === "create" ? "New recipient" : "Edit recipient"}
                </p>
                <h2 className="text-2xl font-semibold text-gp-cream">
                  {formMode === "create"
                    ? "Add a recipient profile"
                    : `Update ${activeRecipient?.name ?? "recipient"}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeForm()}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gp-cream/50 text-gp-cream transition hover:bg-white/15 cursor-pointer"
                aria-label="Close recipient form"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form
              className="flex-1 space-y-4 overflow-y-auto px-5 pb-5 pt-4 sm:px-6"
              onSubmit={handleFormSubmit}
            >
              <div className="space-y-4 rounded-2xl border border-gp-evergreen/15 bg-gp-cream/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gp-evergreen/20 bg-white text-lg font-semibold text-gp-evergreen">
                      {formState.avatar_url ? (
                        <Image
                          src={formState.avatar_url}
                          alt={`${formState.name || "Recipient"} photo`}
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : selectedPresetIcon ? (
                        <Image
                          src={selectedPresetIcon.image}
                          alt={selectedPresetIcon.label}
                          width={48}
                          height={48}
                          className="h-12 w-12 object-contain"
                          unoptimized
                        />
                      ) : (
                        getInitials(formState.name || "Recipient")
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gp-evergreen">
                        Recipient photo
                      </p>
                      <p className="text-xs text-gp-evergreen/60">
                        Optional. Helps PerchPal feel more personal.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      {(formState.avatar_url || formState.avatar_icon) && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600 cursor-pointer"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              avatar_url: "",
                              avatar_icon: "",
                            }))
                          }
                        >
                          Remove
                        </button>
                      )}
                      <button
                        type="button"
                        className="gp-secondary-button cursor-pointer"
                        onClick={() =>
                          setAvatarOptionsVisible((visible) => !visible)
                        }
                      >
                        {avatarOptionsVisible ? "Hide avatar options" : "Change avatar"}
                      </button>
                    </div>
                    {!avatarOptionsVisible ? (
                      <p className="text-xs text-gp-evergreen/60">
                        Upload a photo or choose from preset icons.
                      </p>
                    ) : null}
                  </div>
                </div>
                {avatarOptionsVisible ? (
                  <div className="space-y-4 border-t border-gp-evergreen/20 pt-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={recipientAvatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleRecipientAvatarUpload}
                      />
                      <button
                        type="button"
                        className="gp-secondary-button cursor-pointer"
                        onClick={() => recipientAvatarInputRef.current?.click()}
                        disabled={avatarUploading}
                      >
                        {avatarUploading ? "Uploading..." : "Upload photo"}
                      </button>
                      {formState.avatar_url ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600 cursor-pointer"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              avatar_url: "",
                            }))
                          }
                        >
                          Remove photo
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {PRESET_AVATAR_OPTIONS.map((option) => {
                        const selected = formState.avatar_icon === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            aria-pressed={selected}
                            title={option.label}
                            onClick={() => {
                              setFormState((prev) => ({
                                ...prev,
                                avatar_icon: option.key,
                                avatar_url: "",
                              }));
                              setAvatarOptionsVisible(false);
                            }}
                    className={`flex flex-col items-center rounded-2xl border px-3 py-2 text-center text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gp-gold ${
                      selected
                        ? "border-gp-evergreen bg-gp-evergreen text-gp-cream"
                        : "border-gp-evergreen/20 bg-white text-gp-evergreen hover:border-gp-evergreen/50"
                    } cursor-pointer`}
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${
                        selected ? "bg-white/10" : "bg-gp-cream"
                      }`}
                            >
                      <Image
                        src={option.image}
                        alt={option.label}
                        width={48}
                        height={48}
                        className="h-10 w-10 object-contain"
                        unoptimized
                      />
                            </span>
                            <span className="mt-2 text-[11px] uppercase tracking-wide">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="recipient-name"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Name*
                </label>
                <input
                  id="recipient-name"
                  type="text"
                  required
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="relationship"
                    className="text-sm font-medium text-gp-evergreen"
                  >
                    Relationship
                  </label>
                  <select
                    id="relationship"
                    value={formState.relationshipOption}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        relationshipOption: event.target.value,
                        customRelationship:
                          event.target.value === OTHER_RELATIONSHIP
                            ? prev.customRelationship
                            : "",
                        petType:
                          event.target.value === PET_RELATIONSHIP
                            ? prev.petType
                            : "",
                      }))
                    }
                    className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                  >
                    <option value="">Select relationship</option>
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {formState.relationshipOption === OTHER_RELATIONSHIP && (
                    <div className="space-y-2">
                      <label
                        htmlFor="custom-relationship"
                        className="text-xs font-medium text-gp-evergreen/80"
                      >
                        Custom relationship
                      </label>
                      <input
                        id="custom-relationship"
                        type="text"
                        value={formState.customRelationship}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            customRelationship: event.target.value,
                          }))
                        }
                        placeholder="e.g., College mentor"
                        className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                      />
                    </div>
                  )}
                  {formState.relationshipOption === PET_RELATIONSHIP && (
                    <div className="space-y-2">
                      <label
                        htmlFor="pet-type"
                        className="text-xs font-medium text-gp-evergreen/80"
                      >
                        Pet type
                      </label>
                      <select
                        id="pet-type"
                        value={formState.petType}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            petType: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                      >
                        <option value="">Select pet type</option>
                        {PET_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="gender"
                    className="text-sm font-medium text-gp-evergreen"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    value={formState.gender}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        gender: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <BirthdayField
                key={formState.birthday || "empty-birthday"}
                value={formState.birthday}
                onChange={(nextValue) =>
                  setFormState((prev) => ({ ...prev, birthday: nextValue }))
                }
                approxAge={approxAge}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    htmlFor="annual-budget"
                    className="text-sm font-medium text-gp-evergreen"
                  >
                    Yearly budget (optional)
                  </label>
                  <div className="mt-1.5 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
                      Approximately
                    </p>
                    <input
                      id="annual-budget"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="250"
                      value={formState.annualBudget}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          annualBudget: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gp-evergreen">
                    Typical per-gift range (optional)
                  </label>
                  <div className="rounded-2xl border border-dashed border-gp-evergreen/30 bg-white/40 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
                          Minimum
                        </p>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          placeholder="25"
                          value={formState.giftBudgetMin}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              giftBudgetMin: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
                          Maximum
                        </p>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          placeholder="75"
                          value={formState.giftBudgetMax}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              giftBudgetMax: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="notes"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={8}
                  value={formState.notes}
                  placeholder={NOTES_PLACEHOLDER}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-gp-gold px-5 py-3 text-sm font-semibold text-gp-evergreen transition hover:bg-[#bda775] disabled:opacity-60 cursor-pointer"
                disabled={formSaving}
              >
                {formMode === "create" ? "Save recipient" : "Update recipient"}
              </button>

              {formSaving && (
                <div className="flex justify-center">
                  <PerchPalLoader
                    variant="inline"
                    size="sm"
                    message="PerchPal is saving your recipient..."
                  />
                </div>
              )}

              {formError && (
                <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
                  {formError}
                </p>
              )}
              {formMessage && (
                <p className="rounded-2xl bg-green-100 px-4 py-2 text-sm text-gp-evergreen">
                  {formMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      ) : null}

      {savedGiftsRecipient ? (
        <SavedGiftIdeasModal
          recipientId={savedGiftsRecipient.id}
          recipientName={savedGiftsRecipient.name}
          isOpen={!!savedGiftsRecipient}
          onClose={() => setSavedGiftsRecipient(null)}
          authToken={authToken}
        />
      ) : null}
    </div>
  );
}
