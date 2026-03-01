import { searchFlights, searchHotels, searchTrains } from "../search";
import type { SearchParams } from "../types";
import type { ExtractedParams } from "./params";
import { getLegsFromWaypoints } from "./params";
import type { OfferCard } from "../types";
import type { FlightOffer, TrainOffer, HotelOffer } from "../types";
import type { MultiLegSegment, MultiLegData } from "../types";
import type { UserContext } from "../types";
import { runProvidersAndFactCheck } from "../providers";
import type { FactCheckResult } from "../providers/types";
import { estimateLegPriceRub } from "./scenarios";

const MAX_PER_TYPE = 5;

function toSearchParams(p: ExtractedParams): SearchParams {
  const origin = p.origin ?? "Москва";
  const destination = p.destination ?? p.cities?.[0];
  return {
    origin,
    destination,
    cities: p.cities,
    dateFrom: p.dateFrom,
    dateTo: p.dateTo,
    nights: p.nights,
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax,
    stars: p.stars,
    transport: p.transport === "bus" || p.transport === "car" ? "any" : (p.transport ?? "any"),
  };
}

export async function runSearch(params: ExtractedParams): Promise<OfferCard[]> {
  const searchParams = toSearchParams(params);
  const origin = searchParams.origin ?? "Москва";
  const destination = searchParams.destination ?? searchParams.cities?.[0];
  const transport = searchParams.transport ?? "any";
  const limit = MAX_PER_TYPE;

  const cards: OfferCard[] = [];

  if (transport === "flight" || transport === "any") {
    const list = await searchFlights(
      { ...searchParams, origin, destination, directOnly: false },
      limit
    );
    cards.push(...list.map((f) => ({ type: "flight" as const, data: f })));
  }
  if (transport === "train" || transport === "any") {
    const list = await searchTrains({ ...searchParams, origin, destination }, limit);
    cards.push(...list.map((t) => ({ type: "train" as const, data: t })));
  }

  if (destination) {
    const list = await searchHotels(
      {
        ...searchParams,
        destination,
        cities: params.cities ?? [destination],
      },
      limit
    );
    cards.push(...list.map((h) => ({ type: "hotel" as const, data: h })));
  }

  return cards;
}

/** Поиск через провайдеров (Aviasales, РЖД, Ostrovok) с парсингом ответов и факт-чеком по БД Т-Путешествий. */
export async function runSearchViaProvidersWithFallback(params: ExtractedParams): Promise<{
  offers: OfferCard[];
  relaxed: boolean;
  factCheck: FactCheckResult;
  providerErrors: string[];
}> {
  const { offerCards, factCheck, providerErrors } = await runProvidersAndFactCheck(params);
  if (offerCards.length > 0) {
    return { offers: offerCards, relaxed: false, factCheck, providerErrors };
  }
  const relaxedParams: ExtractedParams = {
    ...params,
    transport: "any",
    budgetMin: params.budgetMin ?? 0,
    budgetMax: params.budgetMax && params.budgetMax < 9999999 ? Math.max(params.budgetMax * 2, 200000) : undefined,
    stars: undefined,
  };
  const { offerCards: fallbackCards } = await runProvidersAndFactCheck(relaxedParams);
  return { offers: fallbackCards, relaxed: fallbackCards.length > 0, factCheck, providerErrors };
}

/** Run search with strict params; if empty, relax and retry (legacy path, использует провайдеров внутри). */
export async function runSearchWithFallback(
  params: ExtractedParams
): Promise<{ offers: OfferCard[]; relaxed: boolean }> {
  const { offers, relaxed } = await runSearchViaProvidersWithFallback(params);
  return { offers, relaxed };
}

/** Длительность перелёта в минутах для сортировки «самый быстрый». */
function flightDurationMin(f: FlightOffer): number {
  try {
    const dep = new Date(f.departureAt).getTime();
    const arr = new Date(f.arrivalAt).getTime();
    if (Number.isNaN(dep) || Number.isNaN(arr)) return 999999;
    return Math.max(0, Math.round((arr - dep) / 60000));
  } catch {
    return 999999;
  }
}

/** Выбрать один лучший вариант перелёта/поезда по предпочтению. */
function pickBestTransportForLeg(
  cards: OfferCard[],
  transport: "flight" | "train" | "bus" | "car" | "any"
): FlightOffer | TrainOffer | null {
  const wantFlight = transport === "flight" || transport === "any";
  const wantTrain = transport === "train" || transport === "any";
  const flight = cards.find((c): c is { type: "flight"; data: FlightOffer } => c.type === "flight");
  const train = cards.find((c): c is { type: "train"; data: TrainOffer } => c.type === "train");
  if (wantFlight && flight) return flight.data;
  if (wantTrain && train) return train.data;
  if (flight) return flight.data;
  if (train) return train.data;
  return null;
}

