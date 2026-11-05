import { useEffect, useMemo, useState } from "react";
import {
  modoLocal,
  SUCURSALES_DEFAULT,
  escucharUsuario,
  entrarConGoogle,
  salir,
  suscribirPrestamos,
  crearPrestamo,
  actualizarPrestamo,
  eliminarPrestamo,
  suscribirConfig,
  guardarConfig,
} from "./store.js";
import { Muestra, MuestraSucursal, Logo, Icono } from "./visual.jsx";
import { colorDeTono, colorSucursal } from "./colores.js";

/* ================= Utilidades ================= */

const UNIDADES = ["unidad", "lata 1 L", "lata 4 L", "lata 10 L", "lata 20 L", "litro", "kg", "metro", "caja"];
const FORMAS_DEVOLUCION = ["Mercadería", "Factura / pago", "Otro"];
const DIAS_ALERTA = 7;

const nuevoItem = () => ({ id: crypto.randomUUID(), producto: "", codigo: "", color: "", cantidad: 1, unidad: "unidad", devuelto: 0 });

const fechaCorta = (iso) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const fechaHora = (iso) =>
  new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const diasDesde = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

function estadoDe(p) {
  const items = p.items || [];
  if (items.length && items.every((i) => (i.devuelto || 0) >= i.cantidad)) return "devuelto";
  if (items.some((i) => (i.devuelto || 0) > 0)) return "parcial";
  return "pendiente";
}
const ETIQUETA_ESTADO = { pendiente: "Pendiente", parcial: "Devuelto en parte", devuelto: "Devuelto" };

const describirItem = (i) =>
  `${i.cantidad} × ${i.unidad} ${i.producto}${i.color ? ` (${i.color})` : ""}${i.codigo ? ` [${i.codigo}]` : ""}`;

function textoWhatsApp(p) {
  const pend = p.items.filter((i) => (i.devuelto || 0) < i.cantidad);
  return [
    `*Préstamo ${p.origen} → ${p.destino}*`,
    `Fecha: ${fechaCorta(p.fecha)}`,
    ...p.items.map((i) => `• ${describirItem(i)}${i.devuelto ? ` — devuelto ${i.devuelto}` : ""}`),
    p.retira ? `Retiró: ${p.retira}` : "",
    p.notas ? `Nota: ${p.notas}` : "",
    pend.length ? `Pendiente de devolver: ${pend.length} producto(s)` : "✅ Devuelto completo",
  ]
    .filter(Boolean)
    .join("\n");
}

function filasExport(prestamos) {
  const filas = [["Fecha", "Origen (presta)", "Destino (recibe)", "Producto", "Código", "Color", "Cantidad", "Unidad", "Devuelto", "Estado", "Entregó", "Retiró", "Notas"]];
  prestamos.forEach((p) =>
    p.items.forEach((i) =>
      filas.push([fechaCorta(p.fecha), p.origen, p.destino, i.producto, i.codigo, i.color, i.cantidad, i.unidad, i.devuelto || 0, ETIQUETA_ESTADO[estadoDe(p)], p.entrega, p.retira, p.notas]),
    ),
  );
  return filas;
}

const enPaginaClaude = import.meta.env.VITE_PAGINA_CLAUDE === "1";

function copiarParaExcel(prestamos) {
  const texto = filasExport(prestamos)
    .map((f) => f.map((c) => String(c ?? "").replace(/[\t\n]/g, " ")).join("\t"))
    .join("\n");
  return navigator.clipboard.writeText(texto);
}

