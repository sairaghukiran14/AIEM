import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "evaluating-and-deploying-fine-tunes",
  order: 6,
  title: "Evaluating & Deploying Fine-tunes",
  summary:
    "A fine-tune can look great on training data and fail in the real world. Learn to spot overfitting and forgetting, choose the right checkpoint, and ship safely.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "Training ends with a model that scores well on the data it practised on. That tells you almost nothing. What you need to know is: **is it better than the cheapest alternative on data it has never seen, did it lose anything it used to do well, and is it safe to ship?** This lesson is the evaluation and release discipline from Track 6, applied to a tuned model.",
    },
    {
      type: "sorter",
      title: "Which problem is this?",
      prompt: "Diagnose each symptom from a training run.",
      categories: ["Overfitting", "Forgetting", "Underfitting"],
      items: [
        { text: "Training loss keeps falling but validation loss starts rising after epoch 2", answer: 0, why: "It is memorising the training examples instead of learning something that generalises." },
        { text: "The model follows the new format but now fails general questions it answered before", answer: 1, why: "Catastrophic forgetting: tuning narrowed or overwrote earlier abilities." },
        { text: "Both training and validation loss stay high after many epochs", answer: 2, why: "The model is not learning the task: too little capacity, a poor learning rate or bad data." },
        { text: "Perfect on training examples, poor on reworded versions of them", answer: 0, why: "Memorised surface forms, not the underlying task." },
      ],
    },
    {
      type: "stepper",
      title: "From checkpoint to production",
      steps: [
        { label: "Choose the checkpoint by validation", detail: "Save a checkpoint each epoch and pick the one with the best validation result, not the last one. Stop early once validation stops improving.", items: ["epoch 1", "epoch 2: best val", "epoch 3", "epoch 4"], mark: [1] },
        { label: "Compare with the baselines", detail: "On a held-out, human-labelled test set, compare the tuned model with the untuned base and with the best prompted model (Track 6). Report intervals, not just means.", items: ["tuned vs base vs prompted"], mark: [0] },
        { label: "Check for regressions", detail: "Run your regression suite, general-capability checks, safety and refusal tests, and edge cases. Tuning can quietly damage things you did not train on.", items: ["regression suite", "safety suite", "general tasks"], mark: [0, 1, 2] },
        { label: "Shadow, then canary", detail: "Run on live traffic invisibly, then send a small share of real users, comparing quality, latency and cost (Track 6).", items: ["shadow", "5% canary"], mark: [0, 1] },
        { label: "Roll out with a rollback", detail: "Keep the previous model one switch away. Record the dataset, base model, hyperparameters and checkpoint that produced this version.", items: ["versioned release", "instant rollback"], mark: [0, 1] },
        { label: "Monitor and plan the refresh", detail: "Watch quality, drift and cost in production. Retrain when inputs drift, and when the base model is upgraded or deprecated.", items: ["monitor", "retrain triggers"], mark: [0, 1] },
      ],
      caption: "Every step guards against a different way a tuned model can disappoint.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Reading the learning curves" },
    {
      type: "table",
      headers: ["What you see", "Likely meaning", "What to try"],
      rows: [
        ["training and validation loss both fall", "learning well", "continue until validation flattens"],
        ["training falls, validation rises", "overfitting", "fewer epochs, lower learning rate, more data, regularisation, smaller rank"],
        ["both stay high", "underfitting or bad data", "higher rank or learning rate, check labels and format"],
        ["validation noisy and jumpy", "small or inconsistent validation set", "more validation data; smooth over epochs"],
      ],
    },
    {
      type: "p",
      text: "**Early stopping** halts training when the validation loss has not improved for a set number of epochs (the **patience**), and you keep the best checkpoint. It is the simplest and most effective guard against overfitting.",
    },
    { type: "h", text: "Catastrophic forgetting" },
    {
      type: "p",
      text: "Training only on a narrow task can erode abilities the model had before. Parameter-efficient methods such as LoRA (lesson 3), low learning rates and few epochs reduce it. **Mixing in some general or original-style data** helps keep earlier behaviour. The only reliable defence is to **test for it**: keep a set of general tasks, safety and refusal checks, and run them on every candidate.",
    },
    { type: "h", text: "Serving: hosted or self-hosted" },
    {
      type: "calculator",
      title: "Self-hosting cost per million tokens",
      inputs: [
        { key: "gpu", label: "GPU price per hour", min: 0.5, max: 10, step: 0.1, value: 2.5, unit: "$" },
        { key: "tps", label: "Generation throughput (all requests)", min: 100, max: 20000, step: 100, value: 2500, unit: "tok/s" },
        { key: "util", label: "Average utilisation", min: 5, max: 100, step: 5, value: 40, unit: "%" },
      ],
      outputs: [
        { label: "Tokens served per GPU-hour", formula: "tps * 3600 * util / 100", format: "int" },
        { label: "Cost per 1M tokens", formula: "gpu / (tps * 3600 * util / 100) * 1e6", format: "usd" },
      ],
      note: "Idle GPUs still cost money, which is why low utilisation makes self-hosting expensive. Add engineering and on-call time. Compare with the per-token price of a hosted option for the same quality.",
    },
    {
      type: "ul",
      items: [
        "**Provider-hosted tuning**: no infrastructure, but you are tied to that vendor's base model and pricing, and a deprecated base model means re-tuning.",
        "**Self-hosted**: control and potentially low cost at high steady volume, but you own serving, scaling, security and monitoring.",
        "**Adapters**: serve many variants from one base (lesson 3).",
        "**Version everything**: dataset, base model id, hyperparameters, checkpoint and eval results, so any model can be reproduced and any regression traced.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Base models move under you",
      text: "A fine-tune is bound to a specific base model. When that model is upgraded or retired you do not get your tune for free on the new one: you re-train, re-evaluate and re-release. Budget for it, and keep your data and eval harness ready.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That checkpoints are chosen by validation with early stopping, that a tune is compared with the base and the best prompted model on held-out human-labelled data, that forgetting and safety are tested explicitly, that release is shadow then canary with rollback, and that fine-tunes need re-tuning when the base model changes.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Early stopping and best-checkpoint selection from validation losses.",
    code: `def early_stop_epoch(val_losses: list[float], patience: int) -> int | None:
    """Return the 1-based epoch at which to stop, or None if training never stalls.

    Training stops once validation loss has failed to beat the best seen for 'patience' epochs in a row.
    """
    best = float("inf")
    since_best = 0
    for epoch, loss in enumerate(val_losses, start=1):
        if loss < best:
            best, since_best = loss, 0               # strict improvement resets the counter
        else:
            since_best += 1
            if since_best >= patience:
                return epoch
    return None


def best_epoch(val_losses: list[float]) -> int:
    return min(range(len(val_losses)), key=lambda i: (val_losses[i], i)) + 1   # earliest on ties


losses = [1.0, 0.8, 0.7, 0.75, 0.8, 0.9]
print(early_stop_epoch(losses, patience=2))    # 5
print(best_epoch(losses))                      # 3: deploy checkpoint 3, not the last one`,
  },

  interview: [
    {
      question: "How do you detect overfitting in a fine-tuning run and what do you do about it?",
      answer:
        "Training loss keeps falling while validation loss stops improving or rises, and the model does well on training examples but poorly on reworded or unseen inputs. I save a checkpoint each epoch, stop early after a patience window and deploy the best validation checkpoint, and if it overfits quickly I reduce epochs or learning rate, lower the adapter rank, add data, or clean duplicates.",
      weakAnswer:
        "Train until the loss is as low as possible. — That is how you overfit.",
    },
    {
      question: "What is catastrophic forgetting and how do you guard against it?",
      answer:
        "Narrow fine-tuning can erode abilities the base model had. I reduce it with parameter-efficient methods, low learning rates, few epochs and some general data mixed in, but the real defence is testing: a suite of general tasks, safety and refusal checks, and my regression set run on every candidate checkpoint before release.",
      followUp: "What would you do if the tuned model now refuses fewer unsafe requests?",
    },
    {
      question: "How do you decide whether a fine-tuned model is good enough to ship?",
      answer:
        "On a held-out, human-labelled test set I compare it against the untuned base and the best prompted baseline, with confidence intervals, and check per-class and edge-case performance. Then I run regression, safety and general-capability suites, evaluate cost and latency, and deploy through shadow and canary stages with a one-switch rollback.",
    },
    {
      question: "What happens to your fine-tune when the provider deprecates the base model?",
      answer:
        "The tune is tied to that base, so I need to re-run training on the successor, re-evaluate against the same held-out set and regression suites, and re-release. I plan for it by keeping versioned datasets, training configs and the eval harness ready, tracking deprecation schedules, and avoiding assumptions that the new base behaves identically.",
    },
    {
      question: "When would you self-host a fine-tuned model instead of using a provider?",
      answer:
        "When I need control over data residency or the weights, or when steady high volume makes owned GPUs cheaper than per-token pricing at the same quality, after counting utilisation, engineering and on-call cost. Low or spiky traffic usually favours a hosted service, since idle GPUs still cost money.",
    },
  ],

  challenges: [
    {
      id: "ft-6-quiz",
      kind: "quiz",
      title: "Checkpoint: evaluating and deploying fine-tunes",
      blurb: "Five questions on overfitting, forgetting and release.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Training loss falls while validation loss rises. What is happening?",
          options: [
            "Underfitting",
            "Overfitting: the model is memorising training examples",
            "Forgetting only",
            "Healthy learning",
          ],
          correctIndex: 1,
          explanation:
            "A widening gap between training and validation signals overfitting.",
        },
        {
          id: "q2",
          prompt: "Which checkpoint should you usually deploy?",
          options: [
            "The final epoch",
            "The checkpoint with the best validation result",
            "The first epoch",
            "A random one",
          ],
          correctIndex: 1,
          explanation:
            "Later epochs often overfit. Choose by validation, not by recency.",
        },
        {
          id: "q3",
          prompt: "What is the only reliable defence against catastrophic forgetting?",
          options: [
            "Hoping the learning rate is low",
            "Testing: run general-capability, safety and regression suites on every candidate",
            "Training for more epochs",
            "Removing validation data",
          ],
          correctIndex: 1,
          explanation:
            "Mitigations reduce it, but only evaluation tells you whether it happened.",
        },
        {
          id: "q4",
          prompt: "The provider retires your fine-tune's base model. What do you need to do?",
          options: [
            "Nothing, the tune carries over automatically",
            "Re-train on the successor, re-evaluate and re-release",
            "Rename the model",
            "Switch off monitoring",
          ],
          correctIndex: 1,
          explanation:
            "A tune is bound to its base model. Keep data, configs and evals ready to repeat it.",
        },
        {
          id: "q5",
          prompt: "Why does low GPU utilisation make self-hosting expensive?",
          options: [
            "GPUs charge per token",
            "You pay for the GPU by the hour whether or not it is busy, so cost per token rises as utilisation falls",
            "Low utilisation lowers model quality",
            "It disables batching",
          ],
          correctIndex: 1,
          explanation:
            "Cost per token is the hourly price divided by tokens actually served per hour.",
        },
      ],
    },
    {
      id: "ft-6-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: picking the model to ship",
      blurb: "The shipped model is clearly overfit, though an earlier checkpoint was much better on validation. Find the line.",
      language: "python",
      lines: [
        "for epoch in range(20):",
        "    train_one_epoch(model)",
        "    save(model, f'ckpt-{epoch}')",
        "deploy(load('ckpt-19'))                  # always the last epoch",
      ],
      buggyLine: 4,
      reasons: [
        "the range should be 100",
        "it always deploys the final epoch instead of the checkpoint with the best validation result, so any overfitting after the peak ships to users",
        "save must be called before train_one_epoch",
        "load cannot read a checkpoint",
      ],
      correctReasonIndex: 1,
      explanation:
        "Validation performance usually peaks and then degrades as the model memorises the training data. Evaluate each checkpoint on validation, stop early, and deploy the best one.",
      fix: "deploy(load(f'ckpt-{best_epoch(val_losses) - 1}'))   # best validation checkpoint",
      xp: 40,
    },
    {
      id: "ft-6-code",
      kind: "code",
      title: "Code challenge: early stopping",
      blurb: "Decide when training should stop based on validation loss.",
      functionName: "earlyStopEpoch",
      starter: `/**
 * valLosses: validation loss after each epoch (epoch 1 is index 0).
 * patience:  how many epochs in a row without improvement to tolerate.
 *
 * Track the best (lowest) loss so far. An epoch counts as an improvement only if its
 * loss is STRICTLY lower than the best. When the number of consecutive non-improving
 * epochs reaches \`patience\`, return that epoch's number (1-based).
 * If training never stalls that long, return null.
 *
 * earlyStopEpoch([1.0, 0.8, 0.7, 0.75, 0.8, 0.9], 2) -> 5
 */
function earlyStopEpoch(valLosses, patience) {
  // your code here
}`,
      tests: [
        { name: "stops two epochs after the best", args: [[1.0, 0.8, 0.7, 0.75, 0.8, 0.9], 2], expected: 5 },
        { name: "more patience stops later", args: [[1.0, 0.8, 0.7, 0.75, 0.8, 0.9], 3], expected: 6 },
        { name: "still improving, never stops", args: [[1.0, 0.9, 0.8, 0.7], 2], expected: null },
        { name: "patience of one stops at the first miss", args: [[0.5, 0.6], 1], expected: 2 },
        { name: "an equal loss is not an improvement", args: [[0.5, 0.5], 1], expected: 2 },
        { name: "an improvement resets the counter", args: [[0.9, 0.95, 0.8, 0.85, 0.7], 2], expected: null },
        { name: "no epochs", args: [[], 2], expected: null },
      ],
      hints: [
        "Keep best (start at Infinity) and a counter of consecutive epochs without improvement.",
        "If loss < best, set best to loss and reset the counter to 0. Otherwise add one to the counter.",
        "When the counter reaches patience, return the current epoch number, which is the index plus 1. If the loop ends, return null.",
      ],
      solution: `function earlyStopEpoch(valLosses, patience) {
  let best = Infinity;
  let since = 0;

  for (let i = 0; i < valLosses.length; i++) {
    if (valLosses[i] < best) {
      best = valLosses[i];
      since = 0;
    } else {
      since += 1;
      if (since >= patience) return i + 1;
    }
  }
  return null;
}`,
      xp: 70,
    },
  ],
};
