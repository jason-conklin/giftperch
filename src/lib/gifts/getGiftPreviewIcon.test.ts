import assert from "node:assert/strict";
import test from "node:test";
import {
  getGiftPreviewIcon,
  resolveGiftPreviewSource,
} from "./getGiftPreviewIcon";

test("preserves a valid merchant product image ahead of themed artwork", () => {
  const source = resolveGiftPreviewSource({
    metadata: { title: "Fishing multi-tool" },
    imageUrl: null,
    productMatch: {
      provider: "awin",
      productId: "piscifun-1",
      merchant: "Piscifun",
      productTitle: "Fishing multi-tool",
      imageUrl: "https://merchant.example.com/tool.jpg",
      price: 31.99,
      currency: "USD",
      affiliateUrl: "https://www.awin1.com/cread.php?awinmid=1&awinaffid=2",
    },
  });

  assert.equal(source.primary, "https://merchant.example.com/tool.jpg");
  assert.equal(source.fallback, "/icons/previews/preview-fishing.png");
  assert.equal(source.isProductImage, true);
});

test("resolves the same themed preview from live and historical metadata", () => {
  const live = getGiftPreviewIcon({
    title: "Premium watercolor art kit",
    why_it_fits: "A creative set for painting and sketching.",
  });
  const historical = resolveGiftPreviewSource({
    metadata: {
      title: "Premium watercolor art kit",
      rationale: "A creative set for painting and sketching.",
      tier: "thoughtful",
    },
    imageUrl: null,
    productMatch: null,
  });

  assert.equal(live, "/icons/previews/preview-art.png");
  assert.equal(historical.primary, live);
});

test("uses themed artwork when a persisted image is missing or malformed", () => {
  const source = resolveGiftPreviewSource({
    metadata: { title: "Noise-canceling headphones" },
    imageUrl: "javascript:alert(1)",
    productMatch: null,
  });

  assert.equal(source.primary, "/icons/previews/preview-headphones.png");
  assert.equal(source.isProductImage, false);
});

test("does not assign unrelated themed artwork without matching metadata", () => {
  const source = resolveGiftPreviewSource({
    metadata: { title: "A truly unusual surprise" },
    imageUrl: null,
    productMatch: null,
  });

  assert.equal(source.primary, "/icons/previews/preview-gift-box.png");
  assert.equal(source.fallback, "/icons/previews/preview-gift-box.png");
});
