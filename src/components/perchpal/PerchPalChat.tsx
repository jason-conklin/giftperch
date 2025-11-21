"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import {
  PerchPalFlyingAvatar,
  PerchPalLoader,
} from "@/components/perchpal/PerchPalLoader";

type ChatRole = "user" | "assistant";

export type AiInteraction = {
  id: string;
  user_id: string | null;
  recipient_id: string | null;
  role: ChatRole | string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};
const PERCHPAL_ERROR_MESSAGE =
  "PerchPal is temporarily unavailable. Please try again in a few minutes.";

export function PerchPalChat() {
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

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
        const mapped: ChatMessage[] =
          data
            ?.filter((interaction): interaction is AiInteraction =>
              Boolean(interaction.message)
            )
            .map((interaction) => ({
              id: interaction.id,
              role: interaction.role === "user" ? ("user" as ChatRole) : "assistant",
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

  useEffect(() => {
    if (typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isExpanded]);

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

      const json = await response.json().catch(() => null);
      if (!response.ok || (json && typeof json.error === "string")) {
        throw new Error(
          json && typeof json.error === "string"
            ? json.error
            : PERCHPAL_ERROR_MESSAGE,
        );
      }

      const data = json ?? {};
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
      const fallbackMessage =
        err instanceof Error && err.message
          ? err.message
          : PERCHPAL_ERROR_MESSAGE;
      setError(fallbackMessage);
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
          <PerchPalFlyingAvatar size="sm" className="mt-1 shrink-0" />
          <div>
            <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-gp-evergreen shadow-sm">
              {message.content.split("\n").map((line, idx) => (
                <p key={idx} className="leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-gp-evergreen/50">
              PerchPal -{" "}
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
            You -{" "}
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    );
  };

  const renderMessagesArea = (wrapperClass = "") => (
    <div className={`gp-card-soft space-y-4 overflow-y-auto p-4 sm:p-5 ${wrapperClass}`}>
      {isLoadingHistory ? (
        <div className="flex justify-center">
          <PerchPalLoader variant="inline" size="sm" message="PerchPal is warming up..." />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-gp-evergreen/10 bg-white/95 p-5 text-center text-sm text-gp-evergreen/70">
          Start by telling PerchPal about a person you are shopping for, the
          occasion, and your budget.
        </div>
      ) : (
        messages.map((message) => renderMessageBubble(message))
      )}

      {isSending && (
        <div className="flex items-end gap-2">
          <PerchPalFlyingAvatar size="sm" className="mt-1 shrink-0" />
          <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gp-evergreen/60 animate-bounce [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-gp-evergreen/60 animate-bounce" />
            <span className="h-1.5 w-1.5 rounded-full bg-gp-evergreen/60 animate-bounce [animation-delay:0.2s]" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );

  const renderInputArea = (id: string, extraClasses = "", minRows = 1) => (
    <form
      className={`mt-2 flex flex-col gap-3 sm:flex-row sm:items-center ${extraClasses}`}
      onSubmit={handleSubmit}
    >
      <div className="flex-1">
        <label htmlFor={id} className="sr-only">
          Ask PerchPal
        </label>
        <textarea
          id={id}
          rows={minRows}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder='Ask PerchPal for gift ideas (e.g. "Birthday gift for my mom who loves gardening, budget $100")'
          className="gp-input min-h-[52px] resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={isSending || !input.trim()}
        className="gp-primary-button w-full sm:w-auto"
      >
        Send
      </button>
    </form>
  );

  const HeaderContent = ({ showExpand }: { showExpand: boolean }) => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <PerchPalFlyingAvatar
            size="md"
            className="h-16 w-16 sm:h-14 sm:w-14"
          />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-gp-evergreen md:text-base">
              PerchPal
            </p>
            <p className="text-xs text-gp-evergreen/70 md:text-sm">
              Always on, always delivering thoughtful ideas.
            </p>
          </div>
        </div>
        {showExpand ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gp-evergreen/20 text-gp-evergreen transition hover:bg-gp-cream"
            title="Open full conversation"
            aria-label="Open full conversation"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 3H5a2 2 0 0 0-2 2v4" />
              <path d="M15 3h4a2 2 0 0 1 2 2v4" />
              <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
              <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
              <path d="M10 7h4v4h-4z" />
            </svg>
          </button>
        ) : null}
      </div>
      <p className="text-sm text-gp-evergreen/70">
        Ask for gift ideas, budgets, or inspiration for any recipient or
        occasion.
      </p>
    </div>
  );

  return (
    <>
      <section className="gp-card flex flex-col gap-5">
        <HeaderContent showExpand />
        {renderMessagesArea("max-h-[480px]")}
        {renderInputArea("perchpal-input")}
        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </section>

      {isExpanded ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative flex h-[calc(100vh-2rem)] w-full max-w-3xl translate-y-2 scale-95 flex-col rounded-3xl bg-gp-cream shadow-xl transition duration-200 ease-out sm:h-auto sm:max-h-[90vh] sm:translate-y-0 sm:scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gp-evergreen/10 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <PerchPalFlyingAvatar size="md" />
                <div className="space-y-0.5">
                  <p className="text-base font-semibold text-gp-evergreen">
                    PerchPal
                  </p>
                  <p className="text-sm text-gp-evergreen/70">
                    Always on, always delivering thoughtful ideas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gp-evergreen/20 text-gp-evergreen transition hover:bg-gp-cream"
                title="Close full conversation"
                aria-label="Close full conversation"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
              {renderMessagesArea("flex-1")}
              {renderInputArea(
                "perchpal-input-expanded",
                "border-t border-gp-evergreen/10 pt-3",
                2
              )}
              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


