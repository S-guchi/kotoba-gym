import { describe, expect, test } from "vitest";
import { palette } from "./theme";
import {
  coachProfile,
  formatRecordingDuration,
  getRecordingColorByState,
  recordingCharacterByState,
  recordingDialogues,
  resolveDialogueState,
  shouldShowSubmitButton,
} from "./recording-screen-helpers";

describe.each([
  {
    name: "coach profile strings stay stable",
    expected: {
      name: "コーチ",
      role: "Verbal Communication Coach",
    },
  },
])("coachProfile", ({ expected }) => {
  test.each([{ label: "coach copy is stable" }])("$label", () => {
    expect(coachProfile).toEqual(expected);
  });
});

describe.each([
  {
    name: "formats under one minute",
    seconds: 7,
    expected: "00:07",
  },
  {
    name: "formats across minutes",
    seconds: 125,
    expected: "02:05",
  },
])("formatRecordingDuration", ({ seconds, expected }) => {
  test.each([{ label: "recording timer text is zero padded" }])(
    "$label",
    () => {
      expect(formatRecordingDuration(seconds)).toBe(expected);
    },
  );
});

describe.each([
  {
    name: "idle keeps smile portrait",
    state: "idle" as const,
    expectedCharacter: "smile",
    expectedColor: palette.accent,
  },
  {
    name: "recording switches to nod portrait",
    state: "recording" as const,
    expectedCharacter: "nod",
    expectedColor: palette.danger,
  },
  {
    name: "paused switches to thinking portrait",
    state: "paused" as const,
    expectedCharacter: "thinking",
    expectedColor: palette.accentWarm,
  },
])(
  "recording visual mappings",
  ({ state, expectedCharacter, expectedColor }) => {
    test.each([{ label: "state to portrait mapping is deterministic" }])(
      "$label",
      () => {
        expect(recordingCharacterByState[state]).toBe(expectedCharacter);
      },
    );

    test.each([{ label: "state to accent color mapping is deterministic" }])(
      "$label",
      () => {
        expect(getRecordingColorByState(palette)[state]).toBe(expectedColor);
      },
    );
  },
);

describe.each([
  {
    name: "recording shorter than threshold hides submit",
    state: "recording" as const,
    seconds: 2,
    expected: false,
  },
  {
    name: "recording longer than threshold shows submit",
    state: "recording" as const,
    seconds: 3,
    expected: true,
  },
  {
    name: "paused always shows submit",
    state: "paused" as const,
    seconds: 0,
    expected: true,
  },
  {
    name: "idle never shows submit",
    state: "idle" as const,
    seconds: 10,
    expected: false,
  },
])("shouldShowSubmitButton", ({ state, seconds, expected }) => {
  test.each([{ label: "submit CTA visibility follows state rules" }])(
    "$label",
    () => {
      expect(shouldShowSubmitButton(state, seconds)).toBe(expected);
    },
  );
});

describe.each([
  {
    name: "idle keeps idle dialogue",
    state: "idle" as const,
    isSubmitting: false,
    expected: recordingDialogues.idle,
  },
  {
    name: "paused keeps paused dialogue",
    state: "paused" as const,
    isSubmitting: false,
    expected: recordingDialogues.paused,
  },
  {
    name: "submitting overrides current state with done dialogue",
    state: "recording" as const,
    isSubmitting: true,
    expected: recordingDialogues.done,
  },
])("resolveDialogueState", ({ state, isSubmitting, expected }) => {
  test.each([{ label: "dialogue state is resolved deterministically" }])(
    "$label",
    () => {
      expect(
        recordingDialogues[resolveDialogueState(state, isSubmitting)],
      ).toBe(expected);
    },
  );
});
