import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "streaming-and-latency",
  order: 1,
  title: "Streaming & Latency",
  summary:
    "LLM responses take seconds. Learn where the time goes, how streaming changes what users feel, and how to stream correctly end to end.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "A model generates one token at a time (Track 1), so a long answer takes seconds to finish. Two numbers describe the experience: **time to first token (TTFT)**, how long until anything appears, and **total time**, until the answer is complete. **Streaming** sends tokens to the user as they are produced, so the answer starts after TTFT instead of after total time.",
    },
    {
      type: "sorter",
      title: "Which latency lever is this?",
      prompt: "Decide what each change actually improves.",
      categories: ["Cuts time to first token", "Cuts generation time", "Only improves perceived speed"],
      items: [
        { text: "Cache a long, stable prompt prefix (Track 1)", answer: 0, why: "Less prefill work before the first token is produced." },
        { text: "Ask for a concise answer and cap max_tokens", answer: 1, why: "Fewer output tokens means fewer sequential decode steps." },
        { text: "Stream tokens to the user interface as they arrive", answer: 2, why: "The total time is unchanged, but the user sees progress after the first token." },
        { text: "Retrieve 6 chunks instead of 20", answer: 0, why: "A shorter prompt means a faster prefill, so the first token arrives sooner." },
      ],
    },
    {
      type: "calculator",
      title: "Where does the time go?",
      inputs: [
        { key: "input", label: "Input tokens", min: 100, max: 100000, step: 100, value: 6000 },
        { key: "output", label: "Output tokens", min: 10, max: 4000, step: 10, value: 400 },
        { key: "prefill", label: "Prefill speed", min: 1000, max: 50000, step: 500, value: 8000, unit: "tok/s" },
        { key: "decode", label: "Decode speed", min: 10, max: 300, step: 5, value: 60, unit: "tok/s" },
        { key: "overhead", label: "Network and queueing", min: 0, max: 2000, step: 50, value: 250, unit: "ms" },
      ],
      outputs: [
        { label: "Time to first token", formula: "overhead + input / prefill * 1000 + 1000 / decode", format: "ms" },
        { label: "Total time to finish", formula: "overhead + input / prefill * 1000 + output / decode * 1000", format: "ms" },
        { label: "Share of the total spent decoding", formula: "(output / decode * 1000) / (overhead + input / prefill * 1000 + output / decode * 1000)", format: "pct" },
      ],
      note: "Illustrative speeds that vary by model and load. Output length usually dominates the total, and prompt length dominates time to first token.",
    },
    {
      type: "callout",
      tone: "key",
      title: "Streaming changes perception, not computation",
      text: "The model takes just as long to finish. Streaming helps because people read as text appears, and because waiting with visible progress feels far shorter than waiting in silence. It also lets users stop a bad answer early.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Server-sent events (SSE)" },
    {
      type: "p",
      text: "Most LLM APIs stream over **server-sent events**: a normal HTTP response with content type `text/event-stream` that stays open while the server writes small messages. Each event is a few lines of text ending in a **blank line**. It is one-way (server to client), simple, and works through standard HTTP infrastructure, unlike WebSockets, which add a second protocol.",
    },
    {
      type: "code",
      language: "text",
      code: `HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

event: token
data: Hel

event: token
data: lo

event: done
data: {"stop_reason": "end_turn"}
`,
      caption: "Fields: event (optional name), data (payload, may repeat for multi-line), a blank line ends the event. Lines starting with a colon are comments, often used as heartbeats.",
    },
    {
      type: "stepper",
      title: "A streamed answer across three hops",
      steps: [
        { label: "Provider to your server", detail: "Your backend calls the model API with streaming on and reads events as they arrive, instead of waiting for the full response.", items: ["API stream -> backend"], mark: [0] },
        { label: "Your server to the browser", detail: "The backend forwards each token to the client as its own SSE event, flushing immediately. It must not collect the tokens first.", items: ["backend -> SSE -> browser"], mark: [0] },
        { label: "Proxies must not buffer", detail: "Load balancers, CDNs and reverse proxies sometimes buffer responses. Disable buffering for the streaming route, or users see nothing until the end.", items: ["nginx: proxy_buffering off", "CDN: pass-through"], mark: [0, 1] },
        { label: "The browser renders incrementally", detail: "The client appends each token to the page, handles reconnects, and shows a stop button.", items: ["append tokens", "stop button"], mark: [0, 1] },
        { label: "Cancel propagates back", detail: "If the user stops or leaves, cancel the upstream request so you stop paying for tokens nobody will read.", items: ["client abort -> backend abort -> API abort"], mark: [0] },
      ],
      caption: "The whole chain must stream. One buffering hop cancels the benefit.",
    },
    { type: "h", text: "Things that are harder when you stream" },
    {
      type: "ul",
      items: [
        "**Structured output**: you cannot parse JSON until it is complete. Use an incremental parser to show fields as they arrive, but only act on the object after it ends and passes validation (Track 2).",
        "**Moderation and guardrails**: checking the full answer before showing it removes the benefit. Options include checking in chunks, holding back a small window, or allowing a visible correction (lesson 4).",
        "**Errors mid-stream**: the HTTP status was already 200. Send an error event and have the client handle a stream that ends badly.",
        "**Tool calls and citations** arrive as events too. Keep a clear event schema.",
        "**Reconnection**: SSE clients reconnect automatically. Decide whether a retry restarts the answer or resumes it, and avoid double-billing.",
        "**Token counts and cost** are only known at the end. Log them from the final event (Track 6).",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That TTFT and total time are different, that prefill drives the first and decoding drives the second, that streaming improves perceived latency only, that the entire path must stream with proxy buffering disabled, and that cancellation, mid-stream errors and validation of structured output need explicit handling.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Stream tokens to the browser as SSE, forwarding each one immediately and handling cancel.",
    code: `from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import json

app = FastAPI()


def sse(data: str, event: str | None = None) -> str:
    head = f"event: {event}\\n" if event else ""
    body = "".join(f"data: {line}\\n" for line in data.split("\\n"))   # multi-line data = several data: lines
    return f"{head}{body}\\n"                                          # blank line ends the event


@app.post("/chat")
async def chat(req: Request, body: dict):
    async def events():
        try:
            async with llm.stream(body["prompt"]) as stream:           # upstream streaming call
                async for token in stream.text():
                    if await req.is_disconnected():                    # user left: stop paying for tokens
                        await stream.aclose()
                        return
                    yield sse(token, event="token")                    # forward immediately, never batch
                yield sse(json.dumps({"stop_reason": stream.stop_reason}), event="done")
        except Exception as e:
            yield sse(json.dumps({"error": type(e).__name__}), event="error")   # status is already 200

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},      # tell nginx not to buffer
    )`,
  },

  interview: [
    {
      question: "What is the difference between time to first token and total latency, and what drives each?",
      answer:
        "Time to first token is how long until output starts, dominated by network, queueing and prefill, which scales with prompt length. Total latency adds the decode phase, which is sequential and scales with the number of output tokens. So long prompts hurt TTFT and long answers hurt total time, and I attack them differently: caching and shorter context for TTFT, shorter outputs and faster models for total time.",
      weakAnswer:
        "Latency is how fast the model is. — It does not separate prefill from decoding.",
    },
    {
      question: "Why does streaming improve user experience if the total time is the same?",
      answer:
        "Because the answer starts after the first token, people read while it is generated, waiting with visible progress feels shorter, and users can stop a wrong answer early. It improves perceived latency, not computation, so I still optimise the real latency separately.",
      followUp: "What can break streaming in production?",
    },
    {
      question: "What can silently break streaming between your server and the browser?",
      answer:
        "Anything that buffers the response: a reverse proxy, load balancer or CDN with buffering on, or my own code collecting tokens before sending. The symptom is that users see nothing until the end, so TTFT equals total time. I disable buffering for the route, flush each event, and verify end to end with a real client.",
    },
    {
      question: "How do you handle structured output or moderation when streaming?",
      answer:
        "For JSON I use an incremental parser to display partial fields but act only after the complete object validates. For moderation I either check in chunks with a small hold-back window, accept a visible retraction, or stream only after a quick input check, depending on the risk. There is a trade-off between safety and responsiveness that I decide per use case.",
    },
    {
      question: "A user closes the tab mid-answer. What should the backend do?",
      answer:
        "Detect the disconnect and cancel the upstream model request so I stop generating and paying for tokens nobody will read, release resources, and still record partial usage for accounting. Propagating cancellation through every hop is part of a correct streaming design.",
    },
  ],

  challenges: [
    {
      id: "pa-1-quiz",
      kind: "quiz",
      title: "Checkpoint: streaming and latency",
      blurb: "Five questions on where the time goes.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What mainly drives time to first token?",
          options: [
            "The number of output tokens",
            "Network, queueing and prefill, which grows with prompt length",
            "The user's screen size",
            "The temperature",
          ],
          correctIndex: 1,
          explanation:
            "Prefill processes the prompt in one pass. A longer prompt delays the first token.",
        },
        {
          id: "q2",
          prompt: "What does streaming improve?",
          options: [
            "Total generation time",
            "Perceived latency, because output appears as it is produced",
            "Model accuracy",
            "Token cost",
          ],
          correctIndex: 1,
          explanation:
            "The model takes just as long. Users see progress after the first token.",
        },
        {
          id: "q3",
          prompt: "Users see nothing until the whole answer is ready even though your code streams from the model. What is the most likely cause?",
          options: [
            "The model is too slow",
            "A proxy or your own code buffers the response before sending",
            "The user's browser is old",
            "SSE is not supported over HTTP",
          ],
          correctIndex: 1,
          explanation:
            "One buffering hop defeats streaming. Disable buffering and flush each event.",
        },
        {
          id: "q4",
          prompt: "How does an SSE event end?",
          options: [
            "With a closing brace",
            "With a blank line",
            "With a semicolon",
            "With the word END",
          ],
          correctIndex: 1,
          explanation:
            "Events are separated by a blank line, with fields like event: and data: on the lines before it.",
        },
        {
          id: "q5",
          prompt: "The user leaves the page mid-answer. What should the backend do?",
          options: [
            "Keep generating the full answer",
            "Cancel the upstream request to stop paying for unused tokens",
            "Restart the answer",
            "Delete the conversation",
          ],
          correctIndex: 1,
          explanation:
            "Cancellation should propagate through every hop.",
        },
      ],
    },
    {
      id: "pa-1-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a streaming endpoint",
      blurb: "The model starts responding in a second, but users stare at a blank screen for ten. Find the line.",
      language: "python",
      lines: [
        "def chat_stream(prompt):",
        "    chunks = llm_stream(prompt)",
        "    text = ''.join(chunks)            # wait for everything",
        "    yield f'data: {text}\\n\\n'",
      ],
      buggyLine: 3,
      reasons: [
        "join cannot take a generator",
        "it collects every chunk before sending anything, so the user sees nothing until generation is complete; each chunk must be forwarded as it arrives",
        "the prompt must be encoded first",
        "the yield should be a return",
      ],
      correctReasonIndex: 1,
      explanation:
        "Joining the stream turns it back into a single response, so time to first token equals total time. Yield an event for every chunk as it arrives.",
      fix: "for chunk in llm_stream(prompt):\n        yield f'data: {chunk}\\n\\n'",
      xp: 40,
    },
    {
      id: "pa-1-code",
      kind: "code",
      title: "Code challenge: parse server-sent events",
      blurb: "Turn raw SSE text into a list of events, as a client library does.",
      functionName: "parseSSE",
      starter: `/**
 * Parse a string of server-sent events.
 *
 * Events are separated by a blank line ("\\n\\n"). Only COMPLETE events count:
 * ignore any trailing text that is not followed by a blank line.
 *
 * Within an event, for each line:
 *   - "event: <name>"  sets the event name (default "message")
 *   - "data: <text>"   adds a line of data. Strip ONE leading space after the colon only.
 *   - lines starting with ":" are comments: ignore them
 *   - anything else: ignore
 * Multiple data lines are joined with "\\n".
 *
 * Return an array of { event, data }. Skip events that have no data lines.
 *
 * parseSSE("event: token\\ndata: Hi\\n\\n") -> [{ event: "token", data: "Hi" }]
 */
function parseSSE(text) {
  // your code here
}`,
      tests: [
        { name: "one default event", args: ["data: hello\n\n"], expected: [{ event: "message", data: "hello" }] },
        { name: "a named event", args: ["event: token\ndata: Hi\n\n"], expected: [{ event: "token", data: "Hi" }] },
        { name: "multi-line data is joined with a newline", args: ["data: line one\ndata: line two\n\n"], expected: [{ event: "message", data: "line one\nline two" }] },
        { name: "comments are ignored", args: [": heartbeat\ndata: x\n\n"], expected: [{ event: "message", data: "x" }] },
        { name: "two events", args: ["data: a\n\nevent: done\ndata: b\n\n"], expected: [{ event: "message", data: "a" }, { event: "done", data: "b" }] },
        { name: "an incomplete trailing event is ignored", args: ["data: a\n\ndata: part"], expected: [{ event: "message", data: "a" }] },
        { name: "only one leading space is stripped", args: ["data:  two spaces\n\n"], expected: [{ event: "message", data: " two spaces" }] },
        { name: "no space after the colon is fine", args: ["data:tight\n\n"], expected: [{ event: "message", data: "tight" }] },
        { name: "an event with no data is skipped", args: ["event: ping\n\ndata: z\n\n"], expected: [{ event: "message", data: "z" }] },
      ],
      hints: [
        "Split the text on the blank line (two newlines). Drop the last piece, because it is incomplete unless the text ended with a blank line, in which case it is empty.",
        "For each block, go through its lines: handle 'event:' and 'data:' prefixes, and skip everything else.",
        "For the value, take what follows the colon and remove one leading space only if it is there. Skip blocks with no data lines.",
      ],
      solution: `function parseSSE(text) {
  const blocks = text.split("\\n\\n");
  blocks.pop();

  const events = [];
  for (const block of blocks) {
    let event = "message";
    const data = [];

    for (const line of block.split("\\n")) {
      if (line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      if (colon === -1) continue;

      const field = line.slice(0, colon);
      let value = line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);

      if (field === "event") event = value;
      else if (field === "data") data.push(value);
    }

    if (data.length > 0) events.push({ event, data: data.join("\\n") });
  }
  return events;
}`,
      xp: 70,
    },
  ],
};
