import type { PrismaClient } from "@prisma/client";

export type ActionLogPayload = Record<string, unknown>;

export async function logCopilotAction(
  prisma: PrismaClient,
  data: {
    userId?: string | null;
    sessionId?: string | null;
    conversationId?: string | null;
    action: string;
    payload?: ActionLogPayload | null;
  }
): Promise<void> {
  try {
    await prisma.copilotActionLog.create({
      data: {
        userId: data.userId ?? undefined,
        sessionId: data.sessionId ?? undefined,
        conversationId: data.conversationId ?? undefined,
        action: data.action,
        payloadJson: data.payload ? JSON.stringify(data.payload) : undefined,
      },
    });
  } catch (e) {
    console.error("CopilotActionLog create error:", e);
  }
}
