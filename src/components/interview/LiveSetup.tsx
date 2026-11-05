"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic } from "lucide-react";

import { announceNavigation } from "@/components/NavigationFeedback";

type Option<T> = { value: T; label: string; hint?: string };

function Choice<T extends string | number>({ legend, options, value, onChange }: { legend: string; options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={String(o.value)} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${value === o.value ? "border-2 border-text bg-bg-raised font-medium" : "border-border-base hover:bg-bg-hover"}`}>
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
            {o.hint && <span className="ml-1.5 text-xs font-normal text-text-dim">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function LiveSetup({ tracks }: { tracks: { slug: string; order: number; title: string }[] }) {
  const router = useRouter();
  const [track, setTrack] = useState("mixed");
  const [questions, setQuestions] = useState<3 | 10 | 15 | 20>(10);
  const [level, setLevel] = useState<"junior" | "mid" | "senior">("mid");
  const [voice, setVoice] = useState<"simran" | "dev">("simran");
  const [language, setLanguage] = useState<"en" | "mix">("en");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/interview/live/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, questions, level, voice, codemix: language === "mix", consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not start the interview");
      const href = `/interview/live/${data.id}`;
      announceNavigation(href);
      router.push(href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the interview");
      setPending(false);
    }
  }

  return (
    <section className="card space-y-6 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Set up your interview</h2>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Topic</span>
        <select className="input" value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="mixed">Mixed: all tracks</option>
          {tracks.map((t) => (
            <option key={t.slug} value={t.slug}>{t.order}. {t.title}</option>
          ))}
        </select>
      </label>

      <Choice legend="Starting level" value={level} onChange={setLevel} options={[{ value: "junior", label: "Junior", hint: "starts easy" }, { value: "mid", label: "Mid-level", hint: "starts medium" }, { value: "senior", label: "Senior", hint: "starts hard" }]} />
      <p className="-mt-3 text-xs text-text-dim">Questions get harder after strong answers and easier after weak ones, so the interview finds your level.</p>
      <Choice legend="Length" value={questions} onChange={setQuestions} options={[{ value: 3, label: "Quick: 3 questions", hint: "about 10 min" }, { value: 10, label: "10 questions", hint: "2 rounds, about 30 min" }, { value: 15, label: "15 questions", hint: "3 rounds, about 40 min" }, { value: 20, label: "20 questions", hint: "3 rounds, about 50 min" }]} />
      <Choice legend="Interviewer" value={voice} onChange={setVoice} options={[{ value: "simran", label: "Simran" }, { value: "dev", label: "Dev" }]} />
      <Choice legend="You will answer in" value={language} onChange={setLanguage} options={[{ value: "en", label: "English" }, { value: "mix", label: "English mixed with an Indian language" }]} />

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-base p-3 text-sm">
        <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span className="text-text-muted">
          I agree that my voice is sent to Sarvam AI to be transcribed, and that the transcript is sent to Sarvam AI and Anthropic to run and mark the interview. AIEM does not save the audio. It keeps the transcript and scorecard for 180 days, and you can delete them at any time.
        </span>
      </label>

      {error && <p role="alert" className="text-sm font-medium">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={!consent || pending} onClick={start}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
          Start interview
        </button>
        <span className="text-xs text-text-dim">Each day: up to 3 quick interviews and 1 long one.</span>
      </div>
    </section>
  );
}
