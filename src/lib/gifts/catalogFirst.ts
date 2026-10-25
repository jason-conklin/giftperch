export const CATALOG_NO_RESULTS_MESSAGE =
  "We couldn't find a current match in this price range. Try adjusting the budget or recipient interests.";

export function getGiftRunEmptyMessage(
  recommendationMode?: string | null,
): string {
  return recommendationMode === "catalog_first"
    ? CATALOG_NO_RESULTS_MESSAGE
    : "No suggestions were found in this run.";
}

export function getCatalogRecommendationResponseMetadata(
  recommendationCount: number,
):
  | { recommendationStatus: "success" }
  | { recommendationStatus: "no_results"; message: string } {
  return recommendationCount > 0
    ? { recommendationStatus: "success" }
    : {
        recommendationStatus: "no_results",
        message: CATALOG_NO_RESULTS_MESSAGE,
      };
}
