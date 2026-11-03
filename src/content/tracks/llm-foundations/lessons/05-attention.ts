import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "transformer-intuition",
  order: 5,
  title: "Transformer Intuition: Attention",
  summary:
    "You don't need the maths to reason about transformers, but you do need attention. It explains context limits, cost curves and why order matters.",
  minutes: 16,

  concept: [
    {
      type: "p",
      text: "A transformer processes every token **in parallel**, and lets each token look at the others to decide what it means in context. That looking-around is **attention**. The word *bank* has one representation on the way in; after attention over \"river bank\" or \"savings bank\", its representation has shifted toward the right sense.",
    },
    {
      type: "visual",
      key: "attention-grid",
      caption:
        "Hover a token to see what it attends to. Darker cells mean more attention — and notice the upper triangle is always empty.",
    },
    {
      type: "p",
      text: "Each attention step asks three things of every token, and the names are borrowed from search:",
    },
    {
      type: "ul",
      items: [
        "**Query** — what am I looking for?",
        "**Key** — what do I offer to others looking?",
        "**Value** — what do I actually contribute when attended to?",
      ],
    },
    {
      type: "p",
      text: "Compare one token's query against every other token's key; that gives a score per pair. Softmax those scores into weights, then take the weighted sum of the **values**. The result replaces that token's representation. Do this for all tokens at once, and that is one attention layer.",
    },
    {
      type: "callout",
      tone: "key",
      title: "Causal masking",
      text: "In a generative model, a token may only attend to itself and earlier tokens. Future positions are masked to −∞ before softmax, so their weight becomes 0. Without this the model could see the answer it's meant to predict — and generation would be impossible.",
    },
    { type: "h", text: "Why multiple heads, and multiple layers" },
    {
      type: "ul",
      items: [
        "**Heads** run attention several times in parallel with different learned projections. One head may track syntax, another coreference, another position. Their outputs are concatenated — this is **multi-head attention**.",
        "**Layers** stack the whole block dozens of times. Early layers capture surface patterns; later layers compose them into something closer to meaning and task structure.",
        "Each block also has a **feed-forward network** that transforms each position independently — attention moves information between positions, the FFN does the thinking at a position.",
        "**Residual connections** add each block's input back to its output, so information and gradients survive depth.",
      ],
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "The whole mechanism is one formula, and it is worth being able to write it down:",
    },
    {
      type: "code",
      language: "text",
      code: `Attention(Q, K, V) = softmax( (Q Kᵀ) / √d_k + M ) V

  Q  queries    (n × d_k)
  K  keys       (n × d_k)
  V  values     (n × d_v)
  M  causal mask: 0 where allowed, −∞ where forbidden
  n  sequence length`,
    },
    {
      type: "ol",
      items: [
        "**Q Kᵀ** — every query against every key. This produces the n × n score matrix, and it is where quadratic cost comes from.",
        "**÷ √d_k** — scaling. Without it, dot products in high dimensions grow large, softmax saturates, and gradients vanish. This is the 'scaled' in scaled dot-product attention.",
        "**+ M** — add the mask. Forbidden positions become −∞, so softmax sends them to exactly 0.",
        "**softmax** — turn scores into weights summing to 1 per row.",
        "**× V** — weighted sum of values. Each row is a context-aware representation of one token.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "The quadratic problem",
      text: "That score matrix is n × n. Double the sequence and you quadruple the attention compute. This is the single biggest constraint on context length, and the reason for FlashAttention, sliding-window attention, grouped-query attention and the rest of the efficiency literature.",
    },
    { type: "h", text: "Position has to be injected" },
    {
      type: "p",
      text: "Attention itself is **permutation-invariant** — a bag of tokens, not a sequence. Scramble the input and the attention scores are the same set. So position is added explicitly: sinusoidal encodings in the original paper, learned embeddings in some models, and **RoPE** (rotary embeddings) in most current ones, which rotates Q and K by an angle proportional to position so that the dot product naturally encodes *relative* distance.",
    },
    {
      type: "p",
      text: "This is why extending a model's context window is not just a config change. The model has only seen positions up to its training length, so quality degrades beyond it unless the positional scheme is explicitly extended and the model fine-tuned on longer sequences.",
    },
    {
      type: "table",
      headers: ["Component", "Moves information…", "Cost in n"],
      rows: [
        ["Attention", "between positions", "O(n²)"],
        ["Feed-forward network", "within a position", "O(n)"],
        ["KV cache (inference)", "stores past keys/values", "O(n) memory"],
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"explain attention\" in 60 seconds",
      text: "Each token emits a query, a key and a value. Scores come from queries against keys, scaled by √d_k and masked so no token sees the future; softmax turns those into weights; the output is the weighted sum of values. Multiple heads do this in parallel with different projections, and the block repeats across layers. Cost is quadratic in sequence length — that's what bounds context.",
    },
  ],

  codeExample: {
    language: "python",
    caption:
      "Single-head causal attention in NumPy. Under 20 lines, and it is the real thing.",
    code: `import numpy as np


def softmax(x, axis=-1):
    x = x - x.max(axis=axis, keepdims=True)      # stability
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)


def causal_mask(n: int) -> np.ndarray:
    """0 where attention is allowed, -inf where it is forbidden."""
    allowed = np.tril(np.ones((n, n)))            # lower triangle, incl. diagonal
    return np.where(allowed == 1, 0.0, -np.inf)


def attention(Q, K, V):
    n, d_k = Q.shape

    scores = Q @ K.T / np.sqrt(d_k)               # (n, n)  <- quadratic
    scores = scores + causal_mask(n)              # hide the future
    weights = softmax(scores, axis=-1)            # rows sum to 1

    return weights @ V, weights


# Multi-head: project into h subspaces, attend in each, concatenate.
def multi_head(X, Wq, Wk, Wv, heads: int):
    n, d_model = X.shape
    d_head = d_model // heads

    outputs = []
    for h in range(heads):
        s = slice(h * d_head, (h + 1) * d_head)
        out, _ = attention(X @ Wq[:, s], X @ Wk[:, s], X @ Wv[:, s])
        outputs.append(out)

    return np.concatenate(outputs, axis=-1)       # (n, d_model)


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(5, 8))                   # 5 tokens, d_model 8
    out, w = attention(X, X, X)                   # self-attention
    print(w.round(2))                             # upper triangle is all zeros`,
  },

  interview: [
    {
      question: "Explain attention to me.",
      answer:
        "Each token projects into three vectors: a query for what it's looking for, a key for what it offers, and a value for what it contributes. Scores are every query against every key, divided by the square root of the head dimension, with a causal mask setting future positions to negative infinity. Softmax turns the scores into weights per row, and the output is the weighted sum of values — a context-aware representation of each token. Several heads do this in parallel with different projections, and the block is stacked across layers.",
      weakAnswer:
        "It lets the model focus on the important words. — The metaphor without the mechanism; it survives no follow-up question.",
    },
    {
      question: "Why divide by the square root of d_k?",
      answer:
        "Dot products of independent high-dimensional vectors have variance proportional to the dimension, so raw scores grow with d_k. Large scores push softmax into a saturated regime where one weight approaches 1 and the gradients of the rest approach 0, which stalls learning. Dividing by √d_k keeps the score variance roughly constant regardless of head size, so softmax stays in a useful range.",
    },
    {
      question: "Why is a causal mask needed, and what would happen without it?",
      answer:
        "A generative model is trained to predict token t+1 from tokens up to t. Without masking, position t could attend to t+1 and simply read the answer, so the model would learn nothing useful and would be unusable at inference time, when future tokens don't exist. The mask adds negative infinity to disallowed positions before softmax, which makes their weights exactly zero. Bidirectional encoders like BERT deliberately omit it, because they aren't generating left to right.",
      followUp: "So why can an encoder model see both directions?",
    },
    {
      question:
        "Why is context length such a hard constraint if attention is just matrix multiplication?",
      answer:
        "Because the score matrix is n × n, so attention compute is quadratic in sequence length — doubling context quadruples that term. At inference the KV cache adds linear memory growth that must stay resident on the GPU for the whole generation. And position is the third limit: the model only trained on positions up to its context length, so going beyond it degrades quality unless the positional scheme is extended and the model is fine-tuned on longer sequences. Work like FlashAttention, sliding-window and grouped-query attention attacks the first two.",
    },
    {
      question:
        "What does the feed-forward network in each block contribute, if attention already mixes information?",
      answer:
        "Attention moves information between positions but is essentially a weighted average — it is linear in the values. The feed-forward network applies a non-linear transformation at each position independently, which is where most of the parameters and most of the per-position computation live. The division of labour is: attention decides what to combine, the FFN decides what to do with it. Residual connections around both let the original signal and gradients pass through dozens of layers.",
    },
  ],

  challenges: [
    {
      id: "fnd-5-quiz",
      kind: "quiz",
      title: "Checkpoint: attention",
      blurb: "Five questions on the mechanism and its consequences.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "In attention, what is compared against what to produce scores?",
          options: [
            "Values against keys",
            "Queries against keys",
            "Queries against values",
            "Embeddings against positions",
          ],
          correctIndex: 1,
          explanation:
            "Scores are Q·Kᵀ. Values are only used afterwards, in the weighted sum that produces the output.",
        },
        {
          id: "q2",
          prompt: "What does the causal mask do, mechanically?",
          options: [
            "Deletes future tokens from the input",
            "Adds negative infinity to future positions before softmax, so their weights become 0",
            "Multiplies future weights by 0.5",
            "Reorders tokens so the future comes last",
          ],
          correctIndex: 1,
          explanation:
            "Masking happens additively on the scores, pre-softmax. exp(−∞) is 0, so forbidden positions receive exactly no weight.",
        },
        {
          id: "q3",
          prompt: "Why are scores divided by √d_k?",
          options: [
            "To normalise them into probabilities",
            "To keep score variance stable with dimension, so softmax doesn't saturate and kill gradients",
            "To make the matrix multiplication faster",
            "To compensate for the number of heads",
          ],
          correctIndex: 1,
          explanation:
            "Softmax turns scores into probabilities; the scaling exists to stop dot products growing with d_k and pushing softmax into a saturated, low-gradient regime.",
        },
        {
          id: "q4",
          prompt:
            "Attention compute scales how with sequence length n?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
          correctIndex: 3,
          explanation:
            "The score matrix is n × n. This quadratic term is the core reason long context is expensive and the target of most efficiency work.",
        },
        {
          id: "q5",
          prompt:
            "Why do transformers need positional encodings at all?",
          options: [
            "To tell the model how long the sequence is",
            "Because attention is permutation-invariant — without position, the input is an unordered bag of tokens",
            "To make the KV cache smaller",
            "To support multiple heads",
          ],
          correctIndex: 1,
          explanation:
            "Nothing in Q·Kᵀ depends on order. Position must be injected — sinusoidal, learned, or rotary (RoPE), which encodes relative distance directly in the dot product.",
        },
      ],
    },
    {
      id: "fnd-5-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: causal self-attention",
      blurb:
        "This model trains to near-zero loss and generates gibberish at inference. Find the line.",
      language: "python",
      lines: [
        "def attention(Q, K, V):",
        "    n, d_k = Q.shape",
        "",
        "    scores = Q @ K.T / np.sqrt(d_k)",
        "    weights = softmax(scores, axis=-1)",
        "    weights = weights * causal_mask_01(n)",
        "",
        "    return weights @ V",
      ],
      buggyLine: 6,
      reasons: [
        "`K.T` should be `K` — the transpose is wrong",
        "the mask is applied after softmax, so rows no longer sum to 1 and future tokens already leaked into the normalisation",
        "`np.sqrt(d_k)` should be `d_k`",
        "softmax should use `axis=0`, not `axis=-1`",
      ],
      correctReasonIndex: 1,
      explanation:
        "Masking must be additive and happen *before* softmax. Here, softmax normalises over the full row — including future positions — so the allowed weights are already wrong; zeroing afterwards leaves each row summing to less than 1. Training appears to succeed because the model has effectively seen the future; at inference those tokens don't exist, so behaviour collapses.",
      fix: "scores = Q @ K.T / np.sqrt(d_k)\n    scores = scores + causal_mask_neg_inf(n)   # additive, BEFORE softmax\n    weights = softmax(scores, axis=-1)",
      xp: 40,
    },
    {
      id: "fnd-5-code",
      kind: "code",
      title: "Code challenge: build the causal mask",
      blurb:
        "Return the n × n mask that lets each position attend to itself and everything before it.",
      functionName: "causalMask",
      starter: `/**
 * Return an n x n matrix where row i, column j is:
 *   1  if position i may attend to position j  (j <= i)
 *   0  otherwise
 *
 * This is the lower triangle, including the diagonal.
 *
 * causalMask(3) -> [[1, 0, 0],
 *                   [1, 1, 0],
 *                   [1, 1, 1]]
 *
 * causalMask(0) -> []
 */
function causalMask(n) {
  // your code here
}`,
      tests: [
        { name: "n = 1", args: [1], expected: [[1]] },
        { name: "n = 2", args: [2], expected: [[1, 0], [1, 1]] },
        {
          name: "n = 3 is the lower triangle",
          args: [3],
          expected: [[1, 0, 0], [1, 1, 0], [1, 1, 1]],
        },
        {
          name: "n = 4",
          args: [4],
          expected: [
            [1, 0, 0, 0],
            [1, 1, 0, 0],
            [1, 1, 1, 0],
            [1, 1, 1, 1],
          ],
        },
        { name: "n = 0 returns an empty matrix", args: [0], expected: [] },
        {
          name: "the diagonal is always allowed (self-attention)",
          args: [5],
          expected: [
            [1, 0, 0, 0, 0],
            [1, 1, 0, 0, 0],
            [1, 1, 1, 0, 0],
            [1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
          ],
        },
      ],
      hints: [
        "Two nested loops over i and j, both from 0 to n − 1.",
        "The condition is `j <= i` — note the `<=`, so a token can attend to itself.",
        "Build each row as an array and push it, or use Array.from with a nested map.",
      ],
      solution: `function causalMask(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (j <= i ? 1 : 0))
  );
}`,
      xp: 70,
    },
  ],
};
