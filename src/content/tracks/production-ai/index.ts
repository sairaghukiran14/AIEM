import type { Quiz, Track } from "@/content/types";

import { lesson as streamingLatency } from "./lessons/01-streaming-latency";
import { lesson as cachingCost } from "./lessons/02-caching-cost";
import { lesson as reliability } from "./lessons/03-reliability";
import { lesson as guardrailsSafety } from "./lessons/04-guardrails-safety";
import { lesson as scalingArchitecture } from "./lessons/05-scaling-architecture";
import { lesson as operating } from "./lessons/06-operating";

const gate: Quiz = {
  id: "pa-gate",
  kind: "gate",
  title: "Track Gate: Production AI",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to complete Production AI and unlock the capstone.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt: "What mainly determines time to first token, and what mainly determines total time?",
      options: [
        "TTFT: output length. Total: prompt length",
        "TTFT: network, queueing and prefill (prompt length). Total: adds sequential decoding of the output tokens",
        "Both depend only on the model size",
        "Both depend only on the user's network",
      ],
      correctIndex: 1,
      explanation:
        "Prefill is one parallel pass over the prompt. Decoding is one token at a time.",
    },
    {
      id: "g2",
      prompt: "Your code streams from the model but users see nothing until the end. What is the most likely cause?",
      options: [
        "The model is slow",
        "Something buffers the response: a proxy or your own code collecting chunks before sending",
        "SSE is unsupported",
        "The temperature is too low",
      ],
      correctIndex: 1,
      explanation:
        "One buffering hop defeats streaming. Disable buffering and flush each event.",
    },
    {
      id: "g3",
      prompt: "Which prompt layout gets the best prompt-cache hit rate?",
      options: [
        "A request id and timestamp first, then the instructions",
        "Stable system prompt, tools and examples first and byte-identical, with the user's question last",
        "The question first",
        "Randomly ordered tools",
      ],
      correctIndex: 1,
      explanation:
        "Caching reuses an identical prefix, so anything variable near the top breaks it.",
    },
    {
      id: "g4",
      prompt: "A semantic cache shared by all users returns another customer's order details. What are the two faults?",
      options: [
        "Too large a context and too small a model",
        "No per-tenant scoping of personalised answers, and a similarity threshold that is too loose",
        "Too high a temperature and no streaming",
        "A missing time to live only",
      ],
      correctIndex: 1,
      explanation:
        "Personalised content must not be cached across users, and thresholds must be tuned on labelled pairs.",
    },
    {
      id: "g5",
      prompt: "A call returns 429 with Retry-After: 12. Your backoff computes 2 seconds. What do you do?",
      options: [
        "Retry after 2 seconds",
        "Wait at least 12 seconds, with jitter, and retry within a limited number of attempts",
        "Retry immediately",
        "Give up forever",
      ],
      correctIndex: 1,
      explanation:
        "Never wait less than the server asked. Cap attempts and add jitter.",
    },
    {
      id: "g6",
      prompt: "Which failures are not worth retrying?",
      options: [
        "503 and 429",
        "400 malformed request, 401 invalid key, and context length exceeded",
        "Connection resets",
        "Timeouts on read-only calls",
      ],
      correctIndex: 1,
      explanation:
        "Repeating a deterministic failure just repeats the failure. Fix the request.",
    },
    {
      id: "g7",
      prompt: "Harmful messages are 0.1% of traffic. A filter with 95% recall flags 1% of harmless messages. What is true of its flags?",
      options: [
        "Nearly all are real harm",
        "Most are false alarms, because at a low base rate a small false positive rate dominates",
        "It never blocks legitimate users",
        "Precision is 95%",
      ],
      correctIndex: 1,
      explanation:
        "On a million messages: about 950 caught but roughly 10,000 harmless ones flagged.",
    },
    {
      id: "g8",
      prompt: "Your moderation API is down. For a high-risk feature, what is the right default?",
      options: [
        "Let everything through",
        "Fail closed: block, queue for review or restrict, and alert",
        "Retry forever",
        "Turn off logging",
      ],
      correctIndex: 1,
      explanation:
        "A guardrail that disappears when it fails offers no protection when it is needed.",
    },
    {
      id: "g9",
      prompt: "A report takes four minutes to generate. How should the API handle it?",
      options: [
        "Hold the HTTP request open and raise the timeout",
        "Enqueue a job, return a job id with 202, and let the client poll or receive a webhook; make the job idempotent",
        "Run it on the client",
        "Cache the result forever",
      ],
      correctIndex: 1,
      explanation:
        "Long work does not belong in the request path. Queues, job ids and idempotent workers scale and recover.",
    },
    {
      id: "g10",
      prompt: "A new prompt version lowered quality overnight. What is the best first response?",
      options: [
        "Spend a week finding the root cause before touching anything",
        "Roll back to the last known-good version via a flag, then diagnose with traces and add the failing cases to the eval set",
        "Raise the temperature",
        "Disable monitoring",
      ],
      correctIndex: 1,
      explanation:
        "Mitigate first, diagnose second, then make the failure permanently testable.",
    },
  ],
};

