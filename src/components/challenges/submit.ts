export type SubmitResult = {
  ok: true;
  score: number;
  maxScore: number;
  passed: boolean;
  xpAwarded: number;
  attempt: number;
  lessonCompleted: boolean;
  trackCompleted: boolean;
  capstoneCompleted?: boolean;
  /** Certificates issued by this submission (empty unless a gate was just passed). */
  certificates?: { certId: string; kind: string; title: string }[];
  /** True when an earned certificate is waiting for the email address to be verified. */
  certificatesHeld?: boolean;
  /** True when this first pass earned no XP because the solution had been opened. */
  solutionViewed?: boolean;
  /** True when a failed gate or capstone keeps its correct answers hidden. */
  answersHidden?: boolean;
  retryMessage?: string;
  feedback: unknown;
};

/** Fetches a code challenge's reference solution. Opening it before passing forfeits that challenge's XP. */
export async function fetchSolution(challengeId: string): Promise<string> {
  const res = await fetch("/api/challenges/solution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not load the solution");
  return data.solution as string;
}

export async function submitChallenge(
  challengeId: string,
  answer: unknown
): Promise<SubmitResult> {
  const res = await fetch("/api/challenges/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, answer }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not submit");
  return data as SubmitResult;
}
