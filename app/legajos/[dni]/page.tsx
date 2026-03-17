"use client";
import React, { useEffect, useState, useRef, CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

const SECRETARIAS: string[] = ["AGENCIA DE CULTURA", "ENTE TURISMO", "INTENDENCIA", "JEFATURA DE GABINETE", "PROCURACION GENERAL", "ESPACIOS PUBLICOS", "AMBIENTE Y SERVICIOS PUBLICOS", "DESARROLLO SOCIAL", "GOBIERNO", "HACIENDA", "OBRAS PUBLICAS", "OBRAS PRIVADAS", "TRANSITO Y SEGURIDAD VIAL", "LEGAL Y TECNICA", "TRIBUNAL DE CUENTAS", "TRIBUNAL ADMINISTRATIVO DE FALTAS"];
const ESTADOS_CIVILES: string[] = ["SOLTERO/A", "CASADO/A", "DIVORCIADO/A", "VIUDO/A", "UNIÓN DE HECHO"];
const NIVELES_ESTUDIO: string[] = ["PRIMARIO", "SECUNDARIO", "TERCIARIO", "UNIVERSITARIO"];
const SITUACIONES_LABORALES: string[] = ["1_ PLANTA POLITICA", "2_ TRIBUNAL CUENTAS/FA", "10_ ESTRUCTURA POLITICA", "11_ PERSONAL MONTO FIJO", "13_ CONTRATO DE LOCACION", "17_ AGRUPAMIENTO POLITICO", "18_ PERSONAL ABSCRIPTO", "21_ PASANTIAS / CONVENIOS"];
const OPCIONES_REGISTRO: string[] = ["PLANILLA", "RELOJ (FICHA)"];

interface Laborales {
  dni_agente?: string;
  legajo_interno?: string;
  legajo_cobro?: string;
  secretaria?: string;
  subsecretaria?: string;
  cargo?: string;
  profesion?: string;
  fecha_ingreso?: string;
  fecha_egreso?: string | null;
  fecha_titulo?: string;
  nivel?: string;
  registro_horario?: string;
  situacion?: string;
}

interface Hijo {
  nombre: string;
  fecha_nac: string;
}

interface Agente {
  dni: string;
  apellido: string;
  nombre: string;
  sexo?: string;
  domicilio?: string;
  barrio?: string;
  telefono?: string;
  email?: string;
  contacto_emergencia?: string;
  nacionalidad?: string;
  lugar_nacimiento?: string;
  fecha_nacimiento?: string;
  estado_civil?: string;
  nivel_estudios?: string;
  nombre_padre?: string;
  nombre_madre?: string;
  nombre_conyuge?: string;
  nombres_hijos?: Hijo[];
  foto_url?: string;
  laborales?: Laborales;
}

interface FormEdit extends Agente, Laborales {
  activo?: boolean;
}

interface Novedad {
  id: number;
  fecha: string;
  observacion: string;
  detalle: string;
  usuario_carga: string;
  archivo_url?: string;
  dni_agente: string;
}

interface NuevaNovedad {
  id: number | null;
  fecha: string;
  observacion: string;
  detalle: string;
  usuario_carga: string;
}

const formatearFecha = (fecha?: string | null): string => {
  if (!fecha) return "";
  return fecha.split("T")[0];
};

const calcularEdad = (fecha?: string | null): string => {
  if (!fecha) return "";
  const hoy = new Date();
  const cumple = new Date(fecha);
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
  return edad >= 0 ? `${edad} años` : "";
};

export default function FichaAgentePage() {
  const params = useParams();
  const router = useRouter();
  const dni = params?.dni as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputNovedadRef = useRef<HTMLInputElement>(null);

  const [agente, setAgente] = useState<Agente | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModalPersonales, setShowModalPersonales] = useState<boolean>(false);
  const [showModalLaborales, setShowModalLaborales] = useState<boolean>(false);

  const [formEdit, setFormEdit] = useState<FormEdit>({} as FormEdit);
  const [familia, setFamilia] = useState({ padre: "", madre: "", conyuge: "" });
  const [hijos, setHijos] = useState<Hijo[]>([]);

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [archivoNovedad, setArchivoNovedad] = useState<File | null>(null);
  const [subiendoNovedad, setSubiendoNovedad] = useState<boolean>(false);

  const [fechaHoraImpresion, setFechaHoraImpresion] = useState<string>("");
  const usuarioImpresion = "LIC. CAZON NICOLAS";

  const [nuevaNovedad, setNuevaNovedad] = useState<NuevaNovedad>({
    id: null,
    fecha: new Date().toISOString().split("T")[0],
    observacion: "",
    detalle: "",
    usuario_carga: "",
  });

  useEffect(() => {
    if (dni) cargarTodo();
    const ahora = new Date();
    setFechaHoraImpresion(
      `${ahora.toLocaleDateString()} - ${ahora.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    );
  }, [dni]);

  async function cargarTodo(): Promise<void> {
    setLoading(true);
    try {
      const { data: p } = await supabase.from("legajos").select("*").eq("dni", dni).single();
      const { data: l } = await supabase.from("datos_laborales").select("*").eq("dni_agente", dni).single();
      const { data: nov } = await supabase.from("novedades").select("*").eq("dni_agente", dni).order("fecha", { ascending: false });
      if (p) {
        const lab: Laborales = l || { dni_agente: dni };
        setAgente({ ...p, laborales: lab });
        setFormEdit({ ...p, ...lab, activo: lab.fecha_egreso ? false : true });
        setFamilia({ padre: p.nombre_padre || "", madre: p.nombre_madre || "", conyuge: p.nombre_conyuge || "" });
        setHijos(p.nombres_hijos || []);
        setNovedades(nov || []);
      }
    } catch (err) {
      console.error("Error:", err);
    }
    setLoading(false);
  }

  const prepararEdicion = (n: Novedad): void => {
    setNuevaNovedad({ id: n.id, fecha: n.fecha.split("T")[0], observacion: n.observacion, detalle: n.detalle, usuario_carga: n.usuario_carga || "" });
    document.getElementById("seccion-novedades")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleBorrarNovedad = async (id: number): Promise<void> => {
    if (!confirm("¿Deseas eliminar este registro de novedad permanentemente?")) return;
    await supabase.from("novedades").delete().eq("id", id);
    await cargarTodo();
  };

  const handleGuardarNovedad = async (): Promise<void> => {
    if (!nuevaNovedad.observacion || !nuevaNovedad.usuario_carga) {
      alert("Debe completar el Título y la Firma del responsable.");
      return;
    }
    setSubiendoNovedad(true);
    try {
      let urlArchivo: string | null = null;
      if (archivoNovedad) {
        const fileName = `nov-${dni}-${Date.now()}`;
        await supabase.storage.from("documentos_novedades").upload(fileName, archivoNovedad);
        urlArchivo = supabase.storage.from("documentos_novedades").getPublicUrl(fileName).data.publicUrl;
      }
      const payload: Partial<Novedad> & { archivo_url?: string } = {
        dni_agente: dni, fecha: nuevaNovedad.fecha,
        observacion: nuevaNovedad.observacion, detalle: nuevaNovedad.detalle,
        usuario_carga: nuevaNovedad.usuario_carga,
      };
      if (urlArchivo) payload.archivo_url = urlArchivo;
      if (nuevaNovedad.id) {
        await supabase.from("novedades").update(payload).eq("id", nuevaNovedad.id);
      } else {
        await supabase.from("novedades").insert(payload);
      }
      setNuevaNovedad({ id: null, fecha: new Date().toISOString().split("T")[0], observacion: "", detalle: "", usuario_carga: "" });
      setArchivoNovedad(null);
      await cargarTodo();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
    setSubiendoNovedad(false);
  };

  const handleSavePersonales = async (): Promise<void> => {
    try {
      const updatePayload = {
        apellido: formEdit.apellido, nombre: formEdit.nombre, sexo: formEdit.sexo,
        domicilio: formEdit.domicilio, barrio: formEdit.barrio,
        telefono: formEdit.telefono, email: formEdit.email,
        contacto_emergencia: formEdit.contacto_emergencia,
        nacionalidad: formEdit.nacionalidad, lugar_nacimiento: formEdit.lugar_nacimiento,
        fecha_nacimiento: formEdit.fecha_nacimiento, estado_civil: formEdit.estado_civil,
        nivel_estudios: formEdit.nivel_estudios,
        nombre_padre: familia.padre, nombre_madre: familia.madre,
        nombre_conyuge: familia.conyuge, nombres_hijos: hijos,
      };
      const { error } = await supabase.from("legajos").update(updatePayload).eq("dni", dni);
      if (error) { alert("Error de Supabase: " + error.message); return; }
      setAgente((prev) => prev ? { ...prev, ...updatePayload } : prev);
      setShowModalPersonales(false);
      alert("¡Datos personales actualizados!");
    } catch (err: unknown) {
      if (err instanceof Error) alert("Error inesperado: " + err.message);
    }
  };

  const handleSaveLaborales = async (): Promise<void> => {
    try {
      const payload: Laborales = {
        dni_agente: dni, legajo_interno: formEdit.legajo_interno, legajo_cobro: formEdit.legajo_cobro,
        secretaria: formEdit.secretaria, subsecretaria: formEdit.subsecretaria,
        cargo: formEdit.cargo, profesion: formEdit.profesion,
        fecha_ingreso: formEdit.fecha_ingreso,
        fecha_egreso: formEdit.activo ? null : formEdit.fecha_egreso,
        fecha_titulo: formEdit.fecha_titulo, nivel: formEdit.nivel,
        registro_horario: formEdit.registro_horario, situacion: formEdit.situacion,
      };
      const { error } = await supabase.from("datos_laborales").upsert(payload, { onConflict: "dni_agente" });
      if (error) { alert("Error en datos laborales: " + error.message); return; }
      setAgente((prev) => prev ? { ...prev, laborales: { ...prev.laborales, ...payload } } : prev);
      setShowModalLaborales(false);
      alert("¡Situación laboral actualizada!");
    } catch (err: unknown) {
      if (err instanceof Error) alert("Error inesperado: " + err.message);
    }
  };

  const agregarHijo = (): void => setHijos([...hijos, { nombre: "", fecha_nac: "" }]);
  const actualizarHijo = (idx: number, campo: keyof Hijo, v: string): void => {
    const nh = [...hijos]; nh[idx][campo] = v; setHijos(nh);
  };

  // ✅ Estilos tipados con CSSProperties
  const glass: CSSProperties = {
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
    borderRadius: "20px", padding: "25px",
    border: "1px solid rgba(255,255,255,0.1)", marginBottom: "20px",
  };
  const labelStyle: CSSProperties = {
    color: "#93c5fd", fontSize: "11px", fontWeight: "bold",
    display: "block", marginBottom: "5px",
  };
  const inputStyle: CSSProperties = {
    width: "100%", padding: "10px", borderRadius: "8px",
    background: "#222", color: "white", border: "1px solid #444",
    fontSize: "14px", boxSizing: "border-box",
  };
  const seccionTituloStyle: CSSProperties = {
    color: "#60a5fa", fontSize: "13px", fontWeight: "bold",
    gridColumn: "span 4", borderBottom: "1px solid rgba(255,255,255,0.1)",
    paddingBottom: "6px", marginTop: "10px", textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  if (loading) return <div style={{ color: "white", textAlign: "center", marginTop: 100 }}>Cargando...</div>;
  if (!agente) return <div style={{ color: "white", textAlign: "center", marginTop: 100 }}>Agente no encontrado.</div>;

  return (
    <div className="ficha-container" style={{ minHeight: "100vh", padding: "40px", backgroundImage: "url('/LEGAJO.jpg')", backgroundSize: "cover", backgroundAttachment: "fixed", color: "white" }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          .no-print { display: none !important; }
          .ficha-container {
            background: white !important; background-image: none !important;
            padding: 0 !important; margin: 0 !important;
            color: black !important; min-height: auto; position: relative;
          }
          .print-header-muni {
            display: flex !important; justify-content: space-between;
            align-items: center; border-bottom: 2px solid black;
            padding-bottom: 10px; margin-bottom: 20px;
          }
          .ficha-container::before {
            content: ""; position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 450px; height: 450px;
            background-image: url('/backgrounds/logo_muni.png') !important;
            background-repeat: no-repeat !important;
            background-size: contain !important; background-position: center !important;
            opacity: 0.07 !important; z-index: -1;
          }
          .glass-print {
            background: white !important; color: black !important;
            border: 1px solid #eee !important; backdrop-filter: none !important;
            box-shadow: none !important; border-radius: 10px !important;
            padding: 15px !important; margin-bottom: 15px !important;
            page-break-inside: avoid;
          }
          .label-print { color: #555 !important; font-weight: bold !important; font-size: 8pt !important; text-transform: uppercase; }
          .value-print { color: black !important; font-size: 10pt !important; border-bottom: 1px solid #f0f0f0; display: block; }
          .seccion-titulo-print { color: #1d4ed8 !important; font-size: 9pt !important; }
          h1, h2, h3, p, span { color: black !important; }
          .footer-print-oficial {
            position: fixed; bottom: 0; width: 100%;
            display: flex; justify-content: space-between;
            font-size: 8pt; color: #777 !important;
            border-top: 1px solid #ccc; padding-top: 5px;
          }
        }
        .print-header-muni, .footer-print-oficial { display: none; }
        @media print { .print-header-muni, .footer-print-oficial { display: flex; } }
      `}</style>

      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <button onClick={() => window.history.back()} className="no-print"
          style={{ background: "#374151", color: "white", padding: "10px 20px", borderRadius: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", marginBottom: 20 }}>
          ⬅️ VOLVER ATRÁS
        </button>

        {/* Cabecera Impresión */}
        <div className="print-header-muni">
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <img src="/backgrounds/logo_muni.png" style={{ width: 60 }} alt="Logo" />
            <div>
              <h2 style={{ margin: 0, fontSize: "14pt" }}>MUNICIPALIDAD DE LA CIUDAD DE SALTA</h2>
              <p style={{ margin: 0, fontSize: "9pt" }}>Dirección General de Recursos Humanos</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 style={{ margin: 0, fontSize: "18pt", fontWeight: 900 }}>LEGAJO PERSONAL</h1>
            <p style={{ margin: 0, fontSize: "10pt" }}>DNI: {agente.dni}</p>
          </div>
        </div>

        <header className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900 }}>{agente.apellido}, {agente.nombre}</h1>
            <p style={{ color: "#60a5fa" }}>DNI {agente.dni} | Agente Municipal</p>
          </div>
          <button className="no-print" onClick={() => window.print()}
            style={{ background: "#f59e0b", color: "white", padding: "10px 25px", border: "none", borderRadius: 12, fontWeight: "bold", cursor: "pointer" }}>
            🖨️ IMPRIMIR REPORTE
          </button>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "20px" }}>

          {/* FOTO */}
          <aside>
            <div className="glass-print" style={{ ...glass, textAlign: "center" }}>
              <div style={{ width: 180, height: 180, borderRadius: "50%", background: "#000", margin: "0 auto 15px auto", border: "4px solid #2563eb", overflow: "hidden" }}>
                {agente.foto_url
                  ? <img src={agente.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Foto agente" />
                  : <span style={{ fontSize: 60, lineHeight: "180px" }}>👤</span>}
              </div>
              <button className="no-print" onClick={() => fileInputRef.current?.click()}
                style={{ background: "#2563eb", color: "white", padding: "10px", borderRadius: 8, width: "100%", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                CAMBIAR FOTO
              </button>
              <input type="file" ref={fileInputRef} hidden accept="image/*"
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const fileName = `${dni}-${Date.now()}`;
                  await supabase.storage.from("fotos_agentes").upload(fileName, file);
                  const url = supabase.storage.from("fotos_agentes").getPublicUrl(fileName).data.publicUrl;
                  await supabase.from("legajos").update({ foto_url: url }).eq("dni", dni);
                  setAgente((prev) => prev ? { ...prev, foto_url: url } : prev);
                }} />
            </div>
          </aside>

          <main>
            {/* ══════════════════════════════════════════
                SECCIÓN I: INFORMACIÓN PERSONAL Y CIVIL
            ══════════════════════════════════════════ */}
            <section className="glass-print" style={glass}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
                <h2 style={{ color: "#60a5fa", fontSize: 18 }}>I. INFORMACIÓN PERSONAL Y CIVIL</h2>
                <button className="no-print" onClick={() => setShowModalPersonales(true)}
                  style={{ background: "#2563eb", border: "none", color: "white", padding: "6px 15px", borderRadius: 8, cursor: "pointer" }}>
                  ✏️ EDITAR
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>

                {/* Bloque: Identificación */}
                <div style={seccionTituloStyle} className="seccion-titulo-print">📋 Identificación</div>
                <div><span className="label-print" style={labelStyle}>Sexo</span><p className="value-print">{agente.sexo || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Fecha Nac.</span><p className="value-print">{formatearFecha(agente.fecha_nacimiento)}</p></div>
                <div><span className="label-print" style={labelStyle}>Edad</span><p className="value-print">{calcularEdad(agente.fecha_nacimiento)}</p></div>
                <div><span className="label-print" style={labelStyle}>Est. Civil</span><p className="value-print">{agente.estado_civil || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Nacionalidad</span><p className="value-print">{agente.nacionalidad || "S/D"}</p></div>
                <div style={{ gridColumn: "span 2" }}><span className="label-print" style={labelStyle}>Lugar de Nacimiento</span><p className="value-print">{agente.lugar_nacimiento || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Nivel Estudios</span><p className="value-print">{agente.nivel_estudios || "S/D"}</p></div>

                {/* Bloque: Contacto */}
                <div style={seccionTituloStyle} className="seccion-titulo-print">📞 Contacto</div>
                <div style={{ gridColumn: "span 2" }}><span className="label-print" style={labelStyle}>Domicilio</span><p className="value-print">{agente.domicilio || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Barrio</span><p className="value-print">{agente.barrio || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Teléfono</span><p className="value-print">{agente.telefono || "S/D"}</p></div>
                <div style={{ gridColumn: "span 2" }}><span className="label-print" style={labelStyle}>Email</span><p className="value-print">{agente.email || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Contacto Emergencia</span><p className="value-print">{agente.contacto_emergencia || "S/D"}</p></div>

                {/* Bloque: Grupo Familiar */}
                <div style={seccionTituloStyle} className="seccion-titulo-print">👨‍👩‍👧 Grupo Familiar</div>
                <div><span className="label-print" style={labelStyle}>Padre</span><p className="value-print">{agente.nombre_padre || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Madre</span><p className="value-print">{agente.nombre_madre || "S/D"}</p></div>
                <div style={{ gridColumn: "span 2" }}><span className="label-print" style={labelStyle}>Cónyuge / Pareja</span><p className="value-print">{agente.nombre_conyuge || "S/D"}</p></div>

                {/* Hijos */}
                {agente.nombres_hijos && agente.nombres_hijos.length > 0 && (
                  <>
                    <div style={{ ...seccionTituloStyle, gridColumn: "span 4" }} className="seccion-titulo-print">
                      👶 Hijos ({agente.nombres_hijos.length})
                    </div>
                    {agente.nombres_hijos.map((h: Hijo, i: number) => (
                      <div key={i} style={{ gridColumn: "span 2", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <span className="label-print" style={labelStyle}>Hijo {i + 1}</span>
                        <p className="value-print" style={{ margin: 0 }}>{h.nombre}</p>
                        {h.fecha_nac && <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>Nac: {formatearFecha(h.fecha_nac)}</p>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>

            {/* ══════════════════════════════════════════
                SECCIÓN II: SITUACIÓN LABORAL
            ══════════════════════════════════════════ */}
            <section className="glass-print" style={glass}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
                <h2 style={{ color: "#60a5fa", fontSize: 18 }}>II. SITUACIÓN LABORAL MUNICIPAL</h2>
                <button className="no-print" onClick={() => setShowModalLaborales(true)}
                  style={{ background: "#2563eb", border: "none", color: "white", padding: "6px 15px", borderRadius: 8, cursor: "pointer" }}>
                  ✏️ EDITAR
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
                <div><span className="label-print" style={labelStyle}>Leg. Interno</span><p className="value-print">{agente.laborales?.legajo_interno || "-"}</p></div>
                <div><span className="label-print" style={labelStyle}>Leg. Cobro</span><p className="value-print">{agente.laborales?.legajo_cobro || "-"}</p></div>
                <div style={{ gridColumn: "span 2" }}><span className="label-print" style={labelStyle}>Secretaría</span><p className="value-print">{agente.laborales?.secretaria || "-"}</p></div>
                <div style={{ gridColumn: "span 2" }}><span className="label-print" style={labelStyle}>Subsecretaría</span><p className="value-print">{agente.laborales?.subsecretaria || "-"}</p></div>
                <div style={{ gridColumn: "span 2" }}><span className="label-print" style={labelStyle}>Cargo / Función</span><p className="value-print">{agente.laborales?.cargo || "-"}</p></div>
                <div style={{ gridColumn: "span 2" }}><span className="label-print" style={labelStyle}>Profesión / Título</span><p className="value-print">{agente.laborales?.profesion || "-"}</p></div>
                <div><span className="label-print" style={labelStyle}>F. Ingreso</span><p className="value-print">{formatearFecha(agente.laborales?.fecha_ingreso)}</p></div>
                <div><span className="label-print" style={labelStyle}>Situación</span><p className="value-print">{agente.laborales?.situacion || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Control Horario</span><p className="value-print">{agente.laborales?.registro_horario || "S/D"}</p></div>
                <div>
                  <span className="label-print" style={labelStyle}>Estado</span>
                  <p className="value-print" style={{ fontWeight: "bold", color: agente.laborales?.fecha_egreso ? "#ef4444" : "#22c55e" }}>
                    {agente.laborales?.fecha_egreso ? `BAJA (${formatearFecha(agente.laborales.fecha_egreso)})` : "ACTIVO"}
                  </p>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════
                SECCIÓN III: NOVEDADES
            ══════════════════════════════════════════ */}
            <section id="seccion-novedades" className="glass-print" style={glass}>
              <h2 style={{ color: "#60a5fa", fontSize: 18, marginBottom: 20 }}>III. HISTORIAL DE NOVEDADES</h2>

              <div className="no-print" style={{ background: "#111", padding: "20px", borderRadius: "15px", marginBottom: 25, border: "1px solid #333" }}>
                <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 180px", gap: 15, marginBottom: 15 }}>
                  <div>
                    <label style={labelStyle}>Fecha</label>
                    <input type="date" style={inputStyle} value={nuevaNovedad.fecha}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevaNovedad({ ...nuevaNovedad, fecha: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Título de la Novedad</label>
                    <input style={inputStyle} placeholder="Ej: Presentó Certificado Médico" value={nuevaNovedad.observacion}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevaNovedad({ ...nuevaNovedad, observacion: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, color: "#f59e0b" }}>Firma Responsable</label>
                    <input style={{ ...inputStyle, border: "1px solid #f59e0b" }} placeholder="Quién carga?" value={nuevaNovedad.usuario_carga}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevaNovedad({ ...nuevaNovedad, usuario_carga: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 150px", gap: 15 }}>
                  <textarea style={{ ...inputStyle, height: 50 } as CSSProperties} placeholder="Descripción o detalle de la novedad..." value={nuevaNovedad.detalle}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNuevaNovedad({ ...nuevaNovedad, detalle: e.target.value })} />
                  <button onClick={() => fileInputNovedadRef.current?.click()}
                    style={{ background: "#374151", color: "white", border: "1px dashed #666", borderRadius: 10, cursor: "pointer" }}>
                    {archivoNovedad ? "📎 LISTO" : "📎 ADJUNTAR"}
                  </button>
                  <input type="file" ref={fileInputNovedadRef} hidden
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArchivoNovedad(e.target.files?.[0] || null)} />
                  <button onClick={handleGuardarNovedad} disabled={subiendoNovedad}
                    style={{ background: nuevaNovedad.id ? "#f59e0b" : "#16a34a", color: "white", borderRadius: 10, border: "none", fontWeight: "bold", cursor: "pointer" }}>
                    {nuevaNovedad.id ? "ACTUALIZAR" : "REGISTRAR"}
                  </button>
                </div>
                {nuevaNovedad.id && (
                  <p onClick={() => setNuevaNovedad({ id: null, fecha: new Date().toISOString().split("T")[0], observacion: "", detalle: "", usuario_carga: "" })}
                    style={{ color: "#94a3b8", fontSize: 11, textAlign: "right", marginTop: 10, cursor: "pointer" }}>
                    ✖ Cancelar edición
                  </p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {novedades.map((n: Novedad) => {
                  const fechaLimpia = formatearFecha(n.fecha);
                  const parts = fechaLimpia.split("-");
                  const anio = parts[0]; const dia = parts[2];
                  const mesTexto = new Date(fechaLimpia + "T12:00:00").toLocaleString("es-ES", { month: "short" });
                  return (
                    <div key={n.id} className="glass-print"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "15px", padding: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                        <div style={{ textAlign: "center", minWidth: "70px", borderRight: "1px solid #333", paddingRight: "15px" }}>
                          <span style={{ fontSize: 18, fontWeight: 900, display: "block" }}>{dia}</span>
                          <span style={{ fontSize: 10, color: "#60a5fa", textTransform: "uppercase", display: "block" }}>{mesTexto}</span>
                          <span style={{ fontSize: 10, color: "#94a3b8", display: "block", marginTop: "2px" }}>{anio}</span>
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 15, color: "#fff" }}>{n.observacion}</h4>
                          <p style={{ margin: "4px 0", fontSize: 12, color: "#94a3b8", lineHeight: "1.4" }}>{n.detalle}</p>
                          <div style={{ display: "flex", gap: "10px", marginTop: "8px", alignItems: "center" }}>
                            <span style={{ background: "#1e293b", color: "#f59e0b", fontSize: "10px", padding: "3px 8px", borderRadius: "5px", fontWeight: "bold" }}>
                              FIRMADO POR: {n.usuario_carga}
                            </span>
                            {n.archivo_url && (
                              <a href={n.archivo_url} target="_blank" rel="noreferrer" className="no-print"
                                style={{ color: "#4ade80", fontSize: "11px", fontWeight: "bold", textDecoration: "none" }}>
                                📄 VER ADJUNTO
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="no-print" style={{ display: "flex", gap: "10px" }}>
                        <button onClick={() => prepararEdicion(n)}
                          style={{ background: "#222", border: "1px solid #444", color: "#fbbf24", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>✏️</button>
                        <button onClick={() => handleBorrarNovedad(n.id)}
                          style={{ background: "#222", border: "1px solid #444", color: "#f87171", padding: "8px 12px", borderRadius: "8px", cursor: "pointer" }}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
                {novedades.length === 0 && <p style={{ textAlign: "center", opacity: 0.5, padding: 20 }}>No hay novedades registradas.</p>}
              </div>
            </section>
          </main>
        </div>

        {/* Pie Impresión */}
        <footer className="footer-print-oficial">
          <span>Usuario: {usuarioImpresion}</span>
          <span>Generado el: {fechaHoraImpresion}</span>
          <span>Hoja 1 de 1</span>
        </footer>

        {/* ══════════════════════════════════════════
            MODAL PERSONALES
        ══════════════════════════════════════════ */}
        {showModalPersonales && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 2000, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <div style={{ background: "#111", padding: 30, borderRadius: 24, width: "100%", maxWidth: 900, maxHeight: "90vh", overflowY: "auto", border: "1px solid #333" }}>
              <h2 style={{ color: "#60a5fa", marginBottom: 20 }}>Editar Datos Personales y Familiares</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 15 }}>

                <div><label style={labelStyle}>Apellido</label><input style={inputStyle} value={formEdit.apellido || ""} onChange={(e) => setFormEdit({ ...formEdit, apellido: e.target.value })} /></div>
                <div><label style={labelStyle}>Nombre</label><input style={inputStyle} value={formEdit.nombre || ""} onChange={(e) => setFormEdit({ ...formEdit, nombre: e.target.value })} /></div>
                <div>
                  <label style={labelStyle}>Sexo</label>
                  <select style={inputStyle} value={formEdit.sexo || ""} onChange={(e) => setFormEdit({ ...formEdit, sexo: e.target.value })}>
                    <option value="">Seleccionar</option>
                    <option value="MASCULINO">MASCULINO</option>
                    <option value="FEMENINO">FEMENINO</option>
                  </select>
                </div>
                <div><label style={labelStyle}>F. Nacimiento</label><input type="date" style={inputStyle} value={formatearFecha(formEdit.fecha_nacimiento)} onChange={(e) => setFormEdit({ ...formEdit, fecha_nacimiento: e.target.value })} /></div>
                <div>
                  <label style={labelStyle}>Estado Civil</label>
                  <select style={inputStyle} value={formEdit.estado_civil || ""} onChange={(e) => setFormEdit({ ...formEdit, estado_civil: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {ESTADOS_CIVILES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Nivel Estudios</label>
                  <select style={inputStyle} value={formEdit.nivel_estudios || ""} onChange={(e) => setFormEdit({ ...formEdit, nivel_estudios: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {NIVELES_ESTUDIO.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Nacionalidad</label><input style={inputStyle} value={formEdit.nacionalidad || ""} placeholder="Ej: ARGENTINA" onChange={(e) => setFormEdit({ ...formEdit, nacionalidad: e.target.value })} /></div>
                <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Lugar de Nacimiento</label><input style={inputStyle} value={formEdit.lugar_nacimiento || ""} placeholder="Ej: Salta, Argentina" onChange={(e) => setFormEdit({ ...formEdit, lugar_nacimiento: e.target.value })} /></div>
                <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Domicilio</label><input style={inputStyle} value={formEdit.domicilio || ""} onChange={(e) => setFormEdit({ ...formEdit, domicilio: e.target.value })} /></div>
                <div><label style={labelStyle}>Barrio</label><input style={inputStyle} value={formEdit.barrio || ""} onChange={(e) => setFormEdit({ ...formEdit, barrio: e.target.value })} /></div>
                <div><label style={labelStyle}>Teléfono</label><input style={inputStyle} value={formEdit.telefono || ""} placeholder="Ej: 387-4123456" onChange={(e) => setFormEdit({ ...formEdit, telefono: e.target.value })} /></div>
                <div style={{ gridColumn: "span 2" }}><label style={labelStyle}>Email</label><input style={inputStyle} value={formEdit.email || ""} placeholder="ejemplo@correo.com" onChange={(e) => setFormEdit({ ...formEdit, email: e.target.value })} /></div>
                <div style={{ gridColumn: "span 3" }}><label style={labelStyle}>Contacto de Emergencia</label><input style={inputStyle} value={formEdit.contacto_emergencia || ""} placeholder="Nombre y teléfono" onChange={(e) => setFormEdit({ ...formEdit, contacto_emergencia: e.target.value })} /></div>

                <div style={{ gridColumn: "span 3", borderTop: "1px solid #333", marginTop: 10, paddingTop: 15, color: "#93c5fd", fontWeight: "bold" }}>Grupo Familiar</div>
                <input style={inputStyle} value={familia.padre} placeholder="Nombre Padre" onChange={(e) => setFamilia({ ...familia, padre: e.target.value })} />
                <input style={inputStyle} value={familia.madre} placeholder="Nombre Madre" onChange={(e) => setFamilia({ ...familia, madre: e.target.value })} />
                <input style={inputStyle} value={familia.conyuge} placeholder="Cónyuge / Pareja" onChange={(e) => setFamilia({ ...familia, conyuge: e.target.value })} />

                <div style={{ gridColumn: "span 3" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={labelStyle}>HIJOS CARGADOS</span>
                    <button onClick={agregarHijo} style={{ background: "#2563eb", border: "none", color: "white", padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>+ Añadir Hijo</button>
                  </div>
                  {hijos.map((h, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, background: "#1a1a1a", padding: 8, borderRadius: 10 }}>
                      <input style={inputStyle} value={h.nombre} placeholder="Nombre y Apellido" onChange={(e) => actualizarHijo(i, "nombre", e.target.value)} />
                      <input type="date" style={inputStyle} value={formatearFecha(h.fecha_nac)} onChange={(e) => actualizarHijo(i, "fecha_nac", e.target.value)} />
                      <button onClick={() => setHijos(hijos.filter((_, idx) => idx !== i))}
                        style={{ background: "#7f1d1d", border: "none", color: "white", padding: "0 15px", borderRadius: 8, cursor: "pointer" }}>
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 15, marginTop: 25 }}>
                <button onClick={handleSavePersonales} style={{ flex: 2, background: "#16a34a", color: "white", padding: 16, borderRadius: 12, border: "none", fontWeight: "bold", cursor: "pointer" }}>GUARDAR CAMBIOS</button>
                <button onClick={() => setShowModalPersonales(false)} style={{ flex: 1, background: "#444", color: "white", padding: 16, borderRadius: 12, border: "none", cursor: "pointer" }}>CANCELAR</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            MODAL LABORALES
        ══════════════════════════════════════════ */}
        {showModalLaborales && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 2000, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <div style={{ background: "#111", padding: 30, borderRadius: 24, width: "100%", maxWidth: 800, border: "1px solid #333" }}>
              <h2 style={{ color: "#60a5fa", marginBottom: 20 }}>Editar Situación Laboral</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                <div><label style={labelStyle}>Legajo Interno</label><input style={inputStyle} value={formEdit.legajo_interno || ""} onChange={(e) => setFormEdit({ ...formEdit, legajo_interno: e.target.value })} /></div>
                <div><label style={labelStyle}>Legajo Cobro</label><input style={inputStyle} value={formEdit.legajo_cobro || ""} onChange={(e) => setFormEdit({ ...formEdit, legajo_cobro: e.target.value })} /></div>
                <div>
                  <label style={labelStyle}>Secretaría</label>
                  <select style={inputStyle} value={formEdit.secretaria || ""} onChange={(e) => setFormEdit({ ...formEdit, secretaria: e.target.value })}>
                    <option value="">-- Seleccionar --</option>
                    {SECRETARIAS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Subsecretaría</label><input style={inputStyle} value={formEdit.subsecretaria || ""} onChange={(e) => setFormEdit({ ...formEdit, subsecretaria: e.target.value })} /></div>
                <div><label style={labelStyle}>Cargo</label><input style={inputStyle} value={formEdit.cargo || ""} onChange={(e) => setFormEdit({ ...formEdit, cargo: e.target.value })} /></div>
                <div><label style={labelStyle}>Profesión / Título</label><input style={inputStyle} value={formEdit.profesion || ""} onChange={(e) => setFormEdit({ ...formEdit, profesion: e.target.value })} /></div>
                <div><label style={labelStyle}>F. Ingreso</label><input type="date" style={inputStyle} value={formatearFecha(formEdit.fecha_ingreso)} onChange={(e) => setFormEdit({ ...formEdit, fecha_ingreso: e.target.value })} /></div>
                <div>
                  <label style={labelStyle}>Situación de Revista</label>
                  <select style={inputStyle} value={formEdit.situacion || ""} onChange={(e) => setFormEdit({ ...formEdit, situacion: e.target.value })}>
                    <option value="">-- Seleccionar --</option>
                    {SITUACIONES_LABORALES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Control Horario</label>
                  <select style={inputStyle} value={formEdit.registro_horario || ""} onChange={(e) => setFormEdit({ ...formEdit, registro_horario: e.target.value })}>
                    <option value="">-- Seleccionar --</option>
                    {OPCIONES_REGISTRO.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select style={inputStyle} value={formEdit.activo ? "SI" : "NO"} onChange={(e) => setFormEdit({ ...formEdit, activo: e.target.value === "SI" })}>
                    <option value="SI">ACTIVO</option>
                    <option value="NO">BAJA</option>
                  </select>
                </div>
                {!formEdit.activo && (
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={labelStyle}>Fecha de Egreso / Baja</label>
                    <input type="date" style={{ ...inputStyle, borderColor: "#ef4444" }}
                      value={formatearFecha(formEdit.fecha_egreso ?? undefined)}
                      onChange={(e) => setFormEdit({ ...formEdit, fecha_egreso: e.target.value })} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 15, marginTop: 25 }}>
                <button onClick={handleSaveLaborales} style={{ flex: 2, background: "#16a34a", color: "white", padding: 16, borderRadius: 12, border: "none", fontWeight: "bold", cursor: "pointer" }}>ACTUALIZAR DATOS</button>
                <button onClick={() => setShowModalLaborales(false)} style={{ flex: 1, background: "#444", color: "white", padding: 16, borderRadius: 12, border: "none", cursor: "pointer" }}>CANCELAR</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
