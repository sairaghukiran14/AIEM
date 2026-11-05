/**
 * Rules for the exams that lead to certificates (track gates and the capstone).
 * Their questions and option order are fixed, so a failed attempt must not reveal the key, and retries are spaced out.
 */
export const EXAM_RETRY_SECONDS = 15 * 60;

/** Seconds left before another attempt is allowed, given when the latest failed attempt happened. */
export function retryWaitSeconds(lastFailedAt: Date | undefined | null, now: number): number {
  if (!lastFailedAt) return 0;
  return Math.max(0, Math.ceil(EXAM_RETRY_SECONDS - (now - lastFailedAt.getTime()) / 1000));
}

export function retryMessage(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return `You can retry in ${minutes} minute${minutes === 1 ? "" : "s"}. Use the time to revise what you missed.`;
}

type QuestionResult = { questionId: string; chosen: number | null; correct: boolean };

/** What a failed exam may show: which questions were right or wrong, with no correct answers or explanations. */
export function hideAnswers<T extends QuestionResult>(results: T[]): QuestionResult[] {
  return results.map(({ questionId, chosen, correct }) => ({ questionId, chosen, correct }));
}
