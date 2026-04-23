import { describe, expect, test } from "vitest";
import {
  getPendingRecordingPayload,
  removePendingRecordingPayload,
  savePendingRecordingPayload,
} from "./pending-recording-store";

describe.each([
  {
    name: "save and read payload",
    payload: {
      sessionId: "session-1",
      themeId: "theme-1",
      audioUri: "file:///tmp/1.m4a",
    },
  },
  {
    name: "overwrite existing payload for same session",
    payload: {
      sessionId: "session-1",
      themeId: "theme-2",
      audioUri: "file:///tmp/2.m4a",
    },
  },
])("pending recording store", ({ payload }) => {
  test.each([{ label: "payload is stored by session id" }])("$label", () => {
    savePendingRecordingPayload(payload);
    expect(getPendingRecordingPayload(payload.sessionId)).toEqual(payload);
  });
});

describe.each([{ sessionId: "session-1" }])(
  "removePendingRecordingPayload",
  ({ sessionId }) => {
    test.each([{ label: "payload is removed cleanly" }])("$label", () => {
      removePendingRecordingPayload(sessionId);
      expect(getPendingRecordingPayload(sessionId)).toBeNull();
    });
  },
);
