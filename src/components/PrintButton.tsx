"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="btn btn-ghost" onClick={() => window.print()}>
      <Printer className="size-4" /> Print / save as PDF
    </button>
  );
}