/** Все рейсы из карточек (для выбора нескольких вариантов по участку). */
function getFlightsFromCards(cards: OfferCard[]): FlightOffer[] {
  return cards
    .filter((c): c is { type: "flight"; data: FlightOffer } => c.type === "flight")
    .map((c) => c.data);
}

/** Плейсхолдер рейса для участка без данных. */
function placeholderFlight(leg: { from: string; to: string }, params: ExtractedParams): FlightOffer {
  return {
    id: `placeholder-${leg.from}-${leg.to}`,
    origin: leg.from,
    destination: leg.to,
    departureAt: params.dateFrom ?? "",
    arrivalAt: params.dateTo ?? "",
    carrier: "—",
    flightNumber: "—",
    priceRub: estimateLegPriceRub(leg.from, leg.to),
    direct: false,
    source: "search",
    checkedAt: new Date().toISOString(),
  } as FlightOffer;
}

/**
 * Поиск по мультимаршруту: строит 3 варианта (самый дешёвый, самый быстрый, самый комфортный).
 * Для каждого участка берутся несколько вариантов перелёта и отелей, затем комбинируются в 3 полных маршрута.
 */
export async function runMultiLegSearch(params: ExtractedParams): Promise<{
  offerCards: OfferCard[];
  summaryText: string;
}> {
  const legs = getLegsFromWaypoints(params);
  if (legs.length === 0) return { offerCards: [], summaryText: "Не удалось построить маршрут." };

  const isReturnTrip = params.returnTrip === true;
  const transport = params.transport ?? "any";
  const noOfferLegs: string[] = [];

  type LegChoice = { from: string; to: string; offer: FlightOffer | TrainOffer };
  const legsCheap: LegChoice[] = [];
  const legsFast: LegChoice[] = [];
  const legsComfort: LegChoice[] = [];

  for (const leg of legs) {
    const legParams: ExtractedParams = {
      ...params,
      origin: leg.from,
      destination: leg.to,
    };
    const { offerCards } = await runProvidersAndFactCheck(legParams);
    const flights = getFlightsFromCards(offerCards);
    const placeholder = placeholderFlight(leg, params);

    if (flights.length === 0) {
      const fallback = pickBestTransportForLeg(offerCards, transport);
      const offer = (fallback ?? placeholder) as FlightOffer;
      noOfferLegs.push(`${leg.from} → ${leg.to}`);
      legsCheap.push({ from: leg.from, to: leg.to, offer });
      legsFast.push({ from: leg.from, to: leg.to, offer });
      legsComfort.push({ from: leg.from, to: leg.to, offer });
      continue;
    }

    const byPrice = [...flights].sort((a, b) => a.priceRub - b.priceRub);
    const byFast = [...flights].sort(
      (a, b) => (b.direct ? 1 : 0) - (a.direct ? 1 : 0) || flightDurationMin(a) - flightDurationMin(b)
    );
    const byComfort = [...flights].sort((a, b) => (b.direct ? 1 : 0) - (a.direct ? 1 : 0) || a.priceRub - b.priceRub);

    legsCheap.push({ from: leg.from, to: leg.to, offer: byPrice[0] });
    legsFast.push({ from: leg.from, to: leg.to, offer: byFast[0] });
    legsComfort.push({ from: leg.from, to: leg.to, offer: byComfort[0] });
  }

  const returnLegIndex = isReturnTrip && legs.length > 1 ? legs.length - 1 : -1;
  const outboundLegs = returnLegIndex >= 0 ? legs.slice(0, -1) : legs;
  const stopCities = params.waypoints?.slice(1) ?? [];

  const HOTELS_PER_CITY = 3;
  const hotelsByCityAll: { city: string; offers: HotelOffer[] }[] = [];
  for (const city of stopCities) {
    const list = await searchHotels(
      {
        destination: city,
        cities: [city],
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        nights: 1,
        budgetMin: params.budgetMin,
        budgetMax: params.budgetMax,
        stars: params.stars,
      },
      HOTELS_PER_CITY
    );
    const byPrice = [...list].sort((a, b) => a.pricePerNightRub - b.pricePerNightRub);
    const byStars = [...list].sort((a, b) => b.stars - a.stars || a.pricePerNightRub - b.pricePerNightRub);
    hotelsByCityAll.push({
      city,
      offers: list,
    });
  }

  function buildSegments(legChoices: LegChoice[]): { legs: MultiLegSegment[]; returnLeg?: MultiLegSegment } {
    const segments: MultiLegSegment[] = legChoices.map((s) => ({
      from: s.from,
      to: s.to,
      offer: s.offer,
    }));
    if (isReturnTrip && segments.length > 1) {
      const returnSeg = segments.pop()!;
      return { legs: segments, returnLeg: returnSeg };
    }
    return { legs: segments };
  }

  function buildHotels(
    variant: "cheap" | "fast" | "comfort"
  ): { city: string; offer: HotelOffer }[] {
    const result: { city: string; offer: HotelOffer }[] = [];
    for (const { city, offers } of hotelsByCityAll) {
      if (offers.length === 0) continue;
      const byPrice = [...offers].sort((a, b) => a.pricePerNightRub - b.pricePerNightRub);
      const byStars = [...offers].sort((a, b) => b.stars - a.stars || a.pricePerNightRub - b.pricePerNightRub);
      const offer =
        variant === "cheap"
          ? byPrice[0]
          : variant === "comfort"
            ? byStars[0]
            : byPrice[Math.min(1, byPrice.length - 1)] ?? byPrice[0];
      result.push({ city, offer });
    }
    return result;
  }

  const { legs: legsForCard1, returnLeg: returnLeg1 } = buildSegments(legsCheap);
  const { legs: legsForCard2, returnLeg: returnLeg2 } = buildSegments(legsFast);
  const { legs: legsForCard3, returnLeg: returnLeg3 } = buildSegments(legsComfort);

  const hotels1 = buildHotels("cheap");
  const hotels2 = buildHotels("fast");
  const hotels3 = buildHotels("comfort");

  function total(legs: MultiLegSegment[], returnL?: MultiLegSegment, hotels?: { city: string; offer: HotelOffer }[]) {
    const t = legs.reduce((s, l) => s + l.offer.priceRub, 0) + (returnL ? returnL.offer.priceRub : 0);
    const h = (hotels ?? []).reduce((s, x) => s + x.offer.pricePerNightRub, 0);
    return t + h;
  }

  const card1: OfferCard = {
    type: "multiLeg",
    data: { legs: legsForCard1, returnLeg: returnLeg1, hotels: hotels1.length > 0 ? hotels1 : undefined },
  };
  const card2: OfferCard = {
    type: "multiLeg",
    data: { legs: legsForCard2, returnLeg: returnLeg2, hotels: hotels2.length > 0 ? hotels2 : undefined },
  };
  const card3: OfferCard = {
    type: "multiLeg",
    data: { legs: legsForCard3, returnLeg: returnLeg3, hotels: hotels3.length > 0 ? hotels3 : undefined },
  };

  const routeDesc = legsForCard1.map((l) => `${l.from} → ${l.to}`).join(", ");
  const total1 = total(legsForCard1, returnLeg1, hotels1);
  const total2 = total(legsForCard2, returnLeg2, hotels2);
  const total3 = total(legsForCard3, returnLeg3, hotels3);

  const visaNote = getVisaNoteForWaypoints(params.waypoints ?? []);

  let summaryText =
    `Подобрал 3 варианта маршрута. ` +
    (legsForCard1.length > 1 ? `Маршрут: ${routeDesc}. ` : "") +
    (returnLeg1 ? `Обратно: ${returnLeg1.from} → ${returnLeg1.to}. ` : "") +
    `Варианты от ${Math.min(total1, total2, total3).toLocaleString("ru-RU")} до ${Math.max(total1, total2, total3).toLocaleString("ru-RU")} ₽. ` +
    (visaNote ? `${visaNote} ` : "") +
    "Данные о перелётах получены от Duffel. Условия и наличие уточняйте при бронировании.";
  if (noOfferLegs.length > 0) {
    summaryText += ` По участкам ${noOfferLegs.join("; ")} использованы ориентировочные цены — уточняйте даты и наличие.`;
  }

  return {
    offerCards: [card1, card2, card3],
    summaryText,
  };
}

