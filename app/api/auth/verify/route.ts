import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

const bodySchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().min(4).max(8),
});

const SESSION_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = bodySchema.parse(body);

    const normalized = phone.replace(/\D/g, "");

    const record = await prisma.phoneVerificationCode.findFirst({
      where: { phone: normalized },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json({ error: "Код не найден. Запросите новый код." }, { status: 401 });
    }
    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Срок действия кода истёк. Запросите новый код." }, { status: 401 });
    }
    if (record.code !== code.trim()) {
      return NextResponse.json({ error: "Неверный код" }, { status: 401 });
    }

    const phoneForUser = normalized.startsWith("7") ? `+${normalized}` : `+7${normalized}`;

    let user = await prisma.user.findUnique({ where: { phone: phoneForUser } });
    if (!user) {
      user = await prisma.user.create({
        data: { phone: phoneForUser, name: null, region: "RU" },
      });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    await prisma.phoneVerificationCode.deleteMany({ where: { phone: normalized } });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    return NextResponse.json({ error: "Ошибка входа" }, { status: 500 });
  }
}
