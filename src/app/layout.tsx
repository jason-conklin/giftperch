import type { Metadata } from "next";
import "./globals.css";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

const title = "GiftPerch - Thoughtful gifting, reimagined with AI";
const description =
  "GiftPerch blends AI, recipient profiles, wishlists, and affiliate commerce to make gifting effortless.";

export const metadata: Metadata = {
  metadataBase: new URL("https://giftperch.com"),
  title: {
    default: title,
    template: "%s | GiftPerch",
  },
  description,
  openGraph: {
    title,
    description,
    url: "https://giftperch.com",
    siteName: "GiftPerch",
    images: [
      {
        url: "/giftperch_banner.png",
        alt: "GiftPerch banner artwork",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/giftperch_banner.png"],
  },
  icons: {
    icon: "/giftperch_logo_only.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gp-cream text-gp-evergreen font-sans antialiased">
        <SupabaseProvider>
          <a href="#gp-main-content" className="gp-skip-link">
            Skip to main content
          </a>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
