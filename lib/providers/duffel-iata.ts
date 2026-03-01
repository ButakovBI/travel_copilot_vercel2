/**
 * Маппинг названий городов (рус/англ) в IATA-коды аэропортов для Duffel API.
 * Duffel принимает в slice origin/destination именно IATA (например LHR, SVO).
 */
const CITY_TO_IATA: Record<string, string> = {
  москва: "SVO",
  moscow: "SVO",
  мск: "SVO",
  сочи: "AER",
  sochi: "AER",
  казань: "KZN",
  kazan: "KZN",
  "санкт-петербург": "LED",
  "saint petersburg": "LED",
  спб: "LED",
  петербург: "LED",
  екатеринбург: "SVX",
  ekb: "SVX",
  yekaterinburg: "SVX",
  новосибирск: "OVB",
  novosibirsk: "OVB",
  краснодар: "KRR",
  krasnodar: "KRR",
  владивосток: "VVO",
  vladivostok: "VVO",
  новгород: "GOJ",
  "нижний новгород": "GOJ",
  "великий новгород": "LED",
  "nizhny novgorod": "GOJ",
  оренбург: "REN",
  orenburg: "REN",
  калининград: "KGD",
  kaliningrad: "KGD",
  минск: "MSQ",
  minsk: "MSQ",
  баку: "GYD",
  baku: "GYD",
  стамбул: "IST",
  istanbul: "IST",
  прага: "PRG",
  prague: "PRG",
  варна: "VAR",
  varna: "VAR",
  подгорица: "TGD",
  podgorica: "TGD",
  пекин: "PEK",
  beijing: "PEK",
  бангкок: "BKK",
  bangkok: "BKK",
  тайланд: "BKK",
  thailand: "BKK",
};

/**
 * Возвращает IATA-код аэропорта по названию города (или сам строку, если уже похожа на код).
 */
export function cityToIata(cityOrCode: string): string | null {
  if (!cityOrCode || typeof cityOrCode !== "string") return null;
  const normalized = cityOrCode.trim().toLowerCase();
  if (normalized.length === 3 && /^[a-z]{3}$/.test(normalized)) return normalized.toUpperCase();
  return CITY_TO_IATA[normalized] ?? null;
}

/**
 * Пытается подобрать IATA для запроса: если не нашли — возвращаем первый известный код (SVO) как fallback только для отладки; в проде лучше не слать запрос.
 */
export function resolveOriginIata(origin: string): string | null {
  return cityToIata(origin) ?? null;
}

export function resolveDestinationIata(destination: string): string | null {
  return cityToIata(destination) ?? null;
}
