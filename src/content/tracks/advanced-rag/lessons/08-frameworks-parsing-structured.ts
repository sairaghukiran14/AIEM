import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "frameworks-parsing-and-structured-data",
  order: 8,
  title: "Frameworks, Document Parsing & Structured Data",
  summary:
    "When to use LangChain or LlamaIndex and when to write it yourself, why parsing quality caps your whole system, and how to answer questions that live in databases instead of documents.",
  minutes: 16,

  concept: [
    {
      type: "p",
      text: "Three topics decide whether a RAG project works outside a demo: whether you build on a **framework**, how well you **parse documents**, and what you do when the answer is in a **database** rather than a document.",
    },
    { type: "h", text: "Frameworks: LangChain and LlamaIndex" },
    {
      type: "table",
      headers: ["", "What it offers", "Good for", "Watch out for"],
      rows: [
        ["**LlamaIndex**", "data connectors, parsers, indexes, query engines, with a focus on data and retrieval", "getting from documents to a working retrieval pipeline quickly", "abstractions that hide what is happening unless you inspect them"],
        ["**LangChain / LangGraph**", "general building blocks for model calls, tools and chains, plus a graph runtime for stateful agent workflows", "orchestrating multi-step flows, many integrations", "fast-moving APIs and layers that make debugging harder"],
        ["**Plain Python**", "your own small functions and interfaces", "full control, fewer dependencies, clear traces", "you write the integrations and plumbing yourself"],
      ],
    },
    {
      type: "p",
      text: "A sound rule: **understand the pipeline first, then borrow from frameworks for plumbing** such as loaders, splitters and integrations. Keep the parts that define your product, your prompts, data model, evaluation and routing, in code you own. That is why this course builds the pipeline by hand before naming a library.",
    },
    {
      type: "sorter",
      title: "Where does the answer live?",
      prompt: "Choose the right approach for each question.",
      categories: ["Document RAG", "Text-to-SQL"],
      items: [
        { text: "What does our travel policy say about taxis?", answer: 0, why: "The answer is prose in a document." },
        { text: "How many tickets were opened last week in each category?", answer: 1, why: "A count and a grouping over rows in a table." },
        { text: "Summarise the post-incident report for the outage", answer: 0, why: "Unstructured text to be retrieved and summarised." },
        { text: "Which customers have more than three overdue invoices?", answer: 1, why: "A filter and aggregate over structured data, which a database does exactly." },
      ],
    },
    {
      type: "stepper",
      title: "Parsing a scanned PDF with a table",
      steps: [
        { label: "Detect the file type", detail: "Is it a text PDF or a scan? A scan has no text layer, so a normal extractor returns nothing.", items: ["text PDF", "scanned image"], mark: [1] },
        { label: "OCR the scan", detail: "Run optical character recognition to get text. Check quality: recognition errors on numbers and codes are costly.", items: ["page image", "OCR text"], mark: [1] },
        { label: "Recover the layout", detail: "Detect columns, headers, footers and tables. Reading order matters: a two-column page read straight across mixes sentences.", items: ["column 1", "column 2", "footer"], mark: [0, 1] },
        { label: "Convert tables to structure", detail: "Turn each table into rows with their column headers, so a row reads `Plan: Pro, Price: $20` and not `Pro $20` with the header far away.", items: ["header row", "row 1", "row 2"], mark: [0, 1, 2] },
        { label: "Validate before indexing", detail: "Sample the output, flag empty pages and garbled text, and keep the source page number and file as metadata for citations.", items: ["page 4", "empty? garbled?"], mark: [1] },
      ],
      caption: "If the text going into the index is wrong, no later stage can repair it.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Errors multiply" },
    {
      type: "calculator",
      title: "End-to-end success is a product of stage success rates",
      inputs: [
        { key: "parse", label: "Parsing is correct", min: 50, max: 100, step: 5, value: 90, unit: "%" },
        { key: "chunk", label: "Chunking keeps facts together", min: 50, max: 100, step: 5, value: 90, unit: "%" },
        { key: "retrieve", label: "Retrieval finds the evidence", min: 50, max: 100, step: 5, value: 85, unit: "%" },
        { key: "answer", label: "Generation uses it correctly", min: 50, max: 100, step: 5, value: 90, unit: "%" },
      ],
      outputs: [
        { label: "End-to-end success", formula: "(parse / 100) * (chunk / 100) * (retrieve / 100) * (answer / 100)", format: "pct" },
        { label: "If parsing were perfect", formula: "(chunk / 100) * (retrieve / 100) * (answer / 100)", format: "pct" },
        { label: "Lost to parsing alone (percentage points)", formula: "((chunk / 100) * (retrieve / 100) * (answer / 100) - (parse / 100) * (chunk / 100) * (retrieve / 100) * (answer / 100)) * 100", format: "fixed1" },
      ],
      note: "Four stages at 85 to 90% each give only about 62% end to end. A parsing mistake poisons everything after it, which is why parsing quality is worth measuring directly.",
    },
    { type: "h", text: "Parsing checklist" },
    {
      type: "ul",
      items: [
        "**Scanned pages**: OCR them and sample-check numbers, codes and names.",
        "**Layout**: preserve reading order; remove repeated headers, footers and page numbers.",
        "**Tables**: keep headers attached to every row, or convert to a structured form. Never flatten a table into loose text.",
        "**Images and charts**: use captions or alt text, or a vision model to describe them if they carry facts.",
        "**Metadata**: keep file, page, section and date for filtering and citations.",
      ],
    },
    { type: "h", text: "Text-to-SQL: answering from a database" },
    {
      type: "p",
      text: "The model is given the table schema and the question and writes a query. The application runs the query and the model explains the result. It is precise because the database does the counting, and dangerous because the model's query is **untrusted input**. Treat it like user input: run it with a **read-only database role**, allow only a single `SELECT`, set a row limit and a statement timeout, and show the SQL for transparency.",
    },
    {
      type: "compare",
      title: "Two ways to run a model-written query",
      prompt: "The model produced SQL for \"how many tickets were opened last week?\". Which handling is safe?",
      a: { label: "Run it directly", text: "rows = db.execute(model_sql).fetchall()\n# uses the application's normal connection" },
      b: { label: "Validate, then run read-only", text: "if not is_safe_select(model_sql): reject\nrows = readonly_db.execute(model_sql + ' LIMIT 200')\n# read-only role, statement timeout, row limit" },
      better: 1,
      why: "A model can be prompt-injected or simply wrong. A destructive statement on a write-capable connection could delete data. Validation plus a read-only role limits what any query can do.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Route before you retrieve",
      text: "Real assistants get both kinds of question. Add a router (lesson 3) that sends data questions to text-to-SQL and document questions to retrieval, and a path for questions that need both.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"LangChain or build it yourself?\"",
      text: "Both have a place. I prototype quickly with a framework's loaders, splitters and integrations, but I keep prompts, data model, evaluation and routing in my own code, and I make sure I can read a trace of what the framework did. If a framework layer makes debugging harder than it saves, I replace it with plain functions.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "A guard for model-written SQL, and a router between data and document questions.",
    code: `import re

FORBIDDEN = re.compile(
    r"\\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|attach|pragma|copy|exec)\\b",
    re.IGNORECASE,
)

def is_safe_select(sql: str) -> bool:
    s = sql.strip()
    if s.endswith(";"):
        s = s[:-1].rstrip()
    if not s or ";" in s:                     # empty, or more than one statement
        return False
    if not re.match(r"select\\b", s, re.IGNORECASE):
        return False
    return FORBIDDEN.search(s) is None


def answer_data_question(question, llm, readonly_db):
    sql = llm(f"Write one read-only SQL SELECT for: {question}\\nSchema: {SCHEMA}")
    if not is_safe_select(sql):
        return "I could not produce a safe query for that."
    rows = readonly_db.execute(sql + " LIMIT 200").fetchall()     # read-only role, timeout set on the connection
    return llm(f"Question: {question}\\nSQL: {sql}\\nRows: {rows}\\nAnswer briefly.")


def route(question: str) -> str:
    q = question.lower()
    if re.search(r"\\b(how many|count|average|total|per|top \\d+|more than)\\b", q):
        return "sql"
    return "documents"`,
  },

  interview: [
    {
      question: "Should you use LangChain or LlamaIndex, or build RAG yourself?",
      answer:
        "It depends on the project. Frameworks speed up prototyping through loaders, splitters, integrations and ready retrieval patterns. The costs are abstraction that can hide what is happening, and APIs that change quickly. I understand the pipeline well enough to write it myself, use a framework for plumbing when it helps, and keep prompts, evaluation, routing and the data model in code I control.",
      weakAnswer:
        "Always use a framework, it is the standard. — That ignores debugging, version churn and control over the parts that define the product.",
    },
    {
      question: "Why does document parsing matter so much for RAG quality?",
      answer:
        "Everything downstream depends on the text that gets indexed. Wrong OCR, scrambled reading order, lost table headers or repeated page footers produce chunks that cannot be retrieved or answered correctly, and no prompt fixes them. Stage errors multiply, so I measure parsing quality directly by sampling output and checking tables, numbers and empty pages.",
    },
    {
      question: "How do you handle tables in PDFs?",
      answer:
        "I extract them as tables instead of flowing text, and keep the header attached to each row, for example by converting rows to key-value text or markdown with the header. For large tables I may store them in a database and use text-to-SQL. I also keep the page and table id as metadata so answers can cite the source.",
    },
    {
      question: "How would you let an assistant answer questions about data stored in a SQL database?",
      answer:
        "With text-to-SQL: give the model the relevant schema and examples, have it write one SELECT, validate it, run it on a read-only role with a row limit and timeout, and let the model explain the result while showing the SQL. I would evaluate on a set of questions with known answers and route data questions separately from document questions.",
    },
    {
      question: "What are the security risks of text-to-SQL and how do you reduce them?",
      answer:
        "The model's query is untrusted, so it could be wrong or injected by a malicious question or document, and a destructive or expensive statement could run. I reduce the risk with a read-only database role limited to the needed tables, validation that allows a single SELECT, row limits, statement timeouts, row-level security for tenants, and logging every generated query.",
    },
  ],

  challenges: [
    {
      id: "ar-8-quiz",
      kind: "quiz",
      title: "Checkpoint: frameworks, parsing and structured data",
      blurb: "Five questions on the practical edges of RAG projects.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Which approach to frameworks is most defensible in an interview?",
          options: [
            "Never use one",
            "Understand the pipeline, borrow plumbing from a framework where it helps, and keep prompts, evals and routing in your own code",
            "Always use the newest one without reading its code",
            "Use a framework for everything including evaluation",
          ],
          correctIndex: 1,
          explanation:
            "You want productivity without losing control or the ability to debug.",
        },
        {
          id: "q2",
          prompt: "Why must table headers stay attached to table rows when chunking?",
          options: [
            "To reduce storage",
            "A row such as `Pro $20` is meaningless without knowing which column each value belongs to",
            "Headers are always empty",
            "Embedding models require headers",
          ],
          correctIndex: 1,
          explanation:
            "Without the header, retrieval and the model cannot interpret the values.",
        },
        {
          id: "q3",
          prompt: "A scanned PDF yields no text with a normal extractor. What is needed?",
          options: [
            "A larger embedding model",
            "OCR to recognise text from the page images, with quality checks",
            "A higher temperature",
            "Smaller chunks",
          ],
          correctIndex: 1,
          explanation:
            "A scan has no text layer. OCR recovers text, and numbers and codes must be spot-checked.",
        },
        {
          id: "q4",
          prompt: "Which question is best answered with text-to-SQL?",
          options: [
            "What does our code of conduct say about gifts?",
            "How many orders shipped late in March, by region?",
            "Summarise this meeting transcript",
            "Explain how embeddings work",
          ],
          correctIndex: 1,
          explanation:
            "Counting and grouping rows is precise work for a database.",
        },
        {
          id: "q5",
          prompt: "Four pipeline stages succeed 90%, 90%, 85% and 90% of the time. About what is the end-to-end success?",
          options: ["About 90%", "About 62%", "About 85%", "About 35%"],
          correctIndex: 1,
          explanation:
            "0.9 x 0.9 x 0.85 x 0.9 is about 0.62. Errors multiply, so fix the weakest stages.",
        },
      ],
    },
    {
      id: "ar-8-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: running model-written SQL",
      blurb: "A security review flagged this function as dangerous. Find the line.",
      language: "python",
      lines: [
        "def answer_data_question(question, llm, db):",
        "    sql = llm(f\"Write SQL for: {question}\\nSchema: {SCHEMA}\")",
        "    rows = db.execute(sql).fetchall()",
        "    return llm(f\"Answer {question} using {rows}\")",
      ],
      buggyLine: 3,
      reasons: [
        "fetchall cannot be used with a model",
        "the model's SQL is executed unvalidated on a normal connection, so a wrong or injected statement could modify data or run unbounded",
        "the prompt must not include the schema",
        "rows should be passed before the question",
      ],
      correctReasonIndex: 1,
      explanation:
        "Generated SQL is untrusted input. Validate it as a single SELECT, run it on a read-only role with a row limit and timeout.",
      fix: "if not is_safe_select(sql): return refusal\nrows = readonly_db.execute(sql + ' LIMIT 200').fetchall()",
      xp: 40,
    },
    {
      id: "ar-8-code",
      kind: "code",
      title: "Code challenge: a safe-SELECT guard",
      blurb: "Allow only a single read-only SELECT statement.",
      functionName: "isSafeSelect",
      starter: `/**
 * isSafeSelect(sql) returns true only for a single SELECT statement.
 *
 * Rules (apply in this order):
 *   1. Trim the text. Remove ONE trailing semicolon if present.
 *   2. If it is empty, or still contains a semicolon, return false (empty or multiple statements).
 *   3. It must start with the word SELECT (any letter case), otherwise false.
 *   4. It must not contain, as a WHOLE WORD in any letter case, any of:
 *        insert update delete drop alter truncate create grant revoke attach pragma copy exec
 *      ("dropped_count" is fine; "drop" is not.)
 *   Otherwise return true.
 */
function isSafeSelect(sql) {
  // your code here
}`,
      tests: [
        { name: "plain select", args: ["SELECT * FROM tickets"], expected: true },
        { name: "trailing semicolon", args: ["select id from t;"], expected: true },
        { name: "second statement", args: ["SELECT 1; DROP TABLE t"], expected: false },
        { name: "not a select", args: ["DROP TABLE t"], expected: false },
        { name: "extra whitespace", args: ["   select * from t where x = 1  "], expected: true },
        { name: "update is forbidden", args: ["update t set a = 1"], expected: false },
        { name: "whole words only", args: ["SELECT dropped_count FROM t"], expected: true },
        { name: "two selects", args: ["SELECT * FROM t; SELECT * FROM u"], expected: false },
        { name: "empty", args: [""], expected: false },
        { name: "forbidden word inside a select", args: ["SELECT * FROM t WHERE x IN (SELECT y FROM u) AND z = delete"], expected: false },
      ],
      hints: [
        "Trim, then strip one trailing ';' with s.replace(/;$/, '') and trim again.",
        "Reject empty text or any remaining ';'. Then test /^select\\b/i.",
        "Test the forbidden words with one regex using \\b and the i flag, then return whether it matches.",
      ],
      solution: `function isSafeSelect(sql) {
  let s = sql.trim();
  if (s.endsWith(";")) s = s.slice(0, -1).trim();
  if (s === "" || s.includes(";")) return false;
  if (!/^select\\b/i.test(s)) return false;
  const forbidden = /\\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|attach|pragma|copy|exec)\\b/i;
  return !forbidden.test(s);
}`,
      xp: 70,
    },
  ],
};
