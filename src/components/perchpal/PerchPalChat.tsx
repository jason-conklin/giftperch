"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";

type ChatRole = "user" | "assistant";

export type AiInteraction = {
  id: string;
  user_id: string | null;
  recipient_id: string | null;
  role: ChatRole | string;
  message: string;
  metadata: any | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

export function PerchPalChat() {
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user?.id) return;

    let isMounted = true;
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      setError("");
      const { data, error } = await supabase
        .from("ai_interactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (!isMounted) return;

      if (error) {
        setError(error.message);
      } else {
        const mapped =
          data
            ?.filter((interaction): interaction is AiInteraction =>
              Boolean(interaction.message)
            )
            .map((interaction) => ({
              id: interaction.id,
              role: interaction.role === "user" ? "user" : "assistant",
              content: interaction.message,
              created_at: interaction.created_at,
            })) ?? [];
        setMessages(mapped);
      }
      setIsLoadingHistory(false);
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [status, supabase, user?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id || status !== "authenticated") {
      setError("You must be signed in to chat with PerchPal.");
      return;
    }
    const trimmed = input.trim();
    if (!trimmed) return;

    setError("");
    setInput("");

    const optimisticMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const historyPayload = [...messages, optimisticMessage]
        .slice(-15)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const response = await fetch("/api/perchpal/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(
          (await response.json())?.error ?? "Unable to reach PerchPal."
        );
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          typeof data.reply === "string"
            ? data.reply
            : "PerchPal had trouble crafting ideas just now.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "PerchPal couldn’t respond right now. Please try again."
      );
      setMessages((prev) =>
        prev.filter((message) => message.id !== optimisticMessage.id)
      );
    } finally {
      setIsSending(false);
    }
  };

  const renderMessageBubble = (message: ChatMessage) => {
    if (message.role === "assistant") {
      return (
        <div key={message.id} className="flex items-start gap-3">
          <div className="relative h-8 w-8">
            <Image
              src="/perchpal_bird.png"
              alt="PerchPal"
              fill
              className="rounded-full border border-gp-evergreen/10 object-cover"
            />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
          </div>
          <div>
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-gp-evergreen shadow-sm">
              {message.content.split("\n").map((line, idx) => (
                <p key={idx} className="leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-gp-evergreen/50">
              PerchPal ·{" "}
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className="flex justify-end">
        <div>
          <div className="rounded-2xl rounded-br-sm bg-gp-evergreen px-4 py-3 text-sm text-gp-cream shadow-sm">
            {message.content}
          </div>
          <p className="mt-1 text-right text-[10px] uppercase tracking-wide text-gp-evergreen/50">
            You ·{" "}
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-gp-evergreen/15 bg-white/95 p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12">
            <Image
              src="/perchpal_bird.png"
              alt="PerchPal mascot"
              fill
              className="rounded-full border border-gp-evergreen/10 object-cover"
            />
            <span className="absolute -right-0.5 bottom-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gp-evergreen">
              PerchPal
            </p>
            <p className="text-xs text-gp-evergreen/70">
              Your AI gifting guide
            </p>
          </div>
        </div>
        <p className="text-sm text-gp-evergreen/70">
          Ask for gift ideas, budgets, or inspiration for any recipient or
          occasion.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-gp-evergreen/10 bg-gp-cream/40 p-3 sm:p-4 max-h-[480px] space-y-4">
        {isLoadingHistory ? (
          <div className="flex justify-center">
            <PerchPalLoader
              variant="inline"
              size="sm"
              message="PerchPal is warming up..."
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gp-evergreen/30 bg-white/90 p-4 text-sm text-gp-evergreen/70">
            Start by telling PerchPal about a person you’re shopping for, the
            occasion, and your budget.
          </div>
        ) : (
          messages.map((message) => renderMessageBubble(message))
        )}

        {isSending && (
          <div className="flex items-end gap-2">
            <div className="relative h-8 w-8">
              <Image
                src="/perchpal_bird.png"
                alt="PerchPal"
                fill
                className="rounded-full border border-gp-evergreen/10 object-cover"
              />
            </div>
            <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gp-evergreen/60 animate-bounce [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-gp-evergreen/60 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-gp-evergreen/60 animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={handleSubmit}
      >
        <div className="flex-1">
          <label htmlFor="perchpal-input" className="sr-only">
            Ask PerchPal
          </label>
          <textarea
            id="perchpal-input"
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='Ask PerchPal for gift ideas (e.g. "Birthday gift for my mom who loves gardening, budget $100")'
            className="w-full resize-none rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="inline-flex items-center justify-center rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132] disabled:opacity-60"
        >
          Send
        </button>
      </form>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
