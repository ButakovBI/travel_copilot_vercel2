import { prisma } from "./db";
import type { SearchParams, FlightOffer, HotelOffer, TrainOffer } from "./types";

const NOW_ISO = new Date().toISOString();

function toFlightOffer(f: {
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
}): FlightOffer {
  return {
    id: f.id,
    origin: f.origin,
    destination: f.destination,
    departureAt: f.departureAt,
    arrivalAt: f.arrivalAt,
    carrier: f.carrier,
    flightNumber: f.flightNumber,
    priceRub: f.priceRub,
    direct: f.direct,
    imageUrl: f.imageUrl ?? undefined,
    source: "search",
    checkedAt: NOW_ISO,
  };
}

function toHotelOffer(h: {
  id: string;
  city: string;
  name: string;
  stars: number;
  pricePerNightRub: number;
  amenities: string;
  imageUrl?: string | null;
}): HotelOffer {
  return {
    id: h.id,
    city: h.city,
    name: h.name,
    stars: h.stars,
    pricePerNightRub: h.pricePerNightRub,
    amenities: h.amenities,
    imageUrl: h.imageUrl ?? undefined,
    source: "search",
    checkedAt: NOW_ISO,
  };
}

function toTrainOffer(t: {
  id: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  carrier: string;
  priceRub: number;
}): TrainOffer {
  return {
    id: t.id,
    origin: t.origin,
    destination: t.destination,
    departureAt: t.departureAt,
    arrivalAt: t.arrivalAt,
    carrier: t.carrier,
    priceRub: t.priceRub,
    source: "search",
    checkedAt: NOW_ISO,
  };
}

export async function searchFlights(params: SearchParams, limit = 5): Promise<FlightOffer[]> {
  const origin = params.origin?.toLowerCase();
  const dest = params.destination?.toLowerCase();
  const directOnly = params.directOnly ?? false;

  const where: Record<string, unknown> = { availableSeats: { gt: 0 } };
  if (origin) where.origin = { contains: params.origin };
  if (dest) where.destination = { contains: params.destination };
  if (directOnly) where.direct = true;
  const priceRub: Record<string, number> = {};
  if (params.budgetMin != null && params.budgetMin > 0) priceRub.gte = params.budgetMin;
  if (params.budgetMax != null && params.budgetMax > 0) priceRub.lte = params.budgetMax;
  if (Object.keys(priceRub).length) where.priceRub = priceRub;
  const departureAt: Record<string, string> = {};
  if (params.dateFrom) departureAt.gte = params.dateFrom;
  if (params.dateTo) departureAt.lte = params.dateTo;
  if (Object.keys(departureAt).length) where.departureAt = departureAt;

  const list = await prisma.flight.findMany({
    where,
    take: limit,
    orderBy: { priceRub: "asc" },
  });

  const checked = await Promise.all(
    list.map(async (f) => {
      const fresh = await prisma.flight.findUnique({ where: { id: f.id } });
      if (!fresh || fresh.availableSeats <= 0) return null;
      return toFlightOffer(fresh);
    })
  );
  return checked.filter(Boolean) as FlightOffer[];
}

export async function searchHotels(params: SearchParams, limit = 5): Promise<HotelOffer[]> {
  const city = params.destination ?? params.cities?.[0];
  const stars = params.stars;
  const nights = params.nights ?? 1;
  if (!city) return [];

  const where: Record<string, unknown> = { city: { contains: city }, availableRooms: { gt: 0 } };
  if (stars) where.stars = { gte: stars };
  const pricePerNightRub: Record<string, number> = {};
  if (params.budgetMin != null && params.budgetMin > 0 && nights > 0) pricePerNightRub.gte = Math.floor(params.budgetMin / nights);
  if (params.budgetMax != null && params.budgetMax > 0 && nights > 0) pricePerNightRub.lte = Math.ceil(params.budgetMax / nights);
  if (Object.keys(pricePerNightRub).length) where.pricePerNightRub = pricePerNightRub;

  const list = await prisma.hotel.findMany({
    where,
    take: limit,
    orderBy: { pricePerNightRub: "asc" },
  });

  const checked = await Promise.all(
    list.map(async (h) => {
      const fresh = await prisma.hotel.findUnique({ where: { id: h.id } });
      if (!fresh || fresh.availableRooms <= 0) return null;
      return toHotelOffer(fresh);
    })
  );
  return checked.filter(Boolean) as HotelOffer[];
}

export async function searchTrains(params: SearchParams, limit = 5): Promise<TrainOffer[]> {
  const origin = params.origin?.toLowerCase();
  const dest = params.destination?.toLowerCase();

  const where: Record<string, unknown> = { availableSeats: { gt: 0 } };
  if (origin) where.origin = { contains: params.origin };
  if (dest) where.destination = { contains: params.destination };
  const priceRub: Record<string, number> = {};
  if (params.budgetMin != null && params.budgetMin > 0) priceRub.gte = params.budgetMin;
  if (params.budgetMax != null && params.budgetMax > 0) priceRub.lte = params.budgetMax;
  if (Object.keys(priceRub).length) where.priceRub = priceRub;
  const departureAt: Record<string, string> = {};
  if (params.dateFrom) departureAt.gte = params.dateFrom;
  if (params.dateTo) departureAt.lte = params.dateTo;
  if (Object.keys(departureAt).length) where.departureAt = departureAt;

  const list = await prisma.train.findMany({
    where,
    take: limit,
    orderBy: { priceRub: "asc" },
  });

  const checked = await Promise.all(
    list.map(async (t) => {
      const fresh = await prisma.train.findUnique({ where: { id: t.id } });
      if (!fresh || fresh.availableSeats <= 0) return null;
      return toTrainOffer(fresh);
    })
  );
  return checked.filter(Boolean) as TrainOffer[];
}

export async function getVisaInfo(countryName: string) {
  const c = await prisma.visaInfo.findFirst({
    where: { countryName: { contains: countryName } },
  });
  return c;
}
