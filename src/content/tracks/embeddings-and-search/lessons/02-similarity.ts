import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "similarity-metrics",
  order: 2,
  title: "Similarity Metrics",
  summary:
    "Cosine, dot product and Euclidean distance answer different questions. Know when they agree, when they differ and why thresholds are tricky.",
  minutes: 13,

  concept: [
    {
      type: "p",
      text: "To rank documents you need a number that says how close two vectors are. Three measures dominate: **cosine similarity** (the angle), **dot product** (angle and length together) and **Euclidean distance** (straight-line gap). Which one you use should follow how your embedding model was trained.",
    },
    {
      type: "table",
      headers: ["Measure", "Looks at", "Higher means", "Range"],
      rows: [
        ["**Cosine similarity**", "direction only", "more similar", "−1 to 1"],
        ["**Dot product**", "direction and length", "more similar", "unbounded"],
        ["**Euclidean (L2) distance**", "absolute gap", "**less** similar", "0 to infinity"],
      ],
    },
    {
      type: "calculator",
      title: "Two vectors, three answers",
      inputs: [
        { key: "angle", label: "Angle between the vectors", min: 0, max: 180, step: 5, value: 30, unit: "deg" },
        { key: "a", label: "Length of vector A", min: 0.2, max: 5, step: 0.1, value: 1 },
        { key: "b", label: "Length of vector B", min: 0.2, max: 5, step: 0.1, value: 1 },
      ],
      outputs: [
        { label: "Cosine similarity", formula: "Math.cos(angle * Math.PI / 180)", format: "fixed2" },
        { label: "Dot product", formula: "a * b * Math.cos(angle * Math.PI / 180)", format: "fixed2" },
        { label: "Euclidean distance", formula: "Math.sqrt(a*a + b*b - 2*a*b*Math.cos(angle * Math.PI / 180))", format: "fixed2" },
      ],
      note: "Set both lengths to 1: the three agree on the ranking. Now make B longer without changing the angle: cosine does not move, dot product and distance do.",
      caption: "Cosine ignores length. The other two do not.",
    },
    {
      type: "callout",
      tone: "key",
      title: "If the vectors are unit length, all three agree",
      text: "For vectors normalised to length 1: dot product equals cosine similarity, and squared Euclidean distance equals 2 − 2 × cosine. They rank documents identically. That is why most pipelines normalise once and use the cheapest operation, the dot product.",
    },
    {
      type: "sorter",
      title: "Which measure has this property?",
      prompt: "Assign each statement to the measure it describes.",
      categories: ["Cosine", "Euclidean distance"],
      items: [
        { text: "Doubling a vector's length does not change the score", answer: 0, why: "Cosine divides out the lengths, so only direction matters." },
        { text: "A smaller number means the items are more alike", answer: 1, why: "Distance shrinks as points get closer. Similarity scores grow." },
        { text: "Bounded between −1 and 1", answer: 0, why: "It is the cosine of an angle." },
        { text: "Changes if one vector is scaled while the other is not", answer: 1, why: "Moving a point along its ray changes how far it is from the other point." },
      ],
    },
  ],

  underTheHood: [
    {
      type: "code",
      language: "text",
      code: `cosine(a, b)  = (a . b) / (|a| |b|)
dot(a, b)     =  a . b  = |a| |b| cos(theta)
L2(a, b)      =  sqrt( sum (a_i - b_i)^2 )

unit vectors (|a| = |b| = 1):
   dot = cosine
   L2^2 = |a|^2 + |b|^2 - 2 a.b = 2 - 2 cosine`,
      caption: "The identities worth memorising.",
    },
    { type: "h", text: "Which one should you use?" },
    {
      type: "ul",
      items: [
        "**Use what the model card says.** Models are trained with a specific measure. Using another can still work, but you are off the tested path.",
        "**If vectors are normalised, use dot product.** It is the fastest, and the ranking equals cosine and L2.",
        "**Dot product with unnormalised vectors** can be intentional: some recommenders let vector length encode popularity. For text search it is usually a bug.",
        "**Vector databases** let you choose the metric when you create the index. It cannot be changed afterwards without rebuilding.",
      ],
    },
    { type: "h", text: "Why similarity thresholds are slippery" },
    {
      type: "p",
      text: "It is tempting to say \"keep results with cosine above 0.8\". But the scale of scores is not universal. Different models produce different typical ranges, and in high dimensions most pairs of vectors end up at similar distances (the **concentration of distances**), so scores bunch together. A threshold must be **tuned per model on your own data**, and relative rank is usually more reliable than an absolute score.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Similarity and distance point in opposite directions",
      text: "Similarity: bigger is closer. Distance: smaller is closer. Mixing them up when writing a filter keeps the worst results and drops the best. Many libraries also return \"cosine distance\" = 1 − cosine similarity, so read the docs.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "A question that separates candidates",
      text: "\"When are cosine and dot product the same?\" Answer: when vectors have unit length. Follow-up: what if they are not normalised? Then dot product is also influenced by magnitude, so long vectors score high regardless of direction.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Cosine by hand, and the unit-vector identity checked numerically.",
    code: `import numpy as np

def cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(a @ b / denom) if denom else 0.0


a = np.array([3.0, 4.0])
b = np.array([4.0, 3.0])

print(cosine(a, b))                       # 0.96
print(cosine(a, 10 * b))                  # 0.96   scaling does not change the angle
print(float(a @ b), float(a @ (10 * b)))  # 24.0 vs 240.0   dot product does change

ua, ub = a / np.linalg.norm(a), b / np.linalg.norm(b)
print(float(ua @ ub))                                     # 0.96 : dot == cosine for unit vectors
print(float(np.sum((ua - ub) ** 2)), 2 - 2 * float(ua @ ub))   # 0.08  0.08 : L2^2 == 2 - 2cos`,
  },

  interview: [
    {
      question: "Compare cosine similarity, dot product and Euclidean distance.",
      answer:
        "Cosine measures the angle and ignores length. Dot product is length times length times cosine, so it mixes direction and magnitude. Euclidean distance is the straight-line gap, where smaller means closer. For unit-length vectors all three rank documents identically, with dot equal to cosine and squared distance equal to 2 minus 2 cosine, which is why pipelines normalise and use the dot product.",
      weakAnswer:
        "They are all ways of measuring how similar two vectors are. — Correct and useless; it gives no differences.",
    },
    {
      question: "When would dot product and cosine give different rankings?",
      answer:
        "When the vectors are not normalised. Dot product is influenced by magnitude, so a long vector can outrank a better-aligned short one. For text embeddings that is usually unwanted, so I normalise. In some recommender setups magnitude carries useful signal like popularity, and then dot product is deliberate.",
    },
    {
      question: "Which metric do you choose for a new vector index?",
      answer:
        "The one the embedding model was trained for, which the model card states, usually cosine or dot product on normalised vectors. I normalise once at ingest, use the dot product for speed, and set the same metric on the index at creation since changing it means a rebuild.",
    },
    {
      question: "Is a cosine threshold of 0.8 a good way to decide relevance?",
      answer:
        "Not as a fixed universal number. Score distributions vary by model, text length and domain, and in high dimensions many pairs score similarly. I tune a threshold per model against labelled data, or prefer rank-based cut-offs with a reranker and a 'no good result' check, rather than copying a number from a blog post.",
    },
    {
      question: "What is the relationship between Euclidean distance and cosine for normalised vectors?",
      answer:
        "Squared Euclidean distance equals 2 minus 2 times the cosine similarity, so the two give the same ranking and one can be computed from the other. That is why an index built for L2 can serve cosine search on normalised vectors.",
    },
  ],

  challenges: [
    {
      id: "es-2-quiz",
      kind: "quiz",
      title: "Checkpoint: similarity metrics",
      blurb: "Five questions on measures and thresholds.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which statement is true for vectors normalised to length 1?",
          options: [
            "Cosine and dot product differ by a constant factor of 2",
            "Dot product equals cosine similarity",
            "Euclidean distance is always 1",
            "Cosine is always 0",
          ],
          correctIndex: 1,
          explanation:
            "With unit vectors the lengths in the cosine denominator are both 1, so cosine equals the dot product.",
        },
        {
          id: "q2",
          prompt: "You double the length of one vector and leave its direction alone. Which score does NOT change?",
          options: ["Dot product", "Euclidean distance", "Cosine similarity", "All of them change"],
          correctIndex: 2,
          explanation:
            "Cosine depends only on direction. Dot product and distance both change with length.",
        },
        {
          id: "q3",
          prompt: "A library returns 'cosine distance'. How is it related to cosine similarity?",
          options: [
            "distance = similarity",
            "distance = 1 - similarity, so smaller means more similar",
            "distance = 2 x similarity",
            "distance = similarity squared",
          ],
          correctIndex: 1,
          explanation:
            "Cosine distance is typically 1 minus cosine similarity. Watch the direction when filtering.",
        },
        {
          id: "q4",
          prompt: "Why is a fixed cosine threshold like 0.8 unreliable across projects?",
          options: [
            "Cosine can exceed 1",
            "Score ranges depend on the model, text and domain, so thresholds must be tuned on your data",
            "Cosine is only defined for short texts",
            "Thresholds are not supported by vector databases",
          ],
          correctIndex: 1,
          explanation:
            "There is no universal scale. Tune per model against labelled queries, or rely on rank.",
        },
        {
          id: "q5",
          prompt: "You built an index with the L2 metric but your vectors are unit length. Cosine ranking from it is:",
          options: [
            "Impossible without rebuilding",
            "Identical, since squared L2 equals 2 - 2 cosine for unit vectors",
            "Reversed",
            "Random",
          ],
          correctIndex: 1,
          explanation:
            "Smaller L2 means larger cosine on unit vectors, so the ordering matches.",
        },
      ],
    },
    {
      id: "es-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a relevance filter",
      blurb: "The filter keeps the least relevant documents and drops the best. Find the line.",
      language: "python",
      lines: [
        "SIM_THRESHOLD = 0.8",
        "def relevant(query_vec, doc_vec):",
        "    dist = 1 - cosine_similarity(query_vec, doc_vec)   # cosine DISTANCE",
        "    return dist >= SIM_THRESHOLD                         # keep close documents",
      ],
      buggyLine: 4,
      reasons: [
        "`1 - cosine_similarity` is not a valid distance",
        "it compares a distance with `>=`, so it keeps the farthest documents; a distance should be compared with `<=` against `1 - threshold`",
        "the threshold must be negative",
        "`return` should be replaced with `print`",
      ],
      correctReasonIndex: 1,
      explanation:
        "Distance is the opposite of similarity: small is close. Keeping dist >= 0.8 keeps documents with similarity at most 0.2. The test must be dist <= 1 - SIM_THRESHOLD, or compare the similarity directly.",
      fix: "return dist <= 1 - SIM_THRESHOLD",
      xp: 40,
    },
    {
      id: "es-2-code",
      kind: "code",
      title: "Code challenge: cosine similarity",
      blurb: "Implement cosine similarity safely, rounded to four decimals.",
      functionName: "cosine",
      starter: `/**
 * Cosine similarity of two equal-length vectors, rounded to 4 decimals.
 *
 *   cosine([1, 0], [0, 1])   -> 0
 *   cosine([3, 4], [4, 3])   -> 0.96
 *
 * If either vector has length 0 (all zeros), return 0 instead of NaN.
 */
function cosine(a, b) {
  // your code here
}`,
      tests: [
        { name: "identical direction", args: [[1, 0], [1, 0]], expected: 1 },
        { name: "orthogonal", args: [[1, 0], [0, 1]], expected: 0 },
        { name: "opposite", args: [[1, 0], [-1, 0]], expected: -1 },
        { name: "scaling does not matter", args: [[1, 2, 3], [2, 4, 6]], expected: 1 },
        { name: "a 3-4 pair", args: [[3, 4], [4, 3]], expected: 0.96 },
        { name: "a zero vector returns 0", args: [[0, 0], [1, 1]], expected: 0 },
        { name: "rounds to 4 decimals", args: [[1, 2], [2, 1]], expected: 0.8 },
      ],
      hints: [
        "Compute the dot product, then divide by the product of the two lengths.",
        "Math.hypot(...v) gives a vector's length.",
        "Check for a zero length before dividing, then round with Math.round(x * 10000) / 10000.",
      ],
      solution: `function cosine(a, b) {
  const dot = a.reduce((sum, x, i) => sum + x * b[i], 0);
  const denom = Math.hypot(...a) * Math.hypot(...b);
  if (denom === 0) return 0;
  return Math.round((dot / denom) * 10000) / 10000;
}`,
      xp: 70,
    },
  ],
};
