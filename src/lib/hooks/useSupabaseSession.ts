"use client";

import { SupabaseSessionContext } from "@/components/providers/SupabaseProvider";
import { useContext } from "react";

export function useSupabaseSession() {
  const ctx = useContext(SupabaseSessionContext);

  if (!ctx) {
    throw new Error(
      "useSupabaseSession must be used within a SupabaseProvider"
    );
  }

  return ctx;
}
