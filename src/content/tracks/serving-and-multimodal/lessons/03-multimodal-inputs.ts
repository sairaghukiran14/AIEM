import type { Lesson } from "@/content/types";

export const lesson: Lesson = {
  slug: "multimodal-llms-vision-and-audio",
  order: 3,
  title: "Multimodal Models: Vision and Audio",
  summary:
    "Models can now read images and listen to audio. Learn how images become tokens, what that costs, what these models still get wrong, and how to design around it.",
  minutes: 15,

  concept: [
    {
      type: "p",
      text: "A **multimodal** model accepts more than text: images, and in some models audio or video. For an AI engineer the questions are practical. What does an image cost in tokens? When is a vision model the right tool? Where does it fail? And how do you build features that do not depend on it being perfect?",
    },
    {
      type: "table",
      headers: ["Input", "How it reaches the model", "Common uses"],
      rows: [
        ["**Images**", "split into patches or tiles, each becoming tokens the model attends to along with the text", "reading screenshots, charts, forms and photos; describing and checking images"],
        ["**Audio**", "either transcribed to text first (speech recognition), or fed to a model that accepts audio directly", "meeting notes, call analysis, voice assistants"],
        ["**Video**", "usually a sample of frames plus the audio transcript, because every frame costs tokens", "summarising or searching recordings"],
        ["**Documents**", "extracted text, or page images read by a vision model, or both", "invoices, contracts, scanned forms"],
      ],
    },
    {
      type: "sorter",
      title: "Vision model or plain text pipeline?",
      prompt: "Pick the better approach for each task.",
      categories: ["Vision model", "Text pipeline (OCR or parsing)"],
      items: [
        { text: "Explain what a dashboard screenshot shows and what looks wrong", answer: 0, why: "The meaning is in the visual layout, colours and charts." },
        { text: "Extract the text of 10,000 clean, text-based PDFs", answer: 1, why: "Direct text extraction is cheaper, faster and exact." },
        { text: "Read handwriting and stamps on a scanned form", answer: 0, why: "Layout and marks matter, and a vision model can read them in context." },
        { text: "Index a long table of figures for exact lookups", answer: 1, why: "Structured extraction keeps numbers exact, where a vision model may misread digits." },
      ],
    },
    {
      type: "stepper",
      title: "From a picture to tokens",
      steps: [
        { label: "Resize or tile the image", detail: "Large images are scaled down or cut into fixed-size tiles. More tiles means more tokens and more cost.", items: ["1024 x 1024 image", "4 tiles of 512 x 512"], mark: [1] },
        { label: "Encode each tile", detail: "A vision encoder turns every tile into a set of vectors.", items: ["tile 1", "tile 2", "tile 3", "tile 4"], mark: [0, 1, 2, 3] },
        { label: "Project into the language model", detail: "Those vectors become tokens in the model's input, sitting alongside your text prompt.", items: ["image tokens", "text tokens"], mark: [0] },
        { label: "Attend across both", detail: "The model reads image and text together to answer questions such as what is in this chart.", items: ["question", "answer"], mark: [1] },
        { label: "Pay for the tokens", detail: "Image tokens are billed and fill the context window, just like text. Every turn that re-sends the image pays again.", items: ["input tokens", "context window"], mark: [0, 1] },
      ],
      caption: "An image is not free metadata. It is hundreds or thousands of tokens.",
    },
  ],

  underTheHood: [
    { type: "h", text: "What an image costs" },
    {
      type: "calculator",
      title: "Illustrative image token estimate",
      inputs: [
        { key: "w", label: "Image width (px)", min: 256, max: 4096, step: 256, value: 1024 },
        { key: "h", label: "Image height (px)", min: 256, max: 4096, step: 256, value: 1024 },
        { key: "tile", label: "Tile size (px)", min: 256, max: 1024, step: 256, value: 512 },
        { key: "perTile", label: "Tokens per tile", min: 50, max: 500, step: 50, value: 150 },
        { key: "base", label: "Fixed tokens per image", min: 0, max: 200, step: 50, value: 100 },
        { key: "images", label: "Images per day", min: 100, max: 100000, step: 100, value: 10000 },
        { key: "price", label: "Input price per million tokens ($)", min: 1, max: 10, step: 1, value: 3 },
      ],
      outputs: [
        { label: "Tiles per image", formula: "Math.ceil(w / tile) * Math.ceil(h / tile)", format: "int" },
        { label: "Tokens per image", formula: "base + Math.ceil(w / tile) * Math.ceil(h / tile) * perTile", format: "int" },
        { label: "Image input cost per day ($)", formula: "images * (base + Math.ceil(w / tile) * Math.ceil(h / tile) * perTile) * price / 1e6", format: "usd" },
      ],
      note: "This is an illustrative tiling scheme. Providers differ, so read yours. The lesson is that cost grows with resolution, and that resizing images to what the task needs is a real saving.",
    },
    { type: "h", text: "Where multimodal models still fail" },
    {
      type: "ul",
      items: [
        "**Small text and fine detail** can be misread, especially digits, codes and dense tables.",
        "**Counting and spatial reasoning** (how many items, which is left of which) are error-prone.",
        "**Invented detail**: the model can describe something plausible that is not in the image, the visual form of hallucination.",
        "**Cost and latency**: image tokens add up quickly, and long video is very expensive if every frame is read.",
        "**Privacy**: images can contain faces, documents and screens with personal data, so apply the same data rules as for text.",
      ],
    },
    {
      type: "compare",
      title: "Two ways to read an invoice",
      prompt: "You must extract the total from thousands of invoices a day. Which design is better?",
      a: { label: "Design A", text: "Send every invoice as a full-resolution image to a vision model and trust the total it returns." },
      b: { label: "Design B", text: "Extract text where possible, send only hard pages to a vision model at a sensible resolution, check the total against line items, and route mismatches to a person." },
      better: 1,
      why: "Design B is cheaper, more accurate on clean pages and has a verification step. Design A pays for pixels it does not need and has no check on misread digits.",
    },
    {
      type: "callout",
      tone: "interview",
      title: "How to answer \"how would you build a feature that reads images?\"",
      text: "Decide whether a text pipeline is enough, resize images to what the task needs, cap and cost the tokens, validate the output (cross-checks, schemas), plan for the failure cases above, keep humans in the loop for high-stakes results, and evaluate on a labelled set of real images.",
    },
  ],

  codeExample: {
    language: "python",
    caption: "Resize before sending, estimate the cost, and cross-check what the model read.",
    code: `import base64, io
from PIL import Image

TILE = 512


def prepare_image(path: str, max_side: int = 1024) -> bytes:
    img = Image.open(path)
    img.thumbnail((max_side, max_side))                # never send more pixels than the task needs
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def estimated_tokens(width: int, height: int, per_tile: int = 150, base: int = 100) -> int:
    tiles = -(-width // TILE) * -(-height // TILE)     # ceiling division
    return base + tiles * per_tile


def extract_invoice(path, vision_llm):
    data = base64.b64encode(prepare_image(path)).decode()
    result = vision_llm(image=data, prompt="Return JSON: line_items [{description, amount}], total.")
    items_sum = round(sum(i["amount"] for i in result["line_items"]), 2)
    if abs(items_sum - result["total"]) > 0.01:        # verify; do not just trust the read
        result["needs_review"] = True
    return result`,
  },

  interview: [
    {
      question: "How do images consume tokens and why does it matter?",
      answer:
        "The image is resized or split into tiles, each tile is encoded into vectors that become tokens in the model's input. Bigger or more images mean more tokens, which cost money, fill the context window and add latency, and a conversation that re-sends the image every turn pays each time. So I resize to what the task needs and cache or reference images instead of resending them.",
    },
    {
      question: "When would you not use a vision model?",
      answer:
        "When the content is available as clean text, such as text-based PDFs or HTML, because direct extraction is cheaper, faster and exact. Also for tasks needing exact digits or large tables where a vision model may misread values. I would use a text pipeline by default and reserve the vision model for pages where layout, handwriting or charts matter.",
    },
    {
      question: "What are common failure modes of multimodal models?",
      answer:
        "Misreading small text and digits, errors in counting and spatial relations, and describing details that are not in the image. They are also costly and slow when images are large or numerous. I handle these by resizing sensibly, validating outputs with cross-checks and schemas, using humans for high-stakes cases, and measuring accuracy on real labelled images.",
    },
    {
      question: "How do you process audio for an LLM application?",
      answer:
        "Usually transcribe it with a speech recognition model, keeping timestamps and speaker labels, then treat the transcript as text for search, summarisation or question answering, citing timestamps. Some models accept audio directly, which can capture tone, but the transcript pipeline is cheaper, easier to search and easier to evaluate, so I start there.",
    },
    {
      question: "How do you reduce the cost of a vision feature that processes thousands of images a day?",
      answer:
        "Downscale images to the minimum resolution that keeps the needed detail, crop to the relevant region, use text extraction first and send only difficult cases to the vision model, cache results by image hash, batch non-urgent work at lower prices, and avoid resending the same image across conversation turns. I measure accuracy after each reduction.",
    },
  ],

  challenges: [
    {
      id: "sm-3-quiz",
      kind: "quiz",
      title: "Checkpoint: multimodal models",
      blurb: "Five questions on images, audio and their limits.",
      passPercent: 70,
      xp: 50,
      questions: [
        {
          id: "q1",
          prompt: "Why can resizing an image reduce cost?",
          options: [
            "Smaller files upload faster only",
            "Fewer tiles means fewer image tokens, which are billed and fill the context window",
            "Models cannot read large images",
            "It changes the temperature",
          ],
          correctIndex: 1,
          explanation:
            "Token count grows with the number of tiles, which depends on resolution.",
        },
        {
          id: "q2",
          prompt: "Which task is a better fit for plain text extraction than a vision model?",
          options: [
            "Reading handwriting on a scanned form",
            "Pulling text from thousands of clean, text-based PDFs",
            "Describing a photo",
            "Judging a chart's shape",
          ],
          correctIndex: 1,
          explanation:
            "A text layer can be extracted exactly, cheaply and quickly.",
        },
        {
          id: "q3",
          prompt: "What is the usual first step for an audio question-answering feature?",
          options: [
            "Convert the audio to an image",
            "Transcribe it to text with timestamps, then retrieve and answer from the transcript",
            "Fine-tune a model on the audio",
            "Delete the silence only",
          ],
          correctIndex: 1,
          explanation:
            "A transcript is searchable, cheaper to process and lets you cite moments in the recording.",
        },
        {
          id: "q4",
          prompt: "A vision model returns an invoice total that does not match the sum of the line items. What should the system do?",
          options: [
            "Return the total anyway",
            "Flag it for review, because a failed cross-check signals a misread",
            "Raise the temperature",
            "Resend the same image forever",
          ],
          correctIndex: 1,
          explanation:
            "Cross-checks catch misread digits. Route mismatches to a person or a retry with a better crop.",
        },
        {
          id: "q5",
          prompt: "Why is long video expensive to analyse?",
          options: [
            "Video cannot be tokenised",
            "Every frame read costs image tokens, so sampling frames and using the transcript is the usual approach",
            "Video needs a larger temperature",
            "Models forbid it",
          ],
          correctIndex: 1,
          explanation:
            "Frames multiply tokens quickly. Sample sparsely and lean on the audio transcript.",
        },
      ],
    },
    {
      id: "sm-3-bug",
      kind: "spot-the-bug",
      title: "Spot the bug: the ballooning bill",
      blurb: "A chat about one screenshot gets slower and more expensive every turn. Find the line.",
      language: "python",
      lines: [
        "def chat_about_image(image, turns, llm):",
        "    history = []",
        "    for question in turns:",
        "        history.append({\"role\": \"user\", \"content\": [image, question]})",
        "        history.append({\"role\": \"assistant\", \"content\": llm(history)})",
        "    return history",
      ],
      buggyLine: 4,
      reasons: [
        "history must be a dictionary",
        "the full image is attached to every user turn, so its tokens are re-sent and paid for again on each call",
        "llm cannot receive a list of messages",
        "enumerate should be used instead of the for loop",
      ],
      correctReasonIndex: 1,
      explanation:
        "Attach the image once at the start of the conversation (or describe it once and reuse the description), instead of repeating it in every turn.",
      fix: "include the image only in the first user message: content = [image, question] if first else question",
      xp: 40,
    },
    {
      id: "sm-3-code",
      kind: "code",
      title: "Code challenge: image token estimate",
      blurb: "Estimate image tokens from its size using a tiling scheme.",
      functionName: "imageTokens",
      starter: `/**
 * imageTokens(width, height, tileSize, tokensPerTile, baseTokens)
 *
 * The image is divided into square tiles of 'tileSize' pixels. Partial tiles
 * at the edges count as whole tiles.
 *
 *   tiles  = ceil(width / tileSize) * ceil(height / tileSize)
 *   tokens = baseTokens + tiles * tokensPerTile
 */
function imageTokens(width, height, tileSize, tokensPerTile, baseTokens) {
  // your code here
}`,
      tests: [
        { name: "1024 x 1024", args: [1024, 1024, 512, 170, 85], expected: 765 },
        { name: "exactly one tile", args: [512, 512, 512, 170, 85], expected: 255 },
        { name: "partial tiles round up", args: [1000, 600, 512, 170, 85], expected: 765 },
        { name: "wide image, no base", args: [2048, 1024, 512, 170, 0], expected: 1360 },
        { name: "smaller than a tile", args: [100, 100, 512, 170, 85], expected: 255 },
        { name: "just over a tile", args: [513, 513, 512, 100, 0], expected: 400 },
      ],
      hints: [
        "Use Math.ceil(width / tileSize) and Math.ceil(height / tileSize) so edge pieces count.",
        "Multiply the two counts to get the number of tiles.",
        "Add baseTokens after multiplying tiles by tokensPerTile.",
      ],
      solution: `function imageTokens(width, height, tileSize, tokensPerTile, baseTokens) {
  const tiles = Math.ceil(width / tileSize) * Math.ceil(height / tileSize);
  return baseTokens + tiles * tokensPerTile;
}`,
      xp: 70,
    },
  ],
};
