import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/env";

const disallowedRoutes = [
  "/dashboard",
  "/recipients",
  "/gifts",
  "/history",
  "/occasions",
  "/gift-guides",
  "/settings",
  "/profile",
  "/wishlist",
];

export function GET() {
  const siteUrl = getSiteUrl();
  const disallowBlock = disallowedRoutes
    .map((route) => `Disallow: ${route}`)
    .join("\n");

  const body = `User-agent: *
Allow: /
${disallowBlock}

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
