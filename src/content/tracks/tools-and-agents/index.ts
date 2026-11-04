import type { Quiz, Track } from "@/content/types";

import { lesson as functionCalling } from "./lessons/01-function-calling";
import { lesson as agentLoop } from "./lessons/02-agent-loop";
import { lesson as planningMemory } from "./lessons/03-planning-memory";
import { lesson as toolDesignMcp } from "./lessons/04-tool-design-mcp";
import { lesson as multiAgent } from "./lessons/05-multi-agent";
import { lesson as guardrails } from "./lessons/06-guardrails";
import { lesson as buildingAnMcpServer } from "./lessons/07-building-an-mcp-server";

const gate: Quiz = {
  id: "ag-gate",
  kind: "gate",
  title: "Track Gate: Tool Use & Agents",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to unlock Evals & Observability and earn your track badge.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt: "In function calling, what does the model actually produce?",
      options: [
        "The result of running the function",
        "A structured request naming a tool and its arguments, which your code then validates and executes",
        "A new tool definition",
        "A database connection",
      ],
      correctIndex: 1,
      explanation:
        "The model only emits text, including structured call requests. Your code runs them, which is the security boundary.",
    },
    {
      id: "g2",
      prompt: "A tool builds SQL by interpolating a model-supplied argument. What is the risk?",
      options: [
        "Slower queries",
        "SQL injection, because tool arguments are untrusted input; use parameterised queries and validation",
        "The model will refuse to call the tool",
        "Higher token cost",
      ],
      correctIndex: 1,
      explanation:
        "The argument may be shaped by user input or injected text. Treat it like any external input.",
    },
    {
      id: "g3",
      prompt: "Why does the input cost of an agent run grow faster than linearly with the number of steps?",
      options: [
        "Tool calls cost more over time",
        "Every iteration re-sends the whole growing transcript",
        "The model slows down",
        "Providers surcharge long runs",
      ],
      correctIndex: 1,
      explanation:
        "The model has no memory, so each step pays for all earlier steps again.",
    },
    {
      id: "g4",
      prompt: "Which design is the best fit for a fixed workflow rather than an agent?",
      options: [
        "Investigating an unknown production incident",
        "Always: classify the ticket, look up the customer, then draft a reply",
        "Open-ended research with an unknown number of searches",
        "Exploring an unfamiliar codebase",
      ],
      correctIndex: 1,
      explanation:
        "Known steps are cheaper, faster and more predictable when sequenced by code.",
    },
    {
      id: "g5",
      prompt: "Which pair of defences stops a runaway agent?",
      options: [
        "A polite instruction and a long prompt",
        "A step limit and a token or cost budget enforced in code, plus repeat detection",
        "A larger model and a higher temperature",
        "More tools",
      ],
      correctIndex: 1,
      explanation:
        "The model cannot be trusted to stop itself. Limits live in the loop.",
    },
    {
      id: "g6",
      prompt: "A plan's results contradict an earlier assumption. What should the agent do?",
      options: [
        "Continue the old plan",
        "Revise the plan using the new evidence",
        "Delete memory",
        "Stop and say nothing",
      ],
      correctIndex: 1,
      explanation:
        "A plan is a working hypothesis. Replanning on evidence is its purpose.",
    },
    {
      id: "g7",
      prompt: "Why is auto-saving facts extracted from web pages into long-term memory risky?",
      options: [
        "It uses too much storage",
        "An attacker can plant content that is recalled in future sessions, poisoning behaviour",
        "Memory cannot store text",
        "It slows down retrieval",
      ],
      correctIndex: 1,
      explanation:
        "Untrusted content becomes persistent. Validate, record provenance and give users control.",
    },
    {
      id: "g8",
      prompt: "A tool is described only as 'Database access'. What is the most likely consequence?",
      options: [
        "The model uses it perfectly",
        "The model guesses when to call it and what arguments to pass, because the description is its only documentation",
        "The tool is ignored forever",
        "The tool becomes read-only",
      ],
      correctIndex: 1,
      explanation:
        "A tool description is prompt text. Say when to use it, what arguments mean and what comes back.",
    },
    {
      id: "g9",
      prompt: "Five workers use 40k tokens each and the lead uses 30k, versus 60k for a single agent. What is the best summary?",
      options: [
        "Multi-agent is cheaper because it is parallel",
        "It costs about 3.8 times as many tokens; parallelism saves time, not cost",
        "The cost is identical",
        "Workers share one context so there is no extra cost",
      ],
      correctIndex: 1,
      explanation:
        "Tokens sum across workers. Parallelism reduces wall-clock time but not the bill.",
    },
    {
      id: "g10",
      prompt: "A send_email call times out. What is the safest retry policy?",
      options: [
        "Retry immediately three times",
        "Use an idempotency key so a retry cannot send twice, or check whether it was sent first",
        "Never tell the user",
        "Switch to a different tool",
      ],
      correctIndex: 1,
      explanation:
        "A timeout leaves the outcome unknown. Without idempotency a retry can duplicate the effect.",
    },
  ],
};

