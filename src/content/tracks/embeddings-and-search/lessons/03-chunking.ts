import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "chunking-strategy",
  order: 3,
  title: "Chunking Strategy",
  summary:
    "You do not embed whole documents. How you cut them into chunks decides what your search can find, so it is one of the highest-leverage choices in retrieval.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "A document is split into **chunks**, and each chunk gets its own vector. Search returns chunks, not documents. If an answer is split across two chunks, or buried in the middle of a large one, retrieval can miss it even though the document is in your index.",
    },
    {
      type: "stepper",
      title: "Why overlap and structure help",
      steps: [
        {
          label: "Fixed-size cut, no overlap",
          detail: "The window cuts after exactly 8 words. The sentence about the 30-day window is split in half, so neither chunk answers 'how long do I have to request a refund?'.",
          items: ["Refunds", "are", "available", "within", "30", "days", "of", "purchase", "|", "after", "that", "only", "store", "credit", "is", "offered"],
          mark: [8],
        },
        {
          label: "Add overlap",
          detail: "The next chunk starts a few words before the cut, so the whole sentence appears intact in at least one chunk. The price is some repeated text to embed and store.",
          items: ["...within", "30", "days", "of", "purchase", "after", "that", "only", "store", "credit"],
          mark: [1, 2, 3, 4],
        },
        {
          label: "Split on structure",
          detail: "Better still, cut at natural boundaries such as headings and paragraphs, so each chunk is one self-contained idea. Keep a heading with its text.",
          items: ["## Refund policy", "Refunds are available within 30 days of purchase.", "## Store credit", "After that, only store credit is offered."],
          mark: [0, 2],
        },
        {
          label: "Add context to each chunk",
          detail: "Prefix every chunk with its document title and section, so a chunk that says 'it expires after 12 months' still says what 'it' is.",
          items: ["Gift cards > Expiry: It expires after 12 months."],
          mark: [0],
        },
      ],
      caption: "Step through four ideas, from naive to robust.",
    },
    { type: "h", text: "The core trade-off" },
    {
      type: "table",
      headers: ["", "Small chunks (100 to 200 tokens)", "Large chunks (800+ tokens)"],
      rows: [
        ["Precision", "high: one idea per vector", "low: several ideas averaged into one vector"],
        ["Context for the answer", "often missing", "usually present"],
        ["Index size and cost", "more vectors", "fewer vectors"],
        ["Prompt cost when retrieved", "low", "high"],
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "A good starting point, not a rule",
      text: "Start around 300 to 500 tokens with 10 to 20 percent overlap, split on structure where you can, then **measure retrieval** on your own questions (lesson 6) and adjust. The right size depends on your documents and queries.",
    },
    {
      type: "calculator",
      title: "What does overlap cost?",
      inputs: [
        { key: "doc", label: "Document length", min: 500, max: 50000, step: 500, value: 10000, unit: "tokens" },
        { key: "size", label: "Chunk size", min: 100, max: 2000, step: 50, value: 400, unit: "tokens" },
        { key: "overlap", label: "Overlap", min: 0, max: 90, step: 5, value: 10, unit: "%" },
      ],
      outputs: [
        { label: "Chunks produced", formula: "Math.ceil(Math.max(0, doc - size * overlap / 100) / (size * (1 - overlap / 100)))", format: "int" },
        { label: "Total tokens embedded", formula: "Math.ceil(Math.max(0, doc - size * overlap / 100) / (size * (1 - overlap / 100))) * size", format: "int" },
        { label: "Overhead vs the document", formula: "Math.ceil(Math.max(0, doc - size * overlap / 100) / (size * (1 - overlap / 100))) * size / doc - 1", format: "pct" },
      ],
      note: "Overlap is cheap insurance at 10 to 20 percent and expensive at 50. The last chunk is usually shorter, so this is an estimate.",
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "Remember from lesson 1 that a chunk becomes **one vector**, usually by pooling the encoder's token outputs. A long chunk with three topics produces a vector that sits in between all three, close to none of them. That blurring is why very large chunks retrieve badly even when they contain the answer.",
    },
    { type: "h", text: "Splitting strategies, from simplest to richest" },
    {
      type: "ol",
      items: [
        "**Fixed size by tokens** with overlap. Simple and predictable. Count tokens with the embedding model's tokenizer, not characters (Track 1).",
        "**Recursive splitting**: try to split on paragraph breaks, then sentences, then words, only as far down as needed to fit the limit.",
        "**Structure-aware**: use headings, list items, table rows, or functions and classes for code. Keep a heading with its body.",
        "**Semantic chunking**: split where the topic shifts, detected by a drop in similarity between adjacent sentences. Better boundaries, more compute.",
        "**Parent-child (small-to-big)**: embed small chunks for precision but return the larger parent section to the model for context.",
      ],
    },
    { type: "h", text: "Details that quietly decide quality" },
    {
      type: "ul",
      items: [
        "**Keep metadata**: source, title, section, page, date, access level. You filter and cite with it later.",
        "**Add a context header** to each chunk before embedding (title and section path). It repairs chunks that lose their referent.",
        "**Treat tables and code specially.** Splitting a table row from its header produces nonsense. Keep code blocks whole where possible.",
        "**Clean the source.** PDF extraction often adds headers, footers and broken line breaks that pollute chunks. Inspect samples.",
        "**Deduplicate** near-identical chunks, or they crowd out better results.",
        "**Re-chunking means re-embedding** everything, so version your chunking settings with the index.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"how do you chunk documents?\"",
      text: "Structure-aware splitting with token-counted size limits and modest overlap, a context header and metadata on every chunk, parent-child retrieval when precision and context conflict, and then **evaluate** the settings on real questions instead of guessing. Mention that chunking is versioned with the index.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Token-counted chunks with overlap, a context header and metadata.",
    code: `def chunk_document(title: str, sections: list[tuple[str, str]],
                   max_tokens: int = 400, overlap: int = 60) -> list[dict]:
    """sections: list of (heading, text). Returns chunks ready to embed."""
    chunks = []
    for heading, text in sections:
        tokens = tokenizer.encode(text)             # the EMBEDDING model's tokenizer
        step = max_tokens - overlap
        start = 0
        while True:
            window = tokens[start:start + max_tokens]
            body = tokenizer.decode(window)
            chunks.append({
                # A context header repairs chunks whose subject is implied elsewhere.
                "text": f"{title} > {heading}\\n{body}",
                "metadata": {"title": title, "section": heading, "start_token": start},
            })
            if start + max_tokens >= len(tokens):
                break
            start += step
    return chunks`,
  },

  interview: [
    {
      question: "Why do we chunk documents instead of embedding them whole?",
      answer:
        "Embedding models have an input token limit, and one vector for a long document blends all its topics, so it is close to none of them and retrieval precision drops. Chunking lets each vector represent one idea, so search can return the specific passage. The trade-off is that very small chunks lose context, which I handle with overlap, context headers and parent-child retrieval.",
      weakAnswer:
        "Because models cannot handle long text. — Only part of the reason; it ignores retrieval precision.",
    },
    {
      question: "How would you choose chunk size and overlap?",
      answer:
        "Start with a sensible default such as 300 to 500 tokens with 10 to 20 percent overlap, split on document structure, then evaluate: build labelled questions, measure recall at k for several settings, and look at failures. Small chunks help precision and hurt context, large chunks do the opposite, and the best point depends on the documents and the questions.",
      followUp: "What would you look at in the failures?",
    },
    {
      question: "What is parent-child (small-to-big) retrieval?",
      answer:
        "I embed small chunks, which retrieve precisely, but keep a pointer to the larger parent section or document. When a small chunk matches, I send the parent to the LLM so it has enough context. It decouples the unit used for matching from the unit used for answering.",
    },
    {
      question: "Why add a title or section header to each chunk before embedding?",
      answer:
        "Chunks often depend on context that sits outside them: 'it expires after 12 months' says nothing without knowing the subject. Prefixing the document title and section path puts that referent into the embedded text, which improves both the vector and what the model sees later. I keep the same information as metadata for filters and citations.",
    },
    {
      question: "What can go wrong when you change your chunking settings in production?",
      answer:
        "The stored vectors no longer correspond to the new chunk boundaries, citations and cached references break, and quality can change in unexpected ways. So a chunking change means re-chunking and re-embedding the corpus, ideally into a new index that I evaluate in shadow and then switch to, with the chunking settings versioned alongside the index.",
    },
  ],

  challenges: [
    {
      id: "es-3-quiz",
      kind: "quiz",
      title: "Checkpoint: chunking",
      blurb: "Five questions on chunk size, overlap and structure.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Why do very large chunks often retrieve poorly even if they contain the answer?",
          options: [
            "Large chunks are not allowed in vector indexes",
            "One vector averages several topics, so it sits close to none of them",
            "Large chunks cost more to store",
            "Embedding models ignore the end of a chunk",
          ],
          correctIndex: 1,
          explanation:
            "Pooling blends the content. A multi-topic chunk's vector is a compromise that matches specific queries weakly.",
        },
        {
          id: "q2",
          prompt: "What is the main purpose of chunk overlap?",
          options: [
            "To speed up indexing",
            "To keep sentences that straddle a boundary intact in at least one chunk",
            "To reduce the number of vectors",
            "To avoid embedding the same text twice",
          ],
          correctIndex: 1,
          explanation:
            "Overlap protects content near a cut. It costs some repeated text, which is why it is kept modest.",
        },
        {
          id: "q3",
          prompt: "How should chunk size be measured?",
          options: [
            "In characters, which is simplest",
            "In tokens, using the embedding model's own tokenizer",
            "In sentences",
            "In bytes",
          ],
          correctIndex: 1,
          explanation:
            "The model's input limit is in tokens, and character counts vary widely by language and content (Track 1).",
        },
        {
          id: "q4",
          prompt: "In parent-child retrieval, what is matched and what is sent to the LLM?",
          options: [
            "The parent is matched and the child is sent",
            "A small child chunk is matched and its larger parent is sent",
            "Both are always sent",
            "Neither is stored",
          ],
          correctIndex: 1,
          explanation:
            "Small chunks give precise matching. The larger parent gives the model enough context to answer.",
        },
        {
          id: "q5",
          prompt: "You change your chunk size. What must you do?",
          options: [
            "Nothing, old vectors still match",
            "Re-chunk and re-embed the corpus, ideally into a new versioned index you evaluate first",
            "Only re-embed the newest documents",
            "Lower the similarity threshold",
          ],
          correctIndex: 1,
          explanation:
            "Vectors correspond to specific chunk text. New boundaries mean new vectors.",
        },
      ],
    },
    {
      id: "es-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a text chunker",
      blurb: "Chunks come out far smaller than intended and cut words in half. Find the line.",
      language: "python",
      lines: [
        "def chunk(text, size_tokens=500):",
        "    chunks = []",
        "    for i in range(0, len(text), size_tokens):",
        "        chunks.append(text[i:i + size_tokens])",
        "    return chunks",
      ],
      buggyLine: 4,
      reasons: [
        "the loop should step by 1",
        "it slices characters, not tokens, so chunks are roughly a quarter of the intended size, cut mid-word, and have no overlap",
        "`chunks` should be a set",
        "the function should return a single string",
      ],
      correctReasonIndex: 1,
      explanation:
        "`text[i:i+500]` takes 500 characters, which is only about 125 tokens, and slices through words and sentences. Tokenize with the embedding model's tokenizer, window over tokens, and overlap the windows.",
      fix: "tokens = tokenizer.encode(text)\n    # window over `tokens` with overlap, then tokenizer.decode(window)",
      xp: 40,
    },
    {
      id: "es-3-code",
      kind: "code",
      title: "Code challenge: sliding-window chunker",
      blurb: "Split a list of words into overlapping chunks. Real chunkers do this over tokens.",
      functionName: "chunkWords",
      starter: `/**
 * Split \`words\` into windows of \`size\` words that overlap by \`overlap\` words.
 * Return each chunk as a string of its words joined by a single space.
 *
 * Window starts are 0, size - overlap, 2 * (size - overlap), ...
 * Stop as soon as a window reaches the end of the list. The last chunk may be
 * shorter. You may assume 0 <= overlap < size.
 *
 * chunkWords(["a","b","c","d","e","f","g","h","i","j"], 4, 1)
 *   -> ["a b c d", "d e f g", "g h i j"]
 */
function chunkWords(words, size, overlap) {
  // your code here
}`,
      tests: [
        {
          name: "overlap of one",
          args: [["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], 4, 1],
          expected: ["a b c d", "d e f g", "g h i j"],
        },
        {
          name: "no overlap, short last chunk",
          args: [["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], 4, 0],
          expected: ["a b c d", "e f g h", "i j"],
        },
        {
          name: "window larger than the text gives one chunk",
          args: [["a", "b", "c"], 10, 2],
          expected: ["a b c"],
        },
        {
          name: "stops when a window reaches the end",
          args: [["a", "b", "c", "d", "e"], 3, 1],
          expected: ["a b c", "c d e"],
        },
        {
          name: "heavy overlap",
          args: [["a", "b", "c", "d", "e", "f"], 5, 4],
          expected: ["a b c d e", "b c d e f"],
        },
        { name: "empty input", args: [[], 4, 1], expected: [] },
        { name: "a single word", args: [["a"], 4, 1], expected: ["a"] },
      ],
      hints: [
        "The distance between window starts is size minus overlap.",
        "Slice words from start to start + size, join with a space, and push it.",
        "After pushing, if start + size already reaches the end of the list, stop. Otherwise move start forward.",
      ],
      solution: `function chunkWords(words, size, overlap) {
  const chunks = [];
  if (words.length === 0) return chunks;

  const step = size - overlap;
  let start = 0;

  while (true) {
    chunks.push(words.slice(start, start + size).join(" "));
    if (start + size >= words.length) break;
    start += step;
  }

  return chunks;
}`,
      xp: 70,
    },
  ],
};
