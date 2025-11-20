"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const redirectTarget = searchParams?.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      const session =
        data.session ??
        (await supabase.auth.getSession()).data.session ??
        null;
      const accessToken = session?.access_token;

      if (accessToken) {
        await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ displayName }),
        });
      }

      if (session) {
        setMessage("Account created! Redirecting to your dashboard...");
        router.replace(redirectTarget);
        router.refresh();
      } else {
        setMessage(
          "Account created. Please confirm via the email we just sent you."
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
    <section className="mx-auto max-w-md space-y-6 rounded-3xl border border-gp-gold/30 bg-white/95 p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
          Join the flock
        </p>
        <h1 className="text-3xl font-semibold text-gp-evergreen">
          Create your GiftPerch account
        </h1>
        <p className="text-sm text-gp-evergreen/70">
          Start building recipient profiles, wishlists, and AI-powered gift
          ideas.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor="displayName"
            className="text-sm font-medium text-gp-evergreen"
          >
            Display name (optional)
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-2xl border border-gp-gold/50 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
            placeholder="Demo User"
          />
        </div>

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
            className="w-full rounded-2xl border border-gp-gold/50 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
          />
        </div>

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
            className="w-full rounded-2xl border border-gp-gold/50 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-2xl bg-gp-gold px-4 py-3 text-sm font-semibold text-gp-evergreen transition hover:bg-[#bda775] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          Sign Up
        </button>

        {isLoading && (
          <div className="flex justify-center">
            <PerchPalLoader
              variant="inline"
              size="sm"
              message="PerchPal is creating your account..."
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
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gp-evergreen/70">
          Loading sign up...
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
