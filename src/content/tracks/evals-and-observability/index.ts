import type { Quiz, Track } from "@/content/types";

import { lesson as evalsFundamentals } from "./lessons/01-evals-fundamentals";
import { lesson as llmAsJudge } from "./lessons/02-llm-as-judge";
import { lesson as generationMetrics } from "./lessons/03-generation-metrics";
import { lesson as regressionCi } from "./lessons/04-regression-ci";
import { lesson as tracing } from "./lessons/05-tracing";
import { lesson as onlineEval } from "./lessons/06-online-eval";

const gate: Quiz = {
  id: "ev-gate",
  kind: "gate",
  title: "Track Gate: Evals & Observability",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to unlock Fine-tuning & Model Adaptation and earn your track badge.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt: "A prompt change lifts the pass rate from 70% to 75% on 20 cases. What is the best next step?",
      options: [
        "Ship it, it improved",
        "Quantify the uncertainty, diff per case and grow the set before concluding",
        "Revert it, it is too small",
        "Raise the temperature",
      ],
      correctIndex: 1,
      explanation:
        "5 points on 20 cases is a single case, well inside the noise.",
    },
    {
      id: "g2",
      prompt: "Which scorer should be tried first for 'the reply is valid JSON with the required keys'?",
      options: [
        "An LLM judge",
        "A deterministic code check",
        "Human review of every case",
        "A similarity metric",
      ],
      correctIndex: 1,
      explanation:
        "If code can decide, use code: cheaper, exact and repeatable.",
    },
    {
      id: "g3",
      prompt: "You quadruple the number of test cases. What happens to the margin of error on a pass rate?",
      options: ["It quarters", "It halves", "It is unchanged", "It doubles"],
      correctIndex: 1,
      explanation:
        "Error shrinks with the square root of n.",
    },
    {
      id: "g4",
      prompt: "A pairwise judge always sees the new answer as A and the new version wins 70% of the time. What is the likely problem?",
      options: [
        "Length bias",
        "Position bias that the fixed ordering amplifies; order must be randomised or both orders judged",
        "The judge is too cheap",
        "Temperature is too low",
      ],
      correctIndex: 1,
      explanation:
        "Always placing one candidate first manufactures wins if the judge prefers the first slot.",
    },
    {
      id: "g5",
      prompt: "Why use Cohen's kappa rather than raw agreement to validate a judge?",
      options: [
        "It is simpler",
        "It corrects for chance agreement, which is high when one label dominates",
        "It ignores disagreements",
        "It only works for three labels",
      ],
      correctIndex: 1,
      explanation:
        "A judge that always says 'pass' agrees 90% of the time when 90% of cases pass. Kappa exposes it.",
    },
    {
      id: "g6",
      prompt: "Which is the best way to evaluate a code-generation model?",
      options: [
        "ROUGE against a reference solution",
        "Run the generated code against tests and report pass@k with an unbiased estimator over n samples",
        "Ask the model whether its code works",
        "Count tokens",
      ],
      correctIndex: 1,
      explanation:
        "Execution decides correctness, and the n-sample estimator is lower variance than drawing exactly k.",
    },
    {
      id: "g7",
      prompt: "Each merge within 5 points of the baseline becomes the new baseline. What is the risk?",
      options: [
        "Slower CI",
        "Quality can erode 5 points at a time with no single failing gate; use a fixed floor and raise the baseline only deliberately",
        "The baseline becomes too high",
        "Nothing",
      ],
      correctIndex: 1,
      explanation:
        "The ratchet lets small acceptable drops accumulate.",
    },
    {
      id: "g8",
      prompt: "Latency and error graphs look normal but users say answers got worse. What would have caught it?",
      options: [
        "A faster server",
        "Sampled judging and user-feedback signals attached to traces",
        "More latency alerts",
        "A larger log retention",
      ],
      correctIndex: 1,
      explanation:
        "Quality drift is invisible to operational metrics and needs its own signals.",
    },
    {
      id: "g9",
      prompt: "A customer's email address appears in your third-party logs. What went wrong?",
      options: [
        "The log level was too low",
        "Prompts and identifiers were logged raw, without redaction, sampling, access control or retention limits",
        "The model leaked it",
        "The email was too long",
      ],
      correctIndex: 1,
      explanation:
        "Prompts contain user data. Redact or hash, sample, restrict access and expire it.",
    },
    {
      id: "g10",
      prompt: "How should users be assigned to A/B variants for a prompt experiment?",
      options: [
        "At random on every request",
        "By a stable hash of the user id with the experiment name, so each user sees one consistent version",
        "In alphabetical order",
        "By time of day",
      ],
      correctIndex: 1,
      explanation:
        "Per-request randomness mixes variants for one user and contaminates the result.",
    },
  ],
};

