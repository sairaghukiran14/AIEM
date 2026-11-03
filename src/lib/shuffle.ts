/**
 * Deterministic shuffling, used so the correct answer is not always in the same slot.
 *
 * The permutation depends only on the seed (a challenge or question id), so it is
 * identical on the server and in the browser, and stable between page loads.
 */

function hashString(seed: string): number {
  // FNV-1a
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * For a set of questions, returns one permutation per question, chosen so the
 * correct answers are spread evenly across the display positions (A, B, C, ...)
 * rather than left to chance. `order[displayPosition] = originalIndex`.
 *
 * Both the page that serves a challenge and the route that grades it call this
 * with the same inputs, so they always agree. The browser only ever sees display
 * positions, never the original indices.
 */
export function balancedOrders(
  correct: number[],
  optionCounts: number[],
  seed: string
): number[][] {
  const k = Math.max(...optionCounts);
  const offset = seededOrder(k, `${seed}:offset`)[0];
  const base = correct.map((_, i) => (i + offset) % k);
  const targets = seededOrder(correct.length, `${seed}:targets`).map((i) => base[i]);

  return correct.map((answer, qi) => {
    const order = seededOrder(optionCounts[qi], `${seed}:${qi}`);
    const target = targets[qi] % optionCounts[qi];
    const at = order.indexOf(answer);
    [order[at], order[target]] = [order[target], order[at]];
    return order;
  });
}

/**
 * Returns a permutation of [0..length): `order[displayPosition] = originalIndex`.
 */
export function seededOrder(length: number, seed: string): number[] {
  const order = Array.from({ length }, (_, i) => i);
  const rand = mulberry32(hashString(seed));
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
