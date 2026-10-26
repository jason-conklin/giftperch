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

function identityKey(identity: AwinDestinationIdentity): string {
  return `${identity.advertiserId}:${identity.locale}:${identity.productId}`;
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
  T extends { productMatch?: unknown; suggested_url?: string | null },
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
    return {
      ...suggestion,
      productMatch,
      ...(status === "valid" ? {} : { suggested_url: null }),
    };
  });
}
