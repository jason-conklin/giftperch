const ACCENT_MARKS_REGEX = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_REGEX = /[^a-z0-9\s]/g;
const MULTISPACE_REGEX = /\s+/g;

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "to",
  "of",
  "and",
  "with",
  "from",
  "gift",
  "idea",
]);

function lightlySingularize(token: string): string {
  if (token.length <= 3) return token;
  if (/(ss|us|is)$/.test(token)) {
    return token;
  }
  if (/[^aeiou]ies$/.test(token) && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith("sses") && token.length > 5) {
    return token.slice(0, -2);
  }
  if (
    (token.endsWith("xes") ||
      token.endsWith("zes") ||
      token.endsWith("ches") ||
      token.endsWith("shes")) &&
    token.length > 4
  ) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

/*
Examples (input -> canonical key):
"LEGO Set!!!" -> "lego set"
"Lego sets" -> "lego set"
"Reading Glasses" -> "reading glass"
"Wireless earbuds" -> "wireless earbud"
"PS5's" -> "ps5"
"iPhone 15 Cases" -> "iphone 15 case"
"The Gift for Mom" -> "mom"
"Spa & Self-Care Kit" -> "spa self care kit"
"Chess" -> "chess"
"Focus" -> "focus"
*/

export function canonicalizeGiftSuggestionText(
  value: string | null | undefined,
): string {
  const normalized = (value ?? "")
    .normalize("NFKD")
    .replace(ACCENT_MARKS_REGEX, "")
    .toLowerCase()
    .trim();

  if (!normalized) return "";

  const cleaned = normalized
    .replace(/['`\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(NON_ALPHANUMERIC_REGEX, " ")
    .replace(MULTISPACE_REGEX, " ")
    .trim();

  if (!cleaned) return "";

  const rawTokens = cleaned.split(" ").filter(Boolean);
  if (rawTokens.length === 0) return "";

  const filteredTokens = rawTokens.filter((token) => !STOP_WORDS.has(token));
  const tokensToUse = filteredTokens.length > 0 ? filteredTokens : rawTokens;

  return tokensToUse.map(lightlySingularize).join(" ");
}

export function getGiftSuggestionCanonicalKey(
  suggestion: { title?: string | null } | string | null | undefined,
): string {
  if (typeof suggestion === "string" || suggestion == null) {
    return canonicalizeGiftSuggestionText(suggestion);
  }
  return canonicalizeGiftSuggestionText(suggestion.title);
}