function getVisaNoteForWaypoints(waypoints: string[]): string {
  const lower = waypoints.map((w) => w.toLowerCase());
  const hasTurkey = lower.some((w) => w.includes("стамбул") || w.includes("турц"));
  const hasSchengen = lower.some((w) =>
    ["прага", "чехия", "мюнхен", "германия", "париж", "франция", "италия", "испания"].some((c) => w.includes(c))
  );
  if (hasSchengen && hasTurkey) {
    return "Для поездки могут потребоваться визы: Шенген (Чехия, Германия и др.) и виза/безвиз в Турцию — уточняйте актуальные правила.";
  }
  if (hasSchengen) return "Для посещения стран Шенгена может потребоваться виза. Уточняйте актуальные правила.";
  if (hasTurkey) return "Для поездки в Турцию уточняйте актуальные визовые правила.";
  return "";
}

const RANK_SYSTEM = `Ты — помощник Т-Путешествий. Тебе дан список вариантов поездки (рейсы, отели, поезда). Выбери до 5 лучших с учётом маршрута, бюджета и профиля трат пользователя. Ответь ТОЛЬКО валидным JSON без markdown: { "indices": [i1, i2, i3, i4?, i5?], "summary": "краткое пояснение" }. Цены не выдумывай — они в данных.`;

