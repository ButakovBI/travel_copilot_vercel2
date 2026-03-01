"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, ChevronDown, Sparkles } from "lucide-react";
import { useAuth } from "@/app/providers";

type UserContext = {
  cashbackTravelCurrentMonthRub?: number;
  avgMonthlySpendRub?: number;
  restaurantSpendPct?: number;
  travelSpendPct?: number;
  luxurySpendPct?: number;
};

export function Header() {
  const { user, logout, setAuthModalOpen } = useAuth();
  const [context, setContext] = useState<UserContext | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setContext(null);
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("travel_token") : null;
    if (!token) return;
    fetch("/api/user/context", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.context) setContext(data.context);
      })
      .catch(() => {});
  }, [user]);

  const displayName = user ? (user.name || user.phone || "Личный кабинет") : null;

  return (
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-text)] font-bold text-xl">
              Т
            </span>
            <span className="font-semibold text-[var(--color-text)] hidden sm:inline" style={{ fontFamily: "var(--font-georama), sans-serif" }}>
              Т-Путешествия
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
            <a href="#" className="hover:text-[var(--color-text)] transition-colors">Частным лицам</a>
            <a href="#" className="hover:text-[var(--color-text)] transition-colors">Бизнесу</a>
            <a href="#" className="hover:text-[var(--color-text)] transition-colors">Премиум</a>
            <a href="#" className="hover:text-[var(--color-text)] transition-colors">Еще</a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/copilot" className="text-sm font-medium text-[#0066FF] hover:underline hidden sm:inline flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> Copilot
          </Link>
          {!user ? (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-2 text-[#0066FF] hover:underline font-medium text-sm"
              aria-label="Войти в личный кабинет"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Войти по номеру телефона</span>
            </button>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 text-[var(--color-text)] font-medium text-sm hover:opacity-90"
                aria-expanded={profileOpen}
                aria-label="Профиль"
              >
                <User className="w-4 h-4 text-[#0066FF]" />
                <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-72 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg z-20 p-4">
                    <p className="font-medium text-[var(--color-text)] truncate">{displayName}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{user.phone}</p>
                    {context && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-2">
                        {context.cashbackTravelCurrentMonthRub != null && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--color-text-secondary)]">Кэшбэк на путешествия (этот месяц)</span>
                            <span className="font-semibold text-[var(--color-safety)]">+{Math.round(context.cashbackTravelCurrentMonthRub).toLocaleString("ru-RU")} ₽</span>
                          </div>
                        )}
                        {context.avgMonthlySpendRub != null && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--color-text-secondary)]">Средние траты в месяц</span>
                            <span className="font-medium text-[var(--color-text)]">~{Math.round(context.avgMonthlySpendRub / 1000).toLocaleString("ru-RU")}k ₽</span>
                          </div>
                        )}
                        {context.restaurantSpendPct != null && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--color-text-secondary)]">Траты на рестораны</span>
                            <span className="font-medium text-[var(--color-text)]">{Math.round(context.restaurantSpendPct * 100)}%</span>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { logout(); setProfileOpen(false); }}
                      className="mt-3 w-full py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] border border-[var(--color-border)] rounded-[var(--radius-md)]"
                    >
                      Выйти
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
