import type { LessonExtras } from "./types";

export const ragExtras: LessonExtras = {
  "the-rag-pipeline": {
    concept: [
      {
        type: "predict",
        title: "Predict: which stage failed?",
        prompt: "A RAG bot gives a wrong answer. You look at the prompt it received and the passage that contains the right answer is not in it. Which part of the pipeline most likely failed?",
        options: [
          "Generation: the model reasoned badly",
          "Retrieval or earlier: the right passage was never fetched, so the model could not use it",
          "The user interface",
          "Token pricing",
        ],
        answer: 1,
        why: "The model can only use what it is given. If the evidence never reached the prompt, fix retrieval (or ingestion and chunking) before touching the model.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Following one question through the pipeline",
        problem: "A user asks `Can I return opened headphones?` The knowledge base is a set of policy pages. Trace what happens at each stage.",
        steps: [
          { do: "Embed the question into a vector.", result: "A 768-number vector that represents the meaning of the question." },
          { do: "Search the vector index for the nearest chunks, say the top 4.", result: "Returns the Returns policy, section 2: `Opened hygiene items such as headphones cannot be returned unless faulty.`, plus 3 weaker matches." },
          { do: "Assemble the prompt: instructions, the chunks, the question.", result: "A single prompt that says to answer only from the supplied text and to cite the section." },
          { do: "Generate and check.", result: "`No, unless they are faulty (Returns policy, section 2).` The answer cites its source and can be verified." },
        ],
        takeaway:
          "Each stage has its own failure and its own fix. Learning the pipeline as separate steps is what lets you debug it later.",
      },
    ],
  },

  "query-understanding": {
    concept: [
      {
        type: "predict",
        title: "Predict: the follow-up question",
        prompt: "In a chat, the user first asks about the refund window for UK orders, then asks `and in Europe?`. Searching the knowledge base with that exact text is likely to:",
        options: [
          "Work well, because search understands context",
          "Fail, because the follow-up has lost the subject, so it should be rewritten into a standalone question first",
          "Return the same results as the first question",
          "Be blocked by the index",
        ],
        answer: 1,
        why: "A retriever sees only the text you give it. Rewriting the follow-up using the conversation turns it into a question that can stand on its own.",
      },
    ],
    underTheHood: [
      {
        type: "compare",
        title: "Which query should reach the index?",
        prompt: "The user typed `and in Europe?` right after asking about UK refund times. Which query do you search with?",
        a: { label: "Raw input", text: "and in Europe?" },
        b: { label: "Rewritten", text: "What is the refund window for orders shipped to Europe?" },
        better: 1,
        why: "The rewrite restores the missing subject and uses the terms the documents are likely to contain. The raw text matches almost anything, or nothing.",
      },
    ],
  },

  "retrieval-and-context-assembly": {
    concept: [
      {
        type: "predict",
        title: "Predict: more chunks, better answers?",
        prompt: "Quality is poor, so you raise the number of retrieved chunks from 4 to 30. What usually happens?",
        options: [
          "Quality always improves",
          "Cost and latency rise, and extra irrelevant text can distract the model, so quality often does not improve and can fall",
          "The model ignores the extra chunks automatically",
          "Nothing changes",
        ],
        answer: 1,
        why: "Relevant chunks are few. Adding many more brings noise, repeated content and cost. Better ranking beats a bigger pile.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Fitting chunks into a context budget",
        problem: "You can spend 3,000 tokens on retrieved context. The search returns 8 chunks of about 450 tokens each, and two of them are near duplicates. What goes into the prompt?",
        steps: [
          { do: "Remove near duplicates first, keeping the better ranked of each pair.", result: "8 - 2 = 6 distinct chunks" },
          { do: "Check the total against the budget.", result: "6 x 450 = 2,700 tokens, within 3,000" },
          { do: "Could a seventh fit?", result: "7 x 450 = 3,150, which is over budget, so no. Drop the lowest-ranked rather than trimming a chunk mid-sentence." },
          { do: "Choose the order. Models attend best to the start and end of long context.", result: "Put the strongest chunks first and last, weaker ones in the middle." },
        ],
        takeaway:
          "Context assembly is a small packing problem: dedupe, fit the budget, order deliberately. Doing it by design is cheaper and more accurate than retrieving more.",
      },
    ],
  },

  "grounding-and-citations": {
    concept: [
      {
        type: "predict",
        title: "Predict: when the answer is not in the documents",
        prompt: "The retrieved passages do not mention the customer's question at all. What should a well-grounded assistant do?",
        options: [
          "Answer from general knowledge without saying so",
          "Say that the documents do not cover it, and offer a next step such as contacting support",
          "Pick the closest passage and quote it",
          "Return an empty reply",
        ],
        answer: 1,
        why: "A grounded system answers from the evidence or says it cannot. Admitting a gap is correct behaviour, and instructing it explicitly is part of the prompt.",
      },
    ],
    underTheHood: [
      {
        type: "compare",
        title: "Two replies to an unanswerable question",
        prompt: "The question is `Do you ship to Mars?` and the documents list only Earth countries. Which reply is better grounded?",
        a: { label: "Reply A", text: "Yes! We ship to Mars in 14 to 18 months, with a flat fee of $9,999." },
        b: { label: "Reply B", text: "I could not find shipping to Mars in our documentation. The shipping page lists the countries we deliver to. Would you like me to connect you with support?" },
        better: 1,
        why: "Reply A invents specifics the documents never state. Reply B reports the gap, points to the source and offers a way forward, which is what grounding is for.",
      },
    ],
  },

  "rag-failure-modes": {
    concept: [
      {
        type: "predict",
        title: "Predict: the right passage was ignored",
        prompt: "The correct passage is in the prompt, but the model answers with something else. Which area do you investigate?",
        options: [
          "The embedding model",
          "Generation and grounding: the instructions, context order and prompt wording",
          "Chunk size",
          "The vector index",
        ],
        answer: 1,
        why: "Retrieval and assembly worked, since the evidence is present. What remains is how the model uses it, so look at the prompt and instructions.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Debugging a wrong answer in order",
        problem: "A user reports a wrong answer. Work through the stages from the start, stopping at the first one that fails.",
        steps: [
          { do: "Is the right fact in your corpus at all?", result: "No: an ingestion or content gap. Add or fix the document." },
          { do: "Is the chunk that holds it retrieved in the top k?", result: "No: a retrieval, chunking or query problem. Inspect the query and the ranking." },
          { do: "Is it still in the final prompt after dedupe, ordering and truncation?", result: "No: an assembly bug, often a budget cut that dropped it." },
          { do: "It is in the prompt but the answer ignores it.", result: "Generation or grounding: tighten instructions, reorder, or add a citation requirement." },
        ],
        takeaway:
          "Always walk the pipeline in order and find the first broken stage. Fixing a later stage first hides the real cause.",
      },
    ],
  },

  "evaluating-rag": {
    concept: [
      {
        type: "predict",
        title: "Predict: what to measure first",
        prompt: "Answers look poor. Why measure retrieval separately from the final answer?",
        options: [
          "Because retrieval is cheaper to display",
          "Because it tells you whether the failure is in finding evidence or in using it, which have different fixes",
          "Because the final answer cannot be measured",
          "Retrieval metrics replace answer metrics",
        ],
        answer: 1,
        why: "A bad answer has several possible causes. Separate retrieval and generation scores tell you which half to repair.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Scoring one question",
        problem: "For one test question, 3 chunks in the corpus are known to be relevant. Your retriever returns 5 chunks, of which 2 are relevant. The generated answer makes 4 factual claims, and 3 of them are supported by the retrieved text.",
        steps: [
          { do: "Precision@5: relevant results over results returned.", result: "2 / 5 = 40%" },
          { do: "Recall: relevant results found over all relevant that exist.", result: "2 / 3 = 66.7%" },
          { do: "Faithfulness: supported claims over claims made.", result: "3 / 4 = 75%" },
          { do: "Read the three numbers together.", result: "Retrieval misses a third of the evidence and pads with noise, and one claim in four is unsupported." },
        ],
        takeaway:
          "Average these over a real test set and you have a baseline. Change one thing at a time and see which number moves.",
      },
    ],
  },
};
