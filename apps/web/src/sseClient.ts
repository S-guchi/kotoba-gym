export type ReplyEvent =
  | { type: "token"; text: string }
  | {
      type: "done";
      transcript: string;
      checklist: ChecklistItem[];
      acousticObservations: AcousticObservation[];
      isEnded: boolean;
    }
  | { type: "error"; message: string };

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  state: "empty" | "partial" | "filled";
}

export interface AcousticObservation {
  type:
    | "filler"
    | "long_pause"
    | "unclear_pronunciation"
    | "confident"
    | "hesitant";
  context: string;
  note: string;
}

export async function postReply(
  url: string,
  formData: FormData,
  onEvent: (event: ReplyEvent) => void,
  onOpen?: () => void,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  onOpen?.();

  if (!response.ok || !response.body) {
    throw new Error(`reply failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const rawEvent of events) {
      const data = rawEvent
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6);
      if (data) {
        onEvent(JSON.parse(data) as ReplyEvent);
      }
    }
  }
}
