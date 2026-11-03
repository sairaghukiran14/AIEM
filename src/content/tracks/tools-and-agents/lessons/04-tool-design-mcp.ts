import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "tool-design-and-mcp",
  order: 4,
  title: "Tool Design & MCP",
  summary:
    "A tool's name and description are its only documentation for the model. Design tools like an API for a careful but literal colleague, and learn the protocol that standardises them.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "When an agent misuses a tool, the cause is often the tool, not the model. The model sees a name, a description and an argument schema, and nothing else. If those are vague, overlapping or misleading, it will guess. **Tool design is prompt design** (Track 2), applied to your API surface.",
    },
    {
      type: "sorter",
      title: "Good tool or needs redesign?",
      prompt: "Judge each tool or tool response as an agent would experience it.",
      categories: ["Good", "Needs redesign"],
      items: [
        { text: "get_order(order_id) returning status, total and items as a small JSON object", answer: 0, why: "One clear job, a well-named argument, and a compact result." },
        { text: "do_stuff(command: string) that runs whatever it is given", answer: 1, why: "A vague name and a free-form string leave the model guessing, and it is a security hole." },
        { text: "Error text: \"Error 500\"", answer: 1, why: "The model cannot recover from this. A good error says what was wrong and how to fix it." },
        { text: "Error text: \"No order ORD-123. Order ids look like ORD-1234 (4 digits).\"", answer: 0, why: "Actionable: the model can correct its next call." },
        { text: "search_orders(query, limit) with a limit capped at 20 and a next-page token", answer: 0, why: "Bounded output and pagination protect the context window." },
      ],
    },
    { type: "h", text: "Principles of a tool the model can use" },
    {
      type: "ul",
      items: [
        "**One clear purpose per tool**, named like a verb phrase: `search_orders`, not `orders` or `db`.",
        "**A description that says when to use it** (and when not to), what each argument means, formats with an example, and what comes back.",
        "**Few arguments, constrained values**: enums and formats instead of free strings.",
        "**Compact results**: return what the next step needs, with a limit and pagination, not a whole table.",
        "**Helpful errors** that state the problem and the fix, because the error is the model's only feedback.",
        "**Safe by design**: scope to the calling user, make destructive actions separate and explicit, and make write tools idempotent.",
        "**Do not mirror your REST API one to one.** An endpoint list is for developers; the agent needs task-shaped operations.",
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "More tools is not better",
      text: "Each added tool is more prompt tokens (lesson 1) and one more option the model can confuse with another. Selection accuracy falls as near-duplicates pile up. Merge overlapping tools, and for very large toolsets retrieve the few relevant tools per request.",
    },
  ],

  underTheHood: [
    { type: "h", text: "MCP: a standard way to connect tools" },
    {
      type: "p",
      text: "The **Model Context Protocol (MCP)** is an open standard for connecting AI applications to tools and data. Instead of writing a custom integration for every pair of application and service, a service exposes an **MCP server** once and any MCP-capable application can use it. It is a JSON-RPC based protocol with a client-server shape.",
    },
    {
      type: "stepper",
      title: "How an MCP connection works",
      steps: [
        { label: "Three roles", detail: "The host is the AI application. It runs an MCP client for each server it connects to. An MCP server wraps a service or data source and exposes capabilities.", items: ["Host app", "MCP client", "MCP server"], mark: [0, 1, 2] },
        { label: "Connect and discover", detail: "The client connects over a transport (a local process through stdio, or HTTP for remote servers) and asks the server what it offers.", items: ["initialize", "list tools", "list resources"], mark: [1] },
        { label: "Three kinds of capability", detail: "Tools are actions the model can choose to call. Resources are data the application can attach as context. Prompts are reusable templates a user can invoke.", items: ["tools: model-controlled", "resources: app-controlled", "prompts: user-controlled"], mark: [0, 1, 2] },
        { label: "Use", detail: "The host passes tool definitions to the model like any tool (lesson 1). When the model requests a call, the host routes it through the client to the server, and returns the result.", items: ["model asks", "host approves", "server runs", "result returned"], mark: [1, 2] },
        { label: "Keep a human in the loop", detail: "Good hosts show which tools a server offers and ask the user to approve sensitive calls, because the server and its outputs are not automatically trustworthy.", items: ["approval prompt", "scoped permissions"], mark: [0] },
      ],
      caption: "MCP standardises the plumbing. It does not make a tool safe or well designed.",
    },
    { type: "h", text: "Security with third-party tools" },
    {
      type: "ul",
      items: [
        "**Descriptions are prompt text.** A malicious or compromised server can put instructions in a tool description or result (Track 2: injection). Treat third-party servers as untrusted code.",
        "**Least privilege**: expose only the tools needed, with narrow credentials and read-only access where possible.",
        "**Review and pin** the servers you install, as you would any dependency, and watch for tools whose behaviour changes after approval.",
        "**Approval for side effects**: sending, writing, paying and deleting should require confirmation in the host (lesson 6).",
        "**Combine with the three-ingredient check**: private data, untrusted content and an outbound channel in the same agent is the dangerous mix.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"how do you design tools for an agent?\"",
      text: "Few, task-shaped tools with one purpose each; descriptions that say when to use them, with argument examples; constrained inputs; compact paginated results; actionable errors; safe by default and idempotent. Then say MCP standardises integration, and that third-party servers must be treated as untrusted.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A well-described tool, a bounded result and an actionable error.",
    code: `SEARCH_ORDERS = {
    "name": "search_orders",
    "description": (
        "Search the signed-in customer's orders by free text (product name, status, date). "
        "Use when the user asks about orders without giving an exact id. "
        "If they give an id like ORD-1234, call get_order instead. "
        "Returns up to 'limit' matches, newest first, each with id, status, total and date. "
        "If 'next_page' is present, call again with it to see more."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "e.g. 'running shoes' or 'delayed'"},
            "limit": {"type": "integer", "minimum": 1, "maximum": 20, "default": 5},
            "page_token": {"type": "string", "description": "next_page from a previous result"},
        },
        "required": ["query"],
    },
}


def search_orders(user, query: str, limit: int = 5, page_token: str | None = None) -> dict:
    limit = max(1, min(limit, 20))                              # never trust a model-supplied bound
    rows, next_token = db.search(owner=user.id, text=query, limit=limit, after=page_token)
    if not rows:
        return {"matches": [], "hint": "No orders matched. Try fewer words, or search by status such as 'delayed'."}
    return {
        "matches": [{"id": r.id, "status": r.status, "total": r.total, "date": r.date} for r in rows],
        **({"next_page": next_token} if next_token else {}),    # compact, paginated
    }`,
  },

  interview: [
    {
      question: "How do you design a good tool for an LLM agent?",
      answer:
        "Give it one clear purpose and a verb-phrase name, write a description that says when to use it, what each argument means with an example, and what it returns, constrain inputs with enums and formats, return compact paginated results, and make errors actionable. I keep the toolset small, scope everything to the calling user, and make destructive operations explicit and idempotent.",
      weakAnswer:
        "Expose the API endpoints as tools. — A raw endpoint list is not shaped for the model's task.",
    },
    {
      question: "What does the Model Context Protocol (MCP) provide?",
      answer:
        "A standard client-server protocol for connecting AI applications to tools and data. A service exposes an MCP server once, exposing tools the model can call, resources the application can attach, and prompt templates, and any MCP-capable host can connect over stdio or HTTP. It removes per-integration glue code, but it does not make a tool safe, so approvals, least privilege and trust decisions remain the host's job.",
      followUp: "What are the security risks of third-party MCP servers?",
    },
    {
      question: "Why can giving an agent more tools make it worse?",
      answer:
        "Every definition costs tokens on every request and adds another option the model may confuse with similar ones, so selection accuracy and latency suffer. I merge overlapping tools, keep descriptions distinct, and for large catalogues retrieve only the relevant tools for each request.",
    },
    {
      question: "What makes a tool error message useful to an agent?",
      answer:
        "It states what was wrong and how to fix it in terms the model can act on, such as the expected format with an example or valid alternatives, rather than a status code or stack trace. The error is the model's only feedback, so a good one often turns a failed call into a correct retry, and I avoid leaking internal details.",
    },
    {
      question: "How should you treat tool descriptions and results from a third-party server?",
      answer:
        "As untrusted input. Descriptions and results are text that enters the model's context, so a malicious or compromised server can include instructions that act as injection. I vet and pin servers, give them least privilege and narrow credentials, require approval for side effects, and avoid combining untrusted content, private data and an outbound channel in one agent.",
    },
  ],

  challenges: [
    {
      id: "ag-4-quiz",
      kind: "quiz",
      title: "Checkpoint: tool design and MCP",
      blurb: "Five questions on tools and the protocol.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is the model's only knowledge of a tool?",
          options: [
            "The source code of the function",
            "Its name, description and argument schema",
            "The server's logs",
            "Previous users' calls",
          ],
          correctIndex: 1,
          explanation:
            "The definition is the documentation. If it is vague, the model guesses.",
        },
        {
          id: "q2",
          prompt: "Which error message is most useful to an agent?",
          options: [
            "Error",
            "Error 500",
            "No order ORD-123. Order ids look like ORD-1234 (4 digits).",
            "Something went wrong, please try later",
          ],
          correctIndex: 2,
          explanation:
            "It names the problem and the fix, so the next call can be correct.",
        },
        {
          id: "q3",
          prompt: "What are the three kinds of capability an MCP server can expose?",
          options: [
            "Tools, resources and prompts",
            "Models, tokens and embeddings",
            "Agents, memories and plans",
            "Routes, pages and assets",
          ],
          correctIndex: 0,
          explanation:
            "Tools are model-controlled actions, resources are application-attached data, prompts are user-invoked templates.",
        },
        {
          id: "q4",
          prompt: "Why are tool descriptions from a third-party MCP server a security concern?",
          options: [
            "They are very long",
            "They are text placed in the model's context, so a malicious server can embed instructions in them",
            "They disable caching",
            "They change the model weights",
          ],
          correctIndex: 1,
          explanation:
            "Anything in the context can influence the model. Treat third-party servers as untrusted.",
        },
        {
          id: "q5",
          prompt: "A search tool returns an entire table of 50,000 rows. What is wrong?",
          options: [
            "Nothing, more data helps",
            "It floods the context window and cost; results should be bounded and paginated",
            "Tables cannot be JSON",
            "It will be cached forever",
          ],
          correctIndex: 1,
          explanation:
            "Compact, limited results protect the context budget and keep the model focused (Track 1).",
        },
      ],
    },
    {
      id: "ag-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a tool definition",
      blurb: "The agent uses this tool for the wrong things and passes nonsense arguments. Find the line.",
      language: "python",
      lines: [
        "TOOLS = [{",
        "    \"name\": \"db\",",
        "    \"description\": \"Database access\",",
        "    \"input_schema\": {\"type\": \"object\", \"properties\": {\"q\": {\"type\": \"string\"}}},",
        "}]",
      ],
      buggyLine: 3,
      reasons: [
        "the description must be shorter",
        "'Database access' tells the model neither when to use the tool nor what q should contain, so it guesses",
        "the schema must not have properties",
        "the name must be uppercase",
      ],
      correctReasonIndex: 1,
      explanation:
        "The description is the model's only documentation. State the purpose, when to use it, what each argument means with an example, limits, and what is returned.",
      fix: "\"description\": \"Search the customer's orders by free text. Use when no exact id is known. Returns up to 20 matches...\"",
      xp: 40,
    },
    {
      id: "ag-4-code",
      kind: "code",
      title: "Code challenge: rank tools for a request",
      blurb: "For a large toolset, pick the few tools whose descriptions best match the request.",
      functionName: "rankTools",
      starter: `/**
 * tools: [{ name, description }]
 *
 * Score each tool by how many DISTINCT words of \`query\` appear in the tool's
 * name + description. Words are lowercase runs of letters and digits
 * (split on anything else). Return the names of tools with a score above 0,
 * sorted by score descending (ties keep the original tool order).
 *
 * rankTools("refund order", [
 *   { name: "get_order",    description: "Look up an order by id" },
 *   { name: "issue_refund", description: "Refund a paid order" },
 *   { name: "send_email",   description: "Send an email" },
 * ]) -> ["issue_refund", "get_order"]
 */
function rankTools(query, tools) {
  // your code here
}`,
      tests: [
        {
          name: "the best match comes first, non-matches are dropped",
          args: ["refund order", [
            { name: "get_order", description: "Look up an order by id" },
            { name: "issue_refund", description: "Refund a paid order" },
            { name: "send_email", description: "Send an email" },
          ]],
          expected: ["issue_refund", "get_order"],
        },
        {
          name: "matching is case-insensitive",
          args: ["WEATHER", [{ name: "get_weather", description: "Current Weather for a city" }]],
          expected: ["get_weather"],
        },
        {
          name: "repeated query words count once",
          args: ["order order order", [
            { name: "a", description: "order" },
            { name: "b", description: "order status" },
          ]],
          expected: ["a", "b"],
        },
        {
          name: "ties keep the original order",
          args: ["email", [
            { name: "first", description: "send an email" },
            { name: "second", description: "read an email" },
          ]],
          expected: ["first", "second"],
        },
        { name: "nothing matches", args: ["xyz", [{ name: "a", description: "something else" }]], expected: [] },
        { name: "punctuation is ignored", args: ["order-id", [{ name: "lookup", description: "find by ID, quickly" }]], expected: ["lookup"] },
        { name: "no tools", args: ["anything", []], expected: [] },
      ],
      hints: [
        "Turn a string into a set of words with toLowerCase and a match for runs of letters and digits.",
        "A tool's score is the number of query words that are in the set built from its name and description together.",
        "Keep each tool's original index, filter out scores of 0, then sort by score descending and index ascending.",
      ],
      solution: `function rankTools(query, tools) {
  const words = (text) => new Set(text.toLowerCase().match(/[a-z0-9]+/g) || []);
  const wanted = words(query);

  return tools
    .map((tool, index) => {
      const have = words(tool.name + " " + tool.description);
      let score = 0;
      for (const w of wanted) if (have.has(w)) score += 1;
      return { name: tool.name, index, score };
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((t) => t.name);
}`,
      xp: 70,
    },
  ],
};