export const evalsAndObservability: Track = {
  slug: "evals-and-observability",
  order: 6,
  title: "Evals & Observability",
  tagline: "Knowing whether it works",
  description:
    "Measure LLM systems rigorously: building eval sets and judging uncertainty, LLM judges and their biases, metrics for generated text, regression testing in CI, tracing and monitoring in production, and online evaluation that feeds back into your dataset. Every lesson ends with interview questions.",
  level: "advanced",
  icon: "ClipboardCheck",
  accentVar: "--accent",
  interviewTopics: [
    "Golden sets & uncertainty",
    "Code vs judge vs human scoring",
    "LLM-as-judge biases and calibration",
    "Token F1, pass@k, BLEU/ROUGE limits",
    "Regression gates and baselines",
    "Traces, spans, percentiles",
    "Privacy in observability",
    "A/B tests, shadow, canary, feedback loops",
  ],
  lessons: [evalsFundamentals, llmAsJudge, generationMetrics, regressionCi, tracing, onlineEval],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "Evals basics",
      items: [
        { term: "Eval", detail: "A dataset, a scorer for each output, and a summary you can compare across versions." },
        { term: "Scorer order", detail: "Code check first, then LLM judge, then human review for ground truth and calibration." },
        { term: "Uncertainty", detail: "Margin is about 1.96 x sqrt(p(1-p)/n). Quadrupling cases halves it. Use Wilson intervals for small n." },
        { term: "Loop", detail: "Define success, build a set, baseline, change one thing, compare per case, ship, monitor, add failures." },
        { term: "Traps", detail: "Tuning on the eval set, tiny sets, easy cases only, averages hiding regressions, single runs of noisy systems." },
      ],
    },
    {
      heading: "LLM judges",
      items: [
        { term: "Styles", detail: "Pointwise (score), pairwise (A vs B), reference-based, context-based (faithfulness)." },
        { term: "Biases", detail: "Position, length and self-preference. Randomise or swap order, ignore length, vary judge family." },
        { term: "Design", detail: "One criterion per call, anchored rubric, reasoning before the verdict, structured output, temperature 0, pinned model." },
        { term: "Calibrate", detail: "Human-label a sample, measure Cohen's kappa (not raw agreement), read disagreements, refine, freeze." },
        { term: "Kappa", detail: "(p_o - p_e) / (1 - p_e). Above about 0.6 substantial, above 0.8 strong." },
      ],
    },
    {
      heading: "Metrics",
      items: [
        { term: "Exact match / F1", detail: "Short closed answers. Normalise first. F1 is the harmonic mean of word precision and recall, with multiplicity." },
        { term: "BLEU / ROUGE", detail: "N-gram overlap. Weak for open-ended text; rewards copying; a rough trend signal at most." },
        { term: "Embedding similarity", detail: "Paraphrase-tolerant but cannot catch a single wrong fact." },
        { term: "pass@k", detail: "1 - C(n-c, k) / C(n, k) from n samples with c correct. Draw n >= k for low variance." },
        { term: "Proxy rule", detail: "Validate any metric against human judgement on a sample from your task." },
      ],
    },
    {
      heading: "CI & regression",
      items: [
        { term: "Gates", detail: "Absolute floor, maximum drop, regression count, zero tolerance on critical cases, significance." },
        { term: "Baseline", detail: "Move it up only through a reviewed improvement. Letting it follow the latest merge ratchets quality down." },
        { term: "Noise", detail: "Pin model and settings, repeat noisy cases, quarantine flaky ones, set thresholds above run-to-run noise." },
        { term: "Cost", detail: "Cache responses by request hash, smoke subset on PRs and full set nightly, cheap calibrated judge in CI." },
        { term: "Report", detail: "Post per-case fixes and regressions on the PR so reviewers can judge." },
      ],
    },
    {
      heading: "Observability",
      items: [
        { term: "Trace / span / metric", detail: "Trace: one request as a tree of spans. Span: one timed step. Metric: aggregate over requests." },
        { term: "Per span", detail: "Model and version, prompt version, tokens in/out/cached, latency and TTFT, stop reason, status, cost." },
        { term: "Dashboards", detail: "p50/p95/p99 latency, error rate, cost per request/user/feature, cache hit rate, stop-reason mix, quality scores." },
        { term: "Percentiles", detail: "Nearest rank: sorted value at ceil(p/100 x n). Averages hide the slow tail." },
        { term: "Privacy", detail: "Redact or hash identifiers, sample full content, restrict access, short retention, check third-party obligations." },
      ],
    },
    {
      heading: "Online evaluation",
      items: [
        { term: "Flywheel", detail: "Canary, collect signals, sample and score, mine failures, add anonymised cases to the offline set, fix, gate, repeat." },
        { term: "Methods", detail: "Shadow (invisible comparison), canary (small blast radius), A/B (measure impact), interleaving (rankers)." },
        { term: "Assignment", detail: "Hash a stable user id with the experiment name. Never random per request." },
        { term: "Design", detail: "Fix metric and sample size first, add guardrail metrics, run through weekly cycles, avoid peeking and contamination." },
        { term: "Feedback", detail: "Thumbs are sparse and biased. Combine with implicit signals (regenerate, edit, copy, escalate) and random review." },
      ],
    },
  ],
};