export const productionAi: Track = {
  slug: "production-ai",
  order: 8,
  title: "Production AI",
  tagline: "Shipping it, cheaply and safely",
  description:
    "Streaming and latency, caching and cost control, rate limits and retries, guardrails and safety, scaling and architecture, and operating AI products with SLOs, runbooks and change management. Every lesson ends with interview questions.",
  level: "advanced",
  icon: "Rocket",
  accentVar: "--green",
  interviewTopics: [
    "TTFT vs total latency, SSE",
    "Prompt, exact and semantic caching",
    "Backoff, jitter, Retry-After",
    "Token buckets and circuit breakers",
    "Input and output guardrails",
    "Base rates and fail-closed design",
    "Queues, gateways, Little's law",
    "SLOs, error budgets, incident response",
  ],
  lessons: [streamingLatency, cachingCost, reliability, guardrailsSafety, scalingArchitecture, operating],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "Streaming & latency",
      items: [
        { term: "TTFT vs total", detail: "TTFT = network + queueing + prefill (prompt length). Total adds sequential decoding (output length)." },
        { term: "Levers", detail: "Cache prefix and shrink context for TTFT; shorter outputs and faster models for total; streaming only helps perceived speed." },
        { term: "SSE", detail: "text/event-stream. Events end with a blank line; event: and data: fields; lines starting with a colon are comments." },
        { term: "Whole path", detail: "Provider to server to proxy to browser must all stream. Disable proxy buffering and flush every event." },
        { term: "Cancel", detail: "Propagate user cancellation upstream so you stop paying for unused tokens. Handle errors that arrive mid-stream." },
      ],
    },
    {
      heading: "Caching & cost",
      items: [
        { term: "Prompt cache", detail: "Reuses the provider's work on an identical prefix. Stable content first, question last, byte-identical, watch the time to live." },
        { term: "Exact cache", detail: "Key by hash of the full request including model and prompt version. Only for deterministic, non-personalised tasks; add a TTL." },
        { term: "Semantic cache", detail: "Matches similar questions by embedding. Scope per tenant, tune the threshold, never for personalised answers." },
        { term: "Other levers", detail: "Model routing, shorter outputs, batch APIs for non-interactive work, context trimming, budgets and cost attribution." },
        { term: "Saving formula", detail: "saving = prefix share x hit rate x (1 - cached price share)." },
      ],
    },
    {
      heading: "Reliability",
      items: [
        { term: "Retry", detail: "408, 429, 500, 502, 503, 504 and timeouts. Never 400, 401, 403, 404 or deterministic failures like context too long." },
        { term: "Backoff", detail: "delay = min(cap, base x 2^(attempt-1)), plus jitter; honour Retry-After; cap attempts." },
        { term: "Rate limits", detail: "Throttle yourself with a token bucket (capacity, refill per second); queue excess; per-user limits." },
        { term: "Resilience", detail: "Timeouts and an overall deadline, circuit breaker, tested fallbacks, graceful degradation." },
        { term: "Retry storms", detail: "Nested retries multiply (3 x 3 x 3 = 27). Retry in one layer with a budget." },
      ],
    },
    {
      heading: "Guardrails",
      items: [
        { term: "Layers", detail: "Auth and limits, input checks (PII, topics, injection screen), least-privilege model call, output checks (schema, moderation, grounding, redaction), a decision, monitoring." },
        { term: "Base rate", detail: "At 0.1% harmful, 95% recall and 1% false positives, flags are mostly false alarms. Choose actions by the cost of each error." },
        { term: "Fail closed", detail: "If a safety check cannot run, risky content is blocked, queued or restricted, never waved through." },
        { term: "Responses", detail: "Graduated: warn, confirm, regenerate, human review, refuse. Explain refusals without teaching evasion." },
        { term: "Limits", detail: "Filters are not a security boundary. Use least privilege, validated tool calls and human approval for what must not happen." },
      ],
    },
    {
      heading: "Scaling & architecture",
      items: [
        { term: "Async jobs", detail: "Long work: validate, store a job, enqueue, return a job id with 202; worker runs; client polls or gets a webhook; dead-letter failures." },
        { term: "Gateway", detail: "One entry point for auth, quotas, caching, guardrails, routing, failover, secrets and cost logging." },
        { term: "Little's law", detail: "In flight = arrival rate x time per request. Compare tokens per minute with provider limits for headroom." },
        { term: "Stability", detail: "Stateless services, concurrency limits, backpressure and load shedding, idempotent jobs, durable execution for long agents." },
        { term: "Data", detail: "Regions and residency, redaction before egress, tenant isolation of caches and indexes, secrets in the gateway only." },
      ],
    },
    {
      heading: "Operating",
      items: [
        { term: "SLOs", detail: "Availability, latency (p95 and TTFT), quality, safety and cost per task, each with an error budget." },
        { term: "Error budget", detail: "allowed = requests x (100 - SLO) / 100. Budget left: ship; spent: freeze risk and fix reliability." },
        { term: "Incident flow", detail: "Detect, triage and communicate, mitigate (roll back, fail over, throttle, disable), diagnose, fix and verify, blameless post-mortem." },
        { term: "Change control", detail: "Pin versions, treat model upgrades as releases with evals and rollback, feature flags for prompts, models and tools." },
        { term: "Trust", detail: "Disclose AI use, show sources, give escalation paths, manage retention and vendor risk." },
      ],
    },
  ],
};
