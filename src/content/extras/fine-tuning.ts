import type { LessonExtras } from "./types";

export const fineTuningExtras: LessonExtras = {
  "when-to-fine-tune": {
    concept: [
      {
        type: "predict",
        title: "Predict: the model does not know our new product",
        prompt: "Your assistant gives wrong answers about products launched last week. Which approach fits best?",
        options: [
          "Fine-tune the model on the new product pages",
          "Retrieve the current product documentation at question time (RAG)",
          "Raise the temperature",
          "Wait for the next model release",
        ],
        answer: 1,
        why: "Fine-tuning is good for behaviour and style, and is a slow, costly way to add facts that change. Retrieval keeps knowledge fresh and citable.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "When does fine-tuning pay for itself?",
        problem: "A prompt carries 800 tokens of instructions and examples, over 1,000,000 calls a month at $3 per million input tokens. A fine-tuned model needs only 100 tokens of prompt but costs 1.5x per token ($4.50 per million). Training costs $1,500 once. How long to pay back?",
        steps: [
          { do: "Current monthly input cost.", result: "800 x 1,000,000 x $3 / 1,000,000 = $2,400" },
          { do: "Fine-tuned monthly input cost.", result: "100 x 1,000,000 x $4.50 / 1,000,000 = $450" },
          { do: "Monthly saving.", result: "$2,400 - $450 = $1,950" },
          { do: "Payback time for the $1,500 training cost.", result: "1,500 / 1,950 = 0.77 months, about 23 days" },
        ],
        takeaway:
          "High volume plus a long, stable prompt is where fine-tuning wins on cost. Re-run this if volume is low or the task changes often, and remember it needs re-training whenever the behaviour changes.",
      },
    ],
  },

  "fine-tuning-data": {
    concept: [
      {
        type: "predict",
        title: "Predict: quality or quantity?",
        prompt: "You have 500 carefully reviewed, consistent examples or 5,000 scraped ones with mixed formats and mistakes. Which usually trains the better model for a narrow task?",
        options: [
          "The 5,000 scraped examples, since more is better",
          "The 500 clean examples, because the model copies whatever pattern, good or bad, appears in the data",
          "They are equivalent",
          "Neither can work",
        ],
        answer: 1,
        why: "Fine-tuning teaches by imitation, so inconsistency and errors are learned too. A small clean set often beats a large noisy one.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Splitting data without leaking it",
        problem: "You have 1,000 examples, of which 200 are near duplicates of others. You want an 80/10/10 split into train, validation and test. How should you proceed?",
        steps: [
          { do: "Remove the near duplicates first.", result: "1,000 - 200 = 800 distinct examples" },
          { do: "Why first? If copies land in different splits, the model sees test answers during training.", result: "The scores would look better than real performance." },
          { do: "Split the 800 by 80/10/10.", result: "640 train, 80 validation, 80 test" },
          { do: "Lock the test set and use it once, at the end.", result: "Tuning on it would make it a second validation set." },
        ],
        takeaway:
          "Deduplicate before splitting and keep the test set untouched. An honest score is worth more than a flattering one.",
      },
    ],
  },

  "lora-and-qlora": {
    concept: [
      {
        type: "predict",
        title: "Predict: why is LoRA cheap?",
        prompt: "What does LoRA train instead of updating every weight in the model?",
        options: [
          "A copy of the whole model at lower precision only",
          "Small low-rank adapter matrices added alongside the frozen original weights",
          "Only the final output layer",
          "The tokenizer",
        ],
        answer: 1,
        why: "The base weights stay frozen, and two thin matrices per layer learn the change. They are tiny compared with the full matrix, so memory and storage drop sharply.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Counting LoRA's parameters",
        problem: "One weight matrix in a transformer is 4,096 x 4,096. Compare training it fully with a LoRA adapter of rank 8.",
        steps: [
          { do: "Parameters in the full matrix.", result: "4,096 x 4,096 = 16,777,216" },
          { do: "LoRA adds A (4,096 x 8) and B (8 x 4,096).", result: "32,768 + 32,768 = 65,536 trainable parameters" },
          { do: "Fraction of the full matrix.", result: "65,536 / 16,777,216 = 0.39%" },
          { do: "Repeat across every adapted matrix.", result: "The adapter is a small file that can be swapped per task over one shared base model." },
        ],
        takeaway:
          "Under half a percent of the parameters, so training fits on far smaller hardware. QLoRA goes further by holding the frozen base in 4-bit precision.",
      },
    ],
  },

  "preference-optimization": {
    concept: [
      {
        type: "predict",
        title: "Predict: what data does preference tuning need?",
        prompt: "Which training data does a method like DPO learn from?",
        options: [
          "Single correct answers only",
          "Prompts, each with a preferred answer and a less preferred one",
          "Unlabelled raw text",
          "Test scores",
        ],
        answer: 1,
        why: "Preference methods learn from comparisons: for the same prompt, which of two responses people preferred. That teaches judgement rather than copying one answer.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Cleaning preference labels",
        problem: "You had three labelers compare 2,000 answer pairs. They agreed on the winner for 1,500 pairs. How many pairs should you train on, and why?",
        steps: [
          { do: "Count the pairs with agreement.", result: "1,500 of 2,000 = 75% agreement" },
          { do: "Look at the other 500.", result: "Labelers disagreed, which suggests the pair is ambiguous or the guidelines are unclear." },
          { do: "Train on the clear pairs and review the rest.", result: "1,500 training pairs" },
          { do: "Use the disagreements to improve the guidelines.", result: "Better instructions raise agreement, and agreement limits how good the signal can be." },
        ],
        takeaway:
          "Noisy preferences teach noisy behaviour. Measure labeler agreement before trusting the data.",
      },
    ],
  },

  "distillation-and-small-models": {
    concept: [
      {
        type: "predict",
        title: "Predict: how distillation works",
        prompt: "In distillation, how do you get a small model to do one task nearly as well as a large one?",
        options: [
          "Copy the large model's weights into the small one",
          "Run the large model on many inputs and train the small model on its outputs",
          "Shrink the prompt",
          "Use a lower temperature",
        ],
        answer: 1,
        why: "The large model acts as a teacher, producing the labels. The small student learns that narrow behaviour, and you must check it on real data because it can fail where the teacher would not.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "What distillation saves",
        problem: "A task produces 500 output tokens and runs 2,000,000 times a month. The large model charges $15 per million output tokens, the distilled small model $1. Creating the training set needs 50,000 teacher answers of 500 tokens. What is the saving?",
        steps: [
          { do: "Monthly output tokens.", result: "500 x 2,000,000 = 1,000,000,000 (1 billion)" },
          { do: "Cost on each model.", result: "Large: 1,000 x $15 = $15,000. Small: 1,000 x $1 = $1,000." },
          { do: "One-off cost of the training data.", result: "50,000 x 500 = 25,000,000 tokens, so 25 x $15 = $375" },
          { do: "Net monthly saving.", result: "$15,000 - $1,000 = $14,000, with the data cost recovered in under a day" },
        ],
        takeaway:
          "For a stable, high-volume, narrow task the saving is dramatic. Add the time to evaluate the student and the cost of retraining when the task shifts.",
      },
    ],
  },

  "evaluating-and-deploying-fine-tunes": {
    concept: [
      {
        type: "predict",
        title: "Predict: reading the loss curves",
        prompt: "Training loss keeps falling but validation loss starts rising after epoch 3. What is happening?",
        options: [
          "The model is still improving",
          "Overfitting: it is memorising the training set and getting worse on unseen data",
          "The learning rate is too low",
          "The validation set is broken by definition",
        ],
        answer: 1,
        why: "A widening gap between training and validation loss is the classic sign of overfitting. Stop earlier or add data or regularisation.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Picking the checkpoint to ship",
        problem: "Training loss by epoch: 1.20, 0.80, 0.50, 0.30, 0.15. Validation loss by epoch: 1.25, 0.90, 0.70, 0.80, 0.95. Which epoch do you keep, and what else must you check?",
        steps: [
          { do: "Find the lowest validation loss.", result: "0.70, at epoch 3" },
          { do: "Look at epochs 4 and 5.", result: "Training loss keeps falling while validation rises: overfitting." },
          { do: "Choose the checkpoint.", result: "Keep epoch 3, which is early stopping." },
          { do: "Before deploying, test general ability too.", result: "Run a held-out set of unrelated tasks to catch forgetting, and roll out behind a flag with a rollback." },
        ],
        takeaway:
          "The best model is the one that does best on unseen data, not the one with the lowest training loss. Verify it has not lost general skills, and keep the old model ready.",
      },
    ],
  },
};
