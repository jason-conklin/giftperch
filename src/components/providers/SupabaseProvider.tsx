"use client";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SupabaseSessionContextValue = {
  session: Session | null;
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
};

export const SupabaseSessionContext = createContext<
  SupabaseSessionContextValue | undefined
>(undefined);

type SupabaseProviderProps = {
  children: ReactNode;
};

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session ?? null);
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<SupabaseSessionContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
    }),
    [session, status]
  );

  return (
    <SupabaseSessionContext.Provider value={value}>
      {children}
    </SupabaseSessionContext.Provider>
  );
}
