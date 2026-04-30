import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [sessions, documents] = await Promise.all([
    prisma.session.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, totalTokens: true },
    }),
    prisma.document.findMany({
      where: { userId: session.user.id },
      select: { id: true, filename: true },
    }),
  ]);

  return <ChatClient initialSessions={sessions} initialDocuments={documents} />;
}
