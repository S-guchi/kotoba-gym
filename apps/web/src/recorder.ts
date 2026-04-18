export class Recorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];

  get isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });
    this.mediaRecorder.start();
  }

  stop(): Promise<Blob> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") {
      return Promise.reject(new Error("Recorder is not recording"));
    }

    const recorder = this.mediaRecorder;

    return new Promise((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          const blob = new Blob(this.chunks, {
            type: recorder.mimeType || "audio/webm",
          });
          this.cleanup();
          resolve(blob);
        },
        { once: true },
      );
      recorder.stop();
    });
  }

  private cleanup(): void {
    for (const track of this.stream?.getTracks() ?? []) {
      track.stop();
    }
    this.stream = null;
    this.mediaRecorder = null;
  }
}
