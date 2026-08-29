"use client";

/**
 * The last resort.
 *
 * This replaces the root layout, so it can rely on no provider, no font
 * variable and no Tailwind class that a broken build might not have emitted.
 * Everything here is inline and English-only by necessity — the language
 * context is one of the things that has failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#fbfaf8",
          color: "#22252f",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.11em",
              textTransform: "uppercase",
              color: "#6b7080",
            }}
          >
            Nivaaran
          </p>
          <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.75rem", lineHeight: 1.2 }}>
            Something failed before the page could load.
          </h1>
          <p style={{ margin: "0.75rem 0 0", lineHeight: 1.6, color: "#4a4f5e" }}>
            Nothing has been submitted and no claim was filed. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: "3rem",
              padding: "0 1.5rem",
              borderRadius: "0.5rem",
              border: 0,
              background: "#3b3a8f",
              color: "#fbfaf8",
              fontSize: "1rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload Nivaaran
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontFamily: "ui-monospace, monospace", fontSize: "0.75rem", color: "#8a8f9d" }}>
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
