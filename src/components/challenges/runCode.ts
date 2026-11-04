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
  // The worker is a file from this site, served with its own policy, so the page itself never needs to allow eval.
  const worker = new Worker("/code-worker.js");

  return new Promise((resolve) => {
    const finish = (value: { outcomes: TestOutcome[]; fatal?: string }) => {
      clearTimeout(timer);
      worker.terminate();
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
