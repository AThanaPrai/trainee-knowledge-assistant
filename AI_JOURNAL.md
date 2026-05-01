# AI Usage Journal

## Session 1: Planning the project stack
**Prompt:** Asked Claude to help decide on tech stack for the knowledge assistant
**AI Response:** Suggested Next.js App Router, Prisma with SQLite, NextAuth v5, and Tailwind CSS
**My Adjustment:** I decide to use chroma as a vector database

## Session 2: Setting up Prisma schema
**Prompt:** Asked how to design the database schema for users, sessions, messages, and documents
**AI Response:** Suggested User, Session, Message, Document models with relations
**My Adjustment:** -

## Session 3: Implementing login page
**Prompt:** Asked how to build a login form with NextAuth credentials provider
**AI Response:** Provided the form structure and signIn() call with redirect: false
**My Adjustment:** -

## Session 4: Building chat UI
**Prompt:** Asked for help designing the chat page with sidebar and message bubbles
**AI Response:** Suggested sidebar layout with sessions/docs list and chat area
**My Adjustment:** adjusting layout

## Session 5: Setting up AI provider abstraction
**Prompt:** Asked how to support multiple AI providers (Claude, OpenAI, Gemini)
**AI Response:** Suggested a chat() function that switches on AI_PROVIDER env variable
**My Adjustment:** -

## Session 6: Debugging Gemini quota error
**Prompt:** Gemini returning 429 quota exceeded, asked how to fix
**AI Response:** Suggested switching model or using a different provider
**My Adjustment:** Use Groq instead

## Session 7: Debugging database path issue
**Prompt:** Seed runs successfully but Prisma Studio shows 0 users
**AI Response:** Explained that SQLite paths in DATABASE_URL are relative to schema.prisma location
**My Adjustment:** change path of DATABASE_URL in .env

## Session 8: Building upload page UI
**Prompt:** Asked for upload page with file picker, upload button, and document list
**AI Response:** Provided the component with FormData POST and fetchDocs refresh
**My Adjustment:** add some style

## Session 9: Fixing pdf-parse import in Next.js
**Prompt:** pdf-parse throwing worker error in Next.js
**AI Response:** Suggested adding serverExternalPackages in next.config.ts
**My Adjustment:** -

## Session 10: Adding file validation
**Prompt:** Asked how to add file size limit and filename sanitization to upload
**AI Response:** Suggested MAX_FILE_SIZE constant and regex-based sanitizeFilename function
**My Adjustment:** Chose 10MB limit. It is enough for typical PDF and TXT file. Small enough to avoid memory issues during parsing

## Session 11: Adding markdown rendering
**Prompt:** Asked how to render markdown in AI responses
**AI Response:** Suggested react-markdown with @tailwindcss/typography prose classes
**My Adjustment:** -

## Session 12: Setting up Docker Compose
**Prompt:** Asked how to containerize the Next.js app with Docker Compose
**AI Response:** Suggested Dockerfile with multi-stage build and docker-compose.yml with Chroma service
**My Adjustment:** Have to fix DockerDestop installation problem by create docker folder as administrator

## Session 13: Adding CORS headers
**Prompt:** Asked what CORS is and how to add it to Next.js API routes
**AI Response:** Explained CORS and suggested using headers() in next.config.ts
**My Adjustment:** -

## Session 14: Chat timeout and error handling
**Prompt:** Asked how to add a timeout to AI API calls
**AI Response:** Suggested Promise.race() with a setTimeout reject
**My Adjustment:** Chose 30s timeout — AI responses can take several seconds especially with long context, but 30s is long enough to avoid false timeouts

## Session 15: Implementing RAG with Chroma
**Prompt:** Asked how to implement RAG using Chroma vector DB for document retrieval
**AI Response:** Suggested chunking documents on upload, storing embeddings in Chroma, querying relevant chunks at chat time and injecting them as a system prompt
**My Adjustment:** as a default I set chunk size 512 and chunk overlap 64. But when I upload Thai file I double it manually.

## Session 16: Adding citations to RAG responses
**Prompt:** Asked how to show which document chunks were used to answer a question
**AI Response:** Suggested returning source metadata (docId, chunk index) from Chroma and resolving filenames from Prisma
**My Adjustment:** Display citation under AI response bubble.

## Session 17: Fixing Prisma OpenSSL error on Alpine Docker
**Prompt:** Prisma failing inside Docker with "Error loading shared library libssl.so.1.1"
**AI Response:** Explained that Alpine uses OpenSSL 3.x but Prisma defaults to 1.1.x — fix by adding openssl to apk and setting binaryTargets in schema.prisma
**My Adjustment:** Added openssl to Dockerfile apk install and set binaryTargets = ["native", "linux-musl-openssl-3.0.x"] in schema.prisma

## Session 18: Fixing NextAuth UntrustedHost error in Docker
**Prompt:** NextAuth throwing UntrustedHost error when trying to login inside Docker
**AI Response:** Explained that NextAuth v5 enforces host validation in production — fix by setting trustHost: true in the auth config
**My Adjustment:** Added trustHost: true to NextAuth config in auth.ts

## Session 19: Renaming middleware to proxy for Next.js 16
**Prompt:** Next.js 16 showing deprecation warning about middleware.ts file convention
**AI Response:** Explained that Next.js 16 renamed the convention from middleware.ts to proxy.ts
**My Adjustment:** Renamed src/middleware.ts to src/proxy.ts

## Session 20: Fixing RAG querying Chroma without a document selected
**Prompt:** Chat showed "Unknown" citations even when no document was uploaded
**AI Response:** Identified that queryChunks was called on every message regardless of whether a document was selected, returning stale chunks from the vector DB
**My Adjustment:** Added a guard so Chroma is only queried when a documentId is explicitly provided

## Session 21: Refactoring chat and upload into server/client components
**Prompt:** Asked how to separate the chat and upload pages into server and client components following Next.js App Router conventions
**AI Response:** Suggested keeping page.tsx as a server component to handle auth checks and Prisma queries, then passing the fetched data as props to a separate client component (ChatClient.tsx / UploadClient.tsx) that handles all interactivity with React hooks
**My Adjustment:** Kept auth check and Prisma queries (sessions, documents) on the server in page.tsx — these run once at page load and never touch the browser. Moved everything interactive to ChatClient.tsx and UploadClient.tsx — message state, session switching, file selection, and all event handlers. The split felt natural because the boundary was clear: server owns data fetching, client owns user interaction.
