import { encodeWav, splitSamples, trimSilence, WAV_RATE } from "@/lib/wav";

const QUIET_LEVEL = 0.015;
/** Long enough that someone pausing to think is not cut off. */
const END_AFTER_SILENCE_MS = 3500;
const MAX_ANSWER_MS = 3 * 60_000;

/** The microphone for one interview: records answers, watches the level, and notices when someone has finished. */
export class AnswerRecorder {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recorder: MediaRecorder | null = null;
  private parts: Blob[] = [];
  private frame = 0;
  private startedAt = 0;

  /** Must be called from a click, so browsers allow both the microphone and audio playback. */
  async open(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.context.createMediaStreamSource(this.stream).connect(this.analyser);
  }

  start(callbacks: { onLevel: (level: number) => void; onFinished: () => void }) {
    if (!this.stream || !this.analyser) throw new Error("The microphone is not open");
    void this.context?.resume();
    this.parts = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.parts.push(event.data);
    };
    this.recorder.start();
    this.startedAt = performance.now();

    const buffer = new Float32Array(this.analyser.fftSize);
    let heardSpeech = false;
    let lastLoud = this.startedAt;
    const watch = () => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(buffer);
      const level = Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length);
      callbacks.onLevel(level);
      const now = performance.now();
      if (level > QUIET_LEVEL) {
        heardSpeech = true;
        lastLoud = now;
      }
      // No countdown begins until they have spoken, so they can take as long as they need to think.
      if ((heardSpeech && now - lastLoud > END_AFTER_SILENCE_MS) || now - this.startedAt > MAX_ANSWER_MS) {
        callbacks.onFinished();
        return;
      }
      this.frame = requestAnimationFrame(watch);
    };
    this.frame = requestAnimationFrame(watch);
  }

  /** Stops recording and returns the audio as WAV chunks that speech-to-text accepts. */
  async stop(): Promise<{ chunks: ArrayBuffer[]; seconds: number }> {
    cancelAnimationFrame(this.frame);
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return { chunks: [], seconds: 0 };
    const seconds = (performance.now() - this.startedAt) / 1000;
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await stopped;
    const blob = new Blob(this.parts, { type: recorder.mimeType });
    if (blob.size === 0 || !this.context) return { chunks: [], seconds };

    const decoded = await this.context.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * WAV_RATE), WAV_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return { chunks: splitSamples(trimSilence(rendered.getChannelData(0))).map((part) => encodeWav(part)), seconds };
  }

  /** Throws away the current recording. */
  cancel() {
    cancelAnimationFrame(this.frame);
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.ondataavailable = null;
      this.recorder.stop();
    }
  }

  close() {
    this.cancel();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close();
    this.stream = null;
    this.context = null;
    this.analyser = null;
  }
}
