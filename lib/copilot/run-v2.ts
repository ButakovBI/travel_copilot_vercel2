import { createLlmClient, getLlmModel, isLlmConfigured } from "../llm";
import type { UserContext } from "../types";
import type { OfferCard } from "../types";
import type { ExtractedParams } from "./params";

/** Контекст поездки для отображения в боковой панели чата (что бот знает на текущий момент). */
export type TripContext = {
  waypoints?: string[];
  origin?: string;
  destination?: string;
  dateFrom?: string;
  dateTo?: string;
  budgetMin?: number;
  budgetMax?: number;
  transport?: string;
  guests?: number;
  nights?: number;
  returnTrip?: boolean;
};
import {
  buildExtractPrompt,
  buildClarifyPrompt,
  isEnoughToSearch,
  getMissingParams,
  hasCriticalMissing,
  isMultiCity,
  MAX_CLARIFICATION_STEPS,
  getOnboardingProgress,
  detectSkipIntent,
  EXTRACT_SYSTEM,
  CLARIFY_SYSTEM,
} from "./params";
import {
  runSearchViaProvidersWithFallback,
  runMultiLegSearch,
  runSearch,
  buildRankPrompt,
  parseRankResponse,
  pickTopN,
  buildBundlesFromOffers,
} from "./search-and-rank";
import { rankOffersByTfIdf } from "./tfidf-rank";
import { sortByPriority, withRouteMeta, DEFAULT_PRIORITY } from "./scenarios";
import type { OnboardingProgress } from "./scenarios";

const RANK_SYSTEM = `Ты — помощник Т-Путешествий. Тебе дан список вариантов поездки. Выбери до 3 лучших с учётом запроса пользователя и профиля. Ответь ТОЛЬКО валидным JSON без markdown: { "indices": [i1, i2, i3], "summary": "одно короткое предложение пояснения" }.`;

export type CopilotMessage = { role: "user" | "assistant"; content: string };

export type CopilotResponse = {
  text: string;
  offerCards: OfferCard[];
  phase: "quick_reply" | "clarifying" | "results";
  /** Текущие параметры поездки (для боковой панели). */
  tripContext?: TripContext;
  /** Прогресс онбординга (шаг из totalSteps) для прогресс-бара. */
  onboardingProgress?: OnboardingProgress;
};

function toTripContext(p: ExtractedParams): TripContext {
  return {
    waypoints: p.waypoints?.length ? p.waypoints : undefined,
    origin: p.origin,
    destination: p.destination,
    dateFrom: p.dateFrom,
    dateTo: p.dateTo,
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax != null && p.budgetMax < 9999999 ? p.budgetMax : undefined,
    transport: p.transport,
    guests: p.guests ?? undefined,
    nights: p.nights ?? undefined,
    returnTrip: p.returnTrip,
  };
}

const FORBIDDEN_PHRASES = [
  "гарантирую",
  "гарантированно",
  "гарантия",
  "100%",
  "точно будет",
  "обещаю",
];

function safetyFilter(text: string): string {
  let out = text;
  for (const phrase of FORBIDDEN_PHRASES) {
    if (out.toLowerCase().includes(phrase.toLowerCase())) {
      out = out.replace(new RegExp(phrase, "gi"), "[проверьте условия на сайте]");
    }
  }
  return out;
}

const QUICK_REPLY_PATTERN = /^(спасибо|благодарю|ок|окей|хорошо|отлично|понятно|ясно|да|нет|принято|супер|круто|ага|продолжай|давай|хорош[оа]|ладно|понял|ясно)$/i;

function isQuickReply(lastUserContent: string): boolean {
  const t = lastUserContent.trim();
  return t.length <= 50 && (QUICK_REPLY_PATTERN.test(t) || t.length < 15);
}

const QUICK_REPLY_SYSTEM = `Ты — дружелюбный AI-помощник Т-Путешествий. Пользователь написал короткую реплику (благодарность, согласие и т.п.). Ответь одним коротким предложением (до 15 слов), по-человечески и по делу. На «спасибо» после бронирования ответь в духе: «Пожалуйста! Хорошей поездки!» или «Рады были помочь! Удачного путешествия!» Без списков и формальностей.`;

