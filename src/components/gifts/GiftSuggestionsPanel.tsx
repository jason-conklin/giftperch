"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";

type RecipientOption = {
  id: string;
  name: string;
  relationship: string | null;
};

export type GiftSuggestion = {
  id: string;
  title: string;
  short_description: string;
  tier: "safe" | "thoughtful" | "experience" | "splurge";
  price_min?: number | null;
  price_max?: number | null;
  price_hint?: string | null;
  why_it_fits: string;
  suggested_url?: string | null;
};

type GiftPromptContext = {
  recipient_id: string;
  recipient_name: string;
  relationship?: string | null;
  occasion?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  notes_summary?: string | null;
  interests_summary?: string | null;
  last_gifts_summary?: string | null;
};

type SuggestionRun = {
  id: string;
  created_at: string;
  prompt_context: GiftPromptContext;
  suggestions: GiftSuggestion[];
};

type TierFilter = "all" | GiftSuggestion["tier"];
type SortOption = "relevance" | "price-asc" | "price-desc" | "tier";

type AmazonProduct = {
  asin: string;
  title: string;
  imageUrl: string | null;
  detailPageUrl: string | null;
  priceDisplay: string | null;
  currency?: string | null;
  primeEligible?: boolean | null;
};

type AmazonSuggestionState = {
  loading: boolean;
  error: string;
  products: AmazonProduct[];
};