function exportarCSV(prestamos) {
  const filas = filasExport(prestamos);
  const csv = filas.map((f) => f.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `prestamos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function usePerfil() {
  const [perfil, setPerfilState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pint_perfil")) || null;
    } catch {
      return null;
    }
  });
  const setPerfil = (p) => {
    setPerfilState(p);
    try {
      if (p) localStorage.setItem("pint_perfil", JSON.stringify(p));
      else localStorage.removeItem("pint_perfil");
    } catch {
      /* sin almacenamiento */
    }
  };
  return [perfil, setPerfil];
}

/* ================= App ================= */

export default function App() {
  const [usuario, setUsuario] = useState(undefined);
  const [perfil, setPerfil] = usePerfil();
  const [prestamos, setPrestamos] = useState([]);
  const [config, setConfig] = useState({});
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pendientes");
  const [aviso, setAviso] = useState("");

  useEffect(() => escucharUsuario((u) => setUsuario(u || null)), []);

  useEffect(() => {
    if (!usuario) return;
    const u1 = suscribirPrestamos(setPrestamos, (e) =>
      setError(e.code === "permission-denied" ? "Sin permiso para leer los préstamos. Revisá las reglas de Firestore (ver README)." : e.message),
    );
    const u2 = suscribirConfig(setConfig);
    return () => {
      u1();
      u2();
    };
  }, [usuario]);

  const sucursales = config.sucursales?.length ? config.sucursales : SUCURSALES_DEFAULT;

  const notificar = (msg) => {
    setAviso(msg);
    setTimeout(() => setAviso(""), 2500);
  };
  const conError = (fn) => async (...args) => {
    try {
      await fn(...args);
      return true;
    } catch (e) {
      setError("No se pudo guardar: " + (e.message || e));
      return false;
    }
  };

  if (usuario === undefined) return <div className="centro"><div className="spinner" /></div>;
  if (!usuario) return <Login />;
  if (!perfil || !sucursales.includes(perfil.sucursal))
    return <ElegirPerfil sucursales={sucursales} inicial={perfil} nombreSugerido={usuario.displayName}
        onListo={async (p, esNueva) => {
          if (esNueva && !(await conError(guardarConfig)({ sucursales: [...sucursales, p.sucursal] }))) return;
          setPerfil(p);
        }}
      />;

  const usuarioTxt = perfil.nombre || usuario.displayName || usuario.email;

  return (
    <div className="app">
      <header className="cabecera">
        <div className="cabecera-marca">
          <Logo tam={34} />
          <div>
            <div className="marca">Préstamos entre sucursales</div>
            <button className="chip-sucursal" onClick={() => setTab("ajustes")} title="Cambiar sucursal">
              <MuestraSucursal nombre={perfil.sucursal} /> <b>{perfil.sucursal}</b> <span className="suave">{usuarioTxt}</span>
            </button>
          </div>
        </div>
        {modoLocal && <span className="etiqueta-prueba">Modo prueba</span>}
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="contenido">
        {tab === "pendientes" && (
          <Pendientes
            prestamos={prestamos}
            miSucursal={perfil.sucursal}
            usuario={usuarioTxt}
            onDevolver={conError(actualizarPrestamo)}
            notificar={notificar}
          />
        )}
        {tab === "nuevo" && (
          <NuevoPrestamo
            sucursales={sucursales}
            miSucursal={perfil.sucursal}
            usuario={usuarioTxt}
            prestamos={prestamos}
            onGuardar={async (datos, sucursalNueva) => {
              if (sucursalNueva) await conError(guardarConfig)({ sucursales: [...sucursales, sucursalNueva] });
              if (await conError(crearPrestamo)(datos)) {
                notificar("Préstamo registrado ✔");
                setTab("pendientes");
              }
            }}
          />
        )}
        {tab === "saldos" && <Saldos prestamos={prestamos} miSucursal={perfil.sucursal} />}
        {tab === "historial" && (
          <Historial prestamos={prestamos} miSucursal={perfil.sucursal} onEliminar={conError(eliminarPrestamo)} />
        )}
        {tab === "ajustes" && (
          <Ajustes
            key={sucursales.join("|")}
            perfil={perfil}
            sucursales={sucursales}
            onPerfil={(p) => {
              setPerfil(p);
              notificar("Perfil actualizado");
            }}
            onSucursales={async (lista) => {
              if (await conError(guardarConfig)({ sucursales: lista })) notificar("Sucursales guardadas");
            }}
            onSalir={() => {
              setPerfil(null);
              salir();
            }}
          />
        )}
      </main>

      {aviso && <div className="toast">{aviso}</div>}

      <nav className="tabs">
        {[
          ["pendientes", "pendientes", "Pendientes"],
          ["nuevo", "nuevo", "Nuevo"],
          ["saldos", "saldos", "Saldos"],
          ["historial", "historial", "Historial"],
          ["ajustes", "ajustes", "Ajustes"],
        ].map(([id, ic, txt]) => (
          <button key={id} className={tab === id ? "activo" : ""} onClick={() => setTab(id)}>
            <span className="tab-icono"><Icono nombre={ic} /></span>
            {txt}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ================= Pantallas de acceso ================= */

function Login() {
  const [cargando, setCargando] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="centro">
      <div className="tarjeta acceso">
        <Logo tam={64} />
        <h1>Préstamos entre sucursales</h1>
        <p className="suave">Registrá qué productos se prestan entre sucursales y controlá que vuelvan.</p>
        <button
          className="btn primario"
          disabled={cargando}
          onClick={async () => {
            setCargando(true);
            setErr("");
            try {
              await entrarConGoogle();
            } catch (e) {
              if (e.code !== "auth/popup-closed-by-user") setErr("No se pudo iniciar sesión. Probá de nuevo.");
            }
            setCargando(false);
          }}
        >
          {cargando ? "Ingresando…" : "Entrar con Google"}
        </button>
        {err && <p className="texto-error">{err}</p>}
      </div>
    </div>
  );
}

function ElegirPerfil({ sucursales, inicial, nombreSugerido, onListo }) {
  const [texto, setTexto] = useState(inicial?.sucursal || "");
  const limpio = texto.trim().replace(/\s+/g, " ");
  const sucursal = sucursales.find((s) => s.toLowerCase() === limpio.toLowerCase()) || limpio;
  const esNueva = sucursal && !sucursales.includes(sucursal);
  const [nombre, setNombre] = useState(inicial?.nombre || (nombreSugerido || "").split(" ")[0]);
  return (
    <div className="centro">
      <div className="tarjeta acceso">
        <Logo tam={64} />
        <h1>¿En qué sucursal estás?</h1>
        <p className="suave">Se guarda en este dispositivo. Podés cambiarla después en Ajustes.</p>
        <Campo label="Sucursal">
          <input
            id="mi-sucursal"
            list="lista-mi-sucursal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí el nombre de tu sucursal"
            autoComplete="off"
          />
          <datalist id="lista-mi-sucursal">
            {sucursales.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Campo>
        {sucursales.length <= 8 && (
          <div className="grilla-sucursales">
            {sucursales.map((s) => (
              <button key={s} className={`opcion ${sucursal === s ? "elegida" : ""}`} onClick={() => setTexto(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {esNueva && <p className="ayuda">“{sucursal}” no está en la lista: se va a agregar.</p>}
        <Campo label="Tu nombre">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan" />
        </Campo>
        <button className="btn primario" disabled={!sucursal || !nombre.trim()} onClick={() => onListo({ sucursal, nombre: nombre.trim() }, esNueva)}>
          Continuar
        </button>
      </div>
    </div>
  );
}

/* ================= Componentes chicos ================= */

function Campo({ label, children }) {
  return (
    <label className="campo">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Segmentado({ opciones, valor, onChange }) {
  return (
    <div className="segmentado">
      {opciones.map(([v, txt]) => (
        <button key={v} className={valor === v ? "activo" : ""} onClick={() => onChange(v)}>
          {txt}
        </button>
      ))}
    </div>
  );
}

function Vacio({ icono, texto }) {
  return (
    <div className="vacio">
      <div className="vacio-icono"><Icono nombre={icono} tam={36} /></div>
      <p>{texto}</p>
    </div>
  );
}

/* ================= Pendientes ================= */

function Pendientes({ prestamos, miSucursal, usuario, onDevolver, notificar }) {
  const [vista, setVista] = useState("prestamos");
  const [devolviendo, setDevolviendo] = useState(null);

  const abiertos = prestamos.filter((p) => estadoDe(p) !== "devuelto");
  const enviados = abiertos.filter((p) => p.origen === miSucursal).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const recibidos = abiertos.filter((p) => p.destino === miSucursal).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const [filtro, setFiltro] = useState(null);
  const base = vista === "prestamos" ? enviados : recibidos;
  const contraparte = (p) => (p.origen === miSucursal ? p.destino : p.origen);
  const conteo = {};
  base.forEach((p) => {
    const c = contraparte(p);
    conteo[c] = (conteo[c] || 0) + 1;
  });
  const carta = Object.entries(conteo).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
  const filtroActivo = filtro && conteo[filtro] ? filtro : null;
  const lista = filtroActivo ? base.filter((p) => contraparte(p) === filtroActivo) : base;

  return (
    <>
      <Segmentado
        valor={vista}
        onChange={setVista}
        opciones={[
          ["prestamos", `Prestamos nosotros (${enviados.length})`],
          ["nos-prestaron", `Nos prestaron (${recibidos.length})`],
        ]}
      />
      <p className="ayuda">
        {vista === "prestamos"
          ? "Productos que salieron de tu sucursal y todavía no volvieron."
          : "Productos que te prestaron otras sucursales y tenés que devolver."}
      </p>
      {carta.length > 1 && (
        <div className="carta" role="group" aria-label="Filtrar por sucursal">
          {carta.map(([nombre, n]) => (
            <button
              key={nombre}
              className={`chip-color ${filtroActivo === nombre ? "activo" : ""}`}
              style={{ "--m": colorSucursal(nombre) }}
              aria-pressed={filtroActivo === nombre}
              onClick={() => setFiltro(filtroActivo === nombre ? null : nombre)}
            >
              <span className="chip-color-tinta" />
              <span className="chip-color-nombre">{nombre}</span>
              <span className="chip-color-n">
                {n} {n === 1 ? "préstamo" : "préstamos"}
              </span>
            </button>
          ))}
        </div>
      )}
      {filtroActivo && (
        <p className="ayuda">
          Mostrando solo {filtroActivo}.{" "}
          <button className="link" onClick={() => setFiltro(null)}>
            Ver todas
          </button>
        </p>
      )}
      {lista.length === 0 ? (
        <Vacio icono="vacio" texto="No hay nada pendiente acá." />
      ) : (
        lista.map((p) => (
          <TarjetaPrestamo
            key={p.id}
            p={p}
            miSucursal={miSucursal}
            acciones={
              <>
                <button className="btn primario chico" onClick={() => setDevolviendo(p)}>
                  Registrar devolución
                </button>
                <a className="btn secundario chico" href={`https://wa.me/?text=${encodeURIComponent(textoWhatsApp(p))}`} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </>
            }
          />
        ))
      )}
      {devolviendo && (
        <ModalDevolucion
          p={devolviendo}
          usuario={usuario}
          miSucursal={miSucursal}
          onCerrar={() => setDevolviendo(null)}
          onGuardar={async (cambios) => {
            if (await onDevolver(devolviendo.id, cambios)) {
              setDevolviendo(null);
              notificar("Devolución registrada ✔");
            }
          }}
        />
      )}
    </>
  );
}

