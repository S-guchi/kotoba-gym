import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type PropsWithChildren,
} from "react";
import type { PreviousAttemptPayload } from "@kotoba-gym/core";

export interface RecordingPayload {
  sessionId: string;
  promptId: string;
  attemptNumber: number;
  audioUri: string;
  previousAttemptSummary?: string;
  previousEvaluation?: PreviousAttemptPayload;
}

interface RecordingContextValue {
  set: (payload: RecordingPayload) => void;
  consume: () => RecordingPayload | null;
}

const RecordingContext = createContext<RecordingContextValue>({
  set: () => {},
  consume: () => null,
});

export function RecordingProvider({ children }: PropsWithChildren) {
  const ref = useRef<RecordingPayload | null>(null);

  const set = useCallback((payload: RecordingPayload) => {
    ref.current = payload;
  }, []);

  const consume = useCallback(() => {
    const payload = ref.current;
    ref.current = null;
    return payload;
  }, []);

  return (
    <RecordingContext.Provider value={{ set, consume }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecordingPayload() {
  return useContext(RecordingContext);
}