export function GiftSuggestionsPanel() {
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [occasion, setOccasion] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [numSuggestions, setNumSuggestions] = useState("5");

  const [runs, setRuns] = useState<SuggestionRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState("");
  const [copiedSuggestionId, setCopiedSuggestionId] = useState<string | null>(
    null,
  );
  const [amazonBySuggestion, setAmazonBySuggestion] = useState<
    Record<string, AmazonSuggestionState>
  >({});

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let isMounted = true;

    const loadRecipients = async () => {
      setIsLoadingRecipients(true);
      setError("");
      const { data, error } = await supabase
        .from("recipient_profiles")
        .select("id, name, relationship")
        .order("name", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setRecipients([]);
      } else {
        const options = (data ?? []) as RecipientOption[];
        setRecipients(options);
        if (!selectedRecipientId && options.length > 0) {
          setSelectedRecipientId(options[0].id);
        }
      }

      setIsLoadingRecipients(false);
    };

    loadRecipients();
    return () => {
      isMounted = false;
    };
  }, [status, user, supabase]);

  useEffect(() => {
    if (!selectedRecipientId) {
      setRuns([]);
      setActiveRunId(null);
      return;
    }

    let isMounted = true;
    const loadRuns = async () => {
      setIsLoadingRuns(true);
      setError("");
      const { data, error } = await supabase
        .from("gift_suggestions")
        .select("id, created_at, prompt_context, suggestions")
        .eq("recipient_id", selectedRecipientId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setRuns([]);
        setActiveRunId(null);
      } else {
        const fetchedRuns = (data ?? []) as SuggestionRun[];
        setRuns(fetchedRuns);
        setActiveRunId(fetchedRuns.length > 0 ? fetchedRuns[0].id : null);
      }

      setIsLoadingRuns(false);
    };

    loadRuns();
    return () => {
      isMounted = false;
    };
  }, [selectedRecipientId, supabase]);

  const activeRun = useMemo(
    () => runs.find((run) => run.id === activeRunId) ?? null,
    [runs, activeRunId],
  );

  useEffect(() => {
    setAmazonBySuggestion({});
  }, [activeRunId]);

  const visibleSuggestions = useMemo(() => {
    if (!activeRun) return [];
    let suggestions = [...(activeRun.suggestions ?? [])];

    if (tierFilter !== "all") {
      suggestions = suggestions.filter((sugg) => sugg.tier === tierFilter);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      suggestions = suggestions.filter((sugg) => {
        const haystack = `${sugg.title} ${sugg.short_description} ${sugg.why_it_fits}`.toLowerCase();
        return haystack.includes(term);
      });
    }

    suggestions.sort((a, b) => {
      if (sortOption === "price-asc" || sortOption === "price-desc") {
        const aPrice = a.price_min ?? a.price_max ?? Infinity;
        const bPrice = b.price_min ?? b.price_max ?? Infinity;
        if (sortOption === "price-asc") {
          return (aPrice || Infinity) - (bPrice || Infinity);
        }
        return (bPrice || -Infinity) - (aPrice || -Infinity);
      }

      if (sortOption === "tier") {
        const order: Record<GiftSuggestion["tier"], number> = {
          safe: 0,
          thoughtful: 1,
          experience: 2,
          splurge: 3,
        };
        return order[a.tier] - order[b.tier];
      }

      return 0;
    });

    return suggestions;
  }, [activeRun, tierFilter, searchTerm, sortOption]);

  const isInitialLoading =
    status === "loading" ||
    (status === "authenticated" && isLoadingRecipients && !recipients.length);

  const handleRequestSuggestions = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRecipientId) {
      setError("Select a recipient before requesting suggestions.");
      return;
    }

    setError("");
    setIsRequesting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const payload = {
        recipientId: selectedRecipientId,
        occasion: occasion.trim() || null,
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        numSuggestions: numSuggestions ? Number(numSuggestions) : undefined,
      };

      const response = await fetch("/api/perchpal/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || "Unable to generate suggestions.");
      }

      const json = await response.json();
      const newRun: SuggestionRun = {
        id: json.suggestionRunId,
        created_at: json.createdAt,
        prompt_context: json.promptContext,
        suggestions: json.suggestions,
      };

      setRuns((prev) => [newRun, ...prev]);
      setActiveRunId(newRun.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleFetchAmazonProducts = async (suggestion: GiftSuggestion) => {
    const suggestionId = suggestion.id;
    if (!suggestion.title.trim()) return;

    setAmazonBySuggestion((prev) => ({
      ...prev,
      [suggestionId]: {
        loading: true,
        error: "",
        products: prev[suggestionId]?.products ?? [],
      },
    }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("/api/amazon/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          query: suggestion.title,
          budgetMin: activeRun?.prompt_context?.budget_min ?? null,
          budgetMax: activeRun?.prompt_context?.budget_max ?? null,
          maxResults: 6,
        }),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(json?.error || "Amazon search failed.");
      }

      const json = await response.json();
      const products = (json.products ?? []) as AmazonProduct[];

      setAmazonBySuggestion((prev) => ({
        ...prev,
        [suggestionId]: {
          loading: false,
          error: "",
          products,
        },
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to search Amazon.";
      setAmazonBySuggestion((prev) => ({
        ...prev,
        [suggestionId]: {
          loading: false,
          error: message,
          products: prev[suggestionId]?.products ?? [],
        },
      }));
    }
  };

  const handleCopySuggestion = async (suggestion: GiftSuggestion) => {
    const text = [
      suggestion.title,
      suggestion.short_description,
      suggestion.why_it_fits,
      suggestion.price_hint ||
        buildPriceDisplay(suggestion.price_min, suggestion.price_max),
      suggestion.suggested_url,
    ]
      .filter(Boolean)
      .join(" - ");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuggestionId(suggestion.id);
      setTimeout(() => setCopiedSuggestionId(null), 2000);
    } catch {
      setError("Unable to copy idea to clipboard.");
    }
  };

  if (isInitialLoading) {
    return (
      <section className="rounded-3xl border border-gp-evergreen/15 bg-white/95 p-6">
        <PerchPalLoader
          variant="block"
          size="md"
          message="PerchPal is loading your recipients..."
        />
      </section>
    );
  }

  if (status !== "authenticated" || !user) {
    return null;
  }

  const recipientOptions = recipients.map((recipient) => ({
    value: recipient.id,
    label: recipient.relationship
      ? `${recipient.name} (${recipient.relationship})`
      : recipient.name,
  }));

  return (
    <section className="space-y-4 rounded-3xl border border-gp-evergreen/15 bg-white/95 p-4 sm:p-6 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-gp-evergreen">
          AI Gift Suggestions
        </h2>
        <p className="text-sm text-gp-evergreen/70">
          Choose a recipient, set a budget or occasion, and PerchPal will craft
          tailored gift ideas with clear reasoning.
        </p>
      </header>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {recipients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gp-evergreen/30 bg-gp-cream/60 p-6 text-sm text-gp-evergreen">
          Add a recipient profile first so PerchPal knows who you’re gifting
          for.
        </div>
      ) : (
        <>
          <form
            className="mt-2 grid gap-3 md:grid-cols-4 md:items-end"
            onSubmit={handleRequestSuggestions}
          >
            <div className="md:col-span-2">
              <label
                htmlFor="recipient-select"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                Recipient
              </label>
              <select
                id="recipient-select"
                value={selectedRecipientId}
                onChange={(event) => setSelectedRecipientId(event.target.value)}
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              >
                {recipientOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="occasion-input"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                Occasion (optional)
              </label>
              <input
                id="occasion-input"
                type="text"
                value={occasion}
                onChange={(event) => setOccasion(event.target.value)}
                placeholder="Birthday, anniversary..."
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="num-suggestions-input"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                # of ideas (3-10)
              </label>
              <input
                id="num-suggestions-input"
                type="number"
                min={3}
                max={10}
                value={numSuggestions}
                onChange={(event) => setNumSuggestions(event.target.value)}
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="budget-min-input"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                Budget range
              </label>
              <div className="flex gap-2">
                <input
                  id="budget-min-input"
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={budgetMin}
                  onChange={(event) => setBudgetMin(event.target.value)}
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={budgetMax}
                  onChange={(event) => setBudgetMax(event.target.value)}
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2 md:text-right">
              <button
                type="submit"
                disabled={isRequesting || !selectedRecipientId}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132] disabled:opacity-60 md:w-auto"
              >
                {isRequesting
                  ? "Asking PerchPal..."
                  : "Ask PerchPal for suggestions"}
              </button>
            </div>
          </form>

          {runs.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gp-evergreen/70">
              <span className="font-semibold uppercase tracking-wide">
                Previous runs
              </span>
              {runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setActiveRunId(run.id)}
                  className={`rounded-full border px-3 py-1 ${
                    run.id === activeRunId
                      ? "border-gp-evergreen bg-gp-evergreen text-gp-cream"
                      : "border-gp-evergreen/30 text-gp-evergreen hover:bg-gp-cream/70"
                  }`}
                >
                  {new Date(run.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {run.prompt_context.occasion
                    ? ` - ${run.prompt_context.occasion}`
                    : ""}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label
                htmlFor="search-suggestions"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                Search ideas
              </label>
              <input
                id="search-suggestions"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title or rationale"
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="tier-filter"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                Filter by tier
              </label>
              <select
                id="tier-filter"
                value={tierFilter}
                onChange={(event) =>
                  setTierFilter(event.target.value as TierFilter)
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              >
                <option value="all">All tiers</option>
                <option value="safe">Safe favorites</option>
                <option value="thoughtful">Thoughtful</option>
                <option value="experience">Experiences</option>
                <option value="splurge">Splurges</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="sort-option"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                Sort by
              </label>
              <select
                id="sort-option"
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value as SortOption)
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              >
                <option value="relevance">Model order</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
                <option value="tier">Tier</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            {isLoadingRuns ? (
              <PerchPalLoader
                variant="block"
                size="md"
                message="PerchPal is gathering previous suggestion runs..."
              />
            ) : !activeRun ? (
              <div className="rounded-2xl border border-dashed border-gp-evergreen/30 bg-gp-cream/60 p-6 text-center text-sm text-gp-evergreen">
                Ask PerchPal for suggestions to see curated ideas here.
              </div>
            ) : visibleSuggestions.length === 0 ? (
              <div className="rounded-2xl border border-gp-evergreen/20 bg-white/90 p-6 text-sm text-gp-evergreen">
                No suggestions match your filters. Clear the filters to see all
                ideas from this run.
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gp-evergreen/70">
                  <span>
                    Generated {new Date(activeRun.created_at).toLocaleString()}{" "}
                    for {activeRun.prompt_context.recipient_name}
                    {activeRun.prompt_context.occasion
                      ? ` - ${activeRun.prompt_context.occasion}`
                      : ""}
                  </span>
                  {activeRun.prompt_context.budget_min ||
                  activeRun.prompt_context.budget_max ? (
                    <span>
                      Budget:{" "}
                      {formatBudgetRange(
                        activeRun.prompt_context.budget_min,
                        activeRun.prompt_context.budget_max,
                      )}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleSuggestions.map((suggestion) => {
                    const amazonState = amazonBySuggestion[suggestion.id];
                    return (
                      <article
                        key={suggestion.id}
                        className="flex flex-col gap-3 rounded-2xl border border-gp-evergreen/15 bg-white/90 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-gp-evergreen">
                              {suggestion.title}
                            </h3>
                            <p className="text-sm text-gp-evergreen/80">
                              {suggestion.short_description}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              tierBadgeClasses[suggestion.tier]
                            }`}
                          >
                            {tierLabels[suggestion.tier]}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gp-evergreen">
                          <span className="rounded-full border border-gp-evergreen/30 bg-gp-cream/70 px-3 py-1">
                            {suggestion.price_hint ||
                              buildPriceDisplay(
                                suggestion.price_min,
                                suggestion.price_max,
                              ) ||
                              "Price TBD"}
                          </span>
                          {suggestion.suggested_url && (
                            <a
                              href={suggestion.suggested_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
                            >
                              View link
                            </a>
                          )}
                        </div>

                        <div className="rounded-2xl border border-gp-evergreen/15 bg-gp-cream/60 px-4 py-3 text-sm text-gp-evergreen/90">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
                            Why this fits
                          </p>
                          <p>{suggestion.why_it_fits}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopySuggestion(suggestion)}
                            className="flex-1 rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
                          >
                            {copiedSuggestionId === suggestion.id
                              ? "Copied!"
                              : "Copy idea"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFetchAmazonProducts(suggestion)}
                            className="flex-1 rounded-full border border-gp-gold/50 bg-gp-gold/20 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-gold/30"
                          >
                            Find on Amazon
                          </button>
                          <button
                            type="button"
                            disabled
                            className="flex-1 rounded-full border border-gp-evergreen/15 px-3 py-1 text-xs font-semibold text-gp-evergreen/50"
                          >
                            Save to wishlist (soon)
                          </button>
                        </div>

                        {amazonState && (
                          <div className="rounded-2xl border border-gp-evergreen/15 bg-gp-cream/40 p-3 text-sm text-gp-evergreen">
                            {amazonState.loading ? (
                              <div className="flex justify-center">
                                <PerchPalLoader
                                  variant="inline"
                                  size="sm"
                                  message="Searching Amazon for matches..."
                                />
                              </div>
                            ) : amazonState.error ? (
                              <p className="text-xs text-red-700">
                                {amazonState.error}
                              </p>
                            ) : amazonState.products.length === 0 ? (
                              <p className="text-xs text-gp-evergreen/70">
                                No Amazon matches found yet.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
                                  Amazon matches
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {amazonState.products.map((product) => {
                                    const redirectUrl = product.detailPageUrl
                                      ? buildAffiliateRedirectUrl({
                                          provider: "amazon",
                                          asin: product.asin,
                                          title: product.title,
                                          recipientId:
                                            activeRun?.prompt_context
                                              .recipient_id ?? null,
                                          suggestionRunId: activeRun?.id ?? null,
                                          suggestionId: suggestion.id,
                                          finalUrl: product.detailPageUrl,
                                        })
                                      : null;

                                    return (
                                      <a
                                        key={product.asin}
                                        href={redirectUrl ?? "#"}
                                        target={
                                          redirectUrl ? "_blank" : undefined
                                        }
                                        rel={
                                          redirectUrl ? "noreferrer" : undefined
                                        }
                                        className={`flex gap-2 rounded-xl border border-gp-evergreen/15 bg-white/90 p-2 text-xs text-gp-evergreen transition hover:bg-gp-cream/70 ${
                                          redirectUrl
                                            ? ""
                                            : "pointer-events-none opacity-60"
                                        }`}
                                      >
                                        {product.imageUrl ? (
                                          <img
                                            src={product.imageUrl}
                                            alt={product.title}
                                            className="h-14 w-14 flex-none rounded-lg object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-lg border border-dashed border-gp-evergreen/30 text-[10px] text-gp-evergreen/60">
                                            No image
                                          </div>
                                        )}
                                        <div className="flex min-w-0 flex-col gap-1">
                                          <p className="line-clamp-2 font-semibold">
                                            {product.title}
                                          </p>
                                          <div className="flex flex-wrap items-center gap-1">
                                            {product.priceDisplay && (
                                              <span className="rounded-full bg-gp-cream/80 px-2 py-0.5 text-[10px] font-semibold">
                                                {product.priceDisplay}
                                              </span>
                                            )}
                                            {product.primeEligible && (
                                              <span className="rounded-full border border-gp-evergreen/30 px-2 py-0.5 text-[10px] font-semibold text-gp-evergreen">
                                                Prime
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

const tierLabels: Record<GiftSuggestion["tier"], string> = {
  safe: "Safe favorite",
  thoughtful: "Thoughtful",
  experience: "Experience",
  splurge: "Splurge",
};

const tierBadgeClasses: Record<GiftSuggestion["tier"], string> = {
  safe: "border-gp-evergreen/25 bg-gp-cream/70 text-gp-evergreen",
  thoughtful: "border-gp-gold/40 bg-gp-gold/20 text-gp-evergreen",
  experience: "border-gp-evergreen/30 bg-gp-evergreen/10 text-gp-evergreen",
  splurge: "border-red-200 bg-red-50 text-red-700",
};

function buildPriceDisplay(
  min: number | null | undefined,
  max: number | null | undefined,
) {
  if (typeof min === "number" && typeof max === "number") {
    return `$${Math.round(min)}-$${Math.round(max)}`;
  }
  if (typeof min === "number") {
    return `From $${Math.round(min)}`;
  }
  if (typeof max === "number") {
    return `Up to $${Math.round(max)}`;
  }
  return "";
}

function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined,
) {
  const display = buildPriceDisplay(min, max);
  return display ? display : "Not specified";
}

function buildAffiliateRedirectUrl(params: {
  provider: "amazon";
  asin: string;
  title?: string | null;
  recipientId?: string | null;
  suggestionRunId?: string | null;
  suggestionId?: string | null;
  finalUrl: string;
}) {
  const search = new URLSearchParams();
  search.set("provider", params.provider);
  search.set("asin", params.asin);
  if (params.title) search.set("title", params.title);
  if (params.recipientId) search.set("recipientId", params.recipientId);
  if (params.suggestionRunId)
    search.set("suggestionRunId", params.suggestionRunId);
  if (params.suggestionId) search.set("suggestionId", params.suggestionId);
  search.set("url", params.finalUrl);
  return `/api/affiliate/redirect?${search.toString()}`;
}
