"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { AddRecipientModal } from "./AddRecipientModal";
import { RecipientsOverview } from "./RecipientsOverview";
import { RecipientProfileModal } from "./RecipientProfileModal";
import { fetchRecipientSavedCounts, type RecipientOccasion } from "@/lib/recipientOverview";
import { getRecipientAvatarVisual } from "@/lib/recipientAvatar";

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
  avatar_icon: string | null;
  is_self: boolean;
  self_slug: string | null;
  created_at: string;
  updated_at: string;
};

const PET_RELATIONSHIP = "Pet";

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

export function RecipientsManager() {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [recipients, setRecipients] = useState<RecipientProfile[]>([]);
  const [interests, setInterests] = useState<RecipientInterest[]>([]);
  const [selectedRecipient, setSelectedRecipient] =
    useState<RecipientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<RecipientOccasion[] | null>(null);
  const [savedCounts, setSavedCounts] = useState<Record<string, number> | null>(null);
  const [savedRevision, setSavedRevision] = useState(0);
  const [overviewError, setOverviewError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] =
    useState<"profile" | "saved">("profile");
  const [profileInitialEditing, setProfileInitialEditing] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingRecipient, setIsDeletingRecipient] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);

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
    let active = true;
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
      if (!active) return;
      if (error) {
        setError(error.message);
      } else {
        setInterests(data ?? []);
      }
    };

    fetchInterests();
    return () => { active = false; };
  }, [recipients, supabase]);

  useEffect(() => {
    let active = true;
    const loadOverview = async () => {
      setEvents(null);
      setSavedCounts(null);
      setOverviewError("");
      if (!user?.id || !recipients.length) return;
      try {
        const counts = await fetchRecipientSavedCounts(supabase, user.id);
        if (active) setSavedCounts(counts);
        const rows: RecipientOccasion[] = [];
        const ids = recipients.map((recipient) => recipient.id);
        // Bound URL/filter length and paginate each batch beyond the API row cap.
        for (let batch = 0; batch < ids.length; batch += 100) {
          for (let offset = 0; ; offset += 1000) {
            const { data, error: eventError } = await supabase.from("recipient_events")
              .select("id, recipient_id, label, event_date, event_type, occurs_every_year")
              .in("recipient_id", ids.slice(batch, batch + 100))
              .order("id").range(offset, offset + 999);
            if (eventError) throw eventError;
            rows.push(...(data ?? []) as RecipientOccasion[]);
            if (!data || data.length < 1000) break;
          }
        }
        if (active) setEvents(rows);
      } catch {
        if (active) setOverviewError("Some saved gift counts or occasions could not be loaded. You can still open each profile and its saved gifts.");
      }
    };
    void loadOverview();
    return () => { active = false; };
  }, [recipients, supabase, user?.id, savedRevision]);

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
    setFormMessage("");
    setIsFormOpen(true);
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

  return (
    <div className="space-y-6">
      <RecipientsOverview
        recipients={recipients}
        interests={interests}
        events={!isLoading && !recipients.length ? [] : events}
        savedCounts={!isLoading && !recipients.length ? {} : savedCounts}
        loading={isLoading}
        onCreate={openCreateForm}
        onView={(recipient) => {
          setProfileInitialTab("profile");
          setProfileInitialEditing(false);
          setSelectedRecipient(recipient);
        }}
        onEdit={(recipient) => {
          setProfileInitialTab("profile");
          setProfileInitialEditing(true);
          setSelectedRecipient(recipient);
        }}
        onDelete={requestDelete}
        onSaved={(recipient) => {
          setProfileInitialTab("saved");
          setProfileInitialEditing(false);
          setSelectedRecipient(recipient);
        }}
        avatarFor={getRecipientAvatarVisual}
        relationshipFor={describeRelationship}
        budgetFor={formatGiftBudgetRange}
        notices={<>
          {error && <div role="alert" className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {overviewError && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-gp-evergreen">{overviewError}</div>}
          {formMessage && !isFormOpen && <div role="status" className="rounded-lg border border-green-200 bg-green-100 px-4 py-2 text-sm text-gp-evergreen">{formMessage}</div>}
        </>}
      />

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
        <RecipientProfileModal
          key={`${selectedRecipient.id}-${profileInitialTab}-${profileInitialEditing}`}
          recipient={selectedRecipient}
          interests={interestsByRecipient[selectedRecipient.id] ?? []}
          savedCount={savedCounts?.[selectedRecipient.id] ?? (savedCounts ? 0 : null)}
          authToken={authToken}
          initialTab={profileInitialTab}
          initialEditing={profileInitialEditing}
          onClose={() => {
            setSelectedRecipient(null);
            setSavedRevision((revision) => revision + 1);
          }}
          onRecipientUpdated={(updated) => {
            setRecipients((current) =>
              current.map((item) => item.id === updated.id ? updated : item),
            );
            setSelectedRecipient(updated);
          }}
          onInterestsUpdated={(recipientId, nextInterests) => {
            setInterests((current) => [
              ...current.filter((item) => item.recipient_id !== recipientId),
              ...nextInterests,
            ]);
          }}
          onSavedGiftRemoved={(recipientId) =>
            setSavedCounts((counts) => counts ? {
              ...counts,
              [recipientId]: Math.max(0, (counts[recipientId] ?? 0) - 1),
            } : null)
          }
        />
      ) : null}

      {isFormOpen ? (
        <AddRecipientModal
          onClose={() => setIsFormOpen(false)}
          onProfilePersisted={(recipient) => {
            setRecipients((current) => current.some((item) => item.id === recipient.id)
              ? current.map((item) => item.id === recipient.id ? recipient : item)
              : [recipient, ...current]);
          }}
          onInterestsPersisted={(recipientId, nextInterests) => {
            setInterests((current) => [
              ...current.filter((item) => item.recipient_id !== recipientId),
              ...nextInterests,
            ]);
          }}
          onComplete={() => {
            setIsFormOpen(false);
            setFormMessage("Recipient added successfully.");
          }}
        />
      ) : null}

    </div>
  );
}
