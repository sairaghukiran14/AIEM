/** Sarvam's speech-to-text takes at most 30 seconds per request, and WAV but not WebM. Browsers record WebM or MP4, so answers are converted and split here. */
export const WAV_RATE = 16_000;
const MAX_CHUNK_SECONDS = 28;

/**
 * Removes silence before, after and inside an answer: speech recognition is billed per minute of audio, and thinking
 * pauses are not words. Pauses longer than 0.7 s are shortened to 0.35 s, so sentences stay separate.
 */
export function trimSilence(samples: Float32Array, rate = WAV_RATE, threshold = 0.012): Float32Array {
  const frame = Math.floor(rate / 50);
  const frames = Math.ceil(samples.length / frame);
  const loud: boolean[] = [];
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const end = Math.min(samples.length, (f + 1) * frame);
    for (let i = f * frame; i < end; i++) sum += samples[i] * samples[i];
    loud.push(Math.sqrt(sum / Math.max(1, end - f * frame)) > threshold);
  }
  // Keep 0.2 s around speech, so word edges are not clipped.
  const pad = 10;
  const keep = loud.map((_, f) => loud.slice(Math.max(0, f - pad), f + pad + 1).some(Boolean));
  const out: number[] = [];
  let quietRun = 0;
  const maxQuiet = Math.floor(0.35 * 50);
  const longPause = Math.floor(0.7 * 50);
  for (let f = 0; f < frames; f++) {
    if (!keep[f]) {
      quietRun++;
      continue;
    }
    if (quietRun > 0 && out.length > 0) {
      const kept = quietRun > longPause ? maxQuiet : quietRun;
      for (let i = 0; i < kept * frame; i++) out.push(0);
    }
    quietRun = 0;
    const end = Math.min(samples.length, (f + 1) * frame);
    for (let i = f * frame; i < end; i++) out.push(samples[i]);
  }
  return Float32Array.from(out);
}

/** Splits on the quietest moment in the last 8 seconds of each chunk, so words are not cut in half. */
export function splitSamples(samples: Float32Array, rate = WAV_RATE, maxSeconds = MAX_CHUNK_SECONDS): Float32Array[] {
  const max = Math.floor(maxSeconds * rate);
  const step = Math.floor(rate / 10);
  const chunks: Float32Array[] = [];
  let start = 0;
  while (samples.length - start > max) {
    let bestAt = start + max;
    let quietest = Infinity;
    for (let at = start + max - 8 * rate; at + step <= start + max; at += step) {
      if (at <= start) continue;
      let energy = 0;
      for (let i = at; i < at + step; i++) energy += samples[i] * samples[i];
      if (energy < quietest) {
        quietest = energy;
        bestAt = at + Math.floor(step / 2);
      }
    }
    chunks.push(samples.subarray(start, bestAt));
    start = bestAt;
  }
  if (start < samples.length) chunks.push(samples.subarray(start));
  return chunks;
}

/** 16-bit mono PCM in a WAV container. */
export function encodeWav(samples: Float32Array, rate = WAV_RATE): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => {
    const s = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  });
  return buffer;
}
