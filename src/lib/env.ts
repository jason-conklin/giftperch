const warnOnce = new Set<string>();
const isProd = process.env.NODE_ENV === "production";

function cleanValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function ensureSupabaseEnv(key: string): string {
  const value = cleanValue(process.env[key]);
  if (!value) {
    const message = `[env] ${key} is required to talk to Supabase.`;
    if (isProd) {
      throw new Error(message);
    }
    if (!warnOnce.has(key)) {
      console.warn(message);
      warnOnce.add(key);
    }
    return "";
  }
  return value;
}

function optionalEnv(
  key: string,
  { warnInProd = false }: { warnInProd?: boolean } = {},
): string | undefined {
  const value = cleanValue(process.env[key]);
  if (!value && warnInProd && isProd && !warnOnce.has(key)) {
    console.warn(
      `[env] ${key} is not configured. Related features will fall back to mock responses.`,
    );
    warnOnce.add(key);
  }
  return value;
}

export function getSiteUrl(): string {
  const explicit = cleanValue(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const vercelHost = cleanValue(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelHost) {
    return `https://${vercelHost.replace(/^https?:\/\//, "")}`.replace(
      /\/+$/,
      "",
    );
  }

  return "http://localhost:3000";
}

const publicSupabase = {
  url: ensureSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL"),
  anonKey: ensureSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
};

const serverSupabase = {
  url: ensureSupabaseEnv("SUPABASE_URL"),
  anonKey: ensureSupabaseEnv("SUPABASE_ANON_KEY"),
  serviceRoleKey: ensureSupabaseEnv("SUPABASE_SERVICE_ROLE_KEY"),
};

const optionalKeys = {
  openaiApiKey: optionalEnv("OPENAI_API_KEY", { warnInProd: true }),
  amazonPaAccessKey: optionalEnv("AMAZON_PA_ACCESS_KEY", {
    warnInProd: true,
  }),
  amazonPaSecretKey: optionalEnv("AMAZON_PA_SECRET_KEY", {
    warnInProd: true,
  }),
  amazonPaPartnerTag:
    optionalEnv("AMAZON_PA_PARTNER_TAG", {
      warnInProd: true,
    }) || "giftperch-20",
  amazonPaRegion: optionalEnv("AMAZON_PA_REGION", { warnInProd: true }),
  resendApiKey: optionalEnv("RESEND_API_KEY"),
  occasionAlertsFromEmail: optionalEnv("OCCASION_ALERTS_FROM_EMAIL"),
  occasionAlertsCronSecret: optionalEnv("OCCASION_ALERTS_CRON_SECRET"),
};

export const clientEnv = {
  siteUrl: getSiteUrl(),
  supabaseUrl: publicSupabase.url,
  supabaseAnonKey: publicSupabase.anonKey,
};

export const serverEnv = {
  ...clientEnv,
  supabaseUrl: serverSupabase.url,
  supabaseAnonKey: serverSupabase.anonKey,
  supabaseServiceRoleKey: serverSupabase.serviceRoleKey,
  openaiApiKey: optionalKeys.openaiApiKey,
  amazonPaAccessKey: optionalKeys.amazonPaAccessKey,
  amazonPaSecretKey: optionalKeys.amazonPaSecretKey,
  amazonPaPartnerTag: optionalKeys.amazonPaPartnerTag,
  amazonPaRegion: optionalKeys.amazonPaRegion,
  resendApiKey: optionalKeys.resendApiKey,
  occasionAlertsFromEmail: optionalKeys.occasionAlertsFromEmail,
  occasionAlertsCronSecret: optionalKeys.occasionAlertsCronSecret,
};

export { isProd };
