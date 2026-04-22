import { beforeEach, describe, expect, test } from "vitest";
import {
  getPendingRecordingPayload,
  removePendingRecordingPayload,
  savePendingRecordingPayload,
} from "./pending-recording-store";

const payload1 = {
  sessionId: "session-1",
  promptId: "prompt-1",
  attemptNumber: 1,
  audioUri: "file:///tmp/attempt-1.m4a",
};

const payload2 = {
  sessionId: "session-2",
  promptId: "prompt-2",
  attemptNumber: 2,
  audioUri: "file:///tmp/attempt-2.m4a",
};

beforeEach(() => {
  removePendingRecordingPayload(payload1.sessionId);
  removePendingRecordingPayload(payload2.sessionId);
});

describe.each([
  {
    name: "save and read by session id",
    writes: [payload1],
    sessionId: payload1.sessionId,
    expected: payload1,
  },
  {
    name: "multiple sessions stay isolated",
    writes: [payload1, payload2],
    sessionId: payload2.sessionId,
    expected: payload2,
  },
])("pending recording store reads", ({ writes, sessionId, expected }) => {
  test.each([{ label: "payload lookup is stable" }])("$label", () => {
    writes.forEach((payload) => savePendingRecordingPayload(payload));

    expect(getPendingRecordingPayload(sessionId)).toEqual(expected);
  });
});

describe.each([
  {
    name: "removed payload is no longer available",
    payload: payload1,
  },
])("pending recording store removal", ({ payload }) => {
  test.each([{ label: "remove clears one session payload" }])("$label", () => {
    savePendingRecordingPayload(payload);
    removePendingRecordingPayload(payload.sessionId);

    expect(getPendingRecordingPayload(payload.sessionId)).toBeNull();
  });
});
