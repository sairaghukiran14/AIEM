import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "lora-and-qlora",
  order: 3,
  title: "LoRA & QLoRA",
  summary:
    "Training every weight of a large model is expensive. Low-rank adapters train a tiny fraction of the parameters and get most of the benefit.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "A model has billions of weights. **Full fine-tuning** updates all of them, which needs memory for the weights, their gradients and the optimiser state, several times the model's size. **Parameter-efficient fine-tuning (PEFT)** freezes the original weights and trains a small number of **new** ones. The most widely used method is **LoRA**, low-rank adaptation.",
    },
    {
      type: "stepper",
      title: "How LoRA works",
      steps: [
        { label: "Freeze the pretrained weight W", detail: "In a layer, the output is x times W. W is a large matrix (for example 4096 by 4096, 16.8 million numbers). In LoRA it never changes.", items: ["W: 4096 x 4096, frozen"], mark: [0] },
        { label: "Learn a low-rank update", detail: "Instead of changing W, learn two small matrices: A (r by d_in) and B (d_out by r), where the rank r is tiny, such as 8. Their product B x A has the same shape as W but only r x (d_in + d_out) trainable numbers.", items: ["A: 8 x 4096", "B: 4096 x 8", "65,536 trainable vs 16.8M"], mark: [0, 1] },
        { label: "Add them in the forward pass", detail: "The layer computes x times (W + (alpha / r) x B x A). B starts at zero, so at the start the model behaves exactly like the base model, and training moves it gradually.", items: ["output = xW + scale x xBA"], mark: [0] },
        { label: "Train only A and B", detail: "Gradients and optimiser state exist only for the adapter, so memory and compute drop sharply, and the saved adapter is megabytes rather than gigabytes.", items: ["adapter file: tens of MB"], mark: [0] },
        { label: "Serve: merge or swap", detail: "Merge B x A into W for zero extra latency, or keep adapters separate and swap them per task or customer on one shared base model.", items: ["merged model", "or: base + adapter A / adapter B"], mark: [0, 1] },
      ],
      caption: "The key assumption: the useful change to the weights has low rank.",
    },
    {
      type: "calculator",
      title: "How small is a LoRA adapter?",
      inputs: [
        { key: "billions", label: "Base model size", min: 1, max: 405, step: 1, value: 8, unit: "B params" },
        { key: "bits", label: "Bits per base weight (16, 8 or 4)", min: 4, max: 16, step: 4, value: 16 },
        { key: "d", label: "Hidden size", min: 1024, max: 16384, step: 256, value: 4096 },
        { key: "layers", label: "Transformer layers", min: 8, max: 128, step: 1, value: 32 },
        { key: "r", label: "LoRA rank r", min: 1, max: 128, step: 1, value: 16 },
      ],
      outputs: [
        { label: "Base weights in memory (GB)", formula: "billions * bits / 8", format: "fixed1" },
        { label: "LoRA parameters (attention q,k,v,o)", formula: "layers * 4 * 2 * d * r", format: "int" },
        { label: "Adapter as a share of the base model", formula: "layers * 4 * 2 * d * r / (billions * 1e9)", format: "pct" },
      ],
      note: "Approximation: adapters on the four attention projections, treated as square d by d matrices. Real models differ in shapes, and many setups also adapt the MLP layers. Training also needs memory for activations and optimiser state for the adapter.",
    },
    {
      type: "sorter",
      title: "Frozen or trained in LoRA?",
      prompt: "Which parts of the model change during LoRA training?",
      categories: ["Frozen", "Trained"],
      items: [
        { text: "The original pretrained weight matrix W", answer: 0, why: "LoRA never updates W. It learns a separate additive update." },
        { text: "The small matrix A (r by d_in)", answer: 1, why: "A is part of the new, trainable adapter." },
        { text: "The small matrix B (d_out by r), initialised to zero", answer: 1, why: "B is trainable. Starting at zero means the model starts identical to the base." },
        { text: "The model's tokenizer and vocabulary", answer: 0, why: "Not touched by weight-adapter training." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "Why low rank is a reasonable bet" },
    {
      type: "p",
      text: "Pretraining already gave the model broad abilities. Adapting it to a task usually needs only a small, structured change, one that can be written with few directions. Research on fine-tuning suggests the useful update to a weight matrix has a low intrinsic rank. That is an empirical observation, not a guarantee: very different tasks, or tasks needing a lot of new capability, may need higher ranks or full fine-tuning.",
    },
    { type: "h", text: "The knobs" },
    {
      type: "table",
      headers: ["Setting", "What it does", "Typical practice"],
      rows: [
        ["**Rank r**", "adapter capacity; parameters grow linearly with r", "8 to 64; raise if the model underfits"],
        ["**alpha**", "scales the update by alpha / r", "often set near r or 2r; interacts with the learning rate"],
        ["**Target modules**", "which weight matrices get adapters", "attention projections at minimum; adding MLP layers often helps"],
        ["**Dropout**", "regularises the adapter", "small values, like 0.05"],
        ["**Learning rate**", "step size for A and B", "higher than for full tuning, often around 1e-4 to 2e-4"],
      ],
    },
    { type: "h", text: "QLoRA: fit bigger models on smaller hardware" },
    {
      type: "p",
      text: "**QLoRA** combines LoRA with **quantisation**. The frozen base model is stored in **4-bit** precision (a data type designed for the distribution of neural-network weights, called NF4), cutting its memory to about a quarter of 16-bit. The LoRA adapters stay in higher precision, and gradients flow through the quantised base into them. Additional tricks reduce memory further, such as quantising the quantisation constants and paging optimiser state. The result is that a model that needed a data-centre GPU to tune can be tuned on a single large consumer or workstation GPU, at some cost in speed and a small possible loss in quality.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Merging must keep the scaling",
      text: "During training the adapter's contribution is multiplied by alpha / r. When you merge it into W you must apply the same factor: W' = W + (alpha / r) x B x A. Forgetting the scale changes the model's behaviour relative to what you evaluated.",
    },
    { type: "h", text: "Serving adapters" },
    {
      type: "ul",
      items: [
        "**Merged**: no extra latency, but one full model copy per variant.",
        "**Separate adapters**: many task or customer variants share one base in memory, and adapters are swapped per request. Needs serving software that supports it.",
        "**Quantised base plus adapters**: smallest memory, but check quality and latency against your eval.",
        "**Provider-hosted tuning**: the vendor handles all of this and charges for training and for serving the tuned model.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That LoRA freezes W and trains a low-rank update B x A scaled by alpha / r, with B initialised to zero; that it cuts trainable parameters and memory by orders of magnitude; that QLoRA adds a 4-bit quantised base; that merged adapters add no latency while separate ones enable multi-tenant serving; and that rank and target modules are chosen by evaluation.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A LoRA layer in NumPy, the parameter count, and a correct merge.",
    code: `import numpy as np

class LoRALinear:
    def __init__(self, W: np.ndarray, r: int = 8, alpha: float = 16.0, seed: int = 0):
        d_out, d_in = W.shape
        rng = np.random.default_rng(seed)
        self.W = W                                           # frozen
        self.A = rng.normal(0, 0.01, size=(r, d_in))         # trainable
        self.B = np.zeros((d_out, r))                        # trainable, starts at 0: model == base
        self.scale = alpha / r

    def forward(self, x: np.ndarray) -> np.ndarray:
        return x @ self.W.T + self.scale * (x @ self.A.T @ self.B.T)

    def merged_weight(self) -> np.ndarray:
        return self.W + self.scale * (self.B @ self.A)       # keep alpha / r when merging


def lora_params(d_in: int, d_out: int, r: int) -> dict:
    full, lora = d_in * d_out, r * (d_in + d_out)
    return {"full": full, "lora": lora, "percent": round(lora / full * 100, 2)}


print(lora_params(4096, 4096, 8))     # {'full': 16777216, 'lora': 65536, 'percent': 0.39}`,
  },

  interview: [
    {
      question: "Explain LoRA.",
      answer:
        "Low-rank adaptation freezes the pretrained weight W and learns two small matrices, A and B, whose product is a low-rank update the same shape as W. The layer computes the base output plus alpha over r times the adapter's output, with B initialised to zero so training starts from the base model. Only A and B get gradients, so trainable parameters, memory and checkpoint size drop by orders of magnitude, while quality is often close to full fine-tuning.",
      weakAnswer:
        "It is a cheaper way to fine-tune. — True, but it gives no mechanism.",
    },
    {
      question: "What is QLoRA and why does it matter?",
      answer:
        "QLoRA keeps the frozen base model in 4-bit quantised form, using the NF4 data type, and trains higher-precision LoRA adapters on top, with extra memory savings such as double quantisation and paged optimisers. It cuts the memory needed so large models can be tuned on a single GPU. The trade-offs are slower steps and a possible small quality loss, which I check against my eval.",
      followUp: "What does quantisation cost you?",
    },
    {
      question: "How would you choose the LoRA rank?",
      answer:
        "Start modest, such as 8 or 16, train on the target modules, and watch validation loss and my task metric. If it underfits, raise the rank or add more target modules like the MLP layers; if it overfits or gains flatten, lower it. Parameters grow linearly with rank, so I pick the smallest value that meets the quality bar and compare against full fine-tuning on a pilot if the stakes justify it.",
    },
    {
      question: "How do you serve many fine-tuned variants efficiently?",
      answer:
        "Keep one shared base model in memory and hold each task or customer variant as a small LoRA adapter, applying the right one per request with serving software that supports multi-adapter batching. Merging adapters gives zero extra latency but needs a full model copy per variant. I choose based on how many variants I have and my latency needs.",
    },
    {
      question: "What can go wrong when merging a LoRA adapter into the base weights?",
      answer:
        "Forgetting the alpha over r scaling, which changes behaviour from what I evaluated; merging into a quantised base without care, since rounding adds error; and merging an adapter trained against a different base version. I verify the merged model on my eval set and compare outputs with the adapter-applied model before shipping.",
    },
  ],

  challenges: [
    {
      id: "ft-3-quiz",
      kind: "quiz",
      title: "Checkpoint: LoRA and QLoRA",
      blurb: "Five questions on adapters and memory.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "In LoRA, which weights receive gradient updates?",
          options: [
            "All of the base model's weights",
            "Only the small low-rank matrices A and B",
            "Only the tokenizer",
            "Only the last layer's bias",
          ],
          correctIndex: 1,
          explanation:
            "The pretrained weights are frozen. Only the adapter matrices are trained.",
        },
        {
          id: "q2",
          prompt: "Why is B initialised to zero?",
          options: [
            "To save memory",
            "So the adapted model starts identical to the base model and changes gradually",
            "To make the rank higher",
            "It is a bug in most libraries",
          ],
          correctIndex: 1,
          explanation:
            "With B = 0 the added term is zero, so training starts from the base model's behaviour.",
        },
        {
          id: "q3",
          prompt: "A 4096 x 4096 layer gets a rank-8 adapter. About how many trainable parameters does it add?",
          options: ["About 16.8 million", "About 65,000", "About 8", "About 4 billion"],
          correctIndex: 1,
          explanation:
            "r x (d_in + d_out) = 8 x 8192 = 65,536, about 0.39% of the 16.8M in the full matrix.",
        },
        {
          id: "q4",
          prompt: "What does QLoRA add on top of LoRA?",
          options: [
            "A higher rank",
            "A quantised (4-bit) frozen base model to cut memory further",
            "A bigger tokenizer",
            "Automatic evaluation",
          ],
          correctIndex: 1,
          explanation:
            "Quantising the frozen base to 4-bit shrinks its memory footprint while adapters train at higher precision.",
        },
        {
          id: "q5",
          prompt: "You merge an adapter into W by adding B x A, ignoring the alpha / r factor. What happens?",
          options: [
            "Nothing, it is equivalent",
            "The merged model behaves differently from the one you trained and evaluated",
            "Latency doubles",
            "The model forgets its tokenizer",
          ],
          correctIndex: 1,
          explanation:
            "Training scales the adapter output by alpha / r. Merging must use the same scale.",
        },
      ],
    },
    {
      id: "ft-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: merging an adapter",
      blurb: "The merged model scores noticeably worse than the adapter-applied model did. Find the line.",
      language: "python",
      lines: [
        "def merge(W, A, B, alpha, r):",
        "    delta = B @ A",
        "    return W + delta          # alpha / r scaling omitted",
      ],
      buggyLine: 3,
      reasons: [
        "W and delta have different shapes",
        "the adapter was scaled by alpha / r during training, so merging without that factor changes the model's behaviour",
        "A and B must be swapped",
        "the function should return only delta",
      ],
      correctReasonIndex: 1,
      explanation:
        "In the forward pass the adapter contributes (alpha / r) x B x A. A merge must add the same quantity: W + (alpha / r) x B x A. Otherwise the merged weights are not the ones you evaluated.",
      fix: "return W + (alpha / r) * delta",
      xp: 40,
    },
    {
      id: "ft-3-code",
      kind: "code",
      title: "Code challenge: count LoRA parameters",
      blurb: "Compare an adapter's size with the full weight matrix.",
      functionName: "loraParams",
      starter: `/**
 * For one weight matrix of shape (dOut x dIn) and a LoRA rank r:
 *   full    = dIn * dOut
 *   lora    = r * (dIn + dOut)
 *   percent = lora / full * 100, rounded to 2 decimals
 *
 * Return { full, lora, percent }.
 *
 * loraParams(4096, 4096, 8) -> { full: 16777216, lora: 65536, percent: 0.39 }
 */
function loraParams(dIn, dOut, r) {
  // your code here
}`,
      tests: [
        { name: "a square 4096 matrix at rank 8", args: [4096, 4096, 8], expected: { full: 16777216, lora: 65536, percent: 0.39 } },
        { name: "doubling the rank doubles the adapter", args: [4096, 4096, 16], expected: { full: 16777216, lora: 131072, percent: 0.78 } },
        { name: "a rectangular matrix", args: [1024, 4096, 4], expected: { full: 4194304, lora: 20480, percent: 0.49 } },
        { name: "rank 0 adds nothing", args: [512, 512, 0], expected: { full: 262144, lora: 0, percent: 0 } },
        { name: "a small matrix at a high rank is a big share", args: [64, 64, 32], expected: { full: 4096, lora: 4096, percent: 100 } },
      ],
      hints: [
        "full is dIn times dOut.",
        "The adapter has A (r by dIn) and B (dOut by r), so lora is r times (dIn plus dOut).",
        "percent is lora divided by full, times 100, rounded with Math.round(x * 100) / 100.",
      ],
      solution: `function loraParams(dIn, dOut, r) {
  const full = dIn * dOut;
  const lora = r * (dIn + dOut);
  return { full, lora, percent: Math.round((lora / full) * 100 * 100) / 100 };
}`,
      xp: 70,
    },
  ],
};
