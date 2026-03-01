/**
 * Провайдер ж/д билетов: РЖД (или fallback на БД Т-Путешествий).
 * Контекст преобразуется в запрос; ответ парсится. Официального публичного API нет; при RZD_API_URL вызываем его, иначе — БД.
 */
import type { ProviderQuery, ProviderResult, ProviderTrainRaw } from "./types";
import { searchTrains } from "../search";
import type { SearchParams } from "../types";

const PROVIDER_NAME = "rzd";

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

export async function fetchTrainsFromRzd(query: ProviderQuery, limit = 10): Promise<ProviderResult> {
  const errors: string[] = [];
  const trains: ProviderTrainRaw[] = [];

  const apiUrl = process.env.RZD_API_URL?.trim();

  if (apiUrl) {
    try {
      const params = new URLSearchParams({
        from: query.origin,
        to: query.destination,
        ...(query.dateFrom && { date: query.dateFrom }),
      });
      const res = await fetch(`${apiUrl}?${params}`);
      if (!res.ok) {
        errors.push(`РЖД: ${res.status}`);
      } else {
        const data = (await res.json()) as unknown;
        const parsed = parseRzdResponse(data);
        trains.push(...parsed.slice(0, limit));
      }
    } catch (e) {
      errors.push(`РЖД: ${e instanceof Error ? e.message : "fetch error"}`);
    }
  }

  if (trains.length === 0) {
    const dbParams = buildSearchParams(query);
    const list = await searchTrains(dbParams, limit);
    for (const t of list) {
      trains.push({
        id: t.id,
        origin: t.origin,
        destination: t.destination,
        departureAt: t.departureAt,
        arrivalAt: t.arrivalAt,
        carrier: t.carrier,
        priceRub: t.priceRub,
        sourceProvider: PROVIDER_NAME,
      });
    }
  }

  return { flights: [], hotels: [], trains, errors };
}

function parseRzdResponse(data: unknown): ProviderTrainRaw[] {
  if (!data || typeof data !== "object") return [];
  const arr = Array.isArray((data as { trains?: unknown }).trains)
    ? (data as { trains: unknown[] }).trains
    : Array.isArray((data as { segments?: unknown }).segments)
      ? (data as { segments: unknown[] }).segments
      : Array.isArray(data)
        ? data
        : [];
  const result: ProviderTrainRaw[] = [];
  const now = new Date().toISOString();
  for (let i = 0; i < arr.length; i++) {
    const o = arr[i] as Record<string, unknown>;
    const price = Number(o.price ?? o.priceRub ?? 0);
    const origin = String(o.origin ?? o.departureStation ?? "").trim();
    const destination = String(o.destination ?? o.arrivalStation ?? "").trim();
    if (!origin || !destination) continue;
    result.push({
      id: `rzd-${i}-${now}`,
      origin,
      destination,
      departureAt: String(o.departureAt ?? o.departure_date ?? now),
      arrivalAt: String(o.arrivalAt ?? o.arrival_date ?? now),
      carrier: String(o.carrier ?? "РЖД"),
      priceRub: Math.round(price),
      sourceProvider: PROVIDER_NAME,
    });
  }
  return result;
}
