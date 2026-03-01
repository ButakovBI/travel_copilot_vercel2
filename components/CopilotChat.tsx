"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import { OfferCards } from "./OfferCards";
import { CartPanel } from "./CartPanel";
import type { OfferCard } from "@/lib/types";
import type { TripContext } from "@/lib/copilot/run-v2";
import { useAuth } from "@/app/providers";
import { cn } from "@/lib/cn";

type CartItem = { id: string; type: string; offerId: string; payload: string; priceRub: number };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  offerCards?: OfferCard[];
};

type Props = {
  onTripContextChange?: (ctx: TripContext | null) => void;
  onOfferCardsChange?: (cards: OfferCard[], summary?: string) => void;
  /** Текущий порядок карточек (например после сортировки слайдерами) — подставляется в последнее сообщение с карточками. */
  displayOfferCards?: OfferCard[];
};

const WELCOME_MESSAGE =
  "Здравствуйте! Я AI Travel Copilot Т-Путешествий. Опишите, куда и как хотите поехать — подберу полный маршрут (перелёты и отели по городам). Можно написать в свободной форме, например: «в Прагу из Москвы через Стамбул» или «Москва — Стамбул — Мюнхен — Прага». Буду уточнять детали по мере необходимости. Напишите «покажи варианты», когда готовы увидеть подборку.";

