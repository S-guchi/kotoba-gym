import * as fs from "node:fs";
import * as path from "node:path";
import { type LLMClient, createLLMClient } from "./llm/client.js";
import { generateFeedback } from "./llm/feedback.js";
import { evaluateChecklist, evaluateChecklistFromAudio } from "./llm/judge.js";
import {
  generateOpeningMessage,
  generatePMResponse,
  streamPMResponseFromAudio,
} from "./llm/persona.js";
import type {
  AcousticObservation,
  AudioTurnInput,
  AudioTurnResult,
  ChecklistItem,
  ConversationMessage,
  Feedback,
  SessionConfig,
  SessionSnapshot,
  SessionState,
  Topic,
} from "./types.js";

export class Session {
  private topic: Topic;
  private config: SessionConfig;
  private checklist: ChecklistItem[];
  private history: ConversationMessage[] = [];
  private acousticObservations: AcousticObservation[] = [];
  private turnCount = 0;
  private state: SessionState = "idle";
  private feedback: Feedback | null = null;
  private client: LLMClient;
  private startedAt: string;
  private endedAt: string | null = null;

  constructor(topic: Topic, config: SessionConfig) {
    this.topic = topic;
    this.config = config;
    this.checklist = topic.checklist.map((item) => ({ ...item }));
    this.client = createLLMClient(config.geminiApiKey, config.geminiModel);
    this.startedAt = new Date().toISOString();
  }

  async start(): Promise<{ openingMessage: string }> {
    if (this.state !== "idle") {
      throw new Error(`Cannot start session in state: ${this.state}`);
    }
    this.state = "active";

    const openingMessage = await generateOpeningMessage(
      this.topic,
      this.client,
      this.config.personaTemperature,
    );

    this.history.push({
      role: "pm",
      content: openingMessage,
      timestamp: new Date().toISOString(),
    });

    return { openingMessage };
  }

  async userSay(
    utterance: string,
  ): Promise<{ reply: string; checklist: ChecklistItem[]; isEnded: boolean }> {
    if (this.state !== "active") {
      throw new Error(`Cannot accept input in state: ${this.state}`);
    }

    this.history.push({
      role: "user",
      content: utterance,
      timestamp: new Date().toISOString(),
    });
    this.turnCount++;

    // Judge: チェックリスト評価
    const judgeResult = await evaluateChecklist({
      topic: this.topic,
      currentChecklist: this.checklist,
      history: this.history,
      latestUtterance: utterance,
      client: this.client,
      temperature: this.config.judgeTemperature,
    });

    // チェックリスト更新
    for (const update of judgeResult.updates) {
      const item = this.checklist.find((i) => i.id === update.id);
      if (item) {
        item.state = update.newState;
      }
    }

    // 終了判定
    const allFilled = this.checklist.every((item) => item.state === "filled");
    const maxTurnsReached = this.turnCount >= this.config.maxTurns;
    const isEnded = allFilled || maxTurnsReached;

    // PM返答生成
    const reply = await generatePMResponse({
      topic: this.topic,
      checklist: this.checklist,
      history: this.history,
      turnNumber: this.turnCount,
      maxTurns: this.config.maxTurns,
      client: this.client,
      temperature: this.config.personaTemperature,
    });

    this.history.push({
      role: "pm",
      content: reply,
      timestamp: new Date().toISOString(),
    });

    if (isEnded) {
      this.state = "ended";
      this.endedAt = new Date().toISOString();
    }

    return {
      reply,
      checklist: this.checklist.map((item) => ({ ...item })),
      isEnded,
    };
  }

  async finalize(): Promise<Feedback> {
    if (this.state !== "ended") {
      throw new Error(`Cannot finalize session in state: ${this.state}`);
    }

    this.feedback = await generateFeedback({
      topic: this.topic,
      finalChecklist: this.checklist,
      history: this.history,
      acousticObservations: this.acousticObservations,
      client: this.client,
      temperature: this.config.personaTemperature,
    });

    this.state = "finalized";
    this.saveLog();

    return this.feedback;
  }

