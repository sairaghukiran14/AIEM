import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "the-agent-loop",
  order: 2,
  title: "The Agent Loop",
  summary:
    "An agent is a model calling tools in a loop until it is done. The loop is simple. Keeping it correct, bounded and affordable is the work.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Lesson 1 was one round trip. An **agent** repeats it: call the model, run any tool it asks for, add the result to the conversation, and call the model again. It stops when the model replies with a normal answer instead of a tool call. That is the whole idea, sometimes called the **ReAct** pattern (reason, act, observe).",
    },
    {
      type: "visual",
      key: "agent-loop",
      caption:
        "Step through a scripted run. Then lower the step limit to see what a runaway guard looks like: your code, not the model, decides when to stop.",
    },
    { type: "h", text: "Workflow or agent?" },
    {
      type: "p",
      text: "A **workflow** has a fixed sequence of steps that your code controls. An **agent** lets the model decide the next step from what it has seen. Agents are more flexible and also slower, costlier and harder to predict, so start with the simplest thing that works.",
    },
    {
      type: "sorter",
      title: "Workflow or agent?",
      prompt: "Which design fits each task?",
      categories: ["Fixed workflow", "Agent loop"],
      items: [
        { text: "Every ticket: classify, then look up the customer, then draft a reply", answer: 0, why: "The steps are known in advance, so code can sequence them. No need for the model to decide." },
        { text: "Investigate why a deployment is failing, choosing what to check next from each finding", answer: 1, why: "The next action depends on what the last one revealed. That is an agent's strength." },
        { text: "Extract five fields from an invoice", answer: 0, why: "One structured call (Track 2) is enough." },
        { text: "Research a question that may need an unknown number of searches", answer: 1, why: "The number and nature of steps cannot be fixed beforehand." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "The loop in four lines" },
    {
      type: "code",
      language: "text",
      code: `messages = [user_task]
repeat:
    reply = model(messages, tools)                   # 1. think
    if reply has no tool calls:  return reply.text   # 2. done
    messages += [reply] + [run(call) for call in reply.tool_calls]   # 3. act, 4. observe`,
    },
    { type: "h", text: "Why agents get expensive quickly" },
    {
      type: "p",
      text: "The model has no memory (Track 1), so **every iteration re-sends the whole conversation so far**, including all earlier tool calls and results. Each step adds to the context, and the next step pays for all of it again. The total input grows roughly with the **square** of the number of steps.",
    },
    {
      type: "calculator",
      title: "The cost of one more step",
      inputs: [
        { key: "steps", label: "Model calls in the run", min: 1, max: 40, step: 1, value: 10 },
        { key: "base", label: "Starting prompt (system + task + tools)", min: 500, max: 20000, step: 500, value: 4000, unit: "tokens" },
        { key: "grow", label: "Tokens added per step (call + result)", min: 50, max: 5000, step: 50, value: 800, unit: "tokens" },
        { key: "price", label: "Input price per 1M tokens", min: 0.1, max: 20, step: 0.1, value: 3, unit: "$" },
      ],
      outputs: [
        { label: "Total input tokens across the run", formula: "steps * base + grow * steps * (steps - 1) / 2", format: "int" },
        { label: "Input cost of the run", formula: "(steps * base + grow * steps * (steps - 1) / 2) / 1e6 * price", format: "usd" },
        { label: "Cost if steps doubled", formula: "(2 * steps * base + grow * 2 * steps * (2 * steps - 1) / 2) / 1e6 * price", format: "usd" },
      ],
      note: "Doubling the steps more than doubles the cost. Prompt caching (Track 8) helps a lot here because the old part of the conversation is a stable prefix.",
    },
    { type: "h", text: "Stopping conditions, in priority order" },
    {
      type: "ol",
      items: [
        "**Final answer**: the model produced text with no tool call.",
        "**Step limit**: a hard maximum number of model calls.",
        "**Budget**: a ceiling on tokens or cost for the run.",
        "**Loop detection**: the same tool call with the same arguments several times in a row is almost always a stuck agent.",
        "**Timeout** and a **cancel** signal from the user.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Never trust the model to stop itself",
      text: "A model that keeps calling tools will happily run until you run out of money. The limit lives in your loop. When it triggers, return a clear failure or a best-effort partial answer, never an infinite wait.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What interviewers listen for",
      text: "That an agent is a bounded loop around a model, that cost grows faster than linearly because the transcript is re-sent, that you enforce step, budget and loop limits in code, and that you prefer a fixed workflow when the steps are known.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A bounded agent loop with step, budget and repeat detection.",
    code: `MAX_STEPS = 12
TOKEN_BUDGET = 150_000

def run_agent(task: str, user) -> str:
    messages = [{"role": "user", "content": task}]
    used_tokens = 0
    recent_calls: list[str] = []

    for step in range(MAX_STEPS):                          # hard cap, enforced by us
        reply = model(messages, tools=TOOLS)
        used_tokens += reply.usage.total_tokens

        if not reply.tool_calls:                           # the model is done
            return reply.text

        if used_tokens >= TOKEN_BUDGET:
            return "Stopped: the task used too many tokens. Here is what I found so far."

        messages.append(reply)
        for call in reply.tool_calls:
            sig = f"{call.name}:{json.dumps(call.args, sort_keys=True)}"
            recent_calls.append(sig)
            if recent_calls[-3:] == [sig, sig, sig]:       # same call three times: stuck
                return "Stopped: the agent repeated the same action."
            result = run_tool(call.name, call.args, user)  # validated and authorised (lesson 1)
            messages.append({"role": "tool", "tool_call_id": call.id, "content": truncate(result)})

    return "Stopped: step limit reached without a final answer."`,
  },

  interview: [
    {
      question: "What is an agent?",
      answer:
        "A model running in a loop with tools: it is called with the conversation, may request tool calls, the results are appended, and it is called again until it returns a final answer. The loop is bounded by limits my code enforces. The model decides the next step from what it has observed, which is what separates it from a fixed workflow.",
      weakAnswer:
        "An AI that does tasks on its own. — Vague; it does not describe the loop or its limits.",
    },
    {
      question: "When would you use a fixed workflow instead of an agent?",
      answer:
        "When the steps are known in advance, because code sequencing is cheaper, faster, more predictable and easier to test. I reach for an agent only when the next action genuinely depends on intermediate results and the number of steps is unknown. Many 'agent' problems are a workflow with one or two model calls.",
    },
    {
      question: "Why do agent runs get expensive, and how do you control it?",
      answer:
        "Each iteration re-sends the entire growing transcript, so input tokens grow roughly quadratically with the number of steps. I cap steps and budget, truncate large tool results, summarise old steps when runs are long, use prompt caching for the stable prefix, and route easy steps to a cheaper model.",
      followUp: "What does prompt caching change about that curve?",
    },
    {
      question: "How do you stop an agent that is stuck?",
      answer:
        "Limits in code: a maximum number of model calls, a token or cost budget, a timeout, and loop detection for repeated identical tool calls. When one triggers I return a clear failure or a partial result with what was learned, and log the run for analysis. I never rely on the model deciding to stop.",
    },
    {
      question: "What does ReAct stand for and what is the pattern?",
      answer:
        "Reason plus act. The model alternates between reasoning about what to do, taking an action through a tool, and observing the result, repeating until it can answer. With native tool calling the 'act' and 'observe' steps are structured messages rather than parsed text, but the reason-act-observe cycle is the same.",
    },
  ],

  challenges: [
    {
      id: "ag-2-quiz",
      kind: "quiz",
      title: "Checkpoint: the agent loop",
      blurb: "Five questions on loops, limits and cost.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What ends a normal agent loop?",
          options: [
            "The model returns a reply with no tool call",
            "The tool returns an error",
            "The conversation reaches 10 messages",
            "The provider closes the connection",
          ],
          correctIndex: 0,
          explanation:
            "A final text answer, with no tool call, signals completion. Everything else is a guard that stops a run that has not finished.",
        },
        {
          id: "q2",
          prompt: "Why does the cost of an agent run grow faster than linearly with steps?",
          options: [
            "Tool calls are billed at a higher rate over time",
            "Each step re-sends the whole transcript, which keeps growing",
            "The model gets slower",
            "Output tokens are charged twice",
          ],
          correctIndex: 1,
          explanation:
            "No memory between calls (Track 1): every iteration pays for all earlier steps again, so total input grows roughly with steps squared.",
        },
        {
          id: "q3",
          prompt: "Which task is a better fit for a fixed workflow than for an agent?",
          options: [
            "Open-ended research with unknown steps",
            "Classify, look up, then draft a reply for every ticket",
            "Debugging an unfamiliar failure",
            "Exploring a codebase to find a bug",
          ],
          correctIndex: 1,
          explanation:
            "Known steps can be sequenced by code. It is cheaper, faster and more predictable.",
        },
        {
          id: "q4",
          prompt: "The agent calls the same tool with the same arguments three times in a row. What should your loop do?",
          options: [
            "Keep going, it will eventually change",
            "Treat it as stuck and stop with a clear message",
            "Double the step limit",
            "Retry with a higher temperature",
          ],
          correctIndex: 1,
          explanation:
            "Repeated identical calls are a classic stuck pattern. Detect and stop.",
        },
        {
          id: "q5",
          prompt: "Who is responsible for enforcing the maximum number of steps?",
          options: [
            "The model, through its instructions",
            "Your application code in the loop",
            "The tool provider",
            "The tokenizer",
          ],
          correctIndex: 1,
          explanation:
            "A model cannot be trusted to stop itself. The limit must be in code.",
        },
      ],
    },
    {
      id: "ag-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: an agent loop",
      blurb: "One user's run kept going for hours and cost hundreds of dollars. Find the line.",
      language: "python",
      lines: [
        "def run(task):",
        "    messages = [user(task)]",
        "    while True:",
        "        reply = model(messages, tools=TOOLS)",
        "        if not reply.tool_calls:",
        "            return reply.text",
        "        messages.append(reply)",
        "        messages += [execute(tc) for tc in reply.tool_calls]",
      ],
      buggyLine: 3,
      reasons: [
        "`messages` should be a tuple",
        "the loop has no step, budget or time limit, so a model that keeps requesting tools runs until the money or the process runs out",
        "`execute` must be called before `model`",
        "`return` should be `yield`",
      ],
      correctReasonIndex: 1,
      explanation:
        "Nothing bounds this loop. A confused model, or an injected instruction, can request tools indefinitely and every iteration re-sends a growing transcript. Add a maximum number of steps, a token budget and repeat detection.",
      fix: "for step in range(MAX_STEPS):\n        ...\n    return 'Stopped: step limit reached.'",
      xp: 40,
    },
    {
      id: "ag-2-code",
      kind: "code",
      title: "Code challenge: when should the loop stop?",
      blurb: "Decide whether the loop must stop, and why, from its current state.",
      functionName: "shouldStop",
      starter: `/**
 * state = {
 *   steps:       model calls made so far,
 *   maxSteps:    the limit,
 *   tokensUsed:  tokens used so far,
 *   tokenBudget: the limit,
 *   actions:     array of action signatures so far (strings), oldest first,
 *   finalAnswer: string once the model answered, otherwise null,
 * }
 *
 * Return the first reason that applies, checked in this order:
 *   "final"      finalAnswer is not null
 *   "max_steps"  steps >= maxSteps
 *   "budget"     tokensUsed >= tokenBudget
 *   "loop"       the last three actions are all identical
 * Otherwise return null.
 */
function shouldStop(state) {
  // your code here
}`,
      tests: [
        { name: "keep going", args: [{ steps: 2, maxSteps: 10, tokensUsed: 500, tokenBudget: 9000, actions: ["a", "b"], finalAnswer: null }], expected: null },
        { name: "the model answered", args: [{ steps: 2, maxSteps: 10, tokensUsed: 500, tokenBudget: 9000, actions: ["a"], finalAnswer: "done" }], expected: "final" },
        { name: "step limit reached", args: [{ steps: 10, maxSteps: 10, tokensUsed: 500, tokenBudget: 9000, actions: ["a", "b"], finalAnswer: null }], expected: "max_steps" },
        { name: "budget exhausted", args: [{ steps: 3, maxSteps: 10, tokensUsed: 9000, tokenBudget: 9000, actions: ["a", "b", "c"], finalAnswer: null }], expected: "budget" },
        { name: "three identical actions in a row", args: [{ steps: 4, maxSteps: 10, tokensUsed: 100, tokenBudget: 9000, actions: ["x", "s", "s", "s"], finalAnswer: null }], expected: "loop" },
        { name: "only two identical is not a loop", args: [{ steps: 3, maxSteps: 10, tokensUsed: 100, tokenBudget: 9000, actions: ["x", "s", "s"], finalAnswer: null }], expected: null },
        { name: "final beats everything else", args: [{ steps: 10, maxSteps: 10, tokensUsed: 9999, tokenBudget: 9000, actions: ["s", "s", "s"], finalAnswer: "ok" }], expected: "final" },
        { name: "step limit is checked before budget and loop", args: [{ steps: 10, maxSteps: 10, tokensUsed: 9999, tokenBudget: 9000, actions: ["s", "s", "s"], finalAnswer: null }], expected: "max_steps" },
      ],
      hints: [
        "Check the conditions in the stated order and return as soon as one is true.",
        "finalAnswer is null when there is no answer, so compare against null explicitly (an empty string is still an answer).",
        "For the loop check, look at the last three entries of actions: you need at least three, and all must equal the first of them.",
      ],
      solution: `function shouldStop(state) {
  if (state.finalAnswer !== null) return "final";
  if (state.steps >= state.maxSteps) return "max_steps";
  if (state.tokensUsed >= state.tokenBudget) return "budget";

  const last = state.actions.slice(-3);
  if (last.length === 3 && last.every((a) => a === last[0])) return "loop";

  return null;
}`,
      xp: 70,
    },
  ],
};
