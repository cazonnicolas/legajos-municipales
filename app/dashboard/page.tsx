"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Legajo = {
  nro_legajo: string | null;
  dni: string;
  apellido: string;
  nombre: string;
  cuil: string | null;
  estado?: string | null;
  cargo?: string | null;
  fecha_ingreso?: string | null;
};

export default function DashboardPage() {
  const [legajos, setLegajos] = useState<Legajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Datos del Usuario que inició sesión (Simulados - Aquí podrías traer los datos de Supabase Auth)
  const userSession = {
    nombre: "NICOLAS CAZON",
    cargo: "Administrador de Sistemas",
    sexo: "M" // Cambiar a "F" para mostrar dibujo de mujer
  };

  // Estados de Filtros
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState<"" | "Activo" | "Baja">("");

  // Estado para el MODAL de Nuevo Legajo
  const [mostrarModal, setMostrarModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    dni: "", nro_legajo: "", apellido: "", nombre: "", cuil: "", estado: "Activo", cargo: "", fecha_ingreso: ""
  });

  useEffect(() => {
    cargarLegajos();
  }, []);

  async function cargarLegajos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("legajos")
      .select("nro_legajo, dni, apellido, nombre, cuil, estado, cargo, fecha_ingreso");

    if (error) {
      setError(error.message);
    } else {
      const rows = (data as Legajo[]) || [];
      rows.sort((a, b) => Number(b.nro_legajo || 0) - Number(a.nro_legajo || 0));
      setLegajos(rows);
    }
    setLoading(false);
  }

  // --- LÓGICA DE FORMULARIO (MODAL) ---
  const formatCUIL = (value: string) => {
    const cv = value.replace(/\D/g, "");
    if (cv.length <= 2) return cv;
    if (cv.length <= 10) return `${cv.slice(0, 2)}-${cv.slice(2)}`;
    return `${cv.slice(0, 2)}-${cv.slice(2, 10)}-${cv.slice(10, 11)}`;
  };

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "cuil") {
      setFormData({ ...formData, cuil: formatCUIL(value).slice(0, 13) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmitNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error: insErr } = await supabase.from("legajos").insert([{
      ...formData,
      apellido: formData.apellido.toUpperCase(),
      nombre: formData.nombre.toUpperCase()
    }]);

    if (insErr) {
      alert("Error: " + insErr.message);
      setSubmitting(false);
    } else {
      setMostrarModal(false);
      setFormData({ dni: "", nro_legajo: "", apellido: "", nombre: "", cuil: "", estado: "Activo", cargo: "", fecha_ingreso: "" });
      cargarLegajos(); 
    }
  };

  // --- FILTRADO DE TABLA ---
  const filtrados = useMemo(() => {
    const query = q.trim().toLowerCase();
    return legajos.filter((l) => {
      if (fEstado && (l.estado || "Activo") !== fEstado) return false;
      if (!query) return true;
      const full = `${l.apellido} ${l.nombre}`.toLowerCase();
      return full.includes(query) || String(l.dni).includes(query) || String(l.nro_legajo).includes(query);
    });
  }, [legajos, q, fEstado]);

  // --- ESTILOS ---
  const card: React.CSSProperties = { borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(12px)", overflow: "hidden" };
  const inputBase: React.CSSProperties = { padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.35)", color: "white", outline: "none" };

  return (
    <main style={{ padding: "40px 28px", minHeight: "100vh", color: "white", backgroundImage: "url('/LEGAJO.jpg')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 950, margin: 0 }}>📁 Legajos Municipales</h1>
            <div style={{ opacity: 0.8 }}>Municipalidad de Salta</div>
          </div>
          <button onClick={() => setMostrarModal(true)} style={{ padding: "14px 28px", borderRadius: 14, border: "none", background: "#2563eb", color: "white", fontWeight: 800, cursor: "pointer" }}>
            ➕ Nuevo Legajo
          </button>
        </div>

        {/* PERFIL DE USUARIO LOGUEADO */}
        <div style={{ ...card, padding: "15px 25px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, borderLeft: "4px solid #2563eb" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#333", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)" }}>
            <img 
              src={userSession.sexo === "M" ? "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" : "https://cdn-icons-png.flaticon.com/512/3135/3135789.png"} 
              alt="Avatar" 
              style={{ width: "85%", height: "85%", objectFit: "cover" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#4ade80" }}>Bienvenido/a, {userSession.nombre}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>{userSession.cargo} • Municipalidad de Salta</div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div style={{ ...card, padding: 20, display: "grid", gridTemplateColumns: "1fr 280px 140px", gap: 15, alignItems: "end", marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 5, display: "block" }}>Buscador General</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="DNI, Apellido o Legajo..." style={{ ...inputBase, width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 5, display: "block" }}>Estado</label>
            <select value={fEstado} onChange={(e) => setFEstado(e.target.value as any)} style={{ ...inputBase, width: "100%" }}>
              <option value="">Todos</option>
              <option value="Activo">Activo</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
          <button onClick={() => {setQ(""); setFEstado("");}} style={{ ...inputBase, cursor: "pointer", fontWeight: 800 }}>Limpiar</button>
        </div>

        {/* TABLA DE LEGAJOS */}
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "rgba(255,255,255,0.05)" }}>
              <tr>
                <th style={{ padding: 15 }}>N° Legajo</th>
                <th>DNI</th>
                <th>Apellido y Nombre</th>
                <th>CUIL</th>
                <th>Estado</th>
                <th style={{ textAlign: "center" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} style={{ padding: 30, textAlign: "center" }}>Cargando...</td></tr> : 
                filtrados.map((l) => (
                  <tr key={l.dni} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: 15 }}>{l.nro_legajo}</td>
                    <td>{l.dni}</td>
                    <td style={{ fontWeight: 700 }}>{l.apellido}, {l.nombre}</td>
                    <td>{l.cuil}</td>
                    <td><span style={{ color: l.estado === "Activo" ? "#4ade80" : "#fb7185" }}>● {l.estado}</span></td>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => window.location.href=`/legajos/${l.dni}`} style={{ ...inputBase, padding: "6px 15px", fontSize: 13, cursor: "pointer" }}>Ver</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE NUEVO LEGAJO --- */}
      {mostrarModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div style={{ ...card, width: "100%", maxWidth: 650, padding: 35, background: "#111", position: "relative" }}>
            <button onClick={() => setMostrarModal(false)} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>✕</button>
            <h2 style={{ fontSize: 28, margin: "0 0 20px 0" }}>Registrar Nuevo Legajo</h2>
            <form onSubmit={handleSubmitNuevo} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
              <input name="dni" required placeholder="DNI" style={inputBase} value={formData.dni} onChange={handleModalChange} />
              <input name="nro_legajo" required placeholder="N° Legajo" style={inputBase} value={formData.nro_legajo} onChange={handleModalChange} />
              <input name="apellido" required placeholder="Apellido" style={inputBase} value={formData.apellido} onChange={handleModalChange} />
              <input name="nombre" required placeholder="Nombre" style={inputBase} value={formData.nombre} onChange={handleModalChange} />
              <input name="cuil" placeholder="CUIL (Auto)" style={{ ...inputBase, gridColumn: "span 2" }} value={formData.cuil} onChange={handleModalChange} />
              <select name="estado" style={inputBase} value={formData.estado} onChange={handleModalChange}>
                <option value="Activo">Activo</option>
                <option value="Baja">Baja</option>
              </select>
              <input type="date" name="fecha_ingreso" style={inputBase} value={formData.fecha_ingreso} onChange={handleModalChange} />
              <button type="submit" disabled={submitting} style={{ gridColumn: "span 2", padding: 15, borderRadius: 12, border: "none", background: "#2563eb", color: "white", fontWeight: 800, cursor: "pointer", marginTop: 10 }}>
                {submitting ? "Guardando..." : "Confirmar Alta"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}