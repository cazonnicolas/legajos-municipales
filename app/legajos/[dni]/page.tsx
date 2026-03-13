"use client";
import React, { useEffect, useState, useRef } from "react";
// 1. Agregado useRouter aquí
import { useParams, useRouter } from "next/navigation"; 
import { supabase } from "@/app/lib/supabaseClient";

// Constantes de Selección
const SECRETARIAS = ["AGENCIA DE CULTURA", "ENTE TURISMO", "INTENDENCIA", "JEFATURA DE GABINETE", "PROCURACION GENERAL", "ESPACIOS PUBLICOS", "AMBIENTE Y SERVICIOS PUBLICOS", "DESARROLLO SOCIAL", "GOBIERNO", "HACIENDA", "OBRAS PUBLICAS", "OBRAS PRIVADAS", "TRANSITO Y SEGURIDAD VIAL", "LEGAL Y TECNICA", "TRIBUNAL DE CUENTAS", "TRIBUNAL ADMINISTRATIVO DE FALTAS"];
const ESTADOS_CIVILES = ["SOLTERO/A", "CASADO/A", "DIVORCIADO/A", "VIUDO/A", "UNIÓN DE HECHO"];
const NIVELES_ESTUDIO = ["PRIMARIO", "SECUNDARIO", "TERCIARIO", "UNIVERSITARIO"];
const SITUACIONES_LABORALES = ["1_ PLANTA POLITICA", "2_ TRIBUNAL CUENTAS/FA", "10_ ESTRUCTURA POLITICA", "11_ PERSONAL MONTO FIJO", "13_ CONTRATO DE LOCACION", "17_ AGRUPAMIENTO POLITICO", "18_ PERSONAL ABSCRIPTO", "21_ PASANTIAS / CONVENIOS"];
const OPCIONES_REGISTRO = ["PLANILLA", "RELOJ (FICHA)"];

const formatearFecha = (fecha: string) => {
  if (!fecha) return "";
  return fecha.split('T')[0];
};

