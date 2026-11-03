import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "context-windows-and-memory",
  order: 3,
  title: "Context Windows & Memory",
  summary:
    "The model has no memory between calls. Everything it 'remembers' is text you re-send — and the window it fits in is a budget you manage.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "A model call is **stateless**. The API does not remember your last message; a conversation only exists because the client re-sends the entire history on every turn. The **context window** is the maximum number of tokens one call may contain — prompt *and* generated output together.",
    },
    {
      type: "visual",
      key: "context-window",
      caption:
        "Add turns to a conversation and watch the window fill, then watch different truncation strategies decide what gets dropped.",
    },
    {
      type: "p",
      text: "So a chatbot's memory is an illusion maintained by your code. Every turn, you decide what goes in: the system prompt, some slice of history, retrieved documents, tool results — and you must leave room for the answer.",
    },
    {
      type: "callout",
      tone: "key",
      title: "The budget equation",
      text: "system + history + retrieved context + tool results + max_output_tokens ≤ context window. The last term is the one people forget, and it is why requests fail at 'only' 90% full.",
    },
    { type: "h", text: "Bigger windows do not mean you can stop thinking" },
    {
      type: "ul",
      items: [
        "**Cost scales with what you send,** every single turn. A 100k-token context re-sent over a 20-turn conversation is 2M input tokens.",
        "**Latency scales with prefill.** Long prompts push out time-to-first-token even when the answer is short.",
        "**Attention is not uniform.** Models reliably use the beginning and end of a long context better than the middle — the **lost-in-the-middle** effect. Burying the key fact at 50% depth is a real failure mode.",
        "**Irrelevant context actively hurts.** Distractor documents lower accuracy; more context is not monotonically better.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "The classic truncation bug",
      text: "Dropping the oldest messages to make room is fine — until it silently eats the system prompt, and your carefully-tuned assistant forgets its own instructions mid-conversation.",
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "The window limit comes from **positional encoding and attention cost**. Attention is quadratic in sequence length at training time, and the model only learned position representations up to the length it was trained on. Pushing past that degrades quality even where the API accepts it.",
    },
    {
      type: "p",
      text: "At inference, long contexts cost **memory** as much as compute: the KV cache grows linearly with sequence length, and it has to live in GPU memory for the whole generation. That is the real reason long-context requests are priced and rate-limited differently.",
    },
    { type: "h", text: "The four strategies you will actually implement" },
    {
      type: "table",
      headers: ["Strategy", "How it works", "Good for", "Cost"],
      rows: [
        [
          "**Sliding window**",
          "keep the last N turns, always keep the system prompt",
          "chat where only recent turns matter",
          "cheap, loses old facts",
        ],
        [
          "**Summarise & compact**",
          "fold old turns into a running summary, keep recent turns verbatim",
          "long assistants that need continuity",
          "an extra model call; lossy",
        ],
        [
          "**Retrieval (RAG)**",
          "store everything externally, fetch only what's relevant",
          "large knowledge bases",
          "infrastructure; retrieval can miss",
        ],
        [
          "**Structured scratchpad**",
          "maintain explicit state (facts, decisions) outside the transcript",
          "agents, multi-step tasks",
          "you must maintain it",
        ],
      ],
    },
    {
      type: "p",
      text: "Two optimisations pair with all of them. **Prompt caching** lets a provider reuse the prefill of a stable prefix across calls, cutting cost and latency dramatically — which is why the invariant parts of your prompt belong at the *front*, in a fixed order. And **placing the question last** exploits recency, keeping the instruction in the model's strongest attention region.",
    },
    {
      type: "code",
      language: "text",
      code: `recommended prompt layout (front = cacheable, back = strongest attention)

  1. system prompt / role            <- stable, cached
  2. tool definitions, few-shot      <- stable, cached
  3. retrieved documents             <- varies per request
  4. conversation history            <- grows
  5. the user's actual question      <- last, most attended`,
      caption: "Order is an engineering decision, not cosmetic.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That context is a managed budget with a cost and an attention profile — not free space. Then they name a concrete strategy and its trade-off, rather than reaching for 'use a bigger model'.",
    },
  ],

  codeExample: {
    language: "python",
    caption:
      "A history trimmer that respects the system prompt, reserves output room, and keeps turns paired.",
    code: `MODEL_WINDOW = 200_000
MAX_OUTPUT = 4_000
SAFETY = 1_000            # headroom for template overhead


def trim_history(system: str, history: list[dict], question: str) -> list[dict]:
    """Keep the newest turns that fit; never drop the system prompt."""
    budget = (
        MODEL_WINDOW
        - MAX_OUTPUT
        - SAFETY
        - count_tokens(system)
        - count_tokens(question)
    )
    if budget <= 0:
        raise ValueError("system prompt and question alone exceed the window")

    kept: list[dict] = []
    total = 0

    # Walk backwards: recent turns matter most.
    for message in reversed(history):
        cost = count_tokens(message["content"])
        if total + cost > budget:
            break                     # stop at the first turn that doesn't fit
        kept.append(message)
        total += cost

    kept.reverse()

    # Don't start the window on an assistant reply with no question before it.
    if kept and kept[0]["role"] == "assistant":
        kept.pop(0)

    return kept


def build_messages(system, history, question):
    return {
        "system": system,                          # stable prefix -> cacheable
        "messages": [
            *trim_history(system, history, question),
            {"role": "user", "content": question}, # question last
        ],
        "max_tokens": MAX_OUTPUT,
    }`,
  },

  interview: [
    {
      question: "How does an LLM remember earlier turns in a conversation?",
      answer:
        "It doesn't. Each API call is stateless. The client re-sends the entire relevant history as part of the prompt on every turn, so 'memory' is whatever text you choose to include. That makes memory an application design problem: you decide what to keep verbatim, what to summarise, and what to store externally and retrieve.",
      weakAnswer:
        "The model keeps the conversation in its context. — It inverts the responsibility; the context is something you construct each call.",
    },
    {
      question:
        "A request fails for exceeding the context window even though your prompt is comfortably under the limit. Why?",
      answer:
        "Because the window covers input and output together. If the window is 200k and max_tokens is 8k, the prompt must fit in roughly 192k, minus whatever overhead the chat template and tool definitions add. The fix is to budget explicitly: window minus max_output minus a safety margin is your real prompt allowance.",
    },
    {
      question: "What is the lost-in-the-middle effect, and how do you design around it?",
      answer:
        "Retrieval accuracy over long contexts is not uniform — models use material at the start and end of the prompt more reliably than material buried in the middle. So placement matters: put instructions and the actual question last, put the most relevant retrieved documents at the edges rather than the centre, and above all retrieve fewer, better documents instead of padding the window. Adding irrelevant context measurably lowers accuracy.",
      followUp: "How would you measure whether your ordering helped?",
    },
    {
      question:
        "We now have a million-token window. Is RAG obsolete?",
      answer:
        "No, for four reasons. Cost: you re-send the whole context every turn, so a large stuffed prompt is expensive at conversation scale. Latency: prefill grows with prompt length. Quality: irrelevant context degrades answers and the middle of a long prompt is used less reliably. And scale: corpora are far larger than any window, and they change — retrieval gives you freshness and access control that stuffing cannot. Long context and RAG compose; the window raises the ceiling on how much retrieved material you can afford to include.",
    },
    {
      question:
        "How would you implement conversation memory for an assistant used daily for months?",
      answer:
        "Tiered. Keep the last handful of turns verbatim for coherence. Maintain a rolling summary of older turns, refreshed by a cheap model whenever the transcript crosses a threshold. Extract durable facts — preferences, names, decisions — into structured storage rather than prose, so they can be injected deterministically and edited. Put long-term material behind retrieval keyed on the current turn. And keep the stable prefix first and byte-identical so prompt caching can hit.",
    },
  ],

  challenges: [
    {
      id: "fnd-3-quiz",
      kind: "quiz",
      title: "Checkpoint: context and memory",
      blurb: "Five questions on budgeting the window.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What does the context window limit?",
          options: [
            "The prompt only",
            "The output only",
            "Prompt and output tokens combined, in a single call",
            "The total tokens across a whole conversation",
          ],
          correctIndex: 2,
          explanation:
            "It bounds one call's input plus its generated output. Across a conversation you may send far more in total — you just cannot exceed the window on any single call.",
        },
        {
          id: "q2",
          prompt:
            "You trim history by dropping messages from the front of the list until it fits. What is the hidden bug?",
          options: [
            "Recent turns get dropped first",
            "The system prompt is usually first, so it gets dropped",
            "Token counts become inaccurate",
            "There is no bug; this is the standard approach",
          ],
          correctIndex: 1,
          explanation:
            "The system prompt lives at the front. Blind front-trimming eventually removes it and the assistant loses its instructions mid-conversation. Pin it, then trim the oldest *turns*.",
        },
        {
          id: "q3",
          prompt: "The lost-in-the-middle effect means that:",
          options: [
            "Tokens in the middle of a prompt are not billed",
            "Information placed in the middle of a long context is used less reliably than at the start or end",
            "The KV cache drops middle tokens",
            "Middle tokens are processed after the rest",
          ],
          correctIndex: 1,
          explanation:
            "It is an empirical quality effect. Design around it with placement and, more importantly, by retrieving less and better.",
        },
        {
          id: "q4",
          prompt:
            "Which prompt layout gives prompt caching the best chance of a hit?",
          options: [
            "Put the user's question first so it is most visible",
            "Randomise section order to avoid overfitting",
            "Keep stable content (system prompt, tool definitions) first and byte-identical, with variable content after",
            "Put retrieved documents first, before the system prompt",
          ],
          correctIndex: 2,
          explanation:
            "Caching works on a shared prefix. Any variation early invalidates everything after it, so stable content goes first and must not change between calls.",
        },
        {
          id: "q5",
          prompt:
            "Your window is 200,000 tokens and you set max_tokens to 8,000. Roughly what is your usable prompt budget?",
          options: [
            "200,000",
            "208,000",
            "A bit under 192,000, after a safety margin for template overhead",
            "100,000 — the window is split evenly",
          ],
          correctIndex: 2,
          explanation:
            "Window minus reserved output, then minus headroom for the chat template, tool definitions and count drift. Budget conservatively; the failure mode is a hard error.",
        },
      ],
    },
    {
      id: "fnd-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a sliding-window trimmer",
      blurb:
        "It keeps the conversation under budget, and after a while the assistant forgets who it is.",
      language: "python",
      lines: [
        "def trim(messages: list[dict], budget: int) -> list[dict]:",
        "    total = sum(count_tokens(m['content']) for m in messages)",
        "",
        "    while total > budget and messages:",
        "        dropped = messages.pop(0)",
        "        total -= count_tokens(dropped['content'])",
        "",
        "    return messages",
      ],
      buggyLine: 5,
      reasons: [
        "`pop(0)` removes the oldest message — including the system prompt that sits at index 0",
        "`total` should be recomputed from scratch each iteration",
        "the loop should pop from the end to drop stale turns",
        "`count_tokens` should be called once and cached",
      ],
      correctReasonIndex: 0,
      explanation:
        "Index 0 is the system prompt. Once the conversation grows past the budget, the first thing dropped is the assistant's own instructions — so it silently loses its role, tone and rules. Pin the system message and trim only the turns after it.",
      fix: "system, turns = messages[0], messages[1:]\n    while total > budget and turns:\n        total -= count_tokens(turns.pop(0)['content'])\n    return [system, *turns]",
      xp: 40,
    },
    {
      id: "fnd-3-code",
      kind: "code",
      title: "Code challenge: budget the window",
      blurb:
        "Compute the real prompt allowance, then report whether a request fits.",
      functionName: "promptBudget",
      starter: `/**
 * Work out how many tokens are left for history and retrieved context.
 *
 *   budget = window - maxOutput - safety - systemTokens - questionTokens
 *
 * Return an object: { budget, fits }
 *   - \`budget\` is the remaining allowance, never below 0
 *   - \`fits\` is false when the fixed parts alone overflow the window
 *     (i.e. the raw calculation came out at or below 0)
 *
 * promptBudget({ window: 1000, maxOutput: 100, safety: 50,
 *                systemTokens: 200, questionTokens: 50 })
 *   ->  { budget: 600, fits: true }
 */
function promptBudget({ window, maxOutput, safety, systemTokens, questionTokens }) {
  // your code here
}`,
      tests: [
        {
          name: "typical case",
          args: [
            { window: 1000, maxOutput: 100, safety: 50, systemTokens: 200, questionTokens: 50 },
          ],
          expected: { budget: 600, fits: true },
        },
        {
          name: "realistic 200k window",
          args: [
            { window: 200000, maxOutput: 8000, safety: 1000, systemTokens: 1200, questionTokens: 300 },
          ],
          expected: { budget: 189500, fits: true },
        },
        {
          name: "fixed parts overflow the window",
          args: [
            { window: 500, maxOutput: 200, safety: 50, systemTokens: 400, questionTokens: 100 },
          ],
          expected: { budget: 0, fits: false },
        },
        {
          name: "exactly zero left does not fit",
          args: [
            { window: 400, maxOutput: 100, safety: 0, systemTokens: 200, questionTokens: 100 },
          ],
          expected: { budget: 0, fits: false },
        },
        {
          name: "one token left still fits",
          args: [
            { window: 401, maxOutput: 100, safety: 0, systemTokens: 200, questionTokens: 100 },
          ],
          expected: { budget: 1, fits: true },
        },
        {
          name: "no safety margin",
          args: [
            { window: 100, maxOutput: 10, safety: 0, systemTokens: 10, questionTokens: 10 },
          ],
          expected: { budget: 70, fits: true },
        },
      ],
      hints: [
        "Compute the raw remainder first, then decide `fits` from it before clamping.",
        "`fits` is false when the raw remainder is <= 0 — zero room is not room.",
        "Clamp with Math.max(0, raw) so the reported budget is never negative.",
      ],
      solution: `function promptBudget({ window, maxOutput, safety, systemTokens, questionTokens }) {
  const raw = window - maxOutput - safety - systemTokens - questionTokens;

  return {
    budget: Math.max(0, raw),
    fits: raw > 0,
  };
}`,
      xp: 70,
    },
  ],
};
