// Tests certificate issuing against an in-memory store: idempotency, course certificate, races, ID collisions.
// Run with: node scripts/test-certificates.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const assert = (cond, msg) => { if (!cond) { console.log("FAIL:", msg); process.exitCode = 1; } else console.log("ok  ", msg); };

// ---- in-memory stand-in for the Mongoose Certificate model -------------------------------------
const store = []; let failNextCreate = null;     // null | "duplicate-no-doc" | "race" | "other"
const dupErr = () => Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
const Certificate = {
  findOne(filter) {
    const hit = store.find((d) => Object.entries(filter).every(([k, v]) => String(d[k]) === String(v)));
    return { lean: async () => (hit ? { ...hit } : null) };
  },
  find(filter) {
    const rows = store.filter((d) => Object.entries(filter).every(([k, v]) => String(d[k]) === String(v)));
    return { sort: () => ({ lean: async () => rows.map((d) => ({ ...d })).sort((a, b) => a.issuedAt - b.issuedAt) }) };
  },
  async create(doc) {
    if (failNextCreate === "other") { failNextCreate = null; throw new Error("network down"); }
    if (failNextCreate === "duplicate-no-doc") { failNextCreate = null; throw dupErr(); }   // certId collision
    if (failNextCreate === "race") {                      // someone else inserted this person's cert just before us
      failNextCreate = null;
      store.push({ userId: doc.userId, kind: doc.kind, trackSlug: doc.trackSlug, certId: "AIEM-RACE-WINN-ERRR", holderName: "Winner", title: doc.title, finalScore: 1, issuedAt: new Date() });
      throw dupErr();
    }
    if (store.some((d) => d.certId === doc.certId)) throw dupErr();
    if (store.some((d) => d.userId === doc.userId && d.kind === doc.kind && d.trackSlug === doc.trackSlug)) throw dupErr();
    store.push({ ...doc }); return { ...doc };
  },
};

// ---- fake content + progress ---------------------------------------------------------------------
const tracks = ["a", "b", "c"].map((s, i) => ({ slug: s, order: i + 1, title: "Track " + s.toUpperCase(), gate: { id: s + "-gate" } }));
let progress = { passed: new Set(), best: new Map() };

const core = (() => { const m = { exports: {} }; new Function("module", "exports", ts.transpileModule(readFileSync(join(root, "src/lib/certificate-core.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m, m.exports); return m.exports; })();

const mods = {
  "server-only": {}, "node:crypto": { randomBytes },
  "@/content": { tracks }, "@/lib/certificate-core": core,
  "@/lib/db": { connectDB: async () => {} },
  "@/lib/progress": { getUserProgress: async () => progress },
  "@/models/Certificate": { Certificate },
};
const src = ts.transpileModule(readFileSync(join(root, "src/lib/certificates.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} }; new Function("module", "exports", "require", src)(m, m.exports, (id) => { if (!(id in mods)) throw new Error("unmocked " + id); return mods[id]; });
const { reconcileCertificates, listCertificates, getCertificate } = m.exports;

// ---- pure core -----------------------------------------------------------------------------------
const ids = new Set(); for (let i = 0; i < 2000; i++) ids.add(core.certIdFromBytes(randomBytes(12)));
assert(ids.size === 2000, "2000 random ids are all distinct");
assert([...ids].every(core.isValidCertId), "every generated id matches the public pattern");
assert(!core.isValidCertId("AIEM-0000-1111-IIII") && !core.isValidCertId("aiem-7k3q-zb2m-x9hd") && !core.isValidCertId("AIEM-7K3Q-ZB2M"), "look-alike characters, lower case and short ids are rejected");
assert(core.courseScorePercent([0.9, 0.8, 1]) === 90 && core.courseScorePercent([]) === 0, "course score is the rounded mean, 0 when empty");
assert(core.allGatesPassed(["x", "y"], new Set(["x", "y"])) && !core.allGatesPassed(["x", "y"], new Set(["x"])) && !core.allGatesPassed([], new Set()), "course eligibility needs every gate, and at least one gate");
const counts = new Array(32).fill(0); for (let b = 0; b < 256; b++) counts[b % 32]++;
assert(counts.every((c) => c === 8), "byte-to-symbol mapping is exactly uniform (no modulo bias)");

// ---- issuing -------------------------------------------------------------------------------------
const U = "user-1";
let r = await reconcileCertificates(U, "Ada");
assert(r.length === 0 && store.length === 0, "nothing passed -> nothing issued");

progress = { passed: new Set(["a-gate"]), best: new Map([["a-gate", 0.9]]) };
r = await reconcileCertificates(U, "Ada");
assert(r.length === 1 && r[0].created && r[0].kind === "track", "one passed gate -> one new track certificate");
assert(store[0].finalScore === 90 && store[0].holderName === "Ada" && store[0].title === "Track A", "score 90, holder and title are stored");
const firstId = r[0].certId;

r = await reconcileCertificates(U, "Ada Renamed");
assert(r.length === 1 && !r[0].created && r[0].certId === firstId && store.length === 1, "calling again is idempotent: same certificate, nothing new");
assert(store[0].holderName === "Ada", "the name on an issued certificate does not change later");

progress = { passed: new Set(["a-gate", "b-gate", "c-gate"]), best: new Map([["a-gate", 0.9], ["b-gate", 0.8], ["c-gate", 1]]) };
r = await reconcileCertificates(U, "Ada");
const course = store.find((d) => d.kind === "course");
assert(store.length === 4 && r.filter((c) => c.created).length === 3, "all gates passed -> 2 more track certificates plus the course certificate");
assert(course && course.finalScore === 90 && course.trackSlug === "" && course.title.includes("Complete Course"), "course certificate score is the mean (90) and it has no track");

assert((await listCertificates(U)).length === 4 && (await getCertificate(firstId)).holderName === "Ada", "list and lookup return what was issued");

// ---- failure and race handling -------------------------------------------------------------------
store.length = 0; progress = { passed: new Set(["a-gate"]), best: new Map([["a-gate", 0.7]]) };
failNextCreate = "race";
r = await reconcileCertificates("user-2", "Bob");
assert(r.length === 1 && !r[0].created && r[0].certId === "AIEM-RACE-WINN-ERRR" && store.length === 1, "a race is resolved by returning the winner's certificate, no duplicate");

store.length = 0; failNextCreate = "duplicate-no-doc";
r = await reconcileCertificates("user-3", "Cy");
assert(r.length === 1 && r[0].created && store.length === 1, "a certId collision retries with a new id and still succeeds");

store.length = 0; failNextCreate = "other";
let threw = false; try { await reconcileCertificates("user-4", "Di"); } catch (e) { threw = /network down/.test(e.message); }
assert(threw && store.length === 0, "an unrelated error propagates (the route catches it and the page retries later)");

// two users never share certificates
store.length = 0;
await reconcileCertificates("u1", "One"); await reconcileCertificates("u2", "Two");
assert(store.length === 2 && new Set(store.map((d) => d.certId)).size === 2 && (await listCertificates("u1")).length === 1, "each user gets their own certificate");
