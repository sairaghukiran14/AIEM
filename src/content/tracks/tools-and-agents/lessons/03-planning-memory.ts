import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "planning-and-memory",
  order: 3,
  title: "Planning & Memory",
  summary:
    "Long tasks need a plan the agent can follow and revise, and a memory that does not flood the context. Both are design choices, not model magic.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "A simple loop works for short tasks. As tasks get longer two problems appear: the agent **loses the thread** (what was I doing, what is left?) and the **transcript grows** until it is expensive and the model starts missing details (Track 1: context and lost-in-the-middle). Planning and memory address those two problems.",
    },
    {
      type: "stepper",
      title: "Plan, execute, replan",
      steps: [
        { label: "Write a plan", detail: "Before acting, the model (or a separate planner call) writes a short list of steps with dependencies. This becomes visible state your code can store and check.", items: ["1. find the failing job", "2. read its logs", "3. identify the cause", "4. propose a fix"], mark: [0] },
        { label: "Execute one step", detail: "The agent works on the next step whose dependencies are done, using tools as in lesson 2, and records the result against that step.", items: ["1. find the failing job: done", "2. read its logs: running"], mark: [1] },
        { label: "Observe and replan", detail: "The logs reveal the failure is a missing environment variable, not a code bug. The plan changes: step 3 is now cheap, and a new step appears.", items: ["3. identify the cause: done", "3b. check the config (new)", "4. propose a fix"], mark: [1] },
        { label: "Finish and report", detail: "When all steps are done, the agent summarises against the plan, which also makes the run auditable.", items: ["all steps done", "summary + evidence"], mark: [0] },
      ],
      caption: "A plan is not a promise. Revising it when evidence changes is the point.",
    },
    { type: "h", text: "Two kinds of memory" },
    {
      type: "sorter",
      title: "Working memory or long-term memory?",
      prompt: "Where should each piece of information live?",
      categories: ["Working memory (this task)", "Long-term memory (across sessions)"],
      items: [
        { text: "The list of steps still to do in the current task", answer: 0, why: "It is only useful until the task finishes." },
        { text: "The user's preferred language and time zone", answer: 1, why: "It stays true across conversations, so store it durably." },
        { text: "The raw output of the tool call from two steps ago", answer: 0, why: "Needed now, not forever. Summarise or drop it as the run proceeds." },
        { text: "A decision the user made last week about report formatting", answer: 1, why: "Worth recalling in future sessions, retrieved when relevant." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "Plan-and-execute versus pure ReAct" },
    {
      type: "table",
      headers: ["", "ReAct (decide each step)", "Plan-and-execute"],
      rows: [
        ["Strength", "adapts instantly to what each step reveals", "keeps long tasks on track; steps can be reviewed first"],
        ["Weakness", "can wander or forget the goal on long tasks", "a stale plan can mislead; extra planning call"],
        ["Best for", "short, exploratory tasks", "long, multi-part tasks with known structure"],
        ["Common blend", "plan first, then ReAct inside each step, and replan when results contradict the plan", ""],
      ],
    },
    { type: "h", text: "Keeping the context under control" },
    {
      type: "ul",
      items: [
        "**Truncate tool results** to what the next step needs, with a way to fetch more if required.",
        "**Compact history**: when the transcript passes a threshold, replace older steps with a short summary and keep only the most recent steps verbatim.",
        "**Scratchpad**: a small structured note (goal, plan status, key findings) rewritten each step and placed near the end of the prompt, so the essentials are always in the model's strongest attention (Track 1).",
        "**Sub-agents with fresh contexts** for self-contained sub-tasks, returning a short result (lesson 5).",
      ],
    },
    {
      type: "calculator",
      title: "What does compaction save?",
      inputs: [
        { key: "steps", label: "Steps so far", min: 2, max: 60, step: 1, value: 30 },
        { key: "per", label: "Tokens per step (call + result)", min: 100, max: 3000, step: 50, value: 900, unit: "tokens" },
        { key: "keep", label: "Recent steps kept verbatim", min: 1, max: 20, step: 1, value: 6 },
        { key: "summary", label: "Summary of older steps", min: 100, max: 3000, step: 50, value: 700, unit: "tokens" },
      ],
      outputs: [
        { label: "Context without compaction", formula: "steps * per", format: "int" },
        { label: "Context with compaction", formula: "steps <= keep ? steps * per : summary + keep * per", format: "int" },
        { label: "Saved per remaining model call", formula: "steps <= keep ? 0 : steps * per - (summary + keep * per)", format: "int" },
      ],
      note: "Compaction is lossy: a detail dropped from the summary is gone. Keep exact values the task depends on (ids, numbers, decisions) in the scratchpad, not only in prose.",
    },
    { type: "h", text: "Long-term memory is retrieval plus judgement" },
    {
      type: "p",
      text: "Cross-session memory is usually **RAG over notes the agent or user saved** (Track 4): store small facts with metadata, retrieve the relevant ones per request, and put them in the prompt. The hard parts are deciding **what is worth saving**, keeping it **correct** and **deletable**, and not letting untrusted text become permanent.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Memory is an attack surface",
      text: "If an agent saves \"facts\" extracted from untrusted content, an attacker can plant a false instruction that is recalled in every future conversation. Validate what gets stored, record where it came from, let users see and delete it, and treat recalled memories as context, not commands (Track 2).",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That planning keeps long tasks coherent and auditable but must be revisable, that context is managed with truncation, compaction and a scratchpad, that long-term memory is retrieval with validation and user control, and that memory writes are a security concern.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A plan with dependencies, and compaction when the transcript grows.",
    code: `from dataclasses import dataclass, field

@dataclass
class Step:
    id: str
    goal: str
    deps: list[str] = field(default_factory=list)
    done: bool = False
    result: str = ""


def next_step(plan: list[Step]) -> Step | None:
    """First unfinished step whose dependencies are all finished."""
    finished = {s.id for s in plan if s.done}
    for s in plan:
        if not s.done and all(d in finished for d in s.deps):
            return s
    return None                                   # nothing runnable: all done, or blocked


def compact(messages: list[dict], keep_last: int = 6, threshold: int = 40_000) -> list[dict]:
    if count_tokens(messages) < threshold or len(messages) <= keep_last + 1:
        return messages
    head, old, recent = messages[:1], messages[1:-keep_last], messages[-keep_last:]
    summary = llm(f"Summarise these steps. Keep exact ids, numbers and decisions:\\n{old}")
    return head + [{"role": "user", "content": f"Summary of earlier work:\\n{summary}"}] + recent


def scratchpad(plan: list[Step]) -> str:
    return "\\n".join(f"[{'x' if s.done else ' '}] {s.id}: {s.goal}" for s in plan)   # placed near the end of the prompt`,
  },

  interview: [
    {
      question: "Why do agents need planning on long tasks?",
      answer:
        "Without it the agent can lose the goal, repeat work or wander, because each step only sees a growing transcript. A plan gives it and my code a compact, visible state of what is done and what remains, makes the run auditable, and lets me check dependencies. It must be revisable, since results often invalidate the original plan.",
      weakAnswer:
        "So the model thinks before acting. — Misses the state-tracking and auditability benefits.",
    },
    {
      question: "How do you stop an agent's context from growing without bound?",
      answer:
        "Truncate tool results to what is needed, compact older steps into a summary while keeping the latest steps verbatim, and maintain a small scratchpad with the goal, plan status and exact key facts near the end of the prompt. For self-contained sub-tasks I use a sub-agent with a fresh context that returns a short result. I also use prompt caching for the stable prefix.",
      followUp: "What can go wrong with summarisation?",
    },
    {
      question: "How would you implement long-term memory for an assistant?",
      answer:
        "As retrieval over small saved facts: store them with metadata such as source and date, embed them, and fetch the relevant ones per request into the prompt. The design questions are what to save, how to keep it correct and deletable, and how to prevent poisoning, so I validate writes, keep provenance, let users view and delete entries, and treat recalled text as context, not instructions.",
    },
    {
      question: "How is memory a security risk?",
      answer:
        "If an agent writes facts derived from untrusted content, an attacker can plant a false statement or instruction that is then retrieved in later sessions, possibly for other users if memory is shared. Mitigations: do not auto-save from untrusted inputs, validate and tag provenance, scope memory per user, give users visibility and deletion, and never treat recalled memory as higher authority than the system prompt.",
    },
    {
      question: "When would you choose plan-and-execute over a pure ReAct loop?",
      answer:
        "For long tasks with known structure where staying on track and reviewing the plan matter, such as multi-part reports or migrations. For short, exploratory tasks pure ReAct is simpler and adapts faster. In practice I blend them: plan first, run ReAct within each step, and replan when observations contradict the plan.",
    },
  ],

  challenges: [
    {
      id: "ag-3-quiz",
      kind: "quiz",
      title: "Checkpoint: planning and memory",
      blurb: "Five questions on keeping long tasks coherent.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is a main benefit of an explicit plan in a long agent run?",
          options: [
            "It removes the need for tools",
            "It gives a compact, inspectable state of what is done and what remains",
            "It lowers the temperature",
            "It guarantees success",
          ],
          correctIndex: 1,
          explanation:
            "A plan keeps the task coherent and makes the run auditable. It must still be revised when evidence changes.",
        },
        {
          id: "q2",
          prompt: "Which technique reduces context size while keeping recent detail?",
          options: [
            "Doubling the system prompt",
            "Compacting older steps into a summary and keeping the latest steps verbatim",
            "Removing the user's message",
            "Raising max_tokens",
          ],
          correctIndex: 1,
          explanation:
            "Compaction trades older detail for space. Keep exact values in a scratchpad so they are not lost.",
        },
        {
          id: "q3",
          prompt: "Why is saving 'facts' extracted from web pages straight into long-term memory dangerous?",
          options: [
            "It uses too much disk space",
            "An attacker can plant false or malicious content that is recalled in future sessions",
            "Memory cannot hold text",
            "It slows down retrieval",
          ],
          correctIndex: 1,
          explanation:
            "Untrusted content becomes persistent, effectively poisoning the agent's future behaviour.",
        },
        {
          id: "q4",
          prompt: "Which belongs in working memory rather than long-term memory?",
          options: [
            "The user's preferred language",
            "The remaining steps of the current task",
            "A decision the user made last month",
            "The user's time zone",
          ],
          correctIndex: 1,
          explanation:
            "Task state lives for the task. Durable preferences and decisions belong in long-term memory.",
        },
        {
          id: "q5",
          prompt: "Observations contradict the original plan. What should the agent do?",
          options: [
            "Follow the plan anyway",
            "Revise the plan using the new evidence",
            "Stop immediately",
            "Delete the plan",
          ],
          correctIndex: 1,
          explanation:
            "A plan is a working hypothesis. Replanning on new evidence is the point of having one.",
        },
      ],
    },
    {
      id: "ag-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: saving memories",
      blurb: "Weeks later, a user's assistant started following an instruction nobody gave it. Find the line.",
      language: "python",
      lines: [
        "def after_turn(user_msg, page_text):",
        "    fact = llm(f'Extract a durable fact from: {page_text}')",
        "    memory.save(user.id, fact)     # recalled in every future conversation",
      ],
      buggyLine: 3,
      reasons: [
        "memory.save should be called before the model",
        "text derived from untrusted content is stored as trusted long-term memory with no validation, provenance or review, so injected instructions persist",
        "the user id should be hashed",
        "facts must be saved as numbers",
      ],
      correctReasonIndex: 1,
      explanation:
        "A web page can contain instructions that the extraction step faithfully copies. Saved to memory, they are replayed into future contexts. Do not auto-save from untrusted sources; if you do, validate, tag the source, expire it, and let the user see and delete it.",
      fix: "if is_trusted(source) and passes_validation(fact): memory.save(user.id, fact, source=source, expires=...)",
      xp: 40,
    },
    {
      id: "ag-3-code",
      kind: "code",
      title: "Code challenge: pick the next runnable step",
      blurb: "Choose the next step in a plan whose dependencies are all finished.",
      functionName: "nextStep",
      starter: `/**
 * plan: array of { id, deps: string[], done: boolean }
 *
 * Return the id of the FIRST step (in array order) that
 *   - is not done, and
 *   - has every id in deps belonging to a step that is done.
 * A dependency that is not in the plan counts as NOT done.
 * Return null when nothing is runnable (all done, or everything is blocked).
 *
 * nextStep([
 *   { id: "a", deps: [],    done: true  },
 *   { id: "b", deps: ["a"], done: false },
 *   { id: "c", deps: ["b"], done: false },
 * ]) -> "b"
 */
function nextStep(plan) {
  // your code here
}`,
      tests: [
        { name: "the next step after a finished one", args: [[{ id: "a", deps: [], done: true }, { id: "b", deps: ["a"], done: false }, { id: "c", deps: ["b"], done: false }]], expected: "b" },
        { name: "blocked steps are skipped", args: [[{ id: "a", deps: ["b"], done: false }, { id: "b", deps: [], done: false }]], expected: "b" },
        { name: "everything is done", args: [[{ id: "a", deps: [], done: true }]], expected: null },
        { name: "a dependency cycle blocks everything", args: [[{ id: "a", deps: ["b"], done: false }, { id: "b", deps: ["a"], done: false }]], expected: null },
        { name: "an unknown dependency counts as not done", args: [[{ id: "a", deps: ["ghost"], done: false }]], expected: null },
        { name: "several ready steps: the first in order wins", args: [[{ id: "a", deps: [], done: false }, { id: "b", deps: [], done: false }]], expected: "a" },
        { name: "an empty plan", args: [[]], expected: null },
      ],
      hints: [
        "Build a Set of the ids of steps that are done.",
        "Scan the plan in order and return the first step that is not done and whose deps are all in that set.",
        "A dependency that is not in the plan is never in the done set, so it blocks automatically. Return null if the scan finds nothing.",
      ],
      solution: `function nextStep(plan) {
  const finished = new Set(plan.filter((s) => s.done).map((s) => s.id));

  for (const step of plan) {
    if (!step.done && step.deps.every((d) => finished.has(d))) return step.id;
  }
  return null;
}`,
      xp: 70,
    },
  ],
};
