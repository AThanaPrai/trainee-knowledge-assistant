import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { chat } from "@/lib/ai";
import { queryChunks } from "@/lib/chroma";

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

    // Reuse existing session or create a new one (name = first 50 chars of message)
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

    // Load full conversation history so the AI has multi-turn context
    const history = await prisma.message.findMany({
      where: { sessionId: chatSession.id },
      orderBy: { createdAt: "asc" },
    });

    // RAG: retrieve relevant chunks from Chroma and build a system prompt with context.
    // Falls back to full document content if Chroma is unavailable.
    let systemPrompt: string | undefined;
    let sources: { filename: string; chunk: number; content: string }[] = [];
    try {
      const result = await queryChunks(message, documentId ?? undefined);
      if (result.documents.length > 0) {
        const context = result.documents.join("\n\n---\n\n");
        systemPrompt = `You are a helpful assistant. Use the following retrieved context to answer the user's question. If the context does not contain the answer, say so.\n\nContext:\n${context}`;

        // Resolve docIds to filenames for the citation UI
        const docIds = [...new Set(result.sources.map((s) => s.docId))];
        const docs = await prisma.document.findMany({
          where: { id: { in: docIds } },
          select: { id: true, filename: true },
        });
        const docMap = Object.fromEntries(docs.map((d) => [d.id, d.filename]));
        sources = result.sources.map((s, i) => ({
          filename: docMap[s.docId] ?? "Unknown",
          chunk: s.chunk,
          content: result.documents[i] ?? "",
        }));
      }
    } catch {
      // Chroma unavailable — fall back to full document content
      if (documentId) {
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (doc) {
          systemPrompt = `You are a helpful assistant. Answer questions based on this document:\n\n${doc.content}`;
        }
      }
    }

    // Save user message before calling AI (so it's in history on retry)
    await prisma.message.create({
      data: {
        role: "user",
        content: message,
        sessionId: chatSession.id,
      },
    });

    // Build message array: full history + current message
    const aiMessages = [
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    // Race the AI call against a 30s timeout to avoid hanging requests
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

    // Accumulate token count on the session for display in the sidebar
    await prisma.session.update({
      where: { id: chatSession.id },
      data: { totalTokens: { increment: totalTokens } },
    });

    return NextResponse.json({
      content: response.content,
      sessionId: chatSession.id,
      tokenUsage: totalTokens,
      sources, // chunk citations shown in the chat UI
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "AI request timed out" ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
