import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "what-llms-do",
  order: 1,
  title: "What an LLM Actually Does",
  summary:
    "Strip away the magic: a language model is a function that scores every possible next token. Everything else is a loop around that.",
  minutes: 12,

  concept: [
    {
      type: "p",
      text: "A large language model does exactly one thing: given a sequence of tokens, it produces a **probability distribution over the next token**. That is the whole primitive. Chat, code generation, summarisation and agents are all built by calling that primitive in a loop and dressing up the input.",
    },
    {
      type: "visual",
      key: "next-token-predictor",
      caption:
        "Press a step button and watch the model score candidate next tokens, pick one, append it, and score again.",
    },
    {
      type: "p",
      text: "Notice what the model never does: it does not plan the sentence, look up a database, or decide to stop. It emits one token, and then the surrounding program feeds the longer sequence back in. This is called **autoregressive generation**.",
    },
    {
      type: "callout",
      tone: "key",
      title: "The one-sentence mental model",
      text: "An LLM is a next-token probability function. A chatbot is a while-loop that calls it.",
    },
    { type: "h", text: "Why this framing pays off" },
    {
      type: "ul",
      items: [
        "**Hallucination stops being mysterious.** The model samples a plausible token, not a true one. Nothing in the primitive checks facts.",
        "**Prompting makes sense.** You cannot give the model instructions in a side channel; you can only change the token sequence it conditions on.",
        "**Latency has a shape.** The first token costs one pass over your whole prompt; each later token costs one small pass. That is why time-to-first-token and tokens-per-second are measured separately.",
        "**Cost is per token, in both directions.** Input tokens and output tokens are billed at different rates, and output is usually far more expensive.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Common beginner mistake",
      text: "Treating the model as a database with a search box. It has no retrieval step unless you build one — that is what RAG, in track 4, exists for.",
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "Concretely, one generation step runs a **forward pass**. Your token ids go in, and the final layer emits one raw score — a **logit** — for every token in the vocabulary. A vocabulary of ~100,000 tokens means ~100,000 logits per step.",
    },
    {
      type: "p",
      text: "Those logits are not probabilities; they are unbounded real numbers. **Softmax** turns them into a distribution that sums to 1:",
    },
    {
      type: "code",
      language: "text",
      code: "p(token_i) = exp(logit_i) / Σ_j exp(logit_j)",
      caption: "Softmax: exponentiate, then normalise.",
    },
    {
      type: "p",
      text: "A **decoding strategy** then turns that distribution into a single choice. Greedy decoding takes the argmax. Sampling draws from the distribution, optionally reshaped by temperature and top-p — the subject of lesson 4.",
    },
    { type: "h", text: "The loop, and why it gets cheaper" },
    {
      type: "ol",
      items: [
        "**Prefill.** The whole prompt is processed in one pass. The model computes and stores internal key/value vectors for every prompt token — the **KV cache**.",
        "**Decode.** Each new token only needs a pass for *itself*, reading the cached keys and values for everything before it.",
        "The generated token is appended, its own KV entries are cached, and step 2 repeats until a stop token or a length limit.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "Why interviewers ask about the KV cache",
      text: "It explains the whole cost model: prefill is parallel and scales with prompt length, decode is sequential and scales with output length. Candidates who know this can reason about latency; candidates who don't guess.",
    },
    {
      type: "table",
      headers: ["Phase", "Scales with", "Parallel?", "What you feel"],
      rows: [
        ["Prefill", "prompt length", "yes", "time-to-first-token"],
        ["Decode", "output length", "no", "tokens per second"],
      ],
    },
    {
      type: "p",
      text: "Generation ends when the model emits an end-of-sequence token, when a configured stop sequence appears, or when `max_tokens` is hit. That last case is a truncation, not a completion — always check the response's stop reason rather than assuming you got a full answer.",
    },
  ],

  codeExample: {
    language: "python",
    caption:
      "The loop made explicit. A real SDK hides steps 2–5, but this is what it does.",
    code: `import math

VOCAB = ["the", "cat", "sat", "on", "mat", "<eos>"]

def forward(tokens: list[str]) -> list[float]:
    """Pretend model: returns one logit per vocabulary token."""
    ...

def softmax(logits: list[float]) -> list[float]:
    m = max(logits)                       # subtract the max for stability
    exps = [math.exp(l - m) for l in logits]
    total = sum(exps)
    return [e / total for e in exps]

def generate(prompt: list[str], max_tokens: int = 20) -> list[str]:
    tokens = list(prompt)
    for _ in range(max_tokens):
        logits = forward(tokens)          # 1. one forward pass
        probs = softmax(logits)           # 2. logits -> distribution
        best = max(range(len(probs)), key=lambda i: probs[i])   # 3. greedy
        token = VOCAB[best]
        if token == "<eos>":              # 4. stop condition
            break
        tokens.append(token)              # 5. append and loop
    return tokens

# The same thing against a real model — the loop lives on the server:
#
#   from anthropic import Anthropic
#   client = Anthropic()
#   msg = client.messages.create(
#       model="claude-sonnet-5-5",
#       max_tokens=256,
#       messages=[{"role": "user", "content": "Explain softmax in one line."}],
#   )
#   print(msg.content[0].text, msg.stop_reason)`,
  },

  interview: [
    {
      question: "What does a large language model actually compute?",
      answer:
        "A probability distribution over the next token, conditioned on all previous tokens. One forward pass produces one logit per vocabulary entry; softmax normalises those into probabilities, and a decoding strategy picks one. Text generation is that step applied repeatedly, with each chosen token appended to the input.",
      weakAnswer:
        "It understands language and predicts what to say next. — True but unfalsifiable; it tells the interviewer nothing about logits, softmax or decoding.",
      followUp: "So where does the stochasticity come from?",
    },
    {
      question: "Why do LLMs hallucinate?",
      answer:
        "Because the objective is plausibility, not truth. The model maximises the likelihood of the next token given its training distribution; there is no step that verifies a claim against a source. A confident-sounding false statement and a true one can have nearly identical probability. Grounding has to be added externally — retrieval, tool calls, or citation-checking.",
      weakAnswer:
        "Because the training data had errors in it. — Partly, but hallucination happens even with clean data; the mechanism is the objective, not the corpus.",
    },
    {
      question:
        "A prompt of 10,000 tokens generating 100 tokens, versus 100 tokens generating 10,000. Which is slower, and why?",
      answer:
        "Generating 10,000 tokens is far slower. The long prompt is processed in a single parallel prefill pass, so it mostly affects time-to-first-token. Output tokens are produced one at a time, each requiring its own sequential forward pass, so output length dominates wall-clock latency. It is usually more expensive too, since output tokens are billed at a higher rate.",
      followUp: "What would you change in the architecture to speed up decode?",
    },
    {
      question: "What is the KV cache and why does it matter?",
      answer:
        "During attention, each token produces key and value vectors. Since previous tokens never change, those vectors are cached after prefill, so generating token N only requires computing the new token's query against cached keys and values rather than re-processing the whole sequence. It turns decode from O(n²) per token into O(n), and it is why long contexts cost memory as well as compute — the cache grows linearly with sequence length.",
    },
    {
      question: "How does the model know when to stop?",
      answer:
        "It doesn't decide in any planned sense. Generation halts when the sampled token is the end-of-sequence token, when a caller-supplied stop sequence is matched, or when max_tokens is reached. The last case truncates mid-thought, so production code should read the response's stop reason and treat a length stop as a failure to handle, not a valid answer.",
    },
  ],

  challenges: [
    {
      id: "fnd-1-quiz",
      kind: "quiz",
      title: "Checkpoint: the next-token primitive",
      blurb: "Five questions on what the model computes and what it costs.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is the direct output of one forward pass through an LLM?",
          options: [
            "A complete sentence",
            "One raw score (logit) for every token in the vocabulary",
            "A single token, already chosen",
            "An embedding vector for the input",
          ],
          correctIndex: 1,
          explanation:
            "The model emits one logit per vocabulary token. Choosing a token from those logits is a separate decoding step, not part of the forward pass.",
        },
        {
          id: "q2",
          prompt: "What does softmax do to a vector of logits?",
          options: [
            "Picks the largest value",
            "Removes negative values",
            "Converts them into a probability distribution that sums to 1",
            "Compresses them to save memory",
          ],
          correctIndex: 2,
          explanation:
            "Softmax exponentiates each logit and divides by the sum, producing non-negative values that total 1. Picking the largest is argmax — a decoding choice applied afterwards.",
        },
        {
          id: "q3",
          prompt:
            "Which workload will have the highest time-to-first-token, all else equal?",
          options: [
            "A 50-token prompt generating 2,000 tokens",
            "A 20,000-token prompt generating 50 tokens",
            "A 50-token prompt generating 50 tokens",
            "Prompt length has no effect on time-to-first-token",
          ],
          correctIndex: 1,
          explanation:
            "Time-to-first-token is dominated by prefill, which scales with prompt length. The 20,000-token prompt must be processed before any output appears. Total latency, by contrast, is dominated by output length.",
        },
        {
          id: "q4",
          prompt: "Why does the KV cache make decoding cheaper?",
          options: [
            "It stores previous answers so repeated questions are free",
            "It compresses the prompt into fewer tokens",
            "It reuses key and value vectors for earlier tokens, so each new token needs only its own pass",
            "It lets several tokens be generated in parallel",
          ],
          correctIndex: 2,
          explanation:
            "Earlier tokens are fixed, so their keys and values are computed once and reused. Note that it does not enable parallel decoding — generation stays sequential.",
        },
        {
          id: "q5",
          prompt:
            "Your API response comes back with stop_reason set to a length limit. What should your code conclude?",
          options: [
            "The answer is complete and can be used",
            "The output was truncated and may be mid-sentence or invalid",
            "The request failed and should be retried identically",
            "The model refused the request",
          ],
          correctIndex: 1,
          explanation:
            "A length stop means max_tokens was hit before the model finished. Treat it as truncation: raise the limit, shorten the task, or continue the generation — but never parse it as a complete answer.",
        },
      ],
    },
    {
      id: "fnd-1-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a generation loop",
      blurb: "This loop produces the same token forever. Find the line at fault.",
      language: "python",
      lines: [
        "def generate(prompt, max_tokens=20):",
        "    tokens = list(prompt)",
        "    output = []",
        "    for _ in range(max_tokens):",
        "        logits = forward(tokens)",
        "        probs = softmax(logits)",
        "        token = VOCAB[argmax(probs)]",
        "        if token == '<eos>':",
        "            break",
        "        output.append(token)",
        "    return output",
      ],
      buggyLine: 10,
      reasons: [
        "softmax should be applied before the forward pass",
        "the chosen token is never appended to `tokens`, so every pass sees the identical input",
        "`max_tokens` should be checked after the loop, not before",
        "`argmax` should be `argmin` for probabilities",
      ],
      correctReasonIndex: 1,
      explanation:
        "Autoregression means feeding your own output back in. The loop appends to `output` but never to `tokens`, so `forward(tokens)` is called with the same sequence every iteration and returns the same logits — the same token, max_tokens times.",
      fix: "output.append(token)\n        tokens.append(token)   # feed it back in",
      xp: 40,
    },
    {
      id: "fnd-1-code",
      kind: "code",
      title: "Code challenge: implement greedy and top-k selection",
      blurb:
        "Write the decoding step by hand. Return the indices of the highest-scoring tokens, highest first.",
      functionName: "topKIndices",
      starter: `/**
 * Return the indices of the k largest values in \`logits\`,
 * ordered from highest score to lowest.
 *
 * topKIndices([0.1, 2.5, 0.3, 1.2], 2)  ->  [1, 3]
 * topKIndices([5, 1, 9], 1)             ->  [2]
 *
 * Ties: the lower index comes first.
 */
function topKIndices(logits, k) {
  // your code here
}`,
      tests: [
        { name: "picks the single best token", args: [[0.1, 2.5, 0.3, 1.2], 1], expected: [1] },
        { name: "orders the top 2 by score", args: [[0.1, 2.5, 0.3, 1.2], 2], expected: [1, 3] },
        { name: "orders the top 3 by score", args: [[0.1, 2.5, 0.3, 1.2], 3], expected: [1, 3, 2] },
        { name: "handles negative logits", args: [[-4, -1, -9, -2], 2], expected: [1, 3] },
        { name: "breaks ties by lower index first", args: [[2, 2, 1], 2], expected: [0, 1] },
        { name: "k larger than the vocabulary returns everything", args: [[1, 3, 2], 10], expected: [1, 2, 0] },
        { name: "k of 0 returns an empty list", args: [[1, 2, 3], 0], expected: [] },
      ],
      hints: [
        "Pair each value with its index before sorting, so you don't lose track of position.",
        "Sort descending by value. For a stable tie-break, compare indices when the values are equal.",
        "Slice to k at the end — and remember k may be larger than the array.",
      ],
      solution: `function topKIndices(logits, k) {
  return logits
    .map((value, index) => ({ value, index }))
    .sort((a, b) => (b.value - a.value) || (a.index - b.index))
    .slice(0, k)
    .map((entry) => entry.index);
}`,
      xp: 70,
    },
  ],
};
