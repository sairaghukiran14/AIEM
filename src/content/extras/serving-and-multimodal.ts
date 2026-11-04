import type { LessonExtras } from "./types";

export const servingExtras: LessonExtras = {
  "how-llm-serving-works": {
    concept: [
      {
        type: "predict",
        title: "Predict: why concurrency stops",
        prompt: "A GPU serves many short chats fine, but fails with out-of-memory errors when several long conversations run at once, while compute sits idle. What is happening?",
        options: [
          "The tokenizer is overloaded",
          "The KV cache for all active requests has outgrown the memory left after the weights",
          "The model forgot the weights",
          "The temperature is too low",
        ],
        answer: 1,
        why: "Cache memory grows with tokens times concurrent requests. Long conversations multiply both, so memory runs out before compute does.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "How many conversations fit on one GPU?",
        problem: "An 80 GB GPU holds a model whose weights take 14 GB. The KV cache costs about 0.5 GB per 1,000 tokens of one request (0.0005 GB per token). Each conversation uses 4,000 tokens. How many fit?",
        steps: [
          { do: "Memory left for the cache after the weights.", result: "80 - 14 = 66 GB" },
          { do: "Cache for one 4,000-token conversation.", result: "4,000 x 0.0005 = 2 GB" },
          { do: "Divide to find how many fit.", result: "66 / 2 = 33 conversations" },
          { do: "Now double the conversation length to 8,000 tokens.", result: "Each needs 4 GB, so 66 / 4 = 16 conversations: half as many" },
        ],
        takeaway:
          "Capacity is inversely proportional to context length. Capping context, or using a model with fewer key/value heads, directly raises how many users one GPU serves. Leave some headroom in practice.",
      },
    ],
  },

  "quantization-and-self-hosting": {
    concept: [
      {
        type: "predict",
        title: "Predict: will it fit?",
        prompt: "You want to run a 13-billion-parameter model on a single 24 GB GPU. Which precision for the weights is the realistic choice?",
        options: [
          "32-bit, about 52 GB",
          "16-bit, about 26 GB, which still does not fit",
          "8-bit or 4-bit, about 13 GB or 6.5 GB, which fit with room for the KV cache",
          "Precision does not affect memory",
        ],
        answer: 2,
        why: "Memory is parameters times bytes per weight. 16-bit needs about 26 GB, over the limit, while 8-bit or 4-bit fit and leave space for the cache. Then you must check quality on your own eval.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Self-host or pay per token?",
        problem: "A $2/hour GPU serves 1,500 tokens per second when busy, and is busy 50% of the time. A hosted API charges $1.50 per million tokens for the same quality. Which is cheaper per token, and what happens if utilisation is only 20%?",
        steps: [
          { do: "Tokens served in an hour at 50% utilisation.", result: "1,500 x 3,600 x 0.5 = 2,700,000 tokens, or 2.7 million" },
          { do: "Self-hosted cost per million tokens.", result: "$2 / 2.7 = about $0.74" },
          { do: "Compare with the API.", result: "$0.74 vs $1.50: self-hosting is about half the price at this utilisation" },
          { do: "At 20% utilisation.", result: "1,500 x 3,600 x 0.2 = 1.08 million tokens an hour, so $2 / 1.08 = $1.85, more than the API" },
        ],
        takeaway:
          "The same hardware flips from cheaper to costlier as utilisation falls. Estimate utilisation honestly, and add operating cost before deciding.",
      },
    ],
  },

  "multimodal-llms-vision-and-audio": {
    concept: [
      {
        type: "predict",
        title: "Predict: the screenshot chat",
        prompt: "A user asks ten questions in a row about the same screenshot, and your code attaches the screenshot to every message. What does that do?",
        options: [
          "Nothing, images are free after the first",
          "The image tokens are re-sent and billed on every turn, so cost and latency climb",
          "It makes the model smarter each turn",
          "It deletes the image",
        ],
        answer: 1,
        why: "Image tokens count as input every time they are sent. Attach the image once, or describe it once and reuse the description.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "What a daily image workload costs",
        problem: "Images are 2,048 x 1,024 pixels, tiles are 512 pixels, each tile costs 150 tokens plus 100 fixed tokens per image. You process 20,000 images a day at $3 per million input tokens. Then you downscale images to 1,024 x 512. Compare the cost.",
        steps: [
          { do: "Tiles for 2,048 x 1,024.", result: "ceil(2048/512) x ceil(1024/512) = 4 x 2 = 8 tiles" },
          { do: "Tokens per image, and daily cost.", result: "100 + 8 x 150 = 1,300 tokens. 20,000 x 1,300 = 26 million tokens, so $78 a day" },
          { do: "After downscaling to 1,024 x 512, tiles.", result: "2 x 1 = 2 tiles, so 100 + 2 x 150 = 400 tokens" },
          { do: "New daily cost.", result: "20,000 x 400 = 8 million tokens, so $24 a day: 69% cheaper" },
        ],
        takeaway:
          "Resolution drives cost directly. Downscale to the smallest size that still reads correctly, and re-check accuracy on your labelled images after each reduction.",
      },
    ],
  },

  "multimodal-rag-images-pdfs-audio": {
    concept: [
      {
        type: "predict",
        title: "Predict: slides with charts",
        prompt: "Financial slide decks hold the key facts in charts and tables. Plain text extraction returns fragments. What is a good approach?",
        options: [
          "Ignore the charts",
          "Retrieve page images and let a vision model read the retrieved pages, or add accurate chart descriptions and underlying numbers",
          "Lower the chunk size",
          "Use a smaller embedding dimension",
        ],
        answer: 1,
        why: "When layout and figures carry the meaning, retrieval has to keep that information, either by indexing page images for a vision model to read or by storing descriptions and data for the charts.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Chunking a transcript by time",
        problem: "A transcript has segments 0-10 s, 10-20 s, 20-35 s, 35-50 s and 50-62 s. Group them into chunks spanning at most 30 seconds each.",
        steps: [
          { do: "Start a chunk at 0-10 s. Add 10-20 s: span 20 s. Add 20-35 s?", result: "Span would be 35 s, over 30, so close the chunk at 0-20 s" },
          { do: "Start the next at 20-35 s (span 15 s). Add 35-50 s?", result: "Span 30 s, which is allowed, so it joins: 20-50 s" },
          { do: "Add 50-62 s?", result: "Span would be 42 s, over 30, so close it and start a new chunk at 50-62 s" },
          { do: "Final chunks with time ranges.", result: "0-20 s, 20-50 s, 50-62 s. Each keeps its start and end for citations." },
        ],
        takeaway:
          "Greedy grouping by time is simple and predictable. Keep the first start and last end on every chunk so a citation can link to the exact moment.",
      },
    ],
  },
};
