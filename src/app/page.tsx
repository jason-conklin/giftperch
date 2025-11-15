"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  useEffect(() => {
    async function test() {
      const { data, error } = await supabase.auth.getSession();
      console.log("Supabase auth test:", { data, error });
    }
    test();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-4 rounded-xl bg-white p-10 shadow-xl dark:bg-zinc-900">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          GiftPerch – Coming Soon (Next.js App)
        </h1>

        <p className="text-zinc-700 dark:text-zinc-300">
          Supabase is wired up. Check the console to see the auth test result.
        </p>

        <p className="rounded-md bg-zinc-100 p-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          Open DevTools (F12) → Console
        </p>
      </main>
    </div>
  );
}
