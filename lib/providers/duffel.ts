/**
 * Провайдер авиабилетов: Duffel (api.duffel.com).
 * Запрос по маршруту и дате; ответ парсится в ProviderFlightRaw.
 * Требуется DUFFEL_API_KEY в .env (ключ не коммитить).
 */
import type { ProviderQuery, ProviderResult, ProviderFlightRaw } from "./types";
import { resolveOriginIata, resolveDestinationIata } from "./duffel-iata";

const PROVIDER_NAME = "duffel";
const DUFFEL_API = "https://api.duffel.com/air/offer_requests";

/** Дата вылета: из запроса или через 7 дней (Duffel лучше ищет по будущим датам). */
function getDepartureDate(query: ProviderQuery): string {
  const from = query.dateFrom ?? query.dateTo;
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) return from;
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** Курсы валют в RUB (можно переопределить через .env). */
function getRate(currency: string): number {
  const upper = currency.toUpperCase();
  const envKey = `DUFFEL_${upper}_TO_RUB`;
  const env = process.env[envKey];
  if (env != null && env !== "") {
    const n = Number(env);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const defaults: Record<string, number> = {
    GBP: 120,
    USD: 100,
    EUR: 105,
    RUB: 1,
  };
  return defaults[upper] ?? 100;
}

function amountToRub(amount: string | number, currency: string): number {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * getRate(currency));
}

/** Минимальные типы ответа Duffel (offer_requests). */
type DuffelSegment = {
  origin?: { iata_code?: string; city_name?: string };
  destination?: { iata_code?: string; city_name?: string };
  operating_carrier?: { name?: string };
  operating_carrier_flight_number?: string;
  departing_at?: string;
  arriving_at?: string;
};

type DuffelSlice = { segments?: DuffelSegment[] };
type DuffelOffer = {
  id: string;
  total_amount?: string;
  total_currency?: string;
  total_currency_symbol?: string;
  slices?: DuffelSlice[];
};

type DuffelResponse = {
  data?: { offers?: DuffelOffer[] };
};

/** Примерные расстояния между городами (км) для оценки цены при total_amount = 0. */
const ROUTE_DISTANCES_KM: Record<string, number> = {
  "moscow-saint petersburg": 700,
  "moscow-vladivostok": 7000,
  "moscow-sochi": 1600,
  "moscow-kazan": 800,
  "moscow-nizhny novgorod": 400,
  "moscow-ekaterinburg": 1800,
  "moscow-novosibirsk": 2800,
  "saint petersburg-sochi": 2100,
  "saint petersburg-ekaterinburg": 2200,
  "sochi-moscow": 1600,
  "vladivostok-moscow": 7000,
};

function normCity(s: string | undefined): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Оценка цены маршрута из Duffel:
 * - Если total_amount > 0 — возвращаем её и валюту.
 * - Если total_amount = 0 — считаем по сегментам: базовая цена по расстоянию + пересадки, округление до сотен.
 */
function estimatePrice(offer: DuffelOffer): { price: number; currency: string } {
  const totalAmount = parseFloat(offer.total_amount ?? "0");
  const currency = (offer.total_currency ?? "EUR").toUpperCase();

  if (totalAmount > 0) {
    return { price: Math.round(totalAmount), currency };
  }

  const slices = offer.slices ?? [];
  if (!slices.length) return { price: 350, currency };

  const segments = slices[0].segments ?? [];
  const stops = Math.max(0, segments.length - 1);
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const origin = normCity(firstSeg?.origin?.city_name ?? firstSeg?.origin?.iata_code ?? "");
  const dest = normCity(lastSeg?.destination?.city_name ?? lastSeg?.destination?.iata_code ?? "");

  const key1 = `${origin}-${dest}`;
  const key2 = `${dest}-${origin}`;
  const distance = ROUTE_DISTANCES_KM[key1] ?? ROUTE_DISTANCES_KM[key2] ?? 1000;

  let price = 350 + stops * 120;
  if (distance > 1000) price = Math.round(distance * 0.05) + stops * 120;
  price = Math.round(price / 100) * 100;

  return { price, currency };
}

function parseDuffelOffers(data: DuffelResponse, limit: number): ProviderFlightRaw[] {
  const offers = data?.data?.offers ?? [];
  const result: ProviderFlightRaw[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < Math.min(offers.length, limit); i++) {
    const o = offers[i];
    const slices = o.slices ?? [];
    const firstSlice = slices[0];
    const segments = firstSlice?.segments ?? [];
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1];

    const origin = firstSeg?.origin?.city_name ?? firstSeg?.origin?.iata_code ?? "—";
    const destination = lastSeg?.destination?.city_name ?? lastSeg?.destination?.iata_code ?? "—";
    const carrier = firstSeg?.operating_carrier?.name ?? "—";
    const flightNumber = firstSeg?.operating_carrier_flight_number ?? "—";
    const departureAt = firstSeg?.departing_at ?? now;
    const arrivalAt = lastSeg?.arriving_at ?? now;
    const direct = segments.length <= 1;

    const { price, currency } = estimatePrice(o);
    const priceRub = amountToRub(price, currency);

    result.push({
      id: o.id,
      origin,
      destination,
      departureAt,
      arrivalAt,
      carrier,
      flightNumber,
      priceRub,
      direct,
      imageUrl: undefined,
      sourceProvider: PROVIDER_NAME,
    });
  }
  return result;
}

export async function fetchFlightsFromDuffel(query: ProviderQuery, limit = 10): Promise<ProviderResult> {
  const errors: string[] = [];
  const flights: ProviderFlightRaw[] = [];

  const apiKey = process.env.DUFFEL_API_KEY?.trim();
  if (!apiKey) {
    return { flights: [], hotels: [], trains: [], errors };
  }

  const originIata = resolveOriginIata(query.origin);
  const destIata = resolveDestinationIata(query.destination);
  if (!originIata || !destIata) {
    errors.push(`Duffel: неизвестный маршрут (origin/destination → IATA): ${query.origin} → ${query.destination}`);
    return { flights, hotels: [], trains: [], errors };
  }

  const departureDate = getDepartureDate(query);
  const passengers = Math.max(1, query.passengers ?? 1);

  const body = {
    data: {
      slices: [{ origin: originIata, destination: destIata, departure_date: departureDate }],
      passengers: Array.from({ length: passengers }, () => ({ type: "adult" as const })),
      cabin_class: "economy" as const,
      max_connections: 2,
    },
  };

  try {
    const url = `${DUFFEL_API}?return_offers=true`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      errors.push(`Duffel: ${res.status} ${text.slice(0, 200)}`);
      return { flights, hotels: [], trains: [], errors };
    }

    const data = (await res.json()) as DuffelResponse;
    const parsed = parseDuffelOffers(data, limit);
    flights.push(...parsed);
  } catch (e) {
    errors.push(`Duffel: ${e instanceof Error ? e.message : "fetch error"}`);
  }

  return { flights, hotels: [], trains: [], errors };
}
