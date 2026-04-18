export interface TurnMetrics {
  recordingEnd: number;
  uploadComplete: number;
  llmFirstToken: number;
  ttsFirstChunk: number;
  firstAudioPlay: number;
}

export function createMetrics(): TurnMetrics {
  return {
    recordingEnd: 0,
    uploadComplete: 0,
    llmFirstToken: 0,
    ttsFirstChunk: 0,
    firstAudioPlay: 0,
  };
}

export function markOnce(metrics: TurnMetrics, key: keyof TurnMetrics): void {
  if (metrics[key] === 0) {
    metrics[key] = performance.now();
  }
}

export function firstAudioLatency(metrics: TurnMetrics): number | null {
  if (metrics.recordingEnd === 0 || metrics.firstAudioPlay === 0) {
    return null;
  }
  return metrics.firstAudioPlay - metrics.recordingEnd;
}
