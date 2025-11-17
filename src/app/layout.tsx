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
        <div className="min-h-screen">
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
            <SupabaseProvider>{children}</SupabaseProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
