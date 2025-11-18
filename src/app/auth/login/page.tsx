"use client";

import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

type AuthMode = "password" | "magic";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const redirectTarget = searchParams?.get("redirect") ?? "/dashboard";

  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectTarget);
    }
  }, [redirectTarget, router, status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Welcome back! Redirecting you to your dashboard...");
        router.replace(redirectTarget);
        router.refresh();
      } else {
        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/login`
            : undefined;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
        });
        if (error) throw error;
        setMessage(
          "We've sent a magic link to your inbox. Check your email to continue."
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md space-y-6 rounded-3xl border border-gp-evergreen/20 bg-white/90 p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
          Welcome back
        </p>
        <h1 className="text-3xl font-semibold text-gp-evergreen">
          Sign in to GiftPerch
        </h1>
        <p className="text-sm text-gp-evergreen/70">
          Access your dashboard, recipient profiles, and PerchPal sessions.
        </p>
      </div>

      <div className="flex rounded-full border border-gp-evergreen/20 bg-gp-cream/60 p-1 text-sm font-semibold text-gp-evergreen">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 rounded-full px-4 py-2 transition ${
            mode === "password" ? "bg-gp-evergreen text-gp-cream" : ""
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`flex-1 rounded-full px-4 py-2 transition ${
            mode === "magic" ? "bg-gp-evergreen text-gp-cream" : ""
          }`}
        >
          Magic link
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-gp-evergreen"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
          />
        </div>

        {mode === "password" && (
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gp-evergreen"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-2xl bg-gp-evergreen px-4 py-3 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132] disabled:opacity-60"
          disabled={isLoading}
        >
          {mode === "password" ? "Log In" : "Send Magic Link"}
        </button>

        {isLoading && (
          <div className="flex justify-center">
            <PerchPalLoader
              variant="inline"
              size="sm"
              message="PerchPal is signing you in..."
            />
          </div>
        )}

        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-2xl bg-gp-cream px-4 py-2 text-sm text-gp-evergreen">
            {message}
          </p>
        )}
      </form>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gp-evergreen/15" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs font-semibold uppercase tracking-wide text-gp-evergreen/50">
            or
          </span>
        </div>
      </div>

      <GoogleSignInButton />

      <p className="text-center text-sm text-gp-evergreen/80">
        Need an account?{" "}
        <Link
          href="/auth/signup"
          className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Join GiftPerch
        </Link>
      </p>
    </section>
  );
}
