import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { findAwinAdvertiserById } from "@/server/awin/advertisers";
import { normalizeDestinationHealthStatus } from "@/server/awin/destinationHealth";

type RequestedIdentity = {
  advertiserId: string;
  locale: string;
  productId: string;
};

const MAX_IDENTITIES = 150;

function parseIdentity(value: unknown): RequestedIdentity | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const advertiserId = typeof record.advertiserId === "string" ? record.advertiserId.trim() : "";
  const locale = typeof record.locale === "string" ? record.locale.trim() : "";
  const productId = typeof record.productId === "string" ? record.productId.trim() : "";
  const advertiser = findAwinAdvertiserById(advertiserId);
  return advertiser && advertiser.locale === locale && productId && productId.length <= 300
    ? { advertiserId, locale, productId }
    : null;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient() as SupabaseClient;
  const token = request.headers.get("authorization")?.split(" ")[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { products?: unknown };
  try {
    body = (await request.json()) as { products?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.products) || body.products.length > MAX_IDENTITIES) {
    return NextResponse.json({ error: "products must contain at most 150 items" }, { status: 400 });
  }
  const identities = body.products.map(parseIdentity);
  if (identities.some((identity) => !identity)) {
    return NextResponse.json({ error: "Invalid product identity" }, { status: 400 });
  }

  const requested = identities as RequestedIdentity[];
  const records: Array<RequestedIdentity & { status: string; checkedAt: string | null }> = [];
  const scopes = new Map<string, RequestedIdentity[]>();
  for (const identity of requested) {
    const key = `${identity.advertiserId}:${identity.locale}`;
    scopes.set(key, [...(scopes.get(key) ?? []), identity]);
  }
  for (const scope of scopes.values()) {
    const first = scope[0];
    const { data, error } = await supabase
      .from("affiliate_products")
      .select("external_product_id, destination_health_status, destination_checked_at")
      .eq("provider", "awin")
      .eq("advertiser_id", first.advertiserId)
      .eq("locale", first.locale)
      .eq("active", true)
      .eq("availability", "in_stock")
      .in("external_product_id", scope.map((identity) => identity.productId));
    if (error) {
      return NextResponse.json({ error: "Unable to verify product destinations" }, { status: 500 });
    }
    for (const row of data ?? []) {
      const status = normalizeDestinationHealthStatus(row.destination_health_status);
      if (!status) continue;
      records.push({
        advertiserId: first.advertiserId,
        locale: first.locale,
        productId: String(row.external_product_id),
        status,
        checkedAt: typeof row.destination_checked_at === "string" ? row.destination_checked_at : null,
      });
    }
  }

  return NextResponse.json({ products: records });
}
