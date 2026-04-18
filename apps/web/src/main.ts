import { AudioPlayer } from "./audioPlayer.js";
import { InterimTranscript } from "./interimTranscript.js";
import {
  type TurnMetrics,
  createMetrics,
  firstAudioLatency,
  markOnce,
} from "./metrics.js";
import { Recorder } from "./recorder.js";
import {
  type AcousticObservation,
  type ChecklistItem,
  postReply,
} from "./sseClient.js";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

interface Topic {
  topicId: string;
  topicTitle: string;
  checklist: ChecklistItem[];
}

interface SessionResponse {
  sessionId: string;
  openingMessage: string;
  topic: Topic;
  checklist: ChecklistItem[];
  maxTurns: number;
}

function mustQuery<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

const elements = {
  topicSelect: mustQuery<HTMLSelectElement>("#topicSelect"),
  newSessionButton: mustQuery<HTMLButtonElement>("#newSessionButton"),
  micButton: mustQuery<HTMLButtonElement>("#micButton"),
  micLabel: mustQuery<HTMLSpanElement>("#micLabel"),
  pmText: mustQuery<HTMLParagraphElement>("#pmText"),
  userText: mustQuery<HTMLParagraphElement>("#userText"),
  statusText: mustQuery<HTMLElement>("#statusText"),
  turnText: mustQuery<HTMLElement>("#turnText"),
  latencyText: mustQuery<HTMLElement>("#latencyText"),
  checklist: mustQuery<HTMLUListElement>("#checklist"),
  observations: mustQuery<HTMLUListElement>("#observations"),
  feedbackPanel: mustQuery<HTMLElement>("#feedbackPanel"),
  feedbackText: mustQuery<HTMLElement>("#feedbackText"),
};

const recorder = new Recorder();
const player = new AudioPlayer();
const transcript = new InterimTranscript((text) => {
  elements.userText.textContent = text;
});

let topics: Topic[] = [];
let session: SessionResponse | null = null;
let turnCount = 0;
let currentMetrics: TurnMetrics | null = null;
let speakBuffer = "";
let hasMarkedFirstAudio = false;
let speechChain: Promise<void> = Promise.resolve();

function setStatus(text: string): void {
  elements.statusText.textContent = text;
}

function renderChecklist(checklist: ChecklistItem[]): void {
  elements.checklist.replaceChildren(
    ...checklist.map((item) => {
      const li = document.createElement("li");
      li.dataset.state = item.state;
      li.textContent = `${item.label} / ${item.state}`;
      return li;
    }),
  );
}

function renderObservations(observations: AcousticObservation[]): void {
  if (observations.length === 0) {
    const li = document.createElement("li");
    li.textContent = "まだ観察はありません。";
    elements.observations.replaceChildren(li);
    return;
  }

  elements.observations.replaceChildren(
    ...observations.slice(-4).map((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.context}: ${item.note}`;
      return li;
    }),
  );
}

function updateTurnText(): void {
  const maxTurns = session?.maxTurns ?? 0;
  elements.turnText.textContent = `${turnCount} / ${maxTurns}`;
}

function updateLatency(): void {
  if (!currentMetrics) return;
  const latency = firstAudioLatency(currentMetrics);
  elements.latencyText.textContent =
    latency === null ? "--" : `${Math.round(latency)}ms`;
}

function extractSpeakableSegments(text: string): string[] {
  const segments: string[] = [];
  let rest = text;
  const boundary = /[。！？\n]/;

  while (boundary.test(rest)) {
    const match = boundary.exec(rest);
    if (!match || match.index < 0) break;
    const end = match.index + match[0].length;
    const segment = rest.slice(0, end).trim();
    if (segment) {
      segments.push(segment);
    }
    rest = rest.slice(end);
  }

  speakBuffer = rest;
  return segments;
}

async function enqueueSpeech(text: string): Promise<void> {
  if (!text.trim() || !currentMetrics) return;

  const response = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });

  markOnce(currentMetrics, "ttsFirstChunk");

  if (!response.ok) {
    throw new Error(`tts failed: ${response.status}`);
  }

  const blob = await response.blob();
  player.enqueue(blob, () => {
    if (!currentMetrics || hasMarkedFirstAudio) return;
    hasMarkedFirstAudio = true;
    markOnce(currentMetrics, "firstAudioPlay");
    updateLatency();
    console.log("turn metrics", currentMetrics);
  });
}

function enqueueSpeechInOrder(text: string): void {
  speechChain = speechChain
    .then(() => enqueueSpeech(text))
    .catch((error) => {
      setStatus(error instanceof Error ? error.message : "音声生成エラー");
    });
}

async function flushSpeechBuffer(): Promise<void> {
  const rest = speakBuffer.trim();
  speakBuffer = "";
  if (rest) {
    enqueueSpeechInOrder(rest);
  }
}

async function startSession(topicId?: string): Promise<void> {
  player.clear();
  setStatus("準備中");
  elements.feedbackPanel.hidden = true;
  elements.feedbackText.replaceChildren();
  elements.userText.textContent = "マイクを押して話してください。";
  elements.pmText.textContent = "セッションを準備しています。";

  const response = await fetch(`${API_BASE}/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ topicId: topicId ?? topics[0]?.topicId }),
  });

  if (!response.ok) {
    throw new Error(`session failed: ${response.status}`);
  }

  session = (await response.json()) as SessionResponse;
  turnCount = 0;
  elements.pmText.textContent = session.openingMessage;
  renderChecklist(session.checklist);
  renderObservations([]);
  updateTurnText();
  setStatus("待機中");
}