export const toolsAndAgents: Track = {
  slug: "tools-and-agents",
  order: 5,
  title: "Tool Use & Agents",
  tagline: "Models that take actions",
  description:
    "Function calling, the agent loop, planning and memory, tool design and MCP, multi-agent patterns, and the guardrails that make agents safe and reliable. Every lesson ends with interview questions.",
  level: "intermediate",
  icon: "Workflow",
  accentVar: "--pink",
  interviewTopics: [
    "Function calling and validation",
    "The agent loop and stop conditions",
    "Workflow vs agent",
    "Planning, scratchpads and memory",
    "Tool design and MCP",
    "Multi-agent patterns and cost",
    "Approval, idempotency, sandboxing",
    "Evaluating agents",
  ],
  lessons: [functionCalling, agentLoop, planningMemory, toolDesignMcp, multiAgent, guardrails, buildingAnMcpServer],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "Function calling",
      items: [
        { term: "Cycle", detail: "Describe tools; model emits a structured call; your code validates and executes; return a result by call id; model continues." },
        { term: "Boundary", detail: "The model never executes anything. Arguments are untrusted input: validate, authorise, parameterise." },
        { term: "Definitions cost", detail: "Tool definitions are prompt tokens on every request. Keep the set small and cacheable." },
        { term: "Tool choice", detail: "auto (model decides), required, a specific tool (forces a schema), none." },
        { term: "Errors", detail: "Return failures as results with actionable messages; always return a result for every call id." },
      ],
    },
    {
      heading: "Agent loop",
      items: [
        { term: "Loop", detail: "model -> tool calls -> results appended -> model again, until a reply with no tool call." },
        { term: "Cost", detail: "Each step re-sends the transcript. Total input is about steps x base + grow x steps(steps-1)/2." },
        { term: "Stop", detail: "Final answer, step limit, budget, loop detection (same call 3x), timeout. All enforced in code." },
        { term: "Workflow vs agent", detail: "Fixed steps: workflow. Next step depends on results and step count unknown: agent." },
        { term: "ReAct", detail: "Reason, act (tool), observe, repeat." },
      ],
    },
    {
      heading: "Planning & memory",
      items: [
        { term: "Plan", detail: "A visible list of steps with dependencies. Revise it on new evidence." },
        { term: "Next step", detail: "First unfinished step whose dependencies are all done; blocked or cyclic plans return nothing." },
        { term: "Context control", detail: "Truncate results, compact old steps, keep a scratchpad near the end, use sub-agents with fresh context." },
        { term: "Long-term memory", detail: "Retrieval over saved facts with metadata. Validate writes, record provenance, allow deletion." },
        { term: "Risk", detail: "Memory written from untrusted content can be poisoned and replayed in later sessions." },
      ],
    },
    {
      heading: "Tool design & MCP",
      items: [
        { term: "Good tools", detail: "One purpose, verb-phrase name, description of when to use it, constrained inputs, compact paginated output, actionable errors." },
        { term: "Fewer tools", detail: "More tools means more tokens and more confusion. Merge overlaps; retrieve relevant tools for large catalogues." },
        { term: "MCP", detail: "Open client-server protocol: servers expose tools (model-controlled), resources (app-attached data) and prompts (user templates) over stdio or HTTP." },
        { term: "MCP security", detail: "Descriptions and results are prompt text. Vet and pin servers, least privilege, approvals for side effects." },
        { term: "Not 1:1 REST", detail: "Shape tools around the agent's tasks, not your endpoint list." },
      ],
    },
    {
      heading: "Multi-agent",
      items: [
        { term: "Patterns", detail: "Prompt chain, routing, parallelisation (sectioning, voting), orchestrator-workers, evaluator-optimiser." },
        { term: "Benefit", detail: "Focused fresh contexts and parallel independent work." },
        { term: "Cost", detail: "Tokens sum across workers. Parallel saves time, not money." },
        { term: "Briefs", detail: "Send workers a focused brief and take back compact structured results, not transcripts." },
        { term: "Failure modes", detail: "Telephone game, duplicated work, runaway delegation, context leakage, hard debugging. Start with one agent." },
      ],
    },
    {
      heading: "Guardrails & reliability",
      items: [
        { term: "Layers", detail: "Least privilege, code-enforced policy, human approval, limits, sandboxing, logging, kill switch." },
        { term: "Policy", detail: "Deny, then ask, then allow; default deny; ceilings on amounts and counts." },
        { term: "Approval", detail: "Show the exact action and arguments for irreversible or outward-facing steps." },
        { term: "Retries", detail: "A timeout leaves the outcome unknown. Idempotency keys for writes; retry reads with backoff." },
        { term: "Compounding", detail: "Per-step reliability multiplies: 0.95^10 is about 0.60. Verify between steps; fail visibly." },
      ],
    },
  ],
};
