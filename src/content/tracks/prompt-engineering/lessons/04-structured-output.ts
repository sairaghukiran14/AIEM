import type { Lesson } from "@/content/types";

const S = {
  required: ["name", "age", "priority"],
  properties: {
    name: { type: "string" },
    age: { type: "number" },
    priority: { type: "string", enum: ["low", "medium", "high"] },
    note: { type: "string" },
  },
};

export const lesson: Lesson = {
  slug: "structured-output-and-validation",
  order: 4,
  title: "Structured Output & Validation",
  summary:
    "Code needs data, not prose. Learn how to get JSON you can trust: constrain it, validate it at the boundary, and retry sensibly.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "A model returns text. Your program needs a **typed object**. Between the two sits the most common source of production incidents in LLM apps: a reply that is almost, but not quite, parseable. Prose wrapped around the JSON, a trailing comma, a missing field, a string where a number belongs, or a reply cut off at the token limit.",
    },
    {
      type: "visual",
      key: "schema-validator",
      caption:
        "Pick a reply or edit it yourself. A reply must survive two gates: parsing, then schema validation. Failures produce the retry message you would send back.",
    },
    { type: "h", text: "Three ways to get structure, weakest to strongest" },
    {
      type: "table",
      headers: ["Method", "What it guarantees", "Caveat"],
      rows: [
        ["Ask nicely in the prompt", "nothing", "works most of the time, which is the dangerous part"],
        ["JSON mode", "syntactically valid JSON", "does not guarantee your fields or types"],
        ["Schema-constrained output or a forced tool call", "output conforms to your JSON Schema", "guarantees shape, not that the values are correct"],
      ],
    },
    {
      type: "callout",
      tone: "key",
      title: "Shape is not truth",
      text: "A schema-valid reply can still say `{\"priority\": \"low\"}` for an outage. Constrained decoding fixes **syntax and structure**; only evals and business checks fix **correctness**.",
    },
    { type: "h", text: "Design the schema for the model" },
    {
      type: "ul",
      items: [
        "**Prefer enums to free strings** for categories: the model cannot invent a sixth label.",
        "**Make \"I don't know\" representable** with a nullable field or an `unknown` enum value, so the model is not forced to guess.",
        "**Keep it flat and small.** Deeply nested optional structures fail more and cost more tokens.",
        "**Name and describe fields** like a good API; the descriptions are read by the model.",
        "**Version the schema** and your parser together.",
      ],
    },
    {
      type: "callout",
      tone: "warn",
      title: "Common beginner mistake",
      text: "Parsing the reply with a regex, or `json.loads` and then using the keys directly. Always validate against a schema at the boundary and handle the failure path explicitly.",
    },
  ],

  underTheHood: [
    {
      type: "p",
      text: "**Constrained decoding** works at the logit level you met in Track 1. At each step the decoder knows which tokens would keep the output valid under the grammar (for example, after `\"age\":` only digits and a minus sign are legal) and sets the logits of every other token to negative infinity before softmax. The model still chooses among legal tokens by probability, so the output is guaranteed to parse, but it cannot refuse or explain itself in free text.",
    },
    {
      type: "code",
      language: "text",
      code: `step: after  {"priority":
legal next tokens (enum):   "low"   "medium"   "high"
all other logits   ->   -inf      (masked before softmax)
the model samples among the three legal options only`,
      caption: "The same mask-then-softmax idea as the causal mask in attention.",
    },
    { type: "h", text: "The validation pipeline" },
    {
      type: "ol",
      items: [
        "**Check the stop reason.** A length stop means the JSON is truncated; do not parse it as complete.",
        "**Parse.** A parse failure means invalid JSON.",
        "**Validate against the schema** with a real library (Pydantic, Zod, JSON Schema). Collect every error, not only the first.",
        "**Apply business rules** the schema cannot express (dates in the future, totals that add up).",
        "**On failure, retry with the errors** fed back, a **bounded** number of times, then fail loudly.",
      ],
    },
    {
      type: "p",
      text: "Retries must carry new information. Resending the identical prompt at temperature 0 reproduces the identical failure and bills you again. The error list, passed back as a short message, is what lets the second attempt differ. Cap attempts at two or three, log the failing replies, and treat repeated failure as a prompt or schema bug rather than something to retry harder.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"how do you get reliable JSON?\"",
      text: "Layered defence: a schema-constrained mode or forced tool call so structure is guaranteed, temperature 0, a validated parse at the boundary with typed errors, a bounded retry that feeds the errors back, and logging plus evals to catch semantically wrong but valid output.",
    },
    {
      type: "p",
      text: "For streaming, parse **incrementally**: a partial JSON parser can show fields as they arrive, but only act on the object once the stream completes and passes validation.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Validate at the boundary, retry with the errors, and give up loudly.",
    code: `from pydantic import BaseModel, ValidationError
from typing import Literal


class Ticket(BaseModel):
    name: str
    age: int
    priority: Literal["low", "medium", "high"]
    note: str | None = None


MAX_ATTEMPTS = 3


def get_ticket(prompt: str) -> Ticket:
    messages = [{"role": "user", "content": prompt}]

    for attempt in range(1, MAX_ATTEMPTS + 1):
        reply = call(messages, temperature=0, max_tokens=300)

        if reply.stop_reason == "max_tokens":
            raise RuntimeError("reply truncated: raise max_tokens or shorten the task")

        try:
            return Ticket.model_validate_json(reply.text)   # parse + validate in one step
        except ValidationError as err:
            # New information for the next attempt: exactly what was wrong.
            messages += [
                {"role": "assistant", "content": reply.text},
                {"role": "user", "content": f"That was rejected:\\n{err}\\nReturn only corrected JSON."},
            ]

    raise RuntimeError(f"no valid output after {MAX_ATTEMPTS} attempts")`,
  },

  interview: [
    {
      question: "How do you reliably get structured JSON from an LLM?",
      answer:
        "Layers. Use a schema-constrained mode or a forced tool call so the structure is guaranteed, set temperature to 0 for extraction, and validate every reply against the schema with a real library at the boundary. On failure, retry a bounded number of times with the validation errors fed back, then fail loudly. I also log failures and run evals, because a schema-valid reply can still be wrong.",
      weakAnswer:
        "Tell it to respond in JSON. — That is a request, not a guarantee; it works until it does not.",
    },
    {
      question: "What is the difference between JSON mode and schema-constrained output?",
      answer:
        "JSON mode guarantees syntactically valid JSON but not your fields, types or enum values. Schema-constrained output (or a forced tool call with an input schema) masks illegal tokens during decoding so the result conforms to your schema. Neither guarantees the content is correct, which still needs evaluation.",
    },
    {
      question: "How does constrained decoding work?",
      answer:
        "At each step the decoder computes which tokens keep the output valid under the grammar derived from the schema and masks all other logits to negative infinity before softmax. The model still picks among legal tokens by probability, so syntax is guaranteed. The cost is that it cannot add free-text caveats, and a bad schema can force a wrong-but-valid answer.",
      followUp: "How would you let the model say it doesn't know?",
    },
    {
      question: "Why is retrying the same request at temperature 0 pointless?",
      answer:
        "Greedy decoding is essentially deterministic, so the identical prompt produces the identical failure and you pay again. A useful retry changes the input: feed back the validation errors, or the failed reply plus the error, so the model has new information. Bound the attempts at two or three and surface a clear error after that.",
    },
    {
      question: "What can go wrong even when the output passes the schema?",
      answer:
        "Semantic errors: the right shape with the wrong values, such as a wrong category or an invented number. Also truncated output if the stop reason is length, hallucinated values in required fields when the model had nothing to fill in, and business rules the schema cannot express. So I add nullable or unknown values, check stop reasons, apply business validation and keep an eval set.",
    },
  ],

  challenges: [
    {
      id: "pe-4-quiz",
      kind: "quiz",
      title: "Checkpoint: structured output",
      blurb: "Five questions on getting data you can trust.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "What does plain 'JSON mode' guarantee?",
          options: [
            "That all your required fields exist",
            "That the output is syntactically valid JSON",
            "That the values are correct",
            "That enums are respected",
          ],
          correctIndex: 1,
          explanation:
            "JSON mode fixes syntax only. For fields, types and enums you need schema-constrained output and validation.",
        },
        {
          id: "q2",
          prompt: "How does constrained decoding enforce a schema?",
          options: [
            "By re-asking the model until it complies",
            "By masking illegal tokens' logits so only valid continuations can be sampled",
            "By post-processing the text with a regex",
            "By fine-tuning the model per request",
          ],
          correctIndex: 1,
          explanation:
            "Illegal tokens get negative-infinity logits before softmax, the same mask-then-normalise idea as the causal mask.",
        },
        {
          id: "q3",
          prompt: "A reply is schema-valid but the priority is wrong for an outage. What does that show?",
          options: [
            "The schema is broken",
            "Schema validity guarantees shape, not correctness, so you still need evals and business checks",
            "Temperature must be higher",
            "JSON mode failed",
          ],
          correctIndex: 1,
          explanation:
            "Structure and truth are separate problems. Evals catch the second.",
        },
        {
          id: "q4",
          prompt: "Which retry strategy is sound?",
          options: [
            "Resend the identical prompt until it works",
            "Retry up to a small limit, feeding back the validation errors, then fail with a clear error",
            "Raise the temperature to 2",
            "Retry forever with exponential backoff",
          ],
          correctIndex: 1,
          explanation:
            "A retry needs new information and a cap. Identical retries at temperature 0 just repeat the failure.",
        },
        {
          id: "q5",
          prompt: "Why include an 'unknown' option or a nullable field in the schema?",
          options: [
            "It reduces token usage",
            "So the model is not forced to invent a value when the input does not contain one",
            "It is required by JSON Schema",
            "It makes parsing faster",
          ],
          correctIndex: 1,
          explanation:
            "A required field with no valid honest answer pushes the model to hallucinate. Give it a way to say nothing.",
        },
      ],
    },
    {
      id: "pe-4-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: a validation retry loop",
      blurb: "Occasionally this call never returns and the bill spikes. Find the line.",
      language: "python",
      lines: [
        "def get_structured(prompt):",
        "    while True:",
        "        reply = call(prompt, temperature=0)",
        "        try:",
        "            return Ticket.model_validate_json(reply)",
        "        except ValidationError:",
        "            continue",
      ],
      buggyLine: 2,
      reasons: [
        "temperature must be above 0 for JSON output",
        "the loop has no attempt limit and every retry sends the identical prompt, so a deterministic failure repeats forever and is billed each time",
        "model_validate_json cannot parse JSON",
        "ValidationError must be raised, not caught",
      ],
      correctReasonIndex: 1,
      explanation:
        "At temperature 0 the same prompt tends to give the same reply, so one bad reply loops forever. Bound the attempts and feed the errors back so each retry carries new information.",
      fix: "for attempt in range(MAX_ATTEMPTS):\n        ...  # on ValidationError, append the error to the messages\n    raise RuntimeError('no valid output')",
      xp: 40,
    },
    {
      id: "pe-4-code",
      kind: "code",
      title: "Code challenge: a schema validator",
      blurb: "Validate a parsed object against a small schema and report every error in a fixed order.",
      functionName: "validate",
      starter: `/**
 * Validate \`value\` against \`schema\` and return an array of error strings.
 *
 * schema = {
 *   required: ["name", "age"],
 *   properties: {
 *     name: { type: "string" },
 *     age:  { type: "number" },
 *     role: { type: "string", enum: ["admin", "user"] },
 *   },
 * }
 *
 * Rules, in this order:
 *  1. If value is not a plain object (null, array, primitive) return ["expected object"].
 *  2. For each key in schema.required that is undefined on value: "<key>: required"
 *  3. Then for each key in schema.properties (in order) that is present:
 *       - wrong typeof -> "<key>: expected <type>"
 *       - else if the schema has an enum and the value is not in it ->
 *         "<key>: must be one of a, b, c"   (joined with ", ")
 *  Extra keys on value are ignored. Return [] when everything is valid.
 */
function validate(value, schema) {
  // your code here
}`,
      tests: [
        {
          name: "a valid object has no errors",
          args: [{ name: "Ada", age: 36, priority: "high" }, S],
          expected: [],
        },
        { name: "a missing required field", args: [{ name: "Ada", priority: "high" }, S], expected: ["age: required"] },
        {
          name: "a wrong type",
          args: [{ name: "Ada", age: "36", priority: "high" }, S],
          expected: ["age: expected number"],
        },
        {
          name: "a value outside the enum",
          args: [{ name: "Ada", age: 36, priority: "urgent" }, S],
          expected: ["priority: must be one of low, medium, high"],
        },
        {
          name: "every missing field, in required order",
          args: [{}, S],
          expected: ["name: required", "age: required", "priority: required"],
        },
        {
          name: "missing errors come before type and enum errors",
          args: [{ name: 5, priority: "zzz" }, S],
          expected: ["age: required", "name: expected string", "priority: must be one of low, medium, high"],
        },
        { name: "null is not an object", args: [null, S], expected: ["expected object"] },
        { name: "an array is not an object", args: [[], S], expected: ["expected object"] },
        {
          name: "an optional property is still type-checked",
          args: [{ name: "Ada", age: 36, priority: "low", note: 3 }, S],
          expected: ["note: expected string"],
        },
        {
          name: "extra keys are ignored",
          args: [{ name: "Ada", age: 36, priority: "low", extra: true }, S],
          expected: [],
        },
      ],
      hints: [
        "Return early for non-objects: check null and Array.isArray as well as typeof.",
        "Loop schema.required first for 'required' errors, then loop Object.keys(schema.properties) for type and enum checks.",
        "Only check a property that is present (value[key] !== undefined). Do the enum check only when the type check passed.",
      ],
      solution: `function validate(value, schema) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return ["expected object"];
  }

  const errors = [];

  for (const key of schema.required || []) {
    if (value[key] === undefined) errors.push(key + ": required");
  }

  for (const key of Object.keys(schema.properties || {})) {
    if (value[key] === undefined) continue;
    const rule = schema.properties[key];

    if (typeof value[key] !== rule.type) {
      errors.push(key + ": expected " + rule.type);
    } else if (rule.enum && !rule.enum.includes(value[key])) {
      errors.push(key + ": must be one of " + rule.enum.join(", "));
    }
  }

  return errors;
}`,
      xp: 70,
    },
  ],
};
