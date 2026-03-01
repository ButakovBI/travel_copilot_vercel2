"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { MapPin, Calendar, Wallet, Users, Moon, Plane, Train, User, Gauge, Banknote, Sofa } from "lucide-react";
import type { TripContext } from "@/lib/copilot/run-v2";
import type { OfferCard } from "@/lib/types";
import { SidebarRouteCard } from "@/components/SidebarRouteCard";
import { useAuth } from "@/app/providers";
import { cn } from "@/lib/cn";
import { sortCardsByPriority, DEFAULT_PRIORITY, type PriorityWeights } from "@/lib/copilot/client-sort";

const MIN_WIDTH = 240;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 320;

type UserContext = {
  cashbackTravelCurrentMonthRub?: number;
  avgMonthlySpendRub?: number;
  restaurantSpendPct?: number;
};

type Props = {
  tripContext: TripContext | null;
  offerCards?: OfferCard[];
  offerSummary?: string;
  className?: string;
  /** При изменении слайдеров приоритета вызывается с пересортированным списком карточек. */
  onOfferCardsChange?: (cards: OfferCard[]) => void;
};

export function ResizableTripSidebar({ tripContext, offerCards = [], offerSummary, className, onOfferCardsChange }: Props) {
  const { user, setAuthModalOpen } = useAuth();
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [priorityWeights, setPriorityWeights] = useState<PriorityWeights>(DEFAULT_PRIORITY);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const sortedCards = useMemo(() => {
    if (offerCards.length <= 1) return offerCards;
    return sortCardsByPriority(offerCards, priorityWeights);
  }, [offerCards, priorityWeights]);

  const handlePriorityChange = useCallback(
    (key: keyof PriorityWeights, value: number) => {
      const next = { ...priorityWeights, [key]: value };
      setPriorityWeights(next);
      const sorted = sortCardsByPriority(offerCards, next);
      onOfferCardsChange?.(sorted);
    },
    [priorityWeights, offerCards, onOfferCardsChange]
  );

  useEffect(() => {
    if (!user) {
      setUserContext(null);
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("travel_token") : null;
    if (!token) return;
    fetch("/api/user/context", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => data.context && setUserContext(data.context))
      .catch(() => {});
  }, [user]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startX.current = e.clientX;
    startWidth.current = width;
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - startX.current;
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
    setWidth(next);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

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
    <div
      className={cn("relative flex shrink-0 flex-col bg-[var(--color-bg)] border-r border-[var(--color-border)] overflow-hidden", className)}
      style={{ width: `${width}px` }}
    >
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-0 right-0 w-1.5 h-full cursor-col-resize select-none z-10 hover:bg-[var(--color-accent)]/30 transition-colors",
          isDragging && "bg-[var(--color-accent)]/50"
        )}
        style={{ marginRight: -3 }}
        aria-hidden
      />
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90">
        <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2" style={{ fontFamily: "var(--font-georama), sans-serif" }}>
          <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
          Параметры поездки
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">Обновляется по ходу диалога</p>
      </div>
      <div className="p-4 overflow-y-auto flex-1 flex flex-col">
        {!hasContext && (
          <p className="text-sm text-[var(--color-text-secondary)]">Уточните города, даты и бюджет в чате — здесь появятся варианты маршрута.</p>
        )}
        {hasContext && tripContext && (
          <div className="space-y-4">
            {tripContext.waypoints && tripContext.waypoints.length > 0 && (
              <div>
                <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Маршрут</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-sm text-[var(--color-text)]">
                  {tripContext.waypoints.map((city, i) => (
                    <span key={`${city}-${i}`}>
                      {city}
                      {i < tripContext.waypoints!.length - 1 && <span className="text-[var(--color-text-secondary)] mx-0.5">→</span>}
                    </span>
                  ))}
                  {tripContext.returnTrip && <span className="text-[var(--color-text-secondary)] text-xs ml-1">+ обратно</span>}
                </div>
              </div>
            )}
            {(!tripContext.waypoints?.length) && (tripContext.origin || tripContext.destination) && (
              <div>
                <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Направление</span>
                <p className="mt-1.5 text-sm text-[var(--color-text)]">
                  {tripContext.origin ?? "—"} → {tripContext.destination ?? "—"}
                </p>
              </div>
            )}
            {(tripContext.dateFrom || tripContext.dateTo) && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Даты</span>
                  <p className="mt-1 text-sm text-[var(--color-text)]">
                    {tripContext.dateFrom ?? "—"} {tripContext.dateTo ? `— ${tripContext.dateTo}` : ""}
                  </p>
                </div>
              </div>
            )}
            {(tripContext.budgetMin != null || tripContext.budgetMax != null) && (
              <div className="flex items-start gap-2">
                <Wallet className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Бюджет</span>
                  <p className="mt-1 text-sm text-[var(--color-text)]">
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
                {tripContext.transport === "flight" ? <Plane className="w-4 h-4 text-[var(--color-primary)]" /> : <Train className="w-4 h-4 text-[var(--color-primary)]" />}
                <div>
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Транспорт</span>
                  <p className="mt-1 text-sm text-[var(--color-text)]">{transportLabel}</p>
                </div>
              </div>
            )}
            {tripContext.guests != null && (
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Гости</span>
                  <p className="mt-1 text-sm text-[var(--color-text)]">{tripContext.guests}</p>
                </div>
              </div>
            )}
            {tripContext.nights != null && (
              <div className="flex items-start gap-2">
                <Moon className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Ночей</span>
                  <p className="mt-1 text-sm text-[var(--color-text)]">{tripContext.nights}</p>
                </div>
              </div>
            )}
          </div>
        )}
        {offerCards.length > 0 && (
          <div className="mt-6">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Сортировка по предпочтениям</span>
            <div className="mt-2 space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">Скорость</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={priorityWeights.speed}
                  onChange={(e) => handlePriorityChange("speed", Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-[var(--color-border)] accent-[var(--color-primary)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">Цена</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={priorityWeights.price}
                  onChange={(e) => handlePriorityChange("price", Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-[var(--color-border)] accent-[var(--color-primary)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Sofa className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">Комфорт</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={priorityWeights.comfort}
                  onChange={(e) => handlePriorityChange("comfort", Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none bg-[var(--color-border)] accent-[var(--color-primary)]"
                />
              </div>
            </div>
            <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mt-4 block">Варианты маршрута</span>
            <div className="mt-2 space-y-3">
              {sortedCards.map((card, i) => (
                <SidebarRouteCard key={i} card={card as OfferCard & { routeLabel?: string; riskScore?: number; riskFactors?: string[] }} summary={i === 0 ? offerSummary : undefined} />
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          {!user ? (
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">
              Войдите — учтём кэшбэк и траты для подбора.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className={cn(
              "w-full py-2 rounded-[var(--radius-md)] text-sm font-medium flex items-center justify-center gap-2",
              user ? "text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface)]" : "text-[var(--color-text)] bg-[var(--color-primary)] hover:opacity-90"
            )}
          >
            <User className="w-4 h-4" />
            {user ? "Личный кабинет" : "Войти по номеру телефона"}
          </button>
          {user && userContext && (
            <div className="mt-2 space-y-1 text-xs text-[var(--color-text-secondary)]">
              {userContext.cashbackTravelCurrentMonthRub != null && (
                <p>Кэшбэк: +{Math.round(userContext.cashbackTravelCurrentMonthRub).toLocaleString("ru-RU")} ₽</p>
              )}
              {userContext.avgMonthlySpendRub != null && (
                <p>Траты: ~{Math.round(userContext.avgMonthlySpendRub / 1000)}k ₽/мес</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
