import assert from "node:assert/strict";
import test from "node:test";
import {
  AFFILIATE_DISCLOSURE,
  AFFILIATE_LINK_REL,
  getMatchedProductPresentation,
} from "@/lib/affiliateProduct";
import { buildSavedGiftSnapshot } from "@/server/savedGifts/productSnapshot";
import {
  enrichGiftSuggestionsWithProducts,
  type AwinCatalogProduct,
} from "./matcher";

const piscifunProduct: AwinCatalogProduct = {
  provider: "awin",
  advertiserId: "89509",
  locale: "en_US",
  merchantName: "Piscifun",
  externalProductId: "piscifun-reel-1",
  title: "Piscifun Carbon X Fishing Reel",
  description: "A lightweight spinning reel for freshwater anglers.",
  imageUrl: "https://images.example.test/piscifun-reel.jpg",
  affiliateUrl:
    "https://www.awin1.com/cread.php?awinmid=89509&awinaffid=2673864&clickref=qa",
  price: 59.99,
  currency: "USD",
  availability: "in_stock",
  active: true,
};

test("affiliate fixtures flow through enrichment, presentation, and saved snapshots", async () => {
  const suggestions = [
    {
      id: "awin-idea",
      title: "Lightweight fishing reel",
      short_description: "A smooth reel for weekend lake trips.",
      why_it_fits: "The original personalized fishing rationale.",
      tier: "thoughtful",
      price_min: 40,
      price_max: 80,
    },
    {
      id: "amazon-idea",
      title: "Leather watch case",
      short_description: "A compact case for a watch collection.",
      why_it_fits: "The original personalized watch rationale.",
      tier: "safe",
      price_min: 20,
      price_max: 50,
    },
    {
      id: "unmatched-idea",
      title: "Handwritten recipe collection",
      short_description: "A personal collection of family recipes.",
      why_it_fits: "The original personalized recipe rationale.",
      tier: "thoughtful",
      price_min: 10,
      price_max: 30,
    },
  ];

  const enriched = await enrichGiftSuggestionsWithProducts({
    suggestions,
    recipientInterests: [{ label: "Fishing", category: "Outdoors" }],
    loadAwinProducts: async () => [piscifunProduct],
    searchAmazon: async ({ query }) =>
      query === "Leather watch case"
        ? {
            asin: "B000TEST",
            title: "Leather Travel Watch Case",
            imageUrl: "https://images.example.test/watch-case.jpg",
            detailPageUrl:
              "https://www.amazon.com/dp/B000TEST?tag=giftperch-20",
            priceDisplay: "$39.99",
            currency: "USD",
          }
        : null,
  });

  const awin = getMatchedProductPresentation(enriched[0].productMatch);
  const amazon = getMatchedProductPresentation(
    enriched[1].productMatch,
    enriched[1].amazonProduct,
  );
  const unmatched = getMatchedProductPresentation(
    enriched[2].productMatch,
    enriched[2].amazonProduct,
  );

  assert.equal(awin?.shoppingLabel, "View at Piscifun");
  assert.equal(awin?.merchantLabel, "Sold by Piscifun");
  assert.equal(awin?.priceDisplay, "$59.99 USD");
  assert.equal(awin?.match.imageUrl, piscifunProduct.imageUrl);
  assert.equal(awin?.match.affiliateUrl, piscifunProduct.affiliateUrl);
  assert.equal(enriched[0].title, suggestions[0].title);
  assert.equal(enriched[0].why_it_fits, suggestions[0].why_it_fits);

  assert.equal(amazon?.shoppingLabel, "View on Amazon");
  assert.equal(amazon?.merchantLabel, "Sold by Amazon");
  assert.equal(amazon?.priceDisplay, "$39.99 USD");
  assert.equal(
    amazon?.match.affiliateUrl,
    "https://www.amazon.com/dp/B000TEST?tag=giftperch-20",
  );
  assert.equal(unmatched, null);
  assert.equal(AFFILIATE_DISCLOSURE, "Affiliate link. GiftPerch may earn a commission.");
  assert.equal(AFFILIATE_LINK_REL, "sponsored noopener noreferrer");

  const savedAwin = buildSavedGiftSnapshot(enriched[0]);
  const reopenedAwin = getMatchedProductPresentation(
    JSON.parse(JSON.stringify(savedAwin?.productMatch)),
  );
  assert.equal(savedAwin?.title, suggestions[0].title);
  assert.equal(savedAwin?.rationale, suggestions[0].why_it_fits);
  assert.equal(savedAwin?.productUrl, piscifunProduct.affiliateUrl);
  assert.equal(reopenedAwin?.shoppingLabel, "View at Piscifun");
  assert.equal(reopenedAwin?.priceDisplay, "$59.99 USD");

  const legacySaved = buildSavedGiftSnapshot({
    title: "Legacy saved gift",
    why_it_fits: "Existing reasoning remains available.",
    suggested_url: "https://merchant.example.test/legacy",
  });
  assert.equal(legacySaved?.productMatch, null);
  assert.equal(legacySaved?.title, "Legacy saved gift");
  assert.equal(
    getMatchedProductPresentation({
      ...piscifunProduct,
      provider: "awin",
      productId: piscifunProduct.externalProductId,
      merchant: piscifunProduct.merchantName,
      productTitle: piscifunProduct.title,
      price: piscifunProduct.price,
      currency: piscifunProduct.currency,
      affiliateUrl: "https://example.test/not-awin",
    }),
    null,
  );
});
