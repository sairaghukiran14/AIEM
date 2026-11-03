export type TestOutcome = {
  name: string;
  passed: boolean;
  got?: unknown;
  expected: unknown;
  error?: string;
};

type TestCase = { name: string; args: unknown[]; expected: unknown };

/**
 * Runs learner code inside a Web Worker so an infinite loop or a thrown error
 * cannot freeze or break the page. The worker is killed after `timeoutMs`.
 *
 * The worker has no access to the page's DOM, cookies or storage.
 */
export function runTests(
  code: string,
  functionName: string,
  tests: TestCase[],
  timeoutMs = 2500
): Promise<{ outcomes: TestOutcome[]; fatal?: string }> {
  const workerSource = `
    const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    self.onmessage = (e) => {
      const { code, functionName, tests } = e.data;
      let fn;
      try {
        fn = new Function(code + "\\n;return typeof " + functionName + " === 'function' ? " + functionName + " : undefined;")();
      } catch (err) {
        self.postMessage({ fatal: String(err && err.message || err) });
        return;
      }
      if (!fn) {
        self.postMessage({ fatal: "No function named " + functionName + " was defined." });
        return;
      }
      const outcomes = tests.map((t) => {
        try {
          const got = fn(...JSON.parse(JSON.stringify(t.args)));
          return { name: t.name, passed: deepEqual(got, t.expected), got: got === undefined ? "undefined" : got, expected: t.expected };
        } catch (err) {
          return { name: t.name, passed: false, expected: t.expected, error: String(err && err.message || err) };
        }
      });
      self.postMessage({ outcomes });
    };
  `;

  const blob = new Blob([workerSource], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  return new Promise((resolve) => {
    const finish = (value: { outcomes: TestOutcome[]; fatal?: string }) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(value);
    };

    const timer = setTimeout(
      () =>
        finish({
          outcomes: [],
          fatal: `Timed out after ${timeoutMs}ms — check for an infinite loop.`,
        }),
      timeoutMs
    );

    worker.onmessage = (e) => finish({ outcomes: e.data.outcomes ?? [], fatal: e.data.fatal });
    worker.onerror = (e) => finish({ outcomes: [], fatal: e.message || "Script error" });

    worker.postMessage({ code, functionName, tests });
  });
}
