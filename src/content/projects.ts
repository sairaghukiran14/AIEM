/**
 * Portfolio project briefs. They are NOT graded: the server cannot safely run what a
 * learner builds, so these exist to give people something real to show and defend.
 */

export type ProjectBrief = {
  id: string;
  title: string;
  /** Track slugs whose lessons this project exercises. */
  tracks: string[];
  summary: string;
  /** Concrete, checkable requirements. */
  requirements: string[];
  stretch: string[];
  /** What to put in the project's README so a reviewer can judge it in five minutes. */
  show: string[];
  /** Questions an interviewer is likely to ask about this project. */
  probes: string[];
};

export const projects: ProjectBrief[] = [
  {
    id: "streaming-chat",
    title: "Streaming chat app with memory and cost tracking",
    tracks: ["llm-foundations", "prompt-engineering", "production-ai"],
    summary:
      "A chat app that streams answers, remembers the conversation within a budget, and shows what each conversation cost.",
    requirements: [
      "Stream tokens to the browser over server-sent events, with no proxy buffering, and a working stop button that cancels the upstream request.",
      "Keep the system prompt pinned, trim the oldest turns to fit a token budget (counted with the model's tokenizer) and reserve room for the reply.",
      "Return structured output for at least one feature (for example conversation title and tags) validated against a schema, with a bounded retry that feeds errors back.",
      "Order the prompt so the stable prefix is first, and record the cache hit rate from the provider's usage fields.",
      "Retry only transient errors with capped exponential backoff, jitter and Retry-After.",
      "Show time to first token, total time, tokens in and out, and cost per conversation.",
    ],
    stretch: [
      "Summarise old turns into a running summary instead of dropping them.",
      "Add a per-user token budget with a clear message when it is reached.",
      "Fall back to a secondary model when the primary is failing.",
    ],
    show: [
      "A diagram of the request path from browser to model, marking every hop that must not buffer.",
      "Measured numbers: time to first token and cost per conversation, before and after prompt caching.",
      "Your context-trimming strategy and the edge case it handles badly.",
    ],
    probes: [
      "Why is time to first token different from total time, and what did you do about each?",
      "What happens to your memory when the conversation outgrows the window?",
      "A proxy buffers responses in production. How would you notice, and how would you fix it?",
    ],
  },
  {
    id: "docs-rag",
    title: "Document question answering with citations",
    tracks: ["embeddings-and-search", "rag-systems"],
    summary:
      "A RAG assistant over a real document set that cites its sources, refuses when it does not know, and has an evaluation you can run.",
    requirements: [
      "Ingest at least 50 real documents with structure-aware chunking sized in tokens, a context header on each chunk, and metadata for filtering and citing.",
      "Use hybrid retrieval (vector plus keyword) with reciprocal rank fusion and a reranker over a deeper candidate list.",
      "Assemble the prompt within a token budget, with numbered sources, and the question last.",
      "Ground the answer: cite with [n], validate citations in code against the sources actually supplied, and reply with a clear 'not found' when evidence is missing.",
      "Apply an access filter at retrieval time for at least two user groups, and prove it with a test.",
      "Build a labelled set of at least 40 questions, including unanswerable ones, and report recall@k, MRR and a faithfulness score whose judge sees the sources.",
    ],
    stretch: [
      "Query rewriting for follow-up questions, logging both queries.",
      "Parent-child retrieval: match small chunks, answer from the larger parent.",
      "A stage-by-stage trace viewer that shows where a wrong answer went wrong.",
    ],
    show: [
      "Your retrieval numbers for each change you made, not only the final system.",
      "Three failures you found, which stage each was in, and how you fixed it.",
      "How you know the permission filter works.",
    ],
    probes: [
      "Your answer cites the wrong document. Walk me through finding out why.",
      "How did you choose the chunk size, and what did you try that did not work?",
      "How do you stop one user's documents appearing in another user's answer?",
    ],
  },
  {
    id: "research-agent",
    title: "A tool-using research agent with guardrails",
    tracks: ["tools-and-agents", "prompt-engineering"],
    summary:
      "An agent that researches a question with search and reading tools, cannot run away, and cannot do anything you did not approve.",
    requirements: [
      "Implement the agent loop yourself (no framework) with step, token and repeated-call limits enforced in code, and a clear failure message when a limit triggers.",
      "Design at least three tools with precise descriptions, constrained arguments, bounded paginated results and actionable errors.",
      "Validate every tool call against its schema before running it, and run a default-deny policy that allows, asks or denies by tool name and arguments.",
      "Require approval for any side-effecting tool, showing the exact action and arguments, and use an idempotency key on writes.",
      "Treat fetched pages as untrusted: fence them in escaped delimiters and include at least five injection attempts in your tests.",
      "Log every step with a trace id so any run can be replayed and read end to end.",
    ],
    stretch: [
      "A plan-and-execute mode with a revisable plan.",
      "Summarise older steps to keep long runs affordable, with the key facts kept in a scratchpad.",
      "Split the work between an orchestrator and workers that receive focused briefs, and measure the token multiple.",
    ],
    show: [
      "A table of tools: name, purpose, arguments and risk level.",
      "Your injection test cases and the results.",
      "Run cost and step counts for ten sample tasks.",
    ],
    probes: [
      "A web page tells your agent to email a file elsewhere. What stops it?",
      "Why does a 30-step run cost more than thirty times a single call?",
      "When would you not use an agent for this problem?",
    ],
  },
  {
    id: "eval-harness",
    title: "An evaluation harness for your own assistant",
    tracks: ["evals-and-observability", "rag-systems", "prompt-engineering"],
    summary:
      "The tooling that tells you whether a change helped: a dataset, scorers, a judge you have checked against people, and a CI gate.",
    requirements: [
      "Build a versioned dataset of at least 60 cases from real or realistic inputs, with edge cases, adversarial cases and a held-out slice.",
      "Score with code checks first and a judge only where code cannot decide, and show the uncertainty of every pass rate with a Wilson interval.",
      "Calibrate your judge: label at least 50 outputs by hand, report Cohen's kappa, and show how you changed the rubric after reading the disagreements.",
      "Compare two versions per case, listing fixes and regressions rather than only an average.",
      "Add a CI gate with an absolute floor, a maximum drop, a regression limit and zero tolerance on critical cases, with a baseline that only moves up through review.",
      "Cache responses by request hash, and report the cost of a full run.",
    ],
    stretch: [
      "Repeat noisy cases and quarantine flaky ones.",
      "Sample live traffic by id hash into a review queue.",
      "Attach scores to traces so you can open the worst runs.",
    ],
    show: [
      "One change that raised the average but caused a regression, and what you did.",
      "Your judge's kappa before and after the rubric change.",
      "The CI gate failing on a real regression.",
    ],
    probes: [
      "Your pass rate went from 80% to 84%. Do you ship?",
      "How do you know your judge is not just agreeing with itself?",
      "How does your baseline avoid ratcheting downwards?",
    ],
  },
  {
    id: "capstone-copilot",
    title: "Capstone project: a support copilot with evals and a cost dashboard",
    tracks: [
      "llm-foundations",
      "prompt-engineering",
      "embeddings-and-search",
      "rag-systems",
      "tools-and-agents",
      "evals-and-observability",
      "fine-tuning",
      "production-ai",
    ],
    summary:
      "Build the system the capstone exam describes: a copilot that answers from documents, looks things up, proposes actions under approval, and can prove it works.",
    requirements: [
      "Grounded answers with verified citations over a document set, with permission filtering and a 'not found' path.",
      "At least two tools, one with a side effect behind approval, an idempotency key and a spending or amount ceiling.",
      "Guardrails on input and output: personal data redaction, schema validation, and fail-closed behaviour when a check cannot run.",
      "An eval suite in CI covering retrieval, groundedness, tool behaviour and safety cases, with a regression gate.",
      "Tracing with model, prompt version, tokens, latency and cost on every call, plus a dashboard showing percentile latency and cost per task.",
      "A rate limiter and retry policy that keep you under provider limits, and a tested fallback model.",
      "A written decision on whether fine-tuning or distillation would pay off for one component, with the break-even arithmetic.",
      "A short runbook for three incidents: a quality drop after a release, a provider outage, and a cost spike.",
    ],
    stretch: [
      "Actually distil a small model for one narrow component and evaluate it against human labels.",
      "Run a shadow deployment and compare it with the live version.",
      "Publish an error budget and show how it would change a release decision.",
    ],
    show: [
      "An architecture diagram with the trust boundaries drawn on it.",
      "A results table: quality, latency percentiles and cost per task for each version you tried.",
      "A postmortem for one real failure you caused and fixed.",
    ],
    probes: [
      "Walk me through what happens, step by step, when a user asks for a refund.",
      "What is the single most dangerous capability in this system and how is it contained?",
      "If you had one more week, what would you measure first?",
    ],
  },
];
