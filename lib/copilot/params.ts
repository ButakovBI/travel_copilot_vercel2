/** Приоритеты 0–10 для ранжирования (скорость, цена, комфорт). */
export type PriorityWeights = { speed: number; price: number; comfort: number };

export type ExtractedParams = {
  budgetMin?: number;
  budgetMax?: number;
  cities?: string[];
  origin?: string;
  destination?: string;
  /** Порядок посещения городов для мультипоездки (первый = откуда, последний = финал). 3+ пунктов = мультимаршрут. */
  waypoints?: string[];
  /** Нужен ли обратный путь (последний город → первый). */
  returnTrip?: boolean;
  transport?: "flight" | "train" | "bus" | "car" | "any";
  guests?: number;
  stars?: number;
  dateFrom?: string;
  dateTo?: string;
  nights?: number;
  /** Приоритет для ранжирования вариантов (слайдеры 0–10). */
  priorityWeights?: PriorityWeights;
};

const PARAMS_SCHEMA = `JSON с полями (только указанные): budgetMin, budgetMax (если "бюджет не ограничен" — не включай или 9999999), cities, origin (ОТКУДА), destination (КУДА), waypoints (массив строк — порядок посещения при 3+ городах: первый = откуда, последний = конечная точка; если пользователь сказал "сначала X, потом Y" — этот порядок; иначе порядок по самому быстрому маршруту: от ближнего к дальнему к финалу, напр. Москва→Пекин с заездом в Казань, Новосибирск, Владивосток = ["Москва","Казань","Новосибирск","Владивосток","Пекин"]), returnTrip (true если нужен обратный путь), transport ("flight"|"train"|"bus"|"car"|"any"), guests, stars (3|4|5), dateFrom (YYYY-MM-DD), dateTo, nights, priorityWeights (объект { speed: 0-10, price: 0-10, comfort: 0-10 } только если пользователь указал приоритет: быстрее/дешевле/комфортнее). Даты только если названы.`;

export const EXTRACT_SYSTEM = `Ты извлекаешь структурированные параметры поездки из диалога. Отвечай ТОЛЬКО валидным JSON без markdown.

Важно — каждая поездка обрабатывается по последнему запросу:
- Если пользователь запрашивает другую поездку (отели в другом городе, другой маршрут, «цены в X», «маршрут A → B»), извлекай параметры ТОЛЬКО из последнего сообщения пользователя; не копируй waypoints, origin, destination из предыдущих реплик.
- Если пользователь уточняет текущую поездку («добавь город X», «добавим X в маршрут», «покажи варианты», «измени даты») — можно опираться на контекст диалога и сохранять/дополнять waypoints. При «добавь/добавим [город]» добавь этот город в waypoints, сохранив порядок остальных городов (вставь по смыслу маршрута).

Маршрут «через» город (пересадка/остановка):
- Если в диалоге было «в [город] через [город]», «из [город] в [город] с пересадкой в [город]», «через Стамбул», «пересадка в [город]» — обязательно заполни waypoints: [origin, город пересадки/остановки, destination]. Пример: «в Прагу из Москвы через Стамбул» → origin "Москва", destination "Прага", waypoints ["Москва", "Стамбул", "Прага"]. «Добавить Мюнхен» при уже известном маршруте — добавь город в waypoints в указанном пользователем порядке.
Обычная поездка (2 места):
- origin = ОТКУДА, destination = КУДА. "Хочу в Москву" = только destination "Москва", origin не указывай. "На 2 дня" = только nights: 2.
Мультипоездка (3+ городов):
- waypoints = массив в порядке посещения (первый = откуда, последний = куда). Если пользователь указал порядок («Москва — Стамбул — Мюнхен — Прага») — используй его. returnTrip = true если нужен обратный путь (по умолчанию для мультимаршрута — да). origin = waypoints[0], destination = waypoints[последний].
Остальное: guests, budget, даты — из диалога. "Бюджет не ограничен" = не включай budgetMax или 9999999. transport по умолчанию не задавай (будет самолёт).`;


export function buildExtractPrompt(messages: { role: string; content: string }[], userRegion: string): string {
  const regionNote = userRegion ? `Регион пользователя: ${userRegion}. Учитывай при интерпретации направлений.` : "Пользователь из России.";
  return `${regionNote}

Диалог:
${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}

Верни ${PARAMS_SCHEMA}`;
}

export const CLARIFY_SYSTEM = `Ты — помощник по подбору поездок Т-Путешествий. Отвечай коротко и по делу. Уточняй только то, чего не хватает в «Не хватает», строго по порядку:

1) Направление и маршрут (откуда, куда; если «через город» — порядок городов).
2) Даты поездки или период (например, 20-е числа марта).
3) Бюджет (диапазон в рублях), важен ли комфорт, количество гостей. Транспорт не спрашивай — сразу предлагаем самолёт.
4) Для маршрута через несколько городов: сколько гостей; на сколько ночей в каждом городе. Спроси: «На сколько планируете оставаться в [промежуточный город, напр. Стамбул] — только пересадка или ночёвки? На сколько ночей в [конечный город, напр. Прага]?» Упомяни, что обратный перелёт подбирается по тому же маршруту.

Если пользователь только что добавил город в маршрут (например, «добавить Мюнхен») и теперь 4 города: сначала спроси порядок: «Вы хотите лететь в следующем порядке: [перечисли города через тире, напр. Москва — Стамбул — Прага — Мюнхен]?» Если ответ «нет» — напиши: «Напишите желаемый порядок городов, например: Москва — Стамбул — Мюнхен — Прага».
Если пользователь сам написал порядок городов («Москва — Стамбул — Мюнхен — Прага») — прими этот порядок и кратко подтверди: «Принял: Москва — Стамбул — Мюнхен — Прага. Подбираю варианты.»

Объединяй 1–2 вопроса в одно сообщение. Не более 4 уточнений подряд — затем подбирай варианты.
«Покажи варианты» / «достаточно» — не уточняй, сразу подбирай по имеющимся данным.`;