function parseExtractedParams(raw: string): ExtractedParams {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};
  try {
    const obj = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const p: ExtractedParams = {};
    if (typeof obj.budgetMin === "number") p.budgetMin = obj.budgetMin;
    if (typeof obj.budgetMax === "number" && obj.budgetMax < 9999999) p.budgetMax = obj.budgetMax;
    if (Array.isArray(obj.cities)) p.cities = obj.cities.filter((x): x is string => typeof x === "string");
    if (Array.isArray(obj.waypoints)) {
      p.waypoints = obj.waypoints.filter((x): x is string => typeof x === "string").map((s) => String(s).trim()).filter(Boolean);
      if (p.waypoints.length >= 2) {
        p.origin = p.origin ?? p.waypoints[0];
        p.destination = p.destination ?? p.waypoints[p.waypoints.length - 1];
      }
    }
    if (typeof obj.origin === "string") p.origin = obj.origin;
    if (typeof obj.destination === "string") p.destination = obj.destination;
    if (typeof obj.returnTrip === "boolean") p.returnTrip = obj.returnTrip;
    if (["flight", "train", "bus", "car", "any"].includes(String(obj.transport))) p.transport = obj.transport as ExtractedParams["transport"];
    if (typeof obj.guests === "number") p.guests = obj.guests;
    if ([3, 4, 5].includes(Number(obj.stars))) p.stars = Number(obj.stars);
    if (typeof obj.dateFrom === "string") p.dateFrom = obj.dateFrom;
    if (typeof obj.dateTo === "string") p.dateTo = obj.dateTo;
    if (typeof obj.nights === "number") p.nights = obj.nights;
    if (obj.priorityWeights && typeof obj.priorityWeights === "object") {
      const w = obj.priorityWeights as Record<string, unknown>;
      const speed = typeof w.speed === "number" ? Math.max(0, Math.min(10, w.speed)) : undefined;
      const price = typeof w.price === "number" ? Math.max(0, Math.min(10, w.price)) : undefined;
      const comfort = typeof w.comfort === "number" ? Math.max(0, Math.min(10, w.comfort)) : undefined;
      if (speed != null && price != null && comfort != null) p.priorityWeights = { speed, price, comfort };
    }
    return p;
  } catch {
    return {};
  }
}

export type RunCopilotOptions = {
  onPhase?: (phase: CopilotResponse["phase"]) => void;
  onLog?: (action: string, payload: Record<string, unknown>) => void;
};

