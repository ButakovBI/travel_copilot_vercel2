import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserContext } from "@/lib/context";
import { runCopilotV2 } from "@/lib/copilot/run-v2";
import { isResetContextRequest } from "@/lib/copilot/reset";
import { logCopilotAction } from "@/lib/copilot/action-log";
import { prisma } from "@/lib/db";

const postSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  token: z.string().optional(),
  sessionId: z.string().optional(),
  stream: z.boolean().optional(),
});

const encoder = new TextEncoder();

function ndjsonLine(obj: object): Uint8Array {
  return encoder.encode(JSON.stringify(obj) + "\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId, token, sessionId, stream: wantStream } = postSchema.parse(body);

    let userId: string | null = null;
    if (token) {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });
      if (session && session.expiresAt >= new Date()) userId = session.userId;
    }

    const userContext = await getUserContext(userId);

    const RESET_REPLY = "Контекст сброшен. Опишите, куда и как хотите поехать — подберу варианты перелётов, отелей и поездов.";
    if (isResetContextRequest(message)) {
      const newConv = await prisma.conversation.create({
        data: {
          userId: userId ?? undefined,
          sessionId: sessionId ?? undefined,
        },
        include: { messages: true },
      });
      const welcome = "Здравствуйте! Я AI Travel Copilot Т-Путешествий. Опишите, куда и как хотите поехать — подберу варианты перелётов, отелей и поездов. Можете написать в свободной форме. Буду уточнять детали по мере необходимости.";
      await prisma.message.create({ data: { conversationId: newConv.id, role: "assistant", content: welcome } });
      await prisma.message.create({ data: { conversationId: newConv.id, role: "user", content: message } });
      await prisma.message.create({ data: { conversationId: newConv.id, role: "assistant", content: RESET_REPLY } });
      const updated = await prisma.conversation.findUnique({
        where: { id: newConv.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })!;
      const messagesForClient = updated.messages.map((m: { role: string; content: string; offerCardsJson: string | null }) => ({
        role: m.role,
        content: m.content,
        offerCards: m.offerCardsJson ? (JSON.parse(m.offerCardsJson) as unknown) : undefined,
      }));
      if (wantStream) {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(ndjsonLine({ phase: "quick_reply" }));
            controller.enqueue(ndjsonLine({ done: true, conversationId: newConv.id, messages: messagesForClient, text: RESET_REPLY, offerCards: [] }));
            controller.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
      }
      return NextResponse.json({ text: RESET_REPLY, offerCards: [], conversationId: newConv.id, phase: "quick_reply", messages: messagesForClient });
    }

    let conv = conversationId
      ? await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : null;

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          userId: userId ?? undefined,
          sessionId: sessionId ?? undefined,
        },
        include: { messages: true },
      });
      const welcome = "Здравствуйте! Я AI Travel Copilot Т-Путешествий. Опишите, куда и как хотите поехать — подберу варианты перелётов, отелей и поездов. Можете написать в свободной форме. Буду уточнять детали по мере необходимости.";
      await prisma.message.create({
        data: { conversationId: conv.id, role: "assistant", content: welcome },
      });
      conv = await prisma.conversation.findUnique({
        where: { id: conv.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })!;
    }

    const history = conv.messages.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const apiMessages = [...history, { role: "user" as const, content: message }];

    await prisma.message.create({
      data: { conversationId: conv.id, role: "user", content: message },
    });

    await logCopilotAction(prisma, {
      userId: userId ?? undefined,
      sessionId: sessionId ?? undefined,
      conversationId: conv.id,
      action: "message_received",
      payload: { messageLength: message.length, messagePreview: message.slice(0, 100) },
    });

    const onLog = (action: string, payload: Record<string, unknown>) => {
      logCopilotAction(prisma, {
        userId: userId ?? undefined,
        sessionId: sessionId ?? undefined,
        conversationId: conv!.id,
        action,
        payload,
      }).catch(() => {});
    };

    if (wantStream) {
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const result = await runCopilotV2(apiMessages, userContext, {
              onPhase(phase) {
                controller.enqueue(ndjsonLine({ phase }));
              },
              onLog,
            });

            await prisma.message.create({
              data: {
                conversationId: conv!.id,
                role: "assistant",
                content: result.text,
                offerCardsJson: result.offerCards?.length ? JSON.stringify(result.offerCards) : null,
              },
            });

            const updated = await prisma.conversation.findUnique({
              where: { id: conv!.id },
              include: { messages: { orderBy: { createdAt: "asc" } } },
            });

            const messagesForClient = updated!.messages.map((m: { role: string; content: string; offerCardsJson: string | null }) => ({
              role: m.role,
              content: m.content,
              offerCards: m.offerCardsJson ? (JSON.parse(m.offerCardsJson) as unknown) : undefined,
            }));

            controller.enqueue(ndjsonLine({
              done: true,
              conversationId: conv!.id,
              messages: messagesForClient,
              text: result.text,
              offerCards: result.offerCards ?? [],
              tripContext: result.tripContext ?? undefined,
              onboardingProgress: result.onboardingProgress ?? undefined,
            }));
          } catch (err) {
            console.error("Copilot stream error:", err);
            controller.enqueue(ndjsonLine({ error: "Copilot временно недоступен." }));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "application/x-ndjson" },
      });
    }

    const result = await runCopilotV2(apiMessages, userContext, { onLog });

    await prisma.message.create({
      data: {
        conversationId: conv.id,
        role: "assistant",
        content: result.text,
        offerCardsJson: result.offerCards?.length ? JSON.stringify(result.offerCards) : null,
      },
    });

    const updated = await prisma.conversation.findUnique({
      where: { id: conv.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    const messagesForClient = updated!.messages.map((m: { role: string; content: string; offerCardsJson: string | null }) => ({
      role: m.role,
      content: m.content,
      offerCards: m.offerCardsJson ? (JSON.parse(m.offerCardsJson) as unknown) : undefined,
    }));

    return NextResponse.json({
      text: result.text,
      offerCards: result.offerCards ?? [],
      conversationId: conv.id,
      phase: result.phase ?? "results",
      messages: messagesForClient,
      tripContext: result.tripContext ?? undefined,
      onboardingProgress: result.onboardingProgress ?? undefined,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Неверный формат запроса", details: e.flatten() },
        { status: 400 }
      );
    }
    console.error("Copilot error:", e);
    return NextResponse.json(
      { error: "Copilot временно недоступен. Попробуйте позже или воспользуйтесь обычным поиском." },
      { status: 503 }
    );
  }
}
