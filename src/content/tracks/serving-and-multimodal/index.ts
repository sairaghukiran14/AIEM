import type { Quiz, Track } from "@/content/types";

import { lesson as llmServing } from "./lessons/01-llm-serving";
import { lesson as quantizationSelfHosting } from "./lessons/02-quantization-self-hosting";
import { lesson as multimodalInputs } from "./lessons/03-multimodal-inputs";
import { lesson as multimodalRag } from "./lessons/04-multimodal-rag";

const gate: Quiz = {
  id: "sm-gate",
  kind: "gate",
  title: "Track Gate: Serving, Self-Hosting & Multimodal AI",
  blurb:
    "Ten questions drawn from the whole track, at interview difficulty. Score 70% to complete the track and unlock the capstone.",
  passPercent: 70,
  xp: 200,
  questions: [
    {
      id: "g1",
      prompt: "Which phase of generation determines time to first token, and which determines total time?",
      options: [
        "Decode determines the first token; prefill determines the total",
        "Prefill over the prompt determines the first token; the number of sequential decode steps drives total time",
        "Both are fixed by the model size alone",
        "Sampling determines both",
      ],
      correctIndex: 1,
      explanation:
        "Prefill is one parallel pass over the prompt. Decode is one token per step, so output length adds time.",
    },
    {
      id: "g2",
      prompt: "A model has 32 layers, 8 key/value heads of dimension 128, and stores values in 2 bytes. About how much KV cache does one 4,096-token request need?",
      options: ["About 0.07 GB", "About 0.54 GB", "About 2.15 GB", "About 17 GB"],
      correctIndex: 1,
      explanation:
        "2 x 32 x 8 x 128 x 2 bytes is 131,072 bytes per token. Times 4,096 tokens is about 0.54 GB.",
    },
    {
      id: "g3",
      prompt: "Why does continuous batching beat static batching?",
      options: [
        "It shrinks the model",
        "Finished requests free their slot immediately and waiting requests join, so the GPU stays busy",
        "It removes the KV cache",
        "It makes every request faster",
      ],
      correctIndex: 1,
      explanation:
        "Scheduling at every decode step avoids idle slots while one long request finishes.",
    },
    {
      id: "g4",
      prompt: "Concurrency on your GPU is capped even though compute is idle. What is the most likely limiter?",
      options: [
        "The tokenizer",
        "GPU memory left for the KV cache after loading the weights",
        "The network cable",
        "The temperature setting",
      ],
      correctIndex: 1,
      explanation:
        "Cache memory grows with tokens times concurrent requests and usually limits how many can run together.",
    },
    {
      id: "g5",
      prompt: "How much memory do the weights of a 70-billion-parameter model need at 4 bits per weight?",
      options: ["About 17.5 GB", "About 35 GB", "About 70 GB", "About 140 GB"],
      correctIndex: 1,
      explanation:
        "70 billion x 0.5 bytes is about 35 GB. At 16 bits it would be 140 GB.",
    },
    {
      id: "g6",
      prompt: "A $2-per-hour GPU is busy half the time. What does that do to the cost per token compared with always busy?",
      options: [
        "Nothing",
        "It doubles it, because idle hours are paid for but serve no tokens",
        "It halves it",
        "It removes the cost",
      ],
      correctIndex: 1,
      explanation:
        "Cost per token is hourly price divided by tokens actually served, so utilisation matters directly.",
    },
    {
      id: "g7",
      prompt: "Which is the strongest reason to self-host a model?",
      options: [
        "It is always cheaper than an API",
        "A requirement that data must not leave your infrastructure, or sustained high volume on a small model that passes your eval",
        "You want to avoid writing evals",
        "You do not have engineers to run it",
      ],
      correctIndex: 1,
      explanation:
        "Data control and high steady utilisation can justify the operational effort. Low or spiky traffic usually does not.",
    },
    {
      id: "g8",
      prompt: "Why can resizing an image before sending it to a vision model cut cost?",
      options: [
        "The model cannot read large images",
        "Fewer tiles produce fewer image tokens, which are billed and fill the context window",
        "It changes the answer language",
        "It removes the need for a prompt",
      ],
      correctIndex: 1,
      explanation:
        "Image tokens scale with resolution, so send only the detail the task needs.",
    },
    {
      id: "g9",
      prompt: "A vision model's invoice total does not equal the sum of the line items. What should happen?",
      options: [
        "Trust the total anyway",
        "Flag it for review or retry, because a failed cross-check signals a misread",
        "Increase the temperature",
        "Delete the invoice",
      ],
      correctIndex: 1,
      explanation:
        "Validate model reads of numbers with independent checks and route failures to a person.",
    },
    {
      id: "g10",
      prompt: "Which design makes an answer from a recorded call verifiable?",
      options: [
        "Join all segments and drop the times",
        "Transcribe with timestamps and keep each chunk's start and end, so a citation can link to the moment",
        "Embed the raw audio only",
        "Summarise the call and discard the transcript",
      ],
      correctIndex: 1,
      explanation:
        "Time ranges in chunk metadata turn citations into links to the exact moment.",
    },
  ],
};

