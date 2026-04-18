import dotenv from "dotenv";
import * as path from "node:path";

// Load .env from repo root
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import * as readline from "node:readline";
import { initGemini, streamResponse, type Message } from "./gemini.js";
import { enqueue, setPlaybackRate, waitUntilIdle } from "./player.js";
import { startRecording, stopRecording } from "./recorder.js";
import { splitSentences } from "./sentenceSplitter.js";
import { initTts, synthesize, warmup } from "./tts.js";

function waitForEnter(prompt: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  const deepgramModel = process.env.DEEPGRAM_TTS_MODEL || "aura-2-izanami-ja";

  if (!geminiKey || !deepgramKey) {
    console.error("GEMINI_API_KEY and DEEPGRAM_API_KEY are required in .env");
    process.exit(1);
  }

  const playbackSpeed = Number(process.env.PLAYBACK_SPEED) || 1.3;

  initGemini(geminiKey, geminiModel);
  initTts(deepgramKey, deepgramModel);
  setPlaybackRate(playbackSpeed);

  console.log("\n  voice-cli - リアルタイム音声会話実験\n");
  console.log("  Gemini:", geminiModel);
  console.log("  TTS:", deepgramModel);
  console.log("  再生速度:", `${playbackSpeed}x`);

  // Warm up Deepgram connection to reduce first-call latency
  console.log("  Deepgram ウォームアップ中...");
  await warmup();
  console.log("  準備完了！ Ctrl+C で終了\n");

  const history: Message[] = [];

  while (true) {
    await waitForEnter("  [Enter] で録音開始...");

    console.log("  \u{1F534} 録音中... [Enter] で停止");
    startRecording();

    await waitForEnter("");

    const t0 = performance.now();
    const audio = stopRecording();
    console.log(`  録音完了 (${(audio.byteLength / 1024).toFixed(1)} KB)`);

    // Stream Gemini response
    process.stdout.write("\n  PM: ");
    let fullReply = "";
    let firstTokenTime = 0;
    let firstSentenceTime = 0;
    let firstTtsTime = 0;
    let firstPlayTime = 0;
    let sentenceCount = 0;

    // Chain: TTS calls fire in parallel with stream reading,
    // but enqueue in order by chaining on the previous promise
    let ttsChain = Promise.resolve();

    // Wrap stream to measure first token
    const rawStream = streamResponse(audio, history);
    const textStream = (async function* () {
      for await (const chunk of rawStream) {
        if (!firstTokenTime) {
          firstTokenTime = performance.now() - t0;
        }
        yield chunk;
      }
    })();
    const sentences = splitSentences(textStream);

    for await (const sentence of sentences) {
      sentenceCount++;
      const idx = sentenceCount;

      // Display text immediately
      fullReply += sentence;
      process.stdout.write(sentence);

      if (idx === 1) {
        firstSentenceTime = performance.now() - t0;
      }

      // Fire TTS immediately (parallel with continued stream reading)
      const ttsResult = synthesize(sentence).catch((err) => {
        console.error(`\n  TTS error (sentence ${idx}):`, err);
        return null;
      });

      // Chain enqueue to preserve order: wait for previous enqueue + this TTS
      ttsChain = ttsChain.then(async () => {
        const audioChunk = await ttsResult;
        if (audioChunk) {
          if (idx === 1) {
            firstTtsTime = performance.now() - t0;
          }
          enqueue(audioChunk);
          if (idx === 1) {
            firstPlayTime = performance.now() - t0;
          }
        }
      });
    }

    // Wait for all TTS to finish enqueueing (in order)
    await ttsChain;

    console.log("\n");

    // Update history
    history.push({ role: "user", text: "(音声入力)" });
    history.push({ role: "model", text: fullReply || "..." });

    // Wait for playback to finish
    await waitUntilIdle();

    // Latency report
    const totalMs = performance.now() - t0;
    console.log("  --- レイテンシ ---");
    if (firstTokenTime) console.log(`  Gemini TTFT: ${firstTokenTime.toFixed(0)} ms`);
    if (firstSentenceTime) console.log(`  初文完成:    ${firstSentenceTime.toFixed(0)} ms`);
    if (firstTtsTime) console.log(`  初TTS完了:   ${firstTtsTime.toFixed(0)} ms`);
    if (firstPlayTime) console.log(`  初再生開始:  ${firstPlayTime.toFixed(0)} ms`);
    console.log(`  合計:        ${totalMs.toFixed(0)} ms`);
    console.log();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
