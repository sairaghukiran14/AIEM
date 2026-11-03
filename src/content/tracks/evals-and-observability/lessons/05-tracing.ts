import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "tracing-and-observability",
  order: 5,
  title: "Tracing & Observability",
  summary:
    "When an LLM app misbehaves in production you need to see exactly what happened in that request. Traces, metrics and careful logging make that possible.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Evals tell you whether a **version** is good. **Observability** tells you what is happening to **real requests** right now: why this answer was wrong, why that request was slow, why costs jumped on Tuesday. An LLM request is a chain (query rewrite, retrieval, rerank, model calls, tool calls), so you need to record the chain, not just the final answer.",
    },
    {
      type: "table",
      headers: ["Signal", "What it is", "Answers"],
      rows: [
        ["**Trace**", "the full record of one request as a tree of spans", "what happened in this case, step by step?"],
        ["**Span**", "one timed step: an LLM call, a retrieval, a tool call", "where did the time and tokens go?"],
        ["**Metrics**", "aggregates over many requests, such as p95 latency or cost per day", "is the system healthy overall? is something drifting?"],
        ["**Logs**", "discrete events and errors", "what failed and with what message?"],
      ],
    },
    {
      type: "stepper",
      title: "Anatomy of a trace for one RAG question",
      steps: [
        { label: "The root span", detail: "One trace per user request, with a trace id you also return in error messages and support tickets. It carries the user or session id (hashed), prompt version and total latency and cost.", items: ["trace 8f3a  total 2.4 s  $0.011"], mark: [0] },
        { label: "Rewrite and retrieve", detail: "Child spans record the rewritten query, candidate ids with scores, and the timing of each search (Track 4).", items: ["rewrite 180 ms", "retrieve 120 ms: 20 candidates", "rerank 340 ms: 5 kept"], mark: [1, 2] },
        { label: "The model call", detail: "A span per LLM call with model and version, input and output tokens, time to first token, stop reason, and a reference to the prompt version.", items: ["generate 1.6 s  in 3100 / out 240 tok", "TTFT 420 ms  stop: end_turn"], mark: [0, 1] },
        { label: "Tool calls", detail: "Each tool call is a span with its name, arguments (redacted as needed), duration, result size and any error.", items: ["get_order 90 ms  ok", "send_email  denied by policy"], mark: [0, 1] },
        { label: "Scores attached later", detail: "Judge scores, user thumbs and eval labels are attached to the trace after the fact, so you can find the traces that scored badly and read them.", items: ["faithfulness: 0.4", "user: thumbs down"], mark: [0, 1] },
      ],
      caption: "With this you can answer the four stage questions from Track 4 by reading one trace.",
    },
    {
      type: "sorter",
      title: "Metric or trace?",
      prompt: "Which tool answers each question?",
      categories: ["Metric (aggregate)", "Trace (one request)"],
      items: [
        { text: "What is the p95 latency over the last hour?", answer: 0, why: "A statistic over many requests." },
        { text: "Why did request r_81 cite the wrong chunk?", answer: 1, why: "You need the retrieval and prompt for that single request." },
        { text: "How much did the summarise feature cost per day this week?", answer: 0, why: "Aggregated cost, broken down by feature." },
        { text: "What exact prompt was sent for the complaint ticket?", answer: 1, why: "Per-request content. Treat it as sensitive data." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "What to record on every LLM span" },
    {
      type: "ul",
      items: [
        "**Model and version**, and the **prompt version** (Track 2), so a bad output can be tied to exact settings.",
        "**Token counts** in and out, and cached tokens, to compute **cost** per request, per user and per feature.",
        "**Latency**, including time to first token for streaming.",
        "**Stop reason** (finished, length limit, tool call), since truncation is a common silent failure (Track 1).",
        "**Status and error** for failures, retries and rate limits.",
        "**Inputs and outputs**, subject to the privacy rules below.",
      ],
    },
    { type: "h", text: "Metrics that earn a dashboard" },
    {
      type: "table",
      headers: ["Metric", "Why"],
      rows: [
        ["p50, p95, p99 latency, and time to first token", "averages hide the slow tail that users feel"],
        ["Error and timeout rate; rate-limit hits", "reliability (Track 8)"],
        ["Tokens and cost per request, per user, per feature", "spotting runaway spend early"],
        ["Cache hit rate", "cost and latency lever (Track 8)"],
        ["Stop-reason mix, tool-call counts, steps per run", "truncation and runaway agents (Track 5)"],
        ["Quality scores from sampled judging and user feedback", "drift that latency graphs never show"],
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Prompts and outputs are sensitive data",
      text: "A trace that stores full prompts stores whatever users typed: names, emails, medical or financial details, and any private documents you retrieved. Redact or hash identifiers, avoid logging secrets, restrict who can read traces, set short retention, and sample rather than keep everything. Check your privacy and contractual obligations before sending traces to a third-party tool.",
    },
    {
      type: "calculator",
      title: "How much trace data will you store?",
      inputs: [
        { key: "requests", label: "Requests per day", min: 1000, max: 20000000, step: 1000, value: 500000 },
        { key: "kb", label: "Stored data per request", min: 1, max: 200, step: 1, value: 30, unit: "KB" },
        { key: "sample", label: "Share of requests kept in full", min: 1, max: 100, step: 1, value: 10, unit: "%" },
        { key: "days", label: "Retention", min: 1, max: 365, step: 1, value: 30, unit: "days" },
      ],
      outputs: [
        { label: "Stored if you keep everything", formula: "requests * kb * days / 1e6", format: "fixed1" },
        { label: "Stored with sampling (GB)", formula: "requests * kb * (sample / 100) * days / 1e6", format: "fixed1" },
      ],
      note: "Keep a small always-on summary for every request (ids, tokens, latency, status) and full content only for a sample, plus every error and every trace that scored badly.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That a request is traced as spans with model, prompt version, tokens, latency, stop reason and cost; that percentiles beat averages; that quality needs sampled scoring, not only latency and errors; and that prompts and outputs are sensitive, so redaction, access control, sampling and retention are part of the design.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A span wrapper that records the essentials and redacts before logging.",
    code: `import hashlib, math, re, time, uuid

EMAIL = re.compile(r"[\\w.+-]+@[\\w-]+\\.[\\w.-]+")


def redact(text: str) -> str:
    return EMAIL.sub("[email]", text)                     # extend with phone, card, ids, secrets


def percentile(values: list[float], p: float) -> float | None:
    """Nearest-rank percentile: the value at rank ceil(p/100 * n) of the sorted data."""
    if not values:
        return None
    ordered = sorted(values)
    rank = max(1, math.ceil(p / 100 * len(ordered)))      # rank 1 is the smallest value
    return ordered[min(rank, len(ordered)) - 1]


def traced_llm(trace_id: str, user_id: str, prompt: str, prompt_version: str):
    span_id = uuid.uuid4().hex[:8]
    start = time.perf_counter()
    try:
        reply = llm(prompt)
        status = "ok"
        return reply
    except Exception as e:
        status = f"error:{type(e).__name__}"
        raise
    finally:
        log.info(
            "llm_span",
            trace_id=trace_id, span_id=span_id,
            user=hashlib.sha256(user_id.encode()).hexdigest()[:12],       # hash, never the raw id
            prompt_version=prompt_version,
            latency_ms=round((time.perf_counter() - start) * 1000),
            status=status,
            prompt_preview=redact(prompt)[:500] if should_sample(trace_id) else None,
        )`,
  },

  interview: [
    {
      question: "What is the difference between a trace, a span and a metric?",
      answer:
        "A trace is the full record of one request as a tree of spans. A span is one timed step inside it, like an LLM call, a retrieval or a tool call, with attributes such as tokens and status. A metric is an aggregate over many requests, like p95 latency or cost per day. Traces explain individual cases, metrics show system health and trends.",
      weakAnswer:
        "They are all kinds of logs. — They serve different questions and have different shapes.",
    },
    {
      question: "What would you record for every LLM call?",
      answer:
        "Model and version, prompt version, input and output tokens including cached tokens, latency and time to first token, stop reason, status and errors, and cost computed from tokens, linked by trace and span ids. Inputs and outputs too, but subject to redaction, sampling, access control and retention, since they contain user data.",
      followUp: "What is the privacy risk?",
    },
    {
      question: "Why use percentiles instead of average latency?",
      answer:
        "Averages hide the slow tail. If most requests take 1 second and one in twenty takes 15, the mean looks fine while real users suffer. The p95 and p99 show what the slowest users experience, and for LLM apps I also track time to first token separately, since it drives perceived speed for streaming responses.",
    },
    {
      question: "How do you monitor quality in production, not only latency and errors?",
      answer:
        "Sample live traffic and score it with calibrated judges and code checks, collect user signals such as thumbs, edits and regenerations, track proxies like refusal rate and stop-reason mix, and attach all of it to traces so I can open the worst ones. Quality can drift with no change in latency or error graphs, for example when a provider updates a model.",
    },
    {
      question: "A user reports a bad answer. How does observability help?",
      answer:
        "With the trace id I can pull that request's spans: the rewritten query, candidates and scores, the final prompt, the model call with its stop reason, and tool calls. That locates the failing stage in minutes, and I add the case to my eval set. Without a trace I would be guessing.",
    },
  ],

  challenges: [
    {
      id: "ev-5-quiz",
      kind: "quiz",
      title: "Checkpoint: tracing and observability",
      blurb: "Five questions on what to record and why.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which tool tells you why one specific request returned a wrong answer?",
          options: ["A p95 latency graph", "A trace of that request", "A cost-per-day metric", "The average token count"],
          correctIndex: 1,
          explanation:
            "Aggregates cannot explain a single case. The trace shows each step.",
        },
        {
          id: "q2",
          prompt: "Why is p95 latency more useful than average latency?",
          options: [
            "It is cheaper to compute",
            "It reveals the slow tail that users actually feel, which averages hide",
            "It is always lower",
            "It ignores errors",
          ],
          correctIndex: 1,
          explanation:
            "A few very slow requests barely move the mean but ruin the experience for those users.",
        },
        {
          id: "q3",
          prompt: "Why record the stop reason on every model call?",
          options: [
            "It reduces cost",
            "A length stop means truncation, a common silent failure",
            "It selects the model",
            "It is required by tokenizers",
          ],
          correctIndex: 1,
          explanation:
            "Track 1: a length stop means the answer was cut off. You want to see how often that happens.",
        },
        {
          id: "q4",
          prompt: "What is the main privacy concern with full prompt logging?",
          options: [
            "Logs become too small",
            "Prompts contain whatever users typed and documents you retrieved, which may be personal or confidential",
            "Models refuse logged prompts",
            "It breaks caching",
          ],
          correctIndex: 1,
          explanation:
            "Redact or hash identifiers, restrict access, sample and limit retention.",
        },
        {
          id: "q5",
          prompt: "Quality has dropped but latency and error rate look normal. What would reveal it?",
          options: [
            "More latency charts",
            "Sampled judging, user feedback and eval scores attached to traces",
            "A larger log file",
            "A faster server",
          ],
          correctIndex: 1,
          explanation:
            "Quality drift is invisible to operational metrics. It needs its own signals.",
        },
      ],
    },
    {
      id: "ev-5-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: logging LLM calls",
      blurb: "A privacy review found customers' email addresses in a third-party logging tool. Find the line.",
      language: "python",
      lines: [
        "def traced_call(user, prompt):",
        "    log.info('llm_request', user_email=user.email, prompt=prompt)",
        "    reply = llm(prompt)",
        "    log.info('llm_response', reply=reply)",
        "    return reply",
      ],
      buggyLine: 2,
      reasons: [
        "log.info must be called after the model",
        "it logs the raw email and the entire prompt, sending personal data to general logs with no redaction, sampling, access control or retention policy",
        "the prompt must not be passed to the model",
        "the reply should be logged before the request",
      ],
      correctReasonIndex: 1,
      explanation:
        "Prompts and user identifiers are sensitive. Hash the user id, redact personal data, keep full content only for a sample and for failures, restrict who can read it and expire it.",
      fix: "log.info('llm_request', user=hash(user.id), prompt=redact(prompt) if sampled else None)",
      xp: 40,
    },
    {
      id: "ev-5-code",
      kind: "code",
      title: "Code challenge: nearest-rank percentile",
      blurb: "Compute p50, p95 and p99 latency from raw measurements.",
      functionName: "percentile",
      starter: `/**
 * Nearest-rank percentile of \`values\` (any order).
 *
 *   sort ascending
 *   rank = ceil(p / 100 * n), but at least 1
 *   return the value at that rank (rank 1 is the smallest)
 *
 * Empty input -> null.
 *
 * percentile([1, 2, 3, 4, 5], 50) -> 3
 * percentile([1, 2, 3, 4, 5], 95) -> 5
 */
function percentile(values, p) {
  // your code here
}`,
      tests: [
        { name: "the median of five", args: [[1, 2, 3, 4, 5], 50], expected: 3 },
        { name: "p95 of five is the maximum", args: [[1, 2, 3, 4, 5], 95], expected: 5 },
        { name: "p20 of five", args: [[1, 2, 3, 4, 5], 20], expected: 1 },
        { name: "input need not be sorted", args: [[5, 1, 3], 50], expected: 3 },
        { name: "p100 is the maximum", args: [[10, 20, 30, 40], 100], expected: 40 },
        { name: "p0 is the minimum", args: [[10, 20, 30, 40], 0], expected: 10 },
        { name: "empty input", args: [[], 50], expected: null },
        { name: "a tail made visible", args: [[100, 110, 105, 120, 98, 102, 107, 5000, 99, 101], 95], expected: 5000 },
      ],
      hints: [
        "Copy and sort the values ascending with (a, b) => a - b so you do not modify the input.",
        "rank = Math.max(1, Math.ceil((p / 100) * n)). Rank 1 is index 0.",
        "Return null first if the array is empty.",
      ],
      solution: `function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1];
}`,
      xp: 70,
    },
  ],
};
