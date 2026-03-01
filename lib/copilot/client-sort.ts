/**
 * Клиентская сортировка карточек по приоритетам (скорость, цена, комфорт).
 * Дублирует логику sortByPriority из scenarios.ts для использования в UI без серверных зависимостей.
 */
import type { OfferCard } from "../types";

export type PriorityWeights = { speed: number; price: number; comfort: number };

export const DEFAULT_PRIORITY: PriorityWeights = { speed: 5, price: 5, comfort: 5 };

function score(c: OfferCard, weights: PriorityWeights): number {
  let priceScore = 0;
  let speedScore = 0;
  let comfortScore = 0;
  if (c.type === "flight") {
    priceScore = c.data.priceRub;
    speedScore = c.data.direct ? 10 : 3;
    comfortScore = c.data.direct ? 7 : 4;
  } else if (c.type === "train") {
    priceScore = c.data.priceRub;
    speedScore = 5;
    comfortScore = 5;
  } else if (c.type === "hotel") {
    priceScore = c.data.pricePerNightRub * 100;
    comfortScore = c.data.stars * 2;
    speedScore = 5;
  } else if (c.type === "bundle") {
    priceScore = c.totalRub;
    const f = c.flights[0];
    speedScore = f?.direct ? 10 : 3;
    const h = c.hotels[0];
    comfortScore = (f?.direct ? 5 : 2) + (h ? h.stars * 1.5 : 0);
  } else if (c.type === "multiLeg") {
    const transportTotal = c.data.legs.reduce((s, l) => s + l.offer.priceRub, 0);
    const returnTotal = c.data.returnLeg ? c.data.returnLeg.offer.priceRub : 0;
    const hotelsTotal = (c.data.hotels ?? []).reduce((s, h) => s + h.offer.pricePerNightRub, 0);
    priceScore = transportTotal + returnTotal + hotelsTotal;
    speedScore = 5;
    comfortScore = 5;
  } else {
    return 0;
  }
  const normPrice = Math.min(1, 1 - priceScore / 500000);
  return (
    weights.price * normPrice +
    weights.speed * (speedScore / 10) +
    weights.comfort * (comfortScore / 10)
  );
}

export function sortCardsByPriority(cards: OfferCard[], weights: PriorityWeights): OfferCard[] {
  return [...cards].sort((a, b) => score(b, weights) - score(a, weights));
}
