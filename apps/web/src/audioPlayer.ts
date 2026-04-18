export class AudioPlayer {
  private queue: Array<{ blob: Blob; onPlay?: () => void }> = [];
  private current: HTMLAudioElement | null = null;

  get isPlaying(): boolean {
    return this.current !== null || this.queue.length > 0;
  }

  enqueue(blob: Blob, onPlay?: () => void): void {
    this.queue.push({ blob, onPlay });
    if (!this.current) {
      this.playNext();
    }
  }

  clear(): void {
    this.queue = [];
    this.current?.pause();
    this.current = null;
  }

  private playNext(): void {
    const next = this.queue.shift();
    if (!next) {
      this.current = null;
      return;
    }

    const url = URL.createObjectURL(next.blob);
    const audio = new Audio(url);
    this.current = audio;
    audio.addEventListener(
      "play",
      () => {
        next.onPlay?.();
      },
      { once: true },
    );
    audio.addEventListener(
      "ended",
      () => {
        URL.revokeObjectURL(url);
        this.current = null;
        this.playNext();
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(url);
        this.current = null;
        this.playNext();
      },
      { once: true },
    );
    void audio.play();
  }
}
