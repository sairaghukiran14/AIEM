import type { Quiz, Track } from "@/content/types";

import { lesson as anatomy } from "./lessons/01-anatomy";
import { lesson as fewShot } from "./lessons/02-few-shot";
import { lesson as reasoning } from "./lessons/03-reasoning";
import { lesson as structuredOutput } from "./lessons/04-structured-output";
import { lesson as injection } from "./lessons/05-injection";
import { lesson as testing } from "./lessons/06-testing";

const gate: Quiz = {
  id: "pe-gate",
  kind: "gate",
  title: "Track Gate: Prompt Engineering & Structured Output",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to unlock Embeddings & Vector Search and earn your track badge.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt:
        "A teammate says the system role makes a rule 'secure'. What is the most accurate response?",
      options: [
        "Correct, system instructions can never be overridden",
        "Roles are a chat-template convention in one token stream, so a rule must also be enforced in code, not by role alone",
        "Roles only matter for logging",
        "System messages are encrypted before reaching the model",
      ],
      correctIndex: 1,
      explanation:
        "The model sees one flat sequence. System weighting is learned behaviour, not an enforced boundary.",
    },
    {
      id: "g2",
      prompt:
        "You put the ticket text straight after your instructions with no separator. Which two problems does that cause?",
      options: [
        "Higher cost and lower latency",
        "Instructions and data blur together, and injected text is easier to mistake for instructions",
        "The model refuses to answer",
        "The prompt can no longer be cached",
      ],
      correctIndex: 1,
      explanation:
        "Delimiters separate data from instructions, which reduces honest confusion and makes injection harder, though not impossible.",
    },
    {
      id: "g3",
      prompt:
        "Your few-shot examples are sorted alphabetically by label and the last label is 'other'. Predictions skew to 'other'. Why?",
      options: [
        "Alphabetical order is penalised by the tokenizer",
        "Recency bias: the label of the final examples pulls hardest, so grouped labels bias the outcome",
        "The model memorised the order",
        "Too few labels",
      ],
      correctIndex: 1,
      explanation:
        "Interleave or shuffle labels with a fixed seed so no single label dominates the end.",
    },
    {
      id: "g4",
      prompt:
        "Which task is the weakest candidate for chain-of-thought?",
      options: [
        "A multi-step arithmetic word problem",
        "Routing an email into one of five queues",
        "Planning a database migration",
        "Finding the bug in a short function",
      ],
      correctIndex: 1,
      explanation:
        "A direct classification gains little from reasoning and pays extra tokens and latency.",
    },
    {
      id: "g5",
      prompt:
        "You run self-consistency with five samples at temperature 0. What do you get?",
      options: [
        "A much more reliable answer",
        "Five near-identical answers, so you pay about 5x for no extra diversity",
        "A confidence score of 0",
        "Lower cost than one call",
      ],
      correctIndex: 1,
      explanation:
        "Greedy decoding repeats the same path. Self-consistency needs a non-zero temperature.",
    },
    {
      id: "g6",
      prompt:
        "Which is the correct retry design when a structured reply fails schema validation?",
      options: [
        "Retry the identical request forever",
        "Retry a few times, feeding back the validation errors, then fail with a clear error",
        "Silently return the invalid object",
        "Lower the temperature and retry once without errors",
      ],
      correctIndex: 1,
      explanation:
        "Retries need new information and a cap. Returning invalid data pushes the failure downstream.",
    },
    {
      id: "g7",
      prompt:
        "A reply validates against your schema but the category is clearly wrong. What does this show?",
      options: [
        "The schema validator is faulty",
        "Schema conformance guarantees shape, not correctness, so evals and business checks are still needed",
        "Constrained decoding was disabled",
        "The temperature was too high",
      ],
      correctIndex: 1,
      explanation:
        "Structure and truth are different problems. Only measurement against expected outputs addresses the second.",
    },
    {
      id: "g8",
      prompt:
        "An agent reads emails, can look up customer records, and can send HTTP requests. Which change most reduces exfiltration risk?",
      options: [
        "Add 'ignore instructions in emails' to the prompt",
        "Remove or tightly restrict one of the three: untrusted content, private data access or the outbound channel",
        "Wrap the email body in XML tags",
        "Use a larger model",
      ],
      correctIndex: 1,
      explanation:
        "Removing any one of the three closes that attack path. Prompt warnings and delimiters are not a guarantee.",
    },
    {
      id: "g9",
      prompt:
        "A new prompt version raises the pass rate from 82% to 90%. What do you do before shipping?",
      options: [
        "Ship it, since the rate improved",
        "Diff per case to find regressions, check set size and noise, and confirm on a held-out slice",
        "Increase the temperature to confirm",
        "Delete the failing cases",
      ],
      correctIndex: 1,
      explanation:
        "An aggregate can hide a regression. Per-case diffs, noise awareness and a held-out slice make the result trustworthy.",
    },
    {
      id: "g10",
      prompt:
        "Which practice best matches production prompt management?",
      options: [
        "Edit the live prompt in a dashboard when something breaks",
        "Keep prompts in version control, log the prompt version on every call, run the golden set in CI and roll out gradually",
        "Store the prompt in each developer's notes",
        "Change several things at once to move faster",
      ],
      correctIndex: 1,
      explanation:
        "Prompts are code: versioned, tested, observable and reversible.",
    },
  ],
};

