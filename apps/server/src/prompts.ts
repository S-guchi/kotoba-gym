import type {
  ConclusionsRequest,
  FeedbackRequest,
  OrganizeRequest,
  ScriptRequest,
  SpeechPlanRequest,
} from "@kotoba-gym/core";

export function buildTranscribePrompt() {
  return `
添付された音声を日本語で文字起こししてください。
ユーザーは「話す前に頭の中を整理する」ために雑に話しています。
きれいな文章に直しすぎず、整理の材料になる内容を残してください。

JSON shape:
{
  "text": "文字起こし結果"
}
`.trim();
}

export function buildOrganizePrompt(input: OrganizeRequest) {
  return `
次の未整理な入力を、話す前の材料に分解してください。
rawInput:
${input.rawInput}

JSON shape:
{
  "materials": {
    "title": "短い整理タイトル",
    "items": [
      {"key":"current","title":"現状","content":"...","placeholder":"まだはっきりしていません"},
      {"key":"issue","title":"困りごと","content":"...","placeholder":"ここはもう少し整理できそうです"},
      {"key":"background","title":"背景","content":"...","placeholder":"まだはっきりしていません"},
      {"key":"concern","title":"不安","content":"...","placeholder":"まだはっきりしていません"},
      {"key":"purpose","title":"目的","content":"...","placeholder":"まだはっきりしていません"},
      {"key":"request","title":"相談したいこと","content":"...","placeholder":"ここはもう少し整理できそうです"},
      {"key":"unclear","title":"まだ曖昧なこと","content":"...","placeholder":"まだはっきりしていません"}
    ]
  }
}
`.trim();
}

export function buildConclusionsPrompt(input: ConclusionsRequest) {
  return `
次の材料から「一番伝えたいこと」の候補を3つ作ってください。
rawInput: ${input.rawInput}
materials: ${JSON.stringify(input.materials)}
userHint: ${input.userHint ?? ""}

JSON shape:
{
  "candidates": [
    {"id":"conclusion-a","label":"A","text":"..."},
    {"id":"conclusion-b","label":"B","text":"..."},
    {"id":"conclusion-c","label":"C","text":"..."}
  ]
}
`.trim();
}

export function buildSpeechPlanPrompt(input: SpeechPlanRequest) {
  return `
次の材料と結論をもとに、相手に伝わりやすい順番を作ってください。
PREP法などの型の名前は前面に出さず、自然な説明順にしてください。
materials: ${JSON.stringify(input.materials)}
conclusion: ${JSON.stringify(input.conclusion)}

JSON shape:
{
  "speechPlan": {
    "title": "おすすめの伝え方",
    "lead": "この順番だと、相手が状況を理解しやすくなります。",
    "steps": [
      {"order":1,"title":"今の状況","content":"...","reason":"..."}
    ]
  }
}
`.trim();
}

export function buildScriptPrompt(input: ScriptRequest) {
  return `
次の整理内容を、30秒で話せる説明文にしてください。
丸読み前提ではなく、ユーザーが自分の言葉で練習できるキーワードも出してください。
materials: ${JSON.stringify(input.materials)}
conclusion: ${JSON.stringify(input.conclusion)}
speechPlan: ${JSON.stringify(input.speechPlan)}

JSON shape:
{
  "script": {
    "thirtySecond": "30秒説明文",
    "oneMinute": "任意の1分版",
    "slackMessage": "任意のSlack文面",
    "keywords": ["...", "..."]
  }
}
`.trim();
}

export function buildFeedbackPrompt(input: FeedbackRequest) {
  return `
次のリハーサルを、話し方ではなく説明構造としてレビューしてください。
点数を前面に出さず、良かった点、改善点、次の一言、Before/Afterを返してください。
rawInput: ${input.rawInput}
conclusion: ${JSON.stringify(input.conclusion)}
speechPlan: ${JSON.stringify(input.speechPlan)}
script: ${JSON.stringify(input.script)}
rehearsal: ${JSON.stringify(input.rehearsal)}

JSON shape:
{
  "feedback": {
    "positives": ["..."],
    "improvements": ["..."],
    "nextPhrase": "...",
    "before": "...",
    "after": "...",
    "structureLevel": 3
  }
}
`.trim();
}
