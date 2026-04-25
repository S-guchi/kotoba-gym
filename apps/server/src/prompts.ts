import type { FeedbackRequest, OrganizePackageRequest } from "@kotoba-gym/core";

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

export function buildOrganizePackagePrompt(input: OrganizePackageRequest) {
  return `
次の未整理な入力から、話す前に必要な整理結果一式を作ってください。
ユーザーが最初に知りたいのは分析過程ではなく「結局どう言えばいいか」です。
結論は3候補を作り、その中から最も自然で相談につながりやすいものを selectedConclusion に入れてください。
30秒スクリプトは丸読み前提ではなく、ユーザーが自分の言葉で練習しやすい自然な説明にしてください。
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
  },
  "conclusionCandidates": [
    {"id":"conclusion-a","label":"A","text":"..."},
    {"id":"conclusion-b","label":"B","text":"..."},
    {"id":"conclusion-c","label":"C","text":"..."}
  ],
  "selectedConclusion": {"id":"conclusion-a","label":"A","text":"..."},
  "speechPlan": {
    "title": "おすすめの伝え方",
    "lead": "この順番だと、相手が状況を理解しやすくなります。",
    "steps": [
      {"order":1,"title":"今の状況","content":"...","reason":"..."}
    ]
  },
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
次のリハーサルを、声の良し悪しではなく説明構造としてレビューしてください。
特に、結論が明確か、話す順番が崩れていないか、背景が長すぎないか、具体性があるか、相談事項が明確かを見てください。
点数を前面に出さず、良かった点、改善点、次の一言、Before/Afterを返してください。
rawInput: ${input.rawInput}
materials: ${JSON.stringify(input.materials)}
conclusion: ${JSON.stringify(input.conclusion)}
speechPlan: ${JSON.stringify(input.speechPlan)}
script: ${JSON.stringify(input.script)}
spokenText: ${input.rehearsal.spokenText}
durationSeconds: ${input.rehearsal.durationSeconds}

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
