export type Grounding = { title: string; url: string; currency: "verified" | "unverified" };

export type SearchData = { status: "searching" | "done"; groundings: Grounding[]; resultCount?: number };

export type MessageMetadata = { answerComplete?: boolean; followUpSuggestions?: string[]; signature?: string; verified?: boolean; conversational?: boolean; diagnostics?: unknown };

export type UiChunk =
  | { type: "start"; messageId: string }
  | { type: "start-step" | "finish-step" }
  | { type: "data-search"; id: string; data: SearchData }
  | { type: "text-start" | "text-end"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "message-metadata"; messageMetadata: MessageMetadata }
  | { type: "error"; errorText: string }
  | { type: "finish"; finishReason: string; messageMetadata?: MessageMetadata };

export type Turn = { role: "user"; text: string } | { role: "assistant"; text: string; signature?: string };

export async function* readUiMessageStream(response: Response): AsyncGenerator<UiChunk> {
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += value;
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const data = event
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n");
      if (data && data !== "[DONE]") yield JSON.parse(data) as UiChunk;
    }
  }
}
