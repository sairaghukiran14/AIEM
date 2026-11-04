import type { LessonExtras } from "./types";

export const evalExtras: LessonExtras = {
  "evals-fundamentals": {
    concept: [
      {
        type: "predict",
        title: "Predict: what makes a good test set?",
        prompt: "You are building an eval set for a support assistant. Which collection is best?",
        options: [
          "Ten examples you wrote while building the prompt",
          "Real, representative cases from users, plus known edge cases, each with a clear definition of a good answer",
          "Only the hardest cases you can invent",
          "Whatever the model finds easy, so scores look good",
        ],
        answer: 1,
        why: "An eval only predicts the future if it looks like it. Mix typical and tricky real cases and write down what a pass means.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Is a two-point gain real?",
        problem: "Your current prompt scores 80% on the test set. A new prompt scores 82%. How big must the test set be before you trust a 2-point difference? Use the margin of error 1.96 x sqrt(p x (1 - p) / n) around 80%.",
        steps: [
          { do: "With n = 50 cases.", result: "1.96 x sqrt(0.8 x 0.2 / 50) = 1.96 x 0.0566 = about plus or minus 11 points" },
          { do: "With n = 200 cases.", result: "1.96 x sqrt(0.16 / 200) = 1.96 x 0.0283 = about plus or minus 5.5 points" },
          { do: "Compare the 2-point gain with those margins.", result: "It is far smaller than either, so it could easily be noise." },
          { do: "What would settle it?", result: "More cases, or a paired comparison that looks at which individual cases changed." },
        ],
        takeaway:
          "Small test sets cannot see small differences. Know your margin before you celebrate or panic about a score.",
      },
    ],
  },

  "llm-as-judge": {
    concept: [
      {
        type: "predict",
        title: "Predict: the judge that likes answer A",
        prompt: "A model judge picks the first of two answers 70% of the time, even when you swap them. What is this, and how do you handle it?",
        options: [
          "Position bias: run each pair in both orders and only count a win if it holds in both",
          "The answers are identical, so nothing is needed",
          "Judges are never biased",
          "Raise the temperature",
        ],
        answer: 0,
        why: "Judges favour answers by position, length and style. Swapping order and requiring agreement removes much of the effect, and you should still spot-check the judge against human labels.",
      },
    ],
    underTheHood: [
      {
        type: "compare",
        title: "Two judge prompts",
        prompt: "You want a model to grade support answers. Which judge prompt is better designed?",
        a: { label: "Judge A", text: "Which answer is better? Reply A or B." },
        b: {
          label: "Judge B",
          text: "Grade the answer against this rubric:\n1. Correct per the supplied policy (0-2)\n2. Polite and clear (0-1)\n3. No invented facts (0-2)\nExplain briefly, then give the total as `SCORE: n`.\nEach answer is graded alone, then pairs are re-run in swapped order.",
        },
        better: 1,
        why: "A rubric makes the criteria explicit and repeatable, and grading single answers with swapped pairs reduces position bias. Judge A is vague and invites bias.",
      },
    ],
  },

  "generation-metrics": {
    concept: [
      {
        type: "predict",
        title: "Predict: when exact match misleads",
        prompt: "You score summaries by exact match with a reference summary. What is the likely result?",
        options: [
          "A fair score for every summary",
          "Almost every score is zero, because many different wordings are equally good",
          "Perfect scores",
          "Scores that match human judgement closely",
        ],
        answer: 1,
        why: "Exact match suits tasks with one right string, such as extracting an ID. For open-ended text use overlap or meaning-based metrics, or a judge.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Computing token F1 by hand",
        problem: "Reference: `the cat sat on the mat` (6 tokens). Prediction: `the cat is on the mat` (6 tokens). Compute token-level precision, recall and F1.",
        steps: [
          { do: "Count the tokens the two share, matching duplicates once each.", result: "the, the, cat, on, mat = 5 shared (`sat` and `is` differ)" },
          { do: "Precision is shared over prediction length.", result: "5 / 6 = 0.833" },
          { do: "Recall is shared over reference length.", result: "5 / 6 = 0.833" },
          { do: "F1 is the harmonic mean.", result: "2 x 0.833 x 0.833 / (0.833 + 0.833) = 0.833" },
        ],
        takeaway:
          "F1 gives partial credit where exact match gives zero. It still cannot tell that `sat` and `is` change the meaning, so pair it with other checks.",
      },
    ],
  },

  "regression-testing-in-ci": {
    concept: [
      {
        type: "predict",
        title: "Predict: the flaky eval",
        prompt: "An eval in CI fails on some runs and passes on others with no code change. What helps most?",
        options: [
          "Ignore failures that disappear on rerun",
          "Lower temperature where possible, set a pass threshold with tolerance, and look at scores across several runs instead of one",
          "Remove the eval",
          "Make the test set smaller",
        ],
        answer: 1,
        why: "Model outputs vary. Treat scores as noisy measurements: reduce the noise where you can and judge them against a tolerance rather than a single run.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Keeping the suite affordable",
        problem: "The full suite has 200 cases of about 2,000 tokens each, at $3 per million tokens. The team opens 30 pull requests a day. Compare running everything on each PR with a split plan.",
        steps: [
          { do: "Cost of one full run.", result: "200 x 2,000 = 400,000 tokens, so $1.20" },
          { do: "Full run on every PR.", result: "30 x $1.20 = $36 per day" },
          { do: "Split plan: a 40-case smoke set per PR.", result: "40 x 2,000 = 80,000 tokens = $0.24, times 30 = $7.20" },
          { do: "Add one full run each night.", result: "$7.20 + $1.20 = $8.40 per day, about 77% cheaper" },
        ],
        takeaway:
          "A small fast set catches most breakage on every change, and the full set runs on a schedule. You keep the safety net without a large bill.",
      },
    ],
  },

  "tracing-and-observability": {
    concept: [
      {
        type: "predict",
        title: "Predict: debugging yesterday's bad answer",
        prompt: "A user reports a wrong answer from yesterday. Which logged data lets you reproduce what happened?",
        options: [
          "Only the final reply",
          "The full trace: prompt version, retrieved documents, tool calls and results, model, parameters and timings",
          "The user's email address",
          "Total daily token count",
        ],
        answer: 1,
        why: "Reproducing an LLM failure needs every input to the step that went wrong. A trace ties them together under one request id (with sensitive data handled appropriately).",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Reading latency from a trace",
        problem: "A request took 4.2 seconds. Its spans: embed query 0.1 s, vector search 0.2 s, rerank 0.4 s, LLM call 3.3 s, output validation 0.2 s. Where should you look first?",
        steps: [
          { do: "Check that the spans account for the total.", result: "0.1 + 0.2 + 0.4 + 3.3 + 0.2 = 4.2 seconds" },
          { do: "Find the largest span.", result: "The LLM call at 3.3 seconds" },
          { do: "Work out its share.", result: "3.3 / 4.2 = 79% of the time" },
          { do: "Decide what to try.", result: "Shorten the prompt or output, stream the reply, or use a faster model. Shaving the 0.2 s validation would barely register." },
        ],
        takeaway:
          "A trace turns a vague complaint, it is slow, into a number you can act on. Always attack the biggest span first.",
      },
    ],
  },

  "online-evaluation": {
    concept: [
      {
        type: "predict",
        title: "Predict: was the new version really better?",
        prompt: "After a prompt change, thumbs-down fell from 5% to 4% over a few days. What should you ask before declaring victory?",
        options: [
          "Nothing: lower is better",
          "Whether the difference is larger than chance given how many users rated, and whether the groups were comparable",
          "Whether the prompt is shorter",
          "Whether the model name changed",
        ],
        answer: 1,
        why: "Small rate changes on modest samples are often noise. Compare control and variant at the same time on similar users and test the difference.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Is 5% versus 4% significant?",
        problem: "Control: 50 thumbs-down out of 1,000 chats (5%). Variant: 40 out of 1,000 (4%). Is the difference real? Use the standard error of a difference between two proportions and a threshold of 1.96.",
        steps: [
          { do: "Variance of each rate.", result: "Control: 0.05 x 0.95 / 1,000 = 0.0000475. Variant: 0.04 x 0.96 / 1,000 = 0.0000384." },
          { do: "Standard error of the difference.", result: "sqrt(0.0000475 + 0.0000384) = sqrt(0.0000859) = 0.00927" },
          { do: "The measured difference is 0.01. Divide by the standard error.", result: "0.01 / 0.00927 = 1.08" },
          { do: "Compare with 1.96.", result: "1.08 is below it, so a one-point drop on 1,000 chats each is consistent with chance. Collect more data." },
        ],
        takeaway:
          "A change that looks like a win can still be luck. Decide the sample size before the test, then judge the result against it.",
      },
    ],
  },
};
