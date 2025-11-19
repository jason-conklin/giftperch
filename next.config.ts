import type { NextConfig } from "next";

const supabaseHostname = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : undefined;
  } catch {
    return undefined;
  }
})();

const remotePatterns = [
  {
    protocol: "https",
    hostname: "**",
  } as const,
];

if (supabaseHostname) {
  remotePatterns.push({
    protocol: "https",
    hostname: supabaseHostname,
    pathname: "/storage/v1/object/public/**",
  } as const);
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns,
  },
};

export default nextConfig;
