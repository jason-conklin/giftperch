import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveAwinAdvertiser } from "../src/server/awin/advertisers";
import { validateAwinProductDestination } from "../src/server/awin/destinationHealth";

loadEnvConfig(process.cwd());

type ProductRow = {
  id: string;
  external_product_id: string;
  title: string;
  destination_url: string;
  affiliate_url: string;
};

function argumentValue(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function projectRefFromUrl(value: string): string | null {
  try {
    const hostname = new URL(value).hostname;
    return hostname.endsWith(".supabase.co") ? hostname.split(".")[0] : null;
  } catch {
    return null;
  }
}

async function loadProducts(
  supabase: SupabaseClient,
  advertiserId: string,
  limit: number,
): Promise<ProductRow[]> {
  const products: ProductRow[] = [];
  for (let offset = 0; products.length < limit; offset += 1_000) {
    const pageSize = Math.min(1_000, limit - products.length);
    const { data, error } = await supabase
      .from("affiliate_products")
      .select("id, external_product_id, title, destination_url, affiliate_url")
      .eq("provider", "awin")
      .eq("advertiser_id", advertiserId)
      .eq("active", true)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as ProductRow[];
    products.push(...rows);
    if (rows.length < pageSize) break;
  }
  return products;
}

async function main() {
  const advertiser = resolveAwinAdvertiser(argumentValue("advertiser") ?? undefined);
  const writeMode = process.argv.includes("--write");
  const limit = Number(argumentValue("limit") ?? "100");
  const concurrency = Number(argumentValue("concurrency") ?? "3");
  const trackingSample = Number(argumentValue("tracking-sample") ?? "0");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000) {
    throw new Error("--limit must be an integer between 1 and 10000.");
  }
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 10) {
    throw new Error("--concurrency must be an integer between 1 and 10.");
  }
  if (!Number.isSafeInteger(trackingSample) || trackingSample < 0 || trackingSample > 100) {
    throw new Error("--tracking-sample must be an integer between 0 and 100.");
  }
  if (writeMode && !advertiser.destinationValidationHosts?.length) {
    throw new Error(
      `Write mode requires configured destinationValidationHosts for ${advertiser.displayName}. No database writes were attempted.`,
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const projectRef = projectRefFromUrl(supabaseUrl);
  if (!projectRef) throw new Error("Could not determine the Supabase project reference.");
  if (writeMode && argumentValue("confirm-project-ref") !== projectRef) {
    throw new Error(`Write mode requires --confirm-project-ref=${projectRef}. No database writes were attempted.`);
  }

  const supabase = createClient(supabaseUrl, requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const products = await loadProducts(supabase, advertiser.advertiserId, limit);
  const counts = { valid: 0, invalid: 0, uncertain: 0 };
  const reasons: Record<string, number> = {};
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, products.length) }, async () => {
      while (cursor < products.length) {
        const productIndex = cursor++;
        const product = products[productIndex];
        const result = await validateAwinProductDestination({
          affiliateUrl: product.affiliate_url,
          destinationUrl: product.destination_url,
          verifyTrackingRedirect: productIndex < trackingSample,
          allowedMerchantHosts: advertiser.destinationValidationHosts,
        });
        counts[result.status] += 1;
        reasons[result.reason] = (reasons[result.reason] ?? 0) + 1;
        console.log(`${product.external_product_id}: ${result.status} (${result.reason})`);

        if (writeMode) {
          const { data, error } = await supabase
            .from("affiliate_products")
            .update({
              destination_health_status: result.status,
              destination_health_reason: result.reason,
              destination_checked_at: new Date().toISOString(),
              destination_final_url: result.finalUrl,
              destination_http_status: result.httpStatus,
            })
            .eq("id", product.id)
            .eq("destination_url", product.destination_url)
            .eq("affiliate_url", product.affiliate_url)
            .select("id");
          if (error) throw new Error(error.message);
          if (data?.length !== 1) {
            throw new Error(`Product ${product.external_product_id} changed during validation; its result was not saved.`);
          }
        }
      }
    }),
  );

  console.log(JSON.stringify({
    mode: writeMode ? "write" : "read-only",
    projectRef,
    advertiserId: advertiser.advertiserId,
    checked: products.length,
    counts,
    reasons,
    trackingLinksChecked: Math.min(trackingSample, products.length),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Destination validation failed.");
  process.exitCode = 1;
});
