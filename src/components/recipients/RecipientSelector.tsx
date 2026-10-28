"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronDown, Users } from "lucide-react";
import {
  getRecipientAvatarVisual,
  getRecipientInitialAvatarStyle,
} from "@/lib/recipientAvatar";

export type RecipientSelectorRecipient = {
  id: string;
  name: string;
  relationship?: string | null;
  pet_type?: string | null;
  gender?: string | null;
  avatar_url?: string | null;
  avatar_icon?: string | null;
};

type SelectorOption =
  | { kind: "all"; id: "all" }
  | { kind: "recipient"; id: string; recipient: RecipientSelectorRecipient };

type RecipientSelectorProps = {
  recipients: RecipientSelectorRecipient[];
  value: string;
  onChange: (recipientId: string) => void;
  allowAll?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  id?: string;
};

function relationshipLabel(recipient: RecipientSelectorRecipient) {
  if (!recipient.relationship) return "Relationship TBD";
  if (
    recipient.relationship.toLowerCase() === "pet" &&
    recipient.pet_type?.trim()
  ) {
    return `Pet (${recipient.pet_type.trim()})`;
  }
  return recipient.relationship;
}

function RecipientAvatar({
  recipient,
  context,
}: {
  recipient: RecipientSelectorRecipient;
  context: "value" | "option";
}) {
  const avatar = getRecipientAvatarVisual(recipient);

  return (
    <span
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gp-evergreen/15 font-semibold text-gp-evergreen ${
        context === "value" ? "bg-white text-sm" : "bg-gp-cream text-xs"
      }`}
      style={
        avatar.kind === "initials"
          ? getRecipientInitialAvatarStyle(recipient.gender)
          : undefined
      }
      aria-hidden="true"
    >
      {avatar.kind === "initials" ? (
        avatar.text
      ) : (
        <Image
          src={avatar.src}
          alt=""
          fill
          sizes="40px"
          className={
            avatar.kind === "preset"
              ? context === "value"
                ? "object-contain p-[3px]"
                : "object-contain p-1"
              : "object-cover object-center"
          }
          unoptimized
        />
      )}
    </span>
  );
}

function AllRecipientsAvatar() {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gp-evergreen/15 bg-gp-cream text-gp-evergreen"
      aria-hidden="true"
    >
      <Users className="h-5 w-5" />
    </span>
  );
}

export function RecipientSelector({
  recipients,
  value,
  onChange,
  allowAll = false,
  placeholder = "Select a recipient",
  ariaLabel = "Select recipient",
  disabled = false,
  loading = false,
  className = "",
  id,
}: RecipientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const options = useMemo<SelectorOption[]>(
    () => [
      ...(allowAll ? [{ kind: "all" as const, id: "all" as const }] : []),
      ...recipients.map((recipient) => ({
        kind: "recipient" as const,
        id: recipient.id,
        recipient,
      })),
    ],
    [allowAll, recipients],
  );
  const selectedRecipient = recipients.find(
    (recipient) => recipient.id === value,
  );
  const allSelected = allowAll && value === "all";

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const openMenu = (preferredIndex?: number) => {
    if (disabled || loading || !options.length) return;
    const selectedIndex = options.findIndex((option) => option.id === value);
    const nextIndex =
      preferredIndex ?? (selectedIndex >= 0 ? selectedIndex : 0);
    setActiveIndex(nextIndex);
    setOpen(true);
    requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const select = (option: SelectorOption) => {
    onChange(option.id);
    close(true);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowUp" ? options.length - 1 : undefined);
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      close();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    let nextIndex = activeIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = options.length - 1;
    if (event.key === "ArrowDown") {
      nextIndex = (activeIndex + 1) % options.length;
    }
    if (event.key === "ArrowUp") {
      nextIndex = (activeIndex - 1 + options.length) % options.length;
    }
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled || loading}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className="flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-xl border border-gp-evergreen/15 bg-white px-3 py-1.5 text-left transition hover:border-gp-evergreen/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {allSelected ? (
          <AllRecipientsAvatar />
        ) : selectedRecipient ? (
          <RecipientAvatar recipient={selectedRecipient} context="value" />
        ) : (
          <AllRecipientsAvatar />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gp-evergreen">
            {loading
              ? "Loading recipients..."
              : allSelected
                ? "All recipients"
                : selectedRecipient?.name ?? placeholder}
          </span>
          <span className="block truncate text-xs text-gp-evergreen/70">
            {allSelected
              ? "Every recipient profile"
              : selectedRecipient
                ? relationshipLabel(selectedRecipient)
                : "Choose a recipient profile"}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-gp-evergreen/70 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleMenuKeyDown}
          className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-gp-evergreen/15 bg-white shadow-lg"
        >
          {options.map((option, index) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={index === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => select(option)}
                className={`flex w-full cursor-pointer items-center gap-3 border-b border-gp-evergreen/10 px-4 py-3 text-left text-sm transition last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gp-gold/70 ${
                  selected
                    ? "bg-gp-cream/70 font-semibold text-gp-evergreen"
                    : "text-gp-evergreen hover:bg-gp-cream/60"
                }`}
              >
                {option.kind === "all" ? (
                  <AllRecipientsAvatar />
                ) : (
                  <RecipientAvatar recipient={option.recipient} context="option" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {option.kind === "all"
                      ? "All recipients"
                      : option.recipient.name}
                  </span>
                  <span className="block truncate text-xs font-normal text-gp-evergreen/70">
                    {option.kind === "all"
                      ? "Every recipient profile"
                      : relationshipLabel(option.recipient)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
