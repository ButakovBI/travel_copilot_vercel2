import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  amountRub: z.number(),
  cartItemIds: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionId, amountRub, cartItemIds } = bodySchema.parse(body);

    const items = await prisma.cartItem.findMany({
      where: { id: { in: cartItemIds } },
    });
    if (items.length === 0) {
      return NextResponse.json({ error: "Корзина пуста" }, { status: 400 });
    }

    const total = items.reduce((s, i) => s + i.priceRub, 0);
    if (Math.abs(total - amountRub) > 1) {
      return NextResponse.json({ error: "Сумма не совпадает" }, { status: 400 });
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await prisma.cartItem.deleteMany({ where: { id: { in: cartItemIds } } });

    return NextResponse.json({
      success: true,
      orderId,
      message: "Оплата прошла успешно (демо Т-Банк).",
      receiptUrl: `/receipt/${orderId}`,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    return NextResponse.json({ error: "Ошибка оплаты" }, { status: 500 });
  }
}
