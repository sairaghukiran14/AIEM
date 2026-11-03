import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "multi-agent-patterns",
  order: 5,
  title: "Multi-Agent Patterns",
  summary:
    "Several model-driven workers can beat one agent on broad tasks, at a real cost. Learn the patterns, and when a single agent is the better answer.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "A **multi-agent** system splits a task across several model calls or agent loops, each with its own instructions, tools and context. The honest reason to do it is not novelty. It is that **a fresh, focused context** often beats one crowded one (Track 1: attention is limited), and that independent work can run in parallel.",
    },
    {
      type: "table",
      headers: ["Pattern", "How it works", "Good for"],
      rows: [
        ["**Prompt chain**", "output of one call feeds the next, with code checks between", "tasks with fixed stages (outline, draft, edit)"],
        ["**Routing**", "a classifier sends the request to a specialised prompt or agent", "distinct request types needing different tools"],
        ["**Parallelisation**", "run independent calls at once: split into sections, or run the same task several times and vote", "speed, or higher confidence on risky decisions"],
        ["**Orchestrator-workers**", "a lead agent plans, delegates sub-tasks to workers, and synthesises their results", "broad tasks where sub-tasks are not known in advance"],
        ["**Evaluator-optimiser**", "one call produces, another critiques, repeat until good", "outputs with clear quality criteria"],
      ],
    },
    {
      type: "stepper",
      title: "Orchestrator and workers",
      steps: [
        { label: "Plan", detail: "The lead agent reads the question and breaks it into independent sub-questions, for example one per company to compare.", items: ["lead: split into 3 sub-questions"], mark: [0] },
        { label: "Delegate with a brief", detail: "Each worker receives only a focused brief: the sub-question, the tools it needs, and the format to return. Not the whole conversation.", items: ["worker A: brief", "worker B: brief", "worker C: brief"], mark: [0, 1, 2] },
        { label: "Work in parallel", detail: "Workers run their own short agent loops (lesson 2) in separate contexts, at the same time.", items: ["A searching", "B searching", "C searching"], mark: [0, 1, 2] },
        { label: "Return short results", detail: "Each returns a compact, structured finding with its evidence, not its entire transcript.", items: ["A: 120 words + sources", "B: 90 words + sources", "C: 150 words + sources"], mark: [0, 1, 2] },
        { label: "Synthesise and check", detail: "The lead combines the findings, reconciles conflicts, and may spawn follow-up work. Your code enforces limits on how many workers and rounds are allowed.", items: ["final answer + citations"], mark: [0] },
      ],
      caption: "The value comes from isolation: each worker sees little and does one thing well.",
    },
    {
      type: "sorter",
      title: "Which structure fits?",
      prompt: "Pick the simplest structure that suits each task.",
      categories: ["Single agent", "Orchestrator-workers", "Parallel voting"],
      items: [
        { text: "Answer one customer's question about their own order", answer: 0, why: "Small and focused. More agents only add cost." },
        { text: "Research a broad market question needing many independent searches", answer: 1, why: "Sub-tasks are independent and not known in advance." },
        { text: "Decide whether a risky transaction is fraud, where a wrong call is costly", answer: 2, why: "Several independent judgements that must agree raise confidence." },
        { text: "Summarise a single short document", answer: 0, why: "One call is enough." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "The cost is real" },
    {
      type: "p",
      text: "Every worker is a full agent loop with its own re-sent transcript (lesson 2). Several workers plus a lead that reads all their results can use many times the tokens of one agent. Published accounts of multi-agent research systems report token use far above a single chat. Multi-agent pays off when the task's value justifies that cost and when it parallelises.",
    },
    {
      type: "calculator",
      title: "Single agent versus orchestrator and workers",
      inputs: [
        { key: "single", label: "Tokens a single agent would use", min: 5000, max: 500000, step: 5000, value: 60000, unit: "tokens" },
        { key: "workers", label: "Workers", min: 1, max: 20, step: 1, value: 5 },
        { key: "perWorker", label: "Tokens per worker run", min: 5000, max: 200000, step: 5000, value: 40000, unit: "tokens" },
        { key: "lead", label: "Lead agent (plan + synthesis)", min: 5000, max: 200000, step: 5000, value: 30000, unit: "tokens" },
      ],
      outputs: [
        { label: "Total tokens, multi-agent", formula: "workers * perWorker + lead", format: "int" },
        { label: "Multiple of the single agent", formula: "(workers * perWorker + lead) / single", format: "fixed1" },
        { label: "Wall-clock vs sequential workers", formula: "(perWorker + lead) / (workers * perWorker + lead)", format: "pct" },
      ],
      note: "Workers in parallel finish in roughly one worker's time, but the bill is the sum. Whether the quality gain is worth the multiple is a measurement, not an assumption.",
    },
    { type: "h", text: "Failure modes specific to multi-agent systems" },
    {
      type: "ul",
      items: [
        "**Telephone game**: detail is lost or distorted at each hand-off. Use structured results with evidence, not prose summaries of summaries.",
        "**Duplicated or conflicting work**: two workers do the same thing, or contradict each other. Give non-overlapping briefs and a synthesis step that checks.",
        "**Runaway delegation**: agents spawn agents without bound. Cap the number of workers, rounds and depth in code (lesson 6).",
        "**Context leakage**: passing the whole conversation to every worker multiplies cost and exposes irrelevant or sensitive text. Send a brief.",
        "**Hard to debug**: failures are spread across runs. Trace every agent with ids that link them (Track 6).",
        "**Over-engineering**: many 'multi-agent' designs are a workflow with a couple of prompts. Start there.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Start with one agent",
      text: "Build the simplest thing that works, measure it, and only add agents when you can show a specific limit (context overload, independent parallel work) that more structure solves.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That multi-agent buys isolation and parallelism at a large token cost, that you pass focused briefs and get structured results back, that you cap workers and depth in code, and that you would first try a single agent or a fixed workflow.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Orchestrator-workers with a capped worker count and focused briefs.",
    code: `import asyncio

MAX_WORKERS = 5

async def research(question: str) -> str:
    # 1. The lead plans: independent sub-questions as structured output.
    plan = await lead_model.json(
        f"Split into at most {MAX_WORKERS} independent sub-questions: {question}"
    )
    subs = plan["sub_questions"][:MAX_WORKERS]                 # enforced in code

    # 2. Each worker gets ONLY its brief, runs its own bounded loop, returns a compact result.
    async def work(sub: str) -> dict:
        brief = f"Answer this one sub-question and return JSON with 'finding' and 'sources':\\n{sub}"
        return await run_agent(brief, tools=SEARCH_TOOLS, max_steps=8)

    results = await asyncio.gather(*(work(s) for s in subs))   # parallel

    # 3. The lead synthesises, reconciling conflicts, and cites.
    return await lead_model.text(
        "Combine these findings into one answer. Note disagreements and cite sources.\\n"
        + json.dumps(results)
    )`,
  },

  interview: [
    {
      question: "When would you use a multi-agent design?",
      answer:
        "When a single context is overloaded or the task splits into independent sub-tasks that can run in parallel, such as broad research. Isolated workers get focused context and run concurrently. I weigh that against a large token multiple, harder debugging and coordination failures, and I try a single agent or fixed workflow first and measure the gain.",
      weakAnswer:
        "Whenever the task is complicated. — Complexity alone does not justify the cost.",
    },
    {
      question: "Describe the orchestrator-workers pattern.",
      answer:
        "A lead agent plans and splits the task into sub-questions, sends each worker a focused brief, the workers run their own bounded loops in separate contexts in parallel and return compact structured results with evidence, and the lead synthesises and reconciles conflicts. My code caps the number of workers, rounds and depth.",
      followUp: "What are its main failure modes?",
    },
    {
      question: "What are the costs and risks of multi-agent systems?",
      answer:
        "Tokens multiply, since every worker has its own growing transcript, and latency is set by the slowest worker plus synthesis. Quality risks include lost detail at hand-offs, duplicated or conflicting work, runaway delegation and context leakage. They are also harder to debug, so I trace every agent with linked ids and keep the design as simple as the task allows.",
    },
    {
      question: "What should a worker receive from the orchestrator?",
      answer:
        "A focused brief: the sub-question, the tools and constraints it needs, and the exact output format. Not the entire conversation, which would multiply cost, add noise and may expose irrelevant or sensitive information. Results come back as compact structured findings with sources, not full transcripts.",
    },
    {
      question: "What is parallel voting and when is it appropriate?",
      answer:
        "Running the same decision several times independently, perhaps with different prompts or models, and taking the majority or requiring agreement. It raises confidence for risky classifications where a wrong call is costly, at a multiple of the cost. It only helps if the runs are genuinely independent, so errors are not systematic.",
    },
  ],

  challenges: [
    {
      id: "ag-5-quiz",
      kind: "quiz",
      title: "Checkpoint: multi-agent patterns",
      blurb: "Five questions on when and how to split work.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is a genuine benefit of giving each worker its own context?",
          options: [
            "It makes the model larger",
            "A focused context avoids overload, and independent work can run in parallel",
            "It removes the need for tools",
            "It eliminates hallucination",
          ],
          correctIndex: 1,
          explanation:
            "Isolation keeps each worker focused, and independent workers can run at the same time.",
        },
        {
          id: "q2",
          prompt: "Five workers each use 40k tokens and the lead uses 30k. A single agent would use 60k. What is the multiple?",
          options: ["About 1x", "About 2x", "About 3.8x", "About 10x"],
          correctIndex: 2,
          explanation:
            "(5 x 40k + 30k) / 60k is about 3.8. Parallelism saves time, not tokens.",
        },
        {
          id: "q3",
          prompt: "What should the orchestrator pass to a worker?",
          options: [
            "The entire conversation so far",
            "A focused brief with the sub-task, needed tools and output format",
            "Nothing",
            "The other workers' transcripts",
          ],
          correctIndex: 1,
          explanation:
            "Full history multiplies cost and adds noise or sensitive text. A brief keeps workers focused.",
        },
        {
          id: "q4",
          prompt: "Which safeguard prevents runaway delegation?",
          options: [
            "Asking the lead nicely to stop",
            "Code-enforced caps on workers, rounds and depth",
            "A higher temperature",
            "Longer prompts",
          ],
          correctIndex: 1,
          explanation:
            "Limits must live in code. A model cannot be relied on to stop spawning work.",
        },
        {
          id: "q5",
          prompt: "A simple FAQ chatbot is being redesigned as five cooperating agents. What is the best advice?",
          options: [
            "Proceed, more agents are always better",
            "Keep a single agent or workflow unless you can show a specific limit that more structure solves",
            "Add more tools instead",
            "Use a larger model for every agent",
          ],
          correctIndex: 1,
          explanation:
            "Start with the simplest design and add agents only when measurement justifies the cost.",
        },
      ],
    },
    {
      id: "ag-5-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: delegating research",
      blurb: "Costs are far higher than expected and workers sometimes quote private chat details. Find the line.",
      language: "python",
      lines: [
        "def research(question, subtopics):",
        "    results = []",
        "    for t in subtopics:",
        "        results.append(worker(full_conversation + question, t))",
        "    return '\\n'.join(results)",
      ],
      buggyLine: 4,
      reasons: [
        "the loop should be a list comprehension",
        "every worker receives the whole conversation, multiplying tokens by the number of workers and exposing irrelevant or sensitive context; each should get only a focused brief",
        "join cannot be used on results",
        "the question must be passed second",
      ],
      correctReasonIndex: 1,
      explanation:
        "Passing the full history to N workers pays for it N times and leaks context the worker does not need. Send a brief containing just the sub-task, the tools and the output format.",
      fix: "results.append(worker(brief_for(t)))   # focused brief only",
      xp: 40,
    },
    {
      id: "ag-5-code",
      kind: "code",
      title: "Code challenge: balance work across workers",
      blurb: "Assign tasks to workers so the busiest worker has as little to do as possible (greedy).",
      functionName: "assignWork",
      starter: `/**
 * tasks:   [{ id: string, cost: number }]
 * workers: number of workers (>= 1)
 *
 * Greedy load balancing:
 *   1. Sort tasks by cost descending (ties keep the original order).
 *   2. Give each task to the worker with the smallest total cost so far
 *      (ties: the lowest worker index).
 *
 * Return an array of length \`workers\`; each entry is the list of task ids
 * assigned to that worker, in assignment order.
 *
 * assignWork([{id:"a",cost:5},{id:"b",cost:3},{id:"c",cost:3},{id:"d",cost:2},{id:"e",cost:2}], 2)
 *   -> [["a","d"], ["b","c","e"]]
 */
function assignWork(tasks, workers) {
  // your code here
}`,
      tests: [
        {
          name: "the worked example",
          args: [[{ id: "a", cost: 5 }, { id: "b", cost: 3 }, { id: "c", cost: 3 }, { id: "d", cost: 2 }, { id: "e", cost: 2 }], 2],
          expected: [["a", "d"], ["b", "c", "e"]],
        },
        {
          name: "one worker takes everything, largest first",
          args: [[{ id: "x", cost: 1 }, { id: "y", cost: 4 }], 1],
          expected: [["y", "x"]],
        },
        {
          name: "more workers than tasks leaves some empty",
          args: [[{ id: "a", cost: 2 }, { id: "b", cost: 1 }], 3],
          expected: [["a"], ["b"], []],
        },
        {
          name: "ties in load go to the lowest worker",
          args: [[{ id: "a", cost: 1 }, { id: "b", cost: 1 }, { id: "c", cost: 1 }], 2],
          expected: [["a", "c"], ["b"]],
        },
        { name: "no tasks", args: [[], 3], expected: [[], [], []] },
        {
          name: "equal costs keep the original task order",
          args: [[{ id: "p", cost: 2 }, { id: "q", cost: 2 }], 2],
          expected: [["p"], ["q"]],
        },
      ],
      hints: [
        "Create one bucket and one running total per worker.",
        "Sort a copy of the tasks by cost descending; use the original index as the tie-breaker so equal costs stay in order.",
        "For each task find the worker with the smallest total (first one wins on ties), push the id there and add the cost.",
      ],
      solution: `function assignWork(tasks, workers) {
  const buckets = Array.from({ length: workers }, () => []);
  const load = new Array(workers).fill(0);

  const ordered = tasks
    .map((t, index) => ({ ...t, index }))
    .sort((a, b) => b.cost - a.cost || a.index - b.index);

  for (const task of ordered) {
    let target = 0;
    for (let w = 1; w < workers; w++) {
      if (load[w] < load[target]) target = w;
    }
    buckets[target].push(task.id);
    load[target] += task.cost;
  }

  return buckets;
}`,
      xp: 70,
    },
  ],
};
