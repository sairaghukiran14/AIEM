import type { LessonExtras } from "./types";

export const embeddingsExtras: LessonExtras = {
  "what-embeddings-are": {
    concept: [
      {
        type: "predict",
        title: "Predict: which document is closest?",
        prompt: "The query is `how do I get my money back?`. Which document would an embedding model most likely rank first?",
        options: [
          "A pizza recipe, because it also contains common words",
          "A page titled `Refund policy`, even though it shares almost no words with the query",
          "The longest document",
          "A page that contains the exact phrase `money back` zero times but mentions shipping",
        ],
        answer: 1,
        why: "Embeddings place texts with similar meaning near each other, so a refund page matches a money-back question without needing shared words. That is the point of semantic search.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Nearest neighbour in a two-dimensional toy space",
        problem: "Real embeddings have hundreds of dimensions, but the idea is the same in two. The query sits at (2, 0). Documents: A at (1, 1), B at (4, 0), C at (0, 5). Which is nearest by straight-line distance?",
        steps: [
          { do: "Distance to A: square the differences, add, take the root.", result: "sqrt((2-1)^2 + (0-1)^2) = sqrt(2) = 1.41" },
          { do: "Distance to B.", result: "sqrt((2-4)^2 + (0-0)^2) = sqrt(4) = 2.00" },
          { do: "Distance to C.", result: "sqrt((2-0)^2 + (0-5)^2) = sqrt(29) = 5.39" },
          { do: "Rank by distance.", result: "A (1.41), then B (2.00), then C (5.39). A is the nearest neighbour." },
        ],
        takeaway:
          "Search is just this ranking, done over a million vectors with 768 or more numbers each. Everything else in the track is about doing it fast and doing it well.",
      },
    ],
  },

  "similarity-metrics": {
    concept: [
      {
        type: "predict",
        title: "Predict: normalised vectors",
        prompt: "All your vectors are normalised to length 1. How does the dot product relate to cosine similarity?",
        options: [
          "They are unrelated",
          "They are equal, so the cheaper dot product gives the same ranking",
          "Dot product is always larger",
          "Cosine is only defined for unnormalised vectors",
        ],
        answer: 1,
        why: "Cosine similarity is the dot product divided by the two lengths. When both lengths are 1 the division changes nothing.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Same direction, different length",
        problem: "Let a = (3, 4), b = (6, 8) and c = (4, 3). Compare a with b and a with c using cosine similarity and Euclidean distance.",
        steps: [
          { do: "Lengths of the vectors.", result: "|a| = 5, |b| = 10, |c| = 5" },
          { do: "Cosine of a and b: dot product over the product of lengths.", result: "(18 + 32) / (5 x 10) = 50 / 50 = 1.00, identical direction" },
          { do: "Euclidean distance of a and b.", result: "sqrt(9 + 16) = 5, so they look far apart by distance" },
          { do: "Cosine of a and c.", result: "(12 + 12) / (5 x 5) = 24 / 25 = 0.96, and the distance is sqrt(1 + 1) = 1.41" },
        ],
        takeaway:
          "Cosine ignores length and compares direction, so a and b count as identical. Distance says c is nearer to a than b is. Pick the metric your model was trained for, and normalise if in doubt.",
      },
    ],
  },

  "chunking-strategy": {
    concept: [
      {
        type: "predict",
        title: "Predict: the giant chunk",
        prompt: "Each chunk is 2,000 tokens and covers five different topics. A question is about one topic. What is the likely effect?",
        options: [
          "Retrieval gets more precise because there is more text",
          "The chunk's vector blends five topics, so it matches the question weakly and brings in lots of irrelevant text",
          "Nothing, since chunk size does not matter",
          "The embedding model refuses long input",
        ],
        answer: 1,
        why: "One vector summarises the whole chunk. Mixed topics blur that summary, so search gets noisy and the model is handed material it must wade through.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "How many chunks, and what does overlap cost?",
        problem: "A document is 1,000 tokens. You use chunks of 300 tokens with an overlap of 50. How many chunks do you get, and how many tokens do you embed in total?",
        steps: [
          { do: "Each new chunk starts 300 - 50 = 250 tokens after the last.", result: "Starts at 0, 250, 500, 750." },
          { do: "Check where each ends. The last one runs out of document.", result: "0-300, 250-550, 500-800, 750-1,000: 4 chunks." },
          { do: "Add the tokens embedded.", result: "300 + 300 + 300 + 250 = 1,150 tokens" },
          { do: "Compare with no overlap.", result: "1,150 vs 1,000: overlap costs 15% more to embed and store." },
        ],
        takeaway:
          "Overlap protects sentences that straddle a boundary, and its price is easy to calculate. Decide on it knowing the cost.",
      },
    ],
  },

  "vector-indexes-and-ann": {
    concept: [
      {
        type: "predict",
        title: "Predict: what approximate means",
        prompt: "An approximate nearest neighbour index returns the true top 10 about 95% of the time. What did you trade to get that speed?",
        options: [
          "Some recall: occasionally a true neighbour is missed",
          "Correctness of the embeddings themselves",
          "The ability to filter results",
          "Nothing: it is exact but faster",
        ],
        answer: 0,
        why: "ANN skips most vectors and so may miss a true neighbour. Recall is the name for how often it finds them, and you tune it against speed.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Brute force versus an index",
        problem: "You have 10 million vectors with 768 dimensions. Compare the work for one exact search with an index that examines about 2,000 vectors per query.",
        steps: [
          { do: "Exact search compares the query with every vector.", result: "10,000,000 x 768 = 7,680,000,000 multiply-adds" },
          { do: "The index only examines about 2,000 candidates.", result: "2,000 x 768 = 1,536,000 multiply-adds" },
          { do: "Divide to compare.", result: "7.68 billion / 1.536 million = 5,000 times less work" },
          { do: "At 95% recall, how many of the true top 10 do you expect to get?", result: "About 9.5 on average, so usually 9 or 10." },
        ],
        takeaway:
          "A few percent of recall buys thousands of times less work. Measure recall on your own data, because it differs by dataset and index settings.",
      },
    ],
  },

  "hybrid-search-and-reranking": {
    concept: [
      {
        type: "predict",
        title: "Predict: when keywords win",
        prompt: "The query is `error E4012 timeout`. Which method is most likely to find the right page?",
        options: [
          "Vector search alone",
          "Keyword search, because the exact code E4012 is a rare token a vector may blur away",
          "Neither can work",
          "Whichever is slower",
        ],
        answer: 1,
        why: "Exact identifiers, error codes and names are keyword strengths. Vectors shine on paraphrase. Hybrid search combines both.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Merging two rankings with reciprocal rank fusion",
        problem: "Vector search ranks A first, B second, C third. Keyword search ranks C first, A second, D third. Combine them using score = 1 / (60 + rank) for each list that returns the document.",
        steps: [
          { do: "Score A: rank 1 in vectors, rank 2 in keywords.", result: "1/61 + 1/62 = 0.01639 + 0.01613 = 0.03252" },
          { do: "Score C: rank 3 and rank 1.", result: "1/63 + 1/61 = 0.01587 + 0.01639 = 0.03227" },
          { do: "Score B and D, each in one list only.", result: "B: 1/62 = 0.01613. D: 1/63 = 0.01587." },
          { do: "Sort by score.", result: "A, C, B, D. Documents both methods like rise to the top." },
        ],
        takeaway:
          "Rank fusion needs no score calibration between the two systems, which is why it is a common first choice. A reranker can then reorder the short list more carefully.",
      },
    ],
  },

  "choosing-and-evaluating-embeddings": {
    concept: [
      {
        type: "predict",
        title: "Predict: how to judge a model",
        prompt: "You are choosing between two embedding models. What is the most trustworthy comparison?",
        options: [
          "The one with the larger vectors",
          "Recall@k on a set of your own real queries with known correct documents",
          "The one with the higher public benchmark score alone",
          "Whichever is newer",
        ],
        answer: 1,
        why: "Public benchmarks measure other data. Your queries and documents decide your results, so measure on them.",
      },
    ],
    underTheHood: [
      {
        type: "example",
        title: "Scoring retrieval on four queries",
        problem: "For four test queries, the first correct document appears at ranks 1, 3, 5 and 2. Compute recall@3 and mean reciprocal rank (MRR).",
        steps: [
          { do: "Recall@3 counts queries whose answer is in the top 3.", result: "Ranks 1, 3 and 2 qualify; rank 5 does not. 3 of 4 = 75%." },
          { do: "Reciprocal rank is 1 divided by the rank of the first correct result.", result: "1, 1/3, 1/5, 1/2 = 1.000, 0.333, 0.200, 0.500" },
          { do: "Average them for MRR.", result: "(1.000 + 0.333 + 0.200 + 0.500) / 4 = 0.508" },
          { do: "Interpret.", result: "On average the right answer sits around rank 2, and one query in four misses the top 3." },
        ],
        takeaway:
          "Two or three simple numbers on your own queries beat intuition. Rerun them whenever you change models, chunking or the index.",
      },
    ],
  },
};