  toJSON(): SessionSnapshot {
    return {
      topicId: this.topic.topicId,
      topicTitle: this.topic.topicTitle,
      config: {
        maxTurns: this.config.maxTurns,
        judgeTemperature: this.config.judgeTemperature,
        personaTemperature: this.config.personaTemperature,
        logDir: this.config.logDir,
        geminiModel: this.config.geminiModel,
      },
      checklist: this.checklist.map((item) => ({ ...item })),
      history: [...this.history],
      acousticObservations: this.acousticObservations.map((item) => ({
        ...item,
      })),
      turnCount: this.turnCount,
      state: this.state,
      feedback: this.feedback,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
    };
  }

  private saveLog(): void {
    const logDir = this.config.logDir;
    fs.mkdirSync(logDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${this.topic.topicId}_${timestamp}.json`;
    const filepath = path.join(logDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.toJSON(), null, 2), "utf-8");
  }

  startAudioTurn(input: AudioTurnInput): {
    replyStream: AsyncIterable<string>;
    done: Promise<AudioTurnResult>;
  } {
    if (this.state !== "active") {
      throw new Error(`Cannot accept input in state: ${this.state}`);
    }

    const priorHistory = [...this.history];
    const turnNumber = this.turnCount + 1;
    this.turnCount = turnNumber;

    const judgePromise = evaluateChecklistFromAudio({
      topic: this.topic,
      currentChecklist: this.checklist.map((item) => ({ ...item })),
      history: priorHistory,
      audio: input.audio,
      mimeType: input.mimeType,
      transcriptHint: input.transcriptHint,
      client: this.client,
      temperature: this.config.judgeTemperature,
    });

    const sourceStream = streamPMResponseFromAudio({
      topic: this.topic,
      checklist: this.checklist.map((item) => ({ ...item })),
      history: priorHistory,
      turnNumber,
      maxTurns: this.config.maxTurns,
      audio: input.audio,
      mimeType: input.mimeType,
      transcriptHint: input.transcriptHint,
      client: this.client,
      temperature: this.config.personaTemperature,
    });

    let reply = "";
    let resolveReply!: (value: string) => void;
    let rejectReply!: (reason: unknown) => void;
    const replyDone = new Promise<string>((resolve, reject) => {
      resolveReply = resolve;
      rejectReply = reject;
    });

    const replyStream = (async function* () {
      try {
        for await (const token of sourceStream) {
          reply += token;
          yield token;
        }
        resolveReply(reply);
      } catch (error) {
        rejectReply(error);
        throw error;
      }
    })();

    const done = Promise.all([judgePromise, replyDone]).then(
      ([judgeResult, finalReply]) => {
        const transcript =
          judgeResult.transcript?.trim() ||
          input.transcriptHint?.trim() ||
          "（音声発話）";

        this.history.push({
          role: "user",
          content: transcript,
          timestamp: new Date().toISOString(),
        });

        for (const update of judgeResult.updates) {
          const item = this.checklist.find((i) => i.id === update.id);
          if (item) {
            item.state = update.newState;
          }
        }

        this.acousticObservations.push(...judgeResult.acousticObservations);

        const allFilled = this.checklist.every(
          (item) => item.state === "filled",
        );
        const maxTurnsReached = this.turnCount >= this.config.maxTurns;
        const isEnded = allFilled || maxTurnsReached;

        this.history.push({
          role: "pm",
          content: finalReply,
          timestamp: new Date().toISOString(),
        });

        if (isEnded) {
          this.state = "ended";
          this.endedAt = new Date().toISOString();
        }

        return {
          reply: finalReply,
          transcript,
          checklist: this.checklist.map((item) => ({ ...item })),
          acousticObservations: this.acousticObservations.map((item) => ({
            ...item,
          })),
          isEnded,
        };
      },
    );

    return { replyStream, done };
  }
}
