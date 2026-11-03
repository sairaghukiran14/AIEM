import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "scaling-and-architecture",
  order: 5,
  title: "Scaling & Architecture",
  summary:
    "Design for slow, expensive, rate-limited calls: queues for long work, a gateway in front of providers, and capacity planning you can do on a napkin.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "LLM calls differ from ordinary API calls: they take **seconds to minutes**, cost real money per call, are limited by the provider's **tokens and requests per minute**, and sometimes fail. An architecture that treats them like a 50 ms database query will fall over under load. The basics are old ideas applied carefully: stateless services, queues, concurrency limits and backpressure.",
    },
    {
      type: "sorter",
      title: "Synchronous or an asynchronous job?",
      prompt: "Decide whether the user should wait on the request.",
      categories: ["Synchronous (user waits)", "Async job (queue)"],
      items: [
        { text: "A chat reply that streams as it is generated", answer: 0, why: "The user is watching, and streaming makes the wait tolerable (lesson 1)." },
        { text: "Summarising 10,000 documents overnight", answer: 1, why: "Nobody is waiting. Queue it, run at a controlled rate, and use cheaper batch pricing (lesson 2)." },
        { text: "Generating a 40-page report that takes four minutes", answer: 1, why: "Too long for one HTTP request. Return a job id, show progress, and notify when done." },
        { text: "Autocomplete suggestions while typing", answer: 0, why: "Needs a fast answer or none. Use a small, fast model and drop stale requests." },
      ],
    },
    {
      type: "stepper",
      title: "An LLM gateway in the request path",
      steps: [
        { label: "Clients call your gateway", detail: "Applications talk to one internal endpoint, never to providers directly. This is one place to enforce policy.", items: ["app A", "app B", "app C"], mark: [0, 1, 2] },
        { label: "Authenticate and apply limits", detail: "Identify the caller, check per-team and per-user quotas and budgets, and reject or queue requests over the limit (lesson 3).", items: ["auth", "quota", "budget"], mark: [0, 1, 2] },
        { label: "Guardrails and caching", detail: "Run input checks, consult exact and prompt caches where safe (lesson 2), and redact sensitive data before it leaves your network (lesson 4).", items: ["input checks", "cache lookup"], mark: [0, 1] },
        { label: "Route to a model and provider", detail: "Pick the model by task, cost and current health. Fail over to a secondary provider when the primary degrades, with retries and circuit breakers.", items: ["primary", "fallback", "small model for easy tasks"], mark: [0, 1, 2] },
        { label: "Stream back and record", detail: "Forward the stream to the client, then log tokens, latency, cost, model and prompt version with a trace id (Track 6).", items: ["stream", "usage record", "trace"], mark: [0, 1, 2] },
      ],
      caption: "A gateway centralises limits, caching, routing, failover and cost accounting.",
    },
    {
      type: "calculator",
      title: "How much concurrency and quota do you need?",
      inputs: [
        { key: "rps", label: "Peak requests per second", min: 1, max: 1000, step: 1, value: 40 },
        { key: "secs", label: "Average seconds per request", min: 0.5, max: 120, step: 0.5, value: 8 },
        { key: "tokens", label: "Tokens per request (input + output)", min: 200, max: 50000, step: 100, value: 3500 },
        { key: "limit", label: "Provider tokens-per-minute limit", min: 10000, max: 20000000, step: 10000, value: 6000000 },
      ],
      outputs: [
        { label: "Concurrent requests in flight (Little's law)", formula: "rps * secs", format: "int" },
        { label: "Tokens per minute at peak", formula: "rps * 60 * tokens", format: "int" },
        { label: "Headroom against your provider limit", formula: "1 - (rps * 60 * tokens) / limit", format: "pct" },
      ],
      note: "Little's law: the average number in the system equals the arrival rate times the average time each spends in it. A negative headroom means you will hit 429s at peak unless you throttle, queue or raise the limit.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Patterns that matter" },
    {
      type: "table",
      headers: ["Pattern", "Why it matters for LLM work"],
      rows: [
        ["**Stateless services**", "any instance can serve any request; conversation state lives in a store, not in memory"],
        ["**Queues and workers**", "decouple slow jobs from requests, smooth bursts, and control the rate at which you call the provider"],
        ["**Concurrency limits**", "cap in-flight calls per worker and per tenant so one burst cannot exhaust quota or memory"],
        ["**Backpressure and load shedding**", "when overloaded, slow or reject new work deliberately instead of letting every request time out"],
        ["**Idempotent jobs**", "a retried job must not duplicate side effects (Track 5)"],
        ["**Durable execution for long agents**", "checkpoint progress so a crash resumes instead of restarting and re-spending"],
        ["**Multi-provider routing**", "avoid a single point of failure and choose by cost and quality"],
      ],
    },
    { type: "h", text: "The async job pattern" },
    {
      type: "ol",
      items: [
        "The client sends a request. The server validates it, stores a **job** record, and enqueues work. It returns a **job id** immediately.",
        "A **worker** takes the job, calls the model (with retries and limits), saves progress and the result.",
        "The client **polls** the job status, or receives a **webhook** or push notification when it finishes.",
        "Failures are retried with backoff; jobs that keep failing go to a **dead-letter queue** for inspection.",
        "Results expire according to a retention policy.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Do not run long work inside a web request",
      text: "Proxies and load balancers time out after tens of seconds, a held connection ties up a worker, a client disconnect may lose the work, and a retry may run it twice. Return a job id and do the work elsewhere.",
    },
    { type: "h", text: "Data, privacy and regions" },
    {
      type: "ul",
      items: [
        "**Data residency**: some customers require processing in a specific region. Choose regions for the gateway, stores and provider endpoints accordingly.",
        "**What leaves your network**: redact before sending to a provider (lesson 4), and check each provider's retention and training-use terms.",
        "**Secrets** (provider keys) live in the gateway, not in client apps or prompts.",
        "**Tenant isolation**: separate caches, vector indexes and memory per tenant (Tracks 4 and 5).",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That LLM calls are slow, costly and rate-limited, so long work goes through queues with job ids; that a gateway centralises auth, quotas, caching, routing and failover; that capacity is estimated with Little's law and token-per-minute limits; and that backpressure and idempotent jobs keep the system stable under load.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A token-bucket limiter and the async job pattern, in outline.",
    code: `import time, uuid

class TokenBucket:
    """Allows short bursts up to 'capacity', refilling at 'refill_per_sec' on average."""
    def __init__(self, capacity: float, refill_per_sec: float):
        self.capacity, self.refill = capacity, refill_per_sec
        self.tokens, self.last = capacity, time.monotonic()

    def allow(self, cost: float = 1.0) -> bool:
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.refill)
        self.last = now
        if cost <= self.tokens:
            self.tokens -= cost
            return True
        return False                                   # deny or queue until enough tokens exist


# Async job pattern: the request returns immediately; a worker does the slow part.
@app.post("/reports")
def create_report(req):
    job_id = uuid.uuid4().hex
    jobs.save(job_id, status="queued", owner=req.user_id)
    queue.enqueue("generate_report", job_id, req.payload)          # picked up by a worker
    return {"job_id": job_id}, 202                                 # accepted, not finished


@app.get("/reports/{job_id}")
def report_status(job_id: str, user):
    job = jobs.get(job_id, owner=user.id)                          # tenant-scoped lookup
    return {"status": job.status, "result_url": job.result_url}`,
  },

  interview: [
    {
      question: "How would you architect an LLM feature that generates long reports?",
      answer:
        "As an asynchronous job: the endpoint validates the request, stores a job record, enqueues the work and returns a job id with 202. A worker calls the model with retries and rate limits, checkpoints progress and stores the result. The client polls or receives a webhook, failing jobs are retried with backoff and eventually dead-lettered, and the work is idempotent so retries do not duplicate effects.",
      weakAnswer:
        "Increase the request timeout. — A held connection is fragile and does not scale.",
    },
    {
      question: "What does an LLM gateway give you?",
      answer:
        "One controlled entry point to model providers: authentication, per-team and per-user quotas and budgets, rate limiting, input and output guardrails, caching, model routing, failover between providers, secret management, and uniform logging of tokens, latency and cost. It lets applications stay simple and lets platform owners change providers or policy in one place.",
      followUp: "What are the downsides?",
    },
    {
      question: "How do you estimate the concurrency your service needs?",
      answer:
        "With Little's law: average requests in flight equals arrival rate times average time per request. At 40 requests per second with 8 seconds each I need about 320 concurrent calls. I compare tokens per minute at peak with the provider's limit to find headroom, and plan throttling, queues or a higher quota if it is negative.",
    },
    {
      question: "What is backpressure and why does it matter here?",
      answer:
        "A way for an overloaded system to push back on producers instead of accepting everything: bounded queues, limits on in-flight calls, 429 or 503 responses with Retry-After, or shedding low-priority work. Without it every request slows down and times out together, retries add load, and the system collapses. With LLM calls that are slow and rate limited, deliberate pushback keeps the important work succeeding.",
    },
    {
      question: "How do you keep a long-running agent from losing progress when a worker crashes?",
      answer:
        "Durable execution: persist the plan, step results and conversation state after each step, make each step idempotent, and have another worker resume from the last checkpoint instead of restarting. That avoids repeating work and cost, and idempotency keys prevent duplicated side effects on re-execution.",
    },
  ],

  challenges: [
    {
      id: "pa-5-quiz",
      kind: "quiz",
      title: "Checkpoint: scaling and architecture",
      blurb: "Five questions on queues, gateways and capacity.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which job belongs in an asynchronous queue rather than a web request?",
          options: [
            "A streamed chat reply",
            "Generating a four-minute report",
            "Autocomplete suggestions",
            "A health check",
          ],
          correctIndex: 1,
          explanation:
            "Long work should return a job id and run elsewhere.",
        },
        {
          id: "q2",
          prompt: "At 20 requests per second with each taking 6 seconds, roughly how many requests are in flight?",
          options: ["About 3", "About 26", "About 120", "About 1,200"],
          correctIndex: 2,
          explanation:
            "Little's law: 20 x 6 = 120.",
        },
        {
          id: "q3",
          prompt: "Which is a key benefit of putting an LLM gateway in front of providers?",
          options: [
            "It makes models faster",
            "Central auth, quotas, caching, routing, failover and cost logging",
            "It removes the need for evaluation",
            "It lowers token prices",
          ],
          correctIndex: 1,
          explanation:
            "A gateway is one place to enforce policy and observe usage.",
        },
        {
          id: "q4",
          prompt: "What should happen to a job that keeps failing after several retries?",
          options: [
            "Retry forever",
            "Move to a dead-letter queue for inspection",
            "Delete it silently",
            "Return success",
          ],
          correctIndex: 1,
          explanation:
            "Dead-lettering preserves the failing work for diagnosis without blocking the queue.",
        },
        {
          id: "q5",
          prompt: "Why must a retried job be idempotent?",
          options: [
            "To use fewer tokens",
            "So a second run does not duplicate side effects such as emails or charges",
            "To make it synchronous",
            "To avoid caching",
          ],
          correctIndex: 1,
          explanation:
            "Queues deliver at least once, so jobs can run twice.",
        },
      ],
    },
    {
      id: "pa-5-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a report endpoint",
      blurb: "Large report requests time out at the load balancer, and clients that retry cause duplicate reports. Find the line.",
      language: "python",
      lines: [
        "@app.post('/report')",
        "def create_report(req):",
        "    result = generate_long_report(req)     # takes 2-5 minutes",
        "    return result",
      ],
      buggyLine: 3,
      reasons: [
        "the route must be a GET",
        "multi-minute work runs inside the request, so proxies time out, workers are tied up, and client retries start the work again; use a queue and a job id",
        "result must be a list",
        "the function must be async",
      ],
      correctReasonIndex: 1,
      explanation:
        "Long jobs do not belong in the HTTP request path. Enqueue the work, return a job id with 202, and let the client poll or receive a webhook. Make the job idempotent so retries do not duplicate it.",
      fix: "job_id = enqueue('generate_report', req); return {'job_id': job_id}, 202",
      xp: 40,
    },
    {
      id: "pa-5-code",
      kind: "code",
      title: "Code challenge: simulate a token bucket",
      blurb: "Decide which requests a token-bucket rate limiter allows.",
      functionName: "tokenBucket",
      starter: `/**
 * Simulate a token bucket rate limiter.
 *
 *   - It starts FULL with \`capacity\` tokens.
 *   - Tokens refill continuously at \`refillPerSec\`, never above \`capacity\`.
 *   - events: [{ t, cost }] in time order (t in seconds).
 *
 * For each event: first refill for the time since the previous event (the first event
 * has no elapsed time). Then if tokens >= cost, allow it and subtract the cost;
 * otherwise deny it and leave the tokens unchanged.
 *
 * Return an array of booleans (true = allowed), one per event.
 */
function tokenBucket(events, capacity, refillPerSec) {
  // your code here
}`,
      tests: [
        {
          name: "a burst up to the capacity, then a refill",
          args: [[{ t: 0, cost: 1 }, { t: 0, cost: 1 }, { t: 0, cost: 1 }, { t: 1, cost: 1 }, { t: 1, cost: 1 }], 2, 1],
          expected: [true, true, false, true, false],
        },
        {
          name: "refill never exceeds the capacity",
          args: [[{ t: 0, cost: 2 }, { t: 10, cost: 2 }, { t: 10, cost: 1 }], 2, 1],
          expected: [true, true, false],
        },
        { name: "a cost larger than the capacity is never allowed", args: [[{ t: 0, cost: 3 }], 2, 1], expected: [false] },
        { name: "no events", args: [[], 5, 1], expected: [] },
        {
          name: "partial refills accumulate",
          args: [[{ t: 0, cost: 1 }, { t: 1, cost: 1 }, { t: 2, cost: 1 }], 1, 0.5],
          expected: [true, false, true],
        },
        {
          name: "a denied request does not consume tokens",
          args: [[{ t: 0, cost: 2 }, { t: 0, cost: 1 }, { t: 1, cost: 1 }], 2, 1],
          expected: [true, false, true],
        },
      ],
      hints: [
        "Keep tokens (start at capacity) and the time of the previous event (start at the first event's time).",
        "Before each decision add (t - previousTime) * refillPerSec, capped with Math.min at capacity.",
        "If tokens >= cost, subtract it and push true. Otherwise push false and change nothing.",
      ],
      solution: `function tokenBucket(events, capacity, refillPerSec) {
  let tokens = capacity;
  let last = events.length ? events[0].t : 0;
  const result = [];

  for (const { t, cost } of events) {
    tokens = Math.min(capacity, tokens + (t - last) * refillPerSec);
    last = t;
    if (tokens >= cost) {
      tokens -= cost;
      result.push(true);
    } else {
      result.push(false);
    }
  }
  return result;
}`,
      xp: 70,
    },
  ],
};