async function loadTopics(): Promise<void> {
  const response = await fetch(`${API_BASE}/topics`);
  if (!response.ok) {
    throw new Error(`topics failed: ${response.status}`);
  }
  const data = (await response.json()) as { topics: Topic[] };
  topics = data.topics;
  elements.topicSelect.replaceChildren(
    ...topics.map((topic) => {
      const option = document.createElement("option");
      option.value = topic.topicId;
      option.textContent = topic.topicTitle;
      return option;
    }),
  );
}

async function finalizeSession(): Promise<void> {
  if (!session) return;
  setStatus("フィードバック生成中");
  const response = await fetch(`${API_BASE}/finalize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: session.sessionId }),
  });

  if (!response.ok) {
    throw new Error(`finalize failed: ${response.status}`);
  }

  const data = await response.json();
  const feedback = data.feedback as {
    goodPoints: Array<{ quote: string; why: string }>;
    improvements: Array<{
      missingItemId: string;
      suggestionExample: string;
      why: string;
    }>;
    summary: string;
  };

  const content = document.createDocumentFragment();
  for (const point of feedback.goodPoints) {
    const p = document.createElement("p");
    p.textContent = `良かった点: 「${point.quote}」 ${point.why}`;
    content.append(p);
  }
  for (const item of feedback.improvements) {
    const p = document.createElement("p");
    p.textContent = `改善: ${item.why} 例「${item.suggestionExample}」`;
    content.append(p);
  }
  const summary = document.createElement("p");
  summary.textContent = feedback.summary;
  content.append(summary);

  elements.feedbackText.replaceChildren(content);
  elements.feedbackPanel.hidden = false;
  setStatus("完了");
}

async function stopAndSend(): Promise<void> {
  if (!session || !currentMetrics) return;

  elements.micButton.disabled = true;
  elements.micButton.classList.remove("is-recording");
  elements.micButton.setAttribute("aria-pressed", "false");
  elements.micLabel.textContent = "送信中";

  const hint = transcript.stop();
  const audio = await recorder.stop();
  markOnce(currentMetrics, "recordingEnd");
  setStatus("送信中");

  const formData = new FormData();
  formData.set("sessionId", session.sessionId);
  formData.set("transcriptHint", hint);
  formData.set("audio", audio, "utterance.webm");

  let pmText = "";
  speakBuffer = "";
  speechChain = Promise.resolve();
  hasMarkedFirstAudio = false;
  elements.pmText.textContent = "";

  await postReply(
    `${API_BASE}/reply`,
    formData,
    (event) => {
      if (event.type === "token") {
        if (currentMetrics?.llmFirstToken === 0) {
          markOnce(currentMetrics, "llmFirstToken");
          setStatus("返答中");
        }
        pmText += event.text;
        elements.pmText.textContent = pmText;
        speakBuffer += event.text;
        for (const segment of extractSpeakableSegments(speakBuffer)) {
          enqueueSpeechInOrder(segment);
        }
      }

      if (event.type === "done") {
        turnCount += 1;
        elements.userText.textContent = event.transcript;
        renderChecklist(event.checklist);
        renderObservations(event.acousticObservations);
        updateTurnText();
        void flushSpeechBuffer();
        setStatus(event.isEnded ? "終了処理中" : "待機中");
        if (event.isEnded) {
          void finalizeSession();
        }
      }

      if (event.type === "error") {
        throw new Error(event.message);
      }
    },
    () => {
      if (currentMetrics) {
        markOnce(currentMetrics, "uploadComplete");
      }
    },
  );

  elements.micButton.disabled = false;
  elements.micLabel.textContent = "録音する";
}

async function toggleRecording(): Promise<void> {
  if (!session) return;

  if (recorder.isRecording) {
    await stopAndSend();
    return;
  }

  if (player.isPlaying) {
    setStatus("PMの発話が終わるまで待機");
    return;
  }

  currentMetrics = createMetrics();
  elements.userText.textContent = "聞いています。";
  elements.micButton.classList.add("is-recording");
  elements.micButton.setAttribute("aria-pressed", "true");
  elements.micLabel.textContent = "停止する";
  setStatus("録音中");
  transcript.start();
  await recorder.start();
}

elements.micButton.addEventListener("click", () => {
  void toggleRecording().catch((error) => {
    setStatus(error instanceof Error ? error.message : "エラー");
    elements.micButton.disabled = false;
    elements.micButton.classList.remove("is-recording");
    elements.micLabel.textContent = "録音する";
  });
});

elements.newSessionButton.addEventListener("click", () => {
  void startSession(elements.topicSelect.value).catch((error) => {
    setStatus(error instanceof Error ? error.message : "エラー");
  });
});

void loadTopics()
  .then(() => startSession())
  .catch((error) => {
    setStatus(error instanceof Error ? error.message : "起動に失敗しました");
  });
