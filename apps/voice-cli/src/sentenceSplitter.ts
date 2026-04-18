const SENTENCE_ENDERS = /([。！？\n])/;

export async function* splitSentences(
  stream: AsyncIterable<string>,
): AsyncIterable<string> {
  let buffer = "";

  for await (const chunk of stream) {
    buffer += chunk;

    while (true) {
      const match = buffer.match(SENTENCE_ENDERS);
      if (!match || match.index === undefined) break;

      const sentence = buffer.slice(0, match.index + 1).trim();
      buffer = buffer.slice(match.index + 1);

      if (sentence) {
        yield sentence;
      }
    }
  }

  // Flush remaining
  const remaining = buffer.trim();
  if (remaining) {
    yield remaining;
  }
}
