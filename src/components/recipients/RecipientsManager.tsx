"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
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
  age_hint: string | null;
  gender_hint: string | null;
  notes: string | null;
  budget_annual: number | null;
  budget_per_gift: number | null;
  birthday: string | null;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  relationship: string;
  age_hint: string;
  gender_hint: string;
  notes: string;
  budget_per_gift: string;
  birthday: string;
};

const emptyFormState: FormState = {
  name: "",
  relationship: "",
  age_hint: "",
  gender_hint: "",
  notes: "",
  budget_per_gift: "",
  birthday: "",
};

export function RecipientsManager() {
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

  useEffect(() => {
    let isMounted = true;
    const fetchRecipients = async () => {
      setIsLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("recipient_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (!isMounted) return;
      if (error) {
        setError(error.message);
      } else {
        setRecipients(data ?? []);
      }
      setIsLoading(false);
    };

    fetchRecipients();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

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
      return nameMatch || relationshipMatch;
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

  const openCreateForm = () => {
    setFormMode("create");
    setActiveRecipient(null);
    setFormState(emptyFormState);
    setFormError("");
    setFormMessage("");
    setIsFormOpen(true);
  };

  const openEditForm = (recipient: RecipientProfile) => {
    setFormMode("edit");
    setActiveRecipient(recipient);
    setFormState({
      name: recipient.name ?? "",
      relationship: recipient.relationship ?? "",
      age_hint: recipient.age_hint ?? "",
      gender_hint: recipient.gender_hint ?? "",
      notes: recipient.notes ?? "",
      budget_per_gift: recipient.budget_per_gift
        ? String(recipient.budget_per_gift)
        : "",
      birthday: recipient.birthday ?? "",
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

    const payload = {
      name: formState.name.trim(),
      relationship: formState.relationship.trim() || null,
      age_hint: formState.age_hint.trim() || null,
      gender_hint: formState.gender_hint.trim() || null,
      notes: formState.notes.trim() || null,
      budget_per_gift: formState.budget_per_gift
        ? Number(formState.budget_per_gift)
        : null,
      birthday: formState.birthday || null,
    };

    try {
      if (!payload.name) throw new Error("Name is required.");

      if (formMode === "create") {
        const { data, error } = await supabase
          .from("recipient_profiles")
          .insert(payload)
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
          .select()
          .single();
        if (error) throw error;
        setRecipients((prev) =>
          prev.map((recipient) =>
            recipient.id === data.id ? data : recipient
          )
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
    if (!confirmDeleteId) return;
    setDeleteError("");
    try {
      const { error } = await supabase
        .from("recipient_profiles")
        .delete()
        .eq("id", confirmDeleteId);
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
                <div>
                  <p className="text-lg font-semibold text-gp-evergreen">
                    {recipient.name}
                  </p>
                  <p className="text-sm text-gp-evergreen/70">
                    {recipient.relationship ?? "Relationship TBD"}
                  </p>
                  <Link
                    href={`/history?recipient=${recipient.id}`}
                    className="mt-1 inline-flex text-xs font-semibold text-gp-evergreen underline-offset-4 hover:underline"
                  >
                    View gift history
                  </Link>
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
                  <dt className="font-semibold">Per-gift budget</dt>
                  <dd>
                    {recipient.budget_per_gift
                      ? `$${recipient.budget_per_gift.toFixed(0)}`
                      : "Not set"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold">Annual budget</dt>
                  <dd>
                    {recipient.budget_annual
                      ? `$${recipient.budget_annual.toFixed(0)}`
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
                    {recipient.budget_per_gift || recipient.budget_annual ? (
                      <p className="mt-1">
                        Typically spends around{" "}
                        <span className="font-semibold">
                          {recipient.budget_per_gift
                            ? `$${recipient.budget_per_gift.toFixed(0)}`
                            : "—"}
                        </span>{" "}
                        per gift{" "}
                        {recipient.budget_annual && (
                          <>
                            (approximately{" "}
                            <span className="font-semibold">
                              ${recipient.budget_annual.toFixed(0)}
                            </span>{" "}
                            annually)
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
                <input
                  id="relationship"
                  type="text"
                  value={formState.relationship}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      relationship: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="budget-per-gift"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Budget per gift
                </label>
                <input
                  id="budget-per-gift"
                  type="number"
                  min="0"
                  value={formState.budget_per_gift}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      budget_per_gift: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="age-hint"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Age hint
                </label>
                <input
                  id="age-hint"
                  type="text"
                  value={formState.age_hint}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      age_hint: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="gender-hint"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Gender hint
                </label>
                <input
                  id="gender-hint"
                  type="text"
                  value={formState.gender_hint}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      gender_hint: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
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
                rows={3}
                value={formState.notes}
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
