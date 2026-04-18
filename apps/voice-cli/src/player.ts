import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const queue: Buffer[] = [];
let playing = false;
let resolveIdle: (() => void) | null = null;
let playbackRate = 1.0;

export function setPlaybackRate(rate: number): void {
  playbackRate = rate;
}

function playNext(): void {
  if (queue.length === 0) {
    playing = false;
    resolveIdle?.();
    resolveIdle = null;
    return;
  }

  playing = true;
  const audio = queue.shift()!;
  const tmpFile = path.join(os.tmpdir(), `kotoba-${Date.now()}.mp3`);
  fs.writeFileSync(tmpFile, audio);

  const args = [tmpFile];
  if (playbackRate !== 1.0) {
    args.push("-r", playbackRate.toString());
  }
  const proc = spawn("afplay", args, { stdio: "ignore" });
  proc.on("close", () => {
    fs.unlinkSync(tmpFile);
    playNext();
  });
}

export function enqueue(audio: Buffer): void {
  queue.push(audio);
  if (!playing) {
    playNext();
  }
}

export function waitUntilIdle(): Promise<void> {
  if (!playing && queue.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    resolveIdle = resolve;
  });
}
