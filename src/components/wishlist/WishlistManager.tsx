"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";

export type Wishlist = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type WishlistItem = {
  id: string;
  wishlist_id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  price_estimate: number | null;
  notes: string | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
};

type WishlistFormState = {
  title: string;
  description: string;
  is_public: boolean;
};

type WishlistItemFormState = {
  title: string;
  url: string;
  image_url: string;
  price_estimate: string;
  priority: string;
  notes: string;
};

const emptyWishlistForm: WishlistFormState = {
  title: "",
  description: "",
  is_public: false,
};

const emptyWishlistItemForm: WishlistItemFormState = {
  title: "",
  url: "",
  image_url: "",
  price_estimate: "",
  priority: "",
  notes: "",
};

type PriorityFilter = "all" | "high" | "medium" | "low";

export function WishlistManager() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { user } = useSupabaseSession();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [activeWishlistId, setActiveWishlistId] = useState<string | null>(
    null
  );
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [wishlistFormOpen, setWishlistFormOpen] = useState(false);
  const [wishlistFormMode, setWishlistFormMode] =
    useState<"create" | "edit">("create");
  const [wishlistFormState, setWishlistFormState] =
    useState<WishlistFormState>(emptyWishlistForm);
  const [wishlistFormSaving, setWishlistFormSaving] = useState(false);
  const [wishlistFormError, setWishlistFormError] = useState("");
  const [wishlistFormMessage, setWishlistFormMessage] = useState("");

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemFormMode, setItemFormMode] =
    useState<"create" | "edit">("create");
  const [itemFormState, setItemFormState] =
    useState<WishlistItemFormState>(emptyWishlistItemForm);
  const [activeItem, setActiveItem] = useState<WishlistItem | null>(null);
  const [itemFormSaving, setItemFormSaving] = useState(false);
  const [itemFormError, setItemFormError] = useState("");
  const [itemFormMessage, setItemFormMessage] = useState("");

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] =
    useState<PriorityFilter>("all");

  useEffect(() => {
    if (!user?.id) {
      setWishlists([]);
      setActiveWishlistId(null);
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    const fetchWishlists = async () => {
      setIsLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (!isMounted) return;
      if (error) {
        setError(error.message);
        setWishlists([]);
        setActiveWishlistId(null);
      } else {
        setWishlists(data ?? []);
        if (data && data.length > 0) {
          const stillValid = data.some((wishlist) => wishlist.id === activeWishlistId);
          if (!stillValid) {
            setActiveWishlistId(data[0].id);
          }
        } else {
          setActiveWishlistId(null);
        }
      }
      setIsLoading(false);
    };

    fetchWishlists();
    return () => {
      isMounted = false;
    };
  }, [supabase, user?.id, activeWishlistId]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!activeWishlistId) {
        setItems([]);
        return;
      }
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("wishlist_id", activeWishlistId)
        .order("priority", { ascending: true, nullsLast: true })
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
      } else {
        setItems(data ?? []);
      }
    };

    fetchItems();
  }, [activeWishlistId, supabase]);

  const activeWishlist = wishlists.find(
    (wishlist) => wishlist.id === activeWishlistId
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = search.trim().toLowerCase();
      if (term) {
        const matchTitle = item.title.toLowerCase().includes(term);
        const matchNotes =
          item.notes?.toLowerCase().includes(term) ?? false;
        if (!matchTitle && !matchNotes) return false;
      }

      if (priorityFilter !== "all") {
        if (item.priority === null) return false;
        if (
          priorityFilter === "high" &&
          !(item.priority <= 2)
        )
          return false;
        if (
          priorityFilter === "medium" &&
          !(item.priority >= 3 && item.priority <= 4)
        )
          return false;
        if (
          priorityFilter === "low" &&
          !(item.priority >= 5)
        )
          return false;
      }

      return true;
    });
  }, [items, search, priorityFilter]);

  const openWishlistForm = (
    mode: "create" | "edit",
    wishlist?: Wishlist
  ) => {
    setWishlistFormMode(mode);
    if (mode === "edit" && wishlist) {
      setWishlistFormState({
        title: wishlist.title,
        description: wishlist.description ?? "",
        is_public: wishlist.is_public,
      });
    } else {
      setWishlistFormState(emptyWishlistForm);
    }
    setWishlistFormError("");
    setWishlistFormMessage("");
    setWishlistFormOpen(true);
  };

  const handleWishlistFormSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setWishlistFormSaving(true);
    setWishlistFormError("");
    setWishlistFormMessage("");

    if (!user?.id) {
      setWishlistFormError("Sign in to manage wishlists.");
      setWishlistFormSaving(false);
      return;
    }

    const payload = {
      title: wishlistFormState.title.trim(),
      description: wishlistFormState.description.trim() || null,
      is_public: wishlistFormState.is_public,
    };

    try {
      if (!payload.title) throw new Error("Title is required.");

      if (wishlistFormMode === "create") {
        const { data, error } = await supabase
          .from("wishlists")
          .insert({
            ...payload,
            user_id: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        setWishlists((prev) => [...prev, data]);
        setActiveWishlistId(data.id);
        setWishlistFormMessage("Wishlist created.");
      } else if (wishlistFormMode === "edit" && activeWishlist) {
        const { data, error } = await supabase
          .from("wishlists")
          .update(payload)
          .eq("id", activeWishlist.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (error) throw error;
        setWishlists((prev) =>
          prev.map((wishlist) =>
            wishlist.id === data.id ? data : wishlist
          )
        );
        setWishlistFormMessage("Wishlist updated.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save wishlist.";
      setWishlistFormError(message);
    } finally {
      setWishlistFormSaving(false);
    }
  };

  const handleDeleteWishlist = async () => {
    if (!activeWishlist || !user?.id) return;
    const confirmDelete = window.confirm(
      `Delete wishlist "${activeWishlist.title}"?`
    );
    if (!confirmDelete) return;
    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", activeWishlist.id)
        .eq("user_id", user.id);
      if (error) throw error;
      setWishlists((prev) =>
        prev.filter((wishlist) => wishlist.id !== activeWishlist.id)
      );
      setItems([]);
      if (wishlists.length > 1) {
        const next = wishlists.find(
          (wishlist) => wishlist.id !== activeWishlist.id
        );
        setActiveWishlistId(next ? next.id : null);
      } else {
        setActiveWishlistId(null);
      }
      setWishlistFormOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete wishlist.";
      setWishlistFormError(message);
    }
  };

  const openItemForm = (
    mode: "create" | "edit",
    item?: WishlistItem
  ) => {
    setItemFormMode(mode);
    if (mode === "edit" && item) {
      setActiveItem(item);
      setItemFormState({
        title: item.title,
        url: item.url ?? "",
        image_url: item.image_url ?? "",
        price_estimate: item.price_estimate
          ? String(item.price_estimate)
          : "",
        priority: item.priority ? String(item.priority) : "",
        notes: item.notes ?? "",
      });
    } else {
      setActiveItem(null);
      setItemFormState(emptyWishlistItemForm);
    }
    setItemFormError("");
    setItemFormMessage("");
    setItemFormOpen(true);
  };

  const handleItemFormSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setItemFormSaving(true);
    setItemFormError("");
    setItemFormMessage("");

    if (!activeWishlistId) {
      setItemFormError("Select a wishlist first.");
      setItemFormSaving(false);
      return;
    }

    const payload = {
      wishlist_id: activeWishlistId,
      title: itemFormState.title.trim(),
      url: itemFormState.url.trim() || null,
      image_url: itemFormState.image_url.trim() || null,
      price_estimate: itemFormState.price_estimate
        ? Number(itemFormState.price_estimate)
        : null,
      priority: itemFormState.priority
        ? Number(itemFormState.priority)
        : null,
      notes: itemFormState.notes.trim() || null,
    };

    try {
      if (!payload.title) throw new Error("Item title is required.");

      if (itemFormMode === "create") {
        const { data, error } = await supabase
          .from("wishlist_items")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setItems((prev) => [data, ...prev]);
        setItemFormMessage("Wishlist item added.");
        setItemFormState(emptyWishlistItemForm);
      } else if (itemFormMode === "edit" && activeItem) {
        const { data, error } = await supabase
          .from("wishlist_items")
          .update(payload)
          .eq("id", activeItem.id)
          .select()
          .single();
        if (error) throw error;
        setItems((prev) =>
          prev.map((item) => (item.id === data.id ? data : item))
        );
        setItemFormMessage("Wishlist item updated.");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to save wishlist item.";
      setItemFormError(message);
    } finally {
      setItemFormSaving(false);
    }
  };

  const handleDeleteItem = async (item: WishlistItem) => {
    const confirmDelete = window.confirm(
      `Remove "${item.title}" from this wishlist?`
    );
    if (!confirmDelete) return;
    try {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete item.";
      setItemFormError(message);
    }
  };

  const renderPriorityBadge = (priority: number | null) => {
    if (priority === null) return null;
    let label = "Low priority";
    let classes =
      "bg-gp-cream/70 text-gp-evergreen border border-gp-evergreen/20";

    if (priority <= 2) {
      label = "High priority";
      classes = "bg-red-100 text-red-800 border border-red-200";
    } else if (priority <= 4) {
      label = "Medium priority";
      classes = "bg-gp-gold/20 text-gp-evergreen border border-gp-gold/50";
    }

    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}
      >
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <PerchPalLoader
          variant="block"
          size="md"
          message="PerchPal is loading your wishlists..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!wishlists.length) {
    return (
      <div className="rounded-3xl border border-dashed border-gp-evergreen/30 bg-gp-cream/70 p-6 text-center text-sm text-gp-evergreen">
        <p className="text-base font-semibold text-gp-evergreen">
          No wishlists yet
        </p>
        <p className="mt-2 text-sm text-gp-evergreen/80">
          Wishlists are totally optional. Use them if you want a personal
          running list of things you love so friends can swoop in when needed.
        </p>
        <button
          type="button"
          onClick={() => openWishlistForm("create")}
          className="mt-4 rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132]"
        >
          Create wishlist
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gp-evergreen/15 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {wishlists.map((wishlist) => (
              <button
                key={wishlist.id}
                type="button"
                onClick={() => setActiveWishlistId(wishlist.id)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  wishlist.id === activeWishlistId
                    ? "border-gp-evergreen bg-gp-evergreen text-gp-cream"
                    : "border-gp-evergreen/30 text-gp-evergreen hover:bg-gp-cream/70"
                }`}
              >
                {wishlist.title}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openWishlistForm("create")}
            className="rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132]"
          >
            New wishlist
          </button>
        </div>

        {activeWishlist && (
          <div className="mt-4 space-y-3 rounded-2xl border border-gp-evergreen/15 bg-gp-cream/60 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  activeWishlist.is_public
                    ? "border border-gp-gold/60 bg-gp-gold/20 text-gp-evergreen"
                    : "border border-gp-evergreen/20 bg-white text-gp-evergreen/80"
                }`}
              >
                {activeWishlist.is_public
                  ? "Public wishlist"
                  : "Private wishlist"}
              </span>
              <button
                type="button"
                onClick={() => openWishlistForm("edit", activeWishlist)}
                className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream"
              >
                Edit wishlist
              </button>
              <button
                type="button"
                onClick={handleDeleteWishlist}
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>
            <p className="text-sm text-gp-evergreen/80">
              {activeWishlist.description || "No description yet."}
            </p>
          </div>
        )}
      </div>

      {!activeWishlist ? (
        <div className="rounded-3xl border border-dashed border-gp-evergreen/30 bg-gp-cream/70 p-6 text-center text-sm text-gp-evergreen">
          Select a wishlist to start adding items.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-3xl border border-gp-evergreen/15 bg-white/90 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="space-y-2">
                <label
                  htmlFor="item-search"
                  className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
                >
                  Search items
                </label>
                <input
                  id="item-search"
                  type="text"
                  placeholder="Search by title or notes..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-full border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="priority-filter"
                  className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
                >
                  Priority
                </label>
                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(event.target.value as PriorityFilter)
                  }
                  className="w-full rounded-full border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                >
                  <option value="all">All priorities</option>
                  <option value="high">High (1-2)</option>
                  <option value="medium">Medium (3-4)</option>
                  <option value="low">Low (5+)</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openItemForm("create")}
              className="rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132]"
            >
              Add item
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gp-evergreen/30 bg-gp-cream/70 p-6 text-center text-sm text-gp-evergreen">
              <p className="text-base font-semibold text-gp-evergreen">
                No items yet
              </p>
              <p className="mt-2 text-sm text-gp-evergreen/80">
                Add your favorite finds, dream gifts, or essentials you would
                love someone to surprise you with.
              </p>
              <button
                type="button"
                onClick={() => openItemForm("create")}
                className="mt-4 rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132]"
              >
                Add wishlist item
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gp-evergreen/15 bg-white/90 p-4 shadow-sm"
                >
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      width={320}
                      height={200}
                      className="h-40 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-gp-evergreen/30 bg-gp-cream/60 text-xs text-gp-evergreen/60">
                      No image
                    </div>
                  )}
                  <div className="mt-4 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-gp-evergreen">
                        {item.title}
                      </p>
                      {item.price_estimate !== null && (
                        <span className="inline-flex rounded-full border border-gp-gold/40 bg-gp-gold/20 px-3 py-1 text-xs font-semibold text-gp-evergreen">
                          ${item.price_estimate.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {renderPriorityBadge(item.priority)}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-semibold text-gp-evergreen underline-offset-4 hover:underline"
                    >
                      View link
                    </a>
                  )}
                  {item.notes && (
                    <p className="mt-3 rounded-xl bg-gp-cream/70 px-3 py-2 text-xs text-gp-evergreen/80">
                      {item.notes}
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openItemForm("edit", item)}
                      className="flex-1 rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      className="flex-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {wishlistFormOpen && (
        <section className="rounded-3xl border border-gp-evergreen/20 bg-white/95 p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
                {wishlistFormMode === "create"
                  ? "Create wishlist"
                  : `Edit ${activeWishlist?.title ?? "wishlist"}`}
              </p>
              <h2 className="text-2xl font-semibold text-gp-evergreen">
                {wishlistFormMode === "create"
                  ? "New wishlist"
                  : "Update wishlist"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setWishlistFormOpen(false)}
              className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
            >
              Close
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleWishlistFormSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="wishlist-title-inline"
                className="text-sm font-medium text-gp-evergreen"
              >
                Title*
              </label>
              <input
                id="wishlist-title-inline"
                type="text"
                required
                value={wishlistFormState.title}
                onChange={(event) =>
                  setWishlistFormState((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="wishlist-description-inline"
                className="text-sm font-medium text-gp-evergreen"
              >
                Description
              </label>
              <textarea
                id="wishlist-description-inline"
                rows={3}
                value={wishlistFormState.description}
                onChange={(event) =>
                  setWishlistFormState((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-gp-evergreen">
              <input
                type="checkbox"
                checked={wishlistFormState.is_public}
                onChange={(event) =>
                  setWishlistFormState((prev) => ({
                    ...prev,
                    is_public: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border border-gp-evergreen/40 text-gp-evergreen focus:ring-gp-gold"
              />
              Make this wishlist public
            </label>

            <button
              type="submit"
              className="w-full rounded-full bg-gp-gold px-5 py-3 text-sm font-semibold text-gp-evergreen transition hover:bg-[#bda775] disabled:opacity-60"
              disabled={wishlistFormSaving}
            >
              {wishlistFormMode === "create"
                ? "Save wishlist"
                : "Update wishlist"}
            </button>

            {wishlistFormSaving && (
              <div className="flex justify-center">
                <PerchPalLoader
                  variant="inline"
                  size="sm"
                  message="PerchPal is saving your wishlist..."
                />
              </div>
            )}

            {wishlistFormError && (
              <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
                {wishlistFormError}
              </p>
            )}
            {wishlistFormMessage && (
              <p className="rounded-2xl bg-gp-cream px-4 py-2 text-sm text-gp-evergreen">
                {wishlistFormMessage}
              </p>
            )}
          </form>
        </section>
      )}

      {itemFormOpen && (
        <section className="rounded-3xl border border-gp-evergreen/20 bg-white/95 p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
                {itemFormMode === "create"
                  ? "Add wishlist item"
                  : `Edit ${activeItem?.title ?? "item"}`}
              </p>
              <h2 className="text-2xl font-semibold text-gp-evergreen">
                {itemFormMode === "create"
                  ? "New wishlist item"
                  : "Update wishlist item"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setItemFormOpen(false)}
              className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
            >
              Close
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleItemFormSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="item-title-inline"
                className="text-sm font-medium text-gp-evergreen"
              >
                Title*
              </label>
              <input
                id="item-title-inline"
                type="text"
                required
                value={itemFormState.title}
                onChange={(event) =>
                  setItemFormState((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="item-url-inline"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Product URL
                </label>
                <input
                  id="item-url-inline"
                  type="url"
                  value={itemFormState.url}
                  onChange={(event) =>
                    setItemFormState((prev) => ({
                      ...prev,
                      url: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="item-image-inline"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Image URL
                </label>
                <input
                  id="item-image-inline"
                  type="url"
                  value={itemFormState.image_url}
                  onChange={(event) =>
                    setItemFormState((prev) => ({
                      ...prev,
                      image_url: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="item-price-inline"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Estimated price
                </label>
                <input
                  id="item-price-inline"
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemFormState.price_estimate}
                  onChange={(event) =>
                    setItemFormState((prev) => ({
                      ...prev,
                      price_estimate: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="item-priority-inline"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Priority (1-5)
                </label>
                <input
                  id="item-priority-inline"
                  type="number"
                  min="1"
                  max="5"
                  value={itemFormState.priority}
                  onChange={(event) =>
                    setItemFormState((prev) => ({
                      ...prev,
                      priority: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="item-notes-inline"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Notes
                </label>
                <textarea
                  id="item-notes-inline"
                  rows={3}
                  value={itemFormState.notes}
                  onChange={(event) =>
                    setItemFormState((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gp-gold px-5 py-3 text-sm font-semibold text-gp-evergreen transition hover:bg-[#bda775] disabled:opacity-60"
              disabled={itemFormSaving}
            >
              {itemFormMode === "create" ? "Save item" : "Update item"}
            </button>

            {itemFormSaving && (
              <div className="flex justify-center">
                <PerchPalLoader
                  variant="inline"
                  size="sm"
                  message="PerchPal is saving your wishlist item..."
                />
              </div>
            )}

            {itemFormError && (
              <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
                {itemFormError}
              </p>
            )}
            {itemFormMessage && (
              <p className="rounded-2xl bg-gp-cream px-4 py-2 text-sm text-gp-evergreen">
                {itemFormMessage}
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
