import type { GiftSuggestion } from "@/components/gifts/GiftSuggestionsPanel";

const ICON_BASE = "/icons/previews";
const FALLBACK = `${ICON_BASE}/preview-gift-box.png`;

const hasKeyword = (text: string, keyword: string): boolean => {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `\\b${escaped}\\b`;
  const regex = new RegExp(pattern, "i");
  return regex.test(text);
};

const hasAny = (text: string, keywords: string[]): boolean =>
  keywords.some((kw) => hasKeyword(text, kw));

export function getGiftPreviewIcon(suggestion: GiftSuggestion): string {
  const textParts = [
    suggestion.title,
    (suggestion as { subtitle?: string }).subtitle,
    suggestion.why_it_fits,
    (suggestion as { short_description?: string }).short_description,
    (suggestion as { price_hint?: string }).price_hint,
    (suggestion as { price_guidance?: string }).price_guidance,
    Array.isArray((suggestion as { tags?: string[] }).tags)
      ? (suggestion as { tags?: string[] }).tags?.join(" ")
      : "",
  ];

  const text = textParts
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Pets
  if (hasAny(text, ["dog toy", "chew toy", "tug toy", "fetch toy"])) {
    return `${ICON_BASE}/preview-dog-toy.png`;
  }
  if (hasAny(text, ["cat toy", "scratcher", "catnip", "feather wand"])) {
    return `${ICON_BASE}/preview-cat-toy.png`;
  }
  if (
    hasAny(text, [
      "dog",
      "dogs",
      "puppy",
      "puppies",
      "cat",
      "cats",
      "kitten",
      "kittens",
      "pet",
      "pets",
      "pet bed",
      "pet collar",
      "pet harness",
    ])
  ) {
    return `${ICON_BASE}/preview-paw.png`;
  }

  // Fishing
  if (hasAny(text, ["fishing", "fishing rod", "tackle", "tackle box", "lure", "lures"])) {
    return `${ICON_BASE}/preview-fishing.png`;
  }

  // Sports
  if (
    hasAny(text, [
      "sports",
      "basketball",
      "football",
      "soccer",
      "tennis",
      "baseball",
      "golf",
      "sports gear",
      "sports equipment",
    ])
  ) {
    return `${ICON_BASE}/preview-sports.png`;
  }

  // Fitness & Wellness
  if (
    hasAny(text, [
      "fitness",
      "workout",
      "exercise",
      "gym",
      "training",
      "dumbbell",
      "dumbbells",
      "weights",
      "kettlebell",
      "foam roller",
      "resistance band",
      "yoga",
      "athletic",
    ])
  ) {
    return `${ICON_BASE}/preview-fitness.png`;
  }

  // Makeup / beauty
  if (
    hasAny(text, [
      "makeup",
      "lipstick",
      "mascara",
      "eyeshadow",
      "palette",
      "beauty set",
      "makeup brush",
      "cosmetics",
      "skincare set",
    ])
  ) {
    return `${ICON_BASE}/preview-makeup.png`;
  }

  // Video games (before board games)
  if (
    hasAny(text, [
      "video game",
      "game console",
      "xbox",
      "playstation",
      "nintendo",
      "steam gift card",
      "gaming mouse",
      "gaming keyboard",
      "switch",
      "pc game",
      "controller",
    ])
  ) {
    return `${ICON_BASE}/preview-video-games.png`;
  }

  // Home & Cozy / Decor
  if (hasAny(text, ["candle", "soy candle", "scented candle", "aromatherapy"])) {
    return `${ICON_BASE}/preview-candle.png`;
  }
  if (hasAny(text, ["blanket", "throw", "quilt", "cozy throw"])) {
    return `${ICON_BASE}/preview-blanket.png`;
  }
  if (
    hasAny(text, [
      "home decor",
      "wall art",
      "vase",
      "accent piece",
      "throw pillow",
      "table decor",
      "centerpiece",
      "room decor",
      "decor piece",
      "accent decor",
    ])
  ) {
    return `${ICON_BASE}/preview-home-decor.png`;
  }
  if (hasAny(text, ["plant", "succulent", "bonsai", "planter"])) {
    return `${ICON_BASE}/preview-plant.png`;
  }
  if (hasAny(text, ["mug", "coffee cup", "tea cup", "tumbler"])) {
    return `${ICON_BASE}/preview-mug.png`;
  }

  // Tech & Office
  if (hasAny(text, ["headphones", "earbuds", "headset", "audio"])) {
    return `${ICON_BASE}/preview-headphones.png`;
  }
  if (
    hasAny(text, [
      "phone stand",
      "phone case",
      "tablet",
      "laptop stand",
      "charging",
      "dock",
      "tech accessory",
      "phone",
    ])
  ) {
    return `${ICON_BASE}/preview-phone.png`;
  }
  if (hasAny(text, ["lamp", "desk lamp", "reading light", "light strip"])) {
    return `${ICON_BASE}/preview-lamp.png`;
  }

  // Hobbies & Creative
  if (hasAny(text, ["art kit", "paint", "sketch", "marker", "craft", "watercolor"])) {
    return `${ICON_BASE}/preview-art.png`;
  }
  if (hasAny(text, ["book", "novel", "journal", "notebook", "planner"])) {
    return `${ICON_BASE}/preview-book.png`;
  }
  if (hasAny(text, ["board game", "puzzle", "card game", "dice", "game night"])) {
    return `${ICON_BASE}/preview-game.png`;
  }

  // Experiences / DIY
  if (hasAny(text, ["ticket", "concert", "show", "experience", "escape room", "museum pass"])) {
    return `${ICON_BASE}/preview-ticket.png`;
  }
  if (hasAny(text, ["tool", "kit", "diy", "build", "maker", "workshop"])) {
    return `${ICON_BASE}/preview-diy.png`;
  }

  // Fashion & Personal Items
  if (hasAny(text, ["shirt", "t-shirt", "hoodie", "sweatshirt", "sweater", "clothing"])) {
    return `${ICON_BASE}/preview-shirt.png`;
  }
  if (hasAny(text, ["shoe", "sneaker", "boots", "slippers", "running shoes"])) {
    return `${ICON_BASE}/preview-shoes.png`;
  }
  if (hasAny(text, ["bag", "backpack", "tote", "duffel", "crossbody"])) {
    return `${ICON_BASE}/preview-backpack.png`;
  }

  // Food & Drink (catch cigars/barware here instead of pet icons)
  if (
    hasAny(text, [
      "wine",
      "cocktail",
      "whiskey",
      "bourbon",
      "scotch",
      "barware",
      "decanter",
      "beer",
      "drink set",
      "glassware",
      "cigar",
      "humidor",
    ])
  ) {
    return `${ICON_BASE}/preview-wine.png`;
  }
  if (
    hasAny(text, [
      "baking",
      "bakeware",
      "cookie cutter",
      "cupcake",
      "rolling pin",
      "mixing bowl",
      "kitchen tool",
      "measuring spoons",
      "whisk",
    ])
  ) {
    return `${ICON_BASE}/preview-baking.png`;
  }
  if (hasAny(text, ["chocolate", "candy", "snack box", "gourmet snacks", "treats"])) {
    return `${ICON_BASE}/preview-candy.png`;
  }

  // Fallback
  return FALLBACK;
}
