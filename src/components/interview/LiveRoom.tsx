"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Captions, Keyboard, Loader2, Mic, PhoneOff, RotateCcw, SkipForward, Square, User } from "lucide-react";

import { AnswerRecorder } from "./answer-recorder";

type Phase = "lobby" | "break" | "speaking" | "listening" | "processing" | "typing" | "sending" | "finishing" | "scoreFailed" | "failed";
type Progress = { phase: string; index: number; total: number; round: number; rounds: number };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function progressLabel(p: Progress): string {
  if (p.phase === "warmup") return "Introduction";
  if (p.phase === "technical") return `${p.rounds > 1 ? `Round ${p.round} of ${p.rounds} · ` : ""}Question ${p.index + 1} of ${p.total}`;
  return "Wrapping up";
}

async function errorOf(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data.error ?? fallback;
}

export function LiveRoom(props: {
  id: string;
  interviewerName: string;
  firstLine: string;
  turnCount: number;
  initialProgress: Progress;
  /** The interview is over and only the scorecard is missing. */
  ended: boolean;
}) {
  const router = useRouter();
  const recorder = useRef<AnswerRecorder | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const meter = useRef<HTMLDivElement | null>(null);
  const endAfterSpeech = useRef(props.ended);

  const [phase, setPhase] = useState<Phase>(props.ended ? "finishing" : "lobby");
  const [line, setLine] = useState(props.firstLine);
  const [turnCount, setTurnCount] = useState(props.turnCount);
  const [progress, setProgress] = useState(props.initialProgress);
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const [micOff, setMicOff] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [confirmingEnd, setConfirmingEnd] = useState(false);

  useEffect(() => () => recorder.current?.close(), []);

  const running = phase !== "lobby" && phase !== "finishing" && phase !== "scoreFailed" && phase !== "break";
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);

  async function sendAnswer(answer: string, seconds: number | null) {
    const res = await fetch(`/api/interview/live/${props.id}/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer, turnCount, seconds }),
    });
    if (!res.ok) throw new Error(await errorOf(res, "The interviewer could not respond."));
    const data = (await res.json()) as { line: string; turnCount: number; ended: boolean; roundBreak: boolean; progress: Progress };
    endAfterSpeech.current = data.ended;
    setHeard(answer);
    setLine(data.line);
    setTurnCount(data.turnCount);
    setProgress(data.progress);
    // A new round starts with a pause, so they can take a breath before the next question is asked.
    setPhase(data.roundBreak ? "break" : "speaking");
  }

  // The interviewer speaks. Audio comes from the server by turn number; if it fails, the words stay on screen.
  useEffect(() => {
    if (phase !== "speaking" || !audio.current) return;
    audio.current.src = `/api/interview/live/${props.id}/speech?turn=${turnCount - 1}`;
    audio.current.play().catch(() => {
      setCaptions(true);
      setNote("The voice could not play, so read the question on screen.");
      setPhase(endAfterSpeech.current ? "finishing" : micOff ? "typing" : "listening");
    });
  }, [phase, turnCount, props.id, micOff]);

  // The microphone listens until they stop talking or press the button.
  useEffect(() => {
    if (phase !== "listening" || !recorder.current) return;
    recorder.current.start({
      onLevel: (level) => {
        if (meter.current) meter.current.style.width = `${Math.min(100, level * 600)}%`;
      },
      onFinished: () => setPhase("processing"),
    });
  }, [phase]);

  // Answer to text to the interviewer's next line.
  useEffect(() => {
    if (phase !== "processing" || !recorder.current) return;
    let live = true;
    (async () => {
      try {
        const { chunks, seconds } = await recorder.current!.stop();
        const parts: string[] = [];
        for (const chunk of chunks) {
          const res = await fetch(`/api/interview/live/${props.id}/transcribe`, { method: "POST", headers: { "Content-Type": "audio/wav" }, body: chunk });
          if (!res.ok) throw new Error(await errorOf(res, "We could not hear that."));
          parts.push(((await res.json()) as { text: string }).text);
        }
        const answer = parts.join(" ").trim();
        if (!live) return;
        if (!answer) {
          setNote("I didn't catch that. Please answer again.");
          setPhase("listening");
          return;
        }
        await sendAnswer(answer, Math.round(seconds));
      } catch (err) {
        if (!live) return;
        setNote(err instanceof Error ? err.message : "Something went wrong.");
        setPhase("failed");
      }
    })();
    return () => {
      live = false;
    };
    // sendAnswer reads the current turn count, and this must run once per answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The scorecard. Once it exists, the server page shows it in place of this room.
  useEffect(() => {
    if (phase !== "finishing") return;
    recorder.current?.close();
    let live = true;
    (async () => {
      // Another tab may already be scoring this interview, so keep checking until it is finished.
      while (live) {
        const res = await fetch(`/api/interview/live/${props.id}/finish`, { method: "POST" });
        if (!live) return;
        if (!res.ok) {
          setNote(await errorOf(res, "Your scorecard could not be written."));
          setPhase("scoreFailed");
          return;
        }
        const data = (await res.json()) as { status: string };
        if (data.status === "done") {
          router.refresh();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    })().catch(() => {
      if (live) {
        setNote("Your scorecard could not be written. Check your connection and try again.");
        setPhase("scoreFailed");
      }
    });
    return () => {
      live = false;
    };
  }, [phase, props.id, router]);

  async function join() {
    setNote("");
    try {
      const mic = new AnswerRecorder();
      await mic.open();
      recorder.current = mic;
    } catch {
      setMicOff(true);
      setCaptions(true);
      setNote("The microphone is not available, so you can type your answers. To speak, allow microphone access and reload.");
    }
    setPhase("speaking");
  }

  function afterSpeech() {
    if (endAfterSpeech.current) setPhase("finishing");
    else setPhase(micOff ? "typing" : "listening");
  }

  function skipSpeech() {
    audio.current?.pause();
    afterSpeech();
  }

  function replay() {
    recorder.current?.cancel();
    setNote("");
    setPhase("speaking");
  }

  function submitTyped() {
    const answer = typed.trim();
    if (!answer) return;
    setPhase("sending");
    setNote("");
    sendAnswer(answer, null)
      .then(() => setTyped(""))
      .catch((err: Error) => {
        setNote(err.message);
        setPhase("typing");
      });
  }

  function endNow() {
    recorder.current?.cancel();
    audio.current?.pause();
    setPhase("finishing");
  }

  if (phase === "lobby") {
    return (
      <div className="card mx-auto max-w-lg space-y-4 p-6 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-bg-raised">
          <User className="size-8 text-text-muted" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-semibold">{props.interviewerName} is ready for you</h2>
        <p className="text-sm text-text-muted">
          Find a quiet place and use headphones if you can. You&apos;ll be asked to allow your microphone. After each question it stays on, so take time to think and answer out loud. It stops by itself a few seconds after you finish.
        </p>
        {note && <p role="alert" className="text-sm">{note}</p>}
        <button className="btn btn-primary" onClick={join}>
          <Mic className="size-4" /> Join interview
        </button>
      </div>
    );
  }

  if (phase === "break") {
    return (
      <div className="card mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">Break</p>
        <h2 className="text-xl font-semibold">Round {progress.round - 1} of {progress.rounds} is done</h2>
        <p className="text-sm text-text-muted">Take a breath and have some water. Round {progress.round} starts when you&apos;re ready.</p>
        <button className="btn btn-primary" onClick={() => setPhase("speaking")}>
          <Mic className="size-4" /> Start round {progress.round}
        </button>
      </div>
    );
  }

  if (phase === "scoreFailed") {
    return (
      <div className="card mx-auto max-w-lg space-y-4 p-6 text-center">
        <p role="alert" className="font-medium">{note}</p>
        <button className="btn btn-primary" onClick={() => { setNote(""); setPhase("finishing"); }}>
          <RotateCcw className="size-4" /> Try the scorecard again
        </button>
      </div>
    );
  }

  if (phase === "finishing") {
    return (
      <div className="card mx-auto max-w-lg space-y-3 p-8 text-center" role="status">
        <Loader2 className="mx-auto size-8 animate-spin text-text-muted" aria-hidden="true" />
        <p className="text-lg font-semibold">Writing your scorecard</p>
        <p className="text-sm text-text-muted">The interview is over. Your answers are being marked against the reference answers, which can take up to a minute.</p>
      </div>
    );
  }

  const speaking = phase === "speaking";
  const listening = phase === "listening";
  const thinking = phase === "processing" || phase === "sending";
  const status = speaking ? `${props.interviewerName} is speaking` : listening ? "Your turn: listening" : thinking ? `${props.interviewerName} is thinking` : phase === "typing" ? "Your turn: type your answer" : "Something went wrong";

  return (
    <div className="space-y-4">
      <audio
        ref={audio}
        onEnded={afterSpeech}
        onError={() => {
          if (phase !== "speaking") return;
          setCaptions(true);
          setNote("The voice could not play, so read the question on screen.");
          afterSpeech();
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-muted">
        <span className="font-medium text-text">{progressLabel(progress)}</span>
        <span className="font-mono" aria-label="time elapsed">{clock(elapsed)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className={`card flex min-h-52 flex-col items-center justify-center gap-3 p-6 ${speaking ? "!border-2 !border-text" : ""}`} aria-label="Interviewer">
          <span className={`flex size-20 items-center justify-center rounded-full bg-bg-raised ${speaking ? "animate-pulse" : ""}`}>
            <User className="size-10 text-text-muted" aria-hidden="true" />
          </span>
          <p className="font-medium">{props.interviewerName}</p>
          <p className="text-xs text-text-dim">{speaking ? "Speaking" : thinking ? "Thinking" : "Listening"}</p>
        </section>
        <section className={`card flex min-h-52 flex-col items-center justify-center gap-3 p-6 ${listening ? "!border-2 !border-text" : ""}`} aria-label="You">
          <span className="flex size-20 items-center justify-center rounded-full bg-bg-raised">
            <Mic className="size-9 text-text-muted" aria-hidden="true" />
          </span>
          <p className="font-medium">You</p>
          <div className="h-2 w-40 overflow-hidden rounded-full border border-border-base bg-bg" aria-hidden="true">
            <div ref={meter} className="h-full bg-text" style={{ width: 0 }} />
          </div>
        </section>
      </div>

      <p className="flex items-center gap-2 text-sm font-medium" role="status">
        {thinking && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {status}
      </p>

      {captions && (
        <div className="card space-y-2 p-4 text-sm leading-relaxed">
          <p><span className="font-semibold">{props.interviewerName}: </span>{line}</p>
          {heard && <p className="text-text-muted"><span className="font-semibold">Heard from you: </span>{heard}</p>}
        </div>
      )}

      {note && <p role="alert" className="rounded-lg border border-dashed border-text-dim px-3 py-2 text-sm">{note}</p>}

      {phase === "typing" && (
        <div className="space-y-2">
          <textarea value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Your answer" className="input min-h-32 resize-y text-sm" placeholder="Type what you would say out loud." />
          <button className="btn btn-primary" onClick={submitTyped} disabled={!typed.trim()}>Send answer</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {listening && (
          <button className="btn btn-primary" onClick={() => setPhase("processing")}>
            <Square className="size-4" /> Done answering
          </button>
        )}
        {speaking && (
          <button className="btn btn-ghost" onClick={skipSpeech}>
            <SkipForward className="size-4" /> Skip to answering
          </button>
        )}
        {listening && (
          <button className="btn btn-ghost" onClick={replay}>
            <RotateCcw className="size-4" /> Hear it again
          </button>
        )}
        {listening && (
          <button className="btn btn-ghost" onClick={() => { recorder.current?.cancel(); setPhase("typing"); }}>
            <Keyboard className="size-4" /> Type instead
          </button>
        )}
        {phase === "failed" && (
          <button className="btn btn-primary" onClick={() => { setNote(""); setPhase(micOff ? "typing" : "listening"); }}>
            <RotateCcw className="size-4" /> Answer again
          </button>
        )}
        <button className="btn btn-ghost" aria-pressed={captions} onClick={() => setCaptions(!captions)}>
          <Captions className="size-4" /> Captions {captions ? "on" : "off"}
        </button>
        {confirmingEnd ? (
          <>
            <span className="text-sm">End and get your scorecard?</span>
            <button className="btn btn-primary" onClick={endNow}>Yes, end</button>
            <button className="btn btn-ghost" onClick={() => setConfirmingEnd(false)}>Keep going</button>
          </>
        ) : (
          <button className="btn btn-ghost ml-auto" onClick={() => setConfirmingEnd(true)}>
            <PhoneOff className="size-4" /> End interview
          </button>
        )}
      </div>

    </div>
  );
}