const calcularEdad = (fecha: string) => {
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
  // 2. Inicialización del router
  const router = useRouter(); 
  const dni = params?.dni as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputNovedadRef = useRef<HTMLInputElement>(null);
  
  const [agente, setAgente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModalPersonales, setShowModalPersonales] = useState(false);
  const [showModalLaborales, setShowModalLaborales] = useState(false);
  
  const [formEdit, setFormEdit] = useState<any>({});
  const [familia, setFamilia] = useState({ padre: '', madre: '', conyuge: '' });
  const [hijos, setHijos] = useState<any[]>([]);

  const [novedades, setNovedades] = useState<any[]>([]);
  const [archivoNovedad, setArchivoNovedad] = useState<File | null>(null);
  const [subiendoNovedad, setSubiendoNovedad] = useState(false);

  // Estados para datos de impresión
  const [fechaHoraImpresion, setFechaHoraImpresion] = useState("");
  const usuarioImpresion = "LIC. CAZON NICOLAS";

  const [nuevaNovedad, setNuevaNovedad] = useState({ 
    id: null as number | null,
    fecha: new Date().toISOString().split('T')[0], 
    observacion: '', 
    detalle: '',
    usuario_carga: ''
  });

  useEffect(() => { 
    if (dni) cargarTodo();
    const ahora = new Date();
    setFechaHoraImpresion(`${ahora.toLocaleDateString()} - ${ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
  }, [dni]);

  async function cargarTodo() {
    setLoading(true);
    try {
      const { data: p } = await supabase.from("legajos").select("*").eq("dni", dni).single();
      const { data: l } = await supabase.from("datos_laborales").select("*").eq("dni_agente", dni).single();
      const { data: nov } = await supabase.from("novedades").select("*").eq("dni_agente", dni).order("fecha", { ascending: false });
      if (p) {
        const lab = l || { dni_agente: dni };
        setAgente({ ...p, laborales: lab });
        setFormEdit({ ...p, ...lab, activo: lab.fecha_egreso ? false : true }); 
        setFamilia({ padre: p.nombre_padre || '', madre: p.nombre_madre || '', conyuge: p.nombre_conyuge || '' });
        setHijos(p.nombres_hijos || []);
        setNovedades(nov || []);
      }
    } catch (err) { console.error("Error:", err); }
    setLoading(false);
  }

  const prepararEdicion = (n: any) => {
    setNuevaNovedad({ id: n.id, fecha: n.fecha.split('T')[0], observacion: n.observacion, detalle: n.detalle, usuario_carga: n.usuario_carga || '' });
    const el = document.getElementById("seccion-novedades");
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBorrarNovedad = async (id: number) => {
    if (!confirm("¿Deseas eliminar este registro de novedad permanentemente?")) return;
    await supabase.from("novedades").delete().eq("id", id);
    await cargarTodo();
  };

  const handleGuardarNovedad = async () => {
    if (!nuevaNovedad.observacion || !nuevaNovedad.usuario_carga) return alert("Debe completar el Título y la Firma del responsable.");
    setSubiendoNovedad(true);
    try {
      let urlArchivo = null;
      if (archivoNovedad) {
        const fileName = `nov-${dni}-${Date.now()}`;
        await supabase.storage.from('documentos_novedades').upload(fileName, archivoNovedad);
        urlArchivo = supabase.storage.from('documentos_novedades').getPublicUrl(fileName).data.publicUrl;
      }
      const payload: any = { dni_agente: dni, fecha: nuevaNovedad.fecha, observacion: nuevaNovedad.observacion, detalle: nuevaNovedad.detalle, usuario_carga: nuevaNovedad.usuario_carga };
      if (urlArchivo) payload.archivo_url = urlArchivo;

      if (nuevaNovedad.id) {
        await supabase.from("novedades").update(payload).eq("id", nuevaNovedad.id);
      } else {
        await supabase.from("novedades").insert(payload);
      }
      setNuevaNovedad({ id: null, fecha: new Date().toISOString().split('T')[0], observacion: '', detalle: '', usuario_carga: '' });
      setArchivoNovedad(null);
      await cargarTodo();
    } catch (err: any) { alert(err.message); }
    setSubiendoNovedad(false);
  };

  const handleSavePersonales = async () => {
    try {
      await supabase.from("legajos").update({
        apellido: formEdit.apellido, nombre: formEdit.nombre, sexo: formEdit.sexo, domicile: formEdit.domicilio, barrio: formEdit.barrio, telefono: formEdit.telefono, contacto_emergencia: formEdit.contacto_emergencia, email: formEdit.email, nacionalidad: formEdit.nacionalidad, lugar_nacimiento: formEdit.lugar_nacimiento, fecha_nacimiento: formEdit.fecha_nacimiento, estado_civil: formEdit.estado_civil, nivel_estudios: formEdit.nivel_estudios, nombre_padre: familia.padre, nombre_madre: familia.madre, nombre_conyuge: familia.conyuge, nombres_hijos: hijos
      }).eq("dni", dni);
      setShowModalPersonales(false);
      await cargarTodo();
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveLaborales = async () => {
    try {
      const payload = {
        dni_agente: dni, legajo_interno: formEdit.legajo_interno, legajo_cobro: formEdit.legajo_cobro, secretaria: formEdit.secretaria, subsecretaria: formEdit.subsecretaria, cargo: formEdit.cargo, profesion: formEdit.profesion, fecha_ingreso: formEdit.fecha_ingreso, fecha_egreso: formEdit.activo ? null : formEdit.fecha_egreso, fecha_titulo: formEdit.fecha_titulo, nivel: formEdit.nivel, registro_horario: formEdit.registro_horario, situacion: formEdit.situacion
      };
      await supabase.from("datos_laborales").upsert(payload, { onConflict: 'dni_agente' });
      setShowModalLaborales(false);
      await cargarTodo();
    } catch (err: any) { alert(err.message); }
  };
  
  const agregarHijo = () => setHijos([...hijos, { nombre: '', fecha_nac: '' }]);
  const actualizarHijo = (idx: number, campo: string, v: string) => {
    const nh = [...hijos]; nh[idx][campo] = v; setHijos(nh);
  };

  const glass = { background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", borderRadius: "20px", padding: "25px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "20px" };
  const labelStyle = { color: "#93c5fd", fontSize: "11px", fontWeight: "bold", display: 'block', marginBottom: '5px' };
  const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", background: "#222", color: "white", border: "1px solid #444", fontSize: "14px" };

  if (loading) return <div style={{color:'white', textAlign:'center', marginTop:100}}>Cargando...</div>;

  return (
    <div className="ficha-container" style={{ minHeight: "100vh", padding: "40px", backgroundImage: "url('/LEGAJO.jpg')", backgroundSize: "cover", backgroundAttachment: "fixed", color: "white" }}>
      <style>{`
        @media print {
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          .no-print { display: none !important; }
          
          .ficha-container { 
            background: white !important; 
            background-image: none !important;
            padding: 0 !important; 
            margin: 0 !important;
            color: black !important;
            min-height: auto;
            position: relative;
          }

          .print-header-muni {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid black;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }

          .ficha-container::before {
            content: "";
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 450px; height: 450px;
            background-image: url('/backgrounds/logo_muni.png') !important;
            background-repeat: no-repeat !important;
            background-size: contain !important;
            background-position: center !important;
            opacity: 0.07 !important;
            z-index: -1;
          }

          .glass-print { 
            background: white !important; 
            color: black !important; 
            border: 1px solid #eee !important; 
            backdrop-filter: none !important; 
            box-shadow: none !important;
            border-radius: 10px !important;
            padding: 15px !important;
            margin-bottom: 15px !important;
            page-break-inside: avoid;
          }

          .label-print { color: #555 !important; font-weight: bold !important; font-size: 8pt !important; text-transform: uppercase; }
          .value-print { color: black !important; font-size: 10pt !important; border-bottom: 1px solid #f0f0f0; display: block; }
          
          h1, h2, h3, p, span { color: black !important; }

          .footer-print-oficial {
            position: fixed;
            bottom: 0;
            width: 100%;
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            color: #777 !important;
            border-top: 1px solid #ccc;
            padding-top: 5px;
          }
        }

        .print-header-muni, .footer-print-oficial { display: none; }
        @media print { .print-header-muni, .footer-print-oficial { display: flex; } }
      `}</style>

      <div className="max-width-print" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        
        {/* BOTÓN VOLVER ATRÁS - Agregado aquí */}
        <div className="no-print" style={{ marginBottom: "20px" }}>
   <button 
  onClick={() => window.history.back()} 
  className="no-print" 
  style={{ 
    background: '#374151', 
    color: 'white', 
    padding: '10px 20px', 
    borderRadius: '12px', 
    border: 'none', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    fontWeight: 'bold' 
  }}
>
  ⬅️ VOLVER ATRÁS
</button>
        {/* Cabecera exclusiva para Impresión */}
        <div className="print-header-muni">
           <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <img src="/backgrounds/logo_muni.png" style={{ width: 60 }} alt="Logo" />
              <div>
                <h2 style={{ margin: 0, fontSize: '14pt' }}>MUNICIPALIDAD DE LA CIUDAD DE SALTA</h2>
                <p style={{ margin: 0, fontSize: '9pt' }}>Dirección General de Recursos Humanos</p>
              </div>
           </div>
           <div style={{ textAlign: 'right' }}>
              <h1 style={{ margin: 0, fontSize: '18pt', fontWeight: 900 }}>LEGAJO PERSONAL</h1>
              <p style={{ margin: 0, fontSize: '10pt' }}>DNI: {agente.dni}</p>
           </div>
        </div>

        <header className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900 }}>{agente.apellido}, {agente.nombre}</h1>
            <p style={{color: '#60a5fa'}}>DNI {agente.dni} | Agente Municipal</p>
          </div>
          <button className="no-print" onClick={() => window.print()} style={{ background: "#f59e0b", color: "white", padding: "10px 25px", border: "none", borderRadius: 12, fontWeight: 'bold', cursor: 'pointer' }}>🖨️ IMPRIMIR REPORTE</button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px' }}>
          <aside>
            <div className="glass-print" style={{...glass, textAlign:'center'} as any}>
              <div style={{ width: 180, height: 180, borderRadius: '50%', background: '#000', margin: '0 auto 15px auto', border: '4px solid #2563eb', overflow: 'hidden' }}>
                {agente.foto_url ? <img src={agente.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{fontSize: 60, lineHeight: '180px'}}>👤</span>}
              </div>
              <button className="no-print" onClick={() => fileInputRef.current?.click()} style={{ background: "#2563eb", color: "white", padding: "10px", borderRadius: 8, width: '100%', border: 'none', cursor: 'pointer', fontWeight:'bold' }}>CAMBIAR FOTO</button>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                const fileName = `${dni}-${Date.now()}`;
                await supabase.storage.from('fotos_agentes').upload(fileName, file);
                const url = supabase.storage.from('fotos_agentes').getPublicUrl(fileName).data.publicUrl;
                await supabase.from("legajos").update({ foto_url: url }).eq("dni", dni);
                await cargarTodo();
              }} />
            </div>
          </aside>
          <main>
            {/* SECCIÓN I: PERSONALES */}
            <section className="glass-print" style={glass as any}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom: 15}}>
                <h2 style={{ color: "#60a5fa", fontSize: 18 }}>I. INFORMACIÓN PERSONAL Y CIVIL</h2>
                <button className="no-print" onClick={() => setShowModalPersonales(true)} style={{background:'#2563eb', border:'none', color:'white', padding:'6px 15px', borderRadius:8, cursor:'pointer'}}>✏️ EDITAR</button>
              </div>
              <div className="grid-print-layout" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
                <div><span className="label-print" style={labelStyle}>Sexo</span><p className="value-print">{agente.sexo || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Fecha Nac.</span><p className="value-print">{formatearFecha(agente.fecha_nacimiento)}</p></div>
                <div><span className="label-print" style={labelStyle}>Edad</span><p className="value-print">{calcularEdad(agente.fecha_nacimiento)}</p></div>
                <div><span className="label-print" style={labelStyle}>Est. Civil</span><p className="value-print">{agente.estado_civil || "S/D"}</p></div>
                <div style={{gridColumn:'span 2'}}><span className="label-print" style={labelStyle}>Domicilio</span><p className="value-print">{agente.domicilio || "S/D"}</p></div>
                <div style={{gridColumn:'span 2'}}><span className="label-print" style={labelStyle}>Barrio</span><p className="value-print">{agente.barrio || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Teléfono</span><p className="value-print">{agente.telefono || "S/D"}</p></div>
                <div style={{gridColumn:'span 2'}}><span className="label-print" style={labelStyle}>Email</span><p className="value-print">{agente.email || "S/D"}</p></div>
                <div><span className="label-print" style={labelStyle}>Estudios</span><p className="value-print">{agente.nivel_estudios || "S/D"}</p></div>
              </div>
            </section>

            {/* SECCIÓN II: LABORALES */}
            <section className="glass-print" style={glass as any}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom: 15}}>
                <h2 style={{ color: "#60a5fa", fontSize: 18 }}>II. SITUACIÓN LABORAL MUNICIPAL</h2>
                <button className="no-print" onClick={() => setShowModalLaborales(true)} style={{background:'#2563eb', border:'none', color:'white', padding:'6px 15px', borderRadius:8, cursor:'pointer'}}>✏️ EDITAR</button>
              </div>
              <div className="grid-print-layout" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
                <div><span className="label-print" style={labelStyle}>Leg. Interno</span><p className="value-print">{agente.laborales?.legajo_interno || "-"}</p></div>
                <div><span className="label-print" style={labelStyle}>Leg. Cobro</span><p className="value-print">{agente.laborales?.legajo_cobro || "-"}</p></div>
                <div style={{gridColumn:'span 2'}}><span className="label-print" style={labelStyle}>Secretaría</span><p className="value-print">{agente.laborales?.secretaria || "-"}</p></div>
                <div style={{gridColumn:'span 2'}}><span className="label-print" style={labelStyle}>Subsecretaría</span><p className="value-print">{agente.laborales?.subsecretaria || "-"}</p></div>
                <div style={{gridColumn:'span 2'}}><span className="label-print" style={labelStyle}>Cargo / Función</span><p className="value-print">{agente.laborales?.cargo || "-"}</p></div>
                <div><span className="label-print" style={labelStyle}>F. Ingreso</span><p className="value-print">{formatearFecha(agente.laborales?.fecha_ingreso)}</p></div>
                <div><span className="label-print" style={labelStyle}>Situación</span><p className="value-print">{agente.laborales?.situacion || "-"}</p></div>
                <div><span className="label-print" style={labelStyle}>Registro</span><p className="value-print">{agente.laborales?.registro_horario || "-"}</p></div>
                <div><span className="label-print" style={labelStyle}>Estado</span><p className="value-print" style={{fontWeight:'bold', color: agente.laborales?.fecha_egreso ? '#ef4444' : '#22c55e'}}>{agente.laborales?.fecha_egreso ? `BAJA (${formatearFecha(agente.laborales.fecha_egreso)})` : "ACTIVO"}</p></div>
              </div>
            </section>

            {/* SECCIÓN III: NOVEDADES */}
            <section id="seccion-novedades" className="glass-print" style={glass as any}>
              <h2 style={{ color: "#60a5fa", fontSize: 18, marginBottom: 20 }}>III. HISTORIAL DE NOVEDADES</h2>
              
              <div className="no-print" style={{ background: '#111', padding: '20px', borderRadius: '15px', marginBottom: 25, border: '1px solid #333' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 180px', gap: 15, marginBottom: 15 }}>
                   <div><label style={labelStyle}>Fecha</label><input type="date" style={inputStyle} value={nuevaNovedad.fecha} onChange={e=>setNuevaNovedad({...nuevaNovedad, fecha:e.target.value})} /></div>
                   <div><label style={labelStyle}>Título de la Novedad</label><input style={inputStyle} placeholder="Ej: Presentó Certificado Médico" value={nuevaNovedad.observacion} onChange={e=>setNuevaNovedad({...nuevaNovedad, observacion:e.target.value})} /></div>
                   <div><label style={{...labelStyle, color:'#f59e0b'}}>Firma Responsable</label><input style={{...inputStyle, border:'1px solid #f59e0b'}} placeholder="Quién carga?" value={nuevaNovedad.usuario_carga} onChange={e=>setNuevaNovedad({...nuevaNovedad, usuario_carga:e.target.value})} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px', gap: 15 }}>
                   <textarea style={{...inputStyle, height:50}} placeholder="Descripción o detalle de la novedad..." value={nuevaNovedad.detalle} onChange={e=>setNuevaNovedad({...nuevaNovedad, detalle:e.target.value})} />
                   <button onClick={()=>fileInputNovedadRef.current?.click()} style={{background:'#374151', color:'white', border:'1px dashed #666', borderRadius:10, cursor:'pointer'}}>{archivoNovedad ? "📎 LISTO" : "📎 ADJUNTAR"}</button>
                   <input type="file" ref={fileInputNovedadRef} hidden onChange={e=>setArchivoNovedad(e.target.files?.[0] || null)} />
                   <button onClick={handleGuardarNovedad} disabled={subiendoNovedad} style={{ background: nuevaNovedad.id ? '#f59e0b' : '#16a34a', color: 'white', borderRadius: 10, border: 'none', fontWeight:'bold', cursor:'pointer' }}>{nuevaNovedad.id ? "ACTUALIZAR" : "REGISTRAR"}</button>
                </div>
                {nuevaNovedad.id && <p onClick={()=>setNuevaNovedad({id:null, fecha:new Date().toISOString().split('T')[0], observacion:'', detalle:'', usuario_carga:''})} style={{color:'#94a3b8', fontSize:11, textAlign:'right', marginTop:10, cursor:'pointer'}}>✖ Cancelar edición</p>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {novedades.map((n) => {
                  const fechaLimpia = formatearFecha(n.fecha);
                  const [anio, mesNum, dia] = fechaLimpia.split('-');
                  const mesTexto = new Date(fechaLimpia + "T12:00:00").toLocaleString('es-ES', { month: 'short' });

                  return (
                    <div key={n.id} className="glass-print" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '15px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center', minWidth: '70px', borderRight: '1px solid #333', paddingRight: '15px' }}>
                          <span style={{ fontSize: 18, fontWeight: '900', display: 'block' }}>{dia}</span>
                          <span style={{ fontSize: 10, color: '#60a5fa', textTransform:'uppercase', display: 'block' }}>{mesTexto}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginTop: '2px' }}>{anio}</span>
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 15, color: '#fff' }}>{n.observacion}</h4>
                          <p style={{ margin: '4px 0', fontSize: 12, color: '#94a3b8', lineHeight: '1.4' }}>{n.detalle}</p>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems:'center' }}>
                            <span style={{ background: '#1e293b', color: '#f59e0b', fontSize: '10px', padding: '3px 8px', borderRadius: '5px', fontWeight: 'bold' }}>FIRMADO POR: {n.usuario_carga}</span>
                            {n.archivo_url && <a href={n.archivo_url} target="_blank" className="no-print" style={{ color: '#4ade80', fontSize: '11px', fontWeight: 'bold', textDecoration:'none' }}>📄 VER ADJUNTO</a>}
                          </div>
                        </div>
                      </div>
                      <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => prepararEdicion(n)} style={{ background: '#222', border: '1px solid #444', color: '#fbbf24', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleBorrarNovedad(n.id)} style={{ background: '#222', border: '1px solid #444', color: '#f87171', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
                {novedades.length === 0 && <p style={{textAlign:'center', opacity:0.5, padding:20}}>No hay novedades registradas.</p>}
              </div>
            </section>
          </main>
        </div>

        {/* Pie de página Oficial para Impresión */}
        <footer className="footer-print-oficial">
           <span>Usuario: {usuarioImpresion}</span>
           <span>Generado el: {fechaHoraImpresion}</span>
           <span>Hoja 1 de 1</span>
        </footer>

        {/* MODAL PERSONALES */}
        {showModalPersonales && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:2000, display:'flex', justifyContent:'center', alignItems:'center', padding:20 }}>
            <div style={{ background:'#111', padding:30, borderRadius:24, width:'100%', maxWidth:900, maxHeight:'90vh', overflowY:'auto', border:'1px solid #333' }}>
              <h2 style={{color:'#60a5fa', marginBottom:20}}>Editar Datos Personales y Familiares</h2>
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:15}}>
                <div><label style={labelStyle}>Apellido</label><input style={inputStyle} value={formEdit.apellido} onChange={e=>setFormEdit({...formEdit, apellido:e.target.value})} /></div>
                <div><label style={labelStyle}>Nombre</label><input style={inputStyle} value={formEdit.nombre} onChange={e=>setFormEdit({...formEdit, nombre:e.target.value})} /></div>
                <div><label style={labelStyle}>Sexo</label><select style={inputStyle} value={formEdit.sexo} onChange={e=>setFormEdit({...formEdit, sexo:e.target.value})}><option value="">Seleccionar</option><option value="MASCULINO">MASCULINO</option><option value="FEMENINO">FEMENINO</option></select></div>
                <div><label style={labelStyle}>F. Nacimiento</label><input type="date" style={inputStyle} value={formatearFecha(formEdit.fecha_nacimiento)} onChange={e=>setFormEdit({...formEdit, fecha_nacimiento:e.target.value})} /></div>
                <div><label style={labelStyle}>Estado Civil</label><select style={inputStyle} value={formEdit.estado_civil} onChange={e=>setFormEdit({...formEdit, estado_civil:e.target.value})}>{ESTADOS_CIVILES.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                <div><label style={labelStyle}>Nivel Estudios</label><select style={inputStyle} value={formEdit.nivel_estudios} onChange={e=>setFormEdit({...formEdit, nivel_estudios:e.target.value})}>{NIVELES_ESTUDIO.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Domicilio</label><input style={inputStyle} value={formEdit.domicilio} onChange={e=>setFormEdit({...formEdit, domicilio:e.target.value})} /></div>
                <div><label style={labelStyle}>Barrio</label><input style={inputStyle} value={formEdit.barrio} onChange={e=>setFormEdit({...formEdit, barrio:e.target.value})} /></div>
                
                <div style={{gridColumn:'span 3', borderTop:'1px solid #333', marginTop:10, paddingTop:15, color:'#93c5fd', fontWeight:'bold'}}>Grupo Familiar</div>
                <input style={inputStyle} value={familia.padre} placeholder="Nombre Padre" onChange={e=>setFamilia({...familia, padre:e.target.value})} />
                <input style={inputStyle} value={familia.madre} placeholder="Nombre Madre" onChange={e=>setFamilia({...familia, madre:e.target.value})} />
                <input style={inputStyle} value={familia.conyuge} placeholder="Cónyuge" onChange={e=>setFamilia({...familia, conyuge:e.target.value})} />
                
                <div style={{gridColumn:'span 3'}}>
                   <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}><span style={labelStyle}>HIJOS CARGADOS</span><button onClick={agregarHijo} style={{background:'#2563eb', border:'none', color:'white', padding:'4px 12px', borderRadius:6, cursor:'pointer'}}>+ Añadir Hijo</button></div>
                   {hijos.map((h,i)=>(
                     <div key={i} style={{display:'flex', gap:10, marginBottom:8, background:'#1a1a1a', padding:8, borderRadius:10}}>
                        <input style={inputStyle} value={h.nombre} placeholder="Nombre y Apellido" onChange={e=>actualizarHijo(i,'nombre',e.target.value)} />
                        <input type="date" style={inputStyle} value={formatearFecha(h.fecha_nac)} onChange={e=>actualizarHijo(i,'fecha_nac',e.target.value)} />
                        <button onClick={()=>setHijos(hijos.filter((_,idx)=>idx!==i))} style={{background:'#7f1d1d', border:'none', color:'white', padding:'0 15px', borderRadius:8}}>Eliminar</button>
                     </div>
                   ))}
                </div>
              </div>
              <div style={{display:'flex', gap:15, marginTop:25}}>
                <button onClick={handleSavePersonales} style={{flex:2, background:'#16a34a', color:'white', padding:16, borderRadius:12, border:'none', fontWeight:'bold', cursor:'pointer'}}>GUARDAR CAMBIOS</button>
                <button onClick={()=>setShowModalPersonales(false)} style={{flex:1, background:'#444', color:'white', padding:16, borderRadius:12, border:'none', cursor:'pointer'}}>CANCELAR</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL LABORALES */}
        {showModalLaborales && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:2000, display:'flex', justifyContent:'center', alignItems:'center', padding:20 }}>
            <div style={{ background:'#111', padding:30, borderRadius:24, width:'100%', maxWidth:800, border:'1px solid #333' }}>
              <h2 style={{color:'#60a5fa', marginBottom:20}}>Editar Situación Laboral</h2>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15}}>
                <div><label style={labelStyle}>Legajo Interno</label><input style={inputStyle} value={formEdit.legajo_interno} onChange={e=>setFormEdit({...formEdit, legajo_interno:e.target.value})} /></div>
                <div><label style={labelStyle}>Legajo Cobro</label><input style={inputStyle} value={formEdit.legajo_cobro} onChange={e=>setFormEdit({...formEdit, legajo_cobro:e.target.value})} /></div>
                <div><label style={labelStyle}>Secretaría</label><select style={inputStyle} value={formEdit.secretaria} onChange={e=>setFormEdit({...formEdit, secretaria:e.target.value})}>{SECRETARIAS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <div><label style={labelStyle}>Subsecretaría</label><input style={inputStyle} value={formEdit.subsecretaria} onChange={e=>setFormEdit({...formEdit, subsecretaria:e.target.value})} /></div>
                <div><label style={labelStyle}>Cargo</label><input style={inputStyle} value={formEdit.cargo} onChange={e=>setFormEdit({...formEdit, cargo:e.target.value})} /></div>
                <div><label style={labelStyle}>Profesión / Título</label><input style={inputStyle} value={formEdit.profesion} onChange={e=>setFormEdit({...formEdit, profesion:e.target.value})} /></div>
                <div><label style={labelStyle}>F. Ingreso</label><input type="date" style={inputStyle} value={formatearFecha(formEdit.fecha_ingreso)} onChange={e=>setFormEdit({...formEdit, fecha_ingreso:e.target.value})} /></div>
                <div><label style={labelStyle}>Situación de Revista</label><select style={inputStyle} value={formEdit.situacion} onChange={e=>setFormEdit({...formEdit, situacion:e.target.value})}>{SITUACIONES_LABORALES.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
                <div><label style={labelStyle}>Control de Horario</label><select style={inputStyle} value={formEdit.registro_horario} onChange={e=>setFormEdit({...formEdit, registro_horario:e.target.value})}>{OPCIONES_REGISTRO.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select style={inputStyle} value={formEdit.activo ? "SI" : "NO"} onChange={e=>setFormEdit({...formEdit, activo: e.target.value === "SI"})}>
                    <option value="SI">ACTIVO</option><option value="NO">BAJA</option>
                  </select>
                </div>
                {!formEdit.activo && (
                  <div style={{gridColumn:'span 2'}}><label style={labelStyle}>Fecha de Egreso / Baja</label><input type="date" style={{...inputStyle, borderColor:'#ef4444'}} value={formatearFecha(formEdit.fecha_egreso)} onChange={e=>setFormEdit({...formEdit, fecha_egreso:e.target.value})} /></div>
                )}
              </div>
              <div style={{display:'flex', gap:15, marginTop:25}}>
                <button onClick={handleSaveLaborales} style={{flex:2, background:'#16a34a', color:'white', padding:16, borderRadius:12, border:'none', fontWeight:'bold', cursor:'pointer'}}>ACTUALIZAR DATOS</button>
                <button onClick={()=>setShowModalLaborales(false)} style={{flex:1, background:'#444', color:'white', padding:16, borderRadius:12, border:'none', cursor:'pointer'}}>CANCELAR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

