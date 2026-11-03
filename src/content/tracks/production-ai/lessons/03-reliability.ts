import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "reliability-rate-limits-retries",
  order: 3,
  title: "Reliability: Rate Limits & Retries",
  summary:
    "Provider APIs fail, throttle and slow down. Learn which errors to retry, how to back off, and how to degrade gracefully instead of falling over.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Your application depends on a remote service you do not control. It will sometimes return errors, tell you to slow down, time out, or have a bad hour. **Reliability engineering** for LLM apps means expecting that, retrying the right failures in the right way, protecting the provider and yourself from retry storms, and having somewhere to fall back to.",
    },
    {
      type: "sorter",
      title: "Retry or not?",
      prompt: "Decide whether each failure is worth retrying.",
      categories: ["Retry with backoff", "Do not retry"],
      items: [
        { text: "HTTP 429: rate limit exceeded", answer: 0, why: "Transient. Wait (honouring Retry-After) and try again." },
        { text: "HTTP 503: the service is temporarily overloaded", answer: 0, why: "Transient server-side trouble that often clears." },
        { text: "HTTP 400: the request is malformed", answer: 1, why: "The same request will fail the same way. Fix it, do not repeat it." },
        { text: "HTTP 401: the API key is invalid", answer: 1, why: "Retrying cannot fix authentication." },
        { text: "Context length exceeded", answer: 1, why: "A deterministic failure of this input. Shorten the prompt instead." },
      ],
    },
    {
      type: "stepper",
      title: "Exponential backoff with jitter",
      steps: [
        { label: "First failure: a short wait", detail: "Wait a small base delay, for example 500 ms, then retry. Many transient errors clear in moments.", items: ["wait 0.5 s"], mark: [0] },
        { label: "Keep failing: double the wait", detail: "Each further failure doubles the delay: 1 s, 2 s, 4 s. This gives a struggling service room to recover instead of hammering it.", items: ["0.5 s", "1 s", "2 s", "4 s"], mark: [1, 2, 3] },
        { label: "Cap the delay", detail: "Set a maximum so a long outage does not produce absurd waits, for example 30 s, and a maximum number of attempts so the caller eventually gets an error.", items: ["cap 30 s", "max 5 attempts"], mark: [0, 1] },
        { label: "Add jitter", detail: "Randomise each wait (for example choose a random value between 0 and the computed delay). Without it, many clients that failed together retry together and cause another spike.", items: ["random in [0, delay]"], mark: [0] },
        { label: "Honour Retry-After", detail: "If the server tells you how long to wait, wait at least that long. It knows its own recovery time better than your formula.", items: ["Retry-After: 7 -> wait 7 s"], mark: [0] },
      ],
      caption: "Backoff protects the provider, jitter protects you from synchronised retries.",
    },
    {
      type: "calculator",
      title: "How long can a retry loop wait?",
      inputs: [
        { key: "base", label: "Base delay", min: 100, max: 5000, step: 100, value: 500, unit: "ms" },
        { key: "attempts", label: "Maximum attempts", min: 1, max: 10, step: 1, value: 5 },
        { key: "cap", label: "Delay cap", min: 1000, max: 120000, step: 1000, value: 30000, unit: "ms" },
      ],
      outputs: [
        { label: "Delay before the last retry", formula: "attempts <= 1 ? 0 : Math.min(cap, base * Math.pow(2, attempts - 2))", format: "ms" },
        { label: "Total waiting if every attempt fails", formula: "(() => { let t = 0; for (let i = 0; i < attempts - 1; i++) t += Math.min(cap, base * Math.pow(2, i)); return t; })()", format: "ms" },
      ],
      note: "Add the time each attempt itself takes. For a user-facing request this total may exceed what anyone will wait, so set a timeout for the whole operation, not just each call.",
    },
  ],

  underTheHood: [
    { type: "h", text: "What to retry, and what to protect" },
    {
      type: "table",
      headers: ["Situation", "Handling"],
      rows: [
        ["Transient: 429, 500, 502, 503, 504, connection reset, timeouts", "retry with capped exponential backoff and jitter, up to a maximum"],
        ["Client errors: 400, 401, 403, 404, 422", "do not retry; surface or fix the cause"],
        ["Deterministic model failures: context too long, content blocked", "do not retry the same input; shorten, rephrase or refuse"],
        ["Non-idempotent actions (charge, send, write)", "retry only with an idempotency key, or check state first (Track 5)"],
        ["Streaming responses interrupted midway", "decide to resume or restart; avoid duplicating partial output and cost"],
      ],
    },
    { type: "h", text: "Rate limits" },
    {
      type: "p",
      text: "Providers limit **requests per minute** and **tokens per minute**, often separately, plus concurrency. Hitting a limit returns 429. Do not rely on retries to absorb a sustained overload: **throttle on your side** with a **token bucket**, which refills at a steady rate and allows short bursts up to its capacity. Queue excess work instead of failing it, and apply per-user limits so one tenant cannot consume everyone's quota.",
    },
    {
      type: "code",
      language: "text",
      code: `token bucket:  capacity C, refill R tokens/second
on each request needing 'cost':
    refill = elapsed seconds x R   (never above C)
    if tokens >= cost:  allow, tokens -= cost
    else:               deny (or queue until enough tokens exist)`,
    },
    { type: "h", text: "Layers of resilience" },
    {
      type: "ul",
      items: [
        "**Timeouts** on every call, plus an overall deadline per user request, so nothing waits forever.",
        "**Circuit breaker**: after repeated failures stop calling the failing dependency for a short while, fail fast, and probe occasionally. It prevents piling load onto a struggling service and stops your threads waiting on a dead one.",
        "**Fallbacks**: a secondary model or provider, a smaller model, a cached answer or a graceful message. Test the fallback path, and check it is not subtly worse or less safe.",
        "**Graceful degradation**: turn off optional features (reranking, long context) under pressure before turning off the product.",
        "**Queues and async jobs** for work that does not need an immediate reply (lesson 5).",
        "**Observability**: log retries, 429 counts and fallbacks (Track 6) so you see trouble before users do.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Retry storms",
      text: "If every layer retries three times, a single failure can become 27 calls. Retry in one place, give each retry a budget, use jitter, and let the circuit breaker stop the amplification.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That only transient errors are retried, with capped exponential backoff, jitter and Retry-After; that client-side token buckets prevent self-inflicted 429s; that non-idempotent calls need idempotency keys; and that timeouts, circuit breakers and fallbacks complete the picture, with retry storms called out as a risk.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Retry only what is retryable, back off with jitter, and honour Retry-After.",
    code: `import random, time

RETRYABLE = {408, 429, 500, 502, 503, 504}

def next_delay(status: int, attempt: int, max_attempts: int,
               base_ms: int = 500, cap_ms: int = 30_000,
               retry_after_ms: int | None = None) -> int | None:
    """Delay in ms before the next attempt, or None to stop. 'attempt' starts at 1."""
    if attempt >= max_attempts or status not in RETRYABLE:
        return None
    exponential = min(cap_ms, base_ms * 2 ** (attempt - 1))
    if retry_after_ms is not None:
        return max(retry_after_ms, exponential)          # never wait less than the server asked
    return exponential


def call_with_retry(send, max_attempts: int = 5):
    for attempt in range(1, max_attempts + 1):
        response = send()
        if response.status < 400:
            return response
        retry_after = response.headers.get("Retry-After")
        delay = next_delay(response.status, attempt, max_attempts,
                           retry_after_ms=int(float(retry_after) * 1000) if retry_after else None)
        if delay is None:
            return response                              # not retryable, or out of attempts
        time.sleep(random.uniform(0, delay) / 1000)      # jitter: avoid synchronised retries`,
  },

  interview: [
    {
      question: "How should an application handle a 429 from an LLM provider?",
      answer:
        "Treat it as transient: wait and retry with capped exponential backoff and jitter, honouring any Retry-After header, up to a maximum number of attempts. But also fix the cause rather than relying on retries: throttle on my side with a token bucket tuned to my request and token limits, queue excess work, and apply per-user limits so one tenant cannot exhaust the quota.",
      weakAnswer:
        "Retry immediately until it works. — That is a retry storm that makes the overload worse.",
    },
    {
      question: "Which errors should you not retry, and why?",
      answer:
        "Client and deterministic errors: 400, 401, 403 and 404, context length exceeded or blocked content, because repeating the same request fails the same way. I fix or refuse the request instead. For writes that are not idempotent I only retry with an idempotency key, since a timeout does not tell me whether the action happened.",
      followUp: "Why add jitter?",
    },
    {
      question: "What is a circuit breaker and when is it useful?",
      answer:
        "It tracks failures to a dependency and, after a threshold, opens: calls fail fast for a cooldown period instead of waiting and piling load onto a struggling service, then it lets a probe through to see if recovery happened. It protects my resources, speeds up failure handling and lets a fallback engage quickly.",
    },
    {
      question: "How would you design fallbacks for an LLM feature?",
      answer:
        "A ladder: retry the primary model for transient errors, then a secondary provider or smaller model, then a cached or simplified answer, then a clear message. I test each rung, check the fallback model's quality and safety on my eval set so it is not silently worse, and log every fallback so I can see the rate.",
    },
    {
      question: "How can retries make an outage worse, and how do you prevent it?",
      answer:
        "If clients retry immediately and at the same moments, load multiplies when the service is weakest, and nested layers each retrying multiply it further. I retry in a single layer, use exponential backoff with jitter and a retry budget, cap attempts, and add a circuit breaker so retries stop when the dependency is clearly down.",
    },
  ],

  challenges: [
    {
      id: "pa-3-quiz",
      kind: "quiz",
      title: "Checkpoint: reliability",
      blurb: "Five questions on retries, limits and fallbacks.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which error is worth retrying with backoff?",
          options: [
            "400 Bad Request caused by malformed JSON",
            "503 Service Unavailable during an overload",
            "401 Unauthorized from an invalid key",
            "A context length exceeded error",
          ],
          correctIndex: 1,
          explanation:
            "Overload is transient. The others fail the same way every time.",
        },
        {
          id: "q2",
          prompt: "What is jitter for?",
          options: [
            "To lower token cost",
            "To randomise waits so many clients do not retry at the same moment",
            "To encrypt requests",
            "To shorten the delay cap",
          ],
          correctIndex: 1,
          explanation:
            "Synchronised retries create new spikes. Randomising spreads them out.",
        },
        {
          id: "q3",
          prompt: "The server sends Retry-After: 10 and your backoff computes 2 seconds. What should you wait?",
          options: ["2 seconds", "At least 10 seconds", "0 seconds", "A random value below 2"],
          correctIndex: 1,
          explanation:
            "Never wait less than the server asked. It knows its own recovery time.",
        },
        {
          id: "q4",
          prompt: "Three layers each retry 3 times on failure. How many calls can one failing request produce?",
          options: ["3", "9", "27", "1"],
          correctIndex: 2,
          explanation:
            "Retries multiply across layers: 3 x 3 x 3 = 27. Retry in one place.",
        },
        {
          id: "q5",
          prompt: "What does a circuit breaker do?",
          options: [
            "Retries faster",
            "After repeated failures, stops calling the dependency for a while and fails fast",
            "Caches responses",
            "Raises the rate limit",
          ],
          correctIndex: 1,
          explanation:
            "It stops piling load on a failing service and lets fallbacks engage quickly.",
        },
      ],
    },
    {
      id: "pa-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a retry loop",
      blurb: "During a provider incident your service made thousands of calls a second and got blocked. Find the line.",
      language: "python",
      lines: [
        "def call_with_retry(request):",
        "    for attempt in range(10):",
        "        try:",
        "            return client.send(request)",
        "        except Exception:",
        "            continue                       # try again immediately",
      ],
      buggyLine: 6,
      reasons: [
        "range(10) must be range(3)",
        "it retries every error immediately with no backoff or jitter, hammering a struggling service and also retrying errors that can never succeed",
        "return must be replaced with print",
        "except must be removed",
      ],
      correctReasonIndex: 1,
      explanation:
        "Immediate, unconditional retries create a retry storm and waste calls on non-retryable errors such as 400 and 401. Retry only transient errors, with capped exponential backoff, jitter and Retry-After.",
      fix: "delay = next_delay(status, attempt, max_attempts); if delay is None: raise; time.sleep(jitter(delay))",
      xp: 40,
    },
    {
      id: "pa-3-code",
      kind: "code",
      title: "Code challenge: decide the next retry delay",
      blurb: "Return how long to wait before retrying, or null to stop.",
      functionName: "nextDelay",
      starter: `/**
 * Decide the delay in milliseconds before the next attempt, or null to give up.
 *
 *   status        HTTP status of the failed attempt
 *   attempt       1 for the first attempt, 2 for the second, ...
 *   maxAttempts   total attempts allowed
 *   baseMs, capMs backoff settings
 *   retryAfterMs  the server's Retry-After in ms, or null
 *
 * Rules, in order:
 *   1. If attempt >= maxAttempts, return null.
 *   2. If status is not one of 408, 429, 500, 502, 503, 504, return null.
 *   3. exponential = min(capMs, baseMs * 2^(attempt - 1))
 *   4. If retryAfterMs is not null return max(retryAfterMs, exponential); otherwise exponential.
 */
function nextDelay(status, attempt, maxAttempts, baseMs, capMs, retryAfterMs) {
  // your code here
}`,
      tests: [
        { name: "the first retry waits the base delay", args: [429, 1, 5, 100, 10000, null], expected: 100 },
        { name: "the delay doubles each attempt", args: [429, 3, 5, 100, 10000, null], expected: 400 },
        { name: "out of attempts", args: [429, 5, 5, 100, 10000, null], expected: null },
        { name: "client errors are never retried", args: [400, 1, 5, 100, 10000, null], expected: null },
        { name: "a 503 on the second attempt", args: [503, 2, 5, 100, 10000, null], expected: 200 },
        { name: "the delay is capped", args: [500, 10, 20, 1000, 5000, null], expected: 5000 },
        { name: "Retry-After larger than the backoff wins", args: [429, 1, 5, 100, 10000, 3000], expected: 3000 },
        { name: "backoff larger than Retry-After wins", args: [429, 3, 5, 100, 10000, 50], expected: 400 },
      ],
      hints: [
        "Check the two stop conditions first: attempts exhausted, and a status that is not retryable.",
        "The exponential delay is baseMs times 2 to the power attempt minus 1, limited to capMs with Math.min.",
        "If retryAfterMs is a number, return the larger of it and the exponential delay. Remember it can be null.",
      ],
      solution: `function nextDelay(status, attempt, maxAttempts, baseMs, capMs, retryAfterMs) {
  const retryable = [408, 429, 500, 502, 503, 504];
  if (attempt >= maxAttempts) return null;
  if (!retryable.includes(status)) return null;

  const exponential = Math.min(capMs, baseMs * Math.pow(2, attempt - 1));
  if (retryAfterMs !== null) return Math.max(retryAfterMs, exponential);
  return exponential;
}`,
      xp: 70,
    },
  ],
};
