"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, RotateCcw } from "lucide-react";

const WINDOW = 1000;
const RESERVED_OUTPUT = 150;
type Msg = { id: number; role: "system" | "user" | "assistant"; tokens: number };
type Strategy = "none" | "naive" | "pinned";

const SYSTEM: Msg = { id: 0, role: "system", tokens: 120 };

// Three clearly separated grays, since hue can't tell the roles apart.
const ROLE_STYLE: Record<Msg["role"], string> = {
  system: "bg-text",
  user: "bg-border-strong",
  assistant: "bg-text-dim",
};

export function ContextWindow() {
  const [msgs, setMsgs] = useState<Msg[]>([SYSTEM]);
  const [strategy, setStrategy] = useState<Strategy>("pinned");

  const { kept, dropped, used } = useMemo(() => {
    const budget = WINDOW - RESERVED_OUTPUT;
    const total = msgs.reduce((s, m) => s + m.tokens, 0);
    if (strategy === "none" || total <= budget) {
      return { kept: msgs, dropped: [] as Msg[], used: total };
    }
    const list = [...msgs];
    const drop: Msg[] = [];
    let sum = total;
    while (sum > budget && list.length) {
      const idx = strategy === "pinned" ? list.findIndex((m) => m.role !== "system") : 0;
      if (idx < 0) break;
      const [removed] = list.splice(idx, 1);
      drop.push(removed);
      sum -= removed.tokens;
    }
    return { kept: list, dropped: drop, used: sum };
  }, [msgs, strategy]);

  const overflow = strategy === "none" && used > WINDOW - RESERVED_OUTPUT;
  const systemLost = !kept.some((m) => m.role === "system");

  function addTurn() {
    setMsgs((m) => {
      const n = m.length;
      return [
        ...m,
        { id: n, role: "user", tokens: 60 + ((n * 37) % 70) },
        { id: n + 1, role: "assistant", tokens: 110 + ((n * 53) % 90) },
      ];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-muted">Strategy:</span>
        {(
          [
            ["none", "No trimming"],
            ["naive", "Drop oldest"],
            ["pinned", "Pin system, drop oldest turns"],
          ] as [Strategy, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStrategy(key)}
            className={`btn ${strategy === key ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 !text-xs`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-text-dim">
          <span>
            {used} / {WINDOW} tokens ({RESERVED_OUTPUT} reserved for output)
          </span>
          <span className={overflow ? "text-red" : ""}>{overflow ? "OVER BUDGET" : "ok"}</span>
        </div>
        <div className="flex h-9 overflow-hidden rounded-lg border border-border-base bg-bg">
          {kept.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              style={{ width: `${(m.tokens / WINDOW) * 100}%`, originX: 0 }}
              className={`${ROLE_STYLE[m.role]} border-r border-bg`}
              title={`${m.role}: ${m.tokens} tokens`}
            />
          ))}
          <div
            className="ml-auto flex items-center justify-center border-l border-dashed border-border-strong bg-bg-raised text-[10px] text-text-dim"
            style={{ width: `${(RESERVED_OUTPUT / WINDOW) * 100}%` }}
          >
            output
          </div>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-text-dim">
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-text" />system</span>
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-border-strong" />user</span>
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-text-dim" />assistant</span>
        </div>
      </div>

      {systemLost && (
        <p className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
          The system prompt was dropped — the assistant has forgotten its instructions. This is
          the classic truncation bug.
        </p>
      )}
      {dropped.length > 0 && !systemLost && (
        <p className="text-sm text-text-muted">
          Dropped {dropped.length} message{dropped.length > 1 ? "s" : ""} to fit.
        </p>
      )}

      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={addTurn}>
          <Plus className="size-4" /> Add a turn
        </button>
        <button className="btn btn-ghost" onClick={() => setMsgs([SYSTEM])}>
          <RotateCcw className="size-4" /> Reset
        </button>
      </div>
    </div>
  );
}
