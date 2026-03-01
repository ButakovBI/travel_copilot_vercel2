/**
 * Агрегация провайдеров: контекст пользователя → запросы к Aviasales, РЖД, Ostrovok → парсинг ответов → факт-чек по БД Т-Путешествий.
 */
import type { ExtractedParams } from "../copilot/params";
import type { OfferCard } from "../types";
import type { FlightOffer, HotelOffer, TrainOffer } from "../types";
import type { ProviderQuery, ProviderResult, FactCheckResult } from "./types";
import { fetchFlightsFromAviasales } from "./aviasales";
import { fetchFlightsFromDuffel } from "./duffel";
import { fetchTrainsFromRzd } from "./rzd";
import { fetchHotelsFromOstrovok } from "./ostrovok";
import { searchFlights, searchTrains, searchHotels } from "../search";
import type { SearchParams } from "../types";

const NOW_ISO = new Date().toISOString();

function toProviderQuery(p: ExtractedParams): ProviderQuery {
  const origin = p.origin ?? "Москва";
  const destination = p.destination ?? p.cities?.[0] ?? "";
  return {
    origin,
    destination,
    dateFrom: p.dateFrom,
    dateTo: p.dateTo,
    passengers: p.guests ?? 1,
    nights: p.nights ?? 1,
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax && p.budgetMax < 9999999 ? p.budgetMax : undefined,
    stars: p.stars,
  };
}

/** Преобразовать сырые ответы провайдеров в OfferCard[] (с source и checkedAt для единообразия). */
function toOfferCards(result: ProviderResult): OfferCard[] {
  const cards: OfferCard[] = [];
  for (const f of result.flights) {
    const { sourceProvider: _, ...rest } = f;
    const data: FlightOffer = { ...rest, source: "search", checkedAt: NOW_ISO };
    cards.push({ type: "flight", data });
  }
  for (const t of result.trains) {
    const { sourceProvider: __, ...rest } = t;
    const data: TrainOffer = { ...rest, source: "search", checkedAt: NOW_ISO };
    cards.push({ type: "train", data });
  }
  for (const h of result.hotels) {
    const { sourceProvider: ___, ...rest } = h;
    const data: HotelOffer = { ...rest, source: "search", checkedAt: NOW_ISO };
    cards.push({ type: "hotel", data });
  }
  return cards;
}

/** Факт-чек: сравнить предложения провайдеров с данными в БД Т-Путешествий (те же маршруты/даты). */
export async function factCheckAgainstDb(
  query: ProviderQuery,
  providerCards: OfferCard[]
): Promise<FactCheckResult> {
  const flightMatches: FactCheckResult["flightMatches"] = [];
  const hotelMatches: FactCheckResult["hotelMatches"] = [];
  const trainMatches: FactCheckResult["trainMatches"] = [];

  const searchParams: SearchParams = {
    origin: query.origin,
    destination: query.destination,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    budgetMin: query.budgetMin,
    budgetMax: query.budgetMax,
    stars: query.stars,
    nights: query.nights,
  };

  const [dbFlights, dbHotels, dbTrains] = await Promise.all([
    searchFlights(searchParams, 20),
    searchHotels(searchParams, 20),
    searchTrains(searchParams, 20),
  ]);

  for (const c of providerCards) {
    if (c.type === "flight") {
      const match = dbFlights.find(
        (db) =>
          db.origin === c.data.origin &&
          db.destination === c.data.destination &&
          db.departureAt === c.data.departureAt
      );
      flightMatches.push({ providerId: c.data.id, dbPriceRub: match?.priceRub });
    } else if (c.type === "train") {
      const match = dbTrains.find(
        (db) =>
          db.origin === c.data.origin &&
          db.destination === c.data.destination &&
          db.departureAt === c.data.departureAt
      );
      trainMatches.push({ providerId: c.data.id, dbPriceRub: match?.priceRub });
    } else if (c.type === "hotel") {
      const match = dbHotels.find(
        (db) => db.city === c.data.city && db.name === c.data.name
      );
      hotelMatches.push({ providerId: c.data.id, dbPriceRub: match?.pricePerNightRub });
    }
  }

  return { flightMatches, hotelMatches, trainMatches };
}

/**
 * Запуск всех провайдеров по контексту пользователя, парсинг ответов, факт-чек по БД Т-Путешествий.
 * Возвращает объединённые карточки и результат факт-чека (для текста бота).
 */
export async function runProvidersAndFactCheck(params: ExtractedParams): Promise<{
  offerCards: OfferCard[];
  factCheck: FactCheckResult;
  providerErrors: string[];
}> {
  const query = toProviderQuery(params);
  const transport = params.transport ?? "any";
  const limit = 8;

  const results: ProviderResult[] = [];
  const allErrors: string[] = [];

  if (transport === "flight" || transport === "any") {
    const duffelKey = process.env.DUFFEL_API_KEY?.trim();
    if (duffelKey) {
      const duffelResult = await fetchFlightsFromDuffel(query, limit);
      results.push(duffelResult);
      allErrors.push(...duffelResult.errors);
    }
    if (!duffelKey) {
      const aviasalesResult = await fetchFlightsFromAviasales(query, limit);
      results.push(aviasalesResult);
      allErrors.push(...aviasalesResult.errors);
    }
  }
  if (transport === "train" || transport === "any") {
    const r = await fetchTrainsFromRzd(query, limit);
    results.push(r);
    allErrors.push(...r.errors);
  }
  if (query.destination) {
    const r = await fetchHotelsFromOstrovok(query, limit);
    results.push(r);
    allErrors.push(...r.errors);
  }

  const merged: ProviderResult = {
    flights: results.flatMap((x) => x.flights),
    hotels: results.flatMap((x) => x.hotels),
    trains: results.flatMap((x) => x.trains),
    errors: allErrors,
  };

  const offerCards = toOfferCards(merged);
  const factCheck = await factCheckAgainstDb(query, offerCards);

  return {
    offerCards,
    factCheck,
    providerErrors: allErrors,
  };
}
