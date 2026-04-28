export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

async function chatWithClaude(messages: ChatMessage[], systemPrompt?: string): Promise<ChatResponse> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  return {
    content: response.content[0].type === "text" ? response.content[0].text : "",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

async function chatWithOpenAI(messages: ChatMessage[], systemPrompt?: string): Promise<ChatResponse> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const allMessages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...messages,
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: allMessages,
  });

  return {
    content: response.choices[0].message.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

async function chatWithGemini(messages: ChatMessage[], systemPrompt?: string): Promise<ChatResponse> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history,
    systemInstruction: systemPrompt,
  });

  const last = messages[messages.length - 1].content;
  const result = await chat.sendMessage(last);
  const response = result.response;

  return {
    content: response.text(),
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function chatWithGroq(messages: ChatMessage[], systemPrompt?: string): Promise<ChatResponse> {
  const Groq = (await import("groq-sdk")).default;
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const allMessages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...messages,
  ];

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: allMessages,
  });

  return {
    content: response.choices[0].message.content ?? "",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}

async function chatWithMock(messages: ChatMessage[]): Promise<ChatResponse> {
  const last = messages[messages.length - 1].content;
  return {
    content: `Mock response to: "${last}"`,
    inputTokens: Math.ceil(last.length / 4),
    outputTokens: 20,
  };
}

export async function chat(messages: ChatMessage[], systemPrompt?: string): Promise<ChatResponse> {
  const provider = process.env.AI_PROVIDER ?? "mock";
  if (provider === "openai") return chatWithOpenAI(messages, systemPrompt);
  if (provider === "claude") return chatWithClaude(messages, systemPrompt);
  if (provider === "gemini") return chatWithGemini(messages, systemPrompt);
  if (provider === "groq") return chatWithGroq(messages, systemPrompt);
  return chatWithMock(messages);
}