function getPersonalizationNote(userContext: UserContext, params: ExtractedParams): string {
  const avg = userContext.avgMonthlySpendRub;
  const luxury = userContext.luxurySpendPct;
  const budgetUnlimited = params.budgetMax == null || params.budgetMax >= 9999999;
  const parts: string[] = [];

  if (avg != null || luxury != null) {
    let s = "Профиль трат: ";
    if (avg != null) s += `~${Math.round(avg / 1000)}k ₽/мес`;
    if (luxury != null) s += `, доля люкс ${Math.round((luxury ?? 0) * 100)}%`;
    s += ". ";
    if (avg != null && avg >= 30000 && avg <= 50000) s += "При 30–50k тратах — предпочитай отели 3★ и эконом-транспорт по умолчанию. ";
    if (avg != null && avg > 80000 && (luxury ?? 0) > 0.2) s += "При высоких тратах и доле люкс — предпочитай 4–5★ и комфорт. ";
    parts.push(s);
  }
  if (budgetUnlimited) parts.push("Бюджет не ограничен — можно предлагать лучшие варианты (4–5★, при длинном маршруте — самолёт в приоритете). ");
  return parts.join("").trim();
}

function getRouteNote(params: ExtractedParams): string {
  const origin = (params.origin ?? "").toLowerCase();
  const dest = (params.destination ?? "").toLowerCase();
  const longDistancePairs = [
    ["екатеринбург", "москва"], ["екб", "мск"], ["москва", "екатеринбург"], ["мск", "екб"],
    ["новосибирск", "москва"], ["владивосток", "москва"], ["сочи", "москва"], ["калининград", "москва"],
  ];
  const isLong = longDistancePairs.some(([a, b]) => (origin.includes(a) && dest.includes(b)) || (origin.includes(b) && dest.includes(a)));
  if (!isLong) return "";
  return "Маршрут длинный (дальняя дорога). При неограниченном бюджете в первую очередь предлагай самолёт и отели 4–5★. ";
}

export function buildRankPrompt(
  offers: OfferCard[],
  params: ExtractedParams,
  userContext: UserContext,
  lastUserMessage?: string
): string {
  const regionNote = userContext.region ? `Регион: ${userContext.region}.` : "Пользователь из России.";
  const personalization = getPersonalizationNote(userContext, params);
  const routeNote = getRouteNote(params);
  const explicitNote =
    lastUserMessage && lastUserMessage.trim().length > 0
      ? `ВАЖНО: Явные пожелания в последнем сообщении пользователя имеют приоритет над профилем. Последнее сообщение: «${lastUserMessage.trim().slice(0, 300)}». Например, если просит «самый бюджетный» или «дешёвый» — выбирай самые дешёвые варианты; если «только 5 звёзд» или «люкс» — предпочитай премиум. `
      : "";
  const parts = offers.slice(0, 15).map((c, i) => {
    if (c.type === "flight")
      return `[${i}] Рейс: ${c.data.origin} → ${c.data.destination}, ${c.data.carrier}, ${c.data.priceRub} ₽`;
    if (c.type === "hotel")
      return `[${i}] Отель: ${c.data.city}, ${c.data.name}, ${c.data.stars}★, ${c.data.pricePerNightRub} ₽/ночь`;
    if (c.type === "train")
      return `[${i}] Поезд: ${c.data.origin} → ${c.data.destination}, ${c.data.carrier}, ${c.data.priceRub} ₽`;
    return "";
  });
  return `${regionNote}
${explicitNote}
${personalization ? personalization + "\n" : ""}
${routeNote ? routeNote + "\n" : ""}
Параметры запроса: ${JSON.stringify(params)}

Варианты:
${parts.filter(Boolean).join("\n")}

Выбери до 3 лучших вариантов. Верни JSON: { "indices": [до 3 индексов], "summary": "краткое пояснение" }.`;
}

