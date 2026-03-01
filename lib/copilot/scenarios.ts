/**
 * Сценарии использования Copilot: онбординг, приоритеты, риски, метки маршрутов.
 * Соответствует требованиям: онбординг (O1–O6), приоритеты (слайдеры), риски, сравнение.
 */

import type { ExtractedParams } from "./params";
import type { OfferCard, RouteLabel } from "../types";

/** Прогресс онбординга для прогресс-бара и «сколько ещё отвечать». */
export type OnboardingProgress = {
  step: number;
  totalSteps: number;
  canSkip: boolean;
  missingCount: number;
};

/** Приоритеты для ранжирования (0–10): скорость, цена, комфорт. */
export type PriorityWeights = {
  speed: number;
  price: number;
  comfort: number;
};

export const DEFAULT_PRIORITY: PriorityWeights = { speed: 5, price: 5, comfort: 5 };

/** Пресет приоритета. */
export type PriorityPreset = "balanced" | "cheapest" | "fastest" | "most_comfortable";


/** Индекс риска 0–10 и краткое пояснение (сценарий 6). */
export type RiskInfo = {
  score: number;
  factors: string[];
};

const MAX_ONBOARDING_STEPS = 5;

/**
 * Считает прогресс онбординга: шаг, всего шагов, можно ли пропустить.
 * «Всего шагов» = минимум из (MAX_ONBOARDING_STEPS, количество недостающих пунктов + 1).
 */
export function getOnboardingProgress(
  params: ExtractedParams,
  missing: string[]
): OnboardingProgress {
  const missingCount = missing.length;
  const totalSteps = Math.min(MAX_ONBOARDING_STEPS, Math.max(1, missingCount + 1));
  const answered = totalSteps - Math.min(missingCount, totalSteps - 1);
  const step = Math.min(answered + 1, totalSteps);
  const canSkip = missingCount > 0;
  return {
    step,
    totalSteps,
    canSkip,
    missingCount,
  };
}

/** Фразы пользователя «покажи варианты как есть» / «пропустить уточнения». */
const SKIP_PATTERNS = [
  /покажи\s+(как\s+есть|варианты)/i,
  /пропусти(ть)?\s*(уточнения|вопросы)?/i,
  /достаточно/i,
  /хватит\s+вопросов/i,
  /покажи\s+варианты/i,
  /без\s+уточнений/i,
  /сразу\s+варианты/i,
  /выдай\s+уже\s+варианты/i,
  /выдай\s+варианты/i,
  /какие\s+есть\s+варианты/i,
];

export function detectSkipIntent(userText: string): boolean {
  const t = userText.trim();
  return SKIP_PATTERNS.some((re) => re.test(t));
}

/**
 * Оценка риска по карточке (0–10). Плейсхолдер: прямые рейсы и поезда — ниже риск.
 */
export function computeRiskScore(card: OfferCard): number {
  if (card.type === "flight") {
    return card.data.direct ? 2 : 6;
  }
  if (card.type === "train") return 3;
  if (card.type === "hotel") return card.data.stars >= 4 ? 1 : 3;
  if (card.type === "bundle") {
    const f = card.flights[0];
    const h = card.hotels[0];
    const flightRisk = f?.direct ? 2 : 6;
    const hotelRisk = h && h.stars >= 4 ? 1 : 3;
    return Math.round((flightRisk + hotelRisk) / 2);
  }
  if (card.type === "multiLeg") {
    const legs = card.data.legs?.length ?? 0;
    const returnLeg = card.data.returnLeg ? 1 : 0;
    return Math.min(10, legs + returnLeg + 2);
  }
  return 5;
}

/**
 * Факторы риска для карточки (короткие тексты для UI).
 */
export function getRiskFactors(card: OfferCard): string[] {
  const factors: string[] = [];
  if (card.type === "flight" && !card.data.direct) factors.push("Пересадка");
  if (card.type === "bundle" && card.flights[0] && !card.flights[0].direct) factors.push("Пересадка");
  if (card.type === "multiLeg") factors.push("Несколько участков");
  if (factors.length === 0) factors.push("Без особых рисков");
  return factors;
}

/**
 * Метки для карточек: первая — самая дешёвая, вторая — самая быстрая, третья — самая комфортная.
 */
const ROUTE_LABELS: RouteLabel[] = ["Самая дешёвая", "Самая быстрая", "Самая комфортная"];

/** Добавляет к карточкам метки (дешёвый/быстрый/комфортный), риск и факторы риска. */
export function withRouteMeta(cards: OfferCard[]): (OfferCard & { routeLabel?: RouteLabel; riskScore?: number; riskFactors?: string[] })[] {
  return cards.slice(0, 5).map((card, i) => ({
    ...card,
    routeLabel: i < 3 ? ROUTE_LABELS[i] : undefined,
    riskScore: computeRiskScore(card),
    riskFactors: getRiskFactors(card),
  }));
}

/**
 * Сортирует карточки по весам приоритета (цена, скорость, комфорт).
 * Оценки: priceRub — меньше лучше; direct/stars — как прокси скорости и комфорта.
 */
export function sortByPriority(
  cards: OfferCard[],
  weights: PriorityWeights
): OfferCard[] {
  const score = (c: OfferCard): number => {
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
  };
  return [...cards].sort((a, b) => score(b) - score(a));
}

/** Оценка цены участка маршрута (from → to) в рублях для placeholder-сегментов. */
const LEG_DISTANCES_KM: Record<string, number> = {
  "москва-санкт-петербург": 700,
  "москва-сочи": 1600,
  "москва-казань": 800,
  "москва-нижний новгород": 400,
  "москва-екатеринбург": 1800,
  "москва-новосибирск": 2800,
  "москва-владивосток": 7000,
  "новгород-оренбург": 1400,
  "оренбург-новосибирск": 2200,
  "новосибирск-владивосток": 3600,
  "москва-прага": 1700,
  "владивосток-прага": 7500,
};

function normCityForLeg(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/ё/g, "е");
}

export function estimateLegPriceRub(from: string, to: string): number {
  const a = normCityForLeg(from);
  const b = normCityForLeg(to);
  const key1 = `${a}-${b}`;
  const key2 = `${b}-${a}`;
  const distance = LEG_DISTANCES_KM[key1] ?? LEG_DISTANCES_KM[key2] ?? 1000;
  const price = Math.round(distance * 5) + 350;
  return Math.round(price / 100) * 100;
}

export { MAX_ONBOARDING_STEPS };
