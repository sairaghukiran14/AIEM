import type { Quiz, Track } from "@/content/types";

import { lesson as whenToFineTune } from "./lessons/01-when-to-fine-tune";
import { lesson as trainingData } from "./lessons/02-training-data";
import { lesson as loraQlora } from "./lessons/03-lora-qlora";
import { lesson as preferenceOptimization } from "./lessons/04-preference-optimization";
import { lesson as distillation } from "./lessons/05-distillation";
import { lesson as evaluatingDeploying } from "./lessons/06-evaluating-deploying";

const gate: Quiz = {
  id: "ft-gate",
  kind: "gate",
  title: "Track Gate: Fine-tuning & Model Adaptation",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to unlock Production AI and earn your track badge.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt: "A team wants a support bot that answers from a returns policy that changes every month. What should they use?",
      options: [
        "Fine-tuning on the policy Q&A each month",
        "Retrieval over the current policy documents, with citations",
        "Pre-training a new model",
        "A larger temperature",
      ],
      correctIndex: 1,
      explanation:
        "Changing facts belong in retrieval. Fine-tuning stores facts unreliably, cannot cite and goes stale.",
    },
    {
      id: "g2",
      prompt: "Which problem is fine-tuning genuinely good at solving?",
      options: [
        "Adding up-to-date facts",
        "A narrow, high-volume task needing consistent format at low cost and latency, with plenty of good labels",
        "Computing exact arithmetic",
        "Citing page numbers",
      ],
      correctIndex: 1,
      explanation:
        "Behaviour, style and cost at scale are tuning's strengths. Facts, maths and citations need retrieval and tools.",
    },
    {
      id: "g3",
      prompt: "You split a dataset row by row but it contains many paraphrases of each ticket. What goes wrong?",
      options: [
        "Training becomes slower",
        "Near-duplicates land in both train and validation, inflating validation scores",
        "The model forgets its tokenizer",
        "Nothing",
      ],
      correctIndex: 1,
      explanation:
        "Leakage makes validation measure memorisation. Split by group.",
    },
    {
      id: "g4",
      prompt: "In LoRA, which statement is true?",
      options: [
        "All pretrained weights are updated",
        "The pretrained weight W is frozen and a low-rank update B x A, scaled by alpha / r, is learned",
        "Only the tokenizer is trained",
        "The adapter must be larger than the base model",
      ],
      correctIndex: 1,
      explanation:
        "LoRA trains only the small matrices A and B, with B starting at zero.",
    },
    {
      id: "g5",
      prompt: "A 4096 x 4096 layer gets a rank-16 adapter. About how many trainable parameters does it add?",
      options: ["About 16.8 million", "About 131,000", "About 16", "About 1 billion"],
      correctIndex: 1,
      explanation:
        "r x (d_in + d_out) = 16 x 8192 = 131,072.",
    },
    {
      id: "g6",
      prompt: "What does QLoRA add to LoRA?",
      options: [
        "A higher rank",
        "A 4-bit quantised frozen base model, cutting memory so larger models can be tuned on one GPU",
        "A reward model",
        "Automatic evaluation",
      ],
      correctIndex: 1,
      explanation:
        "The frozen base is quantised while the adapters train at higher precision.",
    },
    {
      id: "g7",
      prompt: "How does DPO differ from classic RLHF?",
      options: [
        "DPO needs a bigger reward model",
        "DPO trains directly on preference pairs against a frozen reference, with no separate reward model or RL loop",
        "DPO uses no preference data",
        "DPO removes the reference model",
      ],
      correctIndex: 1,
      explanation:
        "That simplification is why DPO is popular. It still needs good preference data and a frozen reference.",
    },
    {
      id: "g8",
      prompt: "A distilled student scores 97% against the teacher's labels. What is the honest conclusion?",
      options: [
        "It is 97% correct",
        "It agrees with the teacher 97% of the time; correctness must be measured against human labels",
        "It beats the teacher",
        "The teacher is perfect",
      ],
      correctIndex: 1,
      explanation:
        "Matching the teacher is not correctness. Teacher errors that the student copies count as wins.",
    },
    {
      id: "g9",
      prompt: "Training loss keeps falling while validation loss rises after epoch 3. What should you deploy?",
      options: [
        "The last checkpoint",
        "The checkpoint with the best validation result, found with early stopping",
        "The first checkpoint always",
        "A random checkpoint",
      ],
      correctIndex: 1,
      explanation:
        "That pattern is overfitting. Pick the best validation checkpoint.",
    },
    {
      id: "g10",
      prompt: "The provider deprecates the base model behind your fine-tune. What is the realistic plan?",
      options: [
        "The tune transfers automatically",
        "Re-train on the successor, re-run the eval and regression suites, and re-release, using versioned data and configs",
        "Ignore it",
        "Merge the adapter into a random model",
      ],
      correctIndex: 1,
      explanation:
        "A tune is bound to its base. Keep datasets, configs and eval harnesses ready to repeat it.",
    },
  ],
};

