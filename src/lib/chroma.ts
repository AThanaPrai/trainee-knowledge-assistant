const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000";
const TENANT = "default_tenant";
const DATABASE = "default_database";
const COLLECTION = "knowledge_base"; // single shared collection for all documents
const CHUNK_SIZE = 512;   // default characters per chunk
const CHUNK_OVERLAP = 64; // characters shared between consecutive chunks
const EMBED_DIM = 128;    // vector size — more dims = more precision, more memory

const BASE = `${CHROMA_URL}/api/v2/tenants/${TENANT}/databases/${DATABASE}`;

// Converts text into a 128-number vector using word-frequency hashing (FNV-1a).
// Not semantic — similarity is based on shared keywords, not meaning.
function embed(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 1);
  const vec = new Array<number>(EMBED_DIM).fill(0);
  for (const word of words) {
    // FNV-1a hash: turns a word into a number
    let h = 2166136261; // FNV offset basis (fixed starting constant)
    for (let i = 0; i < word.length; i++) {
      h ^= word.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0; // FNV prime, >>> 0 keeps it 32-bit
    }
    vec[h % EMBED_DIM] += 1; // map the hash to a slot in our vector
  }
  // L2 normalize so vector length is always 1 (makes cosine similarity fair)
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

// Splits text into overlapping chunks so sentences cut at boundaries still have context
function chunkText(text: string, chunkSize = CHUNK_SIZE, chunkOverlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 20) chunks.push(chunk);
    if (end === text.length) break;
    start += chunkSize - chunkOverlap; // step forward minus overlap = shared region
  }
  return chunks;
}

// Gets (or creates) the Chroma collection and returns its internal ID
async function getCollectionId(): Promise<string> {
  const res = await fetch(`${BASE}/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: COLLECTION, get_or_create: true }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Chroma ${res.status}`);
  return (await res.json()).id as string;
}

// Called after upload: chunks the document and stores each chunk + its vector in Chroma
export async function addDocumentChunks(
  docId: string,
  content: string,
  chunkSize = CHUNK_SIZE,
  chunkOverlap = CHUNK_OVERLAP
): Promise<void> {
  const chunks = chunkText(content, chunkSize, chunkOverlap);
  if (chunks.length === 0) return;

  const collectionId = await getCollectionId();
  const res = await fetch(`${BASE}/collections/${collectionId}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ids: chunks.map((_, i) => `${docId}_${i}`),       // unique ID per chunk
      embeddings: chunks.map(embed),                     // vector for each chunk
      documents: chunks,                                 // original text (returned in query results)
      metadatas: chunks.map((_, i) => ({ docId, chunk: i })), // used to filter by document
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Chroma add ${res.status}: ${await res.text()}`);
}

export interface ChunkResult {
  documents: string[];
  sources: { docId: string; chunk: number }[];
}

// Finds the top-4 most relevant chunks for a query, optionally filtered to one document
export async function queryChunks(query: string, docId?: string): Promise<ChunkResult> {
  const collectionId = await getCollectionId();

  const body: Record<string, unknown> = {
    query_embeddings: [embed(query)], // embed the question the same way as documents
    n_results: 4,
    include: ["documents", "metadatas"],
  };
  if (docId) body.where = { docId: { $eq: docId } }; // filter to selected document only

  const res = await fetch(`${BASE}/collections/${collectionId}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return { documents: [], sources: [] };
  const data = await res.json();
  return {
    documents: (data.documents?.[0] as string[]) ?? [],
    sources: ((data.metadatas?.[0] ?? []) as { docId: string; chunk: number }[]).map((m) => ({
      docId: m.docId,
      chunk: m.chunk,
    })),
  };
}
