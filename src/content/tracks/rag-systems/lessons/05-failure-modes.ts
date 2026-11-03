import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "rag-failure-modes",
  order: 5,
  title: "RAG Failure Modes & Debugging",
  summary:
    "When a RAG answer is wrong, the cause is almost always in one stage. Learn the taxonomy and the order in which to check.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "\"The chatbot gave a wrong answer\" is not a bug report you can act on. A RAG system is a chain of stages (lesson 1), and a wrong answer means **some link broke**. Debugging is the skill of finding which one, quickly, instead of tweaking the prompt and hoping.",
    },
    {
      type: "table",
      headers: ["Stage", "Typical failure", "What you would see"],
      rows: [
        ["**Ingestion**", "the document was never indexed, parsed badly, or is stale", "no chunk with the answer exists in the store"],
        ["**Retrieval**", "the right chunk exists but was not returned in the top k", "right chunk missing or ranked far down"],
        ["**Assembly**", "retrieved, but dropped by the budget, buried or truncated", "right chunk found but absent from the final prompt"],
        ["**Generation**", "evidence is in the prompt but the model ignores, misreads or over-refuses", "right chunk in the prompt, wrong answer"],
      ],
    },
    {
      type: "sorter",
      title: "Which stage is at fault?",
      prompt: "Classify each symptom by the first stage that is broken.",
      categories: ["Ingestion", "Retrieval", "Assembly", "Generation"],
      items: [
        { text: "The policy PDF was a scanned image and the index holds empty text for it", answer: 0, why: "Nothing usable was ever stored, so no later stage can find it." },
        { text: "The correct chunk exists but sits at rank 40 for this query", answer: 1, why: "It was not in the candidates, so rerank and generate never saw it." },
        { text: "The right chunk was retrieved but cut by the token budget before reaching the prompt", answer: 2, why: "The failure happens after retrieval, while packing the context." },
        { text: "The prompt contains the exact answer, but the model replies with a different number from memory", answer: 3, why: "The evidence was present. The model did not use it faithfully." },
      ],
    },
    {
      type: "stepper",
      title: "The debugging order",
      steps: [
        { label: "1. Is the answer in the corpus?", detail: "Search the raw store for the gold passage. If it is not there, the problem is ingestion: parsing, scope, or freshness. Fix that first.", items: ["gold chunk present?"], mark: [0] },
        { label: "2. Was it retrieved?", detail: "Run the query and check the candidate list. Missing or low ranked means retrieval: query rewriting, chunking, hybrid search, or the embedding model.", items: ["gold in top k?"], mark: [0] },
        { label: "3. Did it reach the prompt?", detail: "Print the final assembled prompt. If the chunk is absent, look at thresholds, deduplication, ordering and the token budget.", items: ["gold in the prompt?"], mark: [0] },
        { label: "4. Did the model use it?", detail: "If it is in the prompt and the answer is still wrong, the problem is generation: grounding instructions, conflicting chunks, model choice, or an over-strict refusal rule.", items: ["answer cites gold?"], mark: [0] },
        { label: "5. Fix, then prove it", detail: "Change one thing, re-run the whole eval set, and diff per case so you know nothing else regressed (Track 2).", items: ["eval before", "eval after"], mark: [1] },
      ],
      caption: "Walk the stages in order. The first one that fails is your problem.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Common root causes and fixes" },
    {
      type: "table",
      headers: ["Symptom", "Likely cause", "First thing to try"],
      rows: [
        ["Answers are about the right topic but the wrong detail", "chunks too large or split mid-fact", "inspect chunk boundaries; smaller chunks, overlap, context headers (Track 3)"],
        ["Exact IDs and codes are never found", "dense-only retrieval", "add keyword search and fusion (Track 3)"],
        ["Follow-up questions fail", "no query rewriting", "rewrite with history (lesson 2)"],
        ["Right chunk retrieved but ignored", "noisy or contradictory context", "lower k, rerank, dedupe, stronger grounding prompt"],
        ["Answers are out of date", "stale index or no deletion handling", "incremental re-indexing, document versions, freshness metadata"],
        ["Confidently answers unanswerable questions", "no score floor or refusal path", "threshold plus explicit abstain instruction (lesson 4)"],
        ["Users see data they should not", "no access filter at retrieval", "filter by permissions in the search call (lesson 1)"],
      ],
    },
    { type: "h", text: "What you need to be able to see" },
    {
      type: "p",
      text: "You cannot debug what you did not record. For every request, log a **trace** with the original and rewritten query, the candidate ids and scores, the ids that reached the prompt, the final prompt, the model's answer and its citations. With that you can answer the four stage questions from a log line instead of by guesswork (Track 6 covers tracing in depth).",
    },
    {
      type: "callout",
      tone: "warn",
      title: "An end-to-end score hides the cause",
      text: "If you only measure \"was the final answer right\", a drop could be retrieval, assembly or generation, and you will tune the wrong thing. Measure the stages separately (lesson 6).",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"your RAG bot gave a wrong answer, what do you do?\"",
      text: "Walk the stages in order with evidence: is the answer in the corpus, was it retrieved, did it reach the prompt, did the model use it. Name the log fields you need, fix the first failing stage, add the question to the eval set, and re-run everything.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Locate the first failing stage from a request trace.",
    code: `from dataclasses import dataclass

@dataclass
class Trace:
    gold_chunk_id: str
    corpus_ids: set[str]        # every chunk id in the index
    retrieved_ids: list[str]    # candidates returned by search
    prompt_ids: list[str]       # chunks that made it into the final prompt
    cited_ids: list[str]        # chunks the answer actually cited


def diagnose(t: Trace) -> str:
    if t.gold_chunk_id not in t.corpus_ids:
        return "ingestion"       # never indexed, or parsed away
    if t.gold_chunk_id not in t.retrieved_ids:
        return "retrieval"       # exists, but search missed it
    if t.gold_chunk_id not in t.prompt_ids:
        return "assembly"        # retrieved, then dropped by thresholds or budget
    if t.gold_chunk_id not in t.cited_ids:
        return "generation"      # in the prompt, but not used
    return "ok"


# Run it over every failing eval case and count by stage: that tells you where to invest.
from collections import Counter
print(Counter(diagnose(trace_for(case)) for case in failing_cases))`,
  },

  interview: [
    {
      question: "A user reports that your RAG assistant gave a wrong answer. How do you debug it?",
      answer:
        "I pull the request's trace and check the stages in order: was the answer in the corpus at all, was the right chunk retrieved, did it reach the final prompt, and did the model use it. The first failing stage is the cause: ingestion, retrieval, assembly or generation. I fix that, add the question to my eval set, and re-run the full set to check for regressions.",
      weakAnswer:
        "I would improve the prompt. — That assumes the failure is in generation without evidence.",
    },
    {
      question: "The right chunk is in the prompt but the answer is wrong. What next?",
      answer:
        "That is a generation problem. I check for conflicting or noisy chunks, the position of the chunk, whether the grounding instructions are explicit enough, and whether an over-strict refusal rule is firing. I try fewer, better-ranked chunks, a clearer prompt, or a stronger model for this step, then measure faithfulness on the eval set.",
    },
    {
      question: "What should you log for every RAG request?",
      answer:
        "The original and rewritten queries, candidate ids and scores, the ids that made it into the prompt, the final prompt, the answer with its citations, plus latency and token counts. With that, any bad answer can be placed in a stage. I also redact or hash sensitive content according to policy.",
    },
    {
      question: "Why measure stages separately instead of only end-to-end accuracy?",
      answer:
        "An end-to-end number cannot tell you whether to fix retrieval, assembly or generation. Stage metrics, such as recall at k for retrieval and faithfulness for generation, point to the broken link. Otherwise teams tune the prompt for a retrieval problem and see no gain.",
    },
    {
      question: "Answers are correct for new documents but old ones return stale content. What do you suspect?",
      answer:
        "Ingestion and index maintenance: updates may add new chunks without removing or replacing old versions, deletions may not propagate, or chunk ids may collide. I would inspect the store for multiple versions of the same document, add version and date metadata, make updates replace by document id, and filter or prefer the latest at retrieval.",
    },
  ],

  challenges: [
    {
      id: "rag-5-quiz",
      kind: "quiz",
      title: "Checkpoint: failure modes",
      blurb: "Five questions on locating the broken stage.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is the right first question when debugging a wrong RAG answer?",
          options: [
            "Is the prompt wording polite enough?",
            "Is the answer actually present in the indexed corpus?",
            "Is the model too small?",
            "Is the temperature too low?",
          ],
          correctIndex: 1,
          explanation:
            "If the passage was never indexed, nothing downstream can succeed. Start at the beginning of the chain.",
        },
        {
          id: "q2",
          prompt: "The gold chunk is retrieved at rank 3 but is not in the final prompt. Which stage is at fault?",
          options: ["Ingestion", "Retrieval", "Context assembly", "Generation"],
          correctIndex: 2,
          explanation:
            "It was retrieved but dropped afterwards, by a threshold, deduplication or the token budget.",
        },
        {
          id: "q3",
          prompt: "Exact product codes are never found. What is the most likely fix?",
          options: [
            "A larger chat model",
            "Adding keyword search alongside vector search",
            "A higher temperature",
            "Shorter answers",
          ],
          correctIndex: 1,
          explanation:
            "Dense retrieval blurs rare literal tokens. Hybrid search covers them (Track 3).",
        },
        {
          id: "q4",
          prompt: "Why is an end-to-end accuracy score alone a poor debugging tool?",
          options: [
            "It is too expensive to compute",
            "It cannot tell you which stage caused a drop",
            "It always reads 100%",
            "It cannot be automated",
          ],
          correctIndex: 1,
          explanation:
            "You need stage-level metrics to know whether to change retrieval, assembly or generation.",
        },
        {
          id: "q5",
          prompt: "A user sees restricted content in an answer. Which stage is the root cause?",
          options: [
            "Generation, because the model should have refused",
            "Retrieval or ingestion, because access control was not applied when selecting chunks",
            "The user interface",
            "The embedding model",
          ],
          correctIndex: 1,
          explanation:
            "The restricted text must never enter the prompt. Permission filtering belongs in the search call.",
        },
      ],
    },
    {
      id: "rag-5-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: an evaluation loop",
      blurb: "Accuracy dropped last week and nobody can tell why. Find the line.",
      language: "python",
      lines: [
        "def evaluate(questions):",
        "    correct = 0",
        "    for q in questions:",
        "        answer = rag(q.text)",
        "        correct += judge(answer, q.expected)",
        "    return correct / len(questions)",
      ],
      buggyLine: 4,
      reasons: [
        "the loop should iterate in reverse",
        "rag() returns only the final answer, discarding the retrieved chunks and prompt, so a wrong answer cannot be traced to retrieval versus generation",
        "judge must be called before rag",
        "correct must start at 1",
      ],
      correctReasonIndex: 1,
      explanation:
        "A black-box call throws away the evidence needed to debug. Return a trace (retrieved ids, prompt ids, answer, citations) and score each stage, so a drop can be located.",
      fix: "trace = rag_with_trace(q.text)   # keep retrieved_ids, prompt_ids, answer, cited_ids",
      xp: 40,
    },
    {
      id: "rag-5-code",
      kind: "code",
      title: "Code challenge: diagnose the failing stage",
      blurb: "Given a request trace, return the first stage where the gold chunk is lost.",
      functionName: "diagnose",
      starter: `/**
 * trace = {
 *   goldId:       the id of the chunk that contains the answer,
 *   corpusIds:    ids of every chunk in the index,
 *   retrievedIds: ids returned by search,
 *   promptIds:    ids that made it into the final prompt,
 *   citedIds:     ids the answer cited,
 * }
 *
 * Return the FIRST stage where goldId is missing:
 *   not in corpusIds    -> "ingestion"
 *   not in retrievedIds -> "retrieval"
 *   not in promptIds    -> "assembly"
 *   not in citedIds     -> "generation"
 *   otherwise           -> "ok"
 */
function diagnose(trace) {
  // your code here
}`,
      tests: [
        { name: "never indexed", args: [{ goldId: "g", corpusIds: ["a"], retrievedIds: [], promptIds: [], citedIds: [] }], expected: "ingestion" },
        { name: "indexed but not retrieved", args: [{ goldId: "g", corpusIds: ["a", "g"], retrievedIds: ["a"], promptIds: ["a"], citedIds: [] }], expected: "retrieval" },
        { name: "retrieved but dropped", args: [{ goldId: "g", corpusIds: ["g"], retrievedIds: ["g"], promptIds: [], citedIds: [] }], expected: "assembly" },
        { name: "in the prompt but not cited", args: [{ goldId: "g", corpusIds: ["g"], retrievedIds: ["g"], promptIds: ["g"], citedIds: ["x"] }], expected: "generation" },
        { name: "present everywhere", args: [{ goldId: "g", corpusIds: ["g"], retrievedIds: ["g"], promptIds: ["g"], citedIds: ["g"] }], expected: "ok" },
        {
          name: "the earliest failing stage wins",
          args: [{ goldId: "g", corpusIds: [], retrievedIds: [], promptIds: [], citedIds: [] }],
          expected: "ingestion",
        },
      ],
      hints: [
        "Check the stages in pipeline order and return as soon as one fails.",
        "Use includes on each list. A missing id means that stage lost it.",
        "If every check passes, return 'ok'.",
      ],
      solution: `function diagnose(trace) {
  if (!trace.corpusIds.includes(trace.goldId)) return "ingestion";
  if (!trace.retrievedIds.includes(trace.goldId)) return "retrieval";
  if (!trace.promptIds.includes(trace.goldId)) return "assembly";
  if (!trace.citedIds.includes(trace.goldId)) return "generation";
  return "ok";
}`,
      xp: 70,
    },
  ],
};
