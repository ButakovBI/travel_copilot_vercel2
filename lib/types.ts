export type SearchParams = {
  origin?: string;
  destination?: string;
  cities?: string[];
  dateFrom?: string;
  dateTo?: string;
  nights?: number;
  guests?: number;
  budgetMin?: number;
  budgetMax?: number;
  stars?: number;
  transport?: "flight" | "train" | "any";
  directOnly?: boolean;
  visaOk?: boolean;
  abroad?: boolean;
};

export type FlightOffer = {
  id: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  carrier: string;
  flightNumber: string;
  priceRub: number;
  direct: boolean;
  imageUrl?: string | null;
  source: "search";
  checkedAt: string;
};

export type HotelOffer = {
  id: string;
  city: string;
  name: string;
  stars: number;
  pricePerNightRub: number;
  amenities: string;
  imageUrl?: string | null;
  source: "search";
  checkedAt: string;
};

export type TrainOffer = {
  id: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  carrier: string;
  priceRub: number;
  source: "search";
  checkedAt: string;
};

/** Один участок мультимаршрута: пара городов и лучший вариант перелёта/поезда. */
export type MultiLegSegment = {
  from: string;
  to: string;
  offer: FlightOffer | TrainOffer;
};

/** Один полный сценарий: все участки маршрута + отели по остановкам (одна карточка = один сценарий). */
export type MultiLegData = {
  legs: MultiLegSegment[];
  returnLeg?: MultiLegSegment;
  /** Отели по городам маршрута (остановки с ночёвкой). */
  hotels?: { city: string; offer: HotelOffer }[];
};

export type OfferCard =
  | { type: "flight"; data: FlightOffer }
  | { type: "hotel"; data: HotelOffer }
  | { type: "train"; data: TrainOffer }
  | { type: "bundle"; flights: FlightOffer[]; hotels: HotelOffer[]; totalRub: number }
  | { type: "multiLeg"; data: MultiLegData };

/** Метка маршрута для карточки (сравнение вариантов). */
export type RouteLabel = "Самая дешёвая" | "Самая быстрая" | "Самая комфортная" | null;

/** Карточка с метаданными для UI: метка, риск, факторы риска. */
export type OfferCardWithMeta = OfferCard & {
  routeLabel?: RouteLabel;
  riskScore?: number;
  riskFactors?: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  offerCards?: OfferCard[];
  timestamp: Date;
};

export type PurchaseHistoryItem = {
  category: string;
  amountRub: number;
  month: string;
};

export type UserContext = {
  userId?: string;
  name?: string | null;
  region?: string;
  avgMonthlySpendRub?: number;
  restaurantSpendPct?: number;
  travelSpendPct?: number;
  luxurySpendPct?: number;
  pastTrips?: { destination: string; type: string; avgPriceRub: number; stars?: number }[];
  /** Кэшбэк на путешествия в этом месяце (показывать при бронировании) */
  cashbackTravelCurrentMonthRub?: number;
  /** История покупок за последние месяцы для персонального подбора */
  purchaseHistory?: PurchaseHistoryItem[];
};
