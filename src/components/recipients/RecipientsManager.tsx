"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";

export type RecipientInterest = {
  id: string;
  recipient_id: string;
  label: string;
  category: string | null;
  created_at: string;
};

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
  is_self: boolean;
  self_slug: string | null;
  created_at: string;
  updated_at: string;
};

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
};

const RELATIONSHIP_OPTIONS = [
  "Mother",
  "Father",
  "Parent",
  "Sister",
  "Brother",
  "Daughter",
  "Son",
  "Partner / Significant Other",
  "Fiancé(e)",
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

const NOTES_PLACEHOLDER = `Example:
– Likes: cozy reading, coffee, candles
– Dislikes: clutter, gag gifts
– Sizes: M tops, 8 shoe
– Wishlist hints: prefers experiences over stuff

The more notes you add, the better PerchPal’s recommendations will be.`;

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
  if (min && max) return `${formatCurrency(min)}–${formatCurrency(max)}`;
  if (min) return `From ${formatCurrency(min)}`;
  if (max) return `Up to ${formatCurrency(max)}`;
  return null;
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

export function RecipientsManager() {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [recipients, setRecipients] = useState<RecipientProfile[]>([]);
  const [interests, setInterests] = useState<RecipientInterest[]>([]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
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
  const [deleteError, setDeleteError] = useState("");
  const recipientAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setRecipients([]);
      setIsLoading(false);
      return;
    }
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
      setFormState((prev) => ({ ...prev, avatar_url: publicUrl }));
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
    });
    setFormError("");
    setFormMessage("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setActiveRecipient(null);
    setFormState(emptyFormState);
    setFormMessage("");
    setFormError("");
    setFormSaving(false);
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
        setFormState(emptyFormState);
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
    }
  };

  const toggleDetails = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
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
          className="rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132]"
        >
          Add Recipient
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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
            Add your first recipient
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
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gp-evergreen/20 bg-gp-cream/80 text-sm font-semibold text-gp-evergreen">
                    {recipient.avatar_url ? (
                      <Image
                        src={recipient.avatar_url}
                        alt={`${recipient.name} avatar`}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      getInitials(recipient.name)
                    )}
                  </div>
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
                    className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(recipient.id)}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm text-gp-evergreen/80">
                <div className="flex justify-between">
                  <dt className="font-semibold">Per-gift range</dt>
                  <dd>
                    {formatGiftBudgetRange(
                      recipient.gift_budget_min,
                      recipient.gift_budget_max,
                    ) ?? "Not set"}
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
                    <dd>
                      {new Date(recipient.birthday).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => toggleDetails(recipient.id)}
                  className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
                >
                  {expandedIds[recipient.id] ? "Hide details" : "Show details"}
                </button>
              </div>

              {expandedIds[recipient.id] && (
                <div className="mt-4 space-y-4 rounded-2xl border border-gp-evergreen/10 bg-gp-cream/60 p-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {renderTags(recipient.id, "interest", "Interests & hobbies")}
                    {renderTags(recipient.id, "vibe", "Vibes & aesthetics")}
                    {renderTags(
                      recipient.id,
                      "personality",
                      "Personality traits"
                    )}
                    {renderTags(recipient.id, "brand", "Favorite brands")}
                  </div>

                  <div className="rounded-2xl border border-gp-evergreen/15 bg-white/90 p-4 text-sm text-gp-evergreen">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
                      Budgets overview
                    </p>
                    {recipient.gift_budget_min ||
                    recipient.gift_budget_max ||
                    recipient.annual_budget ? (
                      <p className="mt-1">
                        {formatGiftBudgetRange(
                          recipient.gift_budget_min,
                          recipient.gift_budget_max,
                        ) ? (
                          <>
                            Typical gift range:{" "}
                            <span className="font-semibold">
                              {formatGiftBudgetRange(
                                recipient.gift_budget_min,
                                recipient.gift_budget_max,
                              )}
                            </span>
                          </>
                        ) : (
                          <>Per-gift range not set</>
                        )}
                        {recipient.annual_budget && (
                          <>
                            {" "}
                            (annual target{" "}
                            <span className="font-semibold">
                              {formatCurrency(recipient.annual_budget)}
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
                    {recipient.notes ? (
                      <p className="mt-2 whitespace-pre-line text-gp-evergreen/80">
                        {recipient.notes}
                      </p>
                    ) : (
                      <p className="mt-2 text-gp-evergreen/60">
                        No notes yet. Add insight via the edit form.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {confirmDeleteId === recipient.id && (
                <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                  <p>
                    This will remove this recipient profile and any associated
                    details. You can recreate it later if needed.
                  </p>
                  {deleteError && (
                    <p className="mt-2 font-semibold">{deleteError}</p>
                  )}
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelDelete}
                      className="rounded-full border border-red-200 px-3 py-1 font-semibold text-red-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <div className="rounded-3xl border border-gp-evergreen/20 bg-white/95 p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
                {formMode === "create" ? "New recipient" : "Edit recipient"}
              </p>
              <h2 className="text-2xl font-semibold text-gp-evergreen">
                {formMode === "create"
                  ? "Add a recipient profile"
                  : `Update ${activeRecipient?.name ?? "recipient"}`}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
            >
              Close
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleFormSubmit}>
            <div className="flex flex-col gap-3 rounded-2xl border border-gp-evergreen/15 bg-gp-cream/60 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                  className="gp-secondary-button"
                  onClick={() => recipientAvatarInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  {avatarUploading ? "Uploading..." : "Upload photo"}
                </button>
                {formState.avatar_url ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600"
                    onClick={() =>
                      setFormState((prev) => ({ ...prev, avatar_url: "" }))
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
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
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
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
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
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
                      className="w-full rounded-2xl border border-gp-evergreen/30 bg-white/80 px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
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
                      className="w-full rounded-2xl border border-gp-evergreen/30 bg-white/80 px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
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
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="annual-budget"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Approx. yearly budget (optional)
                </label>
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
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gp-evergreen">
                  Typical per-gift range (optional)
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
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
                    className="rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                  />
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
                    className="rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="birthday"
                className="text-sm font-medium text-gp-evergreen"
              >
                Birthday
              </label>
              <input
                id="birthday"
                type="date"
                value={formState.birthday}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    birthday: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
              {formState.birthday && (
                <p className="text-xs text-gp-evergreen/70">
                  Approx. age: {approxAge ?? "—"}
                </p>
              )}
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
                rows={4}
                value={formState.notes}
                placeholder={NOTES_PLACEHOLDER}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gp-gold px-5 py-3 text-sm font-semibold text-gp-evergreen transition hover:bg-[#bda775] disabled:opacity-60"
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
              <p className="rounded-2xl bg-gp-cream px-4 py-2 text-sm text-gp-evergreen">
                {formMessage}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
