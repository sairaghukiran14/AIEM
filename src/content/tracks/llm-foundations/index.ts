import type { Quiz, Track } from "@/content/types";

import { lesson as whatLlmsDo } from "./lessons/01-what-llms-do";
import { lesson as tokens } from "./lessons/02-tokens";
import { lesson as contextWindows } from "./lessons/03-context-windows";
import { lesson as sampling } from "./lessons/04-sampling";
import { lesson as attention } from "./lessons/05-attention";
import { lesson as choosingAModel } from "./lessons/06-choosing-a-model";

const gate: Quiz = {
  id: "fnd-gate",
  kind: "gate",
  title: "Track Gate: LLM Foundations",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to unlock Prompt Engineering and earn your track certificate.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt:
        "A colleague says \"the model remembers our earlier conversation.\" What is the most precise correction?",
      options: [
        "It remembers only the last 10 turns",
        "Each call is stateless; the client re-sends history as part of the prompt",
        "It remembers until the context window fills, then forgets the oldest turns itself",
        "It stores the conversation server-side, keyed by session id",
      ],
      correctIndex: 1,
      explanation:
        "The API holds no state. Whatever the model 'remembers' is text your code chose to include in this call — which is why truncation and summarisation are application concerns.",
    },
    {
      id: "g2",
      prompt:
        "Which pair of operations describes temperature and top-p respectively?",
      options: [
        "truncate, then rescale",
        "rescale, then truncate",
        "both truncate",
        "both rescale",
      ],
      correctIndex: 1,
      explanation:
        "Temperature divides the logits before softmax, reshaping the whole distribution without removing candidates. Top-p then cuts the tail beyond cumulative mass p and renormalises.",
    },
    {
      id: "g3",
      prompt:
        "You must generate a 3,000-token report with a 500-token prompt, and separately classify 3,000 documents with 800-token prompts and 3-token answers. Which statement is true?",
      options: [
        "The report is output-dominated and latency-bound; the classification is input-dominated and benefits most from prompt caching",
        "Both are input-dominated",
        "Prompt caching helps the report more, since its prompt is shorter",
        "The classification will have the worse time-to-first-token",
      ],
      correctIndex: 0,
      explanation:
        "Output tokens are sequential and expensive, so the report is slow and output-priced. Classification re-sends a large stable prefix thousands of times — the ideal caching workload.",
    },
    {
      id: "g4",
      prompt: "Why is attention compute quadratic in sequence length?",
      options: [
        "Because each layer is run twice per token",
        "Because every query is compared against every key, producing an n × n score matrix",
        "Because the KV cache must be re-sorted each step",
        "Because softmax is O(n²)",
      ],
      correctIndex: 1,
      explanation:
        "Q·Kᵀ is n × n. The feed-forward network, by contrast, is linear in n because it acts at each position independently.",
    },
    {
      id: "g5",
      prompt:
        "Your Hindi-language traffic costs roughly 3x per request compared with English for the same content. The root cause is:",
      options: [
        "A surcharge applied by the provider for non-English requests",
        "BPE merges were learned mostly from English text, so other scripts split into more tokens",
        "Hindi requires a larger context window",
        "Unicode characters are billed at double rate",
      ],
      correctIndex: 1,
      explanation:
        "Token cost tracks training-corpus frequency. Under-represented scripts never earned merges, so the same meaning costs more tokens — and the usable context shrinks too.",
    },
    {
      id: "g6",
      prompt:
        "In a causal transformer, the mask is applied at which point?",
      options: [
        "Multiplied onto the attention weights after softmax",
        "Added to the scores before softmax, as negative infinity",
        "Applied to the input embeddings",
        "Applied to the values before the weighted sum",
      ],
      correctIndex: 1,
      explanation:
        "Additive and pre-softmax. Masking after softmax leaves rows summing to less than 1 and lets future positions influence the normalisation — a subtle bug that still trains.",
    },
    {
      id: "g7",
      prompt:
        "A request to a 200k-token model fails with a context-length error. Your prompt counts 197,000 tokens. The most likely explanation is:",
      options: [
        "The model's real limit is lower than advertised",
        "max_tokens for the response must also fit inside the same window",
        "Token counts are always approximate",
        "The system prompt is not counted",
      ],
      correctIndex: 1,
      explanation:
        "The window bounds input plus output. With max_tokens of 4,000 reserved, 197,000 of prompt cannot fit — budget as window minus output minus a safety margin.",
    },
    {
      id: "g8",
      prompt:
        "Which action is the *weakest* response to a JSON extraction endpoint failing a few percent of the time?",
      options: [
        "Set temperature to 0",
        "Use the provider's structured-output or tool-calling mode",
        "Validate against a schema and retry with the validation error fed back",
        "Upgrade to a larger model and keep the same decoding parameters",
      ],
      correctIndex: 3,
      explanation:
        "A bigger model at a non-zero temperature still samples. Fix decoding and constrain the format first; model size is the expensive answer to a cheap problem.",
    },
    {
      id: "g9",
      prompt:
        "The lost-in-the-middle effect implies which design choice for a RAG prompt?",
      options: [
        "Place as many retrieved documents as possible in the window",
        "Put the question last, order the strongest documents at the edges, and retrieve fewer and better",
        "Sort retrieved documents alphabetically for consistency",
        "Put the system prompt at the end so it is most attended",
      ],
      correctIndex: 1,
      explanation:
        "Material in the middle of a long context is used less reliably, and irrelevant context actively lowers accuracy. The system prompt stays first so it remains cacheable.",
    },
    {
      id: "g10",
      prompt:
        "Which selection process best reflects production practice?",
      options: [
        "Pick the top-ranked model on a public leaderboard and ship it",
        "Pick the cheapest model and add retries until quality is acceptable",
        "Prototype on the strongest model to find the quality ceiling, then walk down tiers against your own eval set and pin the chosen version",
        "Run every request through two models and compare the answers",
      ],
      correctIndex: 2,
      explanation:
        "Establish feasibility at the top, measure on your own distribution, then take the cheapest model that holds quality — and pin the dated version with evals in CI.",
    },
  ],
};