export function CopilotChat({ onTripContextChange, onOfferCardsChange, displayOfferCards }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [authReady, setAuthReady] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getPriceRub = useCallback((card: OfferCard): number => {
    if (card.type === "bundle") return card.totalRub;
    if (card.type === "multiLeg") {
      const d = card.data;
      return d.legs.reduce((s, l) => s + l.offer.priceRub, 0) + (d.returnLeg ? d.returnLeg.offer.priceRub : 0) + (d.hotels ?? []).reduce((s, h) => s + h.offer.pricePerNightRub, 0);
    }
    return 0;
  }, []);

  const handleSelectCard = useCallback(
    async (card: OfferCard) => {
      if (card.type !== "bundle" && card.type !== "multiLeg") return;
      const priceRub = getPriceRub(card);
      const offerId = card.type === "bundle" ? card.flights[0]?.id ?? "bundle" : "multiLeg";
      let sid: string | undefined;
      if (user?.id) sid = undefined;
      else if (typeof window !== "undefined") {
        sid = localStorage.getItem("travel_guest_session_id") ?? undefined;
        if (!sid) {
          sid = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          localStorage.setItem("travel_guest_session_id", sid);
        }
      }
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          sessionId: sid,
          type: card.type,
          offerId,
          payload: JSON.stringify(card),
          priceRub,
        }),
      });
      if (!res.ok) return;
      const { item } = await res.json();
      setCartItems([{ id: item.id, type: card.type, offerId, payload: JSON.stringify(card), priceRub }]);
      setCartOpen(true);
    },
    [user?.id, getPriceRub]
  );

  const handlePaymentDone = useCallback(() => {
    setCartOpen(false);
    setCartItems([]);
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Бронирование завершено. Спасибо за заказ! Чек и квитанции отправлены. Хорошей поездки!",
      },
    ]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setToken(localStorage.getItem("travel_token"));
    if (!user?.id) {
      let id = localStorage.getItem("travel_guest_session_id");
      if (!id) {
        id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem("travel_guest_session_id", id);
      }
      setSessionId(id);
    }
    setAuthReady(true);
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!authReady || historyLoaded) return;
    const q = new URLSearchParams();
    if (token) q.set("token", token);
    if (sessionId) q.set("sessionId", sessionId);
    fetch(`/api/copilot/conversation?${q.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length) {
          const list: Message[] = data.messages.map(
            (m: { role: string; content: string; offerCards?: OfferCard[] }, i: number) => ({
              id: `${data.conversationId}-${i}`,
              role: m.role as "user" | "assistant",
              content: m.content,
              offerCards: m.offerCards,
            })
          );
          setMessages(list);
          setConversationId(data.conversationId ?? null);
          const lastWithCards = [...list].reverse().find((m) => m.offerCards?.length);
          if (lastWithCards?.offerCards?.length) onOfferCardsChange?.(lastWithCards.offerCards, lastWithCards.content);
        } else {
          setMessages([{ id: "welcome", role: "assistant", content: WELCOME_MESSAGE }]);
        }
        setHistoryLoaded(true);
      })
      .catch(() => {
        setMessages([{ id: "welcome", role: "assistant", content: WELCOME_MESSAGE }]);
        setHistoryLoaded(true);
      });
  }, [authReady, historyLoaded, token, sessionId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId ?? undefined,
          token: token ?? undefined,
          sessionId: sessionId ?? undefined,
          stream: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: data.error ?? "Ошибка. Попробуйте ещё раз." },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: {
        conversationId?: string;
        messages?: { role: string; content: string; offerCards?: OfferCard[] }[];
        text?: string;
        offerCards?: OfferCard[];
        tripContext?: TripContext | null;
        error?: string;
      } | null = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line) as {
                phase?: string;
                done?: boolean;
                error?: string;
                conversationId?: string;
                messages?: unknown[];
                text?: string;
                offerCards?: OfferCard[];
                tripContext?: TripContext | null;
              };
              if (obj.done)
                finalData = {
                  conversationId: obj.conversationId,
                  messages: obj.messages as { role: string; content: string; offerCards?: OfferCard[] }[],
                  text: obj.text,
                  offerCards: obj.offerCards,
                  tripContext: obj.tripContext,
                };
              if (obj.error) finalData = { error: obj.error };
            } catch {
              /* ignore */
            }
          }
        }
      }

      if (finalData?.error) {
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: finalData!.error! }]);
      } else if (
        finalData?.conversationId &&
        Array.isArray(finalData.messages) &&
        finalData.messages.length > 0
      ) {
        setConversationId(finalData.conversationId);
        setMessages(
          finalData.messages.map((m, i) => ({
            id: `${finalData!.conversationId}-${i}`,
            role: m.role as "user" | "assistant",
            content: m.content,
            offerCards: m.offerCards,
          }))
        );
        if (finalData.tripContext != null) onTripContextChange?.(finalData.tripContext);
        const lastWithCards = [...finalData.messages].reverse().find((m) => m.offerCards?.length);
        if (lastWithCards?.offerCards?.length) onOfferCardsChange?.(lastWithCards.offerCards!, lastWithCards.content);
      } else if (finalData?.text != null) {
        setConversationId(finalData.conversationId ?? null);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: finalData!.text!,
            offerCards: finalData!.offerCards?.length ? finalData!.offerCards : undefined,
          },
        ]);
        if (finalData.tripContext != null) onTripContextChange?.(finalData.tripContext);
        if (finalData.offerCards?.length) onOfferCardsChange?.(finalData.offerCards, finalData.text ?? undefined);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: "Copilot временно недоступен. Попробуйте позже." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F5]">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {!historyLoaded && messages.length === 0 && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#999]" />
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m, idx) => {
              const isLastWithCards = m.offerCards && m.offerCards.length > 0 && !messages.slice(idx + 1).some((n) => n.offerCards?.length);
              const cardsToShow = isLastWithCards && displayOfferCards?.length ? displayOfferCards : m.offerCards;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn("flex mb-4", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[20px] px-4 py-3 shadow-sm",
                      m.role === "user"
                        ? "bg-[#FFDD2D] text-black"
                        : "bg-white text-[#333] border border-[#E5E5E5]"
                    )}
                  >
                    <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                    {cardsToShow && cardsToShow.length > 0 && (
                      <div className="mt-4">
                        <OfferCards cards={cardsToShow} onAddToCart={() => {}} onSelectCard={handleSelectCard} />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start mb-4"
            >
              <div className="rounded-[20px] px-4 py-3 bg-white border border-[#E5E5E5] shadow-sm flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#999] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#999] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-[#999] animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span className="text-sm text-[#666]">печатает...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-white border-t border-[#E5E5E5]">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Напишите запрос..."
            className="flex-1 px-4 py-3 rounded-[20px] border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#FFDD2D]/50 focus:border-[#FFDD2D] text-[#333] placeholder:text-[#999]"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 rounded-[20px] bg-[#FFDD2D] hover:bg-[#FCC521] text-black disabled:opacity-50 transition-colors shrink-0"
            aria-label="Отправить"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
      {cartOpen && (
        <CartPanel
          items={cartItems}
          onClose={() => setCartOpen(false)}
          onPaymentDone={handlePaymentDone}
          userId={user?.id}
        />
      )}
    </div>
  );
}
