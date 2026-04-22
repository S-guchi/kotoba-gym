import { palette } from "./theme";

export type RecordingUiState = "idle" | "recording" | "paused";
export type RecordingDialogueState = RecordingUiState | "done";
export type RecordingCharacterVariant =
  | "smile"
  | "nod"
  | "thinking"
  | "questioning";

export const coachProfile = {
  name: "コーチ",
  role: "Verbal Communication Coach",
} as const;

export const recordingDialogues: Record<RecordingDialogueState, string> = {
  idle: "お題を確認して、準備ができたら録音を開始してください。",
  recording: "……（聞いています。自分のペースで話して大丈夫です）",
  paused: "一旦止めましたね。送信するか、撮り直すか選んでください。",
  done: "ありがとうございます。解析します。",
};

export const recordingCharacterByState: Record<
  RecordingUiState,
  RecordingCharacterVariant
> = {
  idle: "smile",
  recording: "nod",
  paused: "thinking",
};

export const recordingCharacterVariants: Record<
  RecordingCharacterVariant,
  RecordingCharacterVariant
> = {
  smile: "smile",
  nod: "nod",
  thinking: "thinking",
  questioning: "questioning",
};

export const recordingColorByState: Record<RecordingUiState, string> = {
  idle: palette.accent,
  recording: palette.danger,
  paused: palette.accentWarm,
};

export function formatRecordingDuration(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

export function shouldShowSubmitButton(
  state: RecordingUiState,
  seconds: number,
) {
  return state === "paused" || (state === "recording" && seconds > 2);
}

export function resolveDialogueState(
  state: RecordingUiState,
  isSubmitting: boolean,
): RecordingDialogueState {
  if (isSubmitting) {
    return "done";
  }

  return state;
}
