/**
 * Провайдер отелей: Ostrovok (или fallback на БД Т-Путешествий).
 * Запрос формируется из контекста; ответ парсится. B2B API требует ключ (OSTROVOK_API_KEY). Без ключа — поиск по БД.
 */
import type { ProviderQuery, ProviderResult, ProviderHotelRaw } from "./types";
import { searchHotels } from "../search";
import type { SearchParams } from "../types";

const PROVIDER_NAME = "ostrovok";

function buildSearchParams(q: ProviderQuery): SearchParams {
  return {
    destination: q.destination,
    dateFrom: q.dateFrom,
    dateTo: q.dateTo,
    nights: q.nights,
    budgetMin: q.budgetMin,
    budgetMax: q.budgetMax,
    stars: q.stars,
  };
}

export async function fetchHotelsFromOstrovok(query: ProviderQuery, limit = 10): Promise<ProviderResult> {
  const errors: string[] = [];
  const hotels: ProviderHotelRaw[] = [];

  const apiKey = process.env.OSTROVOK_API_KEY?.trim();
  const apiUrl = process.env.OSTROVOK_API_URL?.trim() || "https://api.ostrovok.ru";

  if (apiKey && apiUrl) {
    try {
      const body = {
        city: query.destination,
        check_in: query.dateFrom,
        check_out: query.dateTo,
        guests: query.passengers ?? 1,
        ...(query.stars && { stars: query.stars }),
      };
      const res = await fetch(`${apiUrl}/v2/hotels/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        errors.push(`Ostrovok: ${res.status}`);
      } else {
        const data = (await res.json()) as unknown;
        const parsed = parseOstrovokResponse(data);
        hotels.push(...parsed.slice(0, limit));
      }
    } catch (e) {
      errors.push(`Ostrovok: ${e instanceof Error ? e.message : "fetch error"}`);
    }
  }

  if (hotels.length === 0) {
    const dbParams = buildSearchParams(query);
    const list = await searchHotels(dbParams, limit);
    for (const h of list) {
      hotels.push({
        id: h.id,
        city: h.city,
        name: h.name,
        stars: h.stars,
        pricePerNightRub: h.pricePerNightRub,
        amenities: h.amenities,
        imageUrl: h.imageUrl,
        sourceProvider: PROVIDER_NAME,
      });
    }
  }

  return { flights: [], hotels, trains: [], errors };
}

function parseOstrovokResponse(data: unknown): ProviderHotelRaw[] {
  if (!data || typeof data !== "object") return [];
  const arr = Array.isArray((data as { results?: unknown }).results)
    ? (data as { results: unknown[] }).results
    : Array.isArray((data as { hotels?: unknown }).hotels)
      ? (data as { hotels: unknown[] }).hotels
      : Array.isArray(data)
        ? data
        : [];
  const result: ProviderHotelRaw[] = [];
  const now = new Date().toISOString();
  for (let i = 0; i < arr.length; i++) {
    const o = arr[i] as Record<string, unknown>;
    const price = Number(o.price ?? o.pricePerNightRub ?? 0);
    const city = String(o.city ?? o.destination ?? "").trim();
    const name = String(o.name ?? o.title ?? "Отель").trim();
    if (!city) continue;
    result.push({
      id: `ostrovok-${i}-${now}`,
      city,
      name,
      stars: Math.min(5, Math.max(1, Number(o.stars ?? 3))),
      pricePerNightRub: Math.round(price),
      amenities: String(o.amenities ?? o.facilities ?? ""),
      imageUrl: o.imageUrl != null ? String(o.imageUrl) : undefined,
      sourceProvider: PROVIDER_NAME,
    });
  }
  return result;
}
