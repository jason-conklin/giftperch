import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { isExpectedAwinTrackingUrl } from "../src/server/awin/feed";
import { resolveAwinAdvertiser } from "../src/server/awin/advertisers";

loadEnvConfig(process.cwd());

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function argumentValue(name: string): string | null {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function sanitizedAffiliateHost(value: unknown): string | null {
  if (!isExpectedAwinTrackingUrl(value)) return null;
  return new URL(value).hostname;
}

function sanitizedMessage(error: unknown): string {
  let message = error instanceof Error ? error.message : "Verification failed";
  const secrets = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  ];
  for (const secret of secrets) {
    if (secret) message = message.replaceAll(secret, "[redacted]");
  }
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[redacted-token]",
    )
    .replace(/https?:\/\/\S+/gi, "[url]")
    .slice(0, 500);
}

async function main() {
  const advertiser = resolveAwinAdvertiser(
    argumentValue("advertiser") ?? undefined,
  );
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() || requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabase = createClient(
    supabaseUrl,
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, count, error } = await supabase
    .from("affiliate_products")
    .select(
      "external_product_id,title,merchant_name,price,currency,availability,affiliate_url,imported_at",
      { count: "exact" },
    )
    .eq("provider", "awin")
    .eq("advertiser_id", advertiser.advertiserId)
    .eq("locale", advertiser.locale)
    .eq("active", true)
    .order("title")
    .limit(5);
  if (error) throw new Error(error.message);

  const sample = (data ?? []).map((product) => ({
    externalProductId: product.external_product_id,
    title: product.title,
    merchant: product.merchant_name,
    price: product.price,
    currency: product.currency,
    availability: product.availability,
    affiliateUrlValid: isExpectedAwinTrackingUrl(product.affiliate_url),
    affiliateHost: sanitizedAffiliateHost(product.affiliate_url),
    importedAt: product.imported_at,
  }));
  console.log(
    JSON.stringify(
      {
        advertiser: advertiser.displayName,
        advertiserId: advertiser.advertiserId,
        locale: advertiser.locale,
        activeProductCount: count ?? 0,
        sample,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(sanitizedMessage(error));
  process.exitCode = 1;
});
