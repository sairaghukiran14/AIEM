import type { LessonExtras } from "./types";

export const agentExtras: LessonExtras = {
  "function-calling": {
    concept: [
      {
        type: "predict",
        title: "Predict: who runs the function?",
        prompt: "The model replies with a tool call asking for `get_weather` with the city Paris. What actually executes the weather lookup?",
        options: [
          "The model, inside its own computation",
          "Your program, which reads the request, validates it, runs the function and sends the result back",
          "The model provider's weather service automatically",
          "The user's browser",
        ],
        answer: 1,
        why: "A model only produces text, including a structured request to call something. Your code decides whether and how to run it, which is why you can validate and limit it.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "One complete tool call, step by step",
        problem: "The user asks `What is the weather in Paris?` and you have registered a `get_weather(city)` tool. Follow the whole exchange.",
        steps: [
          { do: "Send the question plus the tool definitions to the model.", result: "The model decides a tool is needed." },
          { do: "The model replies with a tool call instead of an answer.", result: "`get_weather` with arguments `{\"city\": \"Paris\"}`" },
          { do: "Your code validates the arguments, then runs the function.", result: "Returns `{\"temp_c\": 18, \"sky\": \"cloudy\"}`" },
          { do: "Send that result back as a tool message and call the model again.", result: "`It is 18 degrees and cloudy in Paris.` The model wrote the answer, the tool supplied the fact." },
        ],
        takeaway:
          "Two model calls and one function call. The validation step in the middle is where you enforce permissions and catch bad arguments.",
      },
    ],
  },

  "the-agent-loop": {
    concept: [
      {
        type: "predict",
        title: "Predict: the agent that will not stop",
        prompt: "An agent keeps calling the same search with the same arguments and never finishes. What is the right safeguard?",
        options: [
          "Hope the model eventually stops",
          "A hard cap on steps and a check that stops or redirects when an identical call repeats",
          "Increase the temperature",
          "Remove the search tool and the memory",
        ],
        answer: 1,
        why: "Loops need bounds that do not depend on the model behaving. Step limits, repeat detection and a budget turn a runaway into a clean failure.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Why long loops get expensive",
        problem: "Each step re-sends the whole history. The first call has 1,000 input tokens and each step adds 500 tokens of tool output and reasoning. How many input tokens does a 5-step run use, and what does it cost at $3 per million?",
        steps: [
          { do: "Write the input size at each step.", result: "1,000, 1,500, 2,000, 2,500, 3,000" },
          { do: "Add them up.", result: "10,000 input tokens in total" },
          { do: "Compare with a naive estimate of 5 x 1,000.", result: "5,000, so the real figure is double." },
          { do: "Cost.", result: "10,000 x $3 / 1,000,000 = $0.03 per run, before output tokens." },
        ],
        takeaway:
          "Cost grows faster than the number of steps because history accumulates. Cap steps, trim old tool output, and budget in tokens as well as turns.",
      },
    ],
  },

  "planning-and-memory": {
    concept: [
      {
        type: "predict",
        title: "Predict: where does long-term memory live?",
        prompt: "An agent must remember a user's preferences across weeks of conversations. Where should this be stored?",
        options: [
          "Kept in the prompt forever",
          "In an external store, with the relevant items retrieved into the prompt when needed",
          "In the model's weights, updated on each chat",
          "It cannot be done",
        ],
        answer: 1,
        why: "The context window is small and temporary. Durable facts belong in a store you control, and you fetch only what the current task needs.",
      },
    ],
    underTheHood: [
      {
        type: "compare",
        title: "Two plans for the same goal",
        prompt: "The goal is `Compare our pricing with competitors`. Which plan can an agent follow and check?",
        a: { label: "Plan A", text: "1. Research competitors and write the report." },
        b: {
          label: "Plan B",
          text: "1. List 5 competitors. Check: 5 names, each with a URL.\n2. Fetch each pricing page. Check: a price found, or marked unknown.\n3. Build a comparison table from the results.\n4. Write a one-page summary that cites the table.",
        },
        better: 1,
        why: "Plan B has small steps, each with a check, so the agent can see when a step failed and recover. Plan A hides all the work in one vague step.",
      },
    ],
  },

  "tool-design-and-mcp": {
    concept: [
      {
        type: "predict",
        title: "Predict: why the wrong tool?",
        prompt: "The agent keeps choosing `search_orders` when it should use `search_customers`. What is the most likely cause?",
        options: [
          "The model is too small to use tools",
          "The tool names and descriptions are vague or overlap, so the model cannot tell when to use which",
          "Tools cannot be told apart by models",
          "The temperature is too high",
        ],
        answer: 1,
        why: "A tool's name and description are the only documentation the model has. State what it does, when to use it and when not to.",
      },
    ],
    underTheHood: [
      {
        type: "compare",
        title: "Two definitions of the same tool",
        prompt: "Which definition will the model use correctly more often?",
        a: { label: "Tool A", text: "name: do_it\ndescription: Does stuff with orders.\nargs: x (string)" },
        b: {
          label: "Tool B",
          text: "name: get_order_status\ndescription: Look up the current status of one order. Use when the user asks where an order is. Do not use for refunds.\nargs: order_id (string, like ORD-10492)",
        },
        better: 1,
        why: "Tool B names the action, says when to use it and when not to, and shows the argument format. Tool A gives the model nothing to decide with.",
      },
    ],
  },

  "multi-agent-patterns": {
    concept: [
      {
        type: "predict",
        title: "Predict: when is multi-agent worth it?",
        prompt: "Which task is the best fit for several cooperating agents?",
        options: [
          "A short, strictly sequential task such as reformatting one paragraph",
          "A broad research task that splits into independent sub-questions that can be investigated in parallel",
          "Any task, since more agents are always better",
          "Answering a single factual question",
        ],
        answer: 1,
        why: "Multiple agents add overhead in tokens and coordination. They pay off when the work splits into independent parts that can run side by side.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "The price and payoff of splitting the work",
        problem: "A task has 3 independent sub-tasks of 15,000 tokens each. One agent does them in sequence. Alternatively, 3 workers run in parallel and an orchestrator spends 10,000 tokens planning and combining. Compare tokens and time.",
        steps: [
          { do: "Single agent: total tokens.", result: "3 x 15,000 = 45,000" },
          { do: "Multi-agent: total tokens.", result: "3 x 15,000 + 10,000 = 55,000, which is 22% more" },
          { do: "Time, in units of tokens generated one after another. Workers overlap.", result: "Single: 45,000. Multi: 15,000 + 10,000 = 25,000" },
          { do: "Compare the time.", result: "25,000 / 45,000 = 0.56, so roughly 44% faster" },
        ],
        takeaway:
          "You pay about a fifth more in tokens to finish in about half the time. If the sub-tasks are not independent, the time gain disappears and only the cost remains.",
      },
    ],
  },

  "agent-guardrails-and-reliability": {
    concept: [
      {
        type: "predict",
        title: "Predict: which action needs a human?",
        prompt: "An agent can run these actions. Which should require explicit human approval?",
        options: [
          "Reading an order's status",
          "Drafting an email for review",
          "Issuing a refund of $900",
          "Searching the help centre",
        ],
        answer: 2,
        why: "Approval belongs on actions that are costly, hard to undo or affect money and people. Reading and drafting are low risk and reversible.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "A safe retry with an idempotency key",
        problem: "The agent calls `refund(order 1042)`. The request times out, so it cannot tell whether the refund happened. A blind retry might refund twice. How do you make the retry safe?",
        steps: [
          { do: "Send a unique key with the first call, derived from the action.", result: "`refund(order 1042, key=refund-1042)`" },
          { do: "The call times out. The outcome is unknown.", result: "The agent does not assume it failed." },
          { do: "Retry with the same key.", result: "`refund(order 1042, key=refund-1042)`" },
          { do: "The server sees that the key was already used.", result: "It returns the original result instead of refunding again, so the customer is refunded exactly once." },
        ],
        takeaway:
          "Any action an agent may repeat needs an idempotency key. Combined with step limits and approval for risky actions, it makes failures survivable.",
      },
    ],
  },
};
