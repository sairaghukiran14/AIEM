import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "tokens-and-tokenization",
  order: 2,
  title: "Tokens & Tokenization",
  summary:
    "Models don't see characters or words. They see token ids — and that single fact explains cost, context limits, and a whole family of weird failures.",
  minutes: 14,

  concept: [
    {
      type: "p",
      text: "Before a model sees your text, a **tokenizer** chops it into pieces drawn from a fixed vocabulary and converts each piece to an integer id. The model only ever works with those ids. Everything you are billed for, and every limit you hit, is counted in tokens.",
    },
    {
      type: "visual",
      key: "tokenizer",
      caption:
        "Type anything. Each coloured box is one token with its id — watch how whitespace, casing and rare words change the split.",
    },
    {
      type: "p",
      text: "A useful rule of thumb for English prose is **~4 characters per token**, or roughly 0.75 tokens per word. But it is only a rule of thumb, and the exceptions are where bugs live.",
    },
    {
      type: "table",
      headers: ["Input", "Rough tokens", "Why"],
      rows: [
        ["`hello world`", "2", "both are common whole words"],
        ["`antidisestablishmentarianism`", "6–8", "rare, split into sub-word pieces"],
        ["`  hello`", "2", "leading whitespace often attaches to its own token"],
        ["`HELLO`", "2–3", "uppercase is rarer than lowercase"],
        ["`{\"id\": 1}`", "6–8", "punctuation and braces each cost a token"],
        ["Hindi / Thai / Japanese text", "2–4× English", "fewer merges learned for these scripts"],
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Why sub-words at all?",
      text: "Characters make sequences too long; whole words make the vocabulary unbounded and break on anything unseen. Sub-words sit in the middle: a fixed ~100k vocabulary that can still spell out any new word.",
    },
    { type: "h", text: "Failures that are really tokenization" },
    {
      type: "ul",
      items: [
        "**Counting letters.** Asking how many r's are in *strawberry* is hard because the model sees two or three opaque ids, not nine characters.",
        "**Reversing strings** and **rhyming** suffer for the same reason — the spelling isn't visible at the unit the model operates on.",
        "**Arithmetic** on long numbers wobbles because digit grouping is inconsistent: `1234` might be one token, `12345` two.",
        "**Non-English cost blow-ups.** The same meaning can cost three times as many tokens, which silently triples the bill and shrinks the usable context.",
        "**Stop sequences that never fire**, because the string you chose doesn't align to a token boundary.",
      ],
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "Most modern tokenizers use **Byte Pair Encoding (BPE)** or a close relative. Training it is a compression exercise, run once, offline:",
    },
    {
      type: "ol",
      items: [
        "Start with a vocabulary of individual bytes — so *any* input is representable and nothing is ever out-of-vocabulary.",
        "Count every adjacent pair in a large corpus and find the most frequent one.",
        "Merge that pair into a single new token and record the merge rule.",
        "Repeat until the vocabulary reaches the target size, e.g. 100,000 entries.",
      ],
    },
    {
      type: "p",
      text: "The learned **merge list** is the tokenizer. At inference time, encoding just replays those merges greedily over your bytes. This is why frequency in the training corpus decides cost: common English words earned early merges and became single tokens, while rare words and under-represented scripts never did.",
    },
    {
      type: "code",
      language: "text",
      code: `corpus: "low lower lowest"

byte vocab:   l o w e r s t _
merge 1:      l+o   -> "lo"        (most frequent pair)
merge 2:      lo+w  -> "low"
merge 3:      e+r   -> "er"
...
encode("lowest") -> ["low", "est"]   # replay merges greedily`,
      caption: "BPE in miniature: merges are learned once, then replayed at encode time.",
    },
    {
      type: "callout",
      tone: "warn",
      title: "Tokenizers are model-specific",
      text: "Counting tokens with one model's tokenizer and sending the text to another model gives you a wrong number. Always count with the tokenizer that belongs to the model you are calling — or use the provider's own counting endpoint.",
    },
    { type: "h", text: "The engineering consequences" },
    {
      type: "ul",
      items: [
        "**Budget in tokens, never characters.** `len(text)` is not a context check.",
        "**Measure, don't estimate, at the margins.** A 4-chars-per-token estimate on a 200k-token budget can be tens of thousands of tokens off.",
        "**Chunk on token boundaries** when building RAG, or chunks overflow their embedding model's limit.",
        "**Prefer compact formats.** The same data as prose is often cheaper than as pretty-printed JSON, because every brace, quote and newline is billed.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "The question behind the question",
      text: "When asked \"why can't the model count letters?\", the interviewer is checking whether you understand that the model's unit of perception is not the character. Say that, then give the fix: have it use a tool, or spell the word out with separators first.",
    },
  ],

  codeExample: {
    language: "python",
    caption:
      "Count tokens with the model's own tokenizer, and budget before you send.",
    code: `# Provider-side counting is authoritative — no local tokenizer to keep in sync.
from anthropic import Anthropic

client = Anthropic()

def count_tokens(text: str, model: str = "claude-sonnet-5-5") -> int:
    result = client.messages.count_tokens(
        model=model,
        messages=[{"role": "user", "content": text}],
    )
    return result.input_tokens


# Local, offline alternative for OpenAI-family models:
#   import tiktoken
#   enc = tiktoken.encoding_for_model("gpt-4o")
#   len(enc.encode(text))


def fits_in_budget(text: str, budget: int) -> bool:
    """Use real counts, not len(text) // 4."""
    return count_tokens(text) <= budget


# The estimate is fine for logging, dangerous for limits:
def rough_tokens(text: str) -> int:
    return len(text) // 4          # ±30% on English, far worse elsewhere`,
  },

  interview: [
    {
      question: "What is a token, and why don't models just use words?",
      answer:
        "A token is an entry in a fixed vocabulary — usually a sub-word fragment — that the tokenizer maps to an integer id. Characters would make sequences impractically long, and whole words would need an unbounded vocabulary that still fails on anything unseen. Sub-word tokenization keeps the vocabulary fixed at around 100k entries while remaining able to spell out any string, because the base vocabulary is bytes.",
      weakAnswer:
        "A token is about four characters, or three quarters of a word. — That's the estimate, not the definition, and it misses why sub-words exist.",
    },
    {
      question:
        "Why do LLMs struggle to count the letters in a word or reverse a string?",
      answer:
        "Because characters are not the unit the model perceives. A word like 'strawberry' arrives as two or three opaque token ids; the spelling isn't accessible at that level, so the model has to recall the answer rather than compute it. The fix is to move the work outside the model — call a tool, or restructure the input so each character is its own token, for example by inserting separators.",
      followUp: "How would you make it reliable in production?",
    },
    {
      question:
        "Your product launches in India and the inference bill triples with the same traffic. What happened?",
      answer:
        "Almost certainly tokenization. BPE merges are learned from a corpus dominated by English, so Hindi or Tamil text gets split into many more tokens for the same meaning — commonly two to four times as many. Both input and output cost rise, and the effective context window shrinks proportionally. I would verify by counting tokens per request by locale, then consider a model with a more balanced tokenizer, prompt compression, or caching the stable parts of the prompt.",
    },
    {
      question: "How does BPE training actually work?",
      answer:
        "It starts from a byte-level vocabulary, counts all adjacent symbol pairs in a corpus, merges the most frequent pair into a new token, and repeats until the vocabulary hits its target size. The output is an ordered list of merge rules; encoding at inference time simply replays those merges greedily. Because merges follow corpus frequency, token cost is a direct reflection of how common your text was in training data.",
    },
    {
      question:
        "Is `len(text) / 4` good enough for checking whether a prompt fits the context window?",
      answer:
        "No. It's acceptable for rough logging but not for a limit check. The ratio swings with language, casing, whitespace, code and punctuation — JSON and non-Latin scripts break it badly. For anything that can fail, count with the target model's own tokenizer or the provider's counting endpoint, and keep headroom for the output tokens as well.",
    },
  ],

  challenges: [
    {
      id: "fnd-2-quiz",
      kind: "quiz",
      title: "Checkpoint: tokens",
      blurb: "Five questions on tokenization and what it costs you.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What does a tokenizer hand to the model?",
          options: [
            "A cleaned-up string",
            "A list of integer ids drawn from a fixed vocabulary",
            "One embedding per word",
            "A list of characters",
          ],
          correctIndex: 1,
          explanation:
            "Tokenization maps text to integer ids. Embeddings come later, inside the model, as a lookup on those ids.",
        },
        {
          id: "q2",
          prompt:
            "Why does BPE start from a byte-level vocabulary rather than a word list?",
          options: [
            "Bytes are faster to compare than strings",
            "So that any possible input is representable and nothing is out-of-vocabulary",
            "To keep the vocabulary under 256 entries",
            "Because models cannot process Unicode",
          ],
          correctIndex: 1,
          explanation:
            "Byte-level bases guarantee coverage: even an unseen emoji or a novel word can always be spelled out from bytes, then compressed by whatever merges apply.",
        },
        {
          id: "q3",
          prompt:
            "Which of these is most likely to cost the *most* tokens for the same information?",
          options: [
            "A plain-prose sentence",
            "A compact CSV row",
            "Pretty-printed JSON with indentation",
            "A single common English word",
          ],
          correctIndex: 2,
          explanation:
            "Every brace, quote, colon and newline is billable. Pretty-printing adds pure overhead — one reason compact formats are preferred inside prompts.",
        },
        {
          id: "q4",
          prompt:
            "You counted tokens with GPT-4o's tokenizer but send the request to a different provider's model. What is the risk?",
          options: [
            "None — token counts are standardised",
            "The count may be materially wrong, since vocabularies and merge rules differ per model",
            "The request will be rejected",
            "Only the output count will differ",
          ],
          correctIndex: 1,
          explanation:
            "Tokenizers are model-specific. Mixing them produces wrong budgets, which surfaces as surprise truncation or overage.",
        },
        {
          id: "q5",
          prompt:
            "A stop sequence you configured never triggers, even though the string clearly appears in the output. The most likely cause is:",
          options: [
            "The model ignores stop sequences when streaming",
            "Your string does not align with token boundaries, so it is never emitted as those exact tokens",
            "Stop sequences only work on input, not output",
            "The temperature is too high",
          ],
          correctIndex: 1,
          explanation:
            "Stop matching happens on tokens. If your string spans a different split than the model produces, the match fails. Prefer short, common delimiters that tokenize predictably.",
        },
      ],
    },
    {
      id: "fnd-2-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a context budget check",
      blurb:
        "This guard is supposed to stop oversized requests. It lets plenty through. Find the line.",
      language: "python",
      lines: [
        "MAX_CONTEXT = 200_000",
        "",
        "def build_prompt(system: str, docs: list[str], question: str) -> str:",
        "    body = '\\n\\n'.join(docs)",
        "    prompt = f'{system}\\n\\n{body}\\n\\nQ: {question}'",
        "",
        "    if len(prompt) > MAX_CONTEXT:",
        "        raise ValueError('prompt too long')",
        "",
        "    return prompt",
      ],
      buggyLine: 7,
      reasons: [
        "`MAX_CONTEXT` should be a float",
        "the docs should be joined with a single newline",
        "`len(prompt)` counts characters, but the limit is in tokens — and output tokens are not reserved either",
        "the system prompt should come last",
      ],
      correctReasonIndex: 2,
      explanation:
        "`len()` on a string counts characters. English prose averages about four characters per token, so this guard only fires at roughly four times the real limit — and even a correct token count would be wrong here, because the response's own tokens must fit in the same window.",
      fix: "tokens = count_tokens(prompt)          # model's own tokenizer\n    if tokens + MAX_OUTPUT_TOKENS > MAX_CONTEXT:\n        raise ValueError('prompt too long')",
      xp: 40,
    },
    {
      id: "fnd-2-code",
      kind: "code",
      title: "Code challenge: pack documents into a token budget",
      blurb:
        "Given documents with token counts, keep as many as fit, in order, without exceeding the budget.",
      functionName: "packToBudget",
      starter: `/**
 * Keep documents in their given order while the running total stays
 * within \`budget\`. Skip any document that would overflow, but keep
 * checking the ones after it — a later, smaller doc may still fit.
 *
 * Return the titles of the documents you kept.
 *
 * packToBudget([{ title: 'a', tokens: 60 }, { title: 'b', tokens: 50 }], 100)
 *   ->  ['a']            // 60 fits, 60 + 50 would not
 *
 * packToBudget([{ title: 'a', tokens: 60 }, { title: 'b', tokens: 50 },
 *               { title: 'c', tokens: 30 }], 100)
 *   ->  ['a', 'c']       // skip b, c still fits
 */
function packToBudget(docs, budget) {
  // your code here
}`,
      tests: [
        {
          name: "keeps everything when it all fits",
          args: [[{ title: "a", tokens: 10 }, { title: "b", tokens: 20 }], 100],
          expected: ["a", "b"],
        },
        {
          name: "stops at the budget",
          args: [[{ title: "a", tokens: 60 }, { title: "b", tokens: 50 }], 100],
          expected: ["a"],
        },
        {
          name: "skips an oversized doc but keeps a later small one",
          args: [
            [
              { title: "a", tokens: 60 },
              { title: "b", tokens: 50 },
              { title: "c", tokens: 30 },
            ],
            100,
          ],
          expected: ["a", "c"],
        },
        {
          name: "a doc exactly filling the budget is kept",
          args: [[{ title: "a", tokens: 100 }], 100],
          expected: ["a"],
        },
        {
          name: "nothing fits",
          args: [[{ title: "a", tokens: 500 }], 100],
          expected: [],
        },
        {
          name: "empty input",
          args: [[], 100],
          expected: [],
        },
        {
          name: "preserves the given order, does not sort by size",
          args: [
            [
              { title: "big", tokens: 90 },
              { title: "small", tokens: 5 },
              { title: "mid", tokens: 40 },
            ],
            100,
          ],
          expected: ["big", "small"],
        },
      ],
      hints: [
        "Track a running total and compare `total + doc.tokens` against the budget before accepting.",
        "Only add to the running total when you actually keep the document.",
        "Don't `break` on the first doc that doesn't fit — `continue` to the next one.",
      ],
      solution: `function packToBudget(docs, budget) {
  const kept = [];
  let total = 0;

  for (const doc of docs) {
    if (total + doc.tokens <= budget) {
      kept.push(doc.title);
      total += doc.tokens;
    }
  }

  return kept;
}`,
      xp: 70,
    },
  ],
};
