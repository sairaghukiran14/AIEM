import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "how-llm-serving-works",
  order: 1,
  title: "How LLM Serving Works: KV Cache, Batching & Throughput",
  summary:
    "A hosted API hides it, but a model server has to juggle GPU memory, a growing cache and many users at once. Learn the KV cache, continuous batching and the latency versus throughput trade-off.",
  minutes: 16,

  concept: [
    {
      type: "p",
      text: "When you call a hosted model, someone else solves a hard systems problem: keeping expensive GPUs busy while many people wait for tokens. Understanding it explains your bill, your latency and your rate limits, and it is essential the moment you self-host.",
    },
    {
      type: "table",
      headers: ["Term", "What it is", "Why it matters"],
      rows: [
        ["**Prefill**", "one parallel pass over the whole prompt", "sets time to first token; compute-bound"],
        ["**Decode**", "generating output one token at a time", "sets total time; limited by memory bandwidth"],
        ["**KV cache**", "stored attention keys and values for every token so far", "avoids recomputing the past, but takes GPU memory for each token of each request"],
        ["**Batching**", "running many requests through the model together", "the main way to raise throughput and lower cost per token"],
        ["**Throughput vs latency**", "tokens per second across all users, versus the wait of one user", "bigger batches raise the first and can hurt the second"],
      ],
    },
    {
      type: "sorter",
      title: "Compute-bound or memory-bound?",
      prompt: "Which phase is each statement about?",
      categories: ["Prefill", "Decode"],
      items: [
        { text: "Processes all prompt tokens in parallel in one pass", answer: 0, why: "Prefill is a large parallel computation over the prompt." },
        { text: "Produces one token per step, re-reading the model weights and cache each time", answer: 1, why: "Each decode step is limited by how fast memory can be read." },
        { text: "A longer prompt makes this part slower, which delays the first token", answer: 0, why: "Prompt length drives prefill time and so time to first token." },
        { text: "A longer answer makes this part slower, which delays completion", answer: 1, why: "Output length drives the number of sequential decode steps." },
      ],
    },
    {
      type: "stepper",
      title: "Static versus continuous batching",
      steps: [
        { label: "Static batching", detail: "Wait to collect a batch, run it until every request finishes, then start the next. A short request sits idle while a long one keeps generating.", items: ["req A (short)", "req B (long)", "A waits for B"], mark: [2] },
        { label: "The GPU sits partly idle", detail: "When A finishes early, its slot in the batch is wasted until B is done. Utilisation and throughput drop.", items: ["slot A: idle", "slot B: busy"], mark: [0] },
        { label: "Continuous batching", detail: "The server schedules at every decoding step. As soon as a request ends, a waiting one takes its slot.", items: ["A finishes", "C joins at once"], mark: [1] },
        { label: "Memory is the limit", detail: "Each active request holds KV cache. The number that can run together is set by free GPU memory after the weights are loaded.", items: ["weights", "KV cache x requests"], mark: [1] },
        { label: "Paged cache memory", detail: "Modern servers store the cache in fixed-size blocks rather than one big slab per request, which wastes far less memory and fits more requests.", items: ["block 1", "block 2", "block 3"], mark: [0, 1, 2] },
      ],
      caption: "Continuous batching and paged cache memory are the ideas behind modern inference servers such as vLLM.",
    },
  ],

  underTheHood: [
    { type: "h", text: "The KV cache costs memory per token" },
    {
      type: "p",
      text: "For each token, each layer stores a **key** and a **value** vector per attention head. So the cache for one token is `2 x layers x kv_heads x head_dim x bytes per value`. It grows with every token of every request, which is why long contexts and big batches run out of GPU memory long before they run out of compute.",
    },
    {
      type: "calculator",
      title: "How much memory does the KV cache need?",
      inputs: [
        { key: "layers", label: "Layers", min: 8, max: 96, step: 8, value: 32 },
        { key: "kvHeads", label: "Key/value heads", min: 1, max: 64, step: 1, value: 32 },
        { key: "headDim", label: "Head dimension", min: 64, max: 256, step: 64, value: 128 },
        { key: "bytes", label: "Bytes per value (2 = fp16)", min: 1, max: 4, step: 1, value: 2 },
        { key: "tokens", label: "Tokens per request (prompt + output)", min: 512, max: 32768, step: 512, value: 4096 },
        { key: "batch", label: "Concurrent requests", min: 1, max: 64, step: 1, value: 8 },
      ],
      outputs: [
        { label: "KV cache per token (KB)", formula: "2 * layers * kvHeads * headDim * bytes / 1000", format: "fixed1" },
        { label: "KV cache for one request (GB)", formula: "2 * layers * kvHeads * headDim * bytes * tokens / 1e9", format: "fixed2" },
        { label: "KV cache for the whole batch (GB)", formula: "2 * layers * kvHeads * headDim * bytes * tokens * batch / 1e9", format: "fixed2" },
      ],
      note: "Models that share key/value heads across several query heads (grouped-query attention) shrink the cache by that factor. Try 8 key/value heads and see the memory fall to a quarter.",
    },
    { type: "h", text: "Latency or throughput?" },
    {
      type: "ul",
      items: [
        "**Larger batches** share the cost of reading the weights across more requests, so cost per token falls and throughput rises, but each request may wait longer for its turn.",
        "**Interactive products** care about time to first token and per-token speed, so they run smaller batches or reserve capacity.",
        "**Offline jobs** care only about cost per token, so they batch as much as memory allows (many providers offer cheaper batch APIs for this reason).",
        "**Long prompts** mostly cost prefill compute and cache memory. **Long outputs** mostly cost decode time.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Memory, not compute, usually limits concurrency",
      text: "After the model weights are loaded, whatever GPU memory remains is the budget for KV cache. Halve the context length or share key/value heads and you can serve roughly twice the users.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"why is the second token faster than the first?\"",
      text: "The first token waits for prefill over the whole prompt. After that each token is one decode step that reuses the KV cache, so the cost no longer scales with prompt length. Then mention that cache memory and batching decide how many users a GPU can serve.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "The shape of a serving loop: load the model once, keep a queue, and schedule at every step.",
    code: `import asyncio

model = load_model(MODEL_PATH)             # load ONCE at startup, never per request
queue: asyncio.Queue = asyncio.Queue()


async def submit(prompt: str) -> str:
    done = asyncio.get_running_loop().create_future()
    await queue.put((prompt, done))
    return await done


async def scheduler(max_batch: int = 8):
    active = []                            # requests currently generating
    while True:
        # continuous batching: fill free slots at every step, not once per batch
        while len(active) < max_batch and not queue.empty():
            prompt, done = queue.get_nowait()
            active.append({"state": model.start(prompt), "done": done})

        if not active:
            await asyncio.sleep(0.005)
            continue

        model.decode_step([r["state"] for r in active])   # one token for every active request

        for r in list(active):
            if r["state"].finished:
                r["done"].set_result(r["state"].text)
                active.remove(r)           # the freed slot is reused on the next loop`,
  },

  interview: [
    {
      question: "What is the KV cache and why does it matter?",
      answer:
        "During generation, attention needs the keys and values of every previous token. The KV cache stores them so each new token does not recompute the whole past. That makes decoding fast, but the cache grows with every token of every request and consumes GPU memory, so it often limits how many concurrent requests one GPU can serve.",
      weakAnswer:
        "It caches the model's answers for repeated questions. — That is a response cache. The KV cache holds attention state inside a single generation.",
    },
    {
      question: "What is continuous batching and why is it better than static batching?",
      answer:
        "Static batching runs a fixed group of requests until all finish, so short requests wait idle for long ones. Continuous batching schedules at every decoding step: when one request completes, a waiting one takes its place immediately. That keeps the GPU busy, raising throughput and lowering cost per token, and is a core feature of servers like vLLM.",
    },
    {
      question: "Why is time to first token different from the speed of later tokens?",
      answer:
        "The first token needs prefill, one parallel pass over the whole prompt, so it scales with prompt length. Later tokens each need one decode step that reuses the cache and is limited by memory bandwidth. So long prompts hurt the first token most, while long outputs add steps one by one.",
    },
    {
      question: "How would you estimate how many concurrent users one GPU can handle?",
      answer:
        "Take the GPU memory, subtract the weights, and divide the remainder by the KV cache needed per request, which is 2 x layers x kv heads x head dimension x bytes x tokens. That gives a memory-bound concurrency. Then check throughput and latency targets with a load test, since compute and batching also matter. Grouped-query attention or shorter contexts raise the number.",
    },
    {
      question: "When do you trade latency for throughput?",
      answer:
        "Interactive features prioritise time to first token and per-token speed, so I use smaller batches and spare capacity. Offline work such as bulk summarisation or evaluation only cares about cost, so I maximise batch size and use batch pricing. Often the same cluster serves both with different queues or priorities.",
    },
  ],

  challenges: [
    {
      id: "sm-1-quiz",
      kind: "quiz",
      title: "Checkpoint: how serving works",
      blurb: "Five questions on the KV cache and batching.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What does the KV cache store?",
          options: [
            "Final answers to common questions",
            "Attention keys and values for the tokens already processed, so they are not recomputed",
            "The model weights",
            "User profiles",
          ],
          correctIndex: 1,
          explanation:
            "It is per-request attention state that makes each new token cheap, at the cost of GPU memory.",
        },
        {
          id: "q2",
          prompt: "Which phase determines time to first token?",
          options: ["Decode", "Prefill over the prompt", "Tokenisation of the output", "Sampling"],
          correctIndex: 1,
          explanation:
            "The model must process the whole prompt before it can emit the first token.",
        },
        {
          id: "q3",
          prompt: "What is the advantage of continuous batching?",
          options: [
            "It makes the model smaller",
            "Finished requests free their slot at once and waiting requests join, keeping the GPU busy",
            "It removes the need for a KV cache",
            "It guarantees lower latency for every user",
          ],
          correctIndex: 1,
          explanation:
            "Scheduling at every decode step avoids idle slots, raising throughput.",
        },
        {
          id: "q4",
          prompt: "A server runs out of memory when many long conversations run together, though compute is idle. What is the likely cause?",
          options: [
            "The tokenizer is slow",
            "The KV cache for all active requests no longer fits next to the weights",
            "The temperature is too high",
            "The prompt has too few words",
          ],
          correctIndex: 1,
          explanation:
            "Cache memory grows with tokens times concurrent requests and is usually the limiting resource.",
        },
        {
          id: "q5",
          prompt: "What do grouped-query attention models do to the KV cache?",
          options: [
            "Make it larger",
            "Share key/value heads across several query heads, shrinking the cache",
            "Remove it entirely",
            "Store it on disk only",
          ],
          correctIndex: 1,
          explanation:
            "Fewer key/value heads means fewer vectors stored per token, so more requests fit in memory.",
        },
      ],
    },
    {
      id: "sm-1-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: the slow model server",
      blurb: "Every request takes about 20 seconds before generating anything. Find the line.",
      language: "python",
      lines: [
        "def handle(request):",
        "    model = load_model(MODEL_PATH)",
        "    return model.generate(request.prompt)",
      ],
      buggyLine: 2,
      reasons: [
        "generate must be called before load_model",
        "the model is loaded from disk on every request instead of once at startup, which wastes time and memory",
        "request.prompt cannot be passed to a model",
        "load_model needs a second argument",
      ],
      correctReasonIndex: 1,
      explanation:
        "Loading weights is slow and memory-hungry. Load once when the server starts and reuse it for every request.",
      fix: "model = load_model(MODEL_PATH)   # at module level or in startup, not inside handle()",
      xp: 40,
    },
    {
      id: "sm-1-code",
      kind: "code",
      title: "Code challenge: KV cache size",
      blurb: "Compute the KV cache memory for a batch of requests, in GB.",
      functionName: "kvCacheGB",
      starter: `/**
 * kvCacheGB(layers, kvHeads, headDim, bytesPerValue, tokens, batch)
 *
 * Per token, each layer stores a key and a value for every kv head:
 *   bytes per token = 2 * layers * kvHeads * headDim * bytesPerValue
 *
 * Return the memory in GB (1 GB = 1e9 bytes) for 'tokens' tokens in each of
 * 'batch' requests, rounded to two decimal places.
 */
function kvCacheGB(layers, kvHeads, headDim, bytesPerValue, tokens, batch) {
  // your code here
}`,
      tests: [
        { name: "7B-style model, one request", args: [32, 32, 128, 2, 4096, 1], expected: 2.15 },
        { name: "grouped-query attention shrinks it", args: [32, 8, 128, 2, 4096, 1], expected: 0.54 },
        { name: "large model, long context, batch of 4", args: [80, 8, 128, 2, 8192, 4], expected: 10.74 },
        { name: "one-byte values", args: [32, 32, 128, 1, 2048, 1], expected: 0.54 },
        { name: "tiny case rounds to zero", args: [1, 1, 64, 2, 1000, 1], expected: 0 },
      ],
      hints: [
        "Bytes per token is 2 * layers * kvHeads * headDim * bytesPerValue.",
        "Multiply by tokens and by batch, then divide by 1e9.",
        "Round with Math.round(x * 100) / 100.",
      ],
      solution: `function kvCacheGB(layers, kvHeads, headDim, bytesPerValue, tokens, batch) {
  const bytes = 2 * layers * kvHeads * headDim * bytesPerValue * tokens * batch;
  return Math.round((bytes / 1e9) * 100) / 100;
}`,
      xp: 70,
    },
  ],
};
