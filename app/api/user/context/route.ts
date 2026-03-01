import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/context";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const token = auth?.replace("Bearer ", "").trim();
  if (!token) {
    return NextResponse.json({ context: {} });
  }

  const { prisma } = await import("@/lib/db");
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ context: {} });
  }

  const context = await getUserContext(session.userId);
  return NextResponse.json({ context, user: session.user });
}
