import type { LessonExtras } from "./types";

export const productionExtras: LessonExtras = {
  "streaming-and-latency": {
    concept: [
      {
        type: "predict",
        title: "Predict: what streaming changes",
        prompt: "You switch a feature from waiting for the full reply to streaming it. What improves?",
        options: [
          "Total generation time drops sharply",
          "Time to the first visible words drops, so it feels faster, while total time is about the same",
          "Cost falls",
          "Accuracy improves",
        ],
        answer: 1,
        why: "The model still generates tokens one after another. Streaming shows them as they arrive, which cuts the wait before anything appears.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Perceived versus total latency",
        problem: "Time to first token is 0.8 s. The reply is 400 tokens generated at 50 tokens per second. Compare what the user waits for with and without streaming.",
        steps: [
          { do: "Time spent generating the 400 tokens.", result: "400 / 50 = 8 seconds" },
          { do: "Total time to the end of the reply.", result: "0.8 + 8 = 8.8 seconds" },
          { do: "Without streaming, the user sees nothing until then.", result: "First text after 8.8 seconds" },
          { do: "With streaming, they see the first text at the time to first token.", result: "After 0.8 seconds, 11 times sooner, with the same 8.8 s total." },
        ],
        takeaway:
          "Streaming is a perceived-speed tool. To reduce the total, shorten the output, trim the prompt, or use a faster model.",
      },
    ],
  },

  "caching-and-cost-control": {
    concept: [
      {
        type: "predict",
        title: "Predict: what breaks the prompt cache?",
        prompt: "Your prompt starts with the current timestamp, then the long system instructions, then the user's question. Why is the cache hit rate near zero?",
        options: [
          "Caches only store short prompts",
          "The timestamp changes every request, so the prefix is never identical",
          "The question is too long",
          "Providers do not support caching",
        ],
        answer: 1,
        why: "Prompt caching reuses an identical prefix. Anything variable at the top invalidates everything after it. Put stable content first and variable content last.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Estimating the saving from prompt caching",
        problem: "80% of each prompt is a stable prefix. The cache hits 90% of the time, and cached tokens cost 10% of the normal price. Prompts are 2,000 tokens, 1,000,000 calls a month, at $3 per million input tokens. What is saved?",
        steps: [
          { do: "Baseline input cost.", result: "2,000 x 1,000,000 = 2 billion tokens, so 2,000 x $3 = $6,000" },
          { do: "Use saving = prefix share x hit rate x (1 - cached price share).", result: "0.8 x 0.9 x (1 - 0.1) = 0.648" },
          { do: "Apply it to the baseline.", result: "0.648 x $6,000 = $3,888 saved" },
          { do: "New monthly input cost.", result: "$6,000 - $3,888 = $2,112" },
        ],
        takeaway:
          "The saving depends on how much of the prompt is stable and how often you hit. Reordering the prompt can move all three numbers.",
      },
    ],
  },

  "reliability-rate-limits-retries": {
    concept: [
      {
        type: "predict",
        title: "Predict: nested retries",
        prompt: "The browser retries 3 times, your server retries 3 times, and the gateway retries 3 times. In the worst case, how many calls reach the provider for one user action?",
        options: ["3", "9", "27", "6"],
        answer: 2,
        why: "Retries multiply across layers: 3 x 3 x 3 = 27. Retry in one layer, with a budget, so a struggling provider is not buried under a storm.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "An exponential backoff schedule",
        problem: "Use delay = min(cap, base x 2^(attempt - 1)) with base 1 second and cap 30 seconds. What are the waits before retries 1 to 6, and what does jitter add?",
        steps: [
          { do: "Attempts 1 to 3.", result: "1 s, 2 s, 4 s" },
          { do: "Attempts 4 and 5.", result: "8 s, 16 s" },
          { do: "Attempt 6 would be 32 s, but it is capped.", result: "min(30, 32) = 30 s" },
          { do: "Add jitter, a random amount on each wait.", result: "Clients no longer retry in lockstep, which spreads the load. Always honour a Retry-After header if it asks for longer." },
        ],
        takeaway:
          "Exponential delay gives a failing service room to recover, the cap bounds the worst case, and jitter prevents a thundering herd.",
      },
    ],
  },

  "guardrails-and-safety": {
    concept: [
      {
        type: "predict",
        title: "Predict: the leaked key",
        prompt: "The model echoes an API key that appeared in the context into its reply. Which layer should catch it?",
        options: [
          "An output check that scans and redacts secrets before the reply is shown",
          "A shorter system prompt",
          "The user's browser",
          "Nothing can catch it",
        ],
        answer: 0,
        why: "Output guardrails check what is about to leave the system: secrets, personal data, harmful content, schema violations. Keep secrets out of the prompt as well, because the filter is a second line of defence.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Why most flags are false alarms",
        problem: "Of 1,000,000 messages, 0.1% are harmful. A filter catches 95% of harmful messages and wrongly flags 1% of harmless ones. How trustworthy is a flag?",
        steps: [
          { do: "Harmful messages and those caught.", result: "1,000 harmful, 95% caught = 950" },
          { do: "Harmless messages wrongly flagged.", result: "999,000 x 1% = 9,990" },
          { do: "Total flags, then the share that are real.", result: "950 + 9,990 = 10,940 flags, and 950 / 10,940 = 8.7% are truly harmful" },
          { do: "What follows for the response?", result: "Do not hard-block on every flag. Use graduated actions: warn, review, or block only at high confidence." },
        ],
        takeaway:
          "When the bad thing is rare, even a good filter produces mostly false alarms. Choose the action by the cost of each kind of error.",
      },
    ],
  },

  "scaling-and-architecture": {
    concept: [
      {
        type: "predict",
        title: "Predict: requests in flight",
        prompt: "Requests arrive at 20 per second and each takes 6 seconds to complete. About how many are in progress at any moment?",
        options: ["6", "20", "26", "120"],
        answer: 3,
        why: "Little's law: in flight = arrival rate x time per request = 20 x 6 = 120. This is how you size concurrency limits and workers.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Checking headroom against a token limit",
        problem: "20 requests per second, each using about 3,000 tokens in total. The provider allows 2,000,000 tokens per minute. Is there headroom?",
        steps: [
          { do: "Tokens per second.", result: "20 x 3,000 = 60,000" },
          { do: "Tokens per minute.", result: "60,000 x 60 = 3,600,000" },
          { do: "Compare with the limit.", result: "3.6 million against 2 million is 1.8 times too much." },
          { do: "Your options.", result: "Queue and smooth the load, ask for a higher limit, route some traffic to a second provider or a smaller model, and cache what repeats." },
        ],
        takeaway:
          "Do this arithmetic before launch day. A limit you cannot see in the code is still a limit your users will hit.",
      },
    ],
  },

  "operating-ai-products": {
    concept: [
      {
        type: "predict",
        title: "Predict: the spent error budget",
        prompt: "A service has used up its whole monthly error budget with a week to go. What is the sensible response?",
        options: [
          "Ship more features as planned",
          "Freeze risky changes and spend the time on reliability until the budget recovers",
          "Delete the SLO",
          "Ignore it until next month",
        ],
        answer: 1,
        why: "An error budget turns reliability into a decision rule. Budget left means you can take risks; budget spent means stability comes first.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Are we burning the budget too fast?",
        problem: "The SLO is 99.5% success over a 30-day month, with 2,000,000 requests expected. By day 20, 7,500 requests have failed. Are you on track?",
        steps: [
          { do: "Allowed failures for the month.", result: "2,000,000 x (100 - 99.5) / 100 = 10,000" },
          { do: "Budget used so far.", result: "7,500 / 10,000 = 75%" },
          { do: "Share of the month elapsed.", result: "20 / 30 = 67%" },
          { do: "Burn rate: budget used divided by time used.", result: "0.75 / 0.67 = 1.125, so you are spending it 12% too fast and will overrun if nothing changes." },
        ],
        takeaway:
          "Watching the burn rate gives an early warning, long before the budget is gone. Slow down risky releases while there is still room.",
      },
    ],
  },
};
