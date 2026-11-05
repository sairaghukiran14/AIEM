"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteInterview({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const res = await fetch(`/api/interview/live/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError("Could not delete it. Please try again.");
      return;
    }
    router.push("/interview/live");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button className="btn btn-ghost" onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" /> Delete this interview
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      Delete the transcript and scorecard for good?
      <button className="btn btn-primary" onClick={remove}>Yes, delete</button>
      <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Keep it</button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
