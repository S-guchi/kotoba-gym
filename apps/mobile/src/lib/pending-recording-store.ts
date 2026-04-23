export interface PendingRecordingPayload {
  sessionId: string;
  themeId: string;
  attemptNumber: number;
  audioUri: string;
}

const pendingRecordingStore = new Map<string, PendingRecordingPayload>();

export function savePendingRecordingPayload(payload: PendingRecordingPayload) {
  pendingRecordingStore.set(payload.sessionId, payload);
}

export function getPendingRecordingPayload(sessionId: string) {
  return pendingRecordingStore.get(sessionId) ?? null;
}

export function removePendingRecordingPayload(sessionId: string) {
  pendingRecordingStore.delete(sessionId);
}