export async function runCopilotV2(
  messages: CopilotMessage[],
  userContext: UserContext,
  options?: RunCopilotOptions
): Promise<CopilotResponse> {
  const onPhase = options?.onPhase;
  const onLog = options?.onLog;

  if (!isLlmConfigured()) {
    return {
      text: "Сервис подбора недоступен: не задан ключ API. В .env укажите OPENROUTER_API_KEY (при LLM_PROVIDER=openrouter), либо DEEPSEEK_API_KEY, либо QWEN_API_KEY — и перезапустите сервер.",
      offerCards: [],
      phase: "results",
      tripContext: undefined,
    };
  }

  const client = createLlmClient();
  const model = getLlmModel();
  const lastUser = messages.filter((m) => m.role === "user").pop()?.content ?? "";

  if (messages.length >= 2 && isQuickReply(lastUser)) {
    onPhase?.("quick_reply");
    onLog?.("quick_reply", { messagePreview: lastUser.slice(0, 50) });
    const quickRes = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: QUICK_REPLY_SYSTEM },
        ...messages.slice(-4).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      max_tokens: 80,
    });
    const text = quickRes.choices[0]?.message?.content?.trim() ?? "Пожалуйста! Если понадобится подбор поездки — напишите.";
    return { text: safetyFilter(text), offerCards: [], phase: "quick_reply", tripContext: undefined };
  }

  const clarificationRounds = messages.filter((m) => m.role === "assistant").length;
  const extractPrompt = buildExtractPrompt(messages, userContext.region ?? "RU");

  const extractRes = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: extractPrompt },
    ],
    max_tokens: 400,
  });
  const extractContent = extractRes.choices[0]?.message?.content ?? "{}";
  const currentParams = parseExtractedParams(extractContent);
  onLog?.("params_extracted", {
    waypoints: currentParams.waypoints,
    origin: currentParams.origin,
    destination: currentParams.destination,
    dateFrom: currentParams.dateFrom,
    dateTo: currentParams.dateTo,
    transport: currentParams.transport,
    guests: currentParams.guests,
    budgetMax: currentParams.budgetMax,
  });

  const missing = getMissingParams(currentParams);
  const enough = isEnoughToSearch(currentParams);
  const maxClarificationsReached = clarificationRounds >= MAX_CLARIFICATION_STEPS;
  const userWantsToSkip = detectSkipIntent(lastUser);
  const mustClarify =
    missing.length > 0 &&
    !userWantsToSkip &&
    !maxClarificationsReached &&
    (hasCriticalMissing(missing) || !enough);

  const onboardingProgress = getOnboardingProgress(currentParams, missing);

  if (mustClarify) {
    onPhase?.("clarifying");
    const clarifyRes = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: CLARIFY_SYSTEM },
        { role: "user", content: buildClarifyPrompt(messages, currentParams, missing) },
      ],
      max_tokens: 250,
    });
    const text = clarifyRes.choices[0]?.message?.content ?? "Уточните, пожалуйста: откуда поедете, куда, даты, бюджет и сколько человек.";
    onLog?.("clarification_sent", { missingCount: missing.length, missing });
    return {
      text: safetyFilter(text),
      offerCards: [],
      phase: "clarifying",
      tripContext: toTripContext(currentParams),
      onboardingProgress,
    };
  }

  onPhase?.("results");

  if (isMultiCity(currentParams)) {
    const { offerCards: multiCards, summaryText } = await runMultiLegSearch(currentParams);
    const oneCard = multiCards.slice(0, 1);
    const withMeta = withRouteMeta(oneCard);
    const textForUser =
      oneCard.length === 1
        ? safetyFilter(
            summaryText
              .replace(/Подобрал 3 варианта/, "Подобрал лучший вариант")
              .replace(/Варианты от [\d\s\u00A0]+ до [\d\s\u00A0]+ ₽\.?/g, "Полная стоимость в карточке ниже.")
          )
        : safetyFilter(summaryText);
    onLog?.("search_completed", {
      type: "multiLeg",
      offerCardsCount: withMeta.length,
      waypoints: currentParams.waypoints,
      returnTrip: currentParams.returnTrip,
    });
    return {
      text: textForUser,
      offerCards: withMeta,
      phase: "results",
      tripContext: toTripContext(currentParams),
    };
  }

  let { offers, relaxed } = await runSearchViaProvidersWithFallback(currentParams);
  if (offers.length === 0) {
    const dbOffers = await runSearch(currentParams);
    if (dbOffers.length > 0) {
      offers = dbOffers;
      relaxed = true;
    } else {
      onLog?.("search_completed", { type: "single", offerCardsCount: 0, noResults: true });
      return {
        text: "По заданным параметрам вариантов не найдено. Измените направление, даты или бюджет и попробуйте снова.",
        offerCards: [],
        phase: "results",
        tripContext: toTripContext(currentParams),
      };
    }
  }

  const nights = currentParams.nights ?? 1;
  const bundles = buildBundlesFromOffers(offers, nights);

  let offerCardsWithMeta: import("../types").OfferCardWithMeta[];
  let summary: string;

  if (bundles.length > 0) {
    offerCardsWithMeta = withRouteMeta(bundles.slice(0, 1));
    summary = "Ниже — лучший вариант: план поездки с перелётом и отелем.";
    onLog?.("search_completed", { type: "single", bundles: true, offerCardsCount: offerCardsWithMeta.length });
  } else {
    const rankedByRelevance = rankOffersByTfIdf(offers, lastUser);
    const weights = currentParams.priorityWeights ?? DEFAULT_PRIORITY;
    const rankedByPriority = sortByPriority(rankedByRelevance, weights);
    const rankPrompt = buildRankPrompt(rankedByPriority, currentParams, userContext, lastUser);
    const rankRes = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: RANK_SYSTEM },
        { role: "user", content: rankPrompt },
      ],
      max_tokens: 300,
    });
    const rankContent = rankRes.choices[0]?.message?.content ?? "{}";
    const parsed = parseRankResponse(rankContent);
    summary = parsed.summary;
    const topN = pickTopN(rankedByPriority, parsed.indices, 1);
    offerCardsWithMeta = withRouteMeta(topN);
    onLog?.("search_completed", { type: "single", bundles: false, offerCardsCount: offerCardsWithMeta.length });
  }

  const dataSourceNote = " Данные о перелётах и маршрутах получены от Duffel. Условия и наличие уточняйте при бронировании.";
  const count = offerCardsWithMeta.length;
  const variantWord = count === 1 ? "вариант" : count >= 2 && count <= 4 ? "варианта" : "вариантов";
  const contextHint = " Можно дальше уточнять личный контекст под ваши требования: бюджет, транспорт, комфорт — напишите, и я пересортирую варианты.";
  const finalText = relaxed
    ? `По точным параметрам ничего не нашлось. Подобрал ближайшие варианты: ${summary} Детали и цены — в карточках ниже.${contextHint}${dataSourceNote}`
    : `Подобрал для вас ${count} ${variantWord}. ${summary} Детали и цены — в карточках ниже.${contextHint}${dataSourceNote}`;

  onLog?.("search_completed", {
    type: "single",
    offerCardsCount: offerCardsWithMeta.length,
    relaxed,
    origin: currentParams.origin,
    destination: currentParams.destination,
  });

  return {
    text: safetyFilter(finalText),
    offerCards: offerCardsWithMeta,
    phase: "results",
    tripContext: toTripContext(currentParams),
  };
}