function TarjetaPrestamo({ p, miSucursal, acciones }) {
  const [abierto, setAbierto] = useState(false);
  const estado = estadoDe(p);
  const dias = diasDesde(p.fecha);
  const atrasado = estado !== "devuelto" && dias >= DIAS_ALERTA;

  return (
    <article className={`tarjeta prestamo ${atrasado ? "atrasado" : ""}`}>
      <div className="prestamo-cabecera">
        <div>
          <div className="ruta">
            <span className={`ruta-punto ${p.origen === miSucursal ? "propia" : ""}`}>
              <MuestraSucursal nombre={p.origen} grande /> {p.origen}
            </span>
            <Icono nombre="flecha" tam={16} />
            <span className={`ruta-punto ${p.destino === miSucursal ? "propia" : ""}`}>
              <MuestraSucursal nombre={p.destino} grande /> {p.destino}
            </span>
          </div>
          <div className="suave chico">
            {fechaCorta(p.fecha)}, hace {dias === 0 ? "menos de 1 día" : `${dias} día${dias === 1 ? "" : "s"}`}
          </div>
        </div>
        <span className={`estado ${estado} ${atrasado ? "alerta" : ""}`}>{atrasado ? <><Icono nombre="alerta" tam={13} /> {dias} días</> : ETIQUETA_ESTADO[estado]}</span>
      </div>
      <ul className="items">
        {p.items.map((i) => (
          <li key={i.id} className={(i.devuelto || 0) >= i.cantidad ? "tachado" : ""}>
            <span className="item-cant">
              <b>{i.cantidad}</b>
              <small>{i.unidad}</small>
            </span>
            <span className="item-desc">
              <span>{i.producto}</span>
              {(i.color || i.codigo) && (
                <span className="item-meta">
                  {i.color && (
                    <span className="tono">
                      {colorDeTono(i.color) && <Muestra color={colorDeTono(i.color)} />}
                      {i.color}
                    </span>
                  )}
                  {i.codigo && <span className="codigo">{i.codigo}</span>}
                </span>
              )}
            </span>
            {i.devuelto > 0 && (
              <span className="devuelto-badge">
                {i.devuelto}/{i.cantidad}
              </span>
            )}
          </li>
        ))}
      </ul>
      <button className="link" onClick={() => setAbierto(!abierto)}>
        {abierto ? "Ocultar detalle" : "Ver detalle"}
      </button>
      {abierto && (
        <div className="detalle">
          {p.entrega && <div>Entregó: <b>{p.entrega}</b></div>}
          {p.retira && <div>Retiró / recibió: <b>{p.retira}</b></div>}
          {p.notas && <div>Notas: {p.notas}</div>}
          <div className="movimientos">
            {(p.movimientos || []).map((m, idx) => (
              <div key={idx} className="movimiento">
                <span className="suave">{fechaHora(m.fecha)}</span> {m.texto} <span className="suave">({m.usuario})</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {acciones && <div className="acciones">{acciones}</div>}
    </article>
  );
}

function ModalDevolucion({ p, usuario, miSucursal, onCerrar, onGuardar }) {
  const pendientes = p.items.filter((i) => (i.devuelto || 0) < i.cantidad);
  const [cant, setCant] = useState(() => Object.fromEntries(pendientes.map((i) => [i.id, i.cantidad - (i.devuelto || 0)])));
  const [forma, setForma] = useState(FORMAS_DEVOLUCION[0]);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  const total = Object.values(cant).reduce((a, b) => a + (Number(b) || 0), 0);

  const guardar = async () => {
    setGuardando(true);
    const detalle = [];
    const items = p.items.map((i) => {
      const n = Math.min(Number(cant[i.id]) || 0, i.cantidad - (i.devuelto || 0));
      if (n > 0) detalle.push(`${n} ${i.unidad} ${i.producto}`);
      return n > 0 ? { ...i, devuelto: (i.devuelto || 0) + n } : i;
    });
    const texto = `Devolución (${forma}) registrada en ${miSucursal}: ${detalle.join(", ")}${nota ? ` — ${nota}` : ""}`;
    await onGuardar({
      items,
      movimientos: [...(p.movimientos || []), { fecha: new Date().toISOString(), texto, usuario }],
    });
    setGuardando(false);
  };

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Registrar devolución</h2>
        <p className="suave chico">
          De {p.origen} a {p.destino}, {fechaCorta(p.fecha)}
        </p>
        {pendientes.map((i) => {
          const max = i.cantidad - (i.devuelto || 0);
          return (
            <div key={i.id} className="fila-devolucion">
              <div>
                <div>{i.producto}</div>
                <div className="suave chico">
                  {i.unidad}, faltan {max}
                </div>
              </div>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max={max}
                value={cant[i.id]}
                onChange={(e) => setCant({ ...cant, [i.id]: e.target.value === "" ? "" : Math.max(0, Math.min(max, Number(e.target.value))) })}
              />
            </div>
          );
        })}
        <Campo label="¿Cómo se devolvió?">
          <select value={forma} onChange={(e) => setForma(e.target.value)}>
            {FORMAS_DEVOLUCION.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Nota (opcional)">
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: vino con el flete del martes" />
        </Campo>
        <div className="acciones">
          <button className="btn secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn primario" disabled={total <= 0 || guardando} onClick={guardar}>
            {guardando ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Nuevo préstamo ================= */

function NuevoPrestamo({ sucursales, miSucursal, usuario, prestamos, onGuardar }) {
  const otras = useMemo(() => {
    const set = new Set(sucursales);
    prestamos.forEach((p) => {
      set.add(p.origen);
      set.add(p.destino);
    });
    set.delete(miSucursal);
    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
  }, [sucursales, prestamos, miSucursal]);
  const [sentido, setSentido] = useState("enviamos");
  const [otraTexto, setOtraTexto] = useState("");
  const [items, setItems] = useState([nuevoItem()]);
  const [entrega, setEntrega] = useState(usuario);
  const [retira, setRetira] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const productosConocidos = useMemo(() => {
    const set = new Set();
    prestamos.forEach((p) => p.items.forEach((i) => i.producto && set.add(i.producto)));
    return [...set].sort();
  }, [prestamos]);

  const cambiarItem = (id, campo, valor) => setItems(items.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
  const validos = items.filter((i) => i.producto.trim() && Number(i.cantidad) > 0);
  const normalizar = (t) => t.trim().replace(/\s+/g, " ").toLowerCase();
  const coincidencia = otras.find((s) => normalizar(s) === normalizar(otraTexto));
  const otra = coincidencia || otraTexto.trim().replace(/\s+/g, " ");
  const esMia = normalizar(otraTexto) === normalizar(miSucursal);
  const esNueva = otra && !esMia && !coincidencia;
  const puedeGuardar = otra && !esMia && validos.length > 0 && !guardando;

  const guardar = async () => {
    setGuardando(true);
    const origen = sentido === "enviamos" ? miSucursal : otra;
    const destino = sentido === "enviamos" ? otra : miSucursal;
    const ahora = new Date().toISOString();
    await onGuardar({
      fecha: ahora,
      origen,
      destino,
      items: validos.map((i) => ({ ...i, producto: i.producto.trim(), codigo: i.codigo.trim(), color: i.color.trim(), cantidad: Number(i.cantidad), devuelto: 0 })),
      entrega: entrega.trim(),
      retira: retira.trim(),
      notas: notas.trim(),
      creadoPor: usuario,
      creadoEn: miSucursal,
      movimientos: [{ fecha: ahora, texto: `Préstamo registrado en ${miSucursal}`, usuario }],
    }, esNueva && !sucursales.includes(otra) ? otra : null);
    setGuardando(false);
  };

  return (
    <div className="tarjeta">
      <h2>Nuevo préstamo</h2>
      <Segmentado
        valor={sentido}
        onChange={setSentido}
        opciones={[
          ["enviamos", "Prestamos a otra sucursal"],
          ["recibimos", "Nos prestaron"],
        ]}
      />
      <Campo label={sentido === "enviamos" ? "¿A qué sucursal?" : "¿Qué sucursal nos prestó?"}>
        <input
          id="sucursal-otra"
          list="sucursales-conocidas"
          value={otraTexto}
          onChange={(e) => setOtraTexto(e.target.value)}
          placeholder="Escribí el nombre de la sucursal"
          autoComplete="off"
        />
        <datalist id="sucursales-conocidas">
          {otras.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </Campo>
      {esMia && <p className="texto-error chico">Esa es tu propia sucursal. Elegí otra.</p>}
      {esNueva && <p className="ayuda">“{otra}” no está en la lista: se va a agregar al guardar.</p>}
      {otra && !esMia && (
        <div className="resumen-sentido">
          {(sentido === "enviamos" ? [miSucursal, otra] : [otra, miSucursal]).map((n, idx) => (
            <span key={n + idx} className="ruta-punto">
              {idx === 1 && <Icono nombre="flecha" tam={16} />}
              <MuestraSucursal nombre={n} grande /> {n}
            </span>
          ))}
        </div>
      )}

      <h3>Productos</h3>
      <datalist id="productos-conocidos">
        {productosConocidos.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      {items.map((i, idx) => (
        <div key={i.id} className="item-form">
          <div className="item-form-cabecera">
            <span className="suave chico">Producto {idx + 1}</span>
            {items.length > 1 && (
              <button className="link peligro" onClick={() => setItems(items.filter((x) => x.id !== i.id))}>
                Quitar
              </button>
            )}
          </div>
          <input list="productos-conocidos" placeholder="Producto (ej: Látex interior blanco)" value={i.producto} onChange={(e) => cambiarItem(i.id, "producto", e.target.value)} />
          <div className="fila-2">
            <input placeholder="Código / SKU" value={i.codigo} onChange={(e) => cambiarItem(i.id, "codigo", e.target.value)} />
            <input placeholder="Color / tono" value={i.color} onChange={(e) => cambiarItem(i.id, "color", e.target.value)} />
          </div>
          <div className="fila-2">
            <input type="number" inputMode="decimal" min="0" placeholder="Cantidad" value={i.cantidad} onChange={(e) => cambiarItem(i.id, "cantidad", e.target.value)} />
            <select value={i.unidad} onChange={(e) => cambiarItem(i.id, "unidad", e.target.value)}>
              {UNIDADES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <button className="btn secundario" onClick={() => setItems([...items, nuevoItem()])}>
        + Agregar otro producto
      </button>

      <h3>Datos del traslado</h3>
      <div className="fila-2">
        <Campo label="Entregó">
          <input value={entrega} onChange={(e) => setEntrega(e.target.value)} />
        </Campo>
        <Campo label="Retiró / recibió">
          <input value={retira} onChange={(e) => setRetira(e.target.value)} placeholder="Nombre o fletero" />
        </Campo>
      </div>
      <Campo label="Notas">
        <textarea rows="2" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: para cliente García, lo devuelven el viernes" />
      </Campo>
      <button className="btn primario" disabled={!puedeGuardar} onClick={guardar}>
        {guardando ? "Guardando…" : "Registrar préstamo"}
      </button>
    </div>
  );
}

/* ================= Saldos ================= */

function Saldos({ prestamos, miSucursal }) {
  const abiertos = prestamos.filter((p) => estadoDe(p) !== "devuelto");

  const conMovimiento = new Set();
  abiertos.forEach((p) => {
    if (p.origen === miSucursal) conMovimiento.add(p.destino);
    if (p.destino === miSucursal) conMovimiento.add(p.origen);
  });
  const porSucursal = [...conMovimiento]
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((s) => {
      const juntar = (lista) => {
        const mapa = {};
        lista.forEach((p) =>
          p.items.forEach((i) => {
            const falta = i.cantidad - (i.devuelto || 0);
            if (falta <= 0) return;
            const clave = `${i.producto}|${i.color}|${i.unidad}`;
            mapa[clave] = mapa[clave] || { producto: i.producto, color: i.color, unidad: i.unidad, cantidad: 0 };
            mapa[clave].cantidad += falta;
          }),
        );
        return Object.values(mapa);
      };
      const nosDeben = juntar(abiertos.filter((p) => p.origen === miSucursal && p.destino === s));
      const debemos = juntar(abiertos.filter((p) => p.destino === miSucursal && p.origen === s));
      return { s, nosDeben, debemos };
    });

  const lista = (items) =>
    items.length === 0 ? (
      <div className="suave chico">Nada</div>
    ) : (
      <ul className="items compacto">
        {items.map((i, idx) => (
          <li key={idx}>
            <span className="item-cant">
              <b>{i.cantidad}</b>
              <small>{i.unidad}</small>
            </span>
            <span className="item-desc">
              <span>{i.producto}</span>
              {i.color && (
                <span className="item-meta">
                  <span className="tono">
                    {colorDeTono(i.color) && <Muestra color={colorDeTono(i.color)} />}
                    {i.color}
                  </span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <p className="ayuda">Sucursales con algo pendiente con {miSucursal}, sumado por producto.</p>
      {porSucursal.length === 0 && <Vacio icono="saldos" texto="No hay nada pendiente con ninguna sucursal." />}
      {porSucursal.map(({ s, nosDeben, debemos }) => (
        <div key={s} className="tarjeta">
          <h2 className="con-muestra"><MuestraSucursal nombre={s} grande /> {s}</h2>
          <div className="saldo-columnas">
            <div className="saldo nos-deben">
              <div className="saldo-titulo">Nos deben</div>
              {lista(nosDeben)}
            </div>
            <div className="saldo debemos">
              <div className="saldo-titulo">Les debemos</div>
              {lista(debemos)}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ================= Historial ================= */

function Historial({ prestamos, miSucursal, onEliminar }) {
  const [filtro, setFiltro] = useState("mia");
  const [estado, setEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [aBorrar, setABorrar] = useState(null);
  const [copiado, setCopiado] = useState("");

  const lista = prestamos
    .filter((p) => filtro === "todas" || p.origen === miSucursal || p.destino === miSucursal)
    .filter((p) => estado === "todos" || (estado === "abiertos" ? estadoDe(p) !== "devuelto" : estadoDe(p) === "devuelto"))
    .filter((p) => {
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase();
      return [p.origen, p.destino, p.notas, p.retira, p.entrega, ...p.items.flatMap((i) => [i.producto, i.codigo, i.color])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <>
      <div className="filtros">
        <input className="buscador" placeholder="Buscar producto, código, sucursal…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <div className="fila-2">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="mia">Solo {miSucursal}</option>
            <option value="todas">Todas las sucursales</option>
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="abiertos">Pendientes</option>
            <option value="cerrados">Devueltos</option>
          </select>
        </div>
        <div className="acciones">
          {copiado && <span className="suave chico">{copiado}</span>}
          <button
            className="btn secundario chico"
            disabled={!lista.length}
            onClick={() =>
              copiarParaExcel(lista).then(
                () => setCopiado("Copiado. Pegalo en Excel."),
                () => setCopiado("No se pudo copiar en este navegador."),
              )
            }
          >
            <Icono nombre="copiar" tam={18} /> Copiar para Excel
          </button>
          {!enPaginaClaude && (
            <button className="btn secundario chico" disabled={!lista.length} onClick={() => exportarCSV(lista)}>
              <Icono nombre="descargar" tam={18} /> Descargar CSV
            </button>
          )}
        </div>
      </div>
      {lista.length === 0 ? (
        <Vacio icono="historial" texto="No hay préstamos con esos filtros." />
      ) : (
        lista.map((p) => (
          <TarjetaPrestamo
            key={p.id}
            p={p}
            miSucursal={miSucursal}
            acciones={
              aBorrar === p.id ? (
                <>
                  <span className="suave chico">¿Eliminar? No se puede deshacer.</span>
                  <button className="btn secundario chico" onClick={() => setABorrar(null)}>
                    No
                  </button>
                  <button
                    className="btn peligro chico"
                    onClick={() => {
                      setABorrar(null);
                      onEliminar(p.id);
                    }}
                  >
                    Sí, eliminar
                  </button>
                </>
              ) : (
                <button className="link peligro" onClick={() => setABorrar(p.id)}>
                  Eliminar
                </button>
              )
            }
          />
        ))
      )}
    </>
  );
}

/* ================= Ajustes ================= */

function Ajustes({ perfil, sucursales, onPerfil, onSucursales, onSalir }) {
  const [sucursal, setSucursal] = useState(perfil.sucursal);
  const [nombre, setNombre] = useState(perfil.nombre);
  const [lista, setLista] = useState(sucursales);
  const [nueva, setNueva] = useState("");

  const agregar = () => {
    const n = nueva.trim();
    if (n && !lista.includes(n)) setLista([...lista, n]);
    setNueva("");
  };
  const cambiosLista = JSON.stringify(lista) !== JSON.stringify(sucursales);

  return (
    <>
      <div className="tarjeta">
        <h2>Este dispositivo</h2>
        <Campo label="Sucursal">
          <select value={sucursal} onChange={(e) => setSucursal(e.target.value)}>
            {sucursales.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Tu nombre">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <button
          className="btn primario"
          disabled={!nombre.trim() || (sucursal === perfil.sucursal && nombre.trim() === perfil.nombre)}
          onClick={() => onPerfil({ sucursal, nombre: nombre.trim() })}
        >
          Guardar
        </button>
      </div>

      <div className="tarjeta">
        <h2>Sucursales</h2>
        <p className="suave chico">La lista es la misma para todos los dispositivos.</p>
        {lista.map((s) => (
          <div key={s} className="fila-sucursal">
            <span>{s}</span>
            <button
              className="link peligro"
              disabled={s === perfil.sucursal}
              title={s === perfil.sucursal ? "Es la sucursal de este dispositivo" : ""}
              onClick={() => setLista(lista.filter((x) => x !== s))}
            >
              Quitar
            </button>
          </div>
        ))}
        <div className="fila-agregar">
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()} placeholder="Nueva sucursal" />
          <button className="btn secundario chico" onClick={agregar} disabled={!nueva.trim()}>
            Agregar
          </button>
        </div>
        <button className="btn primario" disabled={!cambiosLista || lista.length === 0} onClick={() => onSucursales(lista)}>
          Guardar sucursales
        </button>
      </div>

      {!modoLocal && (
        <button className="btn secundario" onClick={onSalir}>
          Cerrar sesión
        </button>
      )}
    </>
  );
}
