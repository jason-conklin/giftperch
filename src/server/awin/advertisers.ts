import { AWIN_PROVIDER, type AwinImportContext } from "./types";

export type AwinMatchingPolicy =
  | "piscifun-fishing"
  | "fosi-audio"
  | "mosaic-comfort"
  | "imarku-kitchen"
  | "baby-shusher"
  | "mojo-fun"
  | "loomy-home"
  | "bonheur-jewelry"
  | "fan-ink"
  | "beyond-memories"
  | "magicshine-cycling"
  | "hula-daddy-coffee"
  | "coziwow-pets"
  | "standard";

export type AwinAdvertiserConfig = {
  key: string;
  advertiserId: string;
  displayName: string;
  locale: string;
  importEnabled: boolean;
  recommendationEnabled: boolean;
  matchingPolicy: AwinMatchingPolicy;
  importSafeguards?: {
    minimumValidProducts?: number;
  };
};

export const DEFAULT_AWIN_ADVERTISER_KEY = "piscifun";

export const AWIN_ADVERTISERS = [
  {
    key: DEFAULT_AWIN_ADVERTISER_KEY,
    advertiserId: "89509",
    displayName: "Piscifun",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "piscifun-fishing",
  },
  {
    key: "fosi-audio",
    advertiserId: "119395",
    displayName: "Fosi Audio",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "fosi-audio",
    importSafeguards: {
      minimumValidProducts: 300,
    },
  },
  {
    key: "mosaic-weighted-blankets",
    advertiserId: "87403",
    displayName: "Mosaic Weighted Blankets",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "mosaic-comfort",
    importSafeguards: {
      minimumValidProducts: 600,
    },
  },
  {
    key: "imarku",
    advertiserId: "78080",
    displayName: "Imarku",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "imarku-kitchen",
    importSafeguards: {
      minimumValidProducts: 180,
    },
  },
  {
    key: "baby-shusher",
    advertiserId: "118079",
    displayName: "Baby Shusher",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "baby-shusher",
    importSafeguards: {
      minimumValidProducts: 20,
    },
  },
  {
    key: "mojo-fun",
    advertiserId: "122958",
    displayName: "Mojo Fun",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "mojo-fun",
    importSafeguards: {
      minimumValidProducts: 300,
    },
  },
  {
    key: "loomy-home",
    advertiserId: "90515",
    displayName: "LOOMY Home",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "loomy-home",
    importSafeguards: {
      minimumValidProducts: 1800,
    },
  },
  {
    key: "bonheur-jewelry",
    advertiserId: "90759",
    displayName: "BONHEUR JEWELRY",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "bonheur-jewelry",
    importSafeguards: {
      minimumValidProducts: 220,
    },
  },
  {
    key: "fan-ink",
    advertiserId: "103359",
    displayName: "Fan Ink",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "fan-ink",
    importSafeguards: {
      minimumValidProducts: 650,
    },
  },
  {
    key: "beyond-memories",
    advertiserId: "87175",
    displayName: "Beyond Memories",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "beyond-memories",
    importSafeguards: {
      minimumValidProducts: 700,
    },
  },
  {
    key: "magicshine",
    advertiserId: "107838",
    displayName: "Magicshine",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "magicshine-cycling",
    importSafeguards: {
      minimumValidProducts: 220,
    },
  },
  {
    key: "hula-daddy-kona-coffee",
    advertiserId: "122368",
    displayName: "Hula Daddy Kona Coffee",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "hula-daddy-coffee",
    importSafeguards: {
      minimumValidProducts: 30,
    },
  },
  {
    key: "coziwow",
    advertiserId: "121696",
    displayName: "Coziwow",
    locale: "en_US",
    importEnabled: true,
    recommendationEnabled: true,
    matchingPolicy: "coziwow-pets",
    importSafeguards: {
      minimumValidProducts: 190,
    },
  },
] as const satisfies readonly AwinAdvertiserConfig[];

export function resolveAwinAdvertiser(
  selection = DEFAULT_AWIN_ADVERTISER_KEY,
  registry: readonly AwinAdvertiserConfig[] = AWIN_ADVERTISERS,
): AwinAdvertiserConfig {
  const normalized = selection.trim().toLowerCase();
  const advertiser = registry.find(
    (candidate) =>
      candidate.key.toLowerCase() === normalized ||
      candidate.advertiserId === normalized,
  );
  if (!advertiser) {
    throw new Error(`Unknown Awin advertiser: ${selection || "(empty)"}.`);
  }
  if (!advertiser.importEnabled) {
    throw new Error(`Awin imports are disabled for ${advertiser.displayName}.`);
  }
  return advertiser;
}

export function findAwinAdvertiserById(
  advertiserId: string,
  registry: readonly AwinAdvertiserConfig[] = AWIN_ADVERTISERS,
): AwinAdvertiserConfig | null {
  return (
    registry.find((candidate) => candidate.advertiserId === advertiserId) ??
    null
  );
}

export function findRecommendationEnabledAwinAdvertiserById(
  advertiserId: string,
  registry: readonly AwinAdvertiserConfig[] = AWIN_ADVERTISERS,
): AwinAdvertiserConfig | null {
  const advertiser = registry.find(
    (candidate) => candidate.advertiserId === advertiserId,
  );
  return advertiser?.recommendationEnabled ? advertiser : null;
}

export function getImportEnabledAwinAdvertisers(): readonly AwinAdvertiserConfig[] {
  return AWIN_ADVERTISERS.filter((advertiser) => advertiser.importEnabled);
}

export function createAwinImportContext(
  publisherId: string,
  advertiser: AwinAdvertiserConfig,
): AwinImportContext {
  return {
    provider: AWIN_PROVIDER,
    publisherId,
    advertiserId: advertiser.advertiserId,
    locale: advertiser.locale,
  };
}

export function assertAwinImportContext(
  context: AwinImportContext,
  registry: readonly AwinAdvertiserConfig[] = AWIN_ADVERTISERS,
): AwinAdvertiserConfig {
  const configured = resolveAwinAdvertiser(context.advertiserId, registry);
  if (
    context.provider !== AWIN_PROVIDER ||
    context.locale !== configured.locale
  ) {
    throw new Error(
      `Awin import context does not match advertiser ${configured.displayName}.`,
    );
  }
  return configured;
}

export function snapshotSlug(advertiser: AwinAdvertiserConfig): string {
  return advertiser.key.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}
