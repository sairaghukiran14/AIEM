import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "multimodal-rag-images-pdfs-audio",
  order: 4,
  title: "Multimodal RAG: Images, PDFs & Audio",
  summary:
    "Real knowledge bases hold slides, scans, charts, recordings and videos. Learn three ways to make them searchable, what each costs, and how to cite a moment in a recording.",
  minutes: 16,

  concept: [
    {
      type: "p",
      text: "Most RAG tutorials assume clean text. Real companies have **slide decks, scanned contracts, diagrams, call recordings and training videos**. To retrieve from them you must first turn them into something you can search, and there are three families of approach.",
    },
    {
      type: "table",
      headers: ["Approach", "How it works", "Good for", "Watch out for"],
      rows: [
        ["**Convert to text**", "OCR, image captions or descriptions, and transcripts, then run normal text RAG", "most cases; cheap; reuses everything you already built", "information that only exists visually (a chart's shape, a diagram's arrows) is lost or summarised"],
        ["**Multimodal embeddings**", "one model embeds both images and text into the same space, so a text query can retrieve images directly", "finding pictures, products or diagrams by description", "weaker on fine detail and exact text inside images; model quality varies"],
        ["**Page-image retrieval**", "embed page screenshots, retrieve the best pages, and let a vision model read them to answer", "documents where layout, tables and figures carry the meaning", "higher cost per query, since page images are expensive tokens"],
      ],
    },
    {
      type: "sorter",
      title: "Which approach fits?",
      prompt: "Choose the best first approach for each source.",
      categories: ["Convert to text", "Multimodal embeddings", "Page-image retrieval"],
      items: [
        { text: "Hundreds of hours of recorded support calls", answer: 0, why: "Transcribe with timestamps and run text RAG; it is cheap and citable." },
        { text: "A product catalogue where users search by describing what an item looks like", answer: 1, why: "A shared image-text embedding space lets a description retrieve images." },
        { text: "Financial slide decks where the answer is often in a chart or table", answer: 2, why: "The visual layout carries the meaning, so retrieve pages and let a vision model read them." },
        { text: "Clean text-based policy PDFs", answer: 0, why: "Extract the text; nothing visual is lost and it is far cheaper." },
      ],
    },
    {
      type: "stepper",
      title: "An audio pipeline you can cite",
      steps: [
        { label: "Transcribe with timestamps", detail: "A speech recognition model returns segments, each with a start time, an end time and text. Speaker labels help for meetings and calls.", items: ["0:00-0:12 Alice", "0:12-0:30 Bob"], mark: [0, 1] },
        { label: "Chunk by time and speaker", detail: "Group consecutive segments into chunks of roughly a fixed duration, and keep the first start and last end time on each chunk.", items: ["chunk 0:00-1:00", "chunk 1:00-2:05"], mark: [0, 1] },
        { label: "Embed and index with metadata", detail: "Store the chunk text and vector with recording id, start and end times, and speakers, so filters and citations are possible.", items: ["text", "vector", "start/end", "speaker"], mark: [2] },
        { label: "Retrieve and answer", detail: "Search as usual, then answer from the chunks. Ask the model to cite chunk numbers.", items: ["top 5 chunks", "answer with [2], [4]"], mark: [1] },
        { label: "Link back to the moment", detail: "Turn each citation into a link that seeks the player to the start time, so a user can hear the original.", items: ["[2] -> 12:30", "play from there"], mark: [0, 1] },
      ],
      caption: "Keep timestamps through every step. They are what make audio answers verifiable.",
    },
  ],

  underTheHood: [
    { type: "h", text: "How big is a transcript corpus?" },
    {
      type: "calculator",
      title: "From hours of audio to chunks",
      inputs: [
        { key: "hours", label: "Hours of audio", min: 1, max: 1000, step: 1, value: 50 },
        { key: "wpm", label: "Spoken words per minute", min: 100, max: 200, step: 10, value: 150 },
        { key: "tpw", label: "Tokens per word (x10)", min: 10, max: 20, step: 1, value: 13 },
        { key: "chunk", label: "Tokens per chunk", min: 200, max: 1000, step: 100, value: 400 },
      ],
      outputs: [
        { label: "Words", formula: "hours * 60 * wpm", format: "int" },
        { label: "Tokens", formula: "hours * 60 * wpm * (tpw / 10)", format: "int" },
        { label: "Chunks to embed", formula: "Math.ceil(hours * 60 * wpm * (tpw / 10) / chunk)", format: "int" },
      ],
      note: "Fifty hours of speech is only about a thousand chunks, a small index. The costly part is usually the transcription itself, not the retrieval.",
    },
    { type: "h", text: "Making each modality retrievable" },
    {
      type: "ul",
      items: [
        "**Slides and scans**: extract text and also keep a short description of each figure or chart. Store the page image path so answers can show the source page.",
        "**Charts and tables**: convert tables to structured text with headers (Track 9, lesson 8). For charts, store a generated description plus the underlying numbers if you have them.",
        "**Video**: sample key frames (for example one every few seconds, or on scene changes) and combine their descriptions with the transcript. Never read every frame.",
        "**Metadata everywhere**: source file, page or timestamp, and speaker let you filter, cite and debug.",
      ],
    },
    {
      type: "compare",
      title: "Two ways to chunk a call transcript",
      prompt: "Which chunking makes answers citable to a moment in the recording?",
      a: { label: "Chunking A", text: "text: \"...refunds take five days...\"\n(timestamps dropped when segments were joined)" },
      b: { label: "Chunking B", text: "text: \"...refunds take five days...\"\nstart: 754.2  end: 781.0  speaker: Bob\nrecording: call-0412" },
      better: 1,
      why: "Chunking B keeps the start and end time, speaker and recording id. A citation can link to 12:34 in the call. Chunking A can only say the answer was somewhere in the call.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Evaluate each modality separately",
      text: "Transcription errors, OCR errors and caption errors all feed retrieval (Track 9, lesson 8: errors multiply). Check the quality of each conversion on a sample of real files before measuring end-to-end answers.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"how would you build RAG over slides, scans and recordings?\"",
      text: "Convert to text by default (extraction, OCR, transcripts with timestamps), add descriptions for figures, and keep rich metadata. Use page-image retrieval only where the layout carries the meaning, and multimodal embeddings for find-by-appearance. Verify conversions on samples, cite timestamps or pages, and evaluate retrieval per modality.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Chunk a timestamped transcript and keep the time range, so every citation can link to the moment.",
    code: `from dataclasses import dataclass

@dataclass
class Segment:
    start: float
    end: float
    text: str
    speaker: str = ""


def chunk_transcript(segments: list[Segment], max_seconds: float = 60.0) -> list[dict]:
    chunks, group = [], []
    for seg in segments:
        if group and seg.end - group[0].start > max_seconds:    # adding it would be too long
            chunks.append(make_chunk(group))
            group = []
        group.append(seg)                                       # a long single segment still gets its own chunk
    if group:
        chunks.append(make_chunk(group))
    return chunks


def make_chunk(group: list[Segment]) -> dict:
    return {
        "text": " ".join(s.text for s in group),
        "start": group[0].start,           # keep the time range: citations link to the moment
        "end": group[-1].end,
        "speakers": sorted({s.speaker for s in group if s.speaker}),
    }


def cite(chunk: dict, recording_id: str) -> str:
    return f"{recording_id}?t={int(chunk['start'])}"           # a deep link that seeks the player`,
  },

  interview: [
    {
      question: "How would you build RAG over a library of recorded meetings?",
      answer:
        "Transcribe each recording with timestamps and speaker labels, chunk the transcript by time and speaker while keeping each chunk's start and end, embed and index the chunks with recording id and metadata, and run the usual hybrid retrieval and cited generation. Citations become deep links to the moment in the recording. I would evaluate the transcription quality first, since errors there propagate.",
    },
    {
      question: "What are the main approaches to retrieving over images and documents with figures?",
      answer:
        "Convert everything to text with extraction, OCR and generated figure descriptions and reuse text RAG, which is cheapest. Use multimodal embeddings to find images from text descriptions. For documents where the layout carries meaning, retrieve page images and have a vision model read them, which costs more per query. I choose per source and measure the trade-off.",
    },
    {
      question: "Why keep timestamps or page numbers in the metadata?",
      answer:
        "They make answers verifiable. A citation can link to the exact moment or page, users can check the source, filters can narrow by time, and I can debug retrieval by looking at the original. Without them an answer can only say it came from somewhere in a long file, which erodes trust.",
    },
    {
      question: "How do you handle a chart whose meaning is in its shape?",
      answer:
        "Generate and store a description of the chart plus the underlying numbers when I have them, and keep a pointer to the page image. For questions that depend on the visual, I can retrieve the page and let a vision model read it at query time. I would validate with test questions about charts, since descriptions can omit the detail a user asks about.",
    },
    {
      question: "How would you evaluate a multimodal RAG system?",
      answer:
        "Evaluate each conversion separately: transcript word error on a sample, OCR accuracy on numbers and codes, caption quality on figures. Then measure retrieval recall on questions whose answers live in each modality, and answer faithfulness and citation accuracy end to end. Errors multiply across stages, so I fix the weakest conversion first.",
    },
  ],

  challenges: [
    {
      id: "sm-4-quiz",
      kind: "quiz",
      title: "Checkpoint: multimodal RAG",
      blurb: "Five questions on retrieving from images, documents and audio.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What is the cheapest default way to make recordings searchable?",
          options: [
            "Embed raw audio waveforms",
            "Transcribe with timestamps and run text RAG on the transcript",
            "Convert audio to video",
            "Fine-tune a model on each call",
          ],
          correctIndex: 1,
          explanation:
            "Transcripts reuse your whole text pipeline and keep timestamps for citations.",
        },
        {
          id: "q2",
          prompt: "When is page-image retrieval worth its higher cost?",
          options: [
            "For clean text PDFs",
            "When layout, tables or figures carry the meaning and text extraction would lose it",
            "For every document",
            "Never",
          ],
          correctIndex: 1,
          explanation:
            "Use it where visual structure matters, because each query then pays for image tokens.",
        },
        {
          id: "q3",
          prompt: "What do multimodal embeddings let you do?",
          options: [
            "Skip chunking",
            "Retrieve images with a text query because both are embedded in a shared space",
            "Avoid using a vector database",
            "Guarantee exact text recognition inside images",
          ],
          correctIndex: 1,
          explanation:
            "A shared image-text space enables find-by-description, though fine detail can be weaker.",
        },
        {
          id: "q4",
          prompt: "Why keep start and end times on every transcript chunk?",
          options: [
            "To make chunks longer",
            "So citations can link to the exact moment in the recording",
            "To reduce embedding cost",
            "To remove speaker labels",
          ],
          correctIndex: 1,
          explanation:
            "Timestamps are what make an audio-based answer checkable.",
        },
        {
          id: "q5",
          prompt: "How should you sample a long video for RAG?",
          options: [
            "Read every frame",
            "Sample key frames sparingly and combine their descriptions with the audio transcript",
            "Ignore the audio",
            "Use only the first second",
          ],
          correctIndex: 1,
          explanation:
            "Every frame costs tokens. Sparse frames plus the transcript capture most of the content.",
        },
      ],
    },
    {
      id: "sm-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: uncitable audio chunks",
      blurb: "Users cannot jump to the moment an answer came from. Find the line.",
      language: "python",
      lines: [
        "def make_chunk(group):",
        "    text = \" \".join(s.text for s in group)",
        "    return {\"text\": text}",
      ],
      buggyLine: 3,
      reasons: [
        "join cannot be used on a generator",
        "the chunk drops the start and end times (and speakers), so citations cannot point to a moment in the recording",
        "the function must return a string",
        "group needs to be sorted by text",
      ],
      correctReasonIndex: 1,
      explanation:
        "Carry the time range and speakers into the chunk metadata. They cost almost nothing and are what make answers verifiable.",
      fix: "return {\"text\": text, \"start\": group[0].start, \"end\": group[-1].end}",
      xp: 40,
    },
    {
      id: "sm-4-code",
      kind: "code",
      title: "Code challenge: chunk a timestamped transcript",
      blurb: "Group transcript segments into time-limited chunks that keep their time range.",
      functionName: "chunkTranscript",
      starter: `/**
 * chunkTranscript(segments, maxSeconds)
 *
 *   segments:   [{ start, end, text }, ...] in time order
 *   maxSeconds: the longest a chunk may span
 *
 * Group consecutive segments into chunks. A chunk's span is
 * (end of its last segment) - (start of its first segment).
 * Add a segment to the current chunk only if the span stays <= maxSeconds;
 * otherwise start a new chunk. A single segment longer than maxSeconds
 * becomes a chunk on its own.
 *
 * Return [{ start, end, text }, ...] where text joins the segment texts
 * with a single space.
 */
function chunkTranscript(segments, maxSeconds) {
  // your code here
}`,
      tests: [
        {
          name: "groups up to the limit",
          args: [[{ start: 0, end: 10, text: "a" }, { start: 10, end: 20, text: "b" }, { start: 20, end: 35, text: "c" }], 20],
          expected: [{ start: 0, end: 20, text: "a b" }, { start: 20, end: 35, text: "c" }],
        },
        {
          name: "one chunk when the limit is large",
          args: [[{ start: 0, end: 10, text: "a" }, { start: 10, end: 20, text: "b" }, { start: 20, end: 35, text: "c" }], 100],
          expected: [{ start: 0, end: 35, text: "a b c" }],
        },
        {
          name: "each segment alone when the limit is tiny",
          args: [[{ start: 0, end: 10, text: "a" }, { start: 10, end: 20, text: "b" }], 5],
          expected: [{ start: 0, end: 10, text: "a" }, { start: 10, end: 20, text: "b" }],
        },
        { name: "no segments", args: [[], 30], expected: [] },
        {
          name: "a long segment stands alone",
          args: [[{ start: 0, end: 50, text: "long" }, { start: 50, end: 55, text: "short" }], 30],
          expected: [{ start: 0, end: 50, text: "long" }, { start: 50, end: 55, text: "short" }],
        },
        {
          name: "exactly at the limit still fits",
          args: [[{ start: 0, end: 15, text: "x" }, { start: 15, end: 30, text: "y" }], 30],
          expected: [{ start: 0, end: 30, text: "x y" }],
        },
      ],
      hints: [
        "Keep a current group. For each segment, check (segment.end - group[0].start) <= maxSeconds.",
        "If the group is empty, always add the segment, even if it alone is longer than maxSeconds.",
        "When you close a group, build { start: first.start, end: last.end, text: texts joined with a space }.",
      ],
      solution: `function chunkTranscript(segments, maxSeconds) {
  const chunks = [];
  let group = [];
  const flush = () => {
    if (group.length === 0) return;
    chunks.push({
      start: group[0].start,
      end: group[group.length - 1].end,
      text: group.map((s) => s.text).join(" "),
    });
    group = [];
  };
  for (const seg of segments) {
    if (group.length > 0 && seg.end - group[0].start > maxSeconds) flush();
    group.push(seg);
  }
  flush();
  return chunks;
}`,
      xp: 70,
    },
  ],
};
