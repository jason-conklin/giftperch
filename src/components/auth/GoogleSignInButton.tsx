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
        className="gp-secondary-button inline-flex w-full items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 18 18"
            className="h-5 w-5"
          >
            <path
              d="M17.64 9.2045c0-.6395-.0573-1.2527-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0786-1.7959 2.7163v2.2582h2.9086c1.7013-1.5668 2.6837-3.8741 2.6837-6.6154Z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.4673-.8059 5.9563-2.1795l-2.9086-2.2582c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.0363-3.7104H.9568v2.3318A8.9999 8.9999 0 0 0 9 18Z"
              fill="#34A853"
            />
            <path
              d="M3.9636 10.7104A5.4095 5.4095 0 0 1 3.6818 9c0-.5932.1023-1.17.2818-1.7104V4.9577H.9568A8.9999 8.9999 0 0 0 0 9c0 1.4482.3477 2.8173.9568 4.0423l3.0068-2.3319Z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.5795c1.3214 0 2.5077.4541 3.4418 1.3459l2.5813-2.5814C13.4632.8905 11.4264 0 9 0A8.9999 8.9999 0 0 0 .9568 4.9577l3.0068 2.3319C4.6718 5.1627 6.6559 3.5795 9 3.5795Z"
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