export function parseRankResponse(response: string): { indices: number[]; summary: string } {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { indices: [0, 1, 2], summary: "Подобраны варианты по вашим критериям." };
  try {
    const obj = JSON.parse(jsonMatch[0]) as { indices?: number[]; summary?: string };
    const indices = Array.isArray(obj.indices) ? obj.indices.slice(0, 3) : [0, 1, 2];
    const summary = typeof obj.summary === "string" ? obj.summary : "Подобраны варианты по вашим критериям.";
    return { indices, summary };
  } catch {
    return { indices: [0, 1, 2], summary: "Подобраны варианты по вашим критериям." };
  }
}

export function pickTop3(offers: OfferCard[], indices: number[]): OfferCard[] {
  return pickTopN(offers, indices, 3);
}

/** Выбрать до N лучших вариантов по индексам от LLM или по порядку. */
export function pickTopN(offers: OfferCard[], indices: number[], n: number): OfferCard[] {
  const result: OfferCard[] = [];
  for (const i of indices) {
    if (i >= 0 && i < offers.length && result.length < n) result.push(offers[i]);
  }
  if (result.length < n) {
    for (let j = 0; j < offers.length && result.length < n; j++) {
      if (!result.includes(offers[j])) result.push(offers[j]);
    }
  }
  return result.slice(0, n);
}

const NIGHTS_DEFAULT = 1;

/** Длительность перелёта в минутах (по departureAt/arrivalAt). При ошибке парсинга — большое число. */
function flightDurationMinutes(f: FlightOffer): number {
  try {
    const dep = new Date(f.departureAt).getTime();
    const arr = new Date(f.arrivalAt).getTime();
    if (Number.isNaN(dep) || Number.isNaN(arr)) return 999999;
    return Math.max(0, Math.round((arr - dep) / 60000));
  } catch {
    return 999999;
  }
}

/**
 * Строит 3 бандла: самая дешёвая (по сумме из данных), самая быстрая (самолёт, время в пути), самая комфортная (самолёт, отели по звёздам).
 */
export function buildBundlesFromOffers(offers: OfferCard[], nights: number = NIGHTS_DEFAULT): OfferCard[] {
  const flights = offers
    .filter((c): c is { type: "flight"; data: FlightOffer } => c.type === "flight")
    .map((c) => c.data);
  const hotels = offers
    .filter((c): c is { type: "hotel"; data: HotelOffer } => c.type === "hotel")
    .map((c) => c.data);

  if (flights.length === 0 || hotels.length === 0) return [];

  const total = (f: FlightOffer, h: HotelOffer) => f.priceRub + h.pricePerNightRub * nights;

  const byPriceFlights = [...flights].sort((a, b) => a.priceRub - b.priceRub);
  const byPriceHotels = [...hotels].sort((a, b) => a.pricePerNightRub - b.pricePerNightRub);
  const bySpeedFlights = [...flights].sort((a, b) => {
    const directA = a.direct ? 1 : 0;
    const directB = b.direct ? 1 : 0;
    if (directB !== directA) return directB - directA;
    return flightDurationMinutes(a) - flightDurationMinutes(b);
  });
  const byComfortHotels = [...hotels].sort((a, b) => b.stars - a.stars || a.pricePerNightRub - b.pricePerNightRub);
  const byComfortFlights = [...flights].sort((a, b) => (b.direct ? 1 : 0) - (a.direct ? 1 : 0) || a.priceRub - b.priceRub);

  const fCheap = byPriceFlights[0];
  const hCheap = byPriceHotels[0];
  const fFast = bySpeedFlights[0];
  const fComfort = byComfortFlights[0];
  const hComfort = byComfortHotels[0];

  const bundles: OfferCard[] = [
    { type: "bundle", flights: [fCheap], hotels: [hCheap], totalRub: total(fCheap, hCheap) },
    { type: "bundle", flights: [fFast], hotels: [hCheap], totalRub: total(fFast, hCheap) },
    { type: "bundle", flights: [fComfort], hotels: [hComfort], totalRub: total(fComfort, hComfort) },
  ];
  return bundles;
}
