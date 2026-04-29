"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Document {
  id: string;
  filename: string;
  createdAt: string;
}

export default function UploadPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(64);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchDocs() {
    const res = await fetch("/api/documents");
    if (res.ok) setDocs(await res.json());
  }

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => (res.ok ? res.json() : []))
      .then(setDocs);
  }, []);

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    const form = new FormData();
    form.append("file", file);
    form.append("chunkSize", String(chunkSize));
    form.append("chunkOverlap", String(chunkOverlap));
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (res.ok) {
      setStatus("success");
      setMessage(`"${file.name}" uploaded successfully.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      fetchDocs();
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus("error");
      setMessage(data.error ?? "Upload failed.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold text-blue-400">Upload Documents</h1>
          <Link href="/chat" className="ml-auto text-sm text-slate-400 hover:text-slate-200 transition-colors">
            ← Back to Chat
          </Link>
        </div>

        {/* Upload area */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <label className="block text-sm text-slate-400 mb-3">
            Select a PDF or TXT file
          </label>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setStatus("idle");
              setMessage("");
            }}
            className="block w-full text-sm text-slate-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:bg-blue-600 file:text-white
              file:cursor-pointer hover:file:bg-blue-700
              cursor-pointer"
          />
          {file && (
            <p className="mt-2 text-sm text-slate-400">
              Selected: <span className="text-slate-200">{file.name}</span>{" "}
              ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
          {/* Chunk settings */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Chunk Size (chars)</label>
              <input
                type="number"
                min={100}
                max={2000}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Chunk Overlap (chars)</label>
              <input
                type="number"
                min={0}
                max={chunkSize - 1}
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(Number(e.target.value))}
                className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || status === "uploading"}
            className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700
              disabled:bg-slate-600 disabled:cursor-not-allowed
              rounded-lg text-sm font-medium transition-colors"
          >
            {status === "uploading" ? "Uploading…" : "Upload"}
          </button>

          {message && (
            <p className={`mt-3 text-sm ${status === "success" ? "text-green-400" : "text-red-400"}`}>
              {message}
            </p>
          )}
        </div>

        {/* Documents list */}
        <div>
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Uploaded Documents ({docs.length})
          </h2>
          {docs.length === 0 ? (
            <p className="text-slate-500 text-sm">No documents yet.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li key={doc.id} className="bg-slate-800 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-slate-200">{doc.filename}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
