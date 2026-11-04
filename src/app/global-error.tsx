"use client";

// Replaces the whole page when the root layout itself fails, so it cannot rely on the app's stylesheet.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa", color: "#0a0a0a" }}>
        <main style={{ maxWidth: 480, margin: "15vh auto", padding: "0 24px", textAlign: "center" }}>
          <p style={{ display: "inline-block", background: "#0a0a0a", color: "#fff", padding: "6px 12px", borderRadius: 8, fontWeight: 900, letterSpacing: "0.12em" }}>
            AIEM
          </p>
          <h1 style={{ fontSize: 22, margin: "24px 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#525252", fontSize: 14, lineHeight: 1.6 }}>
            The site could not load. This is usually temporary. Your progress is saved.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: 20, background: "#0a0a0a", color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
          {error.digest && <p style={{ marginTop: 20, fontFamily: "monospace", fontSize: 11, color: "#737373" }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
