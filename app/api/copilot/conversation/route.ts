import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get("conversationId");
  const token = request.nextUrl.searchParams.get("token");
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (conversationId) {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conv) return NextResponse.json({ error: "Диалог не найден" }, { status: 404 });
    const messages = conv.messages.map((m) => ({
      role: m.role,
      content: m.content,
      offerCards: m.offerCardsJson ? (JSON.parse(m.offerCardsJson) as unknown) : undefined,
    }));
    return NextResponse.json({ conversationId: conv.id, messages });
  }

  let userId: string | null = null;
  if (token) {
    const session = await prisma.session.findUnique({ where: { token } });
    if (session && session.expiresAt >= new Date()) userId = session.userId;
  }

  const where = userId ? { userId } : sessionId ? { sessionId } : null;
  if (!where) return NextResponse.json({ conversationId: null, messages: [] });

  const conv = await prisma.conversation.findFirst({
    where,
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conv) return NextResponse.json({ conversationId: null, messages: [] });

  const messages = conv.messages.map((m) => ({
    role: m.role,
    content: m.content,
    offerCards: m.offerCardsJson ? (JSON.parse(m.offerCardsJson) as unknown) : undefined,
  }));

  return NextResponse.json({ conversationId: conv.id, messages });
}