export const servingAndMultimodal: Track = {
  slug: "serving-and-multimodal",
  order: 10,
  title: "Serving, Self-Hosting & Multimodal AI",
  tagline: "Running models yourself, and beyond text",
  description:
    "How model servers work (KV cache, batching, throughput versus latency), quantization and the honest cost of self-hosting, multimodal models with vision and audio, and RAG over images, scans and recordings. Every lesson ends with interview questions.",
  level: "advanced",
  icon: "Server",
  accentVar: "--amber",
  interviewTopics: [
    "Prefill vs decode, time to first token",
    "KV cache memory and grouped-query attention",
    "Continuous batching and paged cache",
    "Quantization trade-offs",
    "Self-host vs API cost per million tokens",
    "Image tokens, tiling and cost",
    "Vision model failure modes",
    "Transcripts, timestamps and multimodal RAG",
  ],
  lessons: [llmServing, quantizationSelfHosting, multimodalInputs, multimodalRag],
  gate,
  published: true,
  cheatsheet: [
    {
      heading: "How serving works",
      items: [
        { term: "Prefill", detail: "One parallel pass over the prompt. Compute-bound. Sets time to first token." },
        { term: "Decode", detail: "One token per step, reusing the KV cache. Limited by memory bandwidth. Output length sets total time." },
        { term: "KV cache", detail: "bytes per token = 2 x layers x kv heads x head dim x bytes per value. Grows with every token of every request." },
        { term: "Batching", detail: "Static: wait for the slowest. Continuous: refill slots at every decode step, so the GPU stays busy. Paged cache wastes less memory." },
        { term: "Limiter", detail: "After weights load, remaining GPU memory is the KV budget. It usually caps concurrency before compute does." },
        { term: "Latency vs throughput", detail: "Bigger batches lower cost per token but can raise wait. Interactive: small batches. Offline: maximise batch." },
      ],
    },
    {
      heading: "Quantization & memory",
      items: [
        { term: "Weights memory", detail: "GB = billions of parameters x bits per weight / 8. 7B: 14 GB at 16 bits, 7 GB at 8 bits, 3.5 GB at 4 bits." },
        { term: "Trade-off", detail: "Less memory and faster decoding, but quality can drop, mostly at 4 bits and on reasoning or long outputs. Always re-run your eval." },
        { term: "Beyond weights", detail: "Budget for the KV cache, activations and the serving engine too." },
        { term: "Grouped-query attention", detail: "Fewer key/value heads shrink the KV cache by that factor." },
      ],
    },
    {
      heading: "Self-hosting decisions",
      items: [
        { term: "Reasons that hold", detail: "Data must not leave your infrastructure, sustained high volume on a small model, offline use, deep customisation." },
        { term: "Cost per million tokens", detail: "GPU price per hour / (tokens per second x 3600 x utilisation / 1e6). Idle time is paid for." },
        { term: "Hidden costs", detail: "On-call, monitoring, upgrades, scaling, failover, security, and the engineers who do it." },
        { term: "Stacks", detail: "vLLM-style servers for GPU throughput, llama.cpp and Ollama for local and small deployments, managed hosting for open models." },
        { term: "Process", detail: "Smallest model that passes your eval, quantize to fit, load test, roll out behind a flag with the old model as fallback." },
      ],
    },
    {
      heading: "Multimodal models",
      items: [
        { term: "Images", detail: "Resized or tiled, encoded, and projected into tokens alongside text. More tiles means more tokens and cost." },
        { term: "Cost control", detail: "Resize and crop to what the task needs, extract text first, send hard cases to the vision model, cache by hash, never resend images every turn." },
        { term: "Failure modes", detail: "Misread small text and digits, counting and spatial errors, invented detail, high cost, privacy of images." },
        { term: "Validate", detail: "Cross-checks (totals vs line items), schemas, human review for high stakes, evals on real labelled images." },
        { term: "Audio and video", detail: "Transcribe to text with timestamps and speakers. For video sample sparse key frames plus the transcript." },
      ],
    },
    {
      heading: "Multimodal RAG",
      items: [
        { term: "Convert to text", detail: "OCR, captions and transcripts, then normal RAG. Cheapest default. Loses purely visual information." },
        { term: "Multimodal embeddings", detail: "Images and text in one space, so a description retrieves images. Weaker on fine detail and exact text." },
        { term: "Page-image retrieval", detail: "Retrieve page screenshots and let a vision model read them. For layout-heavy documents. Higher cost per query." },
        { term: "Metadata", detail: "Keep source, page or start and end times, and speaker, so you can filter, cite and link to the moment." },
        { term: "Evaluate", detail: "Check each conversion (transcript, OCR, captions) separately, then retrieval and faithfulness. Errors multiply." },
      ],
    },
  ],
};
