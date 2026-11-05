/** JavaScript versions of this track's lesson code examples, keyed by lesson slug. */
export const servingAndMultimodal: Record<string, string> = {
  "how-llm-serving-works": `const model = await loadModel(MODEL_PATH);   // load ONCE at startup, never per request
const queue = [];

function submit(prompt) {
  return new Promise((resolve) => queue.push({ prompt, resolve }));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scheduler(maxBatch = 8) {
  const active = [];                         // requests currently generating
  while (true) {
    // continuous batching: fill free slots at every step, not once per batch
    while (active.length < maxBatch && queue.length > 0) {
      const { prompt, resolve } = queue.shift();
      active.push({ state: model.start(prompt), resolve });
    }

    if (active.length === 0) {
      await sleep(5);
      continue;
    }

    await model.decodeStep(active.map((r) => r.state));   // one token for every active request

    for (const r of [...active]) {
      if (r.state.finished) {
        r.resolve(r.state.text);
        active.splice(active.indexOf(r), 1); // the freed slot is reused on the next loop
      }
    }
  }
}`,

  "quantization-and-self-hosting": `function weightsGb(paramsBillions, bits) {
  return (paramsBillions * bits) / 8;        // billions of params x bytes per weight = GB
}

function costPerMillionTokens(gpuPerHour, tokensPerSecond, utilisation) {
  const tokensPerHour = tokensPerSecond * 3600 * utilisation;
  return gpuPerHour / (tokensPerHour / 1e6);
}

console.log(weightsGb(70, 16));   // 140 GB: needs several GPUs
console.log(weightsGb(70, 4));    // 35 GB: fits one large GPU with room for the cache

// At 50% utilisation, a $2/hour GPU serving 1,500 tokens/second costs about $0.74 per million tokens.
console.log(costPerMillionTokens(2, 1500, 0.5).toFixed(2));

// Always check the quantized model on YOUR eval set before deploying it.
for (const name of ["fp16", "int8", "int4"]) {
  console.log(name, await runEval(await loadModel(name), testSet));
}`,

  "multimodal-llms-vision-and-audio": `import sharp from "sharp";

const TILE = 512;

async function prepareImage(path, maxSide = 1024) {
  return sharp(path)
    .resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })   // never send more pixels than the task needs
    .jpeg({ quality: 85 })
    .toBuffer();
}

function estimatedTokens(width, height, perTile = 150, base = 100) {
  const tiles = Math.ceil(width / TILE) * Math.ceil(height / TILE);
  return base + tiles * perTile;
}

async function extractInvoice(path, visionLlm) {
  const data = (await prepareImage(path)).toString("base64");
  const result = await visionLlm({ image: data, prompt: "Return JSON: line_items [{description, amount}], total." });
  const itemsSum = result.line_items.reduce((sum, i) => sum + i.amount, 0);
  if (Math.abs(itemsSum - result.total) > 0.01) {   // verify; do not just trust the read
    result.needs_review = true;
  }
  return result;
}`,

  "multimodal-rag-images-pdfs-audio": `// A segment looks like { start, end, text, speaker }.

function chunkTranscript(segments, maxSeconds = 60) {
  const chunks = [];
  let group = [];
  for (const seg of segments) {
    if (group.length > 0 && seg.end - group[0].start > maxSeconds) {   // adding it would be too long
      chunks.push(makeChunk(group));
      group = [];
    }
    group.push(seg);                         // a long single segment still gets its own chunk
  }
  if (group.length > 0) chunks.push(makeChunk(group));
  return chunks;
}

function makeChunk(group) {
  return {
    text: group.map((s) => s.text).join(" "),
    start: group[0].start,                   // keep the time range: citations link to the moment
    end: group.at(-1).end,
    speakers: [...new Set(group.map((s) => s.speaker).filter(Boolean))].sort(),
  };
}

function cite(chunk, recordingId) {
  return \`\${recordingId}?t=\${Math.floor(chunk.start)}\`;   // a deep link that seeks the player
}`,
};
