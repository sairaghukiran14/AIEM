export type SubmitResult = {
  ok: true;
  score: number;
  maxScore: number;
  passed: boolean;
  xpAwarded: number;
  attempt: number;
  lessonCompleted: boolean;
  trackCompleted: boolean;
  /** Certificates issued by this submission (empty unless a gate was just passed). */
  certificates?: { certId: string; kind: string; title: string }[];
  feedback: unknown;
};

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
