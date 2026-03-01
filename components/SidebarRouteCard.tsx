"use client";

import { Plane, Train, AlertTriangle, Share2, RefreshCw, Hotel } from "lucide-react";
import type { OfferCard, RouteLabel } from "@/lib/types";

function multiLegTotal(legs: { offer: { priceRub: number } }[], returnLeg?: { offer: { priceRub: number } }, hotels?: { offer: { pricePerNightRub: number } }[]) {
  const t = legs.reduce((s, l) => s + l.offer.priceRub, 0) + (returnLeg ? returnLeg.offer.priceRub : 0);
  const h = (hotels ?? []).reduce((s, x) => s + x.offer.pricePerNightRub, 0);
  return t + h;
}

type CardWithMeta = OfferCard & {
  routeLabel?: RouteLabel;
  riskScore?: number;
  riskFactors?: string[];
};

type Props = {
  card: CardWithMeta;
  summary?: string;
};

function TransportIcon({ type }: { type: "flight" | "train" }) {
  return type === "flight" ? <Plane className="w-4 h-4 text-[var(--color-primary)]" /> : <Train className="w-4 h-4 text-[var(--color-primary)]" />;
}

export function SidebarRouteCard({ card, summary }: Props) {
  const riskScore = card.riskScore ?? 0;
  const riskFactors = card.riskFactors ?? [];
  const isRisky = riskScore >= 5;

  if (card.type === "multiLeg") {
    const { legs, returnLeg, hotels } = card.data;
    const totalRub = multiLegTotal(legs, returnLeg, hotels);
    const isPlaceholder = (leg: { offer: { carrier: string } }) => leg.offer.carrier === "—";
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1 min-w-0">
            {legs.map((leg, i) => (
              <span key={i} className={`flex items-center gap-1 flex-wrap ${isPlaceholder(leg) ? "text-[var(--color-caution)]" : ""}`}>
                <span className="font-medium text-sm truncate text-[var(--color-text)]">{leg.from}</span>
                <TransportIcon type="flight" />
                <span className="font-medium text-sm truncate text-[var(--color-text)]">{leg.to}</span>
                {i < legs.length - 1 && <span className="text-[var(--color-text-tertiary)] mx-0.5">→</span>}
              </span>
            ))}
            {returnLeg && (
              <>
                <span className="text-[var(--color-text-tertiary)] mx-0.5">→</span>
                <span className={isPlaceholder(returnLeg) ? "text-[var(--color-caution)] font-medium text-sm" : "font-medium text-sm text-[var(--color-text)]"}>{returnLeg.from}</span>
                <TransportIcon type="flight" />
                <span className={isPlaceholder(returnLeg) ? "text-[var(--color-caution)] font-medium text-sm" : "font-medium text-sm text-[var(--color-text)]"}>{returnLeg.to}</span>
              </>
            )}
          </div>
          {card.routeLabel && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/30 text-[var(--color-text)]">
              {card.routeLabel}
            </span>
          )}
        </div>
        {hotels && hotels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {hotels.map((h, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 text-xs text-[var(--color-text-secondary)]">
                <Hotel className="w-3 h-3" /> {h.city}
              </span>
            ))}
          </div>
        )}
        {summary && <p className="text-xs text-[var(--color-text-secondary)] mb-2 line-clamp-2">{summary}</p>}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {riskScore > 0 && (
              <span className={isRisky ? "text-[var(--color-risk)] flex items-center gap-0.5" : "text-[var(--color-text-secondary)] flex items-center gap-0.5"}>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-xs">Риск {riskScore}/10</span>
              </span>
            )}
            {riskFactors.length > 0 && riskFactors[0] !== "Без особых рисков" && (
              <span className="text-xs text-[var(--color-text-secondary)]">{riskFactors[0]}</span>
            )}
          </div>
          <span className="font-semibold text-[var(--color-text)]">{totalRub.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
          <button type="button" className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            <RefreshCw className="w-3.5 h-3.5" />
            Заменить
          </button>
          <button type="button" className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            <Share2 className="w-3.5 h-3.5" />
            Поделиться
          </button>
        </div>
      </div>
    );
  }

  if (card.type === "flight") {
    const d = card.data;
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-medium text-sm text-[var(--color-text)]">{d.origin} → {d.destination}</span>
          {card.routeLabel && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/30 text-[var(--color-text)]">
              {card.routeLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">{d.carrier} {d.flightNumber} · {d.direct ? "прямой" : "с пересадкой"}</p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {riskScore > 0 && (
            <span className={isRisky ? "text-[var(--color-risk)] text-xs flex items-center gap-0.5" : "text-[var(--color-text-secondary)] text-xs"}>
              <AlertTriangle className="w-3.5 h-3.5" /> Риск {riskScore}/10
            </span>
          )}
          <span className="font-semibold text-[var(--color-text)]">{d.priceRub.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
          <button type="button" className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Заменить
          </button>
          <button type="button" className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            <Share2 className="w-3.5 h-3.5" /> Поделиться
          </button>
        </div>
      </div>
    );
  }

  if (card.type === "hotel") {
    const d = card.data;
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-medium text-sm text-[var(--color-text)]">{d.city}, {d.name}</span>
          {card.routeLabel && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/30 text-[var(--color-text)]">
              {card.routeLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">{d.stars}★ · {d.pricePerNightRub.toLocaleString("ru-RU")} ₽/ночь</p>
        <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
          <button type="button" className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Заменить
          </button>
          <button type="button" className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            <Share2 className="w-3.5 h-3.5" /> Поделиться
          </button>
        </div>
      </div>
    );
  }

  if (card.type === "bundle") {
    const f = card.flights[0];
    const h = card.hotels[0];
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-medium text-sm text-[var(--color-text)]">
            {f ? `${f.origin} → ${f.destination}` : "Рейс + отель"}
          </span>
          {card.routeLabel && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/30 text-[var(--color-text)]">
              {card.routeLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">
          {f?.carrier ?? ""}{h ? ` · ${h.name}, ${h.city}` : ""}
        </p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-semibold text-[var(--color-text)]">{card.totalRub.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
          <button type="button" className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            <Share2 className="w-3.5 h-3.5" /> Поделиться
          </button>
        </div>
      </div>
    );
  }

  if (card.type === "train") {
    const d = card.data;
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-medium text-sm text-[var(--color-text)]">{d.origin} → {d.destination}</span>
          {card.routeLabel && (
            <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/30 text-[var(--color-text)]">
              {card.routeLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mb-2">{d.carrier}</p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {riskScore > 0 && (
            <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-0.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Риск {riskScore}/10
            </span>
          )}
          <span className="font-semibold text-[var(--color-text)]">{d.priceRub.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
          <button type="button" className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Заменить
          </button>
          <button type="button" className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            <Share2 className="w-3.5 h-3.5" /> Поделиться
          </button>
        </div>
      </div>
    );
  }

  return null;
}
