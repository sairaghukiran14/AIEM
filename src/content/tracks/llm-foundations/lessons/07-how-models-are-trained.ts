import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "how-models-are-trained",
  order: 7,
  title: "How Models Are Trained",
  summary:
    "Pre-training teaches a model to predict the next token; post-training teaches it to be an assistant. Knowing the difference explains hallucination, knowledge cutoffs and why fine-tuning exists.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "Everything in this track so far describes a model that already exists. This lesson is about where it came from. You will rarely train a model from scratch, but the training recipe explains behaviour you will otherwise treat as magic: why a model states false things confidently, why it does not know last week's news, and why a chat model behaves differently from the raw model underneath it.",
    },
    { type: "h", text: "Two stages, two different jobs" },
    {
      type: "table",
      headers: ["Stage", "What it learns from", "What it produces"],
      rows: [
        [
          "**Pre-training**",
          "trillions of tokens of text and code, with the objective *predict the next token*",
          "a **base model**: fluent, knowledgeable, and happy to continue any text, including by rambling or refusing nothing",
        ],
        [
          "**Post-training**",
          "far smaller, curated data: example conversations, then human or AI preference comparisons",
          "an **assistant model**: follows instructions, declines some requests, keeps a consistent tone",
        ],
      ],
    },
    {
      type: "p",
      text: "Almost all of the knowledge comes from pre-training, and almost all of the *behaviour* you notice as a user comes from post-training. That is why fine-tuning, which is a small post-training run of your own, can change style and format cheaply but is a poor way to add large amounts of new knowledge.",
    },
    {
      type: "callout",
      tone: "key",
      title: "Frozen at deployment",
      text: "Training ends before you ever call the model. The weights do not change while you chat with it, and it learns nothing from your conversation. Anything it \"knows\" about your data or about recent events must be put in the prompt by your code. That single fact is the reason retrieval and tools exist.",
    },
    { type: "h", text: "What post-training adds" },
    {
      type: "ol",
      items: [
        "**Supervised fine-tuning (SFT).** Train on example conversations written by people, so the model learns the assistant format and a good answer style.",
        "**Preference tuning.** Show the model pairs of answers where people (or another model) said which is better, and nudge it towards the preferred one. The classic version is **RLHF** (reinforcement learning from human feedback); a simpler cousin is **DPO** (direct preference optimisation), which you will meet again in the fine-tuning track.",
        "**Safety and policy training.** The same mechanisms are used to teach refusals and to reduce harmful output.",
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "The training loop" },
    {
      type: "p",
      text: "Training is the same next-token game as inference, with a score attached. The model sees a sequence, predicts a probability distribution for every position, and is penalised by how little probability it gave the token that actually came next. That penalty is the **loss**, specifically **cross-entropy**: the negative log of the probability assigned to the correct token. Assign it probability 1 and the loss is 0; assign 0.01 and the loss is about 4.6.",
    },
    {
      type: "stepper",
      title: "One training step",
      steps: [
        {
          label: "Forward pass",
          detail:
            "Feed a batch of token sequences through the model. At every position it outputs probabilities over the whole vocabulary.",
          items: ["batch of text", "model", "probabilities per position"],
          mark: [1],
        },
        {
          label: "Compute the loss",
          detail:
            "Compare each position's prediction with the token that really followed. Average the negative log probability of the right tokens. Lower is better.",
          items: ["predicted p(next)", "actual next token", "cross-entropy"],
          mark: [2],
        },
        {
          label: "Backward pass",
          detail:
            "Backpropagation computes, for every weight, how much a tiny change would have changed the loss. That is the gradient.",
          items: ["gradients for every weight"],
          mark: [0],
        },
        {
          label: "Update the weights",
          detail:
            "The optimiser (usually Adam) moves each weight a small step against its gradient. The step size is the learning rate. Then the gradients are cleared and the loop repeats, millions of times.",
          items: ["optimizer.step()", "zero gradients", "next batch"],
          mark: [0],
        },
      ],
      caption:
        "Nothing here is specific to language. The same loop trains image models. Only the data and the loss change.",
    },
    { type: "h", text: "Why the shift by one matters" },
    {
      type: "p",
      text: "The input at position *t* is token *t*, and the target is token *t + 1*. If you forget the shift and use the input as its own target, the model only has to copy what it was handed, the loss falls to nearly zero almost immediately, and it learns nothing useful. It is one of the most common silent bugs in training code.",
    },
    { type: "h", text: "Why training costs so much more than inference" },
    {
      type: "p",
      text: "Inference needs the weights. Training also needs the gradients and the optimiser's running statistics, and often a full-precision copy of the weights. A common estimate with mixed precision and Adam is about **16 bytes per parameter**, against **2 bytes per parameter** to serve the same model in 16-bit precision.",
    },
    {
      type: "code",
      language: "text",
      code: `per parameter, mixed precision + Adam:
  weights (16-bit)          2 bytes
  gradients (16-bit)        2 bytes
  master weights (32-bit)   4 bytes
  Adam momentum (32-bit)    4 bytes
  Adam variance (32-bit)    4 bytes
                           -------
                           16 bytes

7B-parameter model:
  serve in 16-bit    7e9 x  2 = ~14 GB
  train with Adam    7e9 x 16 = ~112 GB   (before activations)`,
      caption:
        "This arithmetic is why parameter-efficient methods like LoRA exist: they train a tiny fraction of the weights, so almost all of that overhead disappears.",
    },
    { type: "h", text: "Scale and its limits" },
    {
      type: "ul",
      items: [
        "**Scaling laws.** Loss falls smoothly and predictably as you add parameters, data and compute. Work on compute-optimal training suggested roughly 20 training tokens per parameter, and many recent models are trained on far more than that to make them cheaper to serve.",
        "**Knowledge cutoff.** The training data stops at a date. Later events are simply absent, and a model may not be told that, so it can answer as if the world stopped there.",
        "**Why hallucination exists.** The objective rewards plausible continuations, not true ones. Where the data is thin, the model still has to put probability somewhere, and a fluent wrong answer scores better than silence. Post-training reduces this, but cannot remove it.",
        "**Data is the product.** Quality, deduplication and mix often matter more than another doubling of size.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What interviewers are listening for",
      text: "The two-stage story, and the consequence of each. Pre-training gives knowledge and fluency by next-token prediction. Post-training gives instruction-following and tone. The model is frozen at deployment, so new knowledge comes from the prompt. That separates someone who has used an API from someone who understands it.",
    },
  ],

  codeExample: {
    language: "python",
    caption:
      "A complete next-token training loop in PyTorch. Note the one-position shift between inputs and targets, and the order of the four calls inside the loop.",
    code: `import torch
import torch.nn.functional as F

# model: maps (batch, seq) token ids -> (batch, seq, vocab) logits
# loader: yields (batch, seq) tensors of token ids
optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)

model.train()
for step, tokens in enumerate(loader):
    optimizer.zero_grad()                  # 1. clear last step's gradients

    logits = model(tokens[:, :-1])         # inputs: every token but the last
    targets = tokens[:, 1:]                # targets: the same text, shifted by one

    loss = F.cross_entropy(                # 2. how surprised was the model?
        logits.reshape(-1, logits.size(-1)),
        targets.reshape(-1),
    )

    loss.backward()                        # 3. gradients for every weight
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)  # tame spikes
    optimizer.step()                       # 4. move the weights a little

    if step % 100 == 0:
        print(f"step {step}  loss {loss.item():.3f}")

# A loss of ln(vocab_size) means "guessing uniformly".
# Watch for: loss that stops falling, spikes (learning rate too high),
# or a training loss far below the validation loss (overfitting).`,
  },

  interview: [
    {
      question: "How is a chat model like the ones you use through an API actually produced?",
      answer:
        "In two main stages. Pre-training trains a large transformer on a huge text and code corpus to predict the next token, which gives it knowledge and fluency but not manners: the result is a base model that just continues text. Post-training then turns it into an assistant, first with supervised fine-tuning on example conversations and then with preference tuning, such as RLHF or DPO, where it is nudged towards answers people preferred. Most of the knowledge comes from the first stage, and most of the behaviour users notice comes from the second.",
      weakAnswer:
        "They feed it lots of data and it learns to answer questions. — It never separates fluency from instruction-following, so it cannot explain why a base model and a chat model behave differently.",
    },
    {
      question: "Why do language models hallucinate?",
      answer:
        "Because the training objective rewards a plausible continuation, not a true one. When the data on a topic is thin or absent, the model still has to put its probability mass somewhere, and a confident fluent guess scores better under the loss than refusing. Post-training and better data reduce it, and so do retrieval and tools, which put the facts into the prompt. But you design the application assuming it will still happen, with grounding, citations and checks.",
      followUp: "Does a lower temperature fix it?",
    },
    {
      question: "A user tells the model a fact and it uses it for the rest of the chat. Has it learned that fact?",
      answer:
        "No. The weights are frozen at deployment, so nothing is learned. The client re-sends the whole conversation on each call, and the fact is simply part of the prompt, within the context window. Start a new conversation and it is gone. If you want durable knowledge you either store it and retrieve it into the prompt, or you train, and training is the wrong tool for facts that change.",
    },
    {
      question: "Why does training a model need so much more memory than running it?",
      answer:
        "Because it holds much more than the weights. Training also stores a gradient for every parameter, the optimiser's running statistics (Adam keeps two values per parameter) and usually a full-precision master copy of the weights, which comes to roughly 16 bytes per parameter against 2 for serving in 16-bit. Add the activations kept for the backward pass. That is why a model that serves comfortably on one GPU can need a cluster to train, and why LoRA, which trains a small set of extra weights, is so much cheaper.",
    },
    {
      question: "What is the difference between RLHF and DPO, at a high level?",
      answer:
        "Both use preference data, pairs of answers where one is preferred. RLHF first trains a separate reward model on those preferences, then uses reinforcement learning to push the language model towards answers the reward model scores highly, while staying close to where it started. DPO skips the reward model and the reinforcement learning loop and optimises the language model directly on the preference pairs with a simple classification-style loss. DPO is simpler and more stable to run, which is why it is common in fine-tuning.",
    },
  ],

  challenges: [
    {
      id: "fnd-7-quiz",
      kind: "quiz",
      title: "Checkpoint: how models are trained",
      blurb: "Five questions on objectives, stages and costs.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is the training objective during pre-training?",
          options: [
            "Predict the next token, minimising cross-entropy over a huge text corpus",
            "Maximise the score people give to its answers",
            "Memorise each document so it can be quoted exactly",
            "Classify each sentence as true or false",
          ],
          correctIndex: 0,
          explanation:
            "Pre-training is next-token prediction. Optimising for human ratings is post-training, and nothing in the objective checks truth, which is why hallucination exists.",
        },
        {
          id: "q2",
          prompt: "What is the main difference between a base model and an assistant model?",
          options: [
            "The base model has more parameters",
            "The assistant has been post-trained, with example conversations and preference tuning, to follow instructions",
            "The base model was trained on less text",
            "The assistant model keeps learning from each conversation",
          ],
          correctIndex: 1,
          explanation:
            "They usually start from the same weights. Post-training is what adds instruction-following and tone. Neither learns during your conversations.",
        },
        {
          id: "q3",
          prompt:
            "Roughly how much memory does training a 7-billion-parameter model with Adam in mixed precision need for weights, gradients and optimiser state, compared with serving it in 16-bit?",
          options: [
            "About the same, around 14 GB",
            "About 28 GB, twice as much",
            "About 112 GB, since training needs around 16 bytes per parameter against 2",
            "About 7 GB, because training is done in smaller precision",
          ],
          correctIndex: 2,
          explanation:
            "Gradients, two Adam statistics and a 32-bit master copy add up to about 16 bytes per parameter. Serving needs only the 2-byte weights. Activations come on top.",
        },
        {
          id: "q4",
          prompt:
            "Your assistant does not know about a product released last month. What is the right fix?",
          options: [
            "Wait for the model to pick it up from users' conversations",
            "Raise the temperature",
            "Put the relevant information in the prompt, through retrieval or a tool, because the weights are frozen",
            "Ask the provider to retrain after each product release",
          ],
          correctIndex: 2,
          explanation:
            "The model learns nothing at deployment and has a cutoff. Retrieval or tools supply fresh facts at request time, which is far cheaper than retraining.",
        },
        {
          id: "q5",
          prompt:
            "During training the loss suddenly jumps up and becomes unstable. Which cause is most likely?",
          options: [
            "The learning rate is too high, so updates overshoot",
            "The vocabulary is too small",
            "The context window is too long",
            "The model has too few layers",
          ],
          correctIndex: 0,
          explanation:
            "Too large a step overshoots the minimum and the loss spikes or diverges. Lowering the learning rate, warming it up and clipping gradients are the usual fixes.",
        },
      ],
    },
    {
      id: "fnd-7-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a loss that collapses",
      blurb:
        "This language-model training run reports a loss near zero within a few hundred steps, yet the model generates nonsense.",
      language: "python",
      lines: [
        "for tokens in loader:              # (batch, seq) token ids",
        "    optimizer.zero_grad()",
        "    logits = model(tokens)         # causal model: (batch, seq, vocab)",
        "    loss = F.cross_entropy(",
        "        logits.reshape(-1, vocab_size),",
        "        tokens.reshape(-1),",
        "    )",
        "    loss.backward()",
        "    optimizer.step()",
      ],
      buggyLine: 6,
      reasons: [
        "reshape(-1) merges the batch and sequence dimensions, so gradients are mixed across examples",
        "zero_grad() is called before the forward pass instead of after the step",
        "the targets are the input tokens themselves; they should be shifted by one so each position predicts the next token",
        "cross_entropy should be applied to probabilities rather than logits",
      ],
      correctReasonIndex: 2,
      explanation:
        "Each position is asked to predict the token it was just given, which is trivial to copy, so the loss collapses without the model learning language. The inputs should be tokens[:, :-1] and the targets tokens[:, 1:]. Calling zero_grad first is fine, and cross_entropy correctly takes logits.",
      fix: "logits = model(tokens[:, :-1])\nloss = F.cross_entropy(\n    logits.reshape(-1, vocab_size),\n    tokens[:, 1:].reshape(-1),\n)",
      xp: 40,
    },
    {
      id: "fnd-7-code",
      kind: "code",
      title: "Code challenge: cross-entropy loss",
      blurb:
        "Compute the average loss of a batch of predictions. This is the number a training run watches fall.",
      functionName: "averageLoss",
      starter: `/**
 * predictions: an array of probability arrays, one per position.
 *   predictions[i][k] is the probability the model gave to token k at position i.
 * targets: the index of the correct token at each position.
 *
 * Loss for one position is -ln(probability given to the correct token).
 * Never take the log of less than 1e-12: treat any smaller probability as 1e-12.
 *
 * Return the mean loss over all positions, rounded to 4 decimal places
 * (as a number). Return 0 when there are no positions.
 */
function averageLoss(predictions, targets) {
  // your code here
}`,
      tests: [
        {
          name: "a confident correct prediction has zero loss",
          args: [[[1, 0]], [0]],
          expected: 0,
        },
        {
          name: "a uniform guess over four tokens costs ln(4)",
          args: [[[0.25, 0.25, 0.25, 0.25]], [2]],
          expected: 1.3863,
        },
        {
          name: "averages the loss over positions",
          args: [
            [
              [0.5, 0.5],
              [0.9, 0.1],
            ],
            [0, 1],
          ],
          expected: 1.4979,
        },
        {
          name: "uses the probability of the target, not the largest one",
          args: [[[0.7, 0.2, 0.1]], [1]],
          expected: 1.6094,
        },
        {
          name: "clamps a zero probability instead of returning infinity",
          args: [[[0, 1]], [0]],
          expected: 27.631,
        },
        {
          name: "returns 0 for no positions",
          args: [[], []],
          expected: 0,
        },
      ],
      hints: [
        "For each position the probability you care about is predictions[i][targets[i]].",
        "Math.log is the natural logarithm. The loss is the negative of it.",
        "Clamp with Math.max(p, 1e-12) before taking the log.",
        "Divide the total by the number of positions, then Number(x.toFixed(4)).",
      ],
      solution: `function averageLoss(predictions, targets) {
  if (predictions.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < predictions.length; i++) {
    const p = Math.max(predictions[i][targets[i]], 1e-12);
    total += -Math.log(p);
  }

  return Number((total / predictions.length).toFixed(4));
}`,
      xp: 70,
    },
  ],
};
