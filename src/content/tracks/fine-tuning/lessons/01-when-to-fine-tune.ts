import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "when-to-fine-tune",
  order: 1,
  title: "When to Fine-tune",
  summary:
    "Fine-tuning changes a model's behaviour by training it further. It is powerful, costly and often the wrong first move. Learn the decision ladder.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "**Fine-tuning** continues training a pretrained model on your own examples so it behaves differently by default: a consistent style, a strict format, a narrow task done well and cheaply. It changes the **weights**, not the prompt. That makes it permanent, which is both its strength and its cost.",
    },
    {
      type: "stepper",
      title: "The decision ladder: climb only as far as you need",
      steps: [
        { label: "1. Better prompting", detail: "Clear instructions, structured output, examples and reasoning (Track 2). Cheapest, fastest to change, and often enough. Try this first and measure.", items: ["prompt + structured output"], mark: [0] },
        { label: "2. Retrieval (RAG)", detail: "If the problem is missing or changing knowledge, give the model the facts at query time (Track 4). Fine-tuning is a poor and unreliable way to add facts.", items: ["RAG: knowledge"], mark: [0] },
        { label: "3. Tools and workflows", detail: "If it needs actions or exact computation, call tools and sequence steps in code (Track 5).", items: ["tools: actions, exact math"], mark: [0] },
        { label: "4. Fine-tuning", detail: "If prompting and retrieval are not enough for behaviour, style, format or cost and latency at scale, and you have good examples, train.", items: ["fine-tune: behaviour"], mark: [0] },
        { label: "5. Pre-training from scratch", detail: "Almost never your job. It needs enormous data and compute and is justified only for organisations building foundation models.", items: ["pretraining: foundation labs"], mark: [0] },
      ],
      caption: "Each rung costs more, takes longer to change, and is harder to undo than the one before.",
    },
    { type: "h", text: "What fine-tuning is good at" },
    {
      type: "ul",
      items: [
        "**Consistent style and format**: a house voice, a strict output shape, behaviour that prompts achieve only approximately.",
        "**A narrow task at scale**: classification, extraction or routing where a small tuned model can match a large prompted one at a fraction of the cost and latency.",
        "**Shorter prompts**: behaviour that previously needed 1,500 tokens of instructions and examples can move into the weights.",
        "**Teaching skills from demonstrations**: a tool-calling convention, a domain's reasoning pattern, a way of declining.",
      ],
    },
    {
      type: "sorter",
      title: "Fine-tune, or something else?",
      prompt: "Pick the best first approach for each need.",
      categories: ["Prompt or RAG", "Fine-tune"],
      items: [
        { text: "Answer questions about a returns policy that changes every month", answer: 0, why: "Changing facts belong in retrieval. Retraining monthly is slow, costly and unreliable at recall." },
        { text: "Classify 8 million tickets a day into 12 labels, at low latency and cost, with 20,000 labelled examples", answer: 1, why: "A narrow, high-volume task with plenty of labels is the classic fine-tuning win." },
        { text: "Follow a strict brand voice across every reply, which prompts only approximate", answer: 1, why: "Style and consistency are behaviours that tuning can bake in, once prompting has been measured and found short." },
        { text: "Cite the exact page each answer came from", answer: 0, why: "Citations need the source text in the prompt, which retrieval provides." },
        { text: "You have 15 example conversations and a prompt that has never been tested", answer: 0, why: "Not enough data, and you have not yet tried the cheap options." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "Why fine-tuning is a poor way to add knowledge" },
    {
      type: "p",
      text: "Training on a few hundred question-and-answer pairs nudges the model's behaviour. It does not reliably store each fact as a retrievable record. The model may recall some, blend or misremember others, and cannot tell you where an answer came from. When the facts change you must retrain, while a retrieval index just updates. Use fine-tuning for **how** the model responds and retrieval for **what** it knows (Track 4).",
    },
    { type: "h", text: "The full cost of ownership" },
    {
      type: "table",
      headers: ["Cost", "What it involves"],
      rows: [
        ["**Data**", "collecting, cleaning and labelling hundreds to many thousands of good examples (lesson 2)"],
        ["**Training**", "compute, plus iterations to tune hyperparameters"],
        ["**Evaluation**", "a held-out set, a baseline comparison and checks for regressions (lesson 6, Track 6)"],
        ["**Serving**", "hosting a custom model or adapter, which may cost more per token than a hosted base model"],
        ["**Maintenance**", "when the base model is upgraded or deprecated, you usually re-tune and re-evaluate; when your task shifts, you retrain"],
        ["**Risk**", "overfitting, losing general abilities (forgetting), and inherited bias in your data"],
      ],
    },
    {
      type: "calculator",
      title: "Does it pay for itself?",
      inputs: [
        { key: "cost", label: "One-off cost (data, training, evaluation)", min: 500, max: 200000, step: 500, value: 15000, unit: "$" },
        { key: "requests", label: "Requests per month", min: 10000, max: 100000000, step: 10000, value: 3000000 },
        { key: "saved", label: "Input tokens saved per request (shorter prompt)", min: 0, max: 5000, step: 50, value: 1200 },
        { key: "price", label: "Input price per 1M tokens", min: 0.1, max: 20, step: 0.1, value: 3, unit: "$" },
        { key: "tuneFee", label: "Extra serving cost per month", min: 0, max: 20000, step: 100, value: 800, unit: "$" },
      ],
      outputs: [
        { label: "Monthly saving from shorter prompts", formula: "saved * requests / 1e6 * price", format: "usd" },
        { label: "Net monthly benefit", formula: "saved * requests / 1e6 * price - tuneFee", format: "usd" },
        { label: "Months to break even", formula: "(saved * requests / 1e6 * price - tuneFee) <= 0 ? Infinity : cost / (saved * requests / 1e6 * price - tuneFee)", format: "fixed1" },
      ],
      note: "This counts only prompt-length savings. Moving to a smaller tuned model can save far more, and gains in quality or latency are worth adding if you can measure them. If the figure reads 'n/a', the benefit never covers the running cost.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Prompt caching changes the maths",
      text: "If your long prompt prefix is cached, the cost of those tokens is already small (Track 1 and Track 8), and the case for fine-tuning purely to shorten the prompt gets weaker. Measure with caching on.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"should we fine-tune?\"",
      text: "Walk the ladder: have you measured the best prompt, retrieval and tools? Is the gap about behaviour, style or cost at scale rather than missing facts? Do you have enough good data and an eval to prove it helped? Then estimate break-even including serving and maintenance. Most of the time the honest answer is \"not yet\".",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A decision helper that encodes the ladder, so the choice is explicit and reviewable.",
    code: `def choose_approach(need: dict) -> str:
    """
    need: prompt_works (bool), needs_facts (bool), examples (int of good labelled examples)
    """
    if need["prompt_works"]:
        return "prompt"                       # measured and good enough: stop here
    if need["needs_facts"]:
        return "rag"                          # knowledge problem: retrieve, do not train
    if need["examples"] < 20:
        return "prompt-iteration"             # not enough data, and cheap options remain
    if need["examples"] < 500:
        return "few-shot"                     # put the examples in the prompt first
    return "fine-tune"                        # behaviour gap, plenty of data, worth an eval


print(choose_approach({"prompt_works": False, "needs_facts": False, "examples": 12000}))   # fine-tune
print(choose_approach({"prompt_works": False, "needs_facts": True,  "examples": 12000}))   # rag`,
  },

  interview: [
    {
      question: "When would you fine-tune a model, and when would you not?",
      answer:
        "I fine-tune for behaviour: a consistent style or format, a narrow high-volume task where a small tuned model can replace a large prompted one, or moving a long prompt into the weights. I do not fine-tune to add knowledge, since it stores facts unreliably, cannot cite and goes stale, so I use retrieval. And I only start after measuring the best prompt, retrieval and tools, and having enough good data and an eval.",
      weakAnswer:
        "Fine-tune whenever you want the model to know your data. — That is the case where retrieval is the right tool.",
    },
    {
      question: "Why is fine-tuning a poor way to teach a model new facts?",
      answer:
        "Training adjusts behaviour statistically rather than writing facts into addressable storage, so recall is unreliable, facts blend or are misremembered, there is no source to cite, and any change requires retraining. Retrieval keeps knowledge external, updatable and citable, so I use fine-tuning for how the model answers and retrieval for what it knows.",
      followUp: "Can you combine them?",
    },
    {
      question: "What are the full costs of fine-tuning beyond the training run?",
      answer:
        "Data collection and labelling, iteration to tune hyperparameters, building an evaluation and a baseline, serving a custom model or adapter, and ongoing maintenance: when the base model is deprecated or upgraded I usually have to re-tune and re-evaluate, and when the task changes I retrain. There are also risks of overfitting and forgetting.",
    },
    {
      question: "How would you decide whether fine-tuning is worth the investment?",
      answer:
        "Establish the quality gap with the best prompted baseline on a held-out set, then estimate the benefit: quality gain, latency, and cost, such as replacing a large model or shortening prompts, taking prompt caching into account. Compare that with data, training, evaluation, serving and maintenance costs to get a break-even, and run a small pilot before committing.",
    },
    {
      question: "What can fine-tuning do that prompting cannot?",
      answer:
        "Make behaviour consistent and cheap at scale: a strict style or format the model follows without long instructions, a skill learned from many demonstrations, and a small model reaching the quality of a larger prompted one on a narrow task. It does not give new reliable knowledge or exact computation, which need retrieval and tools.",
    },
  ],

  challenges: [
    {
      id: "ft-1-quiz",
      kind: "quiz",
      title: "Checkpoint: when to fine-tune",
      blurb: "Five questions on the decision ladder.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which problem is fine-tuning best suited to?",
          options: [
            "Answering from a policy document that changes monthly",
            "A narrow, high-volume task needing a consistent format at low cost, with plenty of labelled data",
            "Citing the source page of each answer",
            "Computing exact arithmetic",
          ],
          correctIndex: 1,
          explanation:
            "Behaviour and cost at scale are what tuning does well. Facts, citations and exact maths belong to retrieval and tools.",
        },
        {
          id: "q2",
          prompt: "Why is fine-tuning a weak way to add changing facts?",
          options: [
            "It cannot run on private data",
            "It stores facts unreliably, cannot cite sources, and needs retraining whenever they change",
            "It is always too fast",
            "It removes the base model's knowledge",
          ],
          correctIndex: 1,
          explanation:
            "Retrieval updates an index and cites sources. Retraining is slow and recall is unreliable.",
        },
        {
          id: "q3",
          prompt: "What should you do before considering fine-tuning?",
          options: [
            "Nothing, start training",
            "Measure the best prompt, retrieval and tool-based approaches against an eval",
            "Buy more GPUs",
            "Rewrite the application",
          ],
          correctIndex: 1,
          explanation:
            "Climb the ladder. Cheaper options are faster to change and often sufficient.",
        },
        {
          id: "q4",
          prompt: "Which is a hidden ongoing cost of a fine-tuned model?",
          options: [
            "None, once trained it is free",
            "Re-tuning and re-evaluating when the base model is deprecated or upgraded",
            "Lower accuracy over time automatically",
            "Mandatory human review",
          ],
          correctIndex: 1,
          explanation:
            "A tune is tied to a base model. Base-model changes usually mean repeating the work.",
        },
        {
          id: "q5",
          prompt: "You cache a long prompt prefix. How does that affect the case for fine-tuning to shorten prompts?",
          options: [
            "It strengthens the case",
            "It weakens the case, because those cached tokens are already cheap",
            "No effect",
            "It makes tuning impossible",
          ],
          correctIndex: 1,
          explanation:
            "Cached prefix tokens cost far less, so the saving from moving instructions into weights shrinks.",
        },
      ],
    },
    {
      id: "ft-1-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a policy assistant plan",
      blurb: "Three weeks after launch the assistant confidently quotes an old return window. Find the line.",
      language: "python",
      lines: [
        "# Goal: answer questions about our CURRENT return policy",
        "train_data = [qa(q, a) for q, a in policy_faq]   # 300 Q&A pairs from the policy",
        "model = finetune(base_model, train_data)",
        "deploy(model)                                    # the policy changes monthly",
      ],
      buggyLine: 3,
      reasons: [
        "300 examples is too many",
        "it fine-tunes to inject facts that change monthly, which is unreliable, uncitable and stale after each policy change; this is a retrieval problem",
        "base_model must be a string",
        "deploy should run before training",
      ],
      correctReasonIndex: 1,
      explanation:
        "Fine-tuning teaches behaviour, not dependable fact storage. Changing facts need retrieval over the current policy documents, with citations, updated when the policy is.",
      fix: "answer = rag(question, index=policy_index)   # retrieve the current policy, cite it",
      xp: 40,
    },
    {
      id: "ft-1-code",
      kind: "code",
      title: "Code challenge: choose an approach",
      blurb: "Encode the decision ladder as a function.",
      functionName: "chooseApproach",
      starter: `/**
 * need = { promptWorks: boolean, needsFacts: boolean, examples: number }
 *
 * Return the first rule that applies:
 *   promptWorks            -> "prompt"
 *   needsFacts             -> "rag"
 *   examples < 20          -> "prompt-iteration"
 *   examples < 500         -> "few-shot"
 *   otherwise              -> "fine-tune"
 */
function chooseApproach(need) {
  // your code here
}`,
      tests: [
        { name: "a prompt that already works", args: [{ promptWorks: true, needsFacts: true, examples: 99999 }], expected: "prompt" },
        { name: "missing facts need retrieval", args: [{ promptWorks: false, needsFacts: true, examples: 99999 }], expected: "rag" },
        { name: "too little data", args: [{ promptWorks: false, needsFacts: false, examples: 19 }], expected: "prompt-iteration" },
        { name: "some data: put it in the prompt first", args: [{ promptWorks: false, needsFacts: false, examples: 20 }], expected: "few-shot" },
        { name: "just under the fine-tune threshold", args: [{ promptWorks: false, needsFacts: false, examples: 499 }], expected: "few-shot" },
        { name: "enough data for a behaviour gap", args: [{ promptWorks: false, needsFacts: false, examples: 500 }], expected: "fine-tune" },
      ],
      hints: [
        "Check the rules in order and return as soon as one matches.",
        "The first two checks look at flags. The last three compare examples against 20 and 500.",
        "If none of the earlier rules apply, return 'fine-tune'.",
      ],
      solution: `function chooseApproach(need) {
  if (need.promptWorks) return "prompt";
  if (need.needsFacts) return "rag";
  if (need.examples < 20) return "prompt-iteration";
  if (need.examples < 500) return "few-shot";
  return "fine-tune";
}`,
      xp: 70,
    },
  ],
};
