import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendSms } from "@/lib/sms";

const bodySchema = z.object({
  phone: z.string().min(10).max(20),
});

const CODE_TTL_MINUTES = 5;
const CODE_LENGTH = 6;

function generateCode(): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = bodySchema.parse(body);

    const normalized = phone.replace(/\D/g, "");
    if (normalized.length < 10) {
      return NextResponse.json({ error: "Неверный формат телефона" }, { status: 400 });
    }

    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_TTL_MINUTES);

    await prisma.phoneVerificationCode.deleteMany({ where: { phone: normalized } });
    await prisma.phoneVerificationCode.create({
      data: { phone: normalized, code, expiresAt },
    });

    const apiId = process.env.SMS_RU_API_ID ?? process.env.SMS_RU_API_KEY;
    if (apiId) {
      const { success, error } = await sendSms(
        phone,
        `Код для входа в Т-Путешествия: ${code}. Никому не сообщайте.`
      );
      if (!success) {
        return NextResponse.json(
          { error: error ?? "Не удалось отправить СМС. Проверьте номер и попробуйте позже." },
          { status: 502 }
        );
      }
    }

    const responseBody: { success: true; devCode?: string } = { success: true };
    if (!apiId && process.env.NODE_ENV === "development") {
      responseBody.devCode = code;
    }
    return NextResponse.json(responseBody);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверный формат телефона" }, { status: 400 });
    }
    return NextResponse.json({ error: "Ошибка отправки кода" }, { status: 500 });
  }
}