export function buildClarifyPrompt(
  messages: { role: string; content: string }[],
  currentParams: ExtractedParams,
  missing: string[]
): string {
  const lastUser = messages.filter((m) => m.role === "user").pop()?.content ?? "";
  const waypoints = currentParams.waypoints ?? [];
  const addedCityHint =
    waypoints.length >= 4 &&
    /добав|включ|ещё\s+город|мюнхен|мунхен/i.test(lastUser)
      ? " В последнем сообщении пользователь добавил город. Сначала уточни порядок: «Вы хотите лететь в следующем порядке: [города через тире]?» Если нет — попроси написать желаемый порядок."
      : "";
  return `Текущие параметры (уже известное): ${JSON.stringify(currentParams)}
Не хватает: ${missing.join(", ")}${addedCityHint}

Диалог:
${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}

Напиши одно сообщение с уточняющими вопросами (объединёнными в текст).`;
}

/** Мультипоездка: 3+ пунктов в waypoints или явно несколько пар городов. */
export function isMultiCity(p: ExtractedParams): boolean {
  return (p.waypoints != null && p.waypoints.length >= 3) || false;
}

/** Пары (from, to) для мультимаршрута. При returnTrip добавляется последний → первый. */
export function getLegsFromWaypoints(p: ExtractedParams): { from: string; to: string }[] {
  const w = p.waypoints;
  if (!w || w.length < 2) return [];
  const legs: { from: string; to: string }[] = [];
  for (let i = 0; i < w.length - 1; i++) legs.push({ from: w[i].trim(), to: w[i + 1].trim() });
  if (p.returnTrip && w.length >= 2) legs.push({ from: w[w.length - 1].trim(), to: w[0].trim() });
  return legs;
}

/** Достаточно ли параметров для поиска: маршрут + даты. Гости по умолчанию 1, бюджет опционален. */
export function isEnoughToSearch(p: ExtractedParams): boolean {
  const hasDirection =
    (p.waypoints != null && p.waypoints.length >= 2) ||
    (p.cities && p.cities.length > 0) ||
    (p.origin && p.destination) ||
    (p.destination && p.origin);
  const hasDates = (p.dateFrom != null && p.dateFrom.length >= 10) || (p.dateTo != null && p.dateTo.length >= 10);
  return Boolean(hasDirection && hasDates);
}

/** Критичные пункты: направление и даты. Без них не запускаем поиск. */
export const CRITICAL_MISSING_LABELS = [
  "город вылета/отправления (откуда)",
  "город вылета (откуда)",
  "город назначения (куда)",
  "даты поездки (или период)",
  "даты поездки или период",
  "список городов и порядок посещения (или «по умолчанию — самый быстрый маршрут»)",
  "маршрут: откуда, через какие города, куда (например: Москва — Стамбул — Прага)",
] as const;

/** Есть ли среди недостающих критичные (обязательно спросить, не переходить к поиску). */
export function hasCriticalMissing(missing: string[]): boolean {
  return missing.some((m) => CRITICAL_MISSING_LABELS.includes(m as (typeof CRITICAL_MISSING_LABELS)[number]));
}

/** Максимум уточняющих сообщений подряд (не более 3). */
export const MAX_CLARIFICATION_STEPS = 3;

export { getOnboardingProgress, detectSkipIntent } from "./scenarios";

/**
 * Что не хватает для поиска: направление, даты, для полного сценария — бюджет, гости, ночи.
 * Транспорт не спрашиваем — по умолчанию самолёт.
 */
export function getMissingParams(p: ExtractedParams): string[] {
  const missing: string[] = [];
  const multi = isMultiCity(p);

  if (multi) {
    if (!p.waypoints?.length || p.waypoints.length < 3) missing.push("маршрут: откуда, через какие города, куда (например: Москва — Стамбул — Прага)");
    if (!p.dateFrom && !p.dateTo) missing.push("даты поездки или период");
    if (p.budgetMin == null && p.budgetMax == null) missing.push("бюджет (диапазон в рублях или «без ограничений»)");
    if (p.guests == null) missing.push("количество гостей");
    if (p.nights == null && p.waypoints && p.waypoints.length >= 2) missing.push("количество ночей по городам (в промежуточном — пересадка или ночёвки; в конечном — сколько ночей)");
    return missing;
  }

  if (!p.origin?.trim()) missing.push("город вылета (откуда)");
  if (!p.destination?.trim() && !p.cities?.length) missing.push("город назначения (куда)");
  if (!p.dateFrom && !p.dateTo) missing.push("даты поездки (или период)");
  if (p.budgetMin == null && p.budgetMax == null) missing.push("бюджет (или «без ограничений»)");
  if (p.guests == null) missing.push("количество гостей");
  if (p.nights == null && p.destination) missing.push("количество ночей");
  return missing;
}
