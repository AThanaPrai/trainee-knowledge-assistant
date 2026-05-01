 # Knowledge Assistant

A web application that lets users upload documents and chat with an AI about their content.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), Tailwind CSS v4 |
| Backend | Next.js API Routes |
| Database | SQLite via Prisma ORM |
| Auth | NextAuth v5 (credentials + bcrypt) |
| AI | Groq (llama-3.1-8b-instant) — switchable to Claude, OpenAI, Gemini |
| Vector DB | Chroma (RAG with chunk retrieval and citations) |

## Setup & Run

### With Docker (recommended)

```bash
cp .env.example .env   # fill in your API keys
docker compose up
```

App will be available at http://localhost:3000
Login with: `admin` / `admin123`

### Local Development

```bash
npm install
npx prisma migrate reset --force   # sets up DB and seeds admin user
npm run dev
```

## Features Done

- [x] Login + Protected Routes (bcrypt, JWT session)
- [x] Chat with AI (multi-provider: Groq, Claude, OpenAI, Gemini)
- [x] File Upload (PDF, TXT — 10MB limit, filename sanitized)
- [x] Chat with Uploaded File Context
- [x] Token Usage Counter (per message + session total)
- [x] Conversation History (save/load sessions)
- [x] Markdown Rendering in AI responses
- [x] Docker Compose + Healthcheck
- [x] RAG with Vector DB (Chroma — chunk retrieval, citations, configurable chunk size/overlap)

## Architecture

```
src/
├── app/
│   ├── (auth)/login/        # login page
│   ├── (protected)/         # chat and upload pages (auth required)
│   └── api/                 # API routes: chat, upload, sessions, documents, health
├── lib/
│   ├── ai.ts                # AI provider abstraction (claude/openai/gemini/groq/mock)
│   ├── chroma.ts            # Chroma vector DB client (indexing, retrieval)
│   └── prisma.ts            # Prisma client singleton
└── auth.ts                  # NextAuth configuration
prisma/
├── schema.prisma            # User, Session, Message, Document models
└── seed.ts                  # Seeds admin user
```

Each protected page is split into a server component (`page.tsx`) and a client component (`ChatClient.tsx`, `UploadClient.tsx`). The server component handles auth checks and Prisma queries, then passes data as props to the client component which manages interactivity via React hooks.

Requests flow: browser → Next.js API route → Prisma (SQLite) + AI provider

## Environment Variables

```env
DATABASE_URL=file:./dev.db
AUTH_SECRET=your_secret
AI_PROVIDER=groq              # claude | openai | gemini | groq | mock
GROQ_API_KEY=your_key
ANTHROPIC_API_KEY=your_key    # optional
OPENAI_API_KEY=your_key       # optional
GEMINI_API_KEY=your_key       # optional
CHROMA_URL=http://localhost:8000  # vector DB (default for local dev)
```

## Business Scenario Video (Part 2)

[Watch video](https://drive.google.com/file/d/1DGnkSLfSnOQI41tNweMeQUhjl2BeiO9p/view?usp=sharing)

## Known Issues

- RAG uses keyword-frequency vectors (FNV-1a hashing), not semantic embeddings — retrieval quality is poor on documents with repetitive vocabulary (e.g. recipe books) where common words overwhelm specific keyword signals
- Groq model has limited Thai language accuracy

