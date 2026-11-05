// A local stand-in for Sarvam and Anthropic, so the voice interview can be tested with no keys and no cost.
// Run the app with SARVAM_API_KEY=x ANTHROPIC_API_KEY=x SARVAM_BASE_URL=http://127.0.0.1:4010 ANTHROPIC_BASE_URL=http://127.0.0.1:4010
import { createServer } from "node:http";

const port = Number(process.env.MOCK_PORT ?? 4010);
const fail = new Set();
const seen = [];

const read = (req) => new Promise((resolve) => { const parts = []; req.on("data", (d) => parts.push(d)); req.on("end", () => resolve(Buffer.concat(parts))); });
const json = (res, body, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };

// Half a second of silence, so a browser really plays something and reaches the end of it.
const SILENCE = (() => {
  const samples = 8000;
  const b = Buffer.alloc(44 + samples * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + samples * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(samples * 2, 40);
  return b;
})();

const REPORT = {
  summary: "You explained the core idea but stayed vague on trade-offs.",
  dimensions: [
    { name: "Technical accuracy", score: 4, evidence: "You described the mechanism correctly." },
    { name: "Communication", score: 9, evidence: "You answered directly." },
  ],
  questions: [
    { questionIndex: 0, score: 9, wentWell: "Named the main idea.", missed: "Did not discuss cost.", quote: "my mock answer" },
    { questionIndex: 1, score: 4, wentWell: "Clear.", missed: "Little.", quote: "" },
    { questionIndex: 99, score: 3, wentWell: "x", missed: "x", quote: "" },
  ],
  nextSteps: ["Revise the lesson", "Practise out loud"],
};

createServer(async (req, res) => {
  const body = await read(req);
  const path = new URL(req.url, "http://x").pathname;
  if (path === "/__fail") { const what = new URL(req.url, "http://x").searchParams.get("what"); fail.clear(); if (what) fail.add(what); return json(res, { ok: true }); }
  if (path === "/__seen") return json(res, seen);

  seen.push({ path, key: req.headers["api-subscription-key"] ?? req.headers["x-api-key"] ?? req.headers.authorization ?? null, beta: req.headers["anthropic-beta"] ?? null, body: path === "/speech-to-text" ? null : body.toString().slice(0, 20000) });
  if (fail.has(path)) return json(res, { message: "mock failure" }, 500);

  if (path === "/speech-to-text") return json(res, { request_id: "m", transcript: "my mock answer about retrieval and cost", language_code: "en-IN" });
  if (path === "/v1/chat/completions") return json(res, { choices: [{ message: { content: "<think>plan</think> Okay. **Tell me** more about that?" } }] });
  if (path === "/v2/systemone") {
    const state = JSON.parse(body.toString()).state;
    const choice = /stop the interview/.test(state.candidate_answer) ? "end" : state.follow_ups_asked === 0 ? "follow_up" : "move_on";
    const quality = state.candidate_answer.split(/\s+/).length >= 25 ? 2.6 : 0.5;
    return json(res, { model: "sarvam-prism", answers: { next: { type: "choice", choice, confidence: 0.9, probabilities: { [choice]: 0.9 } }, quality: { type: "score", score: quality, confidence: 0.8 } } });
  }
  if (path === "/text-to-speech/stream") { res.writeHead(200, { "Content-Type": "audio/mpeg" }); return res.end(SILENCE); }
  if (path === "/v1/messages") {
    const request = JSON.parse(body.toString());
    // One entry per question in the plan, plus the fixed examples, which test range checks.
    const asked = (request.messages[0].content.match(/Question \d+ \(/g) ?? []).length;
    const report = { ...REPORT, questions: [...REPORT.questions, ...Array.from({ length: asked }, (_, i) => ({ questionIndex: i, score: 4, wentWell: "ok", missed: "ok", quote: "" })).slice(2)] };
    return json(res, { id: "msg_mock", type: "message", role: "assistant", model: request.model, content: [{ type: "text", text: JSON.stringify(report) }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } });
  }
  json(res, { message: "unknown " + path }, 404);
}).listen(port, "127.0.0.1", () => console.log("mock voice APIs on", port));
