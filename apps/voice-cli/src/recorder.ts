import { spawn, type ChildProcess } from "node:child_process";

let recProcess: ChildProcess | null = null;
let chunks: Buffer[] = [];

export function startRecording(): void {
  chunks = [];
  // rec outputs wav: 8kHz mono 16bit (smaller = faster upload to Gemini)
  recProcess = spawn("rec", [
    "-q",           // quiet
    "-t", "wav",
    "-r", "8000",
    "-c", "1",
    "-b", "16",
    "-",            // output to stdout
  ]);

  recProcess.stdout?.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });

  recProcess.stderr?.on("data", () => {
    // suppress sox warnings
  });
}

export function stopRecording(): Buffer {
  if (recProcess) {
    recProcess.kill("SIGTERM");
    recProcess = null;
  }
  return Buffer.concat(chunks);
}
