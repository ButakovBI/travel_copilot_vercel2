import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DEFAULT_LIMIT = 50;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(100, parseInt(request.nextUrl.searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT);
  const logs = await prisma.copilotActionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json(
    logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      sessionId: l.sessionId,
      conversationId: l.conversationId,
      action: l.action,
      payload: l.payloadJson ? (JSON.parse(l.payloadJson) as unknown) : null,
      createdAt: l.createdAt.toISOString(),
    }))
  );
  } catch (e) {
    console.error("Copilot log GET error:", e);
    return NextResponse.json({ error: "Ошибка загрузки лога" }, { status: 500 });
  }
}
