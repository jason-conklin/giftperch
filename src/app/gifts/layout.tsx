import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "GiftPerch - Gift Ideas",
};

export default function GiftsLayout({ children }: { children: ReactNode }) {
  return children;
}
