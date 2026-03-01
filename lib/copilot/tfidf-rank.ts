/**
 * Ранжирование карточек предложений (рейсы, отели, поезда) по релевантности запросу пользователя.
 * Модель TF-IDF + косинусное сходство: каждая карточка — документ с текстовым описанием,
 * запрос пользователя — запрос; сортировка по similarity(query, document).
 */
import type { OfferCard } from "../types";

const STOPWORDS = new Set(
  "и в на с по из к для от до при без через у о об во как что это тот так уже или же ли бы ни не а но за то же".split(/\s+/)
);

/** Нормализация и токенизация текста (рус + латиница). */
function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Текстовое описание одной карточки — для индексации по городам, транспорту, отелям, бюджету. */
function cardToDescription(card: OfferCard): string {
  const parts: string[] = [];
  if (card.type === "flight") {
    parts.push(
      "рейс перелет самолет",
      card.data.origin,
      card.data.destination,
      card.data.carrier,
      String(card.data.priceRub),
      card.data.direct ? "прямой" : "с пересадкой"
    );
  } else if (card.type === "hotel") {
    parts.push(
      "отель гостиница ночь",
      card.data.city,
      card.data.name,
      String(card.data.stars),
      "звезд",
      String(card.data.pricePerNightRub),
      card.data.amenities || ""
    );
  } else if (card.type === "train") {
    parts.push(
      "поезд поездка жд",
      card.data.origin,
      card.data.destination,
      card.data.carrier,
      String(card.data.priceRub)
    );
  } else if (card.type === "bundle") {
    parts.push("пакет пакетное предложение", String(card.totalRub));
    for (const f of card.flights)
      parts.push("рейс", f.origin, f.destination, f.carrier, String(f.priceRub));
    for (const h of card.hotels)
      parts.push("отель", h.city, h.name, String(h.stars), String(h.pricePerNightRub));
  } else if (card.type === "multiLeg") {
    parts.push("маршрут мультигород");
    for (const leg of card.data.legs)
      parts.push(leg.from, leg.to, "рейс", leg.offer.carrier, String(leg.offer.priceRub));
    if (card.data.returnLeg)
      parts.push("обратно", card.data.returnLeg.from, card.data.returnLeg.to);
  }
  return parts.join(" ");
}

/** TF: частота термина в документе (нормализованная). */
function tf(term: string, docTokens: string[]): number {
  if (docTokens.length === 0) return 0;
  let count = 0;
  for (const t of docTokens) if (t === term) count++;
  return count / docTokens.length;
}

/** IDF: обратная частота документа. */
function idf(term: string, docsTokens: string[][]): number {
  let df = 0;
  for (const doc of docsTokens) {
    if (doc.includes(term)) df++;
  }
  const n = docsTokens.length;
  return Math.log((n + 1) / (df + 1)) + 1;
}

/** Вектор TF-IDF для документа по словарю и предвычисленному idf. */
function vectorize(
  docTokens: string[],
  vocabulary: string[],
  idfMap: Map<string, number>
): number[] {
  return vocabulary.map((term) => tf(term, docTokens) * (idfMap.get(term) ?? 1));
}

/** Косинусное сходство между двумя векторами. */
function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Ранжирует карточки по релевантности запросу пользователя (TF-IDF + cosine similarity).
 * Возвращает тот же массив, отсортированный по убыванию score (каждая карточка остаётся полной — с каждым городом, отелем, рейсом).
 */
export function rankOffersByTfIdf(cards: OfferCard[], userQuery: string): OfferCard[] {
  if (cards.length === 0 || !userQuery.trim()) return cards;

  const descriptions = cards.map((c) => cardToDescription(c));
  const docsTokens = descriptions.map((d) => tokenize(d));
  const queryTokens = tokenize(userQuery);

  const vocabSet = new Set<string>();
  for (const doc of docsTokens) for (const t of doc) vocabSet.add(t);
  for (const t of queryTokens) vocabSet.add(t);
  const vocabulary = Array.from(vocabSet);

  const idfMap = new Map<string, number>();
  for (const term of vocabulary) idfMap.set(term, idf(term, docsTokens));

  const queryVec = vectorize(queryTokens, vocabulary, idfMap);
  const scores = docsTokens.map((docT) => cosine(vectorize(docT, vocabulary, idfMap), queryVec));

  const indexed = cards.map((card, i) => ({ card, score: scores[i], index: i }));
  indexed.sort((a, b) => b.score - a.score);
  return indexed.map((x) => x.card);
}
