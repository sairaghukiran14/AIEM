import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "agent-guardrails-and-reliability",
  order: 6,
  title: "Guardrails & Reliability",
  summary:
    "Agents take actions, and every step can fail. Decide what runs automatically, what needs a human, what is never allowed, and how to survive failures.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "A chatbot that is wrong produces a bad sentence. An agent that is wrong can send the email, charge the card or delete the file. **Guardrails** are the controls that limit what an agent can do and catch it when it goes wrong. They live in your code, because the model cannot be relied on to police itself (Track 2).",
    },
    {
      type: "sorter",
      title: "Auto-run, ask a human, or never allow?",
      prompt: "Decide the right policy for each action.",
      categories: ["Auto-run", "Ask a human", "Never allow"],
      items: [
        { text: "Read a file inside the project folder", answer: 0, why: "Read-only and in scope. Low risk, so no friction." },
        { text: "Send an email to an external customer", answer: 1, why: "Outward-facing and hard to undo. Show the exact message and ask." },
        { text: "Drop a production database table", answer: 2, why: "Irreversible and rarely needed. The agent should not have this ability at all." },
        { text: "Search the public web", answer: 0, why: "Read-only. The risk is what the results say (injection), not the call." },
        { text: "Transfer money over a set limit", answer: 1, why: "High impact. Require explicit approval, ideally with a hard cap." },
      ],
    },
    { type: "h", text: "The layers of control" },
    {
      type: "ol",
      items: [
        "**Permissions (least privilege)**: give the agent only the tools and credentials it needs. The safest dangerous action is the one it cannot take.",
        "**Policy checks in code**: allow, ask or deny each call by tool name and arguments, with default deny.",
        "**Human approval** for irreversible or outward-facing actions, showing the exact action and arguments.",
        "**Limits**: steps, tokens, time and spend (lesson 2), plus caps on amounts and counts such as emails per run.",
        "**Sandboxing** for code execution and file access: no network, a temporary filesystem, strict timeouts and resource limits.",
        "**Observability**: log every call, decision and result so you can audit and replay (Track 6).",
        "**Kill switch**: a way to stop a run, a user, or a whole feature immediately.",
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Reliability compounds against you",
      text: "If each step succeeds 95% of the time, ten steps in a row succeed only about 60% of the time. Long autonomous chains need verification between steps, retries where safe, and a design that fails visibly instead of silently.",
    },
    {
      type: "calculator",
      title: "How reliable is a long chain?",
      inputs: [
        { key: "p", label: "Success rate per step", min: 50, max: 100, step: 1, value: 95, unit: "%" },
        { key: "n", label: "Steps in the task", min: 1, max: 50, step: 1, value: 10 },
      ],
      outputs: [
        { label: "Chance every step succeeds", formula: "Math.pow(p / 100, n)", format: "pct" },
        { label: "Per-step rate needed for 90% overall", formula: "Math.pow(0.9, 1 / n)", format: "pct" },
      ],
      note: "This assumes independent steps. In practice a bad early step also damages later ones, which is why checkpoints and verification matter.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Retries without double-charging" },
    {
      type: "p",
      text: "Retrying is right for transient failures, but a **timeout does not mean the action did not happen**. If `charge_card` times out and you retry, you may charge twice. The fix is an **idempotency key**: a unique id you send with the request, so the server executes it once and returns the same result for repeats. Retry freely for reads; for writes, use idempotency keys or do not retry.",
    },
    {
      type: "table",
      headers: ["Action type", "Retry on timeout?", "Why"],
      rows: [
        ["Read-only lookup", "yes, with backoff", "safe to repeat"],
        ["Write with an idempotency key", "yes", "the server deduplicates"],
        ["Write without one (send email, charge card)", "no, or check state first", "a repeat may duplicate the effect"],
        ["Destructive action", "never automatically", "needs explicit approval"],
      ],
    },
    {
      type: "stepper",
      title: "An approval gate for a risky call",
      steps: [
        { label: "The model proposes", detail: "The model requests send_email with a recipient and body. Nothing has happened yet.", items: ["send_email(to=\"cust@x.com\", body=\"...\")"], mark: [0] },
        { label: "Policy decides", detail: "Code looks the tool up in the policy: not denied, listed as 'ask'. It also checks arguments, for example that the recipient is on an allowed domain.", items: ["tool in deny? no", "tool in ask? yes"], mark: [1] },
        { label: "Show the exact action", detail: "The human sees the real recipient and the full message, not the model's description of it, and approves or rejects.", items: ["To: cust@x.com", "Body: (full text)", "Approve / Reject"], mark: [2] },
        { label: "Execute with an idempotency key", detail: "On approval, run the call with a unique key, so a retry cannot send twice.", items: ["key: run_81/step_4"], mark: [0] },
        { label: "Record everything", detail: "Log the proposal, the decision, who approved, and the result, for audit and replay.", items: ["audit log entry"], mark: [0] },
      ],
      caption: "The model proposes. Deterministic code and a human dispose.",
    },
    { type: "h", text: "Evaluating agents" },
    {
      type: "ul",
      items: [
        "**Task success** on a fixed set of scenarios, checked by code where possible (did the file change, did the record update).",
        "**Efficiency**: steps, tokens and cost per success, and how often limits trigger.",
        "**Safety cases**: injection attempts, requests for forbidden actions, and ambiguous requests that should ask a question.",
        "**Consistency**: run each scenario several times; agents are non-deterministic (Track 2).",
        "**Trace review**: read failing runs end to end. The cause is usually visible in the transcript.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "Least privilege, a code-enforced allow, ask or deny policy with default deny, human approval showing the exact action for irreversible steps, idempotency keys for retries, sandboxing, step and budget limits, full logging, and evaluation that includes safety cases.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A default-deny policy, approval for risky calls, and idempotent execution.",
    code: `import uuid

POLICY = {
    "deny":  ["drop_table", "delete_user"],
    "ask":   ["send_email", "transfer_money"],
    "allow": ["search_docs", "read_file", "transfer_money_small"],
    "limits": {"transfer_money_small": {"arg": "amount", "max_auto": 100}},
}


def authorise(name: str, args: dict) -> str:
    if name in POLICY["deny"]:
        return "deny"
    if name in POLICY["ask"]:
        return "ask"
    if name in POLICY["allow"]:
        limit = POLICY["limits"].get(name)
        if limit and args.get(limit["arg"], 0) > limit["max_auto"]:
            return "ask"                                  # over the automatic ceiling
        return "allow"
    return "deny"                                         # default deny: unknown tools never run


def execute_guarded(call, run_id: str, step: int):
    decision = authorise(call.name, call.args)
    audit_log(run_id, step, call.name, call.args, decision)

    if decision == "deny":
        return {"error": "This action is not permitted."}
    if decision == "ask" and not human_approves(call.name, call.args):   # shows the EXACT arguments
        return {"error": "The user declined this action."}

    key = f"{run_id}/{step}"                              # same key on retry: executed once
    return TOOLS[call.name](**call.args, idempotency_key=key)`,
  },

  interview: [
    {
      question: "How do you make an agent safe to run with real tools?",
      answer:
        "Layers, all in code. Least privilege on tools and credentials; a policy that allows, asks or denies each call by name and arguments with default deny; human approval showing the exact action for irreversible or outward-facing steps; step, budget and amount limits; sandboxing for code and files; full audit logging; and a kill switch. I assume the model can be tricked, so a tricked model must not be able to do real harm.",
      weakAnswer:
        "Tell the agent in the prompt to be careful. — Prompt text is not a control.",
    },
    {
      question: "Why is retrying a failed tool call dangerous?",
      answer:
        "A timeout does not tell you whether the action happened. Retrying a non-idempotent write such as sending an email or charging a card can duplicate it. I retry reads with backoff, and for writes I send an idempotency key so the server executes once, or I check state before retrying. Destructive actions are never retried automatically.",
      followUp: "How does an idempotency key work?",
    },
    {
      question: "A ten-step agent task succeeds 60% of the time even though each step is 95% reliable. Why?",
      answer:
        "Because reliabilities multiply: 0.95 to the tenth power is about 0.60. Long chains need verification between steps, safe retries, checkpoints so work is not lost, and designs that fail visibly. Reducing steps, using deterministic code for the parts that can be, and improving the weakest steps raise the overall rate the most.",
    },
    {
      question: "When should a human approve an agent's action?",
      answer:
        "For actions that are irreversible, outward-facing, financially significant or sensitive: sending messages, payments above a limit, deleting data, changing permissions. The approver should see the exact action and arguments, not a model-written summary. Read-only actions in scope can run automatically, and truly dangerous capabilities should not be given to the agent at all.",
    },
    {
      question: "How do you evaluate an agent?",
      answer:
        "With a fixed set of scenarios scored by code where possible, repeated several times because runs vary, measuring success rate, steps, tokens and cost per success, and how often limits trigger. I include safety cases such as injection attempts, forbidden requests and ambiguous requests, and I read failing traces end to end to find the cause.",
    },
  ],

  challenges: [
    {
      id: "ag-6-quiz",
      kind: "quiz",
      title: "Checkpoint: guardrails and reliability",
      blurb: "Five questions on controlling what agents can do.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Where should the policy that decides whether a tool call may run be enforced?",
          options: [
            "In the system prompt only",
            "In deterministic code outside the model",
            "In the user interface",
            "By the tool provider",
          ],
          correctIndex: 1,
          explanation:
            "A model can be manipulated. Policy must be enforced by code that does not depend on its output being well-behaved.",
        },
        {
          id: "q2",
          prompt: "A charge_card call times out. What is the safest handling?",
          options: [
            "Retry immediately three times",
            "Retry only with an idempotency key, or check whether the charge happened first",
            "Assume it failed and tell the user",
            "Raise the timeout and ignore it",
          ],
          correctIndex: 1,
          explanation:
            "A timeout does not mean the action did not happen. Idempotency keys make retries safe.",
        },
        {
          id: "q3",
          prompt: "Each step succeeds 90% of the time. Roughly how likely is a 10-step chain to succeed completely?",
          options: ["90%", "About 65%", "About 35%", "About 9%"],
          correctIndex: 2,
          explanation:
            "0.9 to the tenth power is about 0.35. Reliability compounds.",
        },
        {
          id: "q4",
          prompt: "What should an unknown tool name get from a policy check?",
          options: [
            "Allow, since it is probably fine",
            "Deny by default",
            "Ask a human every time",
            "A retry",
          ],
          correctIndex: 1,
          explanation:
            "Default deny means unrecognised actions never run.",
        },
        {
          id: "q5",
          prompt: "What should a human approver be shown?",
          options: [
            "The model's summary of what it wants to do",
            "The exact action and its arguments",
            "Only the tool name",
            "Nothing, a single approve button",
          ],
          correctIndex: 1,
          explanation:
            "A summary can hide details. Show the real recipient, amount or path.",
        },
      ],
    },
    {
      id: "ag-6-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: retrying tool calls",
      blurb: "A customer was charged three times after a network blip. Find the line.",
      language: "python",
      lines: [
        "def call_tool_with_retry(name, args):",
        "    for attempt in range(3):",
        "        try:",
        "            return TOOLS[name](**args)       # e.g. charge_card, send_email",
        "        except Timeout:",
        "            continue",
      ],
      buggyLine: 6,
      reasons: [
        "range(3) should be range(1)",
        "after a timeout it retries a non-idempotent action, which may already have run, so the effect can be repeated; use an idempotency key or check state first",
        "Timeout cannot be caught",
        "TOOLS[name] must be called with positional arguments",
      ],
      correctReasonIndex: 1,
      explanation:
        "A timeout means the outcome is unknown. Retrying a charge or an email can run it again. Pass a stable idempotency key so repeats are deduplicated, or look up whether it happened before retrying.",
      fix: "return TOOLS[name](**args, idempotency_key=key)   # same key on every attempt",
      xp: 40,
    },
    {
      id: "ag-6-code",
      kind: "code",
      title: "Code challenge: authorise a tool call",
      blurb: "Implement a default-deny policy with an automatic spending ceiling.",
      functionName: "authorise",
      starter: `/**
 * call:   { name: string, args: object }
 * policy: { deny: string[], ask: string[], allow: string[],
 *           limits: { [toolName]: { arg: string, maxAuto: number } } }
 *
 * Return "allow", "ask" or "deny":
 *   - name in policy.deny  -> "deny"
 *   - name in policy.ask   -> "ask"
 *   - name in policy.allow -> "ask" if policy.limits has an entry for the tool
 *                             and call.args[limit.arg] is greater than limit.maxAuto;
 *                             otherwise "allow"
 *   - anything else        -> "deny"   (default deny)
 * Checks run in that order, so deny beats ask beats allow.
 */
function authorise(call, policy) {
  // your code here
}`,
      tests: [
        { name: "an allowed read", args: [{ name: "read_file", args: {} }, { deny: [], ask: [], allow: ["read_file"], limits: {} }], expected: "allow" },
        { name: "a denied tool", args: [{ name: "drop_table", args: {} }, { deny: ["drop_table"], ask: [], allow: [], limits: {} }], expected: "deny" },
        { name: "an ask tool", args: [{ name: "send_email", args: {} }, { deny: [], ask: ["send_email"], allow: [], limits: {} }], expected: "ask" },
        { name: "unknown tools are denied by default", args: [{ name: "mystery", args: {} }, { deny: [], ask: [], allow: ["a"], limits: {} }], expected: "deny" },
        {
          name: "an allowed tool over its ceiling must ask",
          args: [{ name: "pay", args: { amount: 500 } }, { deny: [], ask: [], allow: ["pay"], limits: { pay: { arg: "amount", maxAuto: 100 } } }],
          expected: "ask",
        },
        {
          name: "at the ceiling is still allowed",
          args: [{ name: "pay", args: { amount: 100 } }, { deny: [], ask: [], allow: ["pay"], limits: { pay: { arg: "amount", maxAuto: 100 } } }],
          expected: "allow",
        },
        { name: "deny wins over allow", args: [{ name: "x", args: {} }, { deny: ["x"], ask: [], allow: ["x"], limits: {} }], expected: "deny" },
        { name: "ask wins over allow", args: [{ name: "x", args: {} }, { deny: [], ask: ["x"], allow: ["x"], limits: {} }], expected: "ask" },
      ],
      hints: [
        "Check deny first, then ask, then allow, returning as soon as one matches.",
        "For an allowed tool, look up policy.limits[name]. Only if it exists compare call.args[limit.arg] with limit.maxAuto.",
        "If the name is in none of the three lists, return 'deny'.",
      ],
      solution: `function authorise(call, policy) {
  const name = call.name;

  if (policy.deny.includes(name)) return "deny";
  if (policy.ask.includes(name)) return "ask";

  if (policy.allow.includes(name)) {
    const limit = policy.limits[name];
    if (limit && call.args[limit.arg] > limit.maxAuto) return "ask";
    return "allow";
  }

  return "deny";
}`,
      xp: 70,
    },
  ],
};
