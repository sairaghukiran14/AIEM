import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "online-evaluation",
  order: 6,
  title: "Online Evaluation & Feedback Loops",
  summary:
    "Offline evals say a version looks good. Online evaluation says whether it works for real users, and feeds what it learns back into your dataset.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Your golden set can never cover everything real users will do. **Online evaluation** measures quality on live traffic: with experiments, shadow runs, sampled scoring and user feedback. Its most valuable output is not a number but **new test cases**, which flow back into your offline set and close the loop.",
    },
    {
      type: "stepper",
      title: "The improvement flywheel",
      steps: [
        { label: "Ship behind a control", detail: "Release a new version to a small share of traffic, or run it in shadow, so a problem affects few people (Track 8).", items: ["5% canary", "95% current"], mark: [0] },
        { label: "Collect signals", detail: "Gather explicit feedback (thumbs, ratings) and implicit signals (the user regenerates, edits the answer, copies it, escalates to a human, abandons).", items: ["thumbs down", "regenerate", "escalated"], mark: [0, 1, 2] },
        { label: "Sample and score", detail: "Score a sample of live traffic with calibrated judges and code checks (lessons 2 and 3), and review the worst cases by hand.", items: ["judge 2% of traffic", "read all escalations"], mark: [0, 1] },
        { label: "Mine the failures", detail: "Cluster the bad cases to find patterns: a topic the retriever misses, a rule the prompt lacks, a tool that errors.", items: ["cluster: refund edge cases"], mark: [0] },
        { label: "Add to the offline set", detail: "Turn each real failure into a labelled test case (after removing personal data), so it is checked on every future change.", items: ["+12 cases, anonymised"], mark: [0] },
        { label: "Fix, gate, repeat", detail: "Change something, pass the offline gate (lesson 4), release again behind a control, and watch.", items: ["fix -> CI gate -> canary"], mark: [0] },
      ],
      caption: "Offline and online evals feed each other. Neither is enough alone.",
    },
    {
      type: "sorter",
      title: "Offline eval or online signal?",
      prompt: "Which one is the right place to learn each thing?",
      categories: ["Offline eval", "Online signal"],
      items: [
        { text: "Does prompt v2 beat v1 on the same 200 fixed cases?", answer: 0, why: "A like-for-like comparison needs a fixed, repeatable dataset." },
        { text: "Are users regenerating answers more after the release?", answer: 1, why: "Real behaviour on real traffic that no dataset predicted." },
        { text: "Which new kinds of questions did users ask this month?", answer: 1, why: "The distribution of real traffic shifts over time." },
        { text: "Does a change break any previously fixed bug?", answer: 0, why: "A regression suite replays known cases." },
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Feedback is a biased sample",
      text: "Few users click thumbs, and those who do are often the angriest or the happiest. Treat explicit feedback as a lead to investigate, not an unbiased satisfaction score, and pair it with implicit signals and random sampling.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Ways to test a change on live traffic" },
    {
      type: "table",
      headers: ["Method", "How", "Good for", "Watch out for"],
      rows: [
        ["**Shadow**", "run the new version on real requests but do not show its output", "safe comparison and cost and latency checks", "no user reaction data; double cost"],
        ["**Canary**", "send a small share of users to the new version and watch", "catching crashes and big regressions early", "small samples are noisy"],
        ["**A/B test**", "randomly split users between versions and compare a metric", "measuring real impact", "needs enough traffic and time to be conclusive"],
        ["**Interleaving**", "mix results from two rankers in one list and see which users prefer", "ranking and retrieval changes", "specific to ranked outputs"],
      ],
    },
    { type: "h", text: "Running an experiment properly" },
    {
      type: "ul",
      items: [
        "**Randomise by user (or session), not by request**, so each person sees one consistent version, and hash a stable id to assign (never `random()` per request).",
        "**Decide the metric and the sample size before you start**, not after peeking at results.",
        "**Add guardrail metrics** (error rate, latency, cost, safety flags) that must not get worse even if the main metric improves.",
        "**Run long enough** to cover weekly patterns, and beware novelty effects in the first days.",
        "**Mind multiple comparisons**: look at twenty segments and one will look significant by chance.",
        "**Avoid contamination**: a user who sees both versions, or a cache shared between arms, blurs the result.",
      ],
    },
    {
      type: "calculator",
      title: "How many users does an A/B test need?",
      inputs: [
        { key: "base", label: "Current success rate", min: 5, max: 95, step: 1, value: 60, unit: "%" },
        { key: "lift", label: "Smallest improvement worth detecting", min: 1, max: 20, step: 1, value: 3, unit: "pts" },
      ],
      outputs: [
        { label: "Users needed per arm (rule of thumb)", formula: "Math.ceil(16 * (base / 100) * (1 - base / 100) / Math.pow(lift / 100, 2))", format: "int" },
        { label: "Total users, two arms", formula: "2 * Math.ceil(16 * (base / 100) * (1 - base / 100) / Math.pow(lift / 100, 2))", format: "int" },
      ],
      note: "Rule of thumb for about 80% power at the usual 5% significance. Halving the detectable lift quadruples the users you need.",
    },
    { type: "h", text: "Sampling live traffic consistently" },
    {
      type: "p",
      text: "To review a fraction of requests, decide by a **hash of a stable id** (the trace id) rather than a random draw: the same request is always in or out of the sample, the rate is easy to change, and you can reproduce which items were selected. Always include **every error, every escalation and every low-scoring trace** in addition to the random sample.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Privacy and consent",
      text: "Turning real conversations into test cases means handling personal data. Anonymise before storing, follow your retention and consent obligations, and restrict who can read the review queue.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That offline and online evaluation form a loop, that experiments randomise by user with a pre-set metric, sample size and guardrails, that explicit feedback is biased so implicit signals and random review matter, and that real failures are anonymised into the offline set.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Stable assignment and consistent sampling by hashing an id.",
    code: `import hashlib

def bucket(key: str, salt: str = "") -> int:
    """Map an id to a stable number from 0 to 99."""
    digest = hashlib.sha256((salt + key).encode()).hexdigest()
    return int(digest[:8], 16) % 100


def variant_for(user_id: str, experiment: str, treatment_pct: int = 50) -> str:
    # Same user always gets the same variant; different experiments get independent splits.
    return "B" if bucket(user_id, salt=experiment) < treatment_pct else "A"


def should_review(trace_id: str, rate: float, flagged: bool) -> bool:
    if flagged:                                    # errors, escalations, low scores: always review
        return True
    return bucket(trace_id, salt="review") < round(rate * 100)   # reproducible random sample


# A/B sizing rule of thumb (80% power, 5% significance):
def users_per_arm(base_rate: float, min_lift: float) -> int:
    return int(16 * base_rate * (1 - base_rate) / (min_lift ** 2)) + 1`,
  },

  interview: [
    {
      question: "How do offline and online evaluation complement each other?",
      answer:
        "Offline evals compare versions on a fixed dataset before release, which is repeatable and gates changes. Online evaluation measures real behaviour after release through experiments, sampled scoring and user feedback, and reveals what the dataset missed. The failures found online are anonymised into the offline set, so the two form a loop that improves both the system and the test suite.",
      weakAnswer:
        "Offline is for development and online is for production. — True but shallow; it omits the loop.",
    },
    {
      question: "How would you A/B test a prompt change?",
      answer:
        "Assign users, not requests, by hashing a stable user id with the experiment name so each person sees one consistent version. Fix the primary metric, a guardrail set for cost, latency, errors and safety, and the sample size in advance, run long enough to cover weekly cycles, and analyse once without peeking. I would first pass the offline gate and run a small canary.",
      followUp: "How do you size the test?",
    },
    {
      question: "What is wrong with random assignment per request?",
      answer:
        "One user would see both variants, giving an inconsistent experience and contaminating the measurement, since their behaviour is influenced by both. Per-user assignment by a stable hash keeps the experience consistent and the groups independent.",
    },
    {
      question: "How do you use user feedback signals well?",
      answer:
        "As leads, not as a satisfaction score. Explicit thumbs are sparse and biased toward extremes, so I combine them with implicit signals such as regenerations, edits, copy actions and escalations, plus randomly sampled and judged traffic. I review the worst cases by hand, cluster them, and turn them into anonymised test cases.",
    },
    {
      question: "What are shadow and canary deployments for?",
      answer:
        "Shadow runs the new version on live requests without showing its output, letting me compare quality, cost and latency safely. A canary sends a small share of real users to the new version to catch crashes and large regressions early with limited blast radius. Neither replaces a properly sized A/B test for measuring impact.",
    },
  ],

  challenges: [
    {
      id: "ev-6-quiz",
      kind: "quiz",
      title: "Checkpoint: online evaluation",
      blurb: "Five questions on experiments and feedback.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is the most valuable thing online evaluation feeds back into your process?",
          options: [
            "A higher traffic count",
            "New real-world failure cases for the offline eval set",
            "Lower latency",
            "A larger model",
          ],
          correctIndex: 1,
          explanation:
            "Production reveals cases no dataset predicted. Turning them into tests closes the loop.",
        },
        {
          id: "q2",
          prompt: "How should users be assigned to A/B variants?",
          options: [
            "Randomly on every request",
            "By a stable hash of the user id, so each user sees one version",
            "Alphabetically",
            "Whoever logs in first gets B",
          ],
          correctIndex: 1,
          explanation:
            "Per-user assignment keeps experiences consistent and prevents contamination.",
        },
        {
          id: "q3",
          prompt: "Why are thumbs up and thumbs down a biased signal?",
          options: [
            "They are always wrong",
            "Few users give them, and those who do skew toward the very happy or very unhappy",
            "They cannot be stored",
            "They are not tied to requests",
          ],
          correctIndex: 1,
          explanation:
            "Self-selected feedback is not a random sample of users. Use it as a lead.",
        },
        {
          id: "q4",
          prompt: "You halve the smallest improvement you want to detect in an A/B test. What happens to the users you need?",
          options: [
            "It halves",
            "It roughly quadruples",
            "It stays the same",
            "It doubles",
          ],
          correctIndex: 1,
          explanation:
            "Sample size scales with one over the square of the effect size.",
        },
        {
          id: "q5",
          prompt: "What does a shadow deployment give you?",
          options: [
            "User reactions to the new version",
            "A safe comparison on real requests without showing the new outputs to users",
            "Free compute",
            "Automatic rollbacks",
          ],
          correctIndex: 1,
          explanation:
            "Shadow runs the candidate on live inputs invisibly, so you can compare quality, cost and latency with no user risk.",
        },
      ],
    },
    {
      id: "ev-6-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: assigning experiment variants",
      blurb: "The A/B results are noisy and users complain the assistant 'keeps changing its style'. Find the line.",
      language: "python",
      lines: [
        "def variant_for(request):",
        "    return random.choice(['A', 'B'])",
      ],
      buggyLine: 2,
      reasons: [
        "random.choice cannot pick from a list",
        "assignment is random per request, so one user sees both variants; it must be a stable hash of the user id",
        "the variants should be numbers",
        "the function should return both variants",
      ],
      correctReasonIndex: 1,
      explanation:
        "Per-request randomness gives each user an inconsistent experience and mixes both variants into their behaviour, contaminating the comparison. Hash a stable user id with the experiment name.",
      fix: "return 'B' if bucket(request.user_id, salt='exp-42') < 50 else 'A'",
      xp: 40,
    },
    {
      id: "ev-6-code",
      kind: "code",
      title: "Code challenge: consistent sampling by hash",
      blurb: "Decide deterministically whether a request is in the review sample.",
      functionName: "shouldSample",
      starter: `/**
 * Deterministic sampling by id.
 *
 *   hash   = sum of the character codes of \`id\` (id.charCodeAt(i) for each i)
 *   bucket = hash % 100
 *   sampled = bucket < Math.round(rate * 100)
 *
 * So the same id is always in or out for a given rate.
 * rate 0 samples nothing; rate 1 samples everything.
 *
 * shouldSample("0", 0.5)  -> true    ("0" has code 48, 48 < 50)
 * shouldSample("2", 0.5)  -> false   ("2" has code 50, 50 < 50 is false)
 */
function shouldSample(id, rate) {
  // your code here
}`,
      tests: [
        { name: "code 48 is inside a 50% sample", args: ["0", 0.5], expected: true },
        { name: "code 50 is outside a 50% sample", args: ["2", 0.5], expected: false },
        { name: "a rate of 0 samples nothing", args: ["0", 0], expected: false },
        { name: "a rate of 1 samples everything", args: ["z", 1], expected: true },
        { name: "multi-character ids sum their codes", args: ["ab", 0.96], expected: true },
        { name: "the same id is out at a slightly lower rate", args: ["ab", 0.95], expected: false },
        { name: "a longer id: codes sum to 523, bucket 23, inside a 30% sample", args: ["req-123", 0.3], expected: true },
      ],
      hints: [
        "Add up id.charCodeAt(i) for every character to get the hash.",
        "bucket = hash % 100, and the threshold is Math.round(rate * 100).",
        "Return bucket < threshold. A rate of 0 gives threshold 0, so nothing is ever below it.",
      ],
      solution: `function shouldSample(id, rate) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i);
  return hash % 100 < Math.round(rate * 100);
}`,
      xp: 70,
    },
  ],
};
