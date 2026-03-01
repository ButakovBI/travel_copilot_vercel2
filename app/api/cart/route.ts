import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!userId && !sessionId) {
    return NextResponse.json({ items: [] });
  }

  const where = userId ? { userId } : { sessionId };
  const items = await prisma.cartItem.findMany({ where });
  return NextResponse.json({ items });
}

const addSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  type: z.enum(["flight", "hotel", "train", "bundle", "multiLeg"]),
  offerId: z.string(),
  payload: z.string(),
  priceRub: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = addSchema.parse(body);
    if (!data.userId && !data.sessionId) {
      return NextResponse.json({ error: "Нужен userId или sessionId" }, { status: 400 });
    }

    const item = await prisma.cartItem.create({
      data: {
        userId: data.userId ?? undefined,
        sessionId: data.sessionId ?? undefined,
        type: data.type,
        offerId: data.offerId,
        payload: data.payload,
        priceRub: data.priceRub,
      },
    });
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные", details: e.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Ошибка добавления в корзину" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!userId && !sessionId) {
    return NextResponse.json({ ok: true });
  }
  const where = userId ? { userId } : { sessionId };
  await prisma.cartItem.deleteMany({ where });
  return NextResponse.json({ ok: true });
}
