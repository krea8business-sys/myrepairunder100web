"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 40, textAlign: "center", color: "#1E2024" }}>
        <h1>Something went wrong</h1>
        <p>Please refresh the page or try again in a moment.</p>
        <button onClick={reset} style={{ padding: "10px 18px", borderRadius: 10, background: "#1E2024", color: "#fff", border: 0 }}>Try again</button>
      </body>
    </html>
  );
}
