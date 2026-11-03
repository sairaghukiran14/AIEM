import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "operating-ai-products",
  order: 6,
  title: "Operating AI Products",
  summary:
    "Shipping is the start. Define what \"working\" means with SLOs, handle incidents with runbooks, and manage the model changes that happen underneath you.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "A running LLM product can fail in ways ordinary software does not: **quality can drift** with no error anywhere, a **provider can change a model** under you, a **cost can spike** from one bad loop, and an **attack** can exploit natural language. Operating it well means deciding in advance what healthy looks like, watching it, and having practised responses.",
    },
    { type: "h", text: "Service level objectives for AI" },
    {
      type: "table",
      headers: ["Dimension", "Example objective", "Measured by"],
      rows: [
        ["**Availability**", "99.9% of requests get a valid response", "success rate, with fallbacks counted as success only if acceptable"],
        ["**Latency**", "p95 time to first token under 1.5 s", "traces (Track 6)"],
        ["**Quality**", "judged correctness at least 90% on sampled traffic", "sampled judges and feedback (Track 6)"],
        ["**Safety**", "fewer than 1 policy violation per 100,000 responses", "guardrail logs and review (lesson 4)"],
        ["**Cost**", "under $0.02 per completed task, no feature over budget", "usage records, per-feature attribution"],
      ],
    },
    {
      type: "calculator",
      title: "How much failure does your SLO allow?",
      inputs: [
        { key: "slo", label: "Availability objective", min: 90, max: 99.99, step: 0.01, value: 99.9, unit: "%" },
        { key: "requests", label: "Requests per month", min: 100000, max: 1000000000, step: 100000, value: 30000000 },
      ],
      outputs: [
        { label: "Failed requests allowed per month (error budget)", formula: "Math.round(requests * (100 - slo) / 100)", format: "int" },
        { label: "Equivalent full downtime per 30 days (minutes)", formula: "(100 - slo) / 100 * 30 * 24 * 60", format: "fixed1" },
      ],
      note: "An SLO is a deliberate allowance for failure. While budget remains you can ship changes and take risks. When it is spent, reliability work comes first.",
    },
    {
      type: "sorter",
      title: "Which first response?",
      prompt: "Pick the quickest safe mitigation for each incident.",
      categories: ["Roll back", "Fail over", "Throttle or cap", "Disable the feature"],
      items: [
        { text: "A new prompt version released an hour ago dropped quality scores sharply", answer: 0, why: "Return to the last known-good version first, then investigate." },
        { text: "The primary provider has returned 5xx errors for ten minutes", answer: 1, why: "Switch to the secondary provider or model through your gateway." },
        { text: "Spend per hour tripled because a retry loop is running", answer: 2, why: "Cap spend and concurrency now, then fix the loop." },
        { text: "A jailbreak is producing harmful content at scale and cannot be filtered quickly", answer: 3, why: "Protect people first: turn the capability off, then repair and re-test." },
      ],
    },
  ],

  underTheHood: [
    { type: "h", text: "An incident, step by step" },
    {
      type: "stepper",
      title: "Handling an AI incident",
      steps: [
        { label: "Detect", detail: "An alert fires on an SLO burn, a cost anomaly, a spike in refusals or negative feedback, or a user report. Quality incidents are often found by sampled scoring, not by error rates.", items: ["alert: quality score down 12 points"], mark: [0] },
        { label: "Triage and communicate", detail: "Assign an owner, assess impact (who, how badly, since when), and tell stakeholders. Decide quickly whether to mitigate before you understand the cause.", items: ["incident owner", "status update"], mark: [0, 1] },
        { label: "Mitigate", detail: "Use a pre-agreed runbook action: roll back a prompt or model, fail over, throttle, or disable a feature behind a flag. Mitigation comes before root cause.", items: ["roll back prompt v14 -> v13"], mark: [0] },
        { label: "Diagnose", detail: "Use traces to find the failing stage (Track 4): a prompt change, a provider model update, a retrieval index change, a tool failure or a new input pattern.", items: ["trace diff before/after"], mark: [0] },
        { label: "Fix and verify", detail: "Repair the cause, run the offline eval and regression gates (Track 6), and release gradually with monitoring.", items: ["eval gate", "canary"], mark: [0, 1] },
        { label: "Learn", detail: "Write a blameless post-mortem: timeline, cause, what detected it, what slowed you down. Add the failing cases to your eval set and fix the gaps in monitoring and runbooks.", items: ["post-mortem", "new eval cases", "new alert"], mark: [0, 1, 2] },
      ],
      caption: "Mitigate first, understand second, then make the same incident impossible to miss next time.",
    },
    { type: "h", text: "Managing change you do not control" },
    {
      type: "ul",
      items: [
        "**Pin model versions** and track provider deprecation dates. An alias can change behaviour silently (Track 2).",
        "**Treat a model upgrade as a release**: run the golden set, compare per case, canary it, keep rollback.",
        "**Feature flags** for prompts, models, tools and whole features, so mitigation is a switch, not a deploy.",
        "**Changelog everything** that can alter outputs: prompt, model, retrieval index, chunking, tools, guardrails and routing.",
        "**Keep a fallback path** that is tested regularly, not only during incidents.",
      ],
    },
    { type: "h", text: "Cost operations" },
    {
      type: "ul",
      items: [
        "**Attribute every request** to a feature, team and customer so spend has an owner (Track 6).",
        "**Budgets and alerts** per feature, with hard caps for automated runaway protection (Track 5).",
        "**Unit economics**: cost per completed task against the value it creates, not only the monthly bill.",
        "**Review regularly** with the levers from lesson 2: caching, routing, shorter outputs, batching.",
      ],
    },
    { type: "h", text: "Trust, transparency and compliance" },
    {
      type: "ul",
      items: [
        "**Tell users** they are interacting with an AI where that matters, show sources, and make errors easy to report.",
        "**Provide escalation**: a route to a human for high-stakes or frustrated users.",
        "**Data retention and deletion**: know what you log and for how long, and honour deletion requests (lesson 5 and Track 6).",
        "**Vendor risk**: understand each provider's data terms, regions, outage history and deprecation policy.",
        "**Keep records** of evaluations and releases. Regulation and customers increasingly ask for them.",
      ],
    },
    {
      type: "callout",
      tone: "interview",
      title: "What strong candidates say",
      text: "That AI products need SLOs for quality, safety and cost as well as availability and latency; that runbooks and feature flags make mitigation fast; that model upgrades are releases with evals and rollback; that incidents are mitigated first and then learned from with new eval cases; and that cost and data handling are operated, not assumed.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Error budget accounting, the arithmetic behind release decisions.",
    code: `def error_budget(slo_percent: float, total_requests: int, failed_requests: int) -> dict:
    """How much of the allowed failure have we used?"""
    allowed = round(total_requests * (100 - slo_percent) / 100)       # round: 100 - 99.9 is not exact in floats
    remaining = allowed - failed_requests
    if allowed == 0:
        burned = 0 if failed_requests == 0 else 100
    else:
        burned = min(100, round(failed_requests / allowed * 100))
    return {
        "allowed_failures": allowed,
        "remaining": remaining,
        "burned_percent": burned,
        "exhausted": failed_requests > allowed,
    }


status = error_budget(99.9, 1_000_000, 250)
print(status)       # {'allowed_failures': 1000, 'remaining': 750, 'burned_percent': 25, 'exhausted': False}

# A release policy that follows from it:
#   budget remaining  -> ship normally, take reasonable risks
#   budget exhausted  -> freeze risky changes, work on reliability until it recovers`,
  },

  interview: [
    {
      question: "What SLOs would you define for an LLM-powered product?",
      answer:
        "The usual availability and latency objectives, with time to first token and p95 or p99 rather than averages, plus ones specific to AI: a quality objective measured by sampled judging and user feedback, a safety objective on policy violations, and a cost objective such as cost per completed task. Each has an error budget that guides release decisions.",
      weakAnswer:
        "Uptime and response time. — Misses quality, safety and cost, where AI systems usually fail.",
    },
    {
      question: "A new prompt version quietly dropped quality last night. How should the incident go?",
      answer:
        "Detect through sampled quality scores or feedback, assign an owner, and mitigate first by rolling the prompt back through a flag or config to the last known-good version. Then diagnose with traces and the eval set to find which cases regressed, fix, pass the regression gate, release gradually, and write a blameless post-mortem that adds the failing cases to the eval set and an alert that would have caught it sooner.",
      followUp: "How could this have been prevented?",
    },
    {
      question: "How do you manage the risk that a provider changes or retires a model?",
      answer:
        "Pin explicit model versions, track deprecation notices, treat any upgrade as a release with my golden set and per-case comparison, canary it and keep rollback, and keep a tested fallback model or provider. I also keep datasets, prompts and eval harnesses versioned so I can re-tune or re-validate quickly.",
    },
    {
      question: "What is an error budget and how does it change behaviour?",
      answer:
        "It is the amount of failure an SLO allows, for example 0.1% of requests per month for a 99.9% objective. While budget remains, teams can ship and take reasonable risks. When it is spent, risky changes pause and effort shifts to reliability until it recovers. It turns an abstract target into a concrete release policy.",
    },
    {
      question: "How do you keep LLM costs under control in production?",
      answer:
        "Attribute spend per request to feature, team and customer, set budgets and alerts with hard caps against runaway loops, track cost per completed task, and routinely apply the levers: prompt and response caching, routing easy work to cheaper models, shorter outputs, batching non-interactive jobs, and trimming context. I review it regularly because prompts and traffic drift.",
    },
  ],

  challenges: [
    {
      id: "pa-6-quiz",
      kind: "quiz",
      title: "Checkpoint: operating AI products",
      blurb: "Five questions on SLOs, incidents and change.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "A prompt release reduced answer quality. What is the best first action?",
          options: [
            "Investigate the root cause for a week",
            "Roll back to the last known-good version, then investigate",
            "Increase the temperature",
            "Add more tools",
          ],
          correctIndex: 1,
          explanation:
            "Mitigate first. Diagnosis can continue once users are protected.",
        },
        {
          id: "q2",
          prompt: "Which SLO is specific to AI products rather than ordinary services?",
          options: [
            "CPU usage",
            "A quality objective measured from sampled judging and feedback",
            "Disk space",
            "Build time",
          ],
          correctIndex: 1,
          explanation:
            "Quality can drift with no errors anywhere, so it needs its own objective.",
        },
        {
          id: "q3",
          prompt: "A 99.9% availability SLO over 1,000,000 requests allows roughly how many failures?",
          options: ["100", "1,000", "10,000", "99,900"],
          correctIndex: 1,
          explanation:
            "0.1% of a million is 1,000. That is the error budget.",
        },
        {
          id: "q4",
          prompt: "Why use feature flags for prompts, models and tools?",
          options: [
            "To reduce token usage",
            "So mitigation (rollback, disable) is a switch rather than a redeploy",
            "To avoid evaluation",
            "To increase latency",
          ],
          correctIndex: 1,
          explanation:
            "Fast, low-risk mitigation depends on being able to change behaviour without a deployment.",
        },
        {
          id: "q5",
          prompt: "What is the most valuable output of a post-mortem for an AI incident?",
          options: [
            "Finding someone to blame",
            "New eval cases and monitoring or runbook fixes so it cannot recur unnoticed",
            "A longer prompt",
            "A bigger model",
          ],
          correctIndex: 1,
          explanation:
            "Blameless learning turns each failure into a permanent test and a faster detection.",
        },
      ],
    },
    {
      id: "pa-6-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: alerting rules",
      blurb: "A degraded model made 6% of users wait over 20 seconds and answers got worse for days, and nobody was paged. Find the line.",
      language: "python",
      lines: [
        "ALERTS = [",
        "    {'metric': 'avg_latency_ms', 'threshold': 2000},",
        "    {'metric': 'http_5xx_rate', 'threshold': 0.05},",
        "]   # no p95, quality or cost alerts",
      ],
      buggyLine: 2,
      reasons: [
        "the threshold must be negative",
        "average latency hides the slow tail that users feel, and there are no alerts on quality or cost, so the incidents that matter go unnoticed",
        "5xx rates cannot be alerted on",
        "metrics must be strings of numbers",
      ],
      correctReasonIndex: 1,
      explanation:
        "A small share of very slow requests barely moves the mean. Alert on percentiles, and add alerts for sampled quality scores, cost per request and safety flags, which fail silently in LLM systems.",
      fix: "{'metric': 'p95_ttft_ms', 'threshold': 1500}, plus quality_score, cost_per_task and policy_violation alerts",
      xp: 40,
    },
    {
      id: "pa-6-code",
      kind: "code",
      title: "Code challenge: error budget status",
      blurb: "Compute how much of an SLO's allowed failure has been used.",
      functionName: "errorBudget",
      starter: `/**
 * sloPercent:     availability objective, such as 99.9
 * totalRequests:  requests in the period
 * failedRequests: failures so far
 *
 * allowedFailures = Math.round(totalRequests * (100 - sloPercent) / 100)
 * remaining       = allowedFailures - failedRequests   (may be negative)
 * burnedPercent   = if allowedFailures is 0: 0 when there are no failures, otherwise 100
 *                   else Math.min(100, Math.round(failedRequests / allowedFailures * 100))
 * exhausted       = failedRequests > allowedFailures
 *
 * Return { allowedFailures, remaining, burnedPercent, exhausted }.
 */
function errorBudget(sloPercent, totalRequests, failedRequests) {
  // your code here
}`,
      tests: [
        { name: "a quarter of the budget used", args: [99.9, 1000000, 250], expected: { allowedFailures: 1000, remaining: 750, burnedPercent: 25, exhausted: false } },
        { name: "exactly spent but not exceeded", args: [99.9, 1000000, 1000], expected: { allowedFailures: 1000, remaining: 0, burnedPercent: 100, exhausted: false } },
        { name: "overspent", args: [99.9, 1000000, 1500], expected: { allowedFailures: 1000, remaining: -500, burnedPercent: 100, exhausted: true } },
        { name: "a 100% objective with no failures", args: [100, 100, 0], expected: { allowedFailures: 0, remaining: 0, burnedPercent: 0, exhausted: false } },
        { name: "a 100% objective with one failure", args: [100, 100, 1], expected: { allowedFailures: 0, remaining: -1, burnedPercent: 100, exhausted: true } },
        { name: "a small system", args: [99, 200, 1], expected: { allowedFailures: 2, remaining: 1, burnedPercent: 50, exhausted: false } },
      ],
      hints: [
        "Round allowedFailures, because 100 - 99.9 is not exact in floating point and a plain floor could be off by one.",
        "remaining is allowed minus failed. exhausted is failed strictly greater than allowed.",
        "Handle allowedFailures = 0 separately before dividing, then cap the burned percentage at 100.",
      ],
      solution: `function errorBudget(sloPercent, totalRequests, failedRequests) {
  const allowedFailures = Math.round((totalRequests * (100 - sloPercent)) / 100);
  const remaining = allowedFailures - failedRequests;

  let burnedPercent;
  if (allowedFailures === 0) {
    burnedPercent = failedRequests === 0 ? 0 : 100;
  } else {
    burnedPercent = Math.min(100, Math.round((failedRequests / allowedFailures) * 100));
  }

  return {
    allowedFailures,
    remaining,
    burnedPercent,
    exhausted: failedRequests > allowedFailures,
  };
}`,
      xp: 70,
    },
  ],
};
