"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

// Alternating grays so neighbouring tokens stay visually separate without hue.
const COLORS = [
  "bg-border-base text-text",
  "bg-border-strong text-text",
  "bg-bg-hover text-text",
  "bg-text-dim/30 text-text",
];

/**
 * Illustrative tokenizer: splits on words/punctuation, then breaks long words
 * into short pieces to mimic sub-word merges. It is NOT a real model vocabulary.
 */
function tokenize(text: string): string[] {
  const pieces = text.match(/\s?[A-Za-z]+|\s?\d+|\s+|[^\sA-Za-z\d]/g) ?? [];
  const out: string[] = [];
  for (const piece of pieces) {
    const lead = piece.match(/^\s/) ? piece[0] : "";
    const word = lead ? piece.slice(1) : piece;
    const isWord = /^[A-Za-z]+$/.test(word);
    if (isWord && word.length > 6) {
      const size = word === word.toUpperCase() ? 2 : 4;
      for (let i = 0; i < word.length; i += size) {
        out.push((i === 0 ? lead : "") + word.slice(i, i + size));
      }
    } else {
      out.push(piece);
    }
  }
  return out;
}

function fakeId(token: string) {
  let h = 7;
  for (const ch of token) h = (h * 31 + ch.charCodeAt(0)) % 50000;
  return h + 100;
}

export function Tokenizer() {
  const [text, setText] = useState("Tokenization of antidisestablishmentarianism costs more!");
  const tokens = useMemo(() => tokenize(text), [text]);

  return (
    <div className="space-y-4">
      <textarea
        className="input min-h-20 resize-y font-mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Text to tokenize"
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-border-base bg-bg p-3 font-mono text-sm leading-8">
        {tokens.map((t, i) => (
          <motion.span
            key={`${i}-${t}`}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`group relative rounded px-1 ${COLORS[i % COLORS.length]}`}
            title={`id ${fakeId(t)}`}
          >
            {t.replace(/ /g, "·") || "·"}
          </motion.span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          ["Characters", text.length],
          ["Tokens", tokens.length],
          ["Chars / token", tokens.length ? (text.length / tokens.length).toFixed(1) : "0"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border-base bg-bg p-3">
            <div className="text-xl font-semibold text-accent-soft">{value}</div>
            <div className="text-xs text-text-dim">{label}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-dim">
        Illustrative splitter, not a real model&apos;s vocabulary. <code>·</code> marks a leading
        space, which real tokenizers also attach to the following word. Try UPPERCASE, numbers,
        or non-English text.
      </p>
    </div>
  );
}
