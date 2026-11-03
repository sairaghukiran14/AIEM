import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "grounding-and-citations",
  order: 4,
  title: "Grounding & Citations",
  summary:
    "Retrieval gives the model evidence. Grounding makes it use only that evidence, say when it is missing, and show where each claim came from.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Putting passages in the prompt does not, by itself, make the model use them. A model can ignore the context and answer from memory, blend the two, or cite a source that says something different. **Grounding** is the set of prompt and system choices that keep answers tied to the retrieved evidence, and **citations** make that tie checkable by a person.",
    },
    { type: "h", text: "A grounding prompt has four jobs" },
    {
      type: "ol",
      items: [
        "**Restrict**: answer using only the provided sources.",
        "**Cite**: attach a source number to each claim, like [2].",
        "**Abstain**: if the sources do not contain the answer, say so instead of guessing.",
        "**Handle conflict**: if sources disagree, report the disagreement and name each source.",
      ],
    },
    {
      type: "sorter",
      title: "Is each claim supported by the source?",
      prompt: "Source [1]: \"Refunds are available within 30 days of purchase. Digital gift cards are non-refundable.\"",
      categories: ["Supported", "Not supported"],
      items: [
        { text: "You can get a refund within 30 days of buying. [1]", answer: 0, why: "Directly stated in the source." },
        { text: "Refunds are processed within 5 business days. [1]", answer: 1, why: "The source never mentions processing time. This is an unsupported detail attached to a real citation." },
        { text: "Gift cards cannot be refunded. [1]", answer: 0, why: "The source says digital gift cards are non-refundable. (A careful answer keeps the word 'digital'.)" },
        { text: "Most competitors offer 60-day refunds. [1]", answer: 1, why: "Outside knowledge presented as if it came from the source. A citation does not make it grounded." },
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "A citation is a claim, not a proof",
      text: "Models can attach plausible-looking citations to unsupported statements, or cite a number that does not exist. Citations must be **verified by your code**: do the cited sources exist, and do they support the sentence? The second check needs a judge or a quote match (lesson 6).",
    },
  ],

  underTheHood: [
    { type: "h", text: "Two kinds of failure" },
    {
      type: "table",
      headers: ["", "What happens", "How it looks"],
      rows: [
        ["**Hallucination**", "the answer contains claims not in the sources, or not true", "confident, fluent, and wrong"],
        ["**Unfaithfulness**", "the answer is plausible but is not supported by the retrieved context (it may even be true)", "right by luck, cannot be audited"],
      ],
    },
    {
      type: "p",
      text: "For a RAG product, **faithfulness** (is every claim supported by the cited context?) is a separate quality from **correctness** (is it true?). A faithful answer to a wrong or outdated document is still wrong, and an unfaithful answer that happens to be right cannot be trusted next time.",
    },
    {
      type: "stepper",
      title: "Verifying citations in code",
      steps: [
        { label: "Ask for a structured form", detail: "Number the sources in the prompt and tell the model to cite with [n]. Optionally require a short supporting quote for each claim.", items: ["[1] Refund policy...", "[2] Store credit rules..."], mark: [0, 1] },
        { label: "Parse the citations", detail: "Extract every [n] from the answer with a regular expression.", items: ["answer: ... 30 days [1]. ... a year [3]."], mark: [0] },
        { label: "Check they exist", detail: "Reject or strip any number outside the range of sources you provided. [3] does not exist when only two sources were sent.", items: ["valid: [1]", "invalid: [3]"], mark: [1] },
        { label: "Check they support the claim", detail: "For each cited sentence, test support: does the quoted text appear in the source, or does a small judge model confirm entailment? Flag anything unsupported.", items: ["claim 1: supported", "claim 2: flagged"], mark: [1] },
        { label: "Show real source metadata", detail: "Display titles and links from your own metadata for the verified ids, never text the model wrote about its sources.", items: ["Refund Policy, section 3"], mark: [0] },
      ],
      caption: "The model proposes citations; your code decides which ones are shown.",
    },
    { type: "h", text: "Designing the abstain path" },
    {
      type: "ul",
      items: [
        "**Give the model permission to refuse**: an explicit instruction and a fixed phrasing makes it easy to detect and to handle in the UI.",
        "**Combine with a retrieval score floor** (lesson 3): if nothing scores well, skip generation and return \"not found\" directly.",
        "**Test refusals**: include unanswerable questions in your eval set. A system that never says \"I don't know\" is a warning sign.",
        "**Beware over-refusal**: a prompt that is too strict makes the model decline answerable questions. Measure both directions.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Do not trust the model's own list of sources",
      text: "If the model returns a JSON field called `sources`, those are tokens it generated, not facts about your index. Map citation numbers back to your own chunk records and verify them.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That grounding is restrict, cite, abstain and handle conflict; that citations must be verified in code and at the claim level; that faithfulness is distinct from correctness; and that refusal behaviour is tested like any other feature.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A grounding prompt, then code that validates the citations before anything is shown.",
    code: `import re

GROUNDING = """Answer the question using ONLY the sources.
- Cite every claim like [1] or [2]. Do not cite a number that is not listed.
- If the sources do not contain the answer, reply exactly: NOT_FOUND
- If sources conflict, say so and cite each one.
Never use outside knowledge."""


def check_citations(answer: str, num_sources: int) -> dict:
    nums = [int(n) for n in re.findall(r"\\[(\\d+)\\]", answer)]
    return {
        "cited": sorted({n for n in nums if 1 <= n <= num_sources}),
        "invalid": sorted({n for n in nums if not 1 <= n <= num_sources}),
        "has_citation": bool(nums),
    }


def respond(question: str, chunks: list) -> dict:
    prompt = f"{GROUNDING}\\n\\n<sources>\\n" + "\\n".join(
        f"[{i}] {c.text}" for i, c in enumerate(chunks, 1)
    ) + f"\\n</sources>\\n\\nQuestion: {question}"
    answer = llm(prompt, temperature=0)

    if answer.strip() == "NOT_FOUND":
        return {"answer": "I could not find this in the documents.", "sources": []}

    report = check_citations(answer, len(chunks))
    if report["invalid"] or not report["has_citation"]:
        return {"answer": None, "error": "citation check failed", "report": report}   # retry or refuse

    shown = [chunks[n - 1].metadata for n in report["cited"]]   # OUR metadata, not the model's
    return {"answer": answer, "sources": shown}`,
  },

  interview: [
    {
      question: "What is grounding in a RAG system?",
      answer:
        "Constraining the model to answer from the retrieved evidence. In practice: instruct it to use only the provided sources, cite each claim, say so when the sources do not contain the answer, and report conflicts. Then verify the result: check that citations exist and support the claims, and measure faithfulness on an eval set.",
      weakAnswer:
        "Telling the model not to hallucinate. — An instruction alone is not verified grounding.",
    },
    {
      question: "How do you verify a model's citations?",
      answer:
        "Structurally first: parse the citation markers and reject numbers outside the provided sources. Then semantically: for each cited claim, check support with a quote match or an entailment-style judge. I display titles and links from my own chunk metadata for the verified ids, never the model's description of a source.",
      followUp: "What if the check fails?",
    },
    {
      question: "What is the difference between faithfulness and correctness?",
      answer:
        "Faithfulness asks whether every claim is supported by the retrieved context; correctness asks whether the claim is true. A faithful answer based on an outdated document is wrong but traceable, and an unfaithful answer can be right by luck. RAG quality needs both measured separately because they point at different fixes: faithfulness at generation, correctness at the data and retrieval.",
    },
    {
      question: "How should the system behave when the answer is not in the documents?",
      answer:
        "Say so plainly. I combine a retrieval score floor, which skips generation when nothing relevant is found, with a prompt that gives the model an explicit refusal phrase, and I include unanswerable questions in my eval set. I also watch for over-refusal on answerable questions, so I track both error directions.",
    },
    {
      question: "Two retrieved sources contradict each other. What should the answer do?",
      answer:
        "Surface the conflict rather than silently picking one: state that the sources disagree, attribute each position to its citation, and where possible use metadata such as document date or authority to explain which is newer or more reliable. I put that behaviour in the grounding prompt and test it with conflicting-source cases.",
    },
  ],

  challenges: [
    {
      id: "rag-4-quiz",
      kind: "quiz",
      title: "Checkpoint: grounding and citations",
      blurb: "Five questions on keeping answers tied to evidence.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "A model answer cites [3] but only two sources were provided. What does that show?",
          options: [
            "A third source exists in the index",
            "The model invented a citation, so citations must be validated in code",
            "The model is being extra careful",
            "The retrieval step failed",
          ],
          correctIndex: 1,
          explanation:
            "Models can generate citation markers that point nowhere. Reject numbers outside the supplied range.",
        },
        {
          id: "q2",
          prompt: "How does faithfulness differ from correctness?",
          options: [
            "They are the same measure",
            "Faithfulness checks that claims are supported by the retrieved context; correctness checks they are true",
            "Faithfulness measures speed",
            "Correctness only applies to citations",
          ],
          correctIndex: 1,
          explanation:
            "An answer can be faithful to a wrong document, or correct without support. They diagnose different problems.",
        },
        {
          id: "q3",
          prompt: "Where should the source titles shown to the user come from?",
          options: [
            "The model's own list of sources",
            "Your chunk metadata, looked up by the verified citation ids",
            "The user's previous question",
            "Whatever the model quotes",
          ],
          correctIndex: 1,
          explanation:
            "Model-generated source descriptions are just more generated text. Use your own records.",
        },
        {
          id: "q4",
          prompt: "A system never replies 'I don't know' on your test set of unanswerable questions. What is the best conclusion?",
          options: [
            "It is performing perfectly",
            "It is probably guessing or answering from outside the sources, which is a warning sign",
            "The test set is too easy",
            "Refusals are unnecessary",
          ],
          correctIndex: 1,
          explanation:
            "A grounded system should abstain when the evidence is missing. Zero refusals on unanswerable questions means it is inventing answers.",
        },
        {
          id: "q5",
          prompt: "Two sources conflict. Which behaviour is best?",
          options: [
            "Pick the longer source silently",
            "State that the sources disagree and cite each, using metadata such as date to explain",
            "Refuse to answer any question",
            "Average the two statements",
          ],
          correctIndex: 1,
          explanation:
            "Transparency about conflict is more useful and honest than a silent choice.",
        },
      ],
    },
    {
      id: "rag-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: showing sources to the user",
      blurb: "A user was shown a source title that does not exist in the knowledge base. Find the line.",
      language: "python",
      lines: [
        "reply = llm(prompt)    # returns JSON: {\"answer\": ..., \"sources\": [...]}",
        "data = json.loads(reply)",
        "return {'answer': data['answer'], 'sources': data['sources']}",
      ],
      buggyLine: 3,
      reasons: [
        "json.loads cannot parse model output",
        "the sources are text the model generated, shown without checking they exist or support the answer",
        "the answer should be returned without sources",
        "the function should return a string",
      ],
      correctReasonIndex: 1,
      explanation:
        "The model can invent source names or cite ones that do not support the claim. Map citation ids back to your own chunk records, verify them, and display metadata from your index.",
      fix: "report = check_citations(data['answer'], len(chunks))\n    sources = [chunks[n - 1].metadata for n in report['cited']]",
      xp: 40,
    },
    {
      id: "rag-4-code",
      kind: "code",
      title: "Code challenge: validate citations",
      blurb: "Parse [n] markers from an answer and classify them against the sources you provided.",
      functionName: "validateCitations",
      starter: `/**
 * Find citation markers like [1] or [12] in \`answer\`.
 *
 * Return { cited, invalid, hasCitation }
 *  - cited:       sorted unique numbers n with 1 <= n <= numSources
 *  - invalid:     sorted unique numbers outside that range (including 0)
 *  - hasCitation: true when the answer contains at least one [n] marker
 *
 * Only the pattern [digits] counts. Sort numerically.
 *
 * validateCitations("30 days [1]. A year [3].", 2)
 *   -> { cited: [1], invalid: [3], hasCitation: true }
 */
function validateCitations(answer, numSources) {
  // your code here
}`,
      tests: [
        {
          name: "one valid, one invalid",
          args: ["Refunds take 30 days [1]. Credit lasts a year [3].", 2],
          expected: { cited: [1], invalid: [3], hasCitation: true },
        },
        { name: "no citations at all", args: ["Refunds take 30 days.", 2], expected: { cited: [], invalid: [], hasCitation: false } },
        { name: "duplicates are collapsed and sorted", args: ["a [2] b [1] c [2]", 3], expected: { cited: [1, 2], invalid: [], hasCitation: true } },
        { name: "zero is invalid", args: ["see [0]", 2], expected: { cited: [], invalid: [0], hasCitation: true } },
        { name: "numbers sort numerically, not as text", args: ["[10] and [9] and [2]", 12], expected: { cited: [2, 9, 10], invalid: [], hasCitation: true } },
        { name: "adjacent markers", args: ["claim [1][2]", 2], expected: { cited: [1, 2], invalid: [], hasCitation: true } },
        { name: "text in brackets that is not a number is ignored", args: ["[note] and [1a] and [1]", 1], expected: { cited: [1], invalid: [], hasCitation: true } },
      ],
      hints: [
        "A regular expression like /\\[(\\d+)\\]/g with matchAll finds every [digits] marker.",
        "Convert each match to a number, then put them in a Set to remove duplicates.",
        "Split the set into valid (between 1 and numSources) and invalid, and sort each with (a, b) => a - b.",
      ],
      solution: `function validateCitations(answer, numSources) {
  const nums = new Set(
    [...answer.matchAll(/\\[(\\d+)\\]/g)].map((m) => Number(m[1]))
  );
  const all = [...nums].sort((a, b) => a - b);

  return {
    cited: all.filter((n) => n >= 1 && n <= numSources),
    invalid: all.filter((n) => n < 1 || n > numSources),
    hasCitation: nums.size > 0,
  };
}`,
      xp: 70,
    },
  ],
};