export const llmFoundations: Track = {
  slug: "llm-foundations",
  order: 1,
  title: "LLM Foundations",
  tagline: "How models actually work",
  description:
    "Build the mental model everything else rests on: next-token prediction, tokens, context windows, decoding parameters, attention, and how to choose a model. Every lesson ends with the interview questions this material is tested with.",
  level: "beginner",
  icon: "Boxes",
  accentVar: "--accent",
  interviewTopics: [
    "Next-token prediction & autoregression",
    "Logits, softmax, decoding",
    "Tokenization & BPE",
    "Context windows & KV cache",
    "Temperature, top-p, determinism",
    "Attention, masking, positional encoding",
    "Cost & latency modelling",
    "Model selection & evals",
  ],
  lessons: [whatLlmsDo, tokens, contextWindows, sampling, attention, choosingAModel],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "The primitive",
      items: [
        {
          term: "One forward pass",
          detail:
            "Produces one logit per vocabulary token. Softmax → distribution; decoding → one token. Generation is that loop, appending each token.",
        },
        {
          term: "Softmax",
          detail: "p_i = exp(logit_i) / Σ exp(logit_j). Subtract the max first for numerical stability.",
        },
        {
          term: "Prefill vs decode",
          detail:
            "Prefill processes the prompt in parallel → time-to-first-token. Decode is sequential, one pass per output token → tokens/sec. Output length dominates total latency.",
        },
        {
          term: "KV cache",
          detail:
            "Keys/values of earlier tokens are computed once and reused. Makes decode linear instead of quadratic per token; costs GPU memory that grows with sequence length.",
        },
        {
          term: "Stop reason",
          detail:
            "Always check it. A length stop means truncation, not a complete answer.",
        },
      ],
    },
    {
      heading: "Tokens",
      items: [
        {
          term: "Rule of thumb",
          detail:
            "~4 characters / ~0.75 words per token in English. Never use this for a limit check — count with the model's own tokenizer.",
        },
        {
          term: "BPE",
          detail:
            "Start from bytes, repeatedly merge the most frequent adjacent pair, stop at the target vocab size. Encoding replays the merge list greedily.",
        },
        {
          term: "Cost multipliers",
          detail:
            "Non-Latin scripts 2–4×. Pretty-printed JSON, uppercase and rare words all cost extra. Tokenizers are model-specific.",
        },
        {
          term: "Tokenization-shaped bugs",
          detail:
            "Letter counting, string reversal, rhyming, long-number arithmetic, stop sequences that never match.",
        },
      ],
    },
    {
      heading: "Context budget",
      items: [
        {
          term: "The equation",
          detail:
            "system + history + retrieved + tools + max_output ≤ window. Reserve the output, then a safety margin.",
        },
        {
          term: "Prompt layout",
          detail:
            "Stable prefix first (cacheable): system → tools/few-shot → retrieved → history → question last (strongest attention).",
        },
        {
          term: "Lost in the middle",
          detail:
            "Material at the start and end is used more reliably than the middle. Irrelevant context lowers accuracy — retrieve less and better.",
        },
        {
          term: "Memory strategies",
          detail:
            "Sliding window (cheap, forgets) · summarise & compact (continuity, lossy) · retrieval (scales, can miss) · structured scratchpad (agents).",
        },
        {
          term: "Never front-trim blindly",
          detail: "Index 0 is the system prompt. Pin it, trim the turns after it.",
        },
      ],
    },
    {
      heading: "Decoding",
      items: [
        {
          term: "temperature",
          detail:
            "Divides logits before softmax. <1 sharpens, >1 flattens, →0 is greedy. Rescales; never truncates.",
        },
        {
          term: "top-p (nucleus)",
          detail:
            "Smallest set whose probabilities reach p, renormalised. Adaptive: narrow when confident, wide when uncertain.",
        },
        {
          term: "top-k",
          detail: "Fixed cut at k candidates. Non-adaptive; usually leave off if using top-p.",
        },
        {
          term: "Settings by task",
          detail:
            "Extraction/JSON/tools → 0 · code → 0–0.2 · chat/summary → 0.3–0.7 · brainstorming → 0.8–1.0 with top-p 0.95.",
        },
        {
          term: "Determinism caveat",
          detail:
            "temp 0 removes sampling randomness only. GPU float variation and unpinned model aliases can still change output.",
        },
      ],
    },
    {
      heading: "Attention",
      items: [
        {
          term: "The formula",
          detail: "softmax((Q Kᵀ)/√d_k + M) V — queries vs keys, scaled, masked, weighted sum of values.",
        },
        {
          term: "Why √d_k",
          detail:
            "Dot-product variance grows with dimension; without scaling softmax saturates and gradients vanish.",
        },
        {
          term: "Causal mask",
          detail: "Additive −∞ on future positions, before softmax. After softmax is a bug.",
        },
        {
          term: "Heads & layers",
          detail:
            "Heads attend in parallel subspaces and concatenate. Attention moves info between positions; the FFN transforms within one. Residuals carry signal through depth.",
        },
        {
          term: "Positional encoding",
          detail:
            "Attention is permutation-invariant, so position is injected — sinusoidal, learned, or RoPE (encodes relative distance).",
        },
      ],
    },
    {
      heading: "Model selection",
      items: [
        {
          term: "Five axes",
          detail: "Capability · latency · cost · context window · control and privacy.",
        },
        {
          term: "Cost formula",
          detail:
            "(in/1e6 × in_price) + (out/1e6 × out_price). Output usually several times input — never collapse the two.",
        },
        {
          term: "Cost levers, in order",
          detail:
            "Prompt caching on a stable prefix → cascade/router to a cheaper tier → shorter outputs → batch API.",
        },
        {
          term: "Cascade vs router",
          detail:
            "Cascade: try cheap, escalate on a failed check. Router: classify first, dispatch to a tier. Both need evals.",
        },
        {
          term: "Benchmarks",
          detail:
            "Contaminated, harness-sensitive and off-distribution. Build a 50–200 case golden set from real traffic; keep it in CI.",
        },
        {
          term: "Pin versions",
          detail:
            "A model alias is a moving target. Pin dated versions, re-run evals on every bump.",
        },
      ],
    },
  ],
};
