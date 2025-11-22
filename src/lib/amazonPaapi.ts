import crypto from "crypto";

export type AmazonProduct = {
  asin: string;
  title: string;
  imageUrl: string | null;
  detailPageUrl: string | null;
  priceDisplay: string | null;
  currency?: string | null;
  primeEligible?: boolean | null;
};

type PaapiListing = {
  Price?: {
    DisplayAmount?: string | null;
    Currency?: string | null;
  } | null;
  DeliveryInfo?: {
    IsPrimeEligible?: boolean | null;
  } | null;
};

type PaapiItemResponse = {
  ASIN?: string;
  DetailPageURL?: string | null;
  ItemInfo?: {
    Title?: {
      DisplayValue?: string | null;
      DisplayName?: string | null;
    } | null;
  } | null;
  Images?: {
    Primary?: {
      Medium?: { URL?: string | null } | null;
      Large?: { URL?: string | null } | null;
      Small?: { URL?: string | null } | null;
    } | null;
  } | null;
  Offers?: {
    Listings?: PaapiListing[] | null;
  } | null;
};

type PaapiResponse = {
  ItemsResult?: {
    Items?: PaapiItemResponse[] | null;
  } | null;
  Errors?: Array<{ Message?: string }>;
};

const {
  AMAZON_PA_ACCESS_KEY,
  AMAZON_PA_SECRET_KEY,
  AMAZON_PA_PARTNER_TAG,
  AMAZON_PA_REGION,
  NEXT_PUBLIC_AMAZON_PARTNER_TAG,
} = process.env;

const AMAZON_PARTNER_TAG =
  AMAZON_PA_PARTNER_TAG ||
  NEXT_PUBLIC_AMAZON_PARTNER_TAG ||
  "giftperch-20";

const HOST_BY_REGION: Record<string, { host: string; marketplace: string }> = {
  "us-east-1": { host: "webservices.amazon.com", marketplace: "www.amazon.com" },
  "us-west-2": { host: "webservices.amazon.com", marketplace: "www.amazon.com" },
  "eu-west-1": {
    host: "webservices.amazon.co.uk",
    marketplace: "www.amazon.co.uk",
  },
  "eu-central-1": {
    host: "webservices.amazon.de",
    marketplace: "www.amazon.de",
  },
  "ap-northeast-1": {
    host: "webservices.amazon.co.jp",
    marketplace: "www.amazon.co.jp",
  },
  "ap-southeast-1": {
    host: "webservices.amazon.sg",
    marketplace: "www.amazon.sg",
  },
};

const MOCK_PRODUCTS: AmazonProduct[] = [
  {
    asin: "MOCK-COFFEE-BOX",
    title: "",
    imageUrl: "/gift_placeholder_img.png",
    detailPageUrl: null,
    priceDisplay: "$42.00",
    currency: "USD",
    primeEligible: false,
  },
  {
    asin: "MOCK-CANDLE",
    title: "",
    imageUrl: "/gift_placeholder_img.png",
    detailPageUrl: null,
    priceDisplay: "$28.50",
    currency: "USD",
    primeEligible: false,
  },
  {
    asin: "MOCK-TEA-SET",
    title: "",
    imageUrl: "/gift_placeholder_img.png",
    detailPageUrl: null,
    priceDisplay: "$65.00",
    currency: "USD",
    primeEligible: false,
  },
];

const SERVICE = "ProductAdvertisingAPI";
const TARGET =
  "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";

const shouldMock =
  !AMAZON_PA_ACCESS_KEY ||
  !AMAZON_PA_SECRET_KEY ||
  !AMAZON_PA_REGION ||
  process.env.NODE_ENV !== "production";

