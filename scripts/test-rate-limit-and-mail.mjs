// Tests for the pure parts of the rate limiter and the mailer. Run with: node scripts/test-rate-limit-and-mail.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const load = (p) => {
  const js = ts.transpileModule(readFileSync(join(root, p), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  vm.runInNewContext(js, { module: m, exports: m.exports, require: () => ({}), Math, JSON, Map, Set });
  return m.exports;
};
const rl = load("src/lib/rate-limit-core.ts");
const mail = load("src/lib/mailer-core.ts");
const { safeNext } = load("src/lib/safe-next.ts");
const ev = load("src/lib/email-verification-core.ts");

let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log((ok ? "ok   " : "FAIL ") + name + (ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`));
  if (!ok) failed++;
};

const W = 15 * 60 * 1000;
eq("a window starts on a multiple of its length", rl.windowStart(W * 5 + 123, W), W * 5);
eq("the first hit is allowed", rl.decide(1, 8, 1000, 0).allowed, true);
eq("the hit at the limit is allowed", rl.decide(8, 8, 1000, 0).allowed, true);
eq("the hit after the limit is refused", rl.decide(9, 8, 1000, 0).allowed, false);
eq("remaining counts down and stops at zero", [rl.decide(3, 8, 1000, 0).remaining, rl.decide(12, 8, 1000, 0).remaining], [5, 0]);
eq("retry-after rounds up to whole seconds", rl.decide(9, 8, 10_500, 0).retryAfterSec, 11);
eq("retry-after is at least one second", rl.decide(9, 8, 100, 0).retryAfterSec, 1);
eq("an allowed hit has no retry-after", rl.decide(2, 8, 5000, 0).retryAfterSec, 0);

const policy = { name: "login-email", limit: 8, windowSec: 900 };
eq("two hits in one window share a key", rl.counterKey(policy, "abc", W * 3 + 5) === rl.counterKey(policy, "abc", W * 3 + 800_000), true);
eq("the next window gets a new key", rl.counterKey(policy, "abc", W * 3 + 5) !== rl.counterKey(policy, "abc", W * 4 + 5), true);
eq("different identities do not share a key", rl.counterKey(policy, "a", 0) !== rl.counterKey(policy, "b", 0), true);
eq("different policies do not share a key", rl.counterKey(policy, "a", 0) !== rl.counterKey({ ...policy, name: "other" }, "a", 0), true);

const h = (o) => ({ get: (n) => o[n.toLowerCase()] ?? null });
eq("uses the first forwarded address", rl.clientIp(h({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })), "203.0.113.9");
eq("falls back to x-real-ip", rl.clientIp(h({ "x-real-ip": "198.51.100.7" })), "198.51.100.7");
eq("unknown when nothing is sent", rl.clientIp(h({})), "unknown");
eq("short waits are in seconds", rl.waitText(45), "45 seconds");
eq("long waits are in minutes", rl.waitText(600), "10 minutes");

const req = mail.buildResendRequest({ to: "a@example.com", subject: "Hi", text: "Body" }, "re_key", "AIEM <no-reply@example.com>");
eq("resend url", req.url, "https://api.resend.com/emails");
eq("resend auth header", req.init.headers.Authorization, "Bearer re_key");
eq("resend body", JSON.parse(req.init.body), { from: "AIEM <no-reply@example.com>", to: ["a@example.com"], subject: "Hi", text: "Body" });
const email = mail.resetEmail("Ada", "https://example.com/reset-password?token=abc");
eq("reset email carries the link and the name", email.text.includes("https://example.com/reset-password?token=abc") && email.text.includes("Hi Ada"), true);
eq("reset email says what to do if not requested", /ignore this email/.test(email.text), true);

eq("a normal path is kept", safeNext("/learn/llm-foundations/what-llms-do"), "/learn/llm-foundations/what-llms-do");
eq("a path with a query is kept", safeNext("/tracks?x=1"), "/tracks?x=1");
eq("nothing falls back", safeNext(undefined), "/dashboard");
eq("an empty string falls back", safeNext(""), "/dashboard");
eq("an absolute URL is refused", safeNext("https://evil.example"), "/dashboard");
eq("a protocol-relative URL is refused", safeNext("//evil.example"), "/dashboard");
eq("a backslash host is refused", safeNext("/\\evil.example"), "/dashboard");
eq("a backslash anywhere is refused", safeNext("/ok\\x"), "/dashboard");
eq("a javascript: URL is refused", safeNext("javascript:alert(1)"), "/dashboard");
eq("a relative path without a slash is refused", safeNext("dashboard"), "/dashboard");
eq("control characters are refused", safeNext("/a\u0009b") === "/dashboard" && safeNext("/a\nb") === "/dashboard", true);
eq("an absurdly long path is refused", safeNext("/" + "a".repeat(600)), "/dashboard");
eq("a custom fallback is used", safeNext("//x", "/tracks"), "/tracks");

eq("verification is off when email cannot be sent", ev.verificationRequired({}), false);
eq("verification turns on when email is configured", ev.verificationRequired({ RESEND_API_KEY: "re_x", MAIL_FROM: "a@b.c" }), true);
eq("a key without a sender is not enough", ev.verificationRequired({ RESEND_API_KEY: "re_x" }), false);
eq("=1 forces it on", ev.verificationRequired({ REQUIRE_EMAIL_VERIFICATION: "1" }), true);
eq("=0 forces it off even with email configured", ev.verificationRequired({ REQUIRE_EMAIL_VERIFICATION: "0", RESEND_API_KEY: "re_x", MAIL_FROM: "a@b.c" }), false);
eq("an unrelated value falls back to the mail check", ev.verificationRequired({ REQUIRE_EMAIL_VERIFICATION: "yes", RESEND_API_KEY: "re_x", MAIL_FROM: "a@b.c" }), true);
eq("not required: anyone may receive certificates", ev.canReceiveCertificates(false, null), true);
eq("required and unverified: held", ev.canReceiveCertificates(true, null), false);
eq("required and undefined: held", ev.canReceiveCertificates(true, undefined), false);
eq("required and verified: allowed", ev.canReceiveCertificates(true, new Date()), true);
eq("the link lasts a day", ev.VERIFICATION_TOKEN_LIFETIME_MS, 86400000);
const ve = mail.verifyEmail("Ada", "https://example.com/verify-email?token=abc");
eq("verification email has the link and the name", ve.text.includes("https://example.com/verify-email?token=abc") && ve.text.includes("Hi Ada"), true);
eq("verification email says what to do if not requested", /ignore this email/.test(ve.text), true);

if (failed) { console.log(failed + " failing"); process.exitCode = 1; } else console.log("all rate-limit and mail tests passed");
