export type ProductTourSessionStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated";

export function getProductTourEntryPath(
  status: ProductTourSessionStatus,
): string {
  return status === "authenticated"
    ? "/gifts"
    : "/auth/signup?redirect=%2Fgifts";
}
