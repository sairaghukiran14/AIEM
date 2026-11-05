/** JavaScript versions of this track's lesson code examples, keyed by lesson slug. */
export const productionAi: Record<string, string> = {
  "streaming-and-latency": `import { Hono } from "hono";

const app = new Hono();
const encoder = new TextEncoder();

function sse(data, event) {
  const head = event ? \`event: \${event}\\n\` : "";
  const body = data.split("\\n").map((line) => \`data: \${line}\\n\`).join("");   // multi-line data = several data: lines
  return encoder.encode(\`\${head}\${body}\\n\`);                                 // blank line ends the event
}

app.post("/chat", async (c) => {
  const { prompt } = await c.req.json();
  const signal = c.req.raw.signal;                       // aborts when the user leaves

  const events = new ReadableStream({
    async start(controller) {
      try {
        const stream = llm.stream(prompt, { signal });   // upstream streaming call: stops paying for tokens on abort
        for await (const token of stream.text()) {
          controller.enqueue(sse(token, "token"));       // forward immediately, never batch
        }
        controller.enqueue(sse(JSON.stringify({ stopReason: stream.stopReason }), "done"));
      } catch (e) {
        controller.enqueue(sse(JSON.stringify({ error: e.name }), "error"));   // status is already 200
      }
      controller.close();
    },
  });

  return new Response(events, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",                         // tell nginx not to buffer
    },
  });
});`,

  "caching-and-cost-control": `import { createHash } from "node:crypto";

// Sort object keys at every level so equal requests always produce equal text.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]));
  }
  return value;
}

class ResponseCache {
  store = new Map();      // a Map keeps insertion order: the first key is the least recently used

  constructor(ttlSeconds, capacity) {
    this.ttlMs = ttlSeconds * 1000;
    this.capacity = capacity;
  }

  static key(request) {
    // Everything that can change the answer belongs in the key, including versions.
    return createHash("sha256").update(JSON.stringify(canonical(request))).digest("hex");
  }

  get(request) {
    const k = ResponseCache.key(request);
    const entry = this.store.get(k);
    if (!entry) return null;
    this.store.delete(k);
    if (Date.now() - entry.storedAt > this.ttlMs) return null;   // expired
    this.store.set(k, entry);                                    // mark as recently used
    return entry.answer;
  }

  put(request, answer) {
    const k = ResponseCache.key(request);
    this.store.delete(k);
    this.store.set(k, { storedAt: Date.now(), answer });
    while (this.store.size > this.capacity) {
      this.store.delete(this.store.keys().next().value);         // evict the least recently used
    }
  }
}

function lruHitRate(capacity, accesses) {
  const cache = new Set();
  let hits = 0;
  let misses = 0;
  for (const key of accesses) {
    if (cache.has(key)) {
      hits++;
      cache.delete(key);
      cache.add(key);
    } else {
      misses++;
      if (capacity > 0) {
        cache.add(key);
        if (cache.size > capacity) cache.delete(cache.values().next().value);
      }
    }
  }
  return { hits, misses };
}`,

  "reliability-rate-limits-retries": `const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/** Delay in ms before the next attempt, or null to stop. \`attempt\` starts at 1. */
function nextDelay(status, attempt, maxAttempts, { baseMs = 500, capMs = 30_000, retryAfterMs = null } = {}) {
  if (attempt >= maxAttempts || !RETRYABLE.has(status)) return null;
  const exponential = Math.min(capMs, baseMs * 2 ** (attempt - 1));
  if (retryAfterMs !== null) return Math.max(retryAfterMs, exponential);   // never wait less than the server asked
  return exponential;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callWithRetry(send, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await send();
    if (response.status < 400) return response;
    const retryAfter = response.headers.get("Retry-After");
    const delay = nextDelay(response.status, attempt, maxAttempts, {
      retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : null,
    });
    if (delay === null) return response;       // not retryable, or out of attempts
    await sleep(Math.random() * delay);        // jitter: avoid synchronised retries
  }
}`,

  "guardrails-and-safety": `const CARD = /\\b(?:\\d{4}[ -]?){3}\\d{4}\\b/g;
const EMAIL = /[\\w.+-]+@[\\w-]+\\.[\\w.-]+/g;
const PHONE = /\\(?\\d{3}\\)?[ -]?\\d{3}-\\d{4}/g;

function redactPii(text) {
  return text
    .replace(CARD, "[CARD]")      // most specific first
    .replace(EMAIL, "[EMAIL]")
    .replace(PHONE, "[PHONE]");
}

async function isFlagged(text) {
  try {
    return (await moderationApi(text)).flagged;
  } catch {
    log.error("moderation unavailable");
    return true;                  // FAIL CLOSED: if the check cannot run, do not let it through
  }
}

async function handle(user, message) {
  const safeIn = redactPii(message);
  if (await isFlagged(safeIn)) {
    return "I can't help with that request.";   // graduated: could also route to a human
  }
  const reply = await llm(safeIn);
  if (await isFlagged(reply)) return "I can't share that response.";
  return redactPii(reply);                       // redact on the way out as well
}`,

  "scaling-and-architecture": `import { randomUUID } from "node:crypto";

/** Allows short bursts up to \`capacity\`, refilling at \`refillPerSec\` on average. */
class TokenBucket {
  constructor(capacity, refillPerSec) {
    this.capacity = capacity;
    this.refill = refillPerSec;
    this.tokens = capacity;
    this.last = performance.now();
  }

  allow(cost = 1) {
    const now = performance.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.refill);
    this.last = now;
    if (cost <= this.tokens) {
      this.tokens -= cost;
      return true;
    }
    return false;                  // deny or queue until enough tokens exist
  }
}

// Async job pattern: the request returns immediately; a worker does the slow part.
app.post("/reports", async (c) => {
  const jobId = randomUUID();
  const user = c.get("user");
  await jobs.save(jobId, { status: "queued", owner: user.id });
  await queue.enqueue("generate_report", jobId, await c.req.json());   // picked up by a worker
  return c.json({ jobId }, 202);                                       // accepted, not finished
});

app.get("/reports/:jobId", async (c) => {
  const job = await jobs.get(c.req.param("jobId"), { owner: c.get("user").id });   // tenant-scoped lookup
  return c.json({ status: job.status, resultUrl: job.resultUrl });
});`,

  "operating-ai-products": `/** How much of the allowed failure have we used? */
function errorBudget(sloPercent, totalRequests, failedRequests) {
  const allowed = Math.round((totalRequests * (100 - sloPercent)) / 100);   // round: 100 - 99.9 is not exact in floats
  const burned = allowed === 0
    ? (failedRequests === 0 ? 0 : 100)
    : Math.min(100, Math.round((failedRequests / allowed) * 100));
  return {
    allowedFailures: allowed,
    remaining: allowed - failedRequests,
    burnedPercent: burned,
    exhausted: failedRequests > allowed,
  };
}

const status = errorBudget(99.9, 1_000_000, 250);
console.log(status);   // { allowedFailures: 1000, remaining: 750, burnedPercent: 25, exhausted: false }

// A release policy that follows from it:
//   budget remaining  -> ship normally, take reasonable risks
//   budget exhausted  -> freeze risky changes, work on reliability until it recovers`,
};
