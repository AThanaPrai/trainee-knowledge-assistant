"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokenUsage: number;
}

interface ChatSession {
  id: string;
  name: string;
  totalTokens: number;
}

interface Document {
  id: string;
  filename: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
    fetchDocuments();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchSessions() {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions(await res.json());
  }

  async function fetchDocuments() {
    const res = await fetch("/api/documents");
    if (res.ok) setDocuments(await res.json());
  }

  async function loadSession(sessionId: string) {
    setCurrentSessionId(sessionId);
    const res = await fetch(`/api/sessions/${sessionId}/messages`);
    if (res.ok) setMessages(await res.json());
  }

  async function newChat() {
    setCurrentSessionId(null);
    setMessages([]);
    setSelectedDocId(null);
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userMessage, tokenUsage: 0 },
    ]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        sessionId: currentSessionId,
        documentId: selectedDocId,
      }),
    });

    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      setCurrentSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        { id: data.sessionId + Date.now(), role: "assistant", content: data.content, tokenUsage: data.tokenUsage },
      ]);
      fetchSessions();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 flex flex-col border-r border-slate-700">
        <div className="p-4 border-b border-slate-700">
          <h1 className="font-bold text-lg text-blue-400">Knowledge Assistant</h1>
        </div>

        <div className="p-3">
          <button
            onClick={newChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium"
          >
            + New Chat
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3">
          <p className="text-xs text-slate-400 uppercase mb-2">Chat History</p>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 truncate ${
                currentSessionId === s.id
                  ? "bg-slate-600 text-white"
                  : "hover:bg-slate-700 text-slate-300"
              }`}
            >
              <div className="truncate">{s.name}</div>
              <div className="text-xs text-slate-400">{s.totalTokens} tokens</div>
            </button>
          ))}
        </div>

        {/* Documents */}
        <div className="px-3 pb-3 border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-400 uppercase mb-2">Documents</p>
          {documents.length === 0 && (
            <p className="text-xs text-slate-500">No documents uploaded</p>
          )}
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDocId(selectedDocId === doc.id ? null : doc.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 truncate ${
                selectedDocId === doc.id
                  ? "bg-blue-700 text-white"
                  : "hover:bg-slate-700 text-slate-300"
              }`}
            >
              {doc.filename}
            </button>
          ))}
          <button
            onClick={() => router.push("/upload")}
            className="w-full mt-2 text-blue-400 hover:text-blue-300 text-sm py-1"
          >
            + Upload Document
          </button>
        </div>

        {/* Sign out */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-slate-400 hover:text-slate-200 text-sm py-1"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              {currentSession ? currentSession.name : "New Chat"}
            </h2>
            {currentSession && (
              <p className="text-xs text-slate-400">{currentSession.totalTokens} tokens used</p>
            )}
          </div>
          {selectedDocId && (
            <div className="text-xs bg-blue-700 px-3 py-1 rounded-full">
              {documents.find((d) => d.id === selectedDocId)?.filename}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 mt-20">
              <p className="text-lg">Start a conversation</p>
              <p className="text-sm mt-2">
                {selectedDocId ? "Chatting with document" : "Select a document from sidebar or just chat"}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-slate-700 text-slate-100 rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "assistant" && msg.tokenUsage > 0 && (
                  <p className="text-xs text-slate-500 mt-1 px-1">{msg.tokenUsage} tokens</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-slate-400">
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              rows={1}
              className="flex-1 bg-slate-700 text-slate-100 placeholder-slate-400 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl text-sm font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
