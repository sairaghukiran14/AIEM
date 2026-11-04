import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "quantization-and-self-hosting",
  order: 2,
  title: "Quantization & Self-Hosting: When to Run Your Own Model",
  summary:
    "Shrink a model's memory with lower precision, choose a serving stack, and work out honestly whether running your own GPU beats paying per token.",
  minutes: 16,

  concept: [
    {
      type: "p",
      text: "Self-hosting is attractive for privacy, cost at scale, control, and offline use. It is also real operational work. This lesson gives you the arithmetic and the decision rules interviewers expect.",
    },
    {
      type: "h",
      text: "Quantization: fewer bits per weight",
    },
    {
      type: "p",
      text: "Model weights are stored as numbers. **Quantization** stores them with fewer bits, so the model needs less memory and moves less data per token. Memory for weights is simply `parameters x bits per weight / 8`.",
    },
    {
      type: "table",
      headers: ["Precision", "Bits", "Memory for a 7B model", "Typical effect"],
      rows: [
        ["**fp16 / bf16**", "16", "about 14 GB", "the usual full-quality baseline for serving"],
        ["**int8**", "8", "about 7 GB", "small quality loss on most tasks"],
        ["**int4**", "4", "about 3.5 GB", "larger quality loss, especially on reasoning and long outputs, but often acceptable"],
      ],
    },
    {
      type: "sorter",
      title: "Self-host or call an API?",
      prompt: "Which starting point fits each situation?",
      categories: ["Hosted API", "Self-host"],
      items: [
        { text: "A prototype with unpredictable, low traffic and no ML operations staff", answer: 0, why: "You pay only for what you use and run nothing." },
        { text: "Contracts forbid sending customer text to any third party", answer: 1, why: "A data-control requirement can decide the question by itself." },
        { text: "Steady, very high volume of a narrow task a small model handles well", answer: 1, why: "A busy GPU can beat per-token pricing when utilisation is high." },
        { text: "You need the most capable frontier model for hard reasoning", answer: 0, why: "The strongest models are usually only available through APIs." },
      ],
    },
    {
      type: "stepper",
      title: "Deciding whether to self-host",
      steps: [
        { label: "Write down the real requirement", detail: "Is it data control, cost, latency, offline use, or a custom model? Different reasons lead to different answers.", items: ["privacy", "cost", "latency", "control"], mark: [0, 1] },
        { label: "Find the smallest model that passes your eval", detail: "Test candidate open models on your own test set (Track 6). Model size drives hardware, so a smaller model that passes is a large saving.", items: ["7B", "13B", "70B"], mark: [0] },
        { label: "Choose precision", detail: "Quantize to fit the GPU you can afford, then re-run the eval. Accept the quality loss only if the eval still passes.", items: ["fp16", "int8", "int4"], mark: [1] },
        { label: "Compute cost per million tokens", detail: "GPU price per hour divided by the tokens it really serves per hour, including idle time. Compare it with API pricing.", items: ["$ per hour", "tokens per hour", "utilisation"], mark: [2] },
        { label: "Add the hidden costs", detail: "On-call time, monitoring, upgrades, scaling, failover and the engineers who run it. Often larger than the GPU bill.", items: ["operations", "reliability", "security"], mark: [0, 1, 2] },
      ],
      caption: "Self-hosting wins on a clear requirement, high steady utilisation, or both. It rarely wins as a way to save money on small workloads.",
    },
  ],

  underTheHood: [
    { type: "h", text: "How much memory do the weights need?" },
    {
      type: "calculator",
      title: "Weights memory by precision",
      inputs: [
        { key: "params", label: "Parameters (billions)", min: 1, max: 180, step: 1, value: 7 },
        { key: "bits", label: "Bits per weight", min: 4, max: 32, step: 4, value: 16 },
      ],
      outputs: [
        { label: "Weights (GB)", formula: "params * bits / 8", format: "fixed1" },
        { label: "Weights at 4 bits (GB)", formula: "params * 4 / 8", format: "fixed1" },
        { label: "Saved by going to 4 bits (GB)", formula: "params * bits / 8 - params * 4 / 8", format: "fixed1" },
      ],
      note: "Weights are only part of the memory: you also need room for the KV cache (lesson 1), activations and the serving engine itself.",
    },
    { type: "h", text: "The honest cost per million tokens" },
    {
      type: "calculator",
      title: "GPU cost versus tokens served",
      inputs: [
        { key: "gpu", label: "GPU price per hour ($)", min: 1, max: 10, step: 1, value: 2 },
        { key: "tps", label: "Tokens per second when busy", min: 100, max: 5000, step: 100, value: 1500 },
        { key: "util", label: "Average utilisation", min: 10, max: 100, step: 10, value: 50, unit: "%" },
      ],
      outputs: [
        { label: "Tokens served per hour (millions)", formula: "tps * 3600 * (util / 100) / 1e6", format: "fixed2" },
        { label: "Cost per million tokens ($)", formula: "gpu / (tps * 3600 * (util / 100) / 1e6)", format: "fixed2" },
        { label: "Cost if the GPU were always busy ($)", formula: "gpu / (tps * 3600 / 1e6)", format: "fixed2" },
      ],
      note: "A GPU bills while idle. Halve the utilisation and the cost per token doubles. Compare the middle figure, not the best-case one, with API prices.",
    },
    { type: "h", text: "Serving stacks" },
    {
      type: "table",
      headers: ["Option", "Idea", "Good for"],
      rows: [
        ["**vLLM and similar servers**", "continuous batching and paged KV cache on GPUs", "production throughput on your own GPUs"],
        ["**llama.cpp / Ollama**", "efficient local inference, including CPUs and laptops, with quantized model files", "development, offline use, small deployments"],
        ["**Managed model hosting**", "a provider runs open models for you, billed by use or by GPU time", "open models without running the GPUs yourself"],
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Quantization must be re-evaluated, not assumed",
      text: "Lower precision can hurt exactly the cases you care about, such as long reasoning, rare languages or precise formatting. Run your own eval on the quantized model before you ship it.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"should we host our own model?\"",
      text: "Ask what the requirement is first. Then show the numbers: the smallest model that passes our eval, the GPU memory with quantization, cost per million tokens at realistic utilisation versus API pricing, and the operational cost. Recommend self-hosting only when privacy, control or sustained high volume justify it.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Memory and cost estimates you can run before committing to hardware.",
    code: `def weights_gb(params_billions: float, bits: int) -> float:
    return params_billions * bits / 8                 # billions of params x bytes per weight = GB


def cost_per_million_tokens(gpu_per_hour: float, tokens_per_second: float, utilisation: float) -> float:
    tokens_per_hour = tokens_per_second * 3600 * utilisation
    return gpu_per_hour / (tokens_per_hour / 1e6)


print(weights_gb(70, 16))      # 140.0 GB: needs several GPUs
print(weights_gb(70, 4))       # 35.0 GB: fits one large GPU with room for the cache

# At 50% utilisation, a $2/hour GPU serving 1,500 tokens/second costs about $0.74 per million tokens.
print(round(cost_per_million_tokens(2, 1500, 0.5), 2))

# Always check the quantized model on YOUR eval set before deploying it.
for model in ("fp16", "int8", "int4"):
    print(model, run_eval(load_model(model), test_set))`,
  },

  interview: [
    {
      question: "What is quantization and what are its trade-offs?",
      answer:
        "Quantization stores model weights with fewer bits, for example 8 or 4 instead of 16. It cuts memory roughly in proportion, lets bigger models fit smaller GPUs and reduces the data moved per token, often speeding decoding. The trade-off is some quality loss, which grows at lower precision and can hit reasoning, long outputs or rare languages, so I re-run my own eval on the quantized model.",
      weakAnswer:
        "It makes the model faster with no downside. — Quality can drop, and it must be measured on your task.",
    },
    {
      question: "How much GPU memory does a 70B model need?",
      answer:
        "Weights alone are parameters times bytes per weight: about 140 GB at 16-bit, about 70 GB at 8-bit and about 35 GB at 4-bit. On top of that I need KV cache memory for the concurrent requests and some overhead. So 16-bit needs several large GPUs, while a 4-bit version might fit on one, with limited room for long contexts or big batches.",
    },
    {
      question: "When does self-hosting an LLM beat using an API?",
      answer:
        "When there is a data-control or compliance requirement, when a small open model passes my eval on a high, steady volume so the GPU stays busy, or when I need offline operation or deep customisation. It usually does not win for low or spiky traffic, or when I need the strongest frontier model. I compare cost per million tokens at realistic utilisation, plus operating cost.",
    },
    {
      question: "Why does utilisation matter so much in the self-hosting cost?",
      answer:
        "A GPU costs the same per hour whether it is serving or idle. Cost per token equals the hourly price divided by the tokens actually served, so halving utilisation doubles the cost per token. Spiky traffic leaves expensive hardware idle, which is why hosted per-token pricing often wins for variable workloads.",
    },
    {
      question: "What would you check before replacing a hosted model with a quantized open model?",
      answer:
        "I would build or reuse an eval set from real traffic, compare quality, latency and cost against the hosted baseline, and look at failure cases such as formatting, long answers and edge languages. I would load test throughput and tail latency, plan rollout behind a flag with the old model as fallback, and set up monitoring and ownership for the new system.",
    },
  ],

  challenges: [
    {
      id: "sm-2-quiz",
      kind: "quiz",
      title: "Checkpoint: quantization and self-hosting",
      blurb: "Five questions on memory, cost and the build-or-buy decision.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Roughly how much memory do the weights of a 7-billion-parameter model need at 16 bits?",
          options: ["About 3.5 GB", "About 7 GB", "About 14 GB", "About 56 GB"],
          correctIndex: 2,
          explanation:
            "7 billion x 2 bytes is about 14 GB. At 8 bits it is 7 GB and at 4 bits about 3.5 GB.",
        },
        {
          id: "q2",
          prompt: "What is the main risk of quantizing aggressively?",
          options: [
            "The model becomes larger",
            "Quality can drop, especially on reasoning and long outputs, so it must be evaluated",
            "The tokenizer changes",
            "It cannot run on a GPU",
          ],
          correctIndex: 1,
          explanation:
            "Memory falls but accuracy can too. Measure on your own task before shipping.",
        },
        {
          id: "q3",
          prompt: "A GPU costs $2 an hour and is busy 25% of the time. What happens to the cost per token compared with 100% busy?",
          options: [
            "It stays the same",
            "It is four times higher, because idle hours are paid for but serve nothing",
            "It is four times lower",
            "It is half",
          ],
          correctIndex: 1,
          explanation:
            "Cost per token is hourly cost divided by tokens actually served, so low utilisation multiplies it.",
        },
        {
          id: "q4",
          prompt: "Which is the strongest reason to self-host?",
          options: [
            "It is always cheaper",
            "A contractual requirement that customer data must not leave your infrastructure",
            "You want to avoid evaluating models",
            "You have no engineers",
          ],
          correctIndex: 1,
          explanation:
            "A data-control requirement can justify the operational effort even when cost does not.",
        },
        {
          id: "q5",
          prompt: "What should you do before shipping a quantized replacement for a hosted model?",
          options: [
            "Assume the quality is identical",
            "Compare it with the baseline on your own eval set and load test it",
            "Increase the temperature",
            "Remove monitoring",
          ],
          correctIndex: 1,
          explanation:
            "Evidence from your own data and load is the only reliable basis for the switch.",
        },
      ],
    },
    {
      id: "sm-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: the cost comparison",
      blurb: "The spreadsheet says self-hosting is far cheaper, but the real bill is higher. Find the line.",
      language: "python",
      lines: [
        "def self_host_cost_per_m(gpu_per_hour, tokens_per_second):",
        "    tokens_per_hour = tokens_per_second * 3600",
        "    return gpu_per_hour / (tokens_per_hour / 1e6)",
      ],
      buggyLine: 2,
      reasons: [
        "3600 should be 60",
        "it assumes the GPU generates tokens every second of every hour, ignoring idle time, so the cost per token is underestimated",
        "tokens_per_second must be an integer",
        "gpu_per_hour must be multiplied by 24",
      ],
      correctReasonIndex: 1,
      explanation:
        "A GPU bills while idle. Multiply by realistic average utilisation, or the estimate is the best case rather than the cost you will pay.",
      fix: "tokens_per_hour = tokens_per_second * 3600 * utilisation",
      xp: 40,
    },
    {
      id: "sm-2-code",
      kind: "code",
      title: "Code challenge: weights memory",
      blurb: "Compute the memory for model weights at a given precision.",
      functionName: "weightsMemoryGB",
      starter: `/**
 * weightsMemoryGB(paramsBillions, bitsPerWeight)
 *
 * Memory for the weights in GB: billions of parameters times bytes per weight
 * (bitsPerWeight / 8). Round to two decimal places.
 */
function weightsMemoryGB(paramsBillions, bitsPerWeight) {
  // your code here
}`,
      tests: [
        { name: "7B at 16 bits", args: [7, 16], expected: 14 },
        { name: "7B at 4 bits", args: [7, 4], expected: 3.5 },
        { name: "70B at 16 bits", args: [70, 16], expected: 140 },
        { name: "13B at 8 bits", args: [13, 8], expected: 13 },
        { name: "small model", args: [1.5, 16], expected: 3 },
        { name: "odd size rounds", args: [8.3, 4], expected: 4.15 },
      ],
      hints: [
        "Bytes per weight is bitsPerWeight / 8.",
        "Multiply by paramsBillions to get GB directly, because a billion parameters at one byte is one GB.",
        "Round with Math.round(x * 100) / 100.",
      ],
      solution: `function weightsMemoryGB(paramsBillions, bitsPerWeight) {
  const gb = paramsBillions * (bitsPerWeight / 8);
  return Math.round(gb * 100) / 100;
}`,
      xp: 70,
    },
  ],
};
