import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET — загрузить черновик онбординга по userId или sessionId.
 * POST — сохранить черновик (params + опционально offerCards, conversationId).
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id") ?? undefined;
    const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
    if (!userId && !sessionId) {
      return NextResponse.json({ error: "Нужен userId или sessionId" }, { status: 400 });
    }
    const where = userId ? { userId } : { sessionId: sessionId! };
    const draft = await prisma.copilotDraft.findFirst({
      where,
      orderBy: { updatedAt: "desc" },
    });
    if (!draft) {
      return NextResponse.json({ draft: null });
    }
    const params = JSON.parse(draft.paramsJson);
    const offerCards = draft.offerCardsJson ? JSON.parse(draft.offerCardsJson) : undefined;
    return NextResponse.json({
      draft: {
        id: draft.id,
        conversationId: draft.conversationId,
        params,
        offerCards,
        updatedAt: draft.updatedAt,
      },
    });
  } catch (e) {
    console.error("Draft GET error:", e);
    return NextResponse.json({ error: "Ошибка загрузки черновика" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sessionId, conversationId, params, offerCards } = body as {
      userId?: string;
      sessionId?: string;
      conversationId?: string;
      params?: Record<string, unknown>;
      offerCards?: unknown[];
    };
    if (!userId && !sessionId) {
      return NextResponse.json({ error: "Нужен userId или sessionId" }, { status: 400 });
    }
    const paramsJson = JSON.stringify(params ?? {});
    const offerCardsJson = offerCards?.length ? JSON.stringify(offerCards) : null;
    const where = userId ? { userId } : { sessionId: sessionId! };
    const existing = await prisma.copilotDraft.findFirst({ where });
    const draft = existing
      ? await prisma.copilotDraft.update({
          where: { id: existing.id },
          data: { conversationId: conversationId ?? undefined, paramsJson, offerCardsJson },
        })
      : await prisma.copilotDraft.create({
          data: {
            userId: userId ?? undefined,
            sessionId: sessionId ?? undefined,
            conversationId: conversationId ?? undefined,
            paramsJson,
            offerCardsJson,
          },
        });
    return NextResponse.json({ draft: { id: draft.id, updatedAt: draft.updatedAt } });
  } catch (e) {
    console.error("Draft POST error:", e);
    return NextResponse.json({ error: "Ошибка сохранения черновика" }, { status: 500 });
  }
}
