import type { LessonExtras } from "./types";

export const foundationsExtras: LessonExtras = {
  "what-llms-do": {
    concept: [
      {
        type: "predict",
        title: "Predict: same prompt, different answers",
        prompt: "You send the identical prompt twice at temperature 0.8 and get two different replies. What explains it?",
        options: [
          "The model learned from your first request and changed its mind",
          "The model produces a probability for each next token and the reply is drawn from that distribution, so draws can differ",
          "The provider cached a different answer",
          "The weights are re-randomised on every call",
        ],
        answer: 1,
        why: "Weights are fixed between calls. The model scores every possible next token and a sampling step picks one, so a non-zero temperature gives different draws each time.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "How often does sampling not pick the top token?",
        problem:
          "After the text `The capital of France is`, the model gives: Paris 0.80, the 0.10, a 0.06, Lyon 0.04. You sample 5 independent replies. How likely is it that all 5 start with Paris?",
        steps: [
          { do: "Check the scores form a distribution by adding them.", result: "0.80 + 0.10 + 0.06 + 0.04 = 1.00" },
          { do: "What does greedy decoding (always take the top token) return?", result: "Paris, every time. It is deterministic." },
          { do: "With sampling, what is the chance a single draw is not Paris?", result: "1 - 0.80 = 0.20, so one draw in five on average." },
          { do: "The draws are independent, so multiply the chance of Paris five times.", result: "0.8 x 0.8 x 0.8 x 0.8 x 0.8 = 0.32768, about 33%" },
        ],
        takeaway:
          "Even when the model is 80% sure, five samples all agree only a third of the time. If you need the same answer every run, lower the temperature rather than hoping.",
      },
    ],
  },

  "tokens-and-tokenization": {
    concept: [
      {
        type: "predict",
        title: "Predict: how big is this document?",
        prompt: "A 4,000-word English report goes into a model. Using the rule of thumb that one token is about three quarters of a word, about how many tokens is it?",
        options: ["About 1,000", "About 5,300", "About 16,000", "About 40,000"],
        answer: 1,
        why: "4,000 words divided by 0.75 words per token is about 5,333 tokens. Code, numbers and non-English text usually cost more tokens per word, so measure with the real tokenizer.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Pricing a feature before you build it",
        problem:
          "Each request sends 3,000 input tokens and gets 500 output tokens. Prices are $3 per million input tokens and $15 per million output tokens. The feature runs 10,000 times a day. What does it cost per day?",
        steps: [
          { do: "Input cost for one call: tokens x price per token.", result: "3,000 x 3 / 1,000,000 = $0.009" },
          { do: "Output cost for one call. Output is priced higher.", result: "500 x 15 / 1,000,000 = $0.0075" },
          { do: "Add them for the cost of one request.", result: "$0.009 + $0.0075 = $0.0165" },
          { do: "Scale to the daily volume.", result: "$0.0165 x 10,000 = $165 per day, about $4,950 a month" },
        ],
        takeaway:
          "Output tokens are 5x the price here but only a sixth of the volume, so they are 45% of the bill. Shortening replies is a real lever, not a cosmetic one.",
      },
    ],
  },

  "context-windows-and-memory": {
    concept: [
      {
        type: "predict",
        title: "Predict: the overflowing chat",
        prompt:
          "A chatbot has an 8,000-token window. The conversation so far is 7,500 tokens. The user sends a 1,000-token message and you allow up to 1,000 tokens of reply. What must your code do?",
        options: [
          "Nothing: the model remembers the earlier turns on its own",
          "Trim or summarise older turns before the call, because history is re-sent every time and 9,500 tokens will not fit",
          "Send only the new message and the model will recall the rest",
          "Raise the temperature so the model needs less context",
        ],
        answer: 1,
        why: "The model has no memory between calls. Everything it can use is text you send, and the sum of input and reserved output must fit in the window. Something has to give: drop, summarise or retrieve.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Working out how many past turns fit",
        problem:
          "Window: 8,000 tokens. System prompt: 500. Reserve for the reply: 1,000. The new user message is 400 tokens. Each past turn is about 900 tokens. How many past turns can you keep?",
        steps: [
          { do: "Add the fixed costs that always go in.", result: "500 (system) + 1,000 (reply) + 400 (new message) = 1,900" },
          { do: "Subtract from the window to get the room left for history.", result: "8,000 - 1,900 = 6,100 tokens" },
          { do: "Divide by the size of a turn and round down.", result: "6,100 / 900 = 6.77, so 6 turns (5,400 tokens)" },
          { do: "Which turns do you drop?", result: "Usually the oldest, or summarise them into one short note first." },
        ],
        takeaway:
          "Budget the window from the fixed parts inward. The reply reservation is the one people forget, and forgetting it makes long answers get cut off.",
      },
    ],
  },

  "sampling-and-temperature": {
    concept: [
      {
        type: "predict",
        title: "Predict: pick the setting",
        prompt: "Your code parses the reply with `JSON.parse`. Which decoding choice best fits?",
        options: [
          "Temperature 1.5 so outputs are varied",
          "A low temperature (0 to 0.2), and still validate the result",
          "Top-p of 0.1 and no validation, since the output is now guaranteed",
          "Any temperature, since temperature only changes speed",
        ],
        answer: 1,
        why: "Low temperature makes the reply more repeatable, but no sampling setting guarantees valid JSON. Keep the validation step.",
      },
    ],
    underTheHood: [
      {
        type: "compare",
        title: "Two configurations for extracting invoice totals",
        prompt: "The task is to read an invoice and return the total as a number. Which settings are better?",
        a: { label: "Config A", text: "temperature: 1.2\ntop_p: 1.0\nmax_tokens: 2000\nretries: none" },
        b: { label: "Config B", text: "temperature: 0\nmax_tokens: 50\nvalidate the output is a number\nretry once if it is not" },
        better: 1,
        why: "Extraction has one right answer, so you want repeatability: temperature 0. A tight token limit stops rambling, and a validate-then-retry step catches the rare bad reply. Config A invites variation where none is wanted.",
      },
    ],
  },

  "transformer-intuition": {
    concept: [
      {
        type: "predict",
        title: "Predict: what doubling the prompt does",
        prompt: "Self-attention compares every token with every other token. If you double the prompt length, roughly how does the attention work change?",
        options: ["It stays the same", "It doubles", "It roughly quadruples", "It grows by a fixed amount"],
        answer: 2,
        why: "Pairs grow with n squared. Twice the tokens means about four times the pairs, which is why very long contexts are slower and costlier than they look.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Counting attention pairs",
        problem: "Compare the number of token pairs attention considers for a 1,000-token prompt and a 4,000-token prompt.",
        steps: [
          { do: "Pairs scale as n x n. Start with 1,000 tokens.", result: "1,000 x 1,000 = 1,000,000 pairs" },
          { do: "Now 4,000 tokens.", result: "4,000 x 4,000 = 16,000,000 pairs" },
          { do: "Compare the lengths, then the work.", result: "4x the length gives 16x the pairs" },
          { do: "Causal masking means each token only looks backwards, which halves the count.", result: "About half of each figure, but the 16x ratio is unchanged." },
        ],
        takeaway:
          "Cost grows faster than length. That is one reason to retrieve the few relevant passages instead of pasting a whole library into the prompt.",
      },
    ],
  },

  "choosing-a-model": {
    concept: [
      {
        type: "predict",
        title: "Predict: your first move",
        prompt: "You must choose a model for a new feature. What is the best first step?",
        options: [
          "Use whichever model tops a public leaderboard",
          "Build a small test set from your real inputs and compare candidate models on it",
          "Pick the largest model, since bigger is always better",
          "Pick the cheapest model and fix problems later",
        ],
        answer: 1,
        why: "Leaderboards measure other people's tasks. A few dozen of your own real cases, scored the same way for each model, tell you the quality, latency and cost you will actually get.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Is the pricier model worth it?",
        problem:
          "100,000 tasks a month. Model A: 92% correct, $0.02 per task. Model B: 88% correct, $0.004 per task. Each wrong answer costs $0.50 in human review. Which is cheaper overall?",
        steps: [
          { do: "Model call cost for each.", result: "A: 100,000 x $0.02 = $2,000. B: 100,000 x $0.004 = $400." },
          { do: "Number of failures for each.", result: "A: 8% = 8,000. B: 12% = 12,000." },
          { do: "Cost of failures at $0.50 each.", result: "A: $4,000. B: $6,000." },
          { do: "Add them.", result: "A: $2,000 + $4,000 = $6,000. B: $400 + $6,000 = $6,400." },
        ],
        takeaway:
          "The model that costs 5x more per call is cheaper overall, by $400 a month, because mistakes are expensive. Change the review cost and the answer can flip, so always include it.",
      },
    ],
  },
};
