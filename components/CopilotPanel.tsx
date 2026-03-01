"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, MapPin, Calendar, Wallet, Users, Moon, Plane, Train } from "lucide-react";
import { OfferCards } from "./OfferCards";
import { CartPanel } from "./CartPanel";
import type { OfferCard } from "@/lib/types";
import type { TripContext } from "@/lib/copilot/run-v2";
import { useAuth } from "@/app/providers";
import { cn } from "@/lib/cn";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  offerCards?: OfferCard[];
};

export function CopilotPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState<"clarifying" | "results">("clarifying");
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<{ id: string; type: string; offerId: string; payload: string; priceRub: number }[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("travel_token") : null;
  const sessionId = user?.id
    ? undefined
    : (typeof window !== "undefined"
        ? (() => {
            let id = localStorage.getItem("travel_guest_session_id");
            if (!id) {
              id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
              localStorage.setItem("travel_guest_session_id", id);
            }
            return id;
          })()
        : undefined);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (historyLoaded) return;
    const q = new URLSearchParams();
    if (token) q.set("token", token);
    if (sessionId) q.set("sessionId", sessionId);
    fetch(`/api/copilot/conversation?${q.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length) {
          const list: Message[] = data.messages.map((m: { role: string; content: string; offerCards?: OfferCard[] }, i: number) => ({
            id: `${data.conversationId}-${i}`,
            role: m.role as "user" | "assistant",
            content: m.content,
            offerCards: m.offerCards,
          }));
          setMessages(list);
          setConversationId(data.conversationId ?? null);
        } else if (messages.length === 0) {
          setMessages([]);
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [historyLoaded, token, sessionId]);


  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    setLoadingLabel("clarifying");

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
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.error ?? "Произошла ошибка. Попробуйте ещё раз или воспользуйтесь обычным поиском.",
          },
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
              const obj = JSON.parse(line) as { phase?: string; done?: boolean; error?: string; conversationId?: string; messages?: unknown[]; text?: string; offerCards?: OfferCard[] };
              if (obj.phase === "clarifying") setLoadingLabel("clarifying");
              if (obj.phase === "results") setLoadingLabel("results");
              if (obj.done) finalData = { conversationId: obj.conversationId, messages: obj.messages as { role: string; content: string; offerCards?: OfferCard[] }[], text: obj.text, offerCards: obj.offerCards, tripContext: obj.tripContext };
              if (obj.error) finalData = { error: obj.error };
            } catch {
              // ignore malformed line
            }
          }
        }
      }

      if (finalData?.error) {
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: finalData!.error! },
        ]);
      } else if (finalData?.conversationId && Array.isArray(finalData.messages) && finalData.messages.length > 0) {
        setConversationId(finalData.conversationId);
        setMessages(finalData.messages.map((m, i) => ({
          id: `${finalData!.conversationId}-${i}`,
          role: m.role as "user" | "assistant",
          content: m.content,
          offerCards: m.offerCards,
        })));
        if (finalData.tripContext != null) setTripContext(finalData.tripContext);
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
        if (finalData.tripContext != null) setTripContext(finalData.tripContext);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "Copilot временно недоступен. Используйте обычный поиск на главной странице.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (card: OfferCard) => {
    if (card.type === "bundle") return;
    const offerId = card.data.id;
    const type = card.type;
    const priceRub = card.type === "flight" ? card.data.priceRub : card.type === "hotel" ? card.data.pricePerNightRub : card.data.priceRub;
    const payload = JSON.stringify(card);

    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?.id,
        sessionId: user ? undefined : sessionId,
        type,
        offerId,
        payload,
        priceRub,
      }),
    });
    if (!res.ok) return;
    const { item } = await res.json();
    setCartItems((prev) => [...prev, { id: item.id, type, offerId, payload, priceRub }]);
    setCartOpen(true);
  };

  const loadingLabelText = loadingLabel === "results" ? "Подбираю варианты..." : "Уточняю детали...";
  const hasContext = tripContext && (
    tripContext.waypoints?.length ||
    tripContext.origin ||
    tripContext.destination ||
    tripContext.dateFrom ||
    tripContext.dateTo != null ||
    tripContext.budgetMin != null ||
    tripContext.budgetMax != null ||
    tripContext.guests != null ||
    tripContext.nights != null
  );
  const transportLabel = tripContext?.transport === "flight" ? "Самолёт" : tripContext?.transport === "train" ? "Поезд" : tripContext?.transport === "any" ? "Любой" : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-white flex flex-col">
        <header className="h-14 border-b border-tbank-gray-border flex items-center justify-between px-4 shrink-0">
          <span className="font-semibold text-tbank-black">AI Travel Copilot</span>
          <div className="flex items-center gap-2">
            {user && <span className="text-sm text-tbank-gray">{user.name ?? user.phone}</span>}
            {hasContext && (
              <button
                type="button"
                onClick={() => setSidebarOpen((v) => !v)}
                className="text-sm text-[#0066FF] hover:underline"
              >
                {sidebarOpen ? "Скрыть маршрут" : "Показать маршрут"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="text-sm text-tbank-gray hover:text-tbank-black"
            >
              Корзина {cartItems.length ? `(${cartItems.length})` : ""}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-tbank-gray-light rounded-lg"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          <div className={cn("flex-1 overflow-y-auto px-4 py-4", sidebarOpen && hasContext && "max-w-2xl")}>
          <div className="mx-auto space-y-4" style={sidebarOpen && hasContext ? { maxWidth: "42rem" } : undefined}>
            {!historyLoaded && messages.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-tbank-gray" />
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    m.role === "user"
                      ? "bg-tbank-yellow text-tbank-black"
                      : "bg-tbank-gray-light text-tbank-gray"
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                  {m.offerCards && m.offerCards.length > 0 && (
                    <div className="mt-4">
                      <OfferCards cards={m.offerCards} onAddToCart={handleAddToCart} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-tbank-gray-light rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-tbank-gray">{loadingLabelText}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {sidebarOpen && hasContext && tripContext && (
          <aside className="w-72 shrink-0 border-l border-tbank-gray-border bg-[#F8FAFC] overflow-y-auto flex flex-col">
            <div className="p-4 sticky top-0 bg-[#F8FAFC] border-b border-tbank-gray-border">
              <h3 className="font-semibold text-tbank-black flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0066FF]" />
                Параметры поездки
              </h3>
              <p className="text-xs text-tbank-gray mt-1">Обновляется по ходу диалога</p>
            </div>
            <div className="p-4 space-y-4">
              {tripContext.waypoints && tripContext.waypoints.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-tbank-gray uppercase tracking-wide">Маршрут</span>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1 text-sm text-tbank-black">
                    {tripContext.waypoints.map((city, i) => (
                      <span key={city + i}>
                        {city}
                        {i < tripContext.waypoints!.length - 1 && <span className="text-tbank-gray mx-0.5">→</span>}
                      </span>
                    ))}
                    {tripContext.returnTrip && <span className="text-tbank-gray text-xs ml-1">+ обратно</span>}
                  </div>
                </div>
              )}
              {(!tripContext.waypoints?.length) && (tripContext.origin || tripContext.destination) && (
                <div>
                  <span className="text-xs font-medium text-tbank-gray uppercase tracking-wide">Направление</span>
                  <p className="mt-1.5 text-sm text-tbank-black">
                    {tripContext.origin ?? "—"} → {tripContext.destination ?? "—"}
                  </p>
                </div>
              )}
              {(tripContext.dateFrom || tripContext.dateTo) && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-tbank-gray uppercase tracking-wide">Даты</span>
                    <p className="mt-1 text-sm text-tbank-black">
                      {tripContext.dateFrom ?? "—"} {tripContext.dateTo ? `— ${tripContext.dateTo}` : ""}
                    </p>
                  </div>
                </div>
              )}
              {(tripContext.budgetMin != null || tripContext.budgetMax != null) && (
                <div className="flex items-start gap-2">
                  <Wallet className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-tbank-gray uppercase tracking-wide">Бюджет</span>
                    <p className="mt-1 text-sm text-tbank-black">
                      {tripContext.budgetMin != null && tripContext.budgetMax != null
                        ? `${(tripContext.budgetMin / 1000).toFixed(0)}k – ${(tripContext.budgetMax / 1000).toFixed(0)}k ₽`
                        : tripContext.budgetMax != null
                          ? `до ${(tripContext.budgetMax / 1000).toFixed(0)}k ₽`
                          : `от ${(tripContext.budgetMin! / 1000).toFixed(0)}k ₽`}
                    </p>
                  </div>
                </div>
              )}
              {transportLabel && (
                <div className="flex items-center gap-2">
                  {tripContext.transport === "flight" ? <Plane className="w-4 h-4 text-[#0066FF]" /> : <Train className="w-4 h-4 text-[#0066FF]" />}
                  <div>
                    <span className="text-xs font-medium text-tbank-gray uppercase tracking-wide">Транспорт</span>
                    <p className="mt-1 text-sm text-tbank-black">{transportLabel}</p>
                  </div>
                </div>
              )}
              {tripContext.guests != null && (
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-tbank-gray uppercase tracking-wide">Гости</span>
                    <p className="mt-1 text-sm text-tbank-black">{tripContext.guests}</p>
                  </div>
                </div>
              )}
              {tripContext.nights != null && (
                <div className="flex items-start gap-2">
                  <Moon className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-medium text-tbank-gray uppercase tracking-wide">Ночей</span>
                    <p className="mt-1 text-sm text-tbank-black">{tripContext.nights}</p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
        </div>

        <div className="p-4 border-t border-tbank-gray-border bg-white shrink-0">
          <div className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Напишите запрос..."
              className="flex-1 px-4 py-3 border border-tbank-gray-border rounded-xl focus:outline-none focus:ring-2 focus:ring-tbank-yellow"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="p-3 bg-tbank-yellow hover:bg-tbank-yellow-hover rounded-xl disabled:opacity-50"
              aria-label="Отправить"
            >
              <Send className="w-5 h-5 text-tbank-black" />
            </button>
          </div>
          <p className="text-xs text-tbank-gray text-center mt-2">
            Запросы обрабатываются с помощью ИИ. Данные о ценах и наличии — из поиска Т-Путешествий.
          </p>
        </div>
      </div>

      {cartOpen && (
        <CartPanel
          items={cartItems}
          onClose={() => setCartOpen(false)}
          onPaymentDone={() => {
            setCartItems([]);
            setCartOpen(false);
          }}
          userId={user?.id}
        />
      )}
    </>
  );
}
