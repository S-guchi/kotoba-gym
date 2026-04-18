type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export class InterimTranscript {
  private recognition: SpeechRecognition | null = null;
  private finalText = "";
  private interimText = "";

  constructor(private readonly onChange: (text: string) => void) {}

  get text(): string {
    return `${this.finalText}${this.interimText}`.trim();
  }

  start(): void {
    const SpeechRecognitionImpl = window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      this.onChange(
        "字幕表示はこのブラウザでは使えません。録音は続行できます。",
      );
      return;
    }

    this.finalText = "";
    this.interimText = "";
    this.recognition = new SpeechRecognitionImpl();
    this.recognition.lang = "ja-JP";
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results.item(i);
        const transcript = result.item(0)?.transcript ?? "";
        if (result.isFinal) {
          this.finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      this.interimText = interim;
      this.onChange(this.text || "聞いています。");
    };
    this.recognition.onerror = () => {
      this.onChange(
        this.text || "字幕の取得に失敗しました。録音は続行できます。",
      );
    };
    this.recognition.start();
  }

  stop(): string {
    this.recognition?.stop();
    this.recognition = null;
    const text = this.text;
    this.interimText = "";
    return text;
  }
}
