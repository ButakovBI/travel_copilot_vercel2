import { searchFlights, searchHotels, searchTrains, getVisaInfo } from "../search";
import type { SearchParams, FlightOffer, HotelOffer, TrainOffer, OfferCard } from "../types";

const tools = [
  {
    type: "function" as const,
    function: {
      name: "search_flights",
      description: "Поиск авиарейсов по маршруту. Вызывай когда нужны перелёты.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Город вылета, например Москва" },
          destination: { type: "string", description: "Город прилёта" },
          directOnly: { type: "boolean", description: "Только прямые рейсы" },
          limit: { type: "number", description: "Максимум вариантов, по умолчанию 5" },
        },
        required: ["origin", "destination"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_hotels",
      description: "Поиск отелей в городе. Вызывай когда нужны варианты проживания.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "Город, например Казань, Сочи" },
          stars: { type: "number", description: "Минимальное количество звёзд (3, 4, 5)" },
          limit: { type: "number", description: "Максимум вариантов" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_trains",
      description: "Поиск поездов по маршруту. Вызывай когда пользователь хочет поезд.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Город отправления" },
          destination: { type: "string", description: "Город назначения" },
          limit: { type: "number", description: "Максимум вариантов" },
        },
        required: ["origin", "destination"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_visa_info",
      description: "Проверить, нужна ли виза для поездки в страну. Вызывай для поездок за границу.",
      parameters: {
        type: "object",
        properties: {
          countryName: { type: "string", description: "Название страны, например Турция, Черногория" },
        },
        required: ["countryName"],
      },
    },
  },
];

export { tools };

export async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ offerCards?: OfferCard[]; text?: string }> {
  const limit = Math.min(Number(args.limit) || 5, 10);

  switch (name) {
    case "search_flights": {
      const origin = String(args.origin ?? "");
      const destination = String(args.destination ?? "");
      const directOnly = Boolean(args.directOnly);
      const list = await searchFlights({ origin, destination, directOnly }, limit);
      const offerCards: OfferCard[] = list.map((f) => ({ type: "flight", data: f }));
      return { offerCards };
    }
    case "search_hotels": {
      const city = String(args.city ?? "");
      const stars = args.stars != null ? Number(args.stars) : undefined;
      const list = await searchHotels({ destination: city, cities: [city], stars }, limit);
      const offerCards: OfferCard[] = list.map((h) => ({ type: "hotel", data: h }));
      return { offerCards };
    }
    case "search_trains": {
      const origin = String(args.origin ?? "");
      const destination = String(args.destination ?? "");
      const list = await searchTrains({ origin, destination }, limit);
      const offerCards: OfferCard[] = list.map((t) => ({ type: "train", data: t }));
      return { offerCards };
    }
    case "get_visa_info": {
      const countryName = String(args.countryName ?? "");
      const info = await getVisaInfo(countryName);
      const text = info
        ? `Страна: ${info.countryName}. Виза ${info.visaRequired ? "требуется" : "не требуется"}. ${info.notes ?? ""}`
        : `По стране «${countryName}» данных о визе в базе нет. Рекомендую уточнить на сайте консульства.`;
      return { text };
    }
    default:
      return { text: `Неизвестный инструмент: ${name}` };
  }
}

export function parseToolCallResult(
  name: string,
  result: { offerCards?: OfferCard[]; text?: string }
): string {
  if (result.text) return result.text;
  if (result.offerCards?.length) {
    const parts = result.offerCards.map((c) => {
      if (c.type === "flight")
        return `[РЕЙС] ${c.data.origin} → ${c.data.destination}, ${c.data.carrier} ${c.data.flightNumber}, вылет ${c.data.departureAt}, цена в карточке [OFFER_CARD]`;
      if (c.type === "hotel")
        return `[ОТЕЛЬ] ${c.data.city}, ${c.data.name}, ${c.data.stars}★, цена за ночь в карточке [OFFER_CARD]`;
      if (c.type === "train")
        return `[ПОЕЗД] ${c.data.origin} → ${c.data.destination}, ${c.data.carrier}, отправление ${c.data.departureAt}, цена в карточке [OFFER_CARD]`;
      return "";
    });
    return parts.filter(Boolean).join("\n");
  }
  return "Результат пуст.";
}
