/**
 * Key-term overlap for the mock interview. This is a prompt for self-review, not a grade:
 * it shows which distinctive words of a strong answer appear in the learner's own answer.
 */

const STOPWORDS = new Set(
  (
    "because before should without another rather instead usually however include includes including " +
    "specific whether between through during although actually already really simply further " +
    "different several something anything everything someone single multiple various certain " +
    "would could might their there these those about using while where which other every first second " +
    "still often again always never today around across within beyond almost enough maybe " +
    "needs needed means meant makes making takes taking gives given getting going doing being " +
    "answer question questions system systems approach"
  ).split(" ")
);

/** Cut common endings so "retries" matches "retry" and "indexed" matches "indexing". */
export function stem(word: string): string {
  let w = word.toLowerCase();
  // retries, retried -> retry; queries -> query
  if (w.length >= 6 && (w.endsWith("ies") || w.endsWith("ied"))) return w.slice(0, -3) + "y";
  for (const suffix of ["ing", "ed", "es", "ly", "s"]) {
    if (w.length - suffix.length >= 4 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w;
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [];
}

/** The most distinctive words of a strong answer: at least six letters, not common filler. */
export function keyTerms(answer: string, max = 8): string[] {
  const counts = new Map<string, { count: number; first: number; word: string }>();
  wordsOf(answer).forEach((word, i) => {
    if (word.length < 6 || STOPWORDS.has(word)) return;
    const key = stem(word);
    const hit = counts.get(key);
    if (hit) hit.count += 1;
    else counts.set(key, { count: 1, first: i, word });
  });
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.word.length - a.word.length || a.first - b.first)
    .slice(0, max)
    .map((t) => t.word);
}

export type Coverage = { used: string[]; missed: string[]; percent: number };

/** Which key terms the learner's answer mentions, matching on word stems. */
export function coverage(userAnswer: string, terms: string[]): Coverage {
  const stems = new Set(wordsOf(userAnswer).map(stem));
  const used = terms.filter((t) => stems.has(stem(t)));
  const missed = terms.filter((t) => !stems.has(stem(t)));
  return { used, missed, percent: terms.length === 0 ? 0 : Math.round((used.length / terms.length) * 100) };
}
