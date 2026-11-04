import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "building-an-mcp-server",
  order: 7,
  title: "Building an MCP Server",
  summary:
    "Lesson 4 introduced MCP. Here you build one: the message flow on the wire, how to describe tools, how to report errors the model can act on, and what changes when a server goes remote.",
  minutes: 16,

  concept: [
    {
      type: "p",
      text: "Writing an **MCP server** is how you hand your own system to any MCP-capable assistant without writing a separate integration for each. Your server describes what it can do; the host application decides which of those descriptions to show a model. Most of the work is not protocol plumbing, which an SDK handles, but the same design judgement as lesson 4: small, well-described, safe tools.",
    },
    { type: "h", text: "What a server can expose" },
    {
      type: "table",
      headers: ["Capability", "Who decides to use it", "Typical use"],
      rows: [
        [
          "**Tools**",
          "the **model** chooses to call it",
          "look up an order, create a ticket, run a query",
        ],
        [
          "**Resources**",
          "the **application** attaches it as context",
          "a file, a database row, a document addressed by a URI",
        ],
        [
          "**Prompts**",
          "the **user** picks it",
          "a reusable template such as \"summarise this incident\"",
        ],
      ],
    },
    {
      type: "p",
      text: "Start with tools. They are the part most hosts support and the part that does work. Add resources when you have read-only data that is better attached than fetched, and prompts when you want to ship a vetted workflow.",
    },
    { type: "h", text: "Choosing a transport" },
    {
      type: "ul",
      items: [
        "**stdio.** The host launches your server as a child process and talks to it over standard input and output. Simple, local, and runs with the user's own permissions. The right default for a developer tool.",
        "**Streamable HTTP.** Your server is a web service that many clients reach over the network. You now own authentication, authorisation, rate limits and uptime, exactly as for any API.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "On stdio, stdout belongs to the protocol",
      text: "Every byte your server writes to standard output is parsed as a protocol message. A stray `print` for debugging corrupts the stream and the client disconnects with a confusing error. Log to standard error, always.",
    },
    { type: "h", text: "Design checklist for each tool" },
    {
      type: "ol",
      items: [
        "**One job, named for the action.** `get_order_status` beats `orders`.",
        "**A description written for a model.** Say what it does, when to use it, and what it returns. This is prompt text.",
        "**A strict input schema.** Types, enums, bounds and a `required` list, so bad calls are rejected before your code runs.",
        "**Bounded output.** Page or truncate. A tool that returns a megabyte burns the context window.",
        "**Annotations that tell the truth.** Mark read-only tools as read-only so hosts can approve them with less friction.",
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "The conversation on the wire" },
    {
      type: "p",
      text: "MCP messages are **JSON-RPC 2.0**. A request has an `id` and expects a response with the same `id`. A **notification** has no `id` and gets no response. Every session follows the same opening.",
    },
    {
      type: "stepper",
      title: "An MCP session, message by message",
      steps: [
        {
          label: "initialize",
          detail:
            "The client sends the protocol version it speaks and the capabilities it supports. The server replies with the version it will use and its own capabilities, such as whether it has tools.",
          items: ["client hello", "server capabilities", "version agreed"],
          mark: [1],
        },
        {
          label: "initialized",
          detail:
            "The client sends a notification saying it is ready. No response is expected. Only now do normal requests start.",
          items: ["notification, no id"],
          mark: [0],
        },
        {
          label: "tools/list",
          detail:
            "The client asks what tools exist. Each has a name, a description and a JSON Schema for its input. Long lists are paged with a cursor. A server can notify the client when the list changes.",
          items: ["name", "description", "inputSchema"],
          mark: [2],
        },
        {
          label: "tools/call",
          detail:
            "When the model asks for a tool, the host (after any approval) sends a call with the tool name and arguments. The server runs it and returns content blocks.",
          items: ["name + arguments", "run", "content[]"],
          mark: [1],
        },
      ],
      caption:
        "The SDK does all of this for you. It is still worth reading a real trace once, because that is what you will debug.",
    },
    {
      type: "code",
      language: "json",
      code: `// tools/call request
{ "jsonrpc": "2.0", "id": 7, "method": "tools/call",
  "params": { "name": "get_order_status",
              "arguments": { "order_id": "A-1042" } } }

// success response
{ "jsonrpc": "2.0", "id": 7,
  "result": { "content": [ { "type": "text", "text": "A-1042: shipped" } ],
              "isError": false } }

// a tool failure the model can read and recover from
{ "jsonrpc": "2.0", "id": 8,
  "result": { "content": [ { "type": "text",
              "text": "No order A-9999. Order ids look like A-1042." } ],
              "isError": true } }

// a protocol failure: the request itself was invalid
{ "jsonrpc": "2.0", "id": 9,
  "error": { "code": -32601, "message": "Method not found: tools/run" } }`,
      caption:
        "Two layers of failure with two shapes: the protocol (an error object) and the tool itself (a normal result with isError set).",
    },
    { type: "h", text: "Errors: say it to the model, not past it" },
    {
      type: "p",
      text: "A JSON-RPC error means the request was malformed: an unknown method, a bad message. The model usually never sees it, because the host handles it. When a tool runs but fails, such as an order that does not exist or an argument outside the allowed range, return a normal result with `isError: true` and a message that says what to do next. The model reads that text and can correct itself and retry. A bare \"failed\" gives it nothing to work with.",
    },
    { type: "h", text: "Annotations are hints, not security" },
    {
      type: "p",
      text: "Tools can carry hints such as `readOnlyHint`, `destructiveHint` and `idempotentHint`. Hosts use them to decide how much to ask the user. But a hint is the server's own claim. A server you do not control can lie, so a host must not treat it as a guarantee, and your own server must enforce permissions in code regardless of what its annotations say.",
    },
    { type: "h", text: "What changes when the server is remote" },
    {
      type: "ul",
      items: [
        "**Authenticate every caller.** Anyone who can reach the URL can send requests. The MCP specification uses OAuth-based authorisation for remote servers.",
        "**Authorise per user and per tool.** A valid token is not permission to call every tool. Check scope inside each handler.",
        "**Never pass the caller's token on to other services.** Use credentials issued to your server, and keep a record of who asked for what.",
        "**Treat arguments as untrusted input.** Validate and bound them like any public API: injection, path traversal and runaway queries are all still possible.",
        "**Rate-limit and time-box.** One slow tool should not hold a connection open forever.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What interviewers are listening for",
      text: "That you separate the protocol from the design. Say the protocol is JSON-RPC over stdio or HTTP with an initialize handshake, then spend your time on what matters: narrow tools, strict schemas, bounded output, errors the model can act on, and server-side authorisation that does not rely on annotations.",
    },
  ],

  codeExample: {
    language: "python",
    caption:
      "A small, read-mostly MCP server using the official Python SDK. Note the narrow tools, the validation, the actionable error, and that logging goes to stderr.",
    code: `import logging
import sys
from mcp.server.fastmcp import FastMCP

# stdout is the protocol channel on stdio. Never print() to it.
logging.basicConfig(stream=sys.stderr, level=logging.INFO)
log = logging.getLogger("orders")

mcp = FastMCP("orders")

ORDERS = {
    "A-1042": {"status": "shipped", "total_cents": 4999},
    "A-1043": {"status": "processing", "total_cents": 1250},
}


@mcp.tool()
def get_order_status(order_id: str) -> str:
    """Look up the current status of one order.

    Use this when the customer asks where their order is. Returns the status
    and the order total. Order ids look like A-1042.
    """
    order = ORDERS.get(order_id)
    if order is None:
        # A tool failure the model can recover from: say what a valid id looks like.
        raise ValueError(f"No order {order_id!r}. Order ids look like A-1042.")
    log.info("status lookup %s", order_id)
    return f"{order_id}: {order['status']}, total {order['total_cents'] / 100:.2f}"


@mcp.tool()
def list_orders(status: str = "processing", limit: int = 10) -> list[str]:
    """List order ids with the given status, newest first. At most 25 results."""
    limit = max(1, min(limit, 25))        # bound the output, whatever was asked
    ids = [oid for oid, o in ORDERS.items() if o["status"] == status]
    return ids[:limit]


if __name__ == "__main__":
    mcp.run(transport="stdio")             # or the HTTP transport for a remote server`,
  },

  interview: [
    {
      question: "What is MCP and what problem does it solve?",
      answer:
        "The Model Context Protocol is an open standard for connecting AI applications to tools and data. Without it, every application needs a custom integration for every service. With it, a service publishes one MCP server and any MCP-capable host can use it, much as a language server protocol lets any editor use any language tool. It standardises discovery and calling over JSON-RPC, through stdio for local servers or HTTP for remote ones. It does not make a tool safe or well designed. That is still on the author of the server and the host.",
      weakAnswer:
        "It's a way to make the model smarter by giving it plugins. — It confuses a transport and discovery standard with model capability, and says nothing about trust.",
    },
    {
      question: "Your MCP server works in testing but the client disconnects on startup. What do you check first?",
      answer:
        "On a stdio server, the first suspect is something writing to standard output that is not a protocol message: a debug print, a library banner, a progress bar. The client parses stdout as JSON-RPC, so any stray text breaks the stream. I would redirect all logging to standard error and re-run. After that I would check that the server answers the initialize request with a compatible protocol version, and that startup is fast enough for the client's timeout.",
    },
    {
      question: "How should a tool report a failure?",
      answer:
        "It depends on who needs to act. If the request itself was invalid, such as an unknown method, that is a JSON-RPC error. If the tool ran and could not do what was asked, I return a normal result with isError set and a message the model can use: what went wrong, and what a valid input looks like. The model reads it and can try again. A vague failure message wastes a turn, and throwing past the protocol layer hides the problem from the one party that could fix it.",
      followUp: "How would you stop it retrying forever?",
    },
    {
      question: "You expose an MCP server over HTTP to your whole company. What are the security concerns?",
      answer:
        "Anything reachable over HTTP needs authentication, and the specification uses OAuth for that. Then authorisation: a valid token should not allow every tool, so I check the caller's scope inside each handler and keep read and write tools separate. I would not forward the caller's token to downstream systems, and I would record who called what. Arguments are untrusted input, so the usual injection and path traversal defences apply. And I would rate-limit and set timeouts. I would also not rely on annotations like readOnlyHint for enforcement, because they are only hints.",
    },
    {
      question: "When should something be an MCP tool, a resource or a prompt?",
      answer:
        "It comes down to who decides to use it. A tool is for an action or lookup the model should be able to choose to run mid-conversation, such as checking an order or creating a ticket. A resource is data the application attaches as context, addressed by a URI, so it suits read-only material like a file or a record that is better supplied than searched for. A prompt is a template the user picks, which is how you ship a vetted workflow. If I find myself wrapping static read-only content in a tool, it is probably a resource, and if the model should never pick it on its own, it is probably a prompt.",
    },
  ],

  challenges: [
    {
      id: "ag-7-quiz",
      kind: "quiz",
      title: "Checkpoint: MCP servers",
      blurb: "Five questions on transports, errors and trust.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt:
            "A developer tool should run on each user's machine, started by the assistant, with no network exposure. Which transport fits?",
          options: [
            "Streamable HTTP behind a load balancer",
            "A public WebSocket endpoint",
            "stdio, with the host launching the server as a child process",
            "Email",
          ],
          correctIndex: 2,
          explanation:
            "stdio is the simple local default: no port, no network authentication, and the server runs with the user's own permissions.",
        },
        {
          id: "q2",
          prompt: "Which MCP capability is chosen by the model during a conversation?",
          options: [
            "Tools",
            "Resources",
            "Prompts",
            "Roots",
          ],
          correctIndex: 0,
          explanation:
            "Tools are model-controlled. Resources are attached by the application and prompts are picked by the user.",
        },
        {
          id: "q3",
          prompt:
            "The model calls your tool with an order id that does not exist. What is the best response?",
          options: [
            "Crash the server so the host restarts it",
            "Return an empty string",
            "Return a JSON-RPC protocol error with a generic code",
            "Return a normal result with isError true and a message saying no such order exists and what a valid id looks like",
          ],
          correctIndex: 3,
          explanation:
            "The model reads the result text. A specific message lets it correct the id and retry. A protocol error usually never reaches the model, and an empty string gives it nothing.",
        },
        {
          id: "q4",
          prompt:
            "A third-party MCP server marks its delete_records tool with readOnlyHint: true. How should the host treat that?",
          options: [
            "Trust it, because the server declared it",
            "As a hint only: a server you do not control can be wrong or hostile, so sensitive calls still need approval",
            "Reject the server, since hints are not allowed",
            "Hide the tool from the user",
          ],
          correctIndex: 1,
          explanation:
            "Annotations are the server's own claims. They are useful for convenience, never a security boundary, and untrusted servers need the host's own controls.",
        },
        {
          id: "q5",
          prompt:
            "You publish an MCP server over HTTP. A user presents a valid token. What must the server still do?",
          options: [
            "Nothing: a valid token means full access",
            "Hand the user's token to the database so it decides",
            "Check, inside each tool, that this user's scope allows that action",
            "Ask the model whether the call looks safe",
          ],
          correctIndex: 2,
          explanation:
            "Authentication says who is calling; authorisation says what they may do. Check scope per tool, and use credentials issued to your server rather than forwarding the caller's.",
        },
      ],
    },
    {
      id: "ag-7-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a server that disconnects on startup",
      blurb:
        "This stdio MCP server works when run on its own but the host reports a protocol error and drops it.",
      language: "python",
      lines: [
        "def main():",
        "    server = build_server()",
        "    print('orders server starting')",
        "    server.run(transport='stdio')",
      ],
      buggyLine: 3,
      reasons: [
        "the server must be built after run() is called",
        "on stdio, standard output carries the JSON-RPC messages, so this text corrupts the stream; it should go to stderr",
        "print is too slow for a server and blocks the event loop",
        "stdio servers cannot start without an HTTP port",
      ],
      correctReasonIndex: 1,
      explanation:
        "The client reads stdout as protocol messages. A plain-text line there is not valid JSON-RPC, so the session fails before it starts. Send logs to standard error instead.",
      fix: "print('orders server starting', file=sys.stderr)",
      xp: 40,
    },
    {
      id: "ag-7-code",
      kind: "code",
      title: "Code challenge: route an MCP request",
      blurb:
        "Write the dispatch layer of a tiny MCP server: list tools, call them, and report the two kinds of failure correctly.",
      functionName: "routeRequest",
      starter: `/**
 * tools: [{ name, description, inputSchema, ... }] where inputSchema.required
 *        is an optional array of required argument names.
 * request: { jsonrpc: "2.0", id?, method, params? }
 *
 * Return the response object, with keys in exactly this order:
 *
 *  - No \`id\` on the request (undefined) -> it is a notification: return null.
 *    (An id of 0 IS a request.)
 *
 *  - method "tools/list" ->
 *      { jsonrpc: "2.0", id, result: { tools: [ { name, description, inputSchema }, ... ] } }
 *    Include only those three fields for each tool.
 *
 *  - method "tools/call" with params { name, arguments? }:
 *      unknown tool name ->
 *        { jsonrpc: "2.0", id, error: { code: -32602, message: "Unknown tool: <name>" } }
 *      a required argument is missing (report the first one, in the order of
 *      \`required\`) ->
 *        { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "Missing required argument: <arg>" }], isError: true } }
 *      otherwise ->
 *        { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: "Called <name>" }], isError: false } }
 *
 *  - any other method ->
 *      { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found: <method>" } }
 */
function routeRequest(tools, request) {
  // your code here
}`,
      tests: [
        {
          name: "a request without an id is a notification and gets no response",
          args: [[], { jsonrpc: "2.0", method: "notifications/initialized" }],
          expected: null,
        },
        {
          name: "tools/list returns only name, description and inputSchema",
          args: [
            [
              {
                name: "get_order_status",
                description: "Look up an order.",
                inputSchema: { type: "object", required: ["order_id"] },
                internalNotes: "never expose this",
              },
            ],
            { jsonrpc: "2.0", id: 1, method: "tools/list" },
          ],
          expected: {
            jsonrpc: "2.0",
            id: 1,
            result: {
              tools: [
                {
                  name: "get_order_status",
                  description: "Look up an order.",
                  inputSchema: { type: "object", required: ["order_id"] },
                },
              ],
            },
          },
        },
        {
          name: "an id of 0 is still a request",
          args: [[], { jsonrpc: "2.0", id: 0, method: "tools/list" }],
          expected: { jsonrpc: "2.0", id: 0, result: { tools: [] } },
        },
        {
          name: "an unknown tool is a protocol error",
          args: [
            [{ name: "a", description: "d", inputSchema: { type: "object" } }],
            { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "b", arguments: {} } },
          ],
          expected: { jsonrpc: "2.0", id: 2, error: { code: -32602, message: "Unknown tool: b" } },
        },
        {
          name: "a missing required argument is a tool error the model can read",
          args: [
            [
              {
                name: "refund",
                description: "d",
                inputSchema: { type: "object", required: ["order_id", "reason"] },
              },
            ],
            {
              jsonrpc: "2.0",
              id: 3,
              method: "tools/call",
              params: { name: "refund", arguments: { reason: "damaged" } },
            },
          ],
          expected: {
            jsonrpc: "2.0",
            id: 3,
            result: {
              content: [{ type: "text", text: "Missing required argument: order_id" }],
              isError: true,
            },
          },
        },
        {
          name: "reports the first missing argument in the order of required",
          args: [
            [
              {
                name: "refund",
                description: "d",
                inputSchema: { type: "object", required: ["order_id", "reason"] },
              },
            ],
            { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "refund" } },
          ],
          expected: {
            jsonrpc: "2.0",
            id: 4,
            result: {
              content: [{ type: "text", text: "Missing required argument: order_id" }],
              isError: true,
            },
          },
        },
        {
          name: "a valid call succeeds",
          args: [
            [
              {
                name: "get_order_status",
                description: "d",
                inputSchema: { type: "object", required: ["order_id"] },
              },
            ],
            {
              jsonrpc: "2.0",
              id: 5,
              method: "tools/call",
              params: { name: "get_order_status", arguments: { order_id: "A-1042" } },
            },
          ],
          expected: {
            jsonrpc: "2.0",
            id: 5,
            result: { content: [{ type: "text", text: "Called get_order_status" }], isError: false },
          },
        },
        {
          name: "a tool with no required list accepts a call with no arguments",
          args: [
            [{ name: "ping", description: "d", inputSchema: { type: "object" } }],
            { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "ping" } },
          ],
          expected: {
            jsonrpc: "2.0",
            id: 6,
            result: { content: [{ type: "text", text: "Called ping" }], isError: false },
          },
        },
        {
          name: "an unknown method is a method-not-found error",
          args: [[], { jsonrpc: "2.0", id: 7, method: "tools/run" }],
          expected: { jsonrpc: "2.0", id: 7, error: { code: -32601, message: "Method not found: tools/run" } },
        },
      ],
      hints: [
        "Check for a notification with `request.id === undefined`, not `!request.id`, or id 0 will be dropped.",
        "Build the list response by mapping each tool to an object with exactly three fields.",
        "Look the tool up with `tools.find`. A missing tool is a protocol error; a missing argument is a normal result with isError true.",
        "`required` may be absent, and so may `params.arguments`. Default both before checking.",
        "Keep the keys in the order the comment shows: the grader compares the JSON text.",
      ],
      solution: `function routeRequest(tools, request) {
  if (request.id === undefined) return null;
  const id = request.id;

  if (request.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    };
  }

  if (request.method === "tools/call") {
    const params = request.params || {};
    const tool = tools.find((t) => t.name === params.name);
    if (!tool) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Unknown tool: " + params.name },
      };
    }

    const args = params.arguments || {};
    const required = (tool.inputSchema && tool.inputSchema.required) || [];
    const missing = required.find((key) => !(key in args));
    if (missing !== undefined) {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: "Missing required argument: " + missing }],
          isError: true,
        },
      };
    }

    return {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: "Called " + tool.name }],
        isError: false,
      },
    };
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found: " + request.method },
  };
}`,
      xp: 80,
    },
  ],
};
