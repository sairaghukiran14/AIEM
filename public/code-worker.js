// Runs a learner's code against a challenge's tests, away from the page.
// It is served with its own Content-Security-Policy (see next.config.ts): eval is allowed here and only here, and the
// worker cannot make a network request. The page's own policy forbids eval entirely.
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

self.onmessage = (e) => {
  const { code, functionName, tests } = e.data;
  let fn;
  try {
    fn = new Function(code + "\n;return typeof " + functionName + " === 'function' ? " + functionName + " : undefined;")();
  } catch (err) {
    self.postMessage({ fatal: String((err && err.message) || err) });
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
      return { name: t.name, passed: false, expected: t.expected, error: String((err && err.message) || err) };
    }
  });
  self.postMessage({ outcomes });
};
