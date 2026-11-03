import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "guardrails-and-safety",
  order: 4,
  title: "Guardrails & Safety",
  summary:
    "Check what goes in and what comes out, decide what to do when a check fails, and understand the base-rate maths that makes every filter imperfect.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "A production system should not assume the model, the user or the retrieved content will always behave. **Guardrails** are checks around the model: on the **input** before it reaches the model, and on the **output** before it reaches the user or a tool. They are one layer in a defence that also includes least privilege and policy in code (Tracks 2 and 5).",
    },
    {
      type: "sorter",
      title: "Input check or output check?",
      prompt: "Where does each guardrail belong?",
      categories: ["Input check", "Output check"],
      items: [
        { text: "Detect and mask a card number the user pasted before it is logged or sent to the model", answer: 0, why: "Stop sensitive data from entering the system at all." },
        { text: "Verify the reply conforms to the JSON schema before using it", answer: 1, why: "The model's output is untrusted until validated (Track 2)." },
        { text: "Block requests on topics the product must never discuss", answer: 0, why: "Cheaper and safer to refuse before spending tokens." },
        { text: "Check that cited sources exist and support the claims", answer: 1, why: "Grounding can only be verified once you have the answer (Track 4)." },
        { text: "Redact an email address the model repeated from retrieved text", answer: 1, why: "The leak is in the output, even if the input was legitimate." },
      ],
    },
    {
      type: "stepper",
      title: "Layers around one request",
      steps: [
        { label: "Authenticate and rate limit", detail: "Know who is calling, apply per-user limits and quotas, and block abuse early (lesson 3).", items: ["auth", "rate limit"], mark: [0, 1] },
        { label: "Input guardrails", detail: "Scan for sensitive data and disallowed content, strip or mask what should not be sent on, and screen for obvious injection attempts. This is imperfect and cheap.", items: ["PII masking", "topic policy", "injection screen"], mark: [0, 1, 2] },
        { label: "The model, with least privilege", detail: "Call the model with only the tools and data it needs. Treat the system prompt as guidance, not a security boundary (Track 2).", items: ["scoped tools", "minimal data"], mark: [0, 1] },
        { label: "Output guardrails", detail: "Validate structure, run a moderation check, verify grounding and citations, redact sensitive strings, and enforce policy on any proposed tool call (Track 5).", items: ["schema", "moderation", "grounding", "redaction"], mark: [0, 1, 2, 3] },
        { label: "Decide: allow, fix, escalate or refuse", detail: "On a failure choose a safe action: return a refusal, regenerate with feedback, route to a human, or fall back. Log the decision.", items: ["refuse", "regenerate", "human review"], mark: [0, 1, 2] },
        { label: "Monitor and improve", detail: "Review blocked and allowed samples, track false positives and misses, and add the cases to your evals (Track 6).", items: ["audit samples", "update tests"], mark: [0, 1] },
      ],
      caption: "No single layer is trusted to catch everything.",
    },
    {
      type: "callout",
      tone: "key",
      title: "Every filter has false positives and false negatives",
      text: "A strict filter blocks legitimate users. A loose one lets harm through. You are choosing a point on a trade-off curve, and the right point depends on the cost of each kind of mistake in your product.",
    },
  ],

  underTheHood: [
    { type: "h", text: "Why accuracy numbers mislead: the base rate" },
    {
      type: "p",
      text: "Suppose 1 in 1,000 messages is genuinely harmful. A detector that catches 95% of harmful messages and wrongly flags 1% of harmless ones sounds excellent. On a million messages it catches 950 real cases, but it also blocks about **10,000 legitimate** messages, so most of what it flags is a mistake. When the bad thing is rare, even a small false positive rate dominates. That is why you must choose actions by their cost, and why a flag often means \"review\" rather than \"delete\".",
    },
    {
      type: "calculator",
      title: "What does a filter really do at scale?",
      inputs: [
        { key: "traffic", label: "Messages per day", min: 1000, max: 20000000, step: 1000, value: 1000000 },
        { key: "bad", label: "Share that are genuinely harmful", min: 0.01, max: 20, step: 0.01, value: 0.1, unit: "%" },
        { key: "recall", label: "Harmful messages the filter catches", min: 10, max: 100, step: 1, value: 95, unit: "%" },
        { key: "fpr", label: "Harmless messages wrongly flagged", min: 0.01, max: 10, step: 0.01, value: 1, unit: "%" },
      ],
      outputs: [
        { label: "Harmful messages caught per day", formula: "traffic * bad / 100 * recall / 100", format: "int" },
        { label: "Harmful messages missed per day", formula: "traffic * bad / 100 * (1 - recall / 100)", format: "int" },
        { label: "Legitimate messages wrongly flagged", formula: "traffic * (1 - bad / 100) * fpr / 100", format: "int" },
        { label: "Share of flags that are real", formula: "(traffic * bad / 100 * recall / 100) / ((traffic * bad / 100 * recall / 100) + (traffic * (1 - bad / 100) * fpr / 100))", format: "pct" },
      ],
      note: "Try lowering the harmful share and watch the 'share of flags that are real' collapse. Tuning thresholds on a balanced test set hides this, so evaluate on realistic proportions.",
    },
    { type: "h", text: "Designing the response to a failed check" },
    {
      type: "ul",
      items: [
        "**Fail closed for high-risk actions, open for low-risk ones.** If the safety checker is down or errors, what happens? For something that can cause harm, the default must be to block or escalate, not to let it through.",
        "**Prefer graduated responses**: warn, ask for confirmation, regenerate, route to a human, or refuse, rather than only block.",
        "**Explain refusals** in plain language so legitimate users know what to change, without revealing how to evade the filter.",
        "**Run input checks in parallel with generation** when possible, and cancel generation if the check fails, to hide the latency (lesson 1).",
        "**Streaming**: decide whether to hold back a window of text for checking, or accept a visible retraction (lesson 1).",
      ],
    },
    { type: "h", text: "Tools and practices" },
    {
      type: "table",
      headers: ["Practice", "Purpose"],
      rows: [
        ["Moderation endpoints or classifiers", "cheap, fast screens for harmful categories"],
        ["PII detection and redaction", "keep personal data out of prompts, logs and outputs"],
        ["Schema validation", "guarantee structure before use (Track 2)"],
        ["Grounding and citation checks", "reduce unsupported claims (Track 4)"],
        ["Red teaming", "people and tools deliberately try to break the system, and the findings become eval cases"],
        ["Audit logs and human review queues", "accountability and a path for hard cases"],
        ["Clear disclosure and user controls", "tell users they are talking to an AI, and let them report problems"],
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Guardrails are not a security boundary against a determined attacker",
      text: "Classifiers and prompt-based filters can be evaded by rephrasing, encoding or multi-step attacks. Use them to reduce accidents and casual abuse, and rely on least privilege, validated tool calls and human approval for anything that must not happen.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That guardrails are layers on input and output, that every filter trades false positives against false negatives and the base rate decides what a flag means, that failures need a fail-closed policy and graduated responses, that red-team findings become eval cases, and that none of it replaces least privilege.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Redact personal data on the way in and out, and fail closed when the safety check breaks.",
    code: `import re

CARD  = re.compile(r"\\b(?:\\d{4}[ -]?){3}\\d{4}\\b")
EMAIL = re.compile(r"[\\w.+-]+@[\\w-]+\\.[\\w.-]+")
PHONE = re.compile(r"\\(?\\d{3}\\)?[ -]?\\d{3}-\\d{4}")


def redact_pii(text: str) -> str:
    text = CARD.sub("[CARD]", text)       # most specific first
    text = EMAIL.sub("[EMAIL]", text)
    text = PHONE.sub("[PHONE]", text)
    return text


def is_flagged(text: str) -> bool:
    try:
        return moderation_api(text).flagged
    except Exception:
        log.error("moderation unavailable")
        return True                        # FAIL CLOSED: if the check cannot run, do not let it through


def handle(user, message: str) -> str:
    safe_in = redact_pii(message)
    if is_flagged(safe_in):
        return "I can't help with that request."          # graduated: could also route to a human
    reply = llm(safe_in)
    if is_flagged(reply):
        return "I can't share that response."
    return redact_pii(reply)                               # redact on the way out as well`,
  },

  interview: [
    {
      question: "What are input and output guardrails, and why do you need both?",
      answer:
        "Input guardrails check and sanitise what reaches the model: masking personal data, enforcing topic policy and screening obvious injection. Output guardrails check what leaves it: schema validity, moderation, grounding and citation checks, redaction and policy on proposed tool calls. Input checks save cost and keep sensitive data out of the system; output checks catch what the model produced regardless of the input. Neither is sufficient alone.",
      weakAnswer:
        "Filters that stop bad content. — Gives no placement, layers or trade-offs.",
    },
    {
      question: "A harmful-content detector has 95% recall and a 1% false positive rate, and harmful content is 0.1% of traffic. What happens?",
      answer:
        "On a million messages it catches about 950 real cases but wrongly flags about 10,000 harmless ones, so under 10% of flags are real. At a low base rate even a small false positive rate dominates. So I would not auto-delete on a flag; I would route it to review, use a cheaper action for low-confidence cases, tune thresholds on realistic proportions, and measure precision in production.",
      followUp: "How would you improve precision?",
    },
    {
      question: "What should happen if your moderation service is down?",
      answer:
        "It depends on the risk, and I decide it deliberately. For high-risk content the safe default is to fail closed: block, queue for review or fall back to a restricted behaviour. For low-risk features I might fail open with extra logging. Failing open by accident is the bug, because an outage or a crafted input that crashes the checker then disables the guardrail.",
    },
    {
      question: "How does red teaming fit into a safety process?",
      answer:
        "People and automated tools deliberately try to make the system misbehave: jailbreaks, injection, harmful requests, privacy extraction. Each successful attack becomes a regression case in my eval suite and drives a fix in the prompt, the guardrails or the permissions. It is repeated whenever the model, prompt or tools change.",
    },
    {
      question: "Can guardrails stop a determined attacker?",
      answer:
        "Not reliably. Classifiers and prompt-based rules can be evaded by rephrasing, encoding, or multi-step attacks. They reduce accidents and casual abuse, but anything that must not happen needs structural controls: least privilege, validated and authorised tool calls, human approval for risky actions and monitoring.",
    },
  ],

  challenges: [
    {
      id: "pa-4-quiz",
      kind: "quiz",
      title: "Checkpoint: guardrails and safety",
      blurb: "Five questions on layers, trade-offs and failure policy.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Harmful messages are 0.1% of traffic. A filter flags 1% of harmless messages. What is true of its flags?",
          options: [
            "Almost all flags are real harm",
            "Most flags are wrongly flagged legitimate messages, because the base rate is low",
            "It never makes mistakes",
            "False positives do not matter",
          ],
          correctIndex: 1,
          explanation:
            "At a low base rate, a small false positive rate produces far more false alarms than true catches.",
        },
        {
          id: "q2",
          prompt: "Your moderation API times out. For a high-risk feature, what should the code do?",
          options: [
            "Let the message through",
            "Fail closed: block, queue for review or use a restricted fallback",
            "Retry forever",
            "Disable logging",
          ],
          correctIndex: 1,
          explanation:
            "If the check cannot run, the default for risky content must be safe.",
        },
        {
          id: "q3",
          prompt: "Which belongs on the output side rather than the input side?",
          options: [
            "Masking a card number the user typed",
            "Verifying that the reply matches a JSON schema and its citations exist",
            "Blocking a forbidden topic before the model is called",
            "Authenticating the user",
          ],
          correctIndex: 1,
          explanation:
            "Structure and grounding can only be checked once there is an answer.",
        },
        {
          id: "q4",
          prompt: "A red-team session finds a jailbreak. What should happen next?",
          options: [
            "Ignore it, it is rare",
            "Fix the weakness and add the attack as a permanent regression case",
            "Delete the logs",
            "Turn off the guardrails",
          ],
          correctIndex: 1,
          explanation:
            "Findings become eval cases so the problem cannot silently return.",
        },
        {
          id: "q5",
          prompt: "Why are prompt-based filters not a security boundary?",
          options: [
            "They are too expensive",
            "They can be evaded by rephrasing or encoding, so critical controls must be structural",
            "They run after the model",
            "They only work in English",
          ],
          correctIndex: 1,
          explanation:
            "Use least privilege and validated tool calls for what must not happen.",
        },
      ],
    },
    {
      id: "pa-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a moderation wrapper",
      blurb: "During a moderation-provider outage, harmful requests passed straight through. Find the line.",
      language: "python",
      lines: [
        "def moderate(text):",
        "    try:",
        "        return moderation_api(text).flagged",
        "    except Exception:",
        "        return False            # if the check fails, let it through",
      ],
      buggyLine: 5,
      reasons: [
        "the function should return a string",
        "it fails open: when the checker errors or is down, every message is treated as safe, so the guardrail disappears exactly when it is needed",
        "flagged must be a number",
        "the try block should be removed and exceptions ignored",
      ],
      correctReasonIndex: 1,
      explanation:
        "A guardrail that turns into a no-op whenever it fails is not a guardrail. For risky content fail closed (block, queue or restrict), or degrade deliberately and log it.",
      fix: "return True   # fail closed: treat 'could not check' as flagged, and alert",
      xp: 40,
    },
    {
      id: "pa-4-code",
      kind: "code",
      title: "Code challenge: redact personal data",
      blurb: "Replace card numbers, emails and phone numbers with labelled placeholders.",
      functionName: "redactPII",
      starter: `/**
 * Replace personal data in \`text\`, applying these in order:
 *
 *   1. card numbers   /\\b(?:\\d{4}[ -]?){3}\\d{4}\\b/g       -> "[CARD]"
 *   2. emails         /[\\w.+-]+@[\\w-]+\\.[\\w.-]+/g         -> "[EMAIL]"
 *   3. phone numbers  /\\(?\\d{3}\\)?[ -]?\\d{3}-\\d{4}/g     -> "[PHONE]"
 *
 * Everything else is left unchanged.
 *
 * redactPII("Mail bob@example.com") -> "Mail [EMAIL]"
 */
function redactPII(text) {
  // your code here
}`,
      tests: [
        { name: "an email", args: ["Contact bob@example.com today"], expected: "Contact [EMAIL] today" },
        { name: "a dashed phone number", args: ["Call 555-123-4567 now"], expected: "Call [PHONE] now" },
        { name: "a phone number with brackets", args: ["Call (555) 123-4567 now"], expected: "Call [PHONE] now" },
        { name: "a card number with spaces", args: ["Card 4111 1111 1111 1111 expires soon"], expected: "Card [CARD] expires soon" },
        { name: "a card number with dashes", args: ["4111-1111-1111-1111"], expected: "[CARD]" },
        { name: "several items", args: ["a@b.co, c@d.org and 555-111-2222"], expected: "[EMAIL], [EMAIL] and [PHONE]" },
        { name: "no personal data", args: ["Nothing to see here: order 12345"], expected: "Nothing to see here: order 12345" },
      ],
      hints: [
        "Use replace with a regular expression that has the g flag so every occurrence changes.",
        "Apply the card pattern first, then email, then phone, in that order, chaining replace calls.",
        "In a JavaScript regex literal, write backslashes as in the comment, for example /\\b(?:\\d{4}[ -]?){3}\\d{4}\\b/g.",
      ],
      solution: `function redactPII(text) {
  return text
    .replace(/\\b(?:\\d{4}[ -]?){3}\\d{4}\\b/g, "[CARD]")
    .replace(/[\\w.+-]+@[\\w-]+\\.[\\w.-]+/g, "[EMAIL]")
    .replace(/\\(?\\d{3}\\)?[ -]?\\d{3}-\\d{4}/g, "[PHONE]");
}`,
      xp: 70,
    },
  ],
};
