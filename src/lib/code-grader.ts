import { newQuickJSWASMModule, shouldInterruptAfterDeadline, type QuickJSContext, type QuickJSHandle } from "quickjs-emscripten";

/**
 * Runs a learner's code against a challenge's tests inside QuickJS, a JavaScript engine compiled to WebAssembly.
 * The code gets no access to the machine: no `process`, no files, no network, no timers. It also has a memory
 * limit, a stack limit and a deadline, so an infinite loop or a memory bomb ends cleanly instead of taking the server down.
 * The pass rule is the same as the in-browser runner: the JSON of the result must equal the JSON of the expected value.
 */

export type GradedTest = { name: string; args: unknown[]; expected: unknown };

export type CodeGrade = {
  passed: number;
  total: number;
  /** Set when nothing could run: a syntax error, a missing function, a timeout. */
  fatal?: string;
  outcomes: { name: string; passed: boolean; error?: string }[];
};

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const MEMORY_LIMIT_BYTES = 32 * 1024 * 1024;
const STACK_LIMIT_BYTES = 512 * 1024;

function messageOf(ctx: QuickJSContext, error: QuickJSHandle): string {
  const dumped = ctx.dump(error) as { message?: string; name?: string } | string | undefined;
  if (typeof dumped === "string") return dumped;
  return String(dumped?.message ?? dumped?.name ?? "Script error");
}

/** Evaluates code and returns its string result, or the error message. Always disposes the handles. */
function evalString(ctx: QuickJSContext, code: string, filename: string): { value?: string; error?: string } {
  const result = ctx.evalCode(code, filename);
  if (result.error) {
    const message = messageOf(ctx, result.error);
    result.error.dispose();
    return { error: message };
  }
  const value = ctx.typeof(result.value) === "string" ? ctx.getString(result.value) : String(ctx.dump(result.value));
  result.value.dispose();
  return { value };
}

export async function gradeCodeInSandbox(
  code: string,
  functionName: string,
  tests: GradedTest[],
  options: { timeoutMs?: number } = {}
): Promise<CodeGrade> {
  const total = tests.length;
  const fail = (fatal: string): CodeGrade => ({ passed: 0, total, fatal, outcomes: tests.map((t) => ({ name: t.name, passed: false })) });
  if (!IDENTIFIER.test(functionName)) return fail("This challenge has an invalid function name.");

  // A fresh engine instance for every grading, never a shared one. After an out-of-memory error QuickJS aborts while
  // shutting down, and on a shared instance that would break every later submission. Here it can only end this one.
  const timeoutMs = options.timeoutMs ?? 3000;
  // Set when the engine hit a limit (memory, stack, time). It cannot always be shut down cleanly after that.
  let unclean = false;
  let QuickJS;
  try {
    QuickJS = await newQuickJSWASMModule();
  } catch {
    return fail("The code checker is not available right now. Please try again.");
  }
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
  runtime.setMaxStackSize(STACK_LIMIT_BYTES);
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeoutMs));
  const ctx = runtime.newContext();

  try {
    const loaded = evalString(ctx, code, "learner.js");
    if (loaded.error) {
      unclean = /memory|stack|interrupt/i.test(loaded.error);
      return fail(describe(loaded.error, timeoutMs));
    }

    const kind = evalString(ctx, `typeof ${functionName}`, "check.js");
    if (kind.error || kind.value !== "function") return fail(`No function named ${functionName} was defined.`);

    const outcomes: CodeGrade["outcomes"] = [];
    let passed = 0;
    for (const test of tests) {
      const argsJson = JSON.stringify(JSON.stringify(test.args));
      const script = `(function () {
        try {
          var r = ${functionName}.apply(null, JSON.parse(${argsJson}));
          var s = JSON.stringify(r);
          return JSON.stringify({ ok: true, undef: s === undefined, s: s === undefined ? "" : s });
        } catch (e) {
          return JSON.stringify({ ok: false, e: String((e && e.message) || e) });
        }
      })()`;
      const ran = evalString(ctx, script, "test.js");
      if (ran.error) {
        unclean = true;
        return { ...fail(describe(ran.error, timeoutMs)), outcomes: [...outcomes, ...tests.slice(outcomes.length).map((t) => ({ name: t.name, passed: false }))] };
      }

      const parsed = JSON.parse(ran.value ?? "{}") as { ok?: boolean; undef?: boolean; s?: string; e?: string };
      if (!parsed.ok && /memory|stack overflow/i.test(parsed.e ?? "")) unclean = true;
      if (!parsed.ok) {
        outcomes.push({ name: test.name, passed: false, error: parsed.e });
        continue;
      }
      const same = !parsed.undef && parsed.s === JSON.stringify(test.expected);
      if (same) passed++;
      outcomes.push({ name: test.name, passed: same });
    }
    return { passed, total, outcomes };
  } catch (err) {
    // Anything unexpected, including the engine aborting, counts as a failed attempt rather than an error for the learner.
    unclean = true;
    return fail(/memory/i.test(String(err)) ? "Ran out of memory." : /stack|abort/i.test(String(err)) ? "Your code used too much recursion or memory." : "Your code could not be run.");
  } finally {
    // After a memory or stack error the engine cannot be shut down cleanly. Its memory is released with the instance.
    if (!unclean) {
      try {
        ctx.dispose();
        runtime.dispose();
      } catch {
        /* the instance is discarded either way */
      }
    }
  }
}

function describe(message: string, timeoutMs: number): string {
  if (/interrupt/i.test(message)) return `Timed out after ${timeoutMs / 1000}s. Check for an infinite loop.`;
  if (/out of memory|string too long/i.test(message)) return "Ran out of memory.";
  if (/stack overflow/i.test(message)) return "Too much recursion. Check that your function stops.";
  return message;
}
