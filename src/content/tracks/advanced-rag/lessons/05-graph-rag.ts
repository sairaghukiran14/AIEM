import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "graph-rag-and-knowledge-graphs",
  order: 5,
  title: "Graph RAG & Knowledge-Graph Retrieval",
  summary:
    "Vector search finds similar passages. It does not follow relationships or summarise a whole corpus. Graph RAG builds a graph of entities and links so you can answer connected and global questions.",
  minutes: 16,

  concept: [
    {
      type: "p",
      text: "Some questions are not about *a passage that looks like the question*. \"Which suppliers are affected if this factory shuts down?\" is about **relationships** across many documents. \"What are the main themes in 5,000 support tickets?\" is about the **whole corpus**. Top-k vector search is weak at both, because no single chunk contains the answer.",
    },
    {
      type: "p",
      text: "**Graph RAG** adds a structure: an LLM extracts **entities** (people, companies, products) and **relations** (acquired, supplies, reports to) from your chunks, and you store them as a graph with a pointer back to the source text. Questions can then walk the graph.",
    },
    {
      type: "table",
      headers: ["", "Vector RAG", "Graph RAG"],
      rows: [
        ["**Best at**", "finding the passage that answers a specific question", "connected facts, multi-hop questions, corpus-wide themes"],
        ["**Index time**", "chunk and embed, cheap", "an LLM reads every chunk to extract entities, much more expensive"],
        ["**Explains itself**", "shows the matching passages", "shows the path of entities and relations used"],
        ["**Main risk**", "misses relationships", "extraction errors, duplicate entities, stale graph"],
      ],
    },
    {
      type: "sorter",
      title: "Vector RAG or Graph RAG?",
      prompt: "Pick the better first approach for each question.",
      categories: ["Vector (or hybrid) RAG", "Graph RAG"],
      items: [
        { text: "What is the refund window for opened items?", answer: 0, why: "One passage holds the answer. Vector search finds it directly." },
        { text: "How is supplier A connected to the delayed shipment through its parts?", answer: 1, why: "The answer is a path across several entities and documents." },
        { text: "What are the main themes across 5,000 support tickets?", answer: 1, why: "A global question that needs community summaries, not one passage." },
        { text: "Find the paragraph that mentions error code E4012", answer: 0, why: "An exact-token lookup; keyword or hybrid search is ideal." },
        { text: "Which employees report, directly or indirectly, to the author of the incident report?", answer: 1, why: "Following relationships across several hops is what a graph does." },
      ],
    },
    {
      type: "stepper",
      title: "Building and querying a graph",
      steps: [
        { label: "Extract entities and relations", detail: "For each chunk, an LLM returns triples such as (Acme, acquired, Beta). Each triple keeps the id of the chunk it came from.", items: ["Acme acquired Beta (2021)", "Beta supplies Gamma"], mark: [0, 1] },
        { label: "Resolve duplicates", detail: "`IBM` and `International Business Machines` must become one node, or the graph splits into pieces that never connect.", items: ["IBM", "International Business Machines"], mark: [0, 1] },
        { label: "Build the graph", detail: "Nodes are entities, edges are relations. Store the source chunk ids on each edge so answers can cite their evidence.", items: ["Acme", "Beta", "Gamma"], mark: [0, 1, 2] },
        { label: "Find communities and summarise", detail: "Group densely connected nodes into communities and write a summary of each. These summaries answer global questions.", items: ["community 1 summary", "community 2 summary"], mark: [0, 1] },
        { label: "Answer at query time", detail: "Local questions: find the entities in the question, expand their neighbourhood, and read the linked chunks. Global questions: search the community summaries and combine them.", items: ["local search", "global search"], mark: [0, 1] },
      ],
      caption: "The expensive part is the extraction at indexing time. The payoff is relationship and corpus-level questions.",
    },
  ],

  underTheHood: [
    { type: "h", text: "What indexing costs" },
    {
      type: "calculator",
      title: "Cost of extracting a graph from a corpus",
      inputs: [
        { key: "chunks", label: "Chunks", min: 10000, max: 500000, step: 10000, value: 100000 },
        { key: "tin", label: "Input tokens per chunk (chunk plus instructions)", min: 200, max: 1000, step: 100, value: 500 },
        { key: "tout", label: "Output tokens per chunk (triples)", min: 50, max: 500, step: 50, value: 150 },
        { key: "pin", label: "Input price per million tokens ($)", min: 1, max: 10, step: 1, value: 3 },
        { key: "pout", label: "Output price per million tokens ($)", min: 5, max: 30, step: 5, value: 15 },
      ],
      outputs: [
        { label: "LLM extraction cost ($)", formula: "chunks * (tin * pin + tout * pout) / 1e6", format: "usd" },
        { label: "Embedding the same chunks at $0.10 per million input tokens ($)", formula: "chunks * 400 * 0.1 / 1e6", format: "usd" },
        { label: "Extraction as a multiple of embedding", formula: "(chunks * (tin * pin + tout * pout)) / (chunks * 400 * 0.1)", format: "int" },
      ],
      note: "Graph extraction reads every chunk with a language model, which is why it is far costlier than embedding. Use it where relationship or global questions justify it.",
    },
    { type: "h", text: "Knowledge-graph RAG: querying a graph database" },
    {
      type: "p",
      text: "A related design stores the graph in a graph database and lets a model translate the question into a graph query (Cypher or SPARQL). This is precise and explainable when the **schema is well defined**, and fails if the model writes a wrong or unsafe query, so apply the same rules as text-to-SQL (lesson 8): read-only access, validation and limits.",
    },
    {
      type: "code",
      language: "cypher",
      caption: "Two hops: which companies supply the companies that Acme acquired?",
      code: `MATCH (a:Company {name: "Acme"})-[:ACQUIRED]->(b:Company)<-[:SUPPLIES]-(s:Company)
RETURN b.name AS acquired, s.name AS supplier
LIMIT 20;`,
    },
    {
      type: "ul",
      items: [
        "**Entity resolution is the quiet killer.** Without merging aliases, the graph fragments and multi-hop paths break.",
        "**Keep provenance.** Every edge points to its source chunk, so you can cite and can re-extract when a document changes.",
        "**Combine, do not replace.** Graph retrieval often feeds extra context into a normal vector or hybrid pipeline.",
        "**Know when not to use it.** If your questions are single-passage lookups, a graph adds cost and failure modes for no gain.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"when would you use Graph RAG?\"",
      text: "When questions depend on relationships across documents or need corpus-wide synthesis, and I have evidence that vector retrieval misses them. I would state the cost (an LLM pass over every chunk, entity resolution, refreshing the graph) and the fallback of plain hybrid retrieval for everything else.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A tiny graph with provenance, and a multi-hop expansion that collects the source chunks.",
    code: `from collections import defaultdict

edges = defaultdict(list)              # node -> [(neighbour, relation, chunk_id)]

def add_triple(subject, relation, obj, chunk_id):
    edges[subject].append((obj, relation, chunk_id))
    edges[obj].append((subject, relation, chunk_id))   # treat links as undirected for expansion


def expand(start: str, hops: int):
    """Entities within 'hops' links of start, plus the chunks that justify the links."""
    visited = {start}
    frontier = [start]
    chunks = set()
    for _ in range(hops):
        next_frontier = []
        for node in frontier:
            for neighbour, _relation, chunk_id in edges[node]:
                chunks.add(chunk_id)
                if neighbour not in visited:           # never revisit: handles cycles
                    visited.add(neighbour)
                    next_frontier.append(neighbour)
        frontier = next_frontier
    visited.discard(start)
    return sorted(visited), sorted(chunks)


add_triple("Acme", "acquired", "Beta", "c1")
add_triple("Beta", "supplies", "Gamma", "c2")
print(expand("Acme", 2))     # (['Beta', 'Gamma'], ['c1', 'c2'])`,
  },

  interview: [
    {
      question: "What problem does Graph RAG solve that vector RAG does not?",
      answer:
        "Vector RAG retrieves passages that resemble the question, so it struggles when the answer is a path across several entities or a synthesis across the whole corpus. Graph RAG extracts entities and relations into a graph, so I can follow relationships for local questions and use community summaries for global ones. It also gives an explainable path of evidence.",
      weakAnswer:
        "Graph RAG is just a better vector database. — It is a different structure, built by extraction rather than by embedding.",
    },
    {
      question: "What are the main costs and risks of Graph RAG?",
      answer:
        "Indexing is expensive because a model reads every chunk to extract triples. Extraction can be wrong, duplicate entities fragment the graph unless resolved, and the graph goes stale when documents change. Query-time complexity also rises. I would apply it only where evaluation shows relationship or global questions fail with hybrid retrieval.",
    },
    {
      question: "What is the difference between local and global search in Graph RAG?",
      answer:
        "Local search starts from the entities in the question, expands their neighbourhood in the graph and reads the linked source chunks. Global search works over pre-computed summaries of communities of related entities and combines them, which suits questions like main themes across the corpus. Different questions call for different search types, so a router helps.",
    },
    {
      question: "How do you handle the same entity appearing under different names?",
      answer:
        "Entity resolution: normalise names, use aliases and identifiers where available, compare embeddings or use a model to decide matches above a threshold, and merge nodes while keeping provenance. I would measure merge errors on a labelled sample, because wrong merges are as damaging as missed ones.",
    },
    {
      question: "How would you keep a knowledge graph up to date when documents change?",
      answer:
        "Store the source chunk id on every edge. When a document changes, remove the edges that came from its old chunks, re-run extraction for the new chunks and re-resolve entities. Communities and their summaries are recomputed on a schedule or when enough of the graph changes. Without provenance this is almost impossible.",
    },
  ],

  challenges: [
    {
      id: "ar-5-quiz",
      kind: "quiz",
      title: "Checkpoint: Graph RAG",
      blurb: "Five questions on graph-based retrieval.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which question is best suited to Graph RAG?",
          options: [
            "What is the leave policy after two years?",
            "Which suppliers are indirectly affected if one factory closes?",
            "Define embeddings.",
            "What time does support open?",
          ],
          correctIndex: 1,
          explanation:
            "It requires following relationships across several entities, which a graph represents directly.",
        },
        {
          id: "q2",
          prompt: "What is built at indexing time in Graph RAG?",
          options: [
            "Only embeddings",
            "A graph of entities and relations extracted by a language model, with links back to source chunks",
            "A larger context window",
            "A set of chat prompts",
          ],
          correctIndex: 1,
          explanation:
            "An LLM pass over the chunks produces triples that become nodes and edges, with provenance.",
        },
        {
          id: "q3",
          prompt: "Why is entity resolution important?",
          options: [
            "It makes embeddings smaller",
            "Different names for one entity would otherwise create separate nodes and break multi-hop paths",
            "It speeds up generation",
            "It removes the need for chunking",
          ],
          correctIndex: 1,
          explanation:
            "If IBM and International Business Machines stay separate, relationships never connect.",
        },
        {
          id: "q4",
          prompt: "What is the main cost driver of Graph RAG compared with vector RAG?",
          options: [
            "Storing text",
            "A language model reading every chunk to extract entities and relations",
            "Query embeddings",
            "The user interface",
          ],
          correctIndex: 1,
          explanation:
            "Extraction is an LLM call per chunk, far costlier than embedding the same chunk.",
        },
        {
          id: "q5",
          prompt: "A model writes Cypher queries for a graph database. What must you add?",
          options: [
            "Nothing, the model is reliable",
            "Read-only access, validation of the generated query, and limits on rows and time",
            "A higher temperature",
            "More embeddings",
          ],
          correctIndex: 1,
          explanation:
            "Generated queries are untrusted input. Constrain what they can do, as with text-to-SQL.",
        },
      ],
    },
    {
      id: "ar-5-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: graph expansion",
      blurb: "On graphs with cycles, expansion returns the start node and slows to a crawl. Find the line.",
      language: "python",
      lines: [
        "def neighbors_within(graph, start, hops):",
        "    frontier, found = [start], set()",
        "    for _ in range(hops):",
        "        frontier = [n for node in frontier for n in graph.get(node, [])]",
        "        found.update(frontier)",
        "    return found",
      ],
      buggyLine: 4,
      reasons: [
        "graph.get cannot take a default",
        "the frontier is rebuilt without removing visited nodes, so cycles revisit nodes (including the start) and the frontier can grow exponentially",
        "found must be a list",
        "range(hops) should be range(hops + 1)",
      ],
      correctReasonIndex: 1,
      explanation:
        "Track visited nodes and only expand new ones. Otherwise a cycle sends the walk back through nodes it has already seen.",
      fix: "frontier = [n for node in frontier for n in graph.get(node, []) if n not in visited]   # and add them to visited",
      xp: 40,
    },
    {
      id: "ar-5-code",
      kind: "code",
      title: "Code challenge: entities within N hops",
      blurb: "Find every entity reachable from a start entity within a number of hops.",
      functionName: "withinHops",
      starter: `/**
 * withinHops(edges, start, hops)
 *
 *   edges: an array of [a, b] pairs. Each link works in both directions.
 *   start: the starting entity
 *   hops:  the maximum number of links to follow
 *
 * Return a sorted array of every entity reachable within 'hops' links,
 * NOT including start itself. Cycles must not cause repeats or endless work.
 */
function withinHops(edges, start, hops) {
  // your code here
}`,
      tests: [
        { name: "one hop", args: [[["A", "B"], ["B", "C"], ["C", "D"]], "A", 1], expected: ["B"] },
        { name: "two hops", args: [[["A", "B"], ["B", "C"], ["C", "D"]], "A", 2], expected: ["B", "C"] },
        { name: "three hops", args: [[["A", "B"], ["B", "C"], ["C", "D"]], "A", 3], expected: ["B", "C", "D"] },
        { name: "cycle", args: [[["A", "B"], ["B", "C"], ["C", "A"]], "A", 5], expected: ["B", "C"] },
        { name: "links work both ways", args: [[["A", "B"], ["C", "B"]], "A", 2], expected: ["B", "C"] },
        { name: "unknown start", args: [[["A", "B"]], "Z", 3], expected: [] },
        { name: "zero hops", args: [[["A", "B"]], "A", 0], expected: [] },
      ],
      hints: [
        "Build an adjacency map where each [a, b] adds b to a's list and a to b's list.",
        "Walk outward one level at a time, keeping a Set of visited entities.",
        "Remove start from the result and sort it with .sort().",
      ],
      solution: `function withinHops(edges, start, hops) {
  const adj = {};
  for (const [a, b] of edges) {
    (adj[a] = adj[a] || []).push(b);
    (adj[b] = adj[b] || []).push(a);
  }
  const visited = new Set([start]);
  let frontier = [start];
  for (let i = 0; i < hops; i++) {
    const next = [];
    for (const node of frontier) {
      for (const n of adj[node] || []) {
        if (!visited.has(n)) {
          visited.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  visited.delete(start);
  return [...visited].sort();
}`,
      xp: 70,
    },
  ],
};
