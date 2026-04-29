import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addDocumentChunks } from "@/lib/chroma";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Replaces any character that isn't alphanumeric, dot, dash, or underscore
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;

  // Clamp chunk settings to safe ranges so the user can't break indexing
  const chunkSize = Math.max(100, Math.min(2000, Number(form.get("chunkSize")) || 512));
  const chunkOverlap = Math.max(0, Math.min(chunkSize - 1, Number(form.get("chunkOverlap")) || 64));

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "pdf" && ext !== "txt") {
    return NextResponse.json({ error: "Only PDF and TXT files are allowed" }, { status: 400 });
  }

  const safeFilename = sanitizeFilename(file.name);

  // Extract plain text from the file
  let content = "";
  if (ext === "txt") {
    content = await file.text();
  } else {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    content = result.text;
  }

  // Save document to DB first so upload succeeds even if Chroma is slow
  const doc = await prisma.document.create({
    data: {
      filename: safeFilename,
      content,
      userId: session.user.id,
    },
  });

  // Index chunks into Chroma in the background — errors are logged but don't fail the upload
  addDocumentChunks(doc.id, content, chunkSize, chunkOverlap).catch((err) =>
    console.error("Chroma indexing failed:", err)
  );

  return NextResponse.json({ id: doc.id, filename: doc.filename });
}
