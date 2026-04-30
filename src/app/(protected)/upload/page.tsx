import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UploadClient from "./UploadClient";

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const docs = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, filename: true, createdAt: true },
  });

  return (
    <UploadClient
      initialDocs={docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
    />
  );
}
