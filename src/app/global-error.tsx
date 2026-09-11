"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "sans-serif", padding: "40px", textAlign: "center", background: "#f8f8f8" }}>
        <h2 style={{ fontSize: "24px", color: "#111" }}>Algo deu errado!</h2>
        <p style={{ color: "#666", marginBottom: "20px" }}>{error?.message || "Ocorreu um erro inesperado."}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "10px 20px",
            background: "#ec4899",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Recarregar
        </button>
      </body>
    </html>
  );
}
