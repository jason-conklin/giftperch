"use client";

import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { useEffect } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { status } = useSupabaseSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status !== "unauthenticated") return;

    const search = searchParams?.toString();
    const redirectTarget = search ? `${pathname}?${search}` : pathname;

    router.replace(
      `/auth/login?redirect=${encodeURIComponent(
        redirectTarget ?? "/dashboard",
      )}`,
    );
  }, [pathname, router, searchParams, status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <PerchPalLoader
          variant="inline"
          size="sm"
          message="Checking your session..."
        />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gp-evergreen/70">
        Redirecting you to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
