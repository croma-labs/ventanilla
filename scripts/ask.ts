export type Diagnostics = {
  route?: { authorities: string[] };
  considered?: number;
  kept?: { url: string; score: number; authority: boolean; read: boolean }[];
  checks?: { claim: string; status: string }[];
  timings?: Record<string, number>;
};

export type Grounding = { title: string; url: string };

export type Reply = { answer: string; sources: Grounding[]; metadata: { verified?: boolean; diagnostics?: Diagnostics }; ms: number };

export const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");
export const under = (url: string, domain: string) => host(url) === domain || host(url).endsWith(`.${domain}`);

async function once(base: string, key: string, question: string): Promise<Reply> {
  const started = Date.now();
  const response = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-eval-key": key },
    body: JSON.stringify({ messages: [{ role: "user", text: question }] }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  let answer = "";
  let sources: Grounding[] = [];
  let metadata: Reply["metadata"] = {};
  for (const block of (await response.text()).split("\n\n")) {
    if (!block.startsWith("data: ") || block === "data: [DONE]") continue;
    const chunk = JSON.parse(block.slice(6));
    if (chunk.type === "text-delta") answer += chunk.delta;
    if (chunk.type === "data-search") sources = chunk.data.groundings.map(({ title, url }: Grounding) => ({ title, url }));
    if (chunk.type === "finish") metadata = chunk.messageMetadata ?? {};
  }
  return { answer, sources, metadata, ms: Date.now() - started };
}

export async function ask(base: string, key: string, question: string, retries = 1): Promise<Reply> {
  try {
    return await once(base, key, question);
  } catch (error) {
    const network = error instanceof TypeError && /fetch failed|terminated/.test(error.message);
    if (network && retries > 0) return ask(base, key, question, retries - 1);
    throw error;
  }
}
