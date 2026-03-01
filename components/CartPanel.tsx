"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/app/providers";

type CartItem = { id: string; type: string; offerId: string; payload: string; priceRub: number };

export function CartPanel({
  items,
  onClose,
  onPaymentDone,
  userId,
}: {
  items: CartItem[];
  onClose: () => void;
  onPaymentDone: () => void;
  userId?: string;
}) {
  const { user } = useAuth();
  const [localItems, setLocalItems] = useState<CartItem[]>(items);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cashbackTravelRub, setCashbackTravelRub] = useState<number | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    if (!user) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("travel_token") : null;
    if (!token) return;
    fetch("/api/user/context", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.context?.cashbackTravelCurrentMonthRub != null)
          setCashbackTravelRub(data.context.cashbackTravelCurrentMonthRub);
      })
      .catch(() => {});
  }, [user]);

  const total = localItems.reduce((s, i) => s + i.priceRub, 0);

  const handlePay = async () => {
    if (localItems.length === 0) return;
    setPaying(true);
    try {
      const sessionId = userId ? undefined : `guest-${Date.now()}`;
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId ?? undefined,
          sessionId: userId ? undefined : sessionId,
          amountRub: total,
          cartItemIds: localItems.map((i) => i.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка оплаты");
      setSuccess(true);
      setTimeout(() => {
        onPaymentDone();
      }, 2500);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка оплаты");
    } finally {
      setPaying(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-tbank-black mb-2">Бронирование оформлено</h2>
          <p className="text-tbank-gray text-sm">Чек и квитанции отправлены. Напоминание в календарь можно добавить в личном кабинете.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-tbank-gray-border">
          <h2 className="text-lg font-semibold">Корзина</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-tbank-gray-light rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {localItems.length === 0 ? (
            <p className="text-tbank-gray">Корзина пуста</p>
          ) : (
            <ul className="space-y-2">
              {localItems.map((i) => (
                <li key={i.id} className="flex justify-between text-sm py-2 border-b border-tbank-gray-border">
                  <span>
                    {i.type === "flight" ? "Рейс" : i.type === "hotel" ? "Отель" : i.type === "train" ? "Поезд" : "План поездки"} — {i.type === "bundle" || i.type === "multiLeg" ? "маршрут целиком" : i.offerId}
                  </span>
                  <span className="font-medium">{i.priceRub.toLocaleString("ru-RU")} ₽</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 border-t border-tbank-gray-border">
          <div className="flex justify-between text-lg font-semibold mb-4">
            <span>Итого</span>
            <span>{total.toLocaleString("ru-RU")} ₽</span>
          </div>
          {user && (
            <>
              {cashbackTravelRub != null && cashbackTravelRub > 0 && (
                <p className="text-sm text-tbank-green font-medium mb-1">Кэшбэк на путешествия в этом месяце: {Math.round(cashbackTravelRub).toLocaleString("ru-RU")} ₽</p>
              )}
              <p className="text-sm text-tbank-gray mb-2">Кэшбэк по карте Т-Банка будет начислен после поездки.</p>
            </>
          )}
          <p className="text-xs text-tbank-gray mb-3">Оплата через платёжный шлюз Т-Банка.</p>
          <button
            type="button"
            onClick={handlePay}
            disabled={localItems.length === 0 || paying}
            className="w-full py-3 bg-tbank-yellow hover:bg-tbank-yellow-hover rounded-xl font-medium text-tbank-black disabled:opacity-50"
          >
            {paying ? "Оплата..." : "Оплатить"}
          </button>
        </div>
      </div>
    </div>
  );
}
