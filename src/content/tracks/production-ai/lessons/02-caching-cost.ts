import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "caching-and-cost-control",
  order: 2,
  title: "Caching & Cost Control",
  summary:
    "The cheapest request is the one you do not make. Learn the three kinds of cache, where each one is safe, and the other levers that bring the bill down.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "LLM costs scale with tokens (Track 1), and many applications send the **same or very similar** text over and over: the same long system prompt, the same documents, the same FAQ questions. Caching exploits that repetition. There are three distinct kinds, with very different risks.",
    },
    {
      type: "table",
      headers: ["Cache", "What is reused", "Hit when", "Main risk"],
      rows: [
        ["**Prompt (prefix) cache**", "the provider's work on the start of your prompt", "the first N tokens are identical", "low: pricing and TTL rules; order matters"],
        ["**Exact response cache**", "the full answer for an identical request", "the whole request hashes to the same key", "stale answers; only valid if output should be deterministic"],
        ["**Semantic cache**", "an answer for a similar question, matched by embeddings", "a stored question is close enough in meaning", "wrong or leaked answers if the threshold or scoping is wrong"],
      ],
    },
    {
      type: "sorter",
      title: "Which cache fits?",
      prompt: "Pick the cache that matches each situation.",
      categories: ["Prompt (prefix) cache", "Exact response cache", "Semantic cache"],
      items: [
        { text: "A 6,000-token system prompt and tool list sent on every request", answer: 0, why: "A large stable prefix is exactly what provider prompt caching rewards." },
        { text: "The same temperature-0 classification request repeated by many users", answer: 1, why: "Identical input and a deterministic task: store the answer by the hash of the request." },
        { text: "Hundreds of differently worded versions of the same public FAQ question", answer: 2, why: "Different words, same meaning: match by embedding similarity (with care)." },
        { text: "One long document queried repeatedly with different short questions", answer: 0, why: "The document is a stable prefix. Only the question at the end changes." },
      ],
    },
    {
      type: "calculator",
      title: "What does prompt caching save?",
      inputs: [
        { key: "requests", label: "Requests per day", min: 1000, max: 5000000, step: 1000, value: 200000 },
        { key: "tokens", label: "Input tokens per request", min: 500, max: 50000, step: 500, value: 8000 },
        { key: "share", label: "Share of the prompt that is a stable prefix", min: 0, max: 100, step: 5, value: 75, unit: "%" },
        { key: "hit", label: "Cache hit rate", min: 0, max: 100, step: 5, value: 80, unit: "%" },
        { key: "price", label: "Normal input price per 1M tokens", min: 0.1, max: 20, step: 0.1, value: 3, unit: "$" },
        { key: "cached", label: "Cached-read price as a share of normal", min: 1, max: 100, step: 1, value: 10, unit: "%" },
      ],
      outputs: [
        { label: "Input cost per day, no caching", formula: "requests * tokens / 1e6 * price", format: "usd" },
        { label: "Input cost per day, with caching", formula: "requests * tokens / 1e6 * price * (1 - share / 100 * hit / 100 * (1 - cached / 100))", format: "usd" },
        { label: "Saving", formula: "share / 100 * hit / 100 * (1 - cached / 100)", format: "pct" },
      ],
      note: "Illustrative. Providers differ in how they price cache reads and writes and how long entries live (time to live), so read your provider's current rules. A cache write can cost slightly more than a normal read, which a low hit rate can wipe out.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Making a prompt cacheable" },
    {
      type: "ul",
      items: [
        "**Stable content first**: system prompt, tool definitions, few-shot examples, then retrieved context, then history, then the user's question last (Track 1 and Track 2).",
        "**Byte-identical prefixes**: a timestamp, request id or reordered tool list near the top changes every request and defeats the cache.",
        "**Keep it alive**: entries expire after a time to live, so low traffic may mean few hits.",
        "**Measure the hit rate** from the usage fields your provider returns, and alert if it drops after a deploy.",
      ],
    },
    { type: "h", text: "Response caches: when are they safe?" },
    {
      type: "p",
      text: "An **exact** cache stores the answer under a hash of the full request (model, version, prompt, parameters). It is safe only when the answer should not vary: temperature 0, no per-user data, and tolerable staleness. Add a **time to live**, include the model and prompt version in the key so a new version never returns old answers, and never cache errors.",
    },
    {
      type: "p",
      text: "A **semantic** cache embeds the question and returns a stored answer if a past question is similar enough. It can help for public FAQ-style traffic, but it is the riskiest cache: a **threshold that is too loose** returns the answer to a different question, and a cache **shared across users** can return an answer built from one person's private context to another. Scope it per tenant, restrict it to non-personalised content, set the threshold from labelled examples (Track 3), and consider verifying a hit with a cheap check.",
    },
    {
      type: "stepper",
      title: "A safe semantic cache lookup",
      steps: [
        { label: "Decide if the request is cacheable", detail: "Skip the cache for anything personalised or time-sensitive. Only public, stable questions qualify.", items: ["personalised? skip", "needs live data? skip"], mark: [0, 1] },
        { label: "Embed and search within the right scope", detail: "Look up nearest stored questions only within the same tenant, language and prompt version.", items: ["scope: tenant + version"], mark: [0] },
        { label: "Apply a tuned threshold", detail: "Accept a hit only above a similarity threshold chosen on labelled pairs of same-meaning and different-meaning questions.", items: ["similarity >= tuned threshold"], mark: [0] },
        { label: "Optionally verify", detail: "For higher stakes, ask a cheap model whether the stored question and the new one mean the same thing.", items: ["cheap equivalence check"], mark: [0] },
        { label: "Serve or generate and store", detail: "On a hit, return the stored answer and log it. On a miss, generate normally and store it with a time to live.", items: ["hit: serve", "miss: generate + store"], mark: [0, 1] },
      ],
      caption: "Every step exists to prevent a wrong or leaked answer.",
    },
    { type: "h", text: "Other levers, in rough order of impact" },
    {
      type: "table",
      headers: ["Lever", "How it saves"],
      rows: [
        ["**Model routing / cascade**", "send the easy majority to a small model, escalate the rest (Track 1)"],
        ["**Shorter prompts and outputs**", "fewer tokens in and out; ask for structured, concise output; cap max_tokens"],
        ["**Batch APIs**", "asynchronous batch requests are typically discounted for work that is not interactive"],
        ["**Context trimming**", "retrieve fewer, better chunks (Track 4); compact agent history (Track 5)"],
        ["**Budgets and rate limits**", "per-user and per-feature caps stop runaway spend and abuse"],
        ["**Cost attribution**", "tag every request with feature and customer so you know where money goes (Track 6)"],
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That there are three caches with different risks, that prompt caching needs stable, byte-identical prefixes with the question last, that exact caches need deterministic requests and versioned keys, that semantic caches need scoping, a tuned threshold and no personalised content, and that routing, shorter outputs and batching are often bigger levers.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "An exact response cache keyed by the full request, plus an LRU simulation for sizing.",
    code: `import hashlib, json, time
from collections import OrderedDict

class ResponseCache:
    def __init__(self, ttl_seconds: int, capacity: int):
        self.ttl, self.capacity = ttl_seconds, capacity
        self.store: "OrderedDict[str, tuple[float, str]]" = OrderedDict()

    @staticmethod
    def key(request: dict) -> str:
        # Everything that can change the answer belongs in the key, including versions.
        canonical = json.dumps(request, sort_keys=True)
        return hashlib.sha256(canonical.encode()).hexdigest()

    def get(self, request: dict) -> str | None:
        k = self.key(request)
        entry = self.store.get(k)
        if entry is None:
            return None
        stored_at, answer = entry
        if time.time() - stored_at > self.ttl:
            del self.store[k]                               # expired
            return None
        self.store.move_to_end(k)                           # mark as recently used
        return answer

    def put(self, request: dict, answer: str) -> None:
        self.store[self.key(request)] = (time.time(), answer)
        self.store.move_to_end(self.key(request))
        while len(self.store) > self.capacity:
            self.store.popitem(last=False)                  # evict the least recently used


def lru_hit_rate(capacity: int, accesses: list[str]) -> dict:
    cache: "OrderedDict[str, None]" = OrderedDict()
    hits = misses = 0
    for key in accesses:
        if key in cache:
            hits += 1
            cache.move_to_end(key)
        else:
            misses += 1
            if capacity > 0:
                cache[key] = None
                if len(cache) > capacity:
                    cache.popitem(last=False)
    return {"hits": hits, "misses": misses}`,
  },

  interview: [
    {
      question: "Explain the different kinds of caching for LLM applications.",
      answer:
        "Prompt or prefix caching reuses the provider's work on an identical start of the prompt, cutting cost and latency for long stable system prompts, tools and documents. An exact response cache stores the full answer for an identical request and suits deterministic, non-personalised tasks. A semantic cache matches similar questions by embedding and is the riskiest, since a loose threshold or shared scope can return wrong or leaked answers.",
      weakAnswer:
        "Cache the responses so you do not call the model again. — Misses prompt caching and the safety questions.",
    },
    {
      question: "How do you structure a prompt to get good prompt-cache hits?",
      answer:
        "Put everything stable first and make it byte-identical across requests: system prompt, tool definitions, examples, then retrieved or per-request material, and the user's question last. Keep timestamps, ids and reorderable lists out of the prefix, watch the time to live, and monitor the hit rate from usage fields so a deploy that breaks it is noticed.",
      followUp: "What if traffic is low?",
    },
    {
      question: "When is an exact response cache safe?",
      answer:
        "When the answer should not vary and is not personalised: temperature 0, public inputs, and tolerable staleness. The key must include model and prompt versions and every parameter that affects output, entries need a time to live, and errors must never be cached. For per-user content I do not cache at all.",
    },
    {
      question: "What are the risks of a semantic cache and how would you mitigate them?",
      answer:
        "A similarity threshold that is too loose returns the answer to a different question, and a cache shared across users can leak one person's context-dependent answer to another. I restrict it to public non-personalised content, scope it per tenant and prompt version, tune the threshold on labelled same-meaning and different-meaning pairs, optionally verify hits with a cheap check, and monitor wrong-hit rate.",
    },
    {
      question: "Your LLM bill doubled with flat traffic. What do you check?",
      answer:
        "Segment spend by feature, model and input versus output tokens. Common causes are a prompt that grew, a broken prompt cache from a changed prefix, retries or agent loops, a shift to a language that tokenises poorly, or traffic moving to a more expensive model. Then I apply the levers: restore prefix caching, route easy requests to a cheaper model, shorten outputs, batch non-interactive work and add per-user limits.",
    },
  ],

  challenges: [
    {
      id: "pa-2-quiz",
      kind: "quiz",
      title: "Checkpoint: caching and cost control",
      blurb: "Five questions on what to cache and what not to.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which prompt layout gives prompt caching the best chance of hits?",
          options: [
            "The user question first, then the system prompt",
            "Stable system prompt and tools first and identical every time, with the user question last",
            "A timestamp at the very top for freshness",
            "Randomised order of tools",
          ],
          correctIndex: 1,
          explanation:
            "Caching matches an identical prefix. Anything variable early on breaks it.",
        },
        {
          id: "q2",
          prompt: "A semantic cache is shared across all users and returns answers built from one user's private account data to others. What is the fix?",
          options: [
            "Lower the similarity threshold",
            "Do not cache personalised answers, and scope any cache per tenant",
            "Increase the time to live",
            "Switch to a larger model",
          ],
          correctIndex: 1,
          explanation:
            "Personalised content must never be shared, and caches need scoping.",
        },
        {
          id: "q3",
          prompt: "Which request is a good candidate for an exact response cache?",
          options: [
            "A temperature-0 classification of public text repeated by many users",
            "A personalised reply that uses the user's private notes",
            "A creative writing request at temperature 1",
            "A request for the current stock price",
          ],
          correctIndex: 0,
          explanation:
            "Deterministic, non-personalised and tolerably stale: safe to reuse.",
        },
        {
          id: "q4",
          prompt: "Why include the prompt version in an exact cache key?",
          options: [
            "To make keys shorter",
            "So a new prompt version never returns answers produced by the old one",
            "Providers require it",
            "To increase the hit rate",
          ],
          correctIndex: 1,
          explanation:
            "Anything that changes the answer must change the key.",
        },
        {
          id: "q5",
          prompt: "Which lever is often larger than any cache for a mixed-difficulty workload?",
          options: [
            "Longer prompts",
            "Routing the easy majority of requests to a smaller, cheaper model",
            "A bigger context window",
            "Higher temperature",
          ],
          correctIndex: 1,
          explanation:
            "Most requests are easy. A cascade or router (Track 1) can cut spend by an order of magnitude.",
        },
      ],
    },
    {
      id: "pa-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a semantic cache",
      blurb: "A customer was shown another customer's order details, and some answers address the wrong question. Find the line.",
      language: "python",
      lines: [
        "def answer(user, question):",
        "    hit = cache.nearest(embed(question), threshold=0.6)     # one cache shared by all users",
        "    if hit:",
        "        return hit.answer",
        "    reply = llm(build_prompt(user, question))",
        "    cache.add(embed(question), reply)",
      ],
      buggyLine: 2,
      reasons: [
        "embed cannot be called twice",
        "the cache is shared across users with a loose threshold, so answers built from one user's private context can be served to others and to different questions",
        "threshold must be above 1",
        "nearest must be called after llm",
      ],
      correctReasonIndex: 1,
      explanation:
        "Two faults at once: no scoping, so personalised answers leak between users, and a low similarity threshold, so unrelated questions match. Restrict semantic caching to public content, scope per tenant, and tune the threshold on labelled pairs.",
      fix: "cache.nearest(embed(q), threshold=TUNED, scope=(tenant, prompt_version))   # and skip personalised requests",
      xp: 40,
    },
    {
      id: "pa-2-code",
      kind: "code",
      title: "Code challenge: simulate an LRU cache",
      blurb: "Count hits and misses for a least-recently-used cache, to size it from real access patterns.",
      functionName: "lruSimulate",
      starter: `/**
 * Simulate an LRU (least recently used) cache.
 *
 * \`accesses\` is a list of keys requested in order. The cache holds at most
 * \`capacity\` keys. For each access:
 *   - if the key is in the cache: a HIT, and it becomes the most recently used
 *   - otherwise: a MISS; add it, and if the cache is over capacity evict the
 *     least recently used key
 * With capacity 0 nothing is ever stored, so every access is a miss.
 *
 * Return { hits, misses }.
 *
 * lruSimulate(2, ["a","b","a","c","b"]) -> { hits: 1, misses: 4 }
 */
function lruSimulate(capacity, accesses) {
  // your code here
}`,
      tests: [
        { name: "the worked example", args: [2, ["a", "b", "a", "c", "b"]], expected: { hits: 1, misses: 4 } },
        { name: "repeated key with capacity 1", args: [1, ["a", "a", "a"]], expected: { hits: 2, misses: 1 } },
        { name: "capacity 0 never hits", args: [0, ["a", "a", "a"]], expected: { hits: 0, misses: 3 } },
        { name: "a hit refreshes recency", args: [2, ["a", "b", "a", "c", "a"]], expected: { hits: 2, misses: 3 } },
        { name: "everything fits", args: [10, ["a", "b", "c", "a", "b", "c"]], expected: { hits: 3, misses: 3 } },
        { name: "no accesses", args: [3, []], expected: { hits: 0, misses: 0 } },
        { name: "cycling through more keys than capacity never hits", args: [2, ["a", "b", "c", "a", "b", "c"]], expected: { hits: 0, misses: 6 } },
      ],
      hints: [
        "A Map remembers insertion order, so it can act as the recency list: delete and re-set a key to make it the newest.",
        "On a hit, delete the key and set it again. On a miss, set it, then if the size exceeds capacity delete the first key in the Map.",
        "Handle capacity 0 first: count every access as a miss and store nothing.",
      ],
      solution: `function lruSimulate(capacity, accesses) {
  const cache = new Map();
  let hits = 0;
  let misses = 0;

  for (const key of accesses) {
    if (cache.has(key)) {
      hits += 1;
      cache.delete(key);
      cache.set(key, true);
    } else {
      misses += 1;
      if (capacity > 0) {
        cache.set(key, true);
        if (cache.size > capacity) {
          cache.delete(cache.keys().next().value);
        }
      }
    }
  }

  return { hits, misses };
}`,
      xp: 70,
    },
  ],
};
