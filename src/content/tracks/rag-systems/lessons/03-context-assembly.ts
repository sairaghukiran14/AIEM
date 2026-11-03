import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "retrieval-and-context-assembly",
  order: 3,
  title: "Retrieval Tuning & Context Assembly",
  summary:
    "What you retrieve is not what the model reads. Choose how many, remove redundancy, order carefully and fit it all in the budget.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "After retrieval and reranking you hold a ranked list of chunks. **Context assembly** decides which of them go into the prompt, in what order, and in what form. A strong retriever feeding a careless assembler still produces weak answers, because the model's attention is a limited resource (Track 1).",
    },
    { type: "h", text: "The decisions" },
    {
      type: "ol",
      items: [
        "**How many chunks (k)?** Enough to cover the answer, few enough to avoid noise. Typical values are 3 to 10 after reranking.",
        "**Which chunks?** Drop low-scoring ones with a threshold, remove duplicates, and keep variety so the context is not five copies of the same paragraph.",
        "**What order?** The start and end of a long prompt are used more reliably than the middle, so do not bury the best chunk in the centre.",
        "**How to fit?** Respect a token budget for the whole prompt (Track 1): system, question, chunks and room for the answer.",
        "**How to label?** Number the sources and delimit them so the model can cite and cannot confuse them with instructions (Track 2).",
      ],
    },
    {
      type: "calculator",
      title: "How many chunks fit?",
      inputs: [
        { key: "window", label: "Context window", min: 4000, max: 200000, step: 1000, value: 32000, unit: "tokens" },
        { key: "system", label: "System prompt + question", min: 200, max: 6000, step: 100, value: 1200, unit: "tokens" },
        { key: "output", label: "Reserved for the answer", min: 200, max: 8000, step: 100, value: 1000, unit: "tokens" },
        { key: "chunk", label: "Tokens per chunk (with label)", min: 100, max: 1500, step: 50, value: 450, unit: "tokens" },
      ],
      outputs: [
        { label: "Budget for retrieved text", formula: "Math.max(0, window - system - output)", format: "int" },
        { label: "Chunks that fit", formula: "Math.floor(Math.max(0, window - system - output) / chunk)", format: "int" },
      ],
      note: "That is a ceiling, not a target. More context is not better: irrelevant chunks lower accuracy and raise cost and latency.",
    },
    {
      type: "stepper",
      title: "Diversity with MMR (maximal marginal relevance)",
      steps: [
        { label: "The problem", detail: "The top three results are near-identical paragraphs from three copies of the same document. Together they add almost nothing a single one would not.", items: ["A: refund policy (0.91)", "A': refund policy copy (0.90)", "A'': refund policy v2 (0.89)", "B: store credit rules (0.62)"], mark: [0, 1, 2] },
        { label: "Pick the most relevant first", detail: "MMR starts with the single best match.", items: ["selected: A"], mark: [0] },
        { label: "Penalise similarity to what you have", detail: "For each remaining candidate, score = lambda x relevance - (1 - lambda) x (highest similarity to anything already selected). The copies are almost identical to A, so they score badly.", items: ["A': 0.5*0.90 - 0.5*0.98 = -0.04", "B: 0.5*0.62 - 0.5*0.20 = 0.21"], mark: [1] },
        { label: "A different, useful chunk wins", detail: "B is less relevant than the copies but adds new information, so MMR picks it second. Lambda near 1 favours pure relevance; near 0 favours diversity.", items: ["selected: A, B"], mark: [0] },
      ],
      caption: "MMR balances 'relevant to the question' against 'new compared with what is already chosen'.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Order and the lost-in-the-middle effect" },
    {
      type: "p",
      text: "Track 1 showed that models use information at the **beginning and end** of a long context more reliably than the middle. For RAG that suggests placing the strongest chunks at the edges of the source block, or simply keeping the number of chunks small enough that position matters less. Put the **question and instructions last**, where attention is strongest, and keep the stable system prompt first so prompt caching can reuse it.",
    },
    { type: "h", text: "Techniques beyond plain top-k" },
    {
      type: "table",
      headers: ["Technique", "What it does", "Trade-off"],
      rows: [
        ["**Score threshold**", "drop chunks below a relevance score", "needs tuning; enables an honest 'not found'"],
        ["**MMR**", "diversify the selected set", "extra computation; lambda to tune"],
        ["**Deduplication**", "remove near-identical chunks", "cheap and almost always worth it"],
        ["**Parent expansion**", "swap a matched small chunk for its larger parent (Track 3)", "more tokens, more context"],
        ["**Contextual compression**", "extract only the relevant sentences from each chunk", "extra model call; can drop needed detail"],
        ["**Neighbour stitching**", "merge adjacent chunks from the same document", "restores flow lost at chunk boundaries"],
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "More context can make answers worse",
      text: "Irrelevant or contradictory chunks give the model something to be distracted by. If quality falls when you raise k, retrieval precision is the real problem, not the model.",
    },
    { type: "h", text: "Packing to a token budget" },
    {
      type: "p",
      text: "Count tokens with the **generation model's tokenizer** (Track 1), reserve the output budget first, then add chunks in priority order until the next one would overflow. Skip an oversized chunk but keep checking later ones, or truncate at a sentence boundary, rather than cutting mid-sentence.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That context is a budgeted, ordered, de-duplicated selection, not \"the top k\". They mention thresholds and honest refusal, MMR or deduplication for diversity, edge placement because of lost-in-the-middle, and measuring answer quality as k changes.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Greedy MMR selection, then pack the chosen chunks into a token budget.",
    code: `import numpy as np

def mmr(rel: np.ndarray, sim: np.ndarray, k: int, lam: float = 0.5) -> list[int]:
    """rel[i]: relevance of candidate i to the query. sim[i][j]: similarity between candidates."""
    selected: list[int] = []
    remaining = list(range(len(rel)))
    while remaining and len(selected) < k:
        if not selected:
            best = max(remaining, key=lambda i: (rel[i], -i))
        else:
            def score(i: int) -> float:
                redundancy = max(sim[i][j] for j in selected)
                return lam * rel[i] - (1 - lam) * redundancy
            best = max(remaining, key=lambda i: (score(i), -i))   # ties: lower index
        selected.append(best)
        remaining.remove(best)
    return selected


def pack(chunks: list[str], budget: int) -> list[str]:
    kept, used = [], 0
    for text in chunks:
        cost = count_tokens(text)                  # the generation model's tokenizer
        if used + cost <= budget:
            kept.append(text)
            used += cost
    return kept`,
  },

  interview: [
    {
      question: "How do you decide how many chunks to put in the prompt?",
      answer:
        "Enough to cover the answer but few enough to avoid noise: usually 3 to 10 after reranking. I set it by evaluation, measuring answer quality as k varies, because extra irrelevant chunks lower accuracy and raise cost. I also cap it by the token budget and use a score threshold so weak chunks are dropped.",
      weakAnswer:
        "As many as fit in the context window. — More context is not better and costs more.",
    },
    {
      question: "What is MMR and why use it?",
      answer:
        "Maximal marginal relevance selects results greedily by balancing relevance to the query against similarity to results already chosen, using a lambda weight. It stops the context from filling with near-duplicates and brings in complementary information. Lambda near 1 is pure relevance, near 0 is pure diversity.",
      followUp: "When would you skip it?",
    },
    {
      question: "How does the lost-in-the-middle effect influence context assembly?",
      answer:
        "Models use content at the start and end of a long context more reliably than the middle, so I avoid burying the best chunk in the centre, keep k modest, and place the question and instructions last. The stable system prompt stays first for caching. I verify the effect on my own data by reordering and measuring.",
    },
    {
      question: "What do you do when the best chunk is larger than your remaining token budget?",
      answer:
        "Skip it and keep checking smaller ones, truncate it at a sentence boundary, or use a compressed extract of its relevant sentences. I avoid cutting mid-sentence, I count tokens with the generation model's tokenizer, and I reserve output tokens first so the answer is never starved.",
    },
    {
      question: "Quality dropped after you increased k from 5 to 15. Why, and what do you do?",
      answer:
        "More chunks added irrelevant or contradictory text that distracts the model and dilutes the useful chunks, often pointing to weak retrieval precision. I would check the rank of the correct chunk, add reranking and a score threshold, remove duplicates, and compare quality across k values on the eval set, choosing the smallest k that meets the target.",
    },
  ],

  challenges: [
    {
      id: "rag-3-quiz",
      kind: "quiz",
      title: "Checkpoint: retrieval tuning and context assembly",
      blurb: "Five questions on selecting and arranging context.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Accuracy falls when you raise k from 5 to 20. The most likely cause is:",
          options: [
            "The model has forgotten how to read",
            "Irrelevant or duplicate chunks distract the model and dilute the useful ones",
            "Embeddings change with k",
            "The reranker stops working",
          ],
          correctIndex: 1,
          explanation:
            "More context is not better. Noise lowers accuracy and raises cost.",
        },
        {
          id: "q2",
          prompt: "What does MMR trade off?",
          options: [
            "Speed against memory",
            "Relevance to the query against similarity to already selected results",
            "Precision against price",
            "Recall against latency",
          ],
          correctIndex: 1,
          explanation:
            "Each pick maximises relevance minus redundancy with what is already chosen.",
        },
        {
          id: "q3",
          prompt: "Where should the question and instructions go in a long RAG prompt?",
          options: [
            "In the middle, between the chunks",
            "Last, where the model's attention is strongest",
            "Only in the system prompt",
            "They are optional",
          ],
          correctIndex: 1,
          explanation:
            "The end of the prompt is used reliably. Keep the stable prefix first for caching.",
        },
        {
          id: "q4",
          prompt: "Why reserve the output token budget before adding chunks?",
          options: [
            "To reduce embedding cost",
            "Because the window covers input and output together, and context could otherwise starve the answer",
            "To enable streaming",
            "Because outputs are free",
          ],
          correctIndex: 1,
          explanation:
            "Track 1: the window is shared. Pack retrieved text into what remains after the answer's share.",
        },
        {
          id: "q5",
          prompt: "A score threshold on retrieved chunks is useful because it:",
          options: [
            "Makes retrieval faster",
            "Lets the system drop weak matches and honestly answer that nothing relevant was found",
            "Removes the need for reranking",
            "Guarantees correct citations",
          ],
          correctIndex: 1,
          explanation:
            "Without a floor, the top-k always returns something, which invites the model to answer from irrelevant text.",
        },
      ],
    },
    {
      id: "rag-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: assembling context",
      blurb: "Long retrieval results sometimes make the API call fail with a context error. Find the line.",
      language: "python",
      lines: [
        "def assemble(chunks, budget):",
        "    context = '\\n\\n'.join(c.text for c in chunks)",
        "    return context",
      ],
      buggyLine: 2,
      reasons: [
        "the separator should be a single space",
        "all chunks are joined with no token budget check, so the prompt can overflow the window and duplicates are kept",
        "join cannot be used on objects",
        "the function should return a list",
      ],
      correctReasonIndex: 1,
      explanation:
        "The `budget` parameter is never used. Without counting tokens and stopping when the budget is reached, a large retrieval overflows the context window. Pack in priority order, skip what does not fit, and drop duplicates.",
      fix: "kept, used = [], 0\n    for c in chunks:\n        if used + count_tokens(c.text) <= budget: kept.append(c.text); used += count_tokens(c.text)",
      xp: 40,
    },
    {
      id: "rag-3-code",
      kind: "code",
      title: "Code challenge: MMR selection",
      blurb: "Select k diverse, relevant chunks using maximal marginal relevance.",
      functionName: "mmrSelect",
      starter: `/**
 * Maximal Marginal Relevance. Return the INDICES of the chosen items, in pick order.
 *
 *   rel[i]    relevance of item i to the query
 *   sim[i][j] similarity between items i and j
 *   k         how many to pick
 *   lambda    1 = only relevance, 0 = only diversity
 *
 * First pick: the item with the highest rel (ties: lower index).
 * Each later pick maximises:  lambda * rel[i] - (1 - lambda) * max(sim[i][j] for j already picked)
 * (ties: lower index). Stop at k or when items run out.
 */
function mmrSelect(rel, sim, k, lambda) {
  // your code here
}`,
      tests: [
        {
          name: "diversity skips a near-duplicate",
          args: [[0.9, 0.85, 0.5], [[1, 0.95, 0.1], [0.95, 1, 0.2], [0.1, 0.2, 1]], 2, 0.5],
          expected: [0, 2],
        },
        {
          name: "lambda 1 is pure relevance",
          args: [[0.9, 0.85, 0.5], [[1, 0.95, 0.1], [0.95, 1, 0.2], [0.1, 0.2, 1]], 2, 1],
          expected: [0, 1],
        },
        {
          name: "lambda 0 is pure diversity after the first pick",
          args: [[0.9, 0.85, 0.5], [[1, 0.95, 0.1], [0.95, 1, 0.2], [0.1, 0.2, 1]], 2, 0],
          expected: [0, 2],
        },
        {
          name: "picking all items",
          args: [[0.9, 0.85, 0.5], [[1, 0.95, 0.1], [0.95, 1, 0.2], [0.1, 0.2, 1]], 3, 0.5],
          expected: [0, 2, 1],
        },
        { name: "k larger than the number of items", args: [[0.5, 0.4], [[1, 0], [0, 1]], 9, 0.7], expected: [0, 1] },
        { name: "k of 0 picks nothing", args: [[0.5], [[1]], 0, 0.5], expected: [] },
        { name: "tie on relevance picks the lower index first", args: [[0.7, 0.7], [[1, 0], [0, 1]], 1, 0.5], expected: [0] },
      ],
      hints: [
        "Keep a list of selected indices and a list of remaining indices.",
        "For the first pick use rel only. For later picks compute lambda * rel[i] - (1 - lambda) * the largest sim[i][j] over selected j.",
        "Scan candidates in index order and replace the best only when a score is strictly greater, so ties keep the lower index.",
      ],
      solution: `function mmrSelect(rel, sim, k, lambda) {
  const selected = [];
  const remaining = rel.map((_, i) => i);

  while (remaining.length > 0 && selected.length < k) {
    let bestPos = 0;
    let bestScore = -Infinity;

    remaining.forEach((i, pos) => {
      const redundancy = selected.length
        ? Math.max(...selected.map((j) => sim[i][j]))
        : 0;
      const score = selected.length
        ? lambda * rel[i] - (1 - lambda) * redundancy
        : rel[i];
      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    });

    selected.push(remaining[bestPos]);
    remaining.splice(bestPos, 1);
  }

  return selected;
}`,
      xp: 70,
    },
  ],
};
