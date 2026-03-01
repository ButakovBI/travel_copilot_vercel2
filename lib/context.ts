import { prisma } from "./db";
import type { UserContext } from "./types";

export async function getUserContext(userId: string | null): Promise<UserContext> {
  if (!userId) return {};

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      paymentStats: true,
      pastTrips: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!user) return {};

  let purchaseHistory: { category: string; amountRub: number; month: string }[] | undefined;
  if (user.purchaseHistoryJson) {
    try {
      const raw = JSON.parse(user.purchaseHistoryJson) as unknown;
      purchaseHistory = Array.isArray(raw)
        ? raw.filter(
            (x): x is { category: string; amountRub: number; month: string } =>
              x && typeof (x as { category?: string }).category === "string" && typeof (x as { amountRub?: number }).amountRub === "number"
          )
        : undefined;
    } catch {
      purchaseHistory = undefined;
    }
  }

  return {
    userId: user.id,
    name: user.name,
    region: user.region ?? undefined,
    avgMonthlySpendRub: user.paymentStats?.avgMonthlySpendRub ?? undefined,
    restaurantSpendPct: user.paymentStats?.restaurantSpendPct ?? undefined,
    travelSpendPct: user.paymentStats?.travelSpendPct ?? undefined,
    luxurySpendPct: user.paymentStats?.luxurySpendPct ?? undefined,
    pastTrips: user.pastTrips?.map((t) => ({
      destination: t.destination,
      type: t.type,
      avgPriceRub: t.avgPriceRub,
      stars: t.stars ?? undefined,
    })),
    cashbackTravelCurrentMonthRub: user.cashbackTravelCurrentMonthRub ?? undefined,
    purchaseHistory,
  };
}