export async function searchAmazonProducts(params: {
  query: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  maxResults?: number;
}): Promise<AmazonProduct[]> {
  if (!params.query?.trim()) {
    return [];
  }

  if (shouldMock) {
    return buildMockProducts(params.query);
  }

  try {
    const region = AMAZON_PA_REGION as string;
    const config =
      HOST_BY_REGION[region] ?? HOST_BY_REGION["us-east-1"];
    const body = buildRequestBody({
      query: params.query,
      budgetMin: params.budgetMin,
      budgetMax: params.budgetMax,
      maxResults: params.maxResults ?? 6,
      marketplace: config.marketplace,
    });
    const response = await signedPaapiRequest({
      body,
      host: config.host,
      region,
    });

    const items = response.ItemsResult?.Items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return buildMockProducts(params.query);
    }

    const mapped = items
      .map((item): AmazonProduct | null => {
        if (!item?.ASIN) return null;
        const listing = item.Offers?.Listings?.[0];
        const price = listing?.Price;
        return {
          asin: item.ASIN,
          title:
            item.ItemInfo?.Title?.DisplayValue ??
            item.ItemInfo?.Title?.DisplayName ??
            "Amazon gift idea",
          imageUrl:
            item.Images?.Primary?.Medium?.URL ??
            item.Images?.Primary?.Large?.URL ??
            item.Images?.Primary?.Small?.URL ??
            null,
          detailPageUrl: item.DetailPageURL ?? null,
          priceDisplay: price?.DisplayAmount ?? null,
          currency: price?.Currency ?? null,
          primeEligible: listing?.DeliveryInfo?.IsPrimeEligible ?? null,
        };
      })
      .filter((item): item is AmazonProduct => Boolean(item));

    return mapped.length > 0 ? mapped : buildMockProducts(params.query);
  } catch (error) {
    console.warn("Amazon search failed", error);
    return buildMockProducts(params.query);
  }
}

export function ensureAmazonAffiliateTag(
  url: string | null,
  tag: string = AMAZON_PARTNER_TAG,
): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("tag", tag);
    return parsed.toString();
  } catch {
    return url;
  }
}

function buildMockProducts(query: string): AmazonProduct[] {
  const prefix = query ? `${query} - ` : "";
  return MOCK_PRODUCTS.map((product, index) => ({
    ...product,
    title: `${prefix}${product.title}`,
    asin: `${product.asin}-${index}`,
  }));
}

function buildRequestBody(args: {
  query: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  maxResults: number;
  marketplace: string;
}) {
  const body: Record<string, unknown> = {
    Keywords: args.query,
    SearchIndex: "All",
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: "Associates",
    Marketplace: args.marketplace,
    ItemCount: Math.min(Math.max(args.maxResults, 1), 10),
    Resources: [
      "Images.Primary.Medium",
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "Offers.Listings.DeliveryInfo.IsPrimeEligible",
    ],
  };

  if (typeof args.budgetMin === "number") {
    body.MinPrice = Math.max(Math.round(args.budgetMin * 100), 0);
  }
  if (typeof args.budgetMax === "number") {
    body.MaxPrice = Math.max(Math.round(args.budgetMax * 100), 0);
  }

  return body;
}

async function signedPaapiRequest({
  body,
  host,
  region,
}: {
  body: Record<string, unknown>;
  host: string;
  region: string;
}): Promise<PaapiResponse> {
  const endpoint = `https://${host}/paapi5/searchitems`;
  const bodyString = JSON.stringify(body);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const contentType = "application/json; charset=utf-8";
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${TARGET}`,
    "",
  ].join("\n");
  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
  const payloadHash = sha256(bodyString);
  const canonicalRequest = [
    "POST",
    "/paapi5/searchitems",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(
    AMAZON_PA_SECRET_KEY as string,
    dateStamp,
    region,
    SERVICE,
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  const authorization = [
    "AWS4-HMAC-SHA256 Credential=" +
      `${AMAZON_PA_ACCESS_KEY}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Amz-Date": amzDate,
      "X-Amz-Target": TARGET,
      Authorization: authorization,
    },
    body: bodyString,
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Unable to parse PAAPI response JSON");
  }

  const json = parsed as PaapiResponse;

  if (!response.ok || json.Errors) {
    throw new Error(
      `PAAPI error: ${json.Errors?.[0]?.Message || response.status}`,
    );
  }

  return json;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string,
) {
  const kDate = crypto
    .createHmac("sha256", "AWS4" + key)
    .update(dateStamp, "utf8")
    .digest();
  const kRegion = crypto
    .createHmac("sha256", kDate)
    .update(regionName, "utf8")
    .digest();
  const kService = crypto
    .createHmac("sha256", kRegion)
    .update(serviceName, "utf8")
    .digest();
  const kSigning = crypto
    .createHmac("sha256", kService)
    .update("aws4_request", "utf8")
    .digest();
  return kSigning;
}
