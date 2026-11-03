import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "fine-tuning-data",
  order: 2,
  title: "Data for Fine-tuning",
  summary:
    "A fine-tuned model is only as good as its examples. Quality, consistency and a clean train and validation split matter more than volume.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Fine-tuning data is a set of examples of the behaviour you want. For chat models each example is a short conversation ending in the **ideal assistant reply**. The model learns to imitate those replies, **including their mistakes**. That is why the dataset, not the training code, usually decides how the project goes.",
    },
    {
      type: "code",
      language: "json",
      code: `{"messages": [
  {"role": "system",    "content": "You are a support triage assistant. Reply with JSON only."},
  {"role": "user",      "content": "I was charged twice this month."},
  {"role": "assistant", "content": "{\\"category\\": \\"billing\\", \\"reason\\": \\"duplicate charge\\"}"}
]}`,
      caption: "One training example in the common chat JSONL format: one such object per line.",
    },
    {
      type: "stepper",
      title: "From raw material to a trainable dataset",
      steps: [
        { label: "Collect", detail: "Real inputs from production (with consent and privacy review), expert-written cases, and carefully reviewed synthetic data.", items: ["production samples", "expert cases", "synthetic (reviewed)"], mark: [0, 1] },
        { label: "Write or verify the ideal outputs", detail: "Have people (or a stronger model checked by people) produce the target replies. Inconsistent labels teach inconsistent behaviour.", items: ["label guideline", "double-labelled sample"], mark: [0, 1] },
        { label: "Clean and deduplicate", detail: "Remove personal data, broken examples, near-duplicates and anything you would not want repeated.", items: ["PII removed", "dupes dropped"], mark: [0, 1] },
        { label: "Split by group", detail: "Hold out validation and test sets so that related examples never appear on both sides of a split.", items: ["train", "validation", "test"], mark: [0, 1, 2] },
        { label: "Check format and length", detail: "Validate the structure, make sure examples fit the model's context, and count tokens to estimate cost.", items: ["schema valid", "tokens counted"], mark: [0, 1] },
        { label: "Version it", detail: "Store the dataset with a version and a manifest so every model can be traced to the exact data that produced it.", items: ["dataset v3 + manifest"], mark: [0] },
      ],
      caption: "Most of the work, and most of the value, is in steps 1 to 4.",
    },
    {
      type: "sorter",
      title: "Good training example or a problem?",
      prompt: "Judge each example for a customer-support classifier.",
      categories: ["Keep", "Fix or drop"],
      items: [
        { text: "A real ticket with a category confirmed by two reviewers", answer: 0, why: "Realistic input and a verified label." },
        { text: "The same complaint reworded five times, all in the training set", answer: 1, why: "Near-duplicates over-weight one case and inflate scores if copies leak into validation." },
        { text: "A ticket containing a customer's full name and card number", answer: 1, why: "Personal and sensitive data must be removed before training." },
        { text: "Two similar tickets labelled with different categories by different annotators", answer: 1, why: "Contradictory labels teach inconsistency. Resolve with a guideline." },
        { text: "A hard edge case with a carefully reviewed label", answer: 0, why: "Rare, difficult cases are where tuning adds the most value." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "Quality beats quantity" },
    {
      type: "p",
      text: "A few hundred to a few thousand **carefully checked** examples often outperform tens of thousands of noisy ones, particularly when the base model is already capable and you are teaching a style or format. Quantity helps for hard or varied tasks, but every wrong or inconsistent label is something the model will faithfully learn.",
    },
    { type: "h", text: "Leakage: the silent score inflator" },
    {
      type: "p",
      text: "If near-duplicates of a training example sit in the validation set, the model is graded on questions it has effectively seen, and validation scores look great while real-world quality does not. This happens when you shuffle and split **row by row** a dataset containing several rows about the same ticket, document, customer or conversation. Split by **group** (the underlying source) so all rows of a group land on the same side.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Keep your eval set clean of training data",
      text: "Deduplicate the training data against your eval set (Track 6). If eval questions or close paraphrases appear in training, your measured improvement is partly memorisation.",
    },
    { type: "h", text: "Training details worth knowing" },
    {
      type: "ul",
      items: [
        "**Loss is usually computed on the assistant tokens only**, so the model learns to produce replies rather than to repeat prompts.",
        "**Consistency of format** matters: if some examples answer in JSON and others in prose, the model blends them.",
        "**Include the cases you care about**: refusals, 'I don't know', edge cases and the system prompt you will use in production, or it will not generalise to them.",
        "**Match production**: train with the same system prompt and input style you will serve.",
        "**Epochs**: one to three passes over the data is typical. More invites overfitting (lesson 6).",
      ],
    },
    {
      type: "calculator",
      title: "How many tokens will training process?",
      inputs: [
        { key: "examples", label: "Examples", min: 100, max: 200000, step: 100, value: 5000 },
        { key: "tokens", label: "Tokens per example (prompt + reply)", min: 50, max: 4000, step: 50, value: 600 },
        { key: "epochs", label: "Epochs", min: 1, max: 6, step: 1, value: 3 },
        { key: "price", label: "Training price per 1M tokens", min: 0.5, max: 50, step: 0.5, value: 8, unit: "$" },
      ],
      outputs: [
        { label: "Training tokens processed", formula: "examples * tokens * epochs", format: "int" },
        { label: "Estimated training cost", formula: "examples * tokens * epochs / 1e6 * price", format: "usd" },
      ],
      note: "Illustrative price. Hosted fine-tuning is billed per training token, so shorter examples and fewer epochs cut cost directly.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That examples are the specification, so quality and consistency beat volume; that you split by group to avoid leakage; that you remove personal data and deduplicate against the eval set; that you match production prompts; and that you version datasets alongside models.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A group-aware split so related rows never straddle train and validation.",
    code: `import json
from collections import OrderedDict

def split_by_group(rows: list[dict], val_fraction: float) -> tuple[list[dict], list[dict]]:
    """rows have 'group' (the source: ticket id, document, customer). Whole groups go to one side."""
    groups: "OrderedDict[str, list[dict]]" = OrderedDict()
    for row in rows:
        groups.setdefault(row["group"], []).append(row)

    names = list(groups)
    n_val = round(len(names) * val_fraction)
    val_groups = set(names[len(names) - n_val:])            # last n_val groups

    train = [r for r in rows if r["group"] not in val_groups]
    val = [r for r in rows if r["group"] in val_groups]
    return train, val


def validate_example(ex: dict) -> list[str]:
    errors = []
    msgs = ex.get("messages", [])
    if not msgs or msgs[-1]["role"] != "assistant":
        errors.append("last message must be the assistant reply")
    if any(m["role"] not in {"system", "user", "assistant"} for m in msgs):
        errors.append("unknown role")
    return errors


with open("train.jsonl", "w") as f:
    for ex in train_examples:
        assert not validate_example(ex), validate_example(ex)
        f.write(json.dumps(ex) + "\\n")                        # one example per line`,
  },

  interview: [
    {
      question: "How much data do you need to fine-tune, and what matters more than quantity?",
      answer:
        "It depends on the task: a few hundred to a few thousand carefully checked examples can be enough to teach a format or style on a capable base model, and harder or more varied tasks need more. What matters more than volume is label quality and consistency, coverage of the cases I care about, and a clean validation split, because the model imitates whatever the data contains, errors included.",
      weakAnswer:
        "As much as possible. — Noisy volume can make things worse.",
    },
    {
      question: "What is data leakage in fine-tuning and how do you prevent it?",
      answer:
        "Leakage is when the validation or test set contains examples that are the same as, or near-duplicates of, training examples, so scores are inflated by memorisation. It happens when related rows are split individually. I split by group, such as ticket, document or customer, deduplicate, and also deduplicate training data against my eval set.",
      followUp: "How would you detect it after the fact?",
    },
    {
      question: "What should a chat fine-tuning example contain?",
      answer:
        "A conversation in the format the provider or framework expects, usually a list of messages with an optional system message, the user turns, and a final assistant message that is the ideal reply. I use the same system prompt and input style as production, include edge cases and refusals, keep the output format consistent, and compute loss on the assistant tokens.",
    },
    {
      question: "How would you handle personal data in training data?",
      answer:
        "Treat it as a privacy and compliance issue: use only data I have the right to use, remove or pseudonymise identifiers and sensitive fields before it enters a dataset, review samples, limit access and retention, and remember that a model can memorise and reproduce training text. I would also check the provider's data-handling terms for hosted tuning.",
    },
    {
      question: "Why is it risky to train on model-generated examples?",
      answer:
        "The model will learn the generator's mistakes and style, and errors compound without a check. Synthetic data is useful for volume and for distillation (lesson 5), but I review a sample, filter by quality and confidence, keep real human-labelled data for validation and test, and check the provider's terms for using their outputs to train another model.",
    },
  ],

  challenges: [
    {
      id: "ft-2-quiz",
      kind: "quiz",
      title: "Checkpoint: fine-tuning data",
      blurb: "Five questions on building a dataset you can trust.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Why do wrong or inconsistent labels hurt a fine-tuned model?",
          options: [
            "They slow down training",
            "The model learns to imitate the examples, mistakes included",
            "They are automatically ignored",
            "They only affect validation",
          ],
          correctIndex: 1,
          explanation:
            "Fine-tuning is imitation. The data defines the behaviour, errors and all.",
        },
        {
          id: "q2",
          prompt: "You shuffle and split a dataset row by row, but it contains several paraphrases of each ticket. What is the likely result?",
          options: [
            "A fair validation score",
            "Leakage: near-duplicates land on both sides, inflating validation scores",
            "Faster training",
            "Smaller datasets",
          ],
          correctIndex: 1,
          explanation:
            "Split by group so all rows about one source stay on the same side.",
        },
        {
          id: "q3",
          prompt: "Which should you do with a training example containing a customer's card number?",
          options: [
            "Keep it, realism helps",
            "Remove or pseudonymise it before it enters the dataset",
            "Move it to the validation set",
            "Duplicate it",
          ],
          correctIndex: 1,
          explanation:
            "Sensitive data must not be trained on, since models can memorise and reproduce text.",
        },
        {
          id: "q4",
          prompt: "Why should training examples use the production system prompt?",
          options: [
            "It is faster to write",
            "So the model learns the behaviour in the same context it will be served in",
            "It reduces token cost",
            "Providers require it",
          ],
          correctIndex: 1,
          explanation:
            "Training and serving conditions should match, or behaviour may not transfer.",
        },
        {
          id: "q5",
          prompt: "Which choice usually improves a small fine-tuning set the most?",
          options: [
            "Adding many near-duplicate examples",
            "Carefully checked, consistent examples that cover edge cases",
            "Removing all hard cases",
            "Mixing output formats",
          ],
          correctIndex: 1,
          explanation:
            "Quality and coverage of the cases you care about beat sheer volume.",
        },
      ],
    },
    {
      id: "ft-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: splitting training data",
      blurb: "Validation accuracy is 97% but real-world accuracy is far lower. Find the line.",
      language: "python",
      lines: [
        "random.shuffle(rows)       # rows hold several paraphrases of each underlying ticket",
        "split = int(len(rows) * 0.9)",
        "train, val = rows[:split], rows[split:]",
      ],
      buggyLine: 1,
      reasons: [
        "random.shuffle cannot be used on lists of dicts",
        "rows are shuffled and split individually, so near-duplicates of the same ticket land in both train and validation and inflate the score; split by group",
        "the split should be 50/50",
        "val must be larger than train",
      ],
      correctReasonIndex: 1,
      explanation:
        "A row-level split lets the model see a paraphrase of every validation example during training. The 97% measures memorisation. Group rows by their source and put whole groups on one side.",
      fix: "train, val = split_by_group(rows, val_fraction=0.1)",
      xp: 40,
    },
    {
      id: "ft-2-code",
      kind: "code",
      title: "Code challenge: split by group",
      blurb: "Hold out whole groups so related rows never straddle train and validation.",
      functionName: "splitByGroup",
      starter: `/**
 * rows: [{ id, group }]  (rows with the same group belong together)
 *
 * Order groups by first appearance. The LAST Math.round(groups * valFraction)
 * groups go to validation; all other groups go to train.
 *
 * Return { train, val }: arrays of row ids, each in the original row order.
 *
 * splitByGroup([{id:1,group:"a"},{id:2,group:"a"},{id:3,group:"b"},{id:4,group:"b"}], 0.5)
 *   -> { train: [1, 2], val: [3, 4] }
 */
function splitByGroup(rows, valFraction) {
  // your code here
}`,
      tests: [
        {
          name: "half the groups",
          args: [[{ id: 1, group: "a" }, { id: 2, group: "a" }, { id: 3, group: "b" }, { id: 4, group: "b" }], 0.5],
          expected: { train: [1, 2], val: [3, 4] },
        },
        {
          name: "one of five groups",
          args: [[{ id: 1, group: "a" }, { id: 2, group: "a" }, { id: 3, group: "b" }, { id: 4, group: "b" }, { id: 5, group: "c" }, { id: 6, group: "c" }, { id: 7, group: "d" }, { id: 8, group: "d" }, { id: 9, group: "e" }, { id: 10, group: "e" }], 0.2],
          expected: { train: [1, 2, 3, 4, 5, 6, 7, 8], val: [9, 10] },
        },
        {
          name: "interleaved rows keep whole groups together",
          args: [[{ id: 1, group: "a" }, { id: 2, group: "b" }, { id: 3, group: "a" }, { id: 4, group: "b" }], 0.5],
          expected: { train: [1, 3], val: [2, 4] },
        },
        {
          name: "a fraction of 0 holds nothing out",
          args: [[{ id: 1, group: "a" }, { id: 2, group: "b" }], 0],
          expected: { train: [1, 2], val: [] },
        },
        {
          name: "a single group rounds to zero held out",
          args: [[{ id: 1, group: "a" }, { id: 2, group: "a" }], 0.2],
          expected: { train: [1, 2], val: [] },
        },
        { name: "no rows", args: [[], 0.5], expected: { train: [], val: [] } },
      ],
      hints: [
        "Collect the group names in order of first appearance (a Set keeps insertion order).",
        "Compute how many groups to hold out with Math.round(count * valFraction) and take the last that many group names.",
        "Walk the rows once, sending each id to val if its group is held out, otherwise to train. That keeps row order.",
      ],
      solution: `function splitByGroup(rows, valFraction) {
  const groups = [...new Set(rows.map((r) => r.group))];
  const nVal = Math.round(groups.length * valFraction);
  const heldOut = new Set(groups.slice(groups.length - nVal));

  const train = [];
  const val = [];
  for (const row of rows) {
    (heldOut.has(row.group) ? val : train).push(row.id);
  }
  return { train, val };
}`,
      xp: 70,
    },
  ],
};
