/**
 * Провайдер авиабилетов: Aviasales (или fallback на БД Т-Путешествий).
 * Контекст от пользователя преобразуется в запрос к сервису; ответ парсится.
 * Реальное API: B2B Aviasales (нужен ключ). Без ключа используем поиск по БД.
 */
import type { ProviderQuery, ProviderResult, ProviderFlightRaw } from "./types";
import { searchFlights } from "../search";
import type { SearchParams } from "../types";

const PROVIDER_NAME = "aviasales";

function buildSearchParams(q: ProviderQuery): SearchParams {
  return {
    origin: q.origin,
    destination: q.destination,
    dateFrom: q.dateFrom,
    dateTo: q.dateTo,
    budgetMin: q.budgetMin,
    budgetMax: q.budgetMax,
  };
}

export async function fetchFlightsFromAviasales(query: ProviderQuery, limit = 10): Promise<ProviderResult> {
  const errors: string[] = [];
  let flights: ProviderFlightRaw[] = [];

  const apiKey = process.env.AVIASALES_API_KEY?.trim();
  const apiUrl = process.env.AVIASALES_API_URL?.trim();

  if (apiKey && apiUrl) {
    try {
      const params = new URLSearchParams({
        origin: query.origin,
        destination: query.destination,
        ...(query.dateFrom && { departure_date: query.dateFrom }),
        ...(query.passengers && { passengers: String(query.passengers) }),
      });
      const res = await fetch(`${apiUrl}/api/v1/search?${params}`, {
        headers: { Authorization: `Token ${apiKey}` },
      });
      if (res.ok) {
        const data = (await res.json()) as unknown;
        flights = parseAviasalesResponse(data);
      } else {
        errors.push(`Aviasales: ${res.status}`);
      }
    } catch (e) {
      errors.push(`Aviasales: ${e instanceof Error ? e.message : "fetch error"}`);
    }
  }

  if (flights.length === 0) {
    const dbParams = buildSearchParams(query);
    const list = await searchFlights(dbParams, limit);
    flights = list.map((f) => ({
      id: f.id,
      origin: f.origin,
      destination: f.destination,
      departureAt: f.departureAt,
      arrivalAt: f.arrivalAt,
      carrier: f.carrier,
      flightNumber: f.flightNumber,
      priceRub: f.priceRub,
      direct: f.direct,
      imageUrl: f.imageUrl,
      sourceProvider: PROVIDER_NAME,
    }));
  }

  return { flights, hotels: [], trains: [], errors };
}

function parseAviasalesResponse(data: unknown): ProviderFlightRaw[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const arr = Array.isArray(d.segments) ? d.segments : Array.isArray(d.offers) ? d.offers : [];
  const result: ProviderFlightRaw[] = [];
  const now = new Date().toISOString();
  for (let i = 0; i < arr.length; i++) {
    const o = arr[i] as Record<string, unknown>;
    const price = Number(o.price ?? o.priceRub ?? 0);
    const origin = String(o.origin ?? o.departure ?? "").trim();
    const destination = String(o.destination ?? o.arrival ?? "").trim();
    if (!origin || !destination) continue;
    result.push({
      id: `aviasales-${i}-${now}`,
      origin,
      destination,
      departureAt: String(o.departureAt ?? o.departure_date ?? now),
      arrivalAt: String(o.arrivalAt ?? o.arrival_date ?? now),
      carrier: String(o.carrier ?? "—"),
      flightNumber: String(o.flightNumber ?? o.number ?? "—"),
      priceRub: Math.round(price),
      direct: Boolean(o.direct ?? true),
      imageUrl: o.imageUrl != null ? String(o.imageUrl) : undefined,
      sourceProvider: PROVIDER_NAME,
    });
  }
  return result;
}