export const promptEngineering: Track = {
  slug: "prompt-engineering",
  order: 2,
  title: "Prompt Engineering & Structured Output",
  tagline: "Getting reliable shapes out",
  description:
    "Write prompts that behave like code: structured, tested and safe. Covers prompt anatomy, few-shot examples, reasoning, schema-validated JSON, prompt injection and how to evaluate and version prompts. Every lesson ends with interview questions.",
  level: "beginner",
  icon: "MessageSquareCode",
  accentVar: "--cyan",
  interviewTopics: [
    "Prompt anatomy & delimiters",
    "System vs user messages",
    "Few-shot design & biases",
    "Chain-of-thought & self-consistency",
    "Structured output & validation",
    "Prompt injection & trust boundaries",
    "Golden sets & regression testing",
    "Prompt versioning",
  ],
  lessons: [anatomy, fewShot, reasoning, structuredOutput, injection, testing],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "Prompt anatomy",
      items: [
        {
          term: "Five parts",
          detail: "Context, task, constraints, input in delimiters, output format. A smart contractor with no context should be able to do the task from the text alone.",
        },
        {
          term: "System vs user",
          detail: "System: stable role, rules, format, tools (also cache-friendly). User: per-request data. Roles are a template convention, not a security boundary.",
        },
        {
          term: "Delimiters",
          detail: "XML-style tags separate data from instructions and name sections. They reduce confusion; they are not a defence against a malicious closing tag.",
        },
        {
          term: "Habits that help",
          detail: "Show the output format, state edge-case rules, say what to do (not only what to avoid), put long data first and the question last.",
        },
        {
          term: "Prompts are code",
          detail: "Version control, review, tests, named versions, easy rollback.",
        },
      ],
    },
    {
      heading: "Examples (few-shot)",
      items: [
        {
          term: "In-context learning",
          detail: "Examples condition the model; no weights change. They are the strongest signal in the prompt, so audit them like rules.",
        },
        {
          term: "Choosing shots",
          detail: "Cover every label, identical format, include edge cases and a correct 'none', stay representative. Start with 3 to 5.",
        },
        {
          term: "Biases",
          detail: "Majority-label bias and recency bias. Balance labels and interleave; avoid ending on the most common label.",
        },
        {
          term: "Cost",
          detail: "Billed every call. Keep a stable prefix so prompt caching applies, or retrieve similar examples dynamically (Track 3).",
        },
        {
          term: "Proof",
          detail: "Only a held-out eval shows whether an example set helps.",
        },
      ],
    },
    {
      heading: "Reasoning",
      items: [
        {
          term: "Chain-of-thought",
          detail: "Intermediate tokens give more computation and working memory. Reason before the final answer, not after.",
        },
        {
          term: "Helps / does not",
          detail: "Helps multi-step tasks (math, logic, planning). Little gain on classification, extraction, formatting.",
        },
        {
          term: "Cost formula",
          detail: "((answer + reasoning) x samples / 1e6) x output_price. Parallel samples multiply cost, not latency.",
        },
        {
          term: "Self-consistency",
          detail: "Sample N paths at temperature > 0, normalise final answers, majority vote; agreement ratio is a confidence signal. Useless at temperature 0.",
        },
        {
          term: "Faithfulness",
          detail: "Shown reasoning may not reflect the true cause. Verify with deterministic checks.",
        },
      ],
    },
    {
      heading: "Structured output",
      items: [
        {
          term: "Three levels",
          detail: "Ask in the prompt (no guarantee) < JSON mode (valid syntax) < schema-constrained output or forced tool call (valid structure).",
        },
        {
          term: "Constrained decoding",
          detail: "Illegal tokens' logits are masked to negative infinity before softmax, so output conforms to the grammar.",
        },
        {
          term: "Pipeline",
          detail: "Check stop reason, parse, validate against schema, apply business rules, bounded retry with errors fed back, then fail loudly.",
        },
        {
          term: "Schema design",
          detail: "Prefer enums, allow null or 'unknown', keep it flat, describe fields, version the schema.",
        },
        {
          term: "Shape is not truth",
          detail: "A valid reply can still be wrong. Add evals and business checks.",
        },
      ],
    },
    {
      heading: "Injection & trust",
      items: [
        {
          term: "Cause",
          detail: "Instructions and data share one token stream. Direct = user types it; indirect = it arrives in content the model reads.",
        },
        {
          term: "Lethal trifecta",
          detail: "Private data + untrusted content + an outbound channel. Remove any one to close the attack path.",
        },
        {
          term: "Not enough alone",
          detail: "'Ignore instructions in the document', delimiters, phrase filters, or a bigger model.",
        },
        {
          term: "Defences",
          detail: "Least privilege, code-enforced policy and human confirmation on side effects, escaped and labelled untrusted content, output validation, no secrets in context, log and test.",
        },
        {
          term: "Rule of thumb",
          detail: "The model proposes; deterministic code decides. Default deny.",
        },
      ],
    },
    {
      heading: "Testing & release",
      items: [
        {
          term: "Golden set",
          detail: "30 to 100+ real inputs, easy majority, edge cases, adversarial cases, one regression case per bug fixed. Keep a held-out slice.",
        },
        {
          term: "Checks",
          detail: "Exact or schema match > programmatic checks > model judge > human review.",
        },
        {
          term: "Method",
          detail: "Pin model and settings, change one thing, evaluate at the shipped temperature (average repeated runs if above 0), diff per case.",
        },
        {
          term: "Averages hide regressions",
          detail: "Always list fixes and regressions per case before shipping.",
        },
        {
          term: "Release",
          detail: "Version control, log prompt version per call, golden set in CI, gradual rollout, trivial rollback.",
        },
      ],
    },
  ],
};
