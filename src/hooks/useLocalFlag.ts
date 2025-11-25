"use client";

import { useState } from "react";

/**
 * Safely read/write a boolean-like flag from localStorage on the client.
 *
 * @example
 * const [dismissed, setDismissed] = useLocalFlag("gp_onboarding_welcome_dismissed");
 */
export function useLocalFlag(key: string, defaultValue = false) {
  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultValue;
    const stored = window.localStorage.getItem(key);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return defaultValue;
  });

  const update = (next: boolean) => {
    setValue(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, next ? "true" : "false");
    }
  };

  return [value, update] as const;
}
