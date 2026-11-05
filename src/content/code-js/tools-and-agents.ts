/** JavaScript versions of this track's lesson code examples, keyed by lesson slug. */
export const toolsAndAgents: Record<string, string> = {
  "function-calling": `const TOOLS = [{
  name: "get_order",
  description: "Look up one order by ID (format ORD-1234). Returns status, total and items.",
  input_schema: {
    type: "object",
    properties: { order_id: { type: "string" } },
    required: ["order_id"],
  },
}];

async function runTool(name, args, user) {
  if (name !== "get_order") return { error: \`unknown tool: \${name}\` };
  const orderId = args.order_id;
  if (typeof orderId !== "string" || !/^ORD-\\d{4}$/.test(orderId)) {
    return { error: "order_id must look like ORD-1234" };        // fail clearly, don't guess
  }
  const order = await db.fetchOrder(orderId, { owner: user.id }); // parameterised, scoped to this user
  return order ?? { error: "no such order for this account" };
}

async function turn(user, messages) {
  let reply = await model(messages, { tools: TOOLS });
  if (reply.toolCalls.length > 0) {
    messages.push(reply);
    for (const call of reply.toolCalls) {
      const result = await runTool(call.name, call.args, user);   // YOUR code decides and acts
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
    reply = await model(messages, { tools: TOOLS });              // model reads the result
  }
  return reply.text;
}`,

  "the-agent-loop": `const MAX_STEPS = 12;
const TOKEN_BUDGET = 150_000;

async function runAgent(task, user) {
  const messages = [{ role: "user", content: task }];
  let usedTokens = 0;
  const recentCalls = [];

  for (let step = 0; step < MAX_STEPS; step++) {           // hard cap, enforced by us
    const reply = await model(messages, { tools: TOOLS });
    usedTokens += reply.usage.totalTokens;

    if (reply.toolCalls.length === 0) return reply.text;   // the model is done

    if (usedTokens >= TOKEN_BUDGET) {
      return "Stopped: the task used too many tokens. Here is what I found so far.";
    }

    messages.push(reply);
    for (const call of reply.toolCalls) {
      const sig = \`\${call.name}:\${stableStringify(call.args)}\`;
      recentCalls.push(sig);
      if (recentCalls.length >= 3 && recentCalls.slice(-3).every((s) => s === sig)) {   // same call three times: stuck
        return "Stopped: the agent repeated the same action.";
      }
      const result = await runTool(call.name, call.args, user);   // validated and authorised (lesson 1)
      messages.push({ role: "tool", tool_call_id: call.id, content: truncate(result) });
    }
  }

  return "Stopped: step limit reached without a final answer.";
}`,

  "planning-and-memory": `// A step looks like { id, goal, deps: [], done: false, result: "" }.

/** First unfinished step whose dependencies are all finished. */
function nextStep(plan) {
  const finished = new Set(plan.filter((s) => s.done).map((s) => s.id));
  return plan.find((s) => !s.done && s.deps.every((d) => finished.has(d))) ?? null;
  // null means nothing runnable: all done, or blocked
}

async function compact(messages, keepLast = 6, threshold = 40_000) {
  if (countTokens(messages) < threshold || messages.length <= keepLast + 1) return messages;
  const head = messages.slice(0, 1);
  const old = messages.slice(1, -keepLast);
  const recent = messages.slice(-keepLast);
  const summary = await llm(\`Summarise these steps. Keep exact ids, numbers and decisions:\\n\${JSON.stringify(old)}\`);
  return [...head, { role: "user", content: \`Summary of earlier work:\\n\${summary}\` }, ...recent];
}

function scratchpad(plan) {
  return plan.map((s) => \`[\${s.done ? "x" : " "}] \${s.id}: \${s.goal}\`).join("\\n");   // placed near the end of the prompt
}`,

  "tool-design-and-mcp": `const SEARCH_ORDERS = {
  name: "search_orders",
  description:
    "Search the signed-in customer's orders by free text (product name, status, date). " +
    "Use when the user asks about orders without giving an exact id. " +
    "If they give an id like ORD-1234, call get_order instead. " +
    "Returns up to 'limit' matches, newest first, each with id, status, total and date. " +
    "If 'next_page' is present, call again with it to see more.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "e.g. 'running shoes' or 'delayed'" },
      limit: { type: "integer", minimum: 1, maximum: 20, default: 5 },
      page_token: { type: "string", description: "next_page from a previous result" },
    },
    required: ["query"],
  },
};

async function searchOrders(user, query, limit = 5, pageToken = null) {
  const bounded = Math.max(1, Math.min(limit, 20));   // never trust a model-supplied bound
  const { rows, nextToken } = await db.search({ owner: user.id, text: query, limit: bounded, after: pageToken });
  if (rows.length === 0) {
    return { matches: [], hint: "No orders matched. Try fewer words, or search by status such as 'delayed'." };
  }
  return {
    matches: rows.map((r) => ({ id: r.id, status: r.status, total: r.total, date: r.date })),
    ...(nextToken ? { next_page: nextToken } : {}),   // compact, paginated
  };
}`,

  "multi-agent-patterns": `const MAX_WORKERS = 5;

async function research(question) {
  // 1. The lead plans: independent sub-questions as structured output.
  const plan = await leadModel.json(
    \`Split into at most \${MAX_WORKERS} independent sub-questions: \${question}\`,
  );
  const subs = plan.sub_questions.slice(0, MAX_WORKERS);   // enforced in code

  // 2. Each worker gets ONLY its brief, runs its own bounded loop, returns a compact result.
  const work = (sub) => {
    const brief = \`Answer this one sub-question and return JSON with 'finding' and 'sources':\\n\${sub}\`;
    return runAgent(brief, { tools: SEARCH_TOOLS, maxSteps: 8 });
  };

  const results = await Promise.all(subs.map(work));       // parallel

  // 3. The lead synthesises, reconciling conflicts, and cites.
  return leadModel.text(
    "Combine these findings into one answer. Note disagreements and cite sources.\\n" +
      JSON.stringify(results),
  );
}`,

  "agent-guardrails-and-reliability": `const POLICY = {
  deny: ["drop_table", "delete_user"],
  ask: ["send_email", "transfer_money"],
  allow: ["search_docs", "read_file", "transfer_money_small"],
  limits: { transfer_money_small: { arg: "amount", maxAuto: 100 } },
};

function authorise(name, args) {
  if (POLICY.deny.includes(name)) return "deny";
  if (POLICY.ask.includes(name)) return "ask";
  if (POLICY.allow.includes(name)) {
    const limit = POLICY.limits[name];
    if (limit && (args[limit.arg] ?? 0) > limit.maxAuto) return "ask";   // over the automatic ceiling
    return "allow";
  }
  return "deny";                                    // default deny: unknown tools never run
}

async function executeGuarded(call, runId, step) {
  const decision = authorise(call.name, call.args);
  await auditLog(runId, step, call.name, call.args, decision);

  if (decision === "deny") return { error: "This action is not permitted." };
  if (decision === "ask" && !(await humanApproves(call.name, call.args))) {   // shows the EXACT arguments
    return { error: "The user declined this action." };
  }

  const idempotencyKey = \`\${runId}/\${step}\`;        // same key on retry: executed once
  return TOOLS[call.name]({ ...call.args, idempotencyKey });
}`,

  "building-an-mcp-server": `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// stdout is the protocol channel on stdio. Never console.log to it.
const log = (...args) => console.error("[orders]", ...args);

const server = new McpServer({ name: "orders", version: "1.0.0" });

const ORDERS = {
  "A-1042": { status: "shipped", totalCents: 4999 },
  "A-1043": { status: "processing", totalCents: 1250 },
};

server.tool(
  "get_order_status",
  "Look up the current status of one order. Use this when the customer asks where their order is. " +
    "Returns the status and the order total. Order ids look like A-1042.",
  { order_id: z.string() },
  async ({ order_id }) => {
    const order = ORDERS[order_id];
    if (!order) {
      // A tool failure the model can recover from: say what a valid id looks like.
      return {
        isError: true,
        content: [{ type: "text", text: \`No order '\${order_id}'. Order ids look like A-1042.\` }],
      };
    }
    log("status lookup", order_id);
    return {
      content: [{ type: "text", text: \`\${order_id}: \${order.status}, total \${(order.totalCents / 100).toFixed(2)}\` }],
    };
  },
);

server.tool(
  "list_orders",
  "List order ids with the given status, newest first. At most 25 results.",
  { status: z.string().default("processing"), limit: z.number().int().default(10) },
  async ({ status, limit }) => {
    const bounded = Math.max(1, Math.min(limit, 25));   // bound the output, whatever was asked
    const ids = Object.keys(ORDERS).filter((id) => ORDERS[id].status === status);
    return { content: [{ type: "text", text: JSON.stringify(ids.slice(0, bounded)) }] };
  },
);

await server.connect(new StdioServerTransport());       // or the HTTP transport for a remote server`,
};
