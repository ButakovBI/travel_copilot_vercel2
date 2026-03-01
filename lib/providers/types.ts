import type { FlightOffer, HotelOffer, TrainOffer } from "../types";

/** Запрос к внешнему сервису (формируется из контекста пользователя). */
export type ProviderQuery = {
  origin: string;
  destination: string;
  dateFrom?: string;
  dateTo?: string;
  passengers?: number;
  nights?: number;
  budgetMin?: number;
  budgetMax?: number;
  stars?: number;
};

/** Результат от провайдера после парсинга (унифицированный формат). */
export type ProviderFlightRaw = Omit<FlightOffer, "source" | "checkedAt"> & { sourceProvider: string };
export type ProviderHotelRaw = Omit<HotelOffer, "source" | "checkedAt"> & { sourceProvider: string };
export type ProviderTrainRaw = Omit<TrainOffer, "source" | "checkedAt"> & { sourceProvider: string };

export type ProviderResult = {
  flights: ProviderFlightRaw[];
  hotels: ProviderHotelRaw[];
  trains: ProviderTrainRaw[];
  errors: string[];
};

/** Результат факт-чека по БД Т-Путешествий. */
export type FactCheckResult = {
  flightMatches: { providerId: string; dbPriceRub?: number }[];
  hotelMatches: { providerId: string; dbPriceRub?: number }[];
  trainMatches: { providerId: string; dbPriceRub?: number }[];
};