export const fineTuning: Track = {
  slug: "fine-tuning",
  order: 7,
  title: "Fine-tuning & Model Adaptation",
  tagline: "When prompting isn't enough",
  description:
    "Decide whether to fine-tune, build training data that does not leak, use LoRA and QLoRA, understand RLHF and DPO, distil a small model, and evaluate and deploy tuned models safely. Every lesson ends with interview questions.",
  level: "advanced",
  icon: "Sliders",
  accentVar: "--cyan",
  interviewTopics: [
    "Fine-tune vs RAG vs prompting",
    "Dataset quality and leakage",
    "LoRA mechanics and QLoRA",
    "RLHF vs DPO",
    "Distillation and honest evaluation",
    "Overfitting and forgetting",
    "Serving and re-tuning on base-model change",
    "Cost break-even analysis",
  ],
  lessons: [whenToFineTune, trainingData, loraQlora, preferenceOptimization, distillation, evaluatingDeploying],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "When to fine-tune",
      items: [
        { term: "Ladder", detail: "Prompting, then retrieval, then tools and workflows, then fine-tuning; pre-training is almost never your job." },
        { term: "Good at", detail: "Consistent style and format, narrow high-volume tasks, shorter prompts, skills learned from demonstrations." },
        { term: "Poor at", detail: "Adding changing or citable facts (use RAG) and exact computation (use tools)." },
        { term: "Total cost", detail: "Data, training, evaluation, serving, maintenance and re-tuning when the base model changes." },
        { term: "Break-even", detail: "One-off cost divided by monthly savings minus extra serving cost. Prompt caching weakens the shorter-prompt argument." },
      ],
    },
    {
      heading: "Training data",
      items: [
        { term: "Format", detail: "Chat JSONL: messages with system, user and a final assistant reply. Loss on assistant tokens." },
        { term: "Quality over volume", detail: "Hundreds to thousands of checked, consistent examples beat noisy tens of thousands." },
        { term: "Leakage", detail: "Split by group so related rows stay on one side. Deduplicate against the eval set." },
        { term: "Privacy", detail: "Remove or pseudonymise personal data; models can memorise training text." },
        { term: "Match production", detail: "Same system prompt and input style; include refusals and edge cases; 1 to 3 epochs." },
      ],
    },
    {
      heading: "LoRA & QLoRA",
      items: [
        { term: "LoRA", detail: "Freeze W; learn B (d_out x r) and A (r x d_in). Output = xW + (alpha / r) x BA. B starts at 0." },
        { term: "Size", detail: "Adapter parameters = r x (d_in + d_out) per matrix, often under 1% of the layer." },
        { term: "Knobs", detail: "Rank r, alpha, target modules (attention, then MLP), dropout, learning rate." },
        { term: "QLoRA", detail: "Frozen base quantised to 4-bit (NF4) with higher-precision adapters; tunes big models on one GPU at some speed cost." },
        { term: "Serving", detail: "Merge for zero latency (keep alpha / r) or swap adapters over one shared base." },
      ],
    },
    {
      heading: "Preference tuning",
      items: [
        { term: "SFT vs preference", detail: "SFT imitates a reply; preference tuning learns which of two replies is better." },
        { term: "RLHF", detail: "SFT, collect preferences, train a reward model, optimise the policy with RL and a KL penalty to the reference." },
        { term: "DPO", detail: "loss = -log sigmoid(beta x (r_chosen - r_rejected)), r = log pi - log pi_ref. No reward model or RL loop." },
        { term: "Reference", detail: "Must be a frozen copy of the starting model. At the start the loss is ln 2, about 0.69." },
        { term: "Risks", detail: "Reward hacking, over-optimisation, sycophancy and noisy or biased labels." },
      ],
    },
    {
      heading: "Distillation",
      items: [
        { term: "Idea", detail: "Train a small student to imitate a large teacher on one narrow task, cutting cost and latency." },
        { term: "Hard vs soft labels", detail: "Hard: teacher's final outputs. Soft: teacher's probability distribution, which needs logit access." },
        { term: "Data", detail: "Representative inputs, teacher labels filtered by confidence, deduplicated and class-capped." },
        { term: "Evaluate honestly", detail: "On human-labelled data against the teacher and a prompted baseline; never score against teacher labels." },
        { term: "Cautions", detail: "Student inherits teacher errors; check provider terms; refresh when inputs drift." },
      ],
    },
    {
      heading: "Evaluate & deploy",
      items: [
        { term: "Overfitting", detail: "Training loss falls while validation rises. Early stopping with patience and the best validation checkpoint." },
        { term: "Forgetting", detail: "Narrow tuning erodes old abilities. Test general, safety and regression suites on every candidate." },
        { term: "Ship", detail: "Compare with base and prompted baselines on held-out human labels, then shadow, canary, rollback." },
        { term: "Self-host cost", detail: "GPU price per hour divided by tokens served per hour. Low utilisation raises cost per token." },
        { term: "Maintenance", detail: "Version data, base model, config and checkpoint. A deprecated base means re-tune and re-evaluate." },
      ],
    },
  ],
};
