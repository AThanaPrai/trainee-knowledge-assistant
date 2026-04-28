import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { chat } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, sessionId, documentId } = await req.json();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    let chatSession = sessionId
      ? await prisma.session.findUnique({ where: { id: sessionId } })
      : null;

    if (!chatSession) {
      chatSession = await prisma.session.create({
        data: {
          name: message.slice(0, 50),
          userId: session.user.id,
        },
      });
    }

    const history = await prisma.message.findMany({
      where: { sessionId: chatSession.id },
      orderBy: { createdAt: "asc" },
    });

    let systemPrompt: string | undefined;
    if (documentId) {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (doc) {
        systemPrompt = `You are a helpful assistant. Answer questions based on this document:\n\n${doc.content}`;
      }
    }

    await prisma.message.create({
      data: {
        role: "user",
        content: message,
        sessionId: chatSession.id,
      },
    });

    const aiMessages = [
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    const response = await Promise.race([
      chat(aiMessages, systemPrompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI request timed out")), 30_000)
      ),
    ]);

    const totalTokens = response.inputTokens + response.outputTokens;

    await prisma.message.create({
      data: {
        role: "assistant",
        content: response.content,
        tokenUsage: totalTokens,
        sessionId: chatSession.id,
        documentId: documentId ?? null,
      },
    });

    await prisma.session.update({
      where: { id: chatSession.id },
      data: { totalTokens: { increment: totalTokens } },
    });

    return NextResponse.json({
      content: response.content,
      sessionId: chatSession.id,
      tokenUsage: totalTokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "AI request timed out" ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
