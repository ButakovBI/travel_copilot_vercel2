/**
 * URL картинки направления (город) для карточек маршрута.
 * Используются стабильные Unsplash-фото для типичных городов; для остальных — общий пейзаж.
 */
const CITY_IMAGES: Record<string, string> = {
  prague: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&q=80",
  praha: "https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&q=80",
  istanbul: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80",
  stambul: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80",
  стамбул: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80",
  munich: "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80",
  münchen: "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80",
  muenchen: "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80",
  мюнхен: "https://images.unsplash.com/photo-1595867818082-083862f3d630?w=800&q=80",
  moscow: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=800&q=80",
  moskva: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=800&q=80",
  москва: "https://images.unsplash.com/photo-1513326738677-b964603b136d?w=800&q=80",
  sochi: "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?w=800&q=80",
  сочи: "https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?w=800&q=80",
  "saint petersburg": "https://images.unsplash.com/photo-1555952494-efd681c7e3f9?w=800&q=80",
  "sankt petersburg": "https://images.unsplash.com/photo-1555952494-efd681c7e3f9?w=800&q=80",
  "санкт-петербург": "https://images.unsplash.com/photo-1555952494-efd681c7e3f9?w=800&q=80",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е");
}

/**
 * Возвращает URL изображения направления (город) для карточки маршрута.
 */
export function getDestinationImageUrl(cityName: string | undefined): string {
  if (!cityName || !cityName.trim()) return FALLBACK_IMAGE;
  const key = normalize(cityName);
  for (const [c, url] of Object.entries(CITY_IMAGES)) {
    if (key.includes(c) || c.includes(key)) return url;
  }
  return FALLBACK_IMAGE;
}
