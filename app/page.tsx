"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {/* Overlay suave (mejora legibilidad sobre el fondo) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(1200px 700px at 50% 25%, rgba(0,0,0,0.18), rgba(0,0,0,0.62))",
          pointerEvents: "none",
        }}
      />

      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "transparent",
          color: "white",
          position: "relative",
        }}
      >
        <form
          onSubmit={onSubmit}
          style={{
            width: "100%",
            maxWidth: 520,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.42)",
            backdropFilter: "blur(10px)",
            padding: 22,
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          }}
        >
          {/* Encabezado */}
          <div style={{ marginBottom: 16 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 950,
                marginBottom: 6,
                letterSpacing: 0.2,
                textShadow: "0 2px 12px rgba(0,0,0,0.55)",
              }}
            >
              Legajos Empleados Municipales
            </h1>

            <div style={{ opacity: 0.9, textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}>
              Municipalidad de Salta
            </div>
          </div>

          {/* Campos */}
          <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 12, opacity: 0.9 }}>Correo electrónico</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
              style={{
                padding: "12px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.34)",
                color: "white",
                outline: "none",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            <span style={{ fontSize: 12, opacity: 0.9 }}>Contraseña</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              style={{
                padding: "12px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.34)",
                color: "white",
                outline: "none",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            />
          </label>

          {/* Error */}
          {error && (
            <div
              style={{
                border: "1px solid rgba(255,120,120,0.35)",
                background: "rgba(122,31,31,0.28)",
                borderRadius: 12,
                padding: 12,
                color: "#ffd0d0",
                marginBottom: 12,
              }}
            >
              ❌ {error}
            </div>
          )}

          {/* Botón */}
          <button
            disabled={loading}
            type="submit"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: loading ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.55)",
              color: "white",
              fontWeight: 950,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
              transition: "transform 120ms ease, background 120ms ease",
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(1px)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0px)";
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          {/* Pie */}
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              opacity: 0.75,
              lineHeight: 1.4,
            }}
          >
            Acceso restringido. Uso interno.
          </div>
        </form>
      </main>
    </div>
  );
}
