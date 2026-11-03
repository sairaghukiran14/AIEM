"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";

const STAGES = [
  {
    name: "Query",
    does: "Take the user's message and, if needed, rewrite it into a standalone search query.",
    knobs: "rewriting, multi-query, filters from the user's permissions",
    fails: "A follow-up like 'and what about 2023?' is searched as written and finds nothing.",
    check: "Log the final query that was actually sent to search.",
  },
  {
    name: "Embed",
    does: "Turn the query into a vector with the same embedding model used to index the documents.",
    knobs: "embedding model, dimensions, query/document prefixes",
    fails: "A different model or version for queries than for documents makes every score meaningless.",
    check: "Assert model id and dimension match the index at startup.",
  },
  {
    name: "Retrieve",
    does: "Fetch the top-k nearest chunks, often from both vector and keyword (BM25) search.",
    knobs: "k, hybrid weights, metadata filters, ANN recall settings",
    fails: "The answer chunk is not in the top-k at all, so no later stage can recover it.",
    check: "Measure recall@k on labelled questions.",
  },
  {
    name: "Rerank",
    does: "Re-score a larger candidate set with a slower, more accurate cross-encoder and keep the best few.",
    knobs: "candidates in, results out, reranker choice, score threshold",
    fails: "Reranking too few candidates; the right chunk was at rank 30 and never reached the reranker.",
    check: "Compare recall and precision before and after reranking.",
  },
  {
    name: "Assemble",
    does: "Pack chunks into the prompt within a token budget, ordered and labelled with source ids.",
    knobs: "token budget, ordering, deduplication, delimiters, source labels",
    fails: "The right chunk is retrieved but placed mid-prompt, or truncated by the budget.",
    check: "Inspect the final prompt for the failing questions.",
  },
  {
    name: "Generate",
    does: "Answer using only the supplied context, cite sources, and say so when the context is insufficient.",
    knobs: "grounding instructions, temperature, citation format, refusal policy",
    fails: "The model ignores the context and answers from memory, or cites a source that does not support the claim.",
    check: "Score faithfulness: is every claim supported by a cited chunk?",
  },
];

export function RagPipeline() {
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => setI((n) => (n + 1) % STAGES.length), 1600);
    return () => clearInterval(id);
  }, [play]);

  const s = STAGES[i];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGES.map((st, n) => (
          <div key={st.name} className="flex items-center gap-1.5">
            <button
              onClick={() => { setPlay(false); setI(n); }}
              aria-pressed={n === i}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                n === i ? "border-text bg-text text-white" : n < i ? "border-text-dim bg-bg-raised" : "border-border-strong bg-bg text-text-muted hover:bg-bg-hover"
              }`}
            >
              {n + 1}. {st.name}
            </button>
            {n < STAGES.length - 1 && <ArrowRight className="size-3.5 text-text-dim" aria-hidden />}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border-base bg-bg p-4 text-sm">
        <p className="text-base font-semibold">{s.name}</p>
        <dl className="mt-3 space-y-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-dim">What it does</dt>
            <dd className="mt-0.5 text-text-muted">{s.does}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-dim">What you can tune</dt>
            <dd className="mt-0.5 text-text-muted">{s.knobs}</dd>
          </div>
          <div className="rounded-md border border-dashed border-border-strong p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide">How it typically fails</dt>
            <dd className="mt-0.5 text-text-muted">{s.fails}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-text-dim">How to catch it</dt>
            <dd className="mt-0.5 text-text-muted">{s.check}</dd>
          </div>
        </dl>
      </div>

      <button className="btn btn-ghost" onClick={() => setPlay((p) => !p)}>
        {play ? <Pause className="size-4" /> : <Play className="size-4" />}
        {play ? "Pause" : "Auto-play the pipeline"}
      </button>
    </div>
  );
}
