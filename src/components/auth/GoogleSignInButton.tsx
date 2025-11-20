"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export function GoogleSignInButton() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError("");
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/login?redirect=/dashboard`
          : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (error) throw error;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to connect with Google.";
      setError(message);
      setIsSigningIn(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isSigningIn}
        aria-busy={isSigningIn}
        aria-label="Continue with Google"
        className="gp-secondary-button inline-flex w-full items-center justify-center gap-2"
      >
        <span className="h-4 w-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-gp-evergreen/70"
          >
            <path
              d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.4a4.6 4.6 0 0 1-2 3.02v2.5h3.2c1.88-1.73 3-4.27 3-7.53Z"
              fill="#4285F4"
            />
            <path
              d="M12 21c2.7 0 4.96-.9 6.6-2.44l-3.2-2.5c-.9.6-2.04.95-3.4.95-2.6 0-4.8-1.76-5.6-4.13H3.05v2.6A9 9 0 0 0 12 21Z"
              fill="#34A853"
            />
            <path
              d="M6.4 12.88c-.2-.6-.3-1.26-.3-1.88s.11-1.28.3-1.88V6.52H3.05A9 9 0 0 0 3 11c0 1.45.35 2.84.97 4.07l2.43-2.2Z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.46 0 2.78.5 3.82 1.48l2.87-2.86C17 2.52 14.74 1.5 12 1.5 7.95 1.5 4.45 3.83 3.05 6.52l3.36 2.6C7.2 7.15 9.4 5.38 12 5.38Z"
              fill="#EA4335"
            />
          </svg>
        </span>
        <span>{isSigningIn ? "Connecting…" : "Continue with Google"}</span>
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
