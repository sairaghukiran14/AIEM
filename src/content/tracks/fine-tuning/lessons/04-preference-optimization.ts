import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "preference-optimization",
  order: 4,
  title: "Preference Optimization: RLHF & DPO",
  summary:
    "Supervised tuning copies good answers. Preference tuning teaches a model which of two answers people prefer. Learn the pipelines and the loss that drives them.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "**Supervised fine-tuning (SFT)** shows the model an ideal reply and trains it to imitate. But often you cannot write the ideal reply, only recognise a **better** one: more helpful, safer, more concise. **Preference optimization** trains on comparisons instead: for the same prompt, which of two replies is preferred.",
    },
    {
      type: "sorter",
      title: "SFT or preference tuning?",
      prompt: "Which technique fits each goal best?",
      categories: ["SFT (imitate)", "Preference tuning (choose)"],
      items: [
        { text: "Teach a new JSON output schema from correct demonstrations", answer: 0, why: "A clear target to copy. Imitation is the right tool." },
        { text: "Prefer concise answers over rambling ones when both are correct", answer: 1, why: "Hard to write 'the ideal length', easy to judge which of two is better." },
        { text: "Make the model decline a category of unsafe requests more reliably", answer: 1, why: "Many acceptable replies exist, so ranking replies is more natural than scripting one." },
        { text: "Learn a company's tool-calling convention from logged examples", answer: 0, why: "Demonstrations define the behaviour exactly." },
      ],
    },
    {
      type: "stepper",
      title: "The classic RLHF pipeline",
      steps: [
        { label: "1. Supervised fine-tuning", detail: "Start from a pretrained model and SFT it on good demonstrations, giving a reasonable instruction-following model that becomes the reference policy.", items: ["pretrained -> SFT model"], mark: [0] },
        { label: "2. Collect preferences", detail: "For many prompts, sample two or more replies and have humans (or a carefully checked model) say which is better. The result is a set of (prompt, chosen, rejected) triples.", items: ["prompt", "chosen reply", "rejected reply"], mark: [1, 2] },
        { label: "3. Train a reward model", detail: "Train a model to give a higher score to the chosen reply than to the rejected one, using a pairwise (Bradley-Terry) loss. It becomes a learned stand-in for human judgement.", items: ["reward(chosen) > reward(rejected)"], mark: [0] },
        { label: "4. Optimise with reinforcement learning", detail: "Sample replies from the policy, score them with the reward model, and update the policy to increase reward (typically with PPO), with a KL penalty that keeps it close to the reference so it does not drift into nonsense.", items: ["reward up", "KL penalty to reference"], mark: [0, 1] },
        { label: "5. Evaluate and red-team", detail: "Check helpfulness and safety on held-out prompts, and look for reward hacking: replies that please the reward model without being genuinely better.", items: ["held-out evals", "red team"], mark: [0, 1] },
      ],
      caption: "Powerful, but it needs a reward model, an RL loop and careful tuning to stay stable.",
    },
    {
      type: "callout",
      tone: "key",
      title: "DPO skips the reward model and the RL loop",
      text: "Direct Preference Optimization trains the policy straight on the preference pairs with a simple classification-style loss that compares it with a frozen reference model. It is far easier to run than RLHF and is widely used, though it has its own limits.",
    },
  ],

  underTheHood: [
    { type: "h", text: "The DPO loss" },
    {
      type: "p",
      text: "For a prompt with a **chosen** reply `y_w` and a **rejected** reply `y_l`, DPO measures how much the policy has moved relative to the frozen reference on each reply, as a **log-ratio**: `log pi(y|x) − log pi_ref(y|x)`. It wants the chosen reply's ratio to rise and the rejected one's to fall.",
    },
    {
      type: "code",
      language: "text",
      code: `r_w = log pi(y_w | x) - log pi_ref(y_w | x)     # how much more likely the policy made the chosen reply
r_l = log pi(y_l | x) - log pi_ref(y_l | x)     # how much more likely it made the rejected reply

loss = - log sigmoid( beta * (r_w - r_l) )

beta small: policy may drift far from the reference     beta large: stays close to the reference`,
      caption: "At the start policy equals reference, so r_w = r_l = 0 and the loss is log 2, about 0.693.",
    },
    {
      type: "calculator",
      title: "The DPO loss on one pair",
      inputs: [
        { key: "rw", label: "Log-ratio of the chosen reply", min: -10, max: 10, step: 0.5, value: 1 },
        { key: "rl", label: "Log-ratio of the rejected reply", min: -10, max: 10, step: 0.5, value: -0.5 },
        { key: "beta", label: "beta", min: 0.05, max: 1, step: 0.05, value: 0.1 },
      ],
      outputs: [
        { label: "Preference margin (beta x (r_w - r_l))", formula: "beta * (rw - rl)", format: "fixed2" },
        { label: "Implied probability the chosen is preferred", formula: "1 / (1 + Math.exp(-beta * (rw - rl)))", format: "pct" },
        { label: "Loss", formula: "Math.log(1 + Math.exp(-beta * (rw - rl)))", format: "fixed2" },
      ],
      note: "Set both log-ratios to 0: the loss is 0.69 and the probability is 50%. Push the chosen up and the rejected down and the loss falls toward 0.",
    },
    { type: "h", text: "Where things go wrong" },
    {
      type: "ul",
      items: [
        "**Reward hacking** (RLHF): the policy finds quirks the reward model likes, such as length or flattering tone, that humans do not actually value. The KL penalty and fresh preference data mitigate it.",
        "**Over-optimisation**: pushing too far from the reference can reduce quality even as the proxy score rises.",
        "**Sycophancy**: if preference data rewards agreeable answers, the model learns to agree with users even when they are wrong.",
        "**Noisy or biased preferences**: annotators disagree, and their biases (favouring long, confident answers) become the model's.",
        "**Reference handling in DPO**: the reference must be a **frozen copy** of the starting model. If it changes during training, the log-ratios lose their meaning.",
      ],
    },
    { type: "h", text: "The wider family" },
    {
      type: "p",
      text: "Variants keep appearing: preferences from AI feedback instead of humans (RLAIF), other direct objectives similar to DPO, and **reinforcement learning with verifiable rewards**, where the reward comes from a checker such as unit tests or an exact answer, as used for reasoning models. The common thread is replacing \"copy this reply\" with \"move toward replies that score better\".",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That SFT imitates while preference tuning ranks, that RLHF is SFT then a reward model then RL with a KL penalty, that DPO optimises pairs directly against a frozen reference with a sigmoid loss and a beta that controls drift, and that reward hacking, sycophancy and noisy labels are the main risks.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "The DPO loss for one preference pair, computed from sequence log-probabilities.",
    code: `import math

def sequence_logprob(model, prompt: str, reply: str) -> float:
    """Sum of token log-probabilities of 'reply' given 'prompt' under 'model'."""
    ...

def dpo_loss(policy, reference, prompt: str, chosen: str, rejected: str, beta: float = 0.1) -> float:
    r_w = sequence_logprob(policy, prompt, chosen)   - sequence_logprob(reference, prompt, chosen)
    r_l = sequence_logprob(policy, prompt, rejected) - sequence_logprob(reference, prompt, rejected)
    margin = beta * (r_w - r_l)
    return math.log1p(math.exp(-margin))             # = -log(sigmoid(margin)), stable for large margins


# Setup: the reference must be a FROZEN COPY, not the model being trained.
import copy
policy = load_model("sft-checkpoint")
reference = copy.deepcopy(policy)
for p in reference.parameters():
    p.requires_grad_(False)                          # never updated`,
  },

  interview: [
    {
      question: "What is the difference between SFT and preference optimization?",
      answer:
        "SFT trains the model to imitate a given ideal reply. Preference optimization trains on comparisons: for a prompt, which of two replies is better, shifting probability toward the chosen one and away from the rejected one. It suits qualities that are hard to demonstrate but easy to judge, such as helpfulness, tone and safety behaviour.",
      weakAnswer:
        "Preference tuning is just a better version of fine-tuning. — It is a different objective with different data.",
    },
    {
      question: "Walk me through RLHF.",
      answer:
        "Start with an SFT model. Collect human comparisons between replies, train a reward model so the chosen reply scores higher than the rejected one, then optimise the policy against that reward with reinforcement learning, usually PPO, with a KL penalty to the reference so it stays close and does not exploit the reward model. Finally evaluate and red-team, watching for reward hacking.",
      followUp: "What does the KL penalty prevent?",
    },
    {
      question: "How does DPO differ from RLHF, and why is it popular?",
      answer:
        "DPO skips the separate reward model and the reinforcement learning loop. It trains the policy directly on preference pairs with a loss that increases the chosen reply's log-ratio against a frozen reference relative to the rejected one, scaled by beta. It is simpler, more stable and cheaper to run, though it depends heavily on preference data quality and can still over-optimise.",
    },
    {
      question: "What does beta control in DPO?",
      answer:
        "How strongly the policy is tied to the reference. A small beta lets the policy move far from the reference to satisfy the preferences, which risks over-optimisation and quality loss; a large beta keeps it close, learning more conservatively. I tune it with a held-out evaluation.",
    },
    {
      question: "What is reward hacking?",
      answer:
        "When the policy learns to score highly on the reward model in ways humans do not truly value, such as longer or more flattering replies, because the reward model is only an imperfect proxy. I mitigate it with a KL penalty, refreshing preference data with the current policy's outputs, evaluating on independent human judgements, and monitoring for length and style drift.",
    },
  ],

  challenges: [
    {
      id: "ft-4-quiz",
      kind: "quiz",
      title: "Checkpoint: preference optimization",
      blurb: "Five questions on RLHF and DPO.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What data does DPO train on?",
          options: [
            "Single ideal replies only",
            "Preference pairs: a prompt with a chosen and a rejected reply",
            "Unlabelled documents",
            "Reward scores only",
          ],
          correctIndex: 1,
          explanation:
            "DPO optimises directly on which of two replies is preferred.",
        },
        {
          id: "q2",
          prompt: "What is the role of the KL penalty in RLHF?",
          options: [
            "To speed up training",
            "To keep the policy close to the reference so it does not exploit the reward model",
            "To increase the reward",
            "To remove the reward model",
          ],
          correctIndex: 1,
          explanation:
            "Without it the policy can drift into replies that score well but are poor.",
        },
        {
          id: "q3",
          prompt: "At the very start of DPO training, policy equals reference. What is the loss for any pair?",
          options: ["0", "About 0.69 (log 2)", "1", "Infinity"],
          correctIndex: 1,
          explanation:
            "Both log-ratios are 0, so the margin is 0, sigmoid(0) = 0.5, and the loss is -log 0.5 = 0.69.",
        },
        {
          id: "q4",
          prompt: "Why must the DPO reference model be a frozen copy?",
          options: [
            "To save memory",
            "If it changes with the policy, the log-ratios lose their meaning and the signal vanishes",
            "Because frozen models are faster",
            "So that beta can be larger",
          ],
          correctIndex: 1,
          explanation:
            "The log-ratio measures movement away from a fixed starting point. An aliased reference moves with the policy.",
        },
        {
          id: "q5",
          prompt: "Which is a typical sign of reward hacking?",
          options: [
            "Replies get shorter and better",
            "Reward-model scores rise while genuine human ratings stay flat or fall, for example through longer, flattering replies",
            "Training loss reaches 0 immediately",
            "The KL penalty rises",
          ],
          correctIndex: 1,
          explanation:
            "The proxy improves without the true goal improving.",
        },
      ],
    },
    {
      id: "ft-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: setting up DPO",
      blurb: "Training runs but the loss never moves from 0.69. Find the line.",
      language: "python",
      lines: [
        "policy = load('sft-checkpoint')",
        "reference = policy                     # 'same weights at the start'",
        "for batch in pairs:",
        "    loss = dpo_loss(policy, reference, batch)",
        "    loss.backward(); optimizer.step()",
      ],
      buggyLine: 2,
      reasons: [
        "load cannot read a checkpoint",
        "reference is the same object as policy, so it is updated with every step and the log-ratios are always 0; it must be a frozen deep copy",
        "backward must be called before the loss",
        "pairs should be shuffled twice",
      ],
      correctReasonIndex: 1,
      explanation:
        "Assignment makes `reference` another name for the model being trained. Both always have identical probabilities, the log-ratios are zero, the margin is zero and the loss is stuck at log 2. Deep-copy the starting model and freeze it.",
      fix: "reference = copy.deepcopy(policy); freeze(reference)",
      xp: 40,
    },
    {
      id: "ft-4-code",
      kind: "code",
      title: "Code challenge: the DPO loss",
      blurb: "Compute the loss for one preference pair from its two log-ratios.",
      functionName: "dpoLoss",
      starter: `/**
 * Direct Preference Optimization loss for one pair.
 *
 *   margin = beta * (chosenLogRatio - rejectedLogRatio)
 *   loss   = -ln( sigmoid(margin) )   where sigmoid(x) = 1 / (1 + e^-x)
 *
 * Equivalently loss = ln(1 + e^-margin). Round to 4 decimals.
 *
 * dpoLoss(0, 0, 0.1) -> 0.6931    (policy equals reference: loss = ln 2)
 */
function dpoLoss(chosenLogRatio, rejectedLogRatio, beta) {
  // your code here
}`,
      tests: [
        { name: "policy equals reference", args: [0, 0, 0.1], expected: 0.6931 },
        { name: "the chosen reply has risen", args: [1, 0, 1], expected: 0.3133 },
        { name: "the rejected reply has risen: worse loss", args: [0, 1, 1], expected: 1.3133 },
        { name: "a small beta softens the margin", args: [2, -2, 0.1], expected: 0.513 },
        { name: "a huge margin drives the loss to about zero", args: [10, 0, 1], expected: 0 },
        { name: "equal non-zero log-ratios give ln 2 again", args: [3, 3, 0.5], expected: 0.6931 },
      ],
      hints: [
        "First compute margin = beta * (chosenLogRatio - rejectedLogRatio).",
        "The loss is ln(1 + e^-margin), which equals -ln(sigmoid(margin)). Math.log1p(Math.exp(-margin)) is accurate for large margins.",
        "Round with Math.round(x * 10000) / 10000.",
      ],
      solution: `function dpoLoss(chosenLogRatio, rejectedLogRatio, beta) {
  const margin = beta * (chosenLogRatio - rejectedLogRatio);
  const loss = Math.log1p(Math.exp(-margin));
  return Math.round(loss * 10000) / 10000;
}`,
      xp: 70,
    },
  ],
};
