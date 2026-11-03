import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "distillation-and-small-models",
  order: 5,
  title: "Distillation & Small Models",
  summary:
    "A small model trained on a large model's outputs can do one task nearly as well at a fraction of the cost. Learn when it works and how to avoid fooling yourself.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "A frontier model is strong at everything and expensive at everything. For one **narrow, high-volume** task you often do not need that breadth. **Distillation** trains a small **student** model to imitate a large **teacher** on that task, so you keep most of the quality and pay a fraction of the cost and latency.",
    },
    {
      type: "stepper",
      title: "A distillation pipeline",
      steps: [
        { label: "Pick a narrow task and a metric", detail: "Define exactly what the student must do (for example, classify tickets into 12 labels) and how you will measure it on real, human-labelled data (Track 6).", items: ["task: 12-way ticket routing", "metric: macro F1 on human labels"], mark: [0, 1] },
        { label: "Collect representative inputs", detail: "Gather many real inputs that match production, not just easy ones. The student only learns what the data covers.", items: ["500,000 real tickets (anonymised)"], mark: [0] },
        { label: "Label them with the teacher", detail: "Run the teacher over the inputs to produce target outputs, with any reasoning or confidence you want to keep. This is synthetic labelling, so check the provider's terms for using outputs to train another model.", items: ["teacher labels + confidence"], mark: [0] },
        { label: "Filter and balance", detail: "Drop low-confidence and duplicate examples, cap very common classes and keep rare ones, so the student sees a useful mix.", items: ["confidence >= 0.8", "dedupe", "cap per class"], mark: [0, 1, 2] },
        { label: "Train the student", detail: "Fine-tune a small model (full or with adapters) on the filtered data, using the data practices from lesson 2.", items: ["student: small model, tuned"], mark: [0] },
        { label: "Evaluate on human labels, not teacher labels", detail: "Compare student, teacher and the cheap prompted baseline on a held-out set labelled by people. Ship only if the student meets the bar.", items: ["student vs teacher vs baseline"], mark: [0] },
      ],
      caption: "The last step is the one most often skipped, and the one that tells you whether it worked.",
    },
    {
      type: "sorter",
      title: "Good fit for distillation?",
      prompt: "Which tasks suit a small distilled model?",
      categories: ["Good fit", "Poor fit"],
      items: [
        { text: "Route 5 million support tickets a day into 12 categories", answer: 0, why: "Narrow, high volume and well defined: classic distillation territory." },
        { text: "Open-ended assistant answering any question on any topic", answer: 1, why: "It depends on the breadth of a large model, which a small one lacks." },
        { text: "Extract fields from invoices into a fixed schema", answer: 0, why: "A bounded task with checkable outputs." },
        { text: "Rare, varied expert questions requiring long multi-step reasoning", answer: 1, why: "Capability the small model may simply not have, and the data would be sparse." },
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Distillation inherits the teacher's flaws",
      text: "The student learns the teacher's mistakes, biases and blind spots, and cannot exceed the teacher on the data it was given. It is a compression technique, not a quality upgrade.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Hard labels and soft labels" },
    {
      type: "p",
      text: "**Hard-label** (or sequence-level) distillation trains on the teacher's **final outputs**, which is all you can do through an API that returns only text. **Soft-label** distillation, when you have access to the teacher's output probabilities, trains the student to match the teacher's whole **distribution** over tokens. That carries richer information (which wrong answers were nearly right) and often transfers better, but needs access to the teacher's logits.",
    },
    { type: "h", text: "Related ways to get a smaller, cheaper model" },
    {
      type: "table",
      headers: ["Technique", "What it does", "Trade-off"],
      rows: [
        ["**Distillation**", "train a small model to imitate a big one on a task", "needs data and a training run; narrow scope"],
        ["**Quantisation**", "store weights in fewer bits (8 or 4)", "memory and speed gain; small quality loss to check"],
        ["**Pruning**", "remove less important weights or structures", "complex; often needs retraining"],
        ["**Routing / cascade**", "send easy requests to a small model, hard ones to a large one (Track 1)", "no training; needs a reliable difficulty signal"],
        ["**Fine-tune a small base**", "tune an existing small model on human labels", "needs good human-labelled data"],
      ],
    },
    {
      type: "calculator",
      title: "Teacher versus student at scale",
      inputs: [
        { key: "requests", label: "Requests per month", min: 100000, max: 500000000, step: 100000, value: 60000000 },
        { key: "tokens", label: "Tokens per request (in + out)", min: 100, max: 5000, step: 50, value: 700 },
        { key: "teacher", label: "Teacher price per 1M tokens", min: 0.5, max: 60, step: 0.5, value: 10, unit: "$" },
        { key: "student", label: "Student price per 1M tokens", min: 0.01, max: 10, step: 0.01, value: 0.4, unit: "$" },
        { key: "once", label: "One-off distillation cost", min: 1000, max: 300000, step: 1000, value: 40000, unit: "$" },
      ],
      outputs: [
        { label: "Teacher cost per month", formula: "requests * tokens / 1e6 * teacher", format: "usd" },
        { label: "Student cost per month", formula: "requests * tokens / 1e6 * student", format: "usd" },
        { label: "Months to recover the one-off cost", formula: "once / Math.max(1e-9, requests * tokens / 1e6 * (teacher - student))", format: "fixed2" },
      ],
      note: "Excludes the quality gap. Multiply by the cost of the student's extra errors, and add serving and maintenance, before deciding.",
    },
    { type: "h", text: "How to avoid fooling yourself" },
    {
      type: "ul",
      items: [
        "**Evaluate on human labels**, not on the teacher's outputs. A student scored against the teacher measures imitation, not correctness: if the teacher is wrong, matching it counts as a win.",
        "**Keep a prompted baseline**: if a small model with a good prompt already meets the bar, you do not need to train anything.",
        "**Watch the tail**: students often match on common cases and fail on rare ones. Look at per-class and edge-case results.",
        "**Check the terms**: providers may restrict using their outputs to train competing models. Read them before generating training data.",
        "**Plan for refresh**: when production inputs drift, the student needs new data and retraining.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That distillation compresses a teacher on a narrow task, that the student inherits its errors, that data coverage and filtering decide the result, that you evaluate against human labels and a prompted baseline, and that you check licence terms and drift.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Select distillation data: confident, deduplicated and class-balanced.",
    code: `from collections import Counter

def select_training_inputs(examples: list[dict], min_conf: float, max_per_label: int) -> list[str]:
    """examples: {'input', 'label', 'confidence'} produced by the teacher, in a stable order."""
    seen: set[str] = set()
    per_label: Counter = Counter()
    kept: list[str] = []

    for ex in examples:
        if ex["confidence"] < min_conf:
            continue                                  # the teacher was unsure: skip
        if ex["input"] in seen:
            continue                                  # duplicate input: keep the first only
        if per_label[ex["label"]] >= max_per_label:
            continue                                  # cap common classes so rare ones are not drowned out
        seen.add(ex["input"])
        per_label[ex["label"]] += 1
        kept.append(ex["input"])
    return kept


# Evaluate the student against HUMAN labels, never the teacher's:
def accuracy(student, human_labelled: list[dict]) -> float:
    return sum(student(x["input"]) == x["human_label"] for x in human_labelled) / len(human_labelled)`,
  },

  interview: [
    {
      question: "What is model distillation and when does it make sense?",
      answer:
        "Training a smaller student model to imitate a larger teacher on a specific task, so you retain most of the quality at much lower cost and latency. It makes sense for narrow, well-defined, high-volume tasks where inputs are representative and a human-labelled eval exists. It does not make sense for open-ended, broad tasks that rely on the large model's breadth.",
      weakAnswer:
        "Making a model smaller. — Omits the teacher, the task focus and the data.",
    },
    {
      question: "What are the main risks of distillation?",
      answer:
        "The student inherits the teacher's errors and biases and cannot exceed it on the training distribution; coverage gaps mean it fails on rare cases; evaluating against teacher outputs flatters it; there may be licence restrictions on using a provider's outputs for training; and drift in production inputs requires regular refresh. I mitigate with human-labelled evaluation, per-class analysis and a prompted baseline.",
      followUp: "How would you evaluate it honestly?",
    },
    {
      question: "How is soft-label distillation different from hard-label?",
      answer:
        "Hard-label trains on the teacher's final outputs, the only option when an API returns text alone. Soft-label trains the student to match the teacher's full probability distribution over tokens, which carries information about near-miss alternatives and often transfers better, but it requires access to the teacher's logits.",
    },
    {
      question: "How would you decide between distilling a model and routing requests between a small and a large model?",
      answer:
        "Routing needs no training and keeps the large model for hard cases, but depends on a reliable difficulty signal and still pays large-model cost on the hard share. Distillation gives the lowest per-request cost on a narrow task but needs data, training and maintenance. I would estimate each one's cost and quality on my eval set, and they can be combined by distilling the easy majority.",
    },
    {
      question: "Why evaluate the student on human-labelled data rather than teacher labels?",
      answer:
        "Scoring against the teacher measures how well the student copies it, so a wrong teacher label that the student reproduces counts as a success. Human labels measure correctness, tell me whether the student really meets the requirement and how it compares with the teacher, and expose cases where student and teacher fail together.",
    },
  ],

  challenges: [
    {
      id: "ft-5-quiz",
      kind: "quiz",
      title: "Checkpoint: distillation",
      blurb: "Five questions on teachers, students and honest evaluation.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which task is the best fit for distillation?",
          options: [
            "An open-ended assistant answering any topic",
            "Routing millions of tickets a day into 12 categories",
            "Rare multi-step expert reasoning",
            "Creative writing across genres",
          ],
          correctIndex: 1,
          explanation:
            "Narrow, high-volume, well-defined tasks are where a small student can match a large teacher.",
        },
        {
          id: "q2",
          prompt: "A student scores 96% against the teacher's labels. What can you conclude?",
          options: [
            "The student is 96% correct",
            "It agrees with the teacher 96% of the time, which says nothing certain about correctness",
            "The teacher is perfect",
            "The student beats the teacher",
          ],
          correctIndex: 1,
          explanation:
            "Agreement with the teacher is not correctness. Evaluate on human labels.",
        },
        {
          id: "q3",
          prompt: "What is a limit of hard-label distillation through a text-only API?",
          options: [
            "It cannot be trained",
            "The student sees only final outputs, not the teacher's probability distribution",
            "It requires more GPUs than the teacher",
            "It forbids evaluation",
          ],
          correctIndex: 1,
          explanation:
            "Soft labels carry richer information but need access to the teacher's logits.",
        },
        {
          id: "q4",
          prompt: "Why filter teacher-labelled examples by confidence?",
          options: [
            "To make the dataset larger",
            "To drop cases where the teacher was unsure, since those labels are more likely wrong",
            "To reduce the number of classes",
            "To avoid deduplication",
          ],
          correctIndex: 1,
          explanation:
            "Low-confidence teacher labels add noise that the student will learn.",
        },
        {
          id: "q5",
          prompt: "Before building a distilled model, which baseline should you check first?",
          options: [
            "Nothing",
            "A small model with a well-written prompt, which may already meet the bar",
            "A larger teacher",
            "A random model",
          ],
          correctIndex: 1,
          explanation:
            "If prompting a small model is enough, you can skip training entirely.",
        },
      ],
    },
    {
      id: "ft-5-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: evaluating the student",
      blurb: "The student 'scores 97%' but support agents keep finding wrong routings. Find the line.",
      language: "python",
      lines: [
        "data = teacher_label(inputs)             # teacher outputs",
        "train, test = split(data)",
        "student = train_student(train)",
        "print(accuracy(student, test))            # test labels are the teacher's own outputs",
      ],
      buggyLine: 4,
      reasons: [
        "accuracy cannot be computed on a test set",
        "the test labels come from the teacher, so this measures agreement with the teacher rather than correctness; use human-labelled held-out data",
        "the student should be trained on the test set",
        "print should be replaced with return",
      ],
      correctReasonIndex: 1,
      explanation:
        "If the teacher mislabels a ticket and the student copies the mistake, this metric scores it correct. Score against labels written or verified by people.",
      fix: "print(accuracy(student, human_labelled_holdout))",
      xp: 40,
    },
    {
      id: "ft-5-code",
      kind: "code",
      title: "Code challenge: select distillation data",
      blurb: "Filter teacher-labelled examples by confidence, remove duplicates and cap each class.",
      functionName: "selectTrainingInputs",
      starter: `/**
 * examples: [{ input, label, confidence }] in a fixed order.
 *
 * Walk the examples in order and keep one only if ALL are true:
 *   - confidence >= minConf
 *   - its input has not been kept before (keep the first of duplicates)
 *   - fewer than maxPerLabel examples with the same label are already kept
 *
 * Return the kept inputs in order.
 */
function selectTrainingInputs(examples, minConf, maxPerLabel) {
  // your code here
}`,
      tests: [
        {
          name: "confidence filtering",
          args: [[{ input: "a", label: "x", confidence: 0.9 }, { input: "b", label: "x", confidence: 0.5 }], 0.8, 10],
          expected: ["a"],
        },
        {
          name: "duplicates keep the first",
          args: [[{ input: "a", label: "x", confidence: 0.9 }, { input: "a", label: "y", confidence: 0.95 }], 0.8, 10],
          expected: ["a"],
        },
        {
          name: "per-label cap",
          args: [[{ input: "a", label: "x", confidence: 1 }, { input: "b", label: "x", confidence: 1 }, { input: "c", label: "y", confidence: 1 }], 0.5, 1],
          expected: ["a", "c"],
        },
        {
          name: "a skipped example does not use up the cap",
          args: [[{ input: "a", label: "x", confidence: 0.1 }, { input: "b", label: "x", confidence: 0.9 }], 0.5, 1],
          expected: ["b"],
        },
        {
          name: "a confidence exactly at the threshold is kept",
          args: [[{ input: "a", label: "x", confidence: 0.8 }], 0.8, 5],
          expected: ["a"],
        },
        { name: "no examples", args: [[], 0.5, 5], expected: [] },
      ],
      hints: [
        "Keep a Set of inputs already kept and a Map from label to how many were kept.",
        "Check confidence first, then duplicate, then the cap. Only update the Set and the Map when you actually keep one.",
        "A rejected example must not change the counts, so a later example of the same label can still fit under the cap.",
      ],
      solution: `function selectTrainingInputs(examples, minConf, maxPerLabel) {
  const seen = new Set();
  const perLabel = new Map();
  const kept = [];

  for (const ex of examples) {
    if (ex.confidence < minConf) continue;
    if (seen.has(ex.input)) continue;
    if ((perLabel.get(ex.label) || 0) >= maxPerLabel) continue;

    seen.add(ex.input);
    perLabel.set(ex.label, (perLabel.get(ex.label) || 0) + 1);
    kept.push(ex.input);
  }
  return kept;
}`,
      xp: 70,
    },
  ],
};
