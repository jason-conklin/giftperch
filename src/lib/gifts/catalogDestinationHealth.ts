import { normalizeProductMatch } from "@/lib/affiliateProduct";
import { requiresVerifiedAwinProductDestination } from "@/server/awin/advertisers";

export type AwinDestinationIdentity = {
  advertiserId: string;
  locale: string;
  productId: string;
};

export type AwinDestinationHealthRecord = AwinDestinationIdentity & {
  status: "valid" | "invalid" | "uncertain" | "unchecked";
  checkedAt: string | null;
};

export type GiftCatalogPresentation = {
  title: string;
  supportingText: string | null;
  usesCatalogIdentity: boolean;
};

function identityKey(identity: AwinDestinationIdentity): string {
  return `${identity.advertiserId}:${identity.locale}:${identity.productId}`;
}

function normalizedPresentationTitle(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function resolveGiftCatalogPresentation(options: {
  title: unknown;
  supportingText: unknown;
  productMatch: unknown;
}): GiftCatalogPresentation | null {
  const title = typeof options.title === "string" ? options.title.trim() : "";
  const supportingText =
    typeof options.supportingText === "string" && options.supportingText.trim()
      ? options.supportingText.trim()
      : null;
  const match = normalizeProductMatch(options.productMatch);
  if (!title) return null;
  if (
    match?.provider !== "awin" ||
    !match.advertiserId ||
    !requiresVerifiedAwinProductDestination(match.advertiserId)
  ) {
    return { title, supportingText, usesCatalogIdentity: false };
  }

  const productTitle = match.productTitle.trim();
  if (!productTitle) {
    return { title, supportingText, usesCatalogIdentity: false };
  }
  const titlesAreEquivalent =
    normalizedPresentationTitle(title) ===
    normalizedPresentationTitle(productTitle);
  return {
    title: productTitle,
    supportingText: titlesAreEquivalent
      ? supportingText
      : `Original recommendation: ${title}`,
    usesCatalogIdentity: true,
  };
}

export function collectAwinDestinationIdentities(
  suggestions: ReadonlyArray<{ productMatch?: unknown }>,
): AwinDestinationIdentity[] {
  const identities = new Map<string, AwinDestinationIdentity>();
  for (const suggestion of suggestions) {
    const match = normalizeProductMatch(suggestion.productMatch);
    if (
      match?.provider !== "awin" ||
      !match.advertiserId ||
      !match.locale
    ) {
      continue;
    }
    const identity = {
      advertiserId: match.advertiserId,
      locale: match.locale,
      productId: match.productId,
    };
    identities.set(identityKey(identity), identity);
  }
  return [...identities.values()];
}

export function applyCurrentAwinDestinationHealth<
  T extends {
    productMatch?: unknown;
    suggested_url?: string | null;
    title?: string | null;
    short_description?: string | null;
  },
>(suggestions: readonly T[], records: readonly AwinDestinationHealthRecord[]): T[] {
  const byIdentity = new Map(records.map((record) => [identityKey(record), record]));

  return suggestions.map((suggestion) => {
    const match = normalizeProductMatch(suggestion.productMatch);
    if (
      match?.provider !== "awin" ||
      !match.advertiserId ||
      !match.locale
    ) {
      return suggestion;
    }
    const record = byIdentity.get(
      identityKey({
        advertiserId: match.advertiserId,
        locale: match.locale,
        productId: match.productId,
      }),
    );
    const requiresVerification = requiresVerifiedAwinProductDestination(
      match.advertiserId,
    );
    if (!record && !requiresVerification) return suggestion;

    const status = record?.status ?? "unchecked";
    const productMatch = {
      ...match,
      destinationHealthStatus: status,
      ...(record?.checkedAt
        ? { destinationCheckedAt: record.checkedAt }
        : {}),
    };
    const presentation = resolveGiftCatalogPresentation({
      title: suggestion.title,
      supportingText: suggestion.short_description,
      productMatch,
    });
    return {
      ...suggestion,
      productMatch,
      ...(presentation?.usesCatalogIdentity
        ? {
            title: presentation.title,
            short_description: presentation.supportingText,
          }
        : {}),
      ...(status === "valid" ? {} : { suggested_url: null }),
    };
  });
}
