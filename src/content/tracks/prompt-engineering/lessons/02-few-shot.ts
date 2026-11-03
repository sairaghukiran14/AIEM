import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "few-shot-and-examples",
  order: 2,
  title: "Zero-shot, Few-shot & Examples",
  summary:
    "Examples teach format and judgment faster than instructions can. Learn when to use them, how to choose them, and the biases they introduce.",
  minutes: 13,

  concept: [
    {
      type: "p",
      text: "**Zero-shot** means instructions only. **Few-shot** adds a handful of worked input/output pairs, called shots or examples, before the real input. The model infers the pattern from them in context, with **no training and no weight updates**. This is called **in-context learning**.",
    },
    {
      type: "visual",
      key: "few-shot-builder",
      caption:
        "Add and remove examples and watch the prompt, the label balance and the warnings change. Order matters, so try putting different labels last.",
    },
    { type: "h", text: "When to reach for examples" },
    {
      type: "table",
      headers: ["Situation", "Use", "Why"],
      rows: [
        ["Simple, well-known task", "zero-shot", "instructions are enough; examples only cost tokens"],
        ["A specific output format", "few-shot", "showing the format beats describing it"],
        ["Subjective or house-style judgment", "few-shot", "you cannot fully write a taste down"],
        ["Tricky edge cases", "few-shot, targeted", "one example of the edge case teaches the rule"],
        ["Hundreds of varied cases", "retrieve examples per request", "pick the most similar shots dynamically (Track 3)"],
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Examples are the strongest signal in the prompt",
      text: "If your instructions say one thing and your examples show another, the model usually follows the examples. Every example is also a claim about what the right answer looks like, so audit them as carefully as the rules.",
    },
    { type: "h", text: "How to choose good examples" },
    {
      type: "ul",
      items: [
        "**Cover every label or case**, not just the common one. A category with no example is a category the model under-uses.",
        "**Keep the format identical** across all shots, down to whitespace and field order. The model copies it.",
        "**Include a hard edge case or two**, including a correct \"none of the above\" answer.",
        "**Stay representative** of real inputs. Toy examples teach toy behaviour.",
        "**Start with three to five.** More is not always better: past a point they cost tokens and can crowd out the actual input.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Two biases to design around",
      text: "**Majority-label bias**: if most examples share a label, predictions drift toward it. **Recency bias**: the label of the last example pulls hardest. Balance the labels and avoid ending on the most common one.",
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "In-context learning is not gradient descent. The model's weights never change; the examples simply become part of the sequence it conditions on, and attention lets later tokens look back at them. Whether that behaves like \"learning\" is an active research question, but the engineering consequence is clear and testable: **the prompt is a conditioning signal, and examples are a very strong one**.",
    },
    { type: "h", text: "What the examples are actually doing" },
    {
      type: "ol",
      items: [
        "They fix the **format**: delimiters, field names, casing, length.",
        "They set the **label space**: which outputs are allowed and how often each appears.",
        "They hint at the **decision boundary**: how borderline cases are resolved.",
        "They implicitly **prime** surface features, so an unrepresentative example can drag outputs toward its wording.",
      ],
    },
    { type: "h", text: "Cost and selection at scale" },
    {
      type: "p",
      text: "Every example is billed on every call. Ten examples of 80 tokens add 800 input tokens to every request, which is where **prompt caching** pays off: keep the examples in a stable prefix so they are cached. When you have a large pool of labelled data, **dynamic few-shot** retrieves the k examples most similar to the incoming input using embeddings (Track 3), which usually beats a fixed set on varied traffic.",
    },
    {
      type: "table",
      headers: ["Approach", "Strength", "Weakness"],
      rows: [
        ["Fixed examples", "simple, cacheable, predictable", "may not cover the input's neighbourhood"],
        ["Dynamic (similarity)", "examples match each input", "adds a retrieval step; prefix not cacheable"],
        ["Fine-tuning", "no per-call example cost", "needs data and a training loop (Track 7)"],
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "A question that separates candidates",
      text: "\"Few-shot accuracy dropped after we added three more examples.\" Strong answer: check label balance and order, check whether new examples contradict the instructions or each other, and re-run the eval. Weak answer: \"more examples should always help\".",
    },
    {
      type: "p",
      text: "Finally, never trust a hand-picked example set because it looks good. The only evidence that a set helps is a **held-out evaluation**: examples you did not use as shots, scored the same way every time.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Interleaving labels so no label dominates the start or the end.",
    code: `from collections import defaultdict
from itertools import zip_longest

def interleave_by_label(examples: list[tuple[str, str]], k: int) -> list[tuple[str, str]]:
    """Round-robin across labels so the shots are balanced and the last one is not
    always the same label."""
    by_label: dict[str, list] = defaultdict(list)
    for text, label in examples:
        by_label[label].append((text, label))

    picked = []
    for round_ in zip_longest(*by_label.values()):
        picked.extend(x for x in round_ if x is not None)
    return picked[:k]


def build_few_shot(examples, ticket: str) -> str:
    shots = "\\n\\n".join(f"Ticket: {t}\\nCategory: {c}" for t, c in examples)
    return f"{shots}\\n\\nTicket: {ticket}\\nCategory:"


pool = [
    ("I was billed twice.", "billing"),
    ("Refund my annual plan.", "billing"),
    ("The export button crashes.", "bug"),
    ("Please add dark mode.", "feature_request"),
]
print(build_few_shot(interleave_by_label(pool, k=3), "My card was charged again."))`,
  },

  interview: [
    {
      question: "What is few-shot prompting and why does it work?",
      answer:
        "You include a few worked input/output examples in the prompt so the model infers the task, format and decision boundary from them, with no weight updates. It works because the examples become part of the conditioning context and attention can reference them. It is especially good for fixing an output format and for judgment calls that are hard to describe in words.",
      weakAnswer:
        "It trains the model on your examples. — No training happens; the weights do not change.",
    },
    {
      question: "How do you choose examples for a classification prompt?",
      answer:
        "Cover every label, keep the format identical, include a couple of hard edge cases and a correct 'none' answer, and make them representative of real traffic. I balance labels and avoid ending on the most common one because of recency bias. Then I validate on a held-out set that does not contain the shots, because a set that looks good can still hurt.",
      followUp: "What if the label distribution in production is very skewed?",
    },
    {
      question: "What biases does few-shot prompting introduce?",
      answer:
        "Majority-label bias, where predictions drift toward the most frequent label in the examples, and recency bias, where the final example's label has outsized pull. There is also surface-feature priming, where unusual wording in an example leaks into outputs. I counter them by balancing and shuffling labels, varying phrasing, and checking error patterns on a held-out set.",
    },
    {
      question: "Accuracy fell after adding examples. What do you investigate?",
      answer:
        "First label balance and order, since a new batch may skew the distribution or end on one label. Then contradictions: whether a new example conflicts with the written rules or with an old example. Then format drift between shots. Finally whether the examples are crowding the context so the real input gets less attention. I would re-run the full eval and diff per case rather than trusting the aggregate.",
    },
    {
      question: "When would you use dynamic few-shot instead of a fixed set?",
      answer:
        "When inputs are varied and I have a large labelled pool, because retrieving the most similar examples per request puts the relevant decision boundaries in front of the model. The costs are an embedding lookup and a prefix that cannot be cached. For narrow, stable tasks a fixed, cached set is simpler and often as good.",
    },
  ],

  challenges: [
    {
      id: "pe-2-quiz",
      kind: "quiz",
      title: "Checkpoint: few-shot prompting",
      blurb: "Five questions on examples, bias and cost.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What happens to the model's weights during few-shot prompting?",
          options: [
            "They are updated by a few gradient steps",
            "Nothing: the examples are only part of the input context",
            "They are replaced by the examples",
            "Only the last layer is fine-tuned",
          ],
          correctIndex: 1,
          explanation:
            "In-context learning conditions the model on examples with no weight change. Training on them would be fine-tuning (Track 7).",
        },
        {
          id: "q2",
          prompt: "Your examples are 8 'billing' and 2 'bug'. What do you expect?",
          options: [
            "Perfectly balanced predictions",
            "Predictions drift toward 'billing' because of majority-label bias",
            "The model refuses to output 'bug'",
            "Nothing, since the label counts are ignored",
          ],
          correctIndex: 1,
          explanation:
            "Skewed shots skew predictions. Balance the labels, or deliberately match the production prior only if that is what you want.",
        },
        {
          id: "q3",
          prompt: "Which ordering most reduces recency bias?",
          options: [
            "Sort the examples alphabetically by label",
            "Put every example of the most common label last",
            "Interleave the labels so the last example is not always the same",
            "Put the hardest example first and repeat it",
          ],
          correctIndex: 2,
          explanation:
            "Sorting groups equal labels together and puts one label last, which maximises recency pull. Interleaving spreads it out.",
        },
        {
          id: "q4",
          prompt: "Ten 80-token examples are sent with every request. What is the most useful optimisation?",
          options: [
            "Randomise their order each call",
            "Keep them in a stable prompt prefix so prompt caching can reuse them",
            "Move them to the end of the prompt",
            "Translate them into another language",
          ],
          correctIndex: 1,
          explanation:
            "A stable, identical prefix is exactly what caching rewards. Randomising or moving them defeats it.",
        },
        {
          id: "q5",
          prompt: "How should you decide whether an example set actually helps?",
          options: [
            "It reads well to the team",
            "It improves a held-out eval that does not contain those shots",
            "It contains many examples",
            "It matches the provider's documentation examples",
          ],
          correctIndex: 1,
          explanation:
            "Only a held-out evaluation is evidence. Scoring on the shots themselves just measures memorisation.",
        },
      ],
    },
    {
      id: "pe-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a few-shot prompt builder",
      blurb: "Predictions are strangely biased toward 'other'. Find the line.",
      language: "python",
      lines: [
        "def build_few_shot(examples, ticket):",
        "    # examples: list of (text, label)",
        "    examples = sorted(examples, key=lambda e: e[1])",
        "    shots = '\\n\\n'.join(f'Ticket: {t}\\nCategory: {c}' for t, c in examples)",
        "    return f'{shots}\\n\\nTicket: {ticket}\\nCategory:'",
      ],
      buggyLine: 3,
      reasons: [
        "the join separator should be a single newline",
        "sorting by label groups equal labels together, so the last examples all share one label and bias the prediction toward it",
        "the f-string on the last line is invalid",
        "the examples argument should be a dictionary",
      ],
      correctReasonIndex: 1,
      explanation:
        "Alphabetical sorting puts 'other' last, and every example before the real ticket is 'other'. Recency bias then pushes predictions toward it. Interleave or shuffle labels with a fixed seed so the result is balanced and reproducible.",
      fix: "examples = interleave_by_label(examples, k=len(examples))   # balanced, no label last",
      xp: 40,
    },
    {
      id: "pe-2-code",
      kind: "code",
      title: "Code challenge: pick balanced examples",
      blurb: "Select up to k examples round-robin across labels so the shots are balanced.",
      functionName: "selectExamples",
      starter: `/**
 * Pick up to \`k\` examples, round-robin across labels, and return their ids.
 *
 * - Labels are visited in the order they first appear in \`pool\`.
 * - Within a label, take examples in pool order.
 * - Cycle through the labels, taking one per label per round, until you have
 *   \`k\` or run out.
 *
 * pool = [{id:1,label:"a"},{id:2,label:"a"},{id:3,label:"b"},{id:4,label:"c"}]
 * selectExamples(pool, 3) -> [1, 3, 4]
 * selectExamples(pool, 4) -> [1, 3, 4, 2]
 */
function selectExamples(pool, k) {
  // your code here
}`,
      tests: [
        {
          name: "one per label first",
          args: [[{ id: 1, label: "a" }, { id: 2, label: "a" }, { id: 3, label: "b" }, { id: 4, label: "c" }], 3],
          expected: [1, 3, 4],
        },
        {
          name: "second round continues in order",
          args: [[{ id: 1, label: "a" }, { id: 2, label: "a" }, { id: 3, label: "b" }, { id: 4, label: "c" }], 4],
          expected: [1, 3, 4, 2],
        },
        {
          name: "k larger than the pool returns everything",
          args: [[{ id: 1, label: "a" }, { id: 2, label: "a" }, { id: 3, label: "b" }, { id: 4, label: "c" }], 10],
          expected: [1, 3, 4, 2],
        },
        {
          name: "labels are ordered by first appearance",
          args: [[{ id: 1, label: "b" }, { id: 2, label: "a" }, { id: 3, label: "b" }, { id: 4, label: "a" }], 4],
          expected: [1, 2, 3, 4],
        },
        {
          name: "a single label returns pool order",
          args: [[{ id: 1, label: "a" }, { id: 2, label: "a" }], 2],
          expected: [1, 2],
        },
        { name: "k of 0 returns nothing", args: [[{ id: 1, label: "a" }], 0], expected: [] },
        { name: "empty pool returns nothing", args: [[], 3], expected: [] },
      ],
      hints: [
        "Group ids by label first, keeping labels in the order you first see them (a Map does this for you).",
        "Loop in rounds: in each round take the next unused id from every label that still has some.",
        "Stop as soon as you have k ids, even in the middle of a round.",
      ],
      solution: `function selectExamples(pool, k) {
  const groups = new Map();
  for (const ex of pool) {
    if (!groups.has(ex.label)) groups.set(ex.label, []);
    groups.get(ex.label).push(ex.id);
  }

  const queues = [...groups.values()];
  const picked = [];
  let round = 0;

  while (picked.length < k && queues.some((q) => round < q.length)) {
    for (const q of queues) {
      if (picked.length >= k) break;
      if (round < q.length) picked.push(q[round]);
    }
    round += 1;
  }

  return picked;
}`,
      xp: 70,
    },
  ],
};
