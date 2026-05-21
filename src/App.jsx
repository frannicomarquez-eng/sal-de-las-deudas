import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBesSvQBRKX8OufnWOranNIJsdx1d6FRTo",
  authDomain: "sal-de-las-deudas.firebaseapp.com",
  projectId: "sal-de-las-deudas",
  storageBucket: "sal-de-las-deudas.firebasestorage.app",
  messagingSenderId: "677707778904",
  appId: "1:677707778904:web:d4fe86e049de7b1282f32d",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const C = {
  bg: "#080A09", surface: "#111413", card: "#161918",
  border: "#222522", borderLight: "#2E322E",
  gold: "#D4A843", green: "#2ECC84", red: "#E8504A",
  blue: "#4AAED4", purple: "#9B72CF",
  muted: "#5A5F58", text: "#ECF0EA", textSoft: "#9BA198",
  snow: "#C8E6FF", avalanche: "#FFD4A8",
};

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);
const pct = (a, b) => (b === 0 ? 0 : Math.min(100, Math.round((a / b) * 100)));

const DEFAULT_DATA = {
  deudas: [],
  presupuesto: { ingreso: 0, fijos: 0, variables: 0, ahorro: 0 },
  hormiga: [],
  metas: [],
};

async function saveUserData(uid, data) {
  try {
    await setDoc(doc(db, "usuarios", uid), data, { merge: true });
  } catch (e) { console.error("Error guardando:", e); }
}

function Card({ children, style = {}, glow }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${glow ? glow + "55" : C.border}`, borderRadius: 18, padding: "20px 22px", boxShadow: glow ? `0 0 24px ${glow}18` : "none", ...style }}>
      {children}
    </div>
  );
}

function Pill({ color, children }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{children}</span>;
}

function Bar({ value, max, color = C.green, height = 8 }) {
  const p = pct(value, max);
  return (
    <div style={{ background: C.border, borderRadius: 99, height, overflow: "hidden" }}>
      <div style={{ width: `${p}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.7s ease" }} />
    </div>
  );
}

function Inp({ label, value, onChange, prefix = "$", type = "number", placeholder = "" }) {
  const displayValue = type === "number" ? (value === 0 ? "" : String(value)) : value;
  const handleChange = (e) => {
    const raw = e.target.value;
    if (type === "number") {
      if (raw === "") { onChange(0); return; }
      const clean = raw.replace(/^0+(\d)/, "$1");
      const num = Number(clean);
      if (!isNaN(num)) onChange(num);
    } else onChange(raw);
  };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", color: C.textSoft, fontSize: 11, marginBottom: 6, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</label>}
      <div style={{ display: "flex", alignItems: "center", background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: "hidden" }}>
        {prefix && <span style={{ padding: "0 12px", color: C.gold, fontWeight: 700, fontSize: 13 }}>{prefix}</span>}
        <input type={type === "number" ? "text" : type} inputMode={type === "number" ? "numeric" : undefined} value={displayValue} placeholder={placeholder || (type === "number" ? "0" : "")} onChange={handleChange}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, padding: "13px 12px 13px 0", fontSize: 15, fontFamily: "inherit" }} />
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", color: C.textSoft, fontSize: 11, marginBottom: 6, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 12, color: C.text, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, color = C.gold, textColor = "#080A09", disabled = false, outline = false, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: "100%", padding: "15px", background: disabled ? C.muted : outline ? "transparent" : color, border: outline ? `2px solid ${color}` : "none", borderRadius: 14, color: disabled ? C.bg : outline ? color : textColor, fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: disabled || outline ? "none" : `0 4px 20px ${color}44`, transition: "all 0.2s", ...style }}>
      {children}
    </button>
  );
}

function InfoBanner({ icon, title, text, color = C.blue }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 20, background: color + "0D", border: `1px solid ${color}33`, borderRadius: 14, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color, fontWeight: 700, fontSize: 14 }}>{title}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Tocá para {open ? "cerrar" : "saber más"}</div>
        </div>
        <span style={{ color, fontSize: 16, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </div>
      {open && <div style={{ padding: "0 18px 16px", color: C.textSoft, fontSize: 13, lineHeight: 1.7, borderTop: `1px solid ${color}22` }}><div style={{ paddingTop: 14 }}>{text}</div></div>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

const SLIDES = [
  { emoji: "🌿", color: C.gold, title: "Bienvenido/a a\nSal de las Deudas", subtitle: "La app que te ayuda a liberarte de las deudas y ordenar tu plata — adaptada a la Argentina de hoy.", tag: "Argentina 2026" },
  { emoji: "💳", color: C.red, title: "Atacá tus deudas\ncon método", subtitle: "Bola de Nieve o Avalancha. Dos métodos probados para salir de las deudas. La app te dice exactamente cuál usar y cuánto tiempo te lleva.", tag: "Sin improvisación" },
  { emoji: "🐜", color: C.purple, title: "Detectá los gastos\nque no ves", subtitle: "Un café de $5.500 tres veces por semana son $858.000 al año. Te mostramos a dónde se va tu plata para redirigirla.", tag: "Gastos hormiga" },
  { emoji: "🎯", color: C.green, title: "Construí el futuro\nque merecés", subtitle: "Presupuesto 50/30/20, metas financieras y todo el progreso en un solo lugar. Tu plata, con propósito.", tag: "Libertad financiera" },
];

function SlidesScreen({ onDone }) {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Georgia', serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, ${slide.color}20 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px 24px 0" }}>
        {!isLast && <button onClick={onDone} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}>Saltar →</button>}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" }}>
        <div style={{ width: 100, height: 100, background: slide.color + "20", border: `2px solid ${slide.color}44`, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, marginBottom: 28, boxShadow: `0 0 40px ${slide.color}25` }}>{slide.emoji}</div>
        <div style={{ background: slide.color + "20", color: slide.color, border: `1px solid ${slide.color}44`, borderRadius: 99, padding: "4px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 20, textTransform: "uppercase" }}>{slide.tag}</div>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 900, margin: "0 0 16px", letterSpacing: -0.5, lineHeight: 1.25, whiteSpace: "pre-line" }}>{slide.title}</h1>
        <p style={{ color: C.textSoft, fontSize: 15, lineHeight: 1.7, margin: 0, maxWidth: 320 }}>{slide.subtitle}</p>
      </div>
      <div style={{ padding: "0 28px 48px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
          {SLIDES.map((_, i) => <div key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 99, background: i === current ? slide.color : C.border, transition: "all 0.3s", cursor: "pointer" }} />)}
        </div>
        <Btn onClick={() => isLast ? onDone() : setCurrent(current + 1)} color={slide.color}>
          {isLast ? "Empezar ahora →" : "Siguiente →"}
        </Btn>
      </div>
    </div>
  );
}

function LoginScreen({ onAuth }) {
  const [mode, setMode] = useState("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError] = useState("");

  const errMsg = (code) => {
    const map = {
      "auth/email-already-in-use": "Ese email ya está registrado.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/user-not-found": "No encontramos ese email.",
      "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      "auth/invalid-email": "El email no es válido.",
      "auth/popup-closed-by-user": "",
      "auth/invalid-credential": "Email o contraseña incorrectos.",
    };
    return map[code] || "Algo salió mal. Intentá de nuevo.";
  };

  const handleGoogle = async () => {
    setGLoading(true); setError("");
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      setError(errMsg(e.code));
      setGLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email || !password) { setError("Completá todos los campos."); return; }
    setLoading(true); setError("");
    try {
      let result;
      if (mode === "register") result = await createUserWithEmailAndPassword(auth, email, password);
      else result = await signInWithEmailAndPassword(auth, email, password);
      onAuth(result.user);
    } catch (e) { setError(errMsg(e.code)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", padding: "24px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.gold}15 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 60, height: 60, background: C.gold + "22", border: `1px solid ${C.gold}55`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 14px", boxShadow: `0 0 28px ${C.gold}22` }}>🌿</div>
        <h1 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>Sal de las Deudas</h1>
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Creá tu cuenta gratis para empezar</p>
      </div>
      <div style={{ width: "100%", maxWidth: 400, background: C.card, border: `1px solid ${C.border}`, borderRadius: 22, padding: "26px 24px", boxShadow: "0 24px 64px #00000066" }}>
        <div style={{ display: "flex", background: C.surface, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {[{ id: "register", label: "Crear cuenta" }, { id: "login", label: "Ya tengo cuenta" }].map((t) => (
            <button key={t.id} onClick={() => { setMode(t.id); setError(""); }} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: mode === t.id ? C.gold : "transparent", color: mode === t.id ? C.bg : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>{t.label}</button>
          ))}
        </div>
        {error && <div style={{ background: C.red + "18", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: C.red, fontSize: 13 }}>⚠ {error}</div>}
        <button onClick={handleGoogle} disabled={gLoading} style={{ width: "100%", padding: "14px", background: gLoading ? C.surface : "#fff", border: `1px solid ${C.borderLight}`, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit", fontWeight: 700, fontSize: 14, color: gLoading ? C.muted : "#1a1a1a", marginBottom: 20 }}>
          {gLoading ? "Conectando..." : <><GoogleIcon />Continuar con Google</>}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.muted, fontSize: 12 }}>o con email</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        {mode === "register" && <Inp label="Tu nombre" value={name} onChange={setName} prefix="" type="text" placeholder="¿Cómo te llamás?" />}
        <Inp label="Email" value={email} onChange={setEmail} prefix="" type="email" placeholder="tu@email.com" />
        <Inp label="Contraseña" value={password} onChange={setPassword} prefix="" type="password" placeholder="••••••••" />
        {mode === "login" && <div style={{ textAlign: "right", marginTop: -8, marginBottom: 18 }}><span style={{ color: C.gold, fontSize: 12, cursor: "pointer", fontWeight: 600 }} onClick={async () => { if (email) { await sendPasswordResetEmail(auth, email); alert("Te enviamos un email para restablecer tu contraseña."); } else alert("Ingresá tu email primero."); }}>¿Olvidaste tu contraseña?</span></div>}
        <Btn onClick={handleSubmit} disabled={loading}>{loading ? "Un momento..." : mode === "register" ? "Crear mi cuenta →" : "Ingresar →"}</Btn>
      </div>
      <p style={{ color: C.muted, fontSize: 11, marginTop: 18, textAlign: "center" }}>Tu información está protegida y es privada. 🔒</p>
    </div>
  );
}

const METAS_OPCIONES = [
  { icon: "🛡️", label: "Fondo de emergencia" },
  { icon: "💳", label: "Salir de deudas" },
  { icon: "🏖️", label: "Vacaciones" },
  { icon: "🚗", label: "Comprar un auto" },
  { icon: "🏠", label: "Ahorrar para mudanza" },
  { icon: "📚", label: "Capacitarme" },
];

const WIZARD_STEPS = [
  { emoji: "💳", color: C.red, title: "¿Tenés deudas activas?", subtitle: "Empezamos por lo más urgente.", type: "deuda" },
  { emoji: "💰", color: C.green, title: "¿Cuánto ganás por mes?", subtitle: "Tu ingreso neto mensual para armar el presupuesto 50/30/20.", type: "ingreso" },
  { emoji: "🎯", color: C.blue, title: "¿Cuál es tu meta principal?", subtitle: "Elegí la que más te importa ahora.", type: "meta" },
];

function WizardScreen({ user, onDone }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ deudaNombre: "", deudaSaldo: 0, deudaTNA: 85, tieneDeuda: null, ingreso: 0, meta: "", metaIcono: "" });
  const current = WIZARD_STEPS[step];
  const isLast = step === WIZARD_STEPS.length - 1;
  const canContinue = () => {
    if (current.type === "deuda") return data.tieneDeuda !== null;
    if (current.type === "ingreso") return data.ingreso > 0;
    if (current.type === "meta") return data.meta !== "";
    return true;
  };
  const handleNext = () => {
    if (!canContinue()) return;
    if (isLast) {
      onDone({
        deudas: data.tieneDeuda && data.deudaSaldo > 0 ? [{ nombre: data.deudaNombre || "Mi deuda", saldo: data.deudaSaldo, tna: data.deudaTNA, minimo: Math.round(data.deudaSaldo * 0.03) }] : [],
        presupuesto: { ingreso: data.ingreso, fijos: 0, variables: 0, ahorro: 0 },
        hormiga: [],
        metas: data.meta ? [{ nombre: data.meta, icono: data.metaIcono, objetivo: 0, actual: 0 }] : [],
      });
    } else setStep(step + 1);
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", fontFamily: "'Georgia', serif" }}>
      <div style={{ padding: "24px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: C.gold + "22", border: `1px solid ${C.gold}44`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌿</div>
          <div>
            <div style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: 2 }}>CONFIGURACIÓN INICIAL</div>
            <div style={{ color: C.textSoft, fontSize: 13 }}>Hola, {user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "bienvenido/a"} 👋</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {WIZARD_STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: i <= step ? current.color : C.border, transition: "background 0.4s" }} />)}
        </div>
      </div>
      <div style={{ flex: 1, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, background: current.color + "22", border: `2px solid ${current.color}44`, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, margin: "0 auto 20px" }}>{current.emoji}</div>
          <h2 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: "0 0 10px" }}>{current.title}</h2>
          <p style={{ color: C.textSoft, fontSize: 14, margin: 0, lineHeight: 1.6 }}>{current.subtitle}</p>
        </div>
        {current.type === "deuda" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {[{ val: true, label: "Sí, tengo deudas", icon: "💳" }, { val: false, label: "No tengo deudas", icon: "✅" }].map((o) => (
                <div key={String(o.val)} onClick={() => setData({ ...data, tieneDeuda: o.val })} style={{ flex: 1, padding: "18px 14px", background: data.tieneDeuda === o.val ? current.color + "18" : C.card, border: `2px solid ${data.tieneDeuda === o.val ? current.color : C.border}`, borderRadius: 14, cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{o.icon}</div>
                  <div style={{ color: data.tieneDeuda === o.val ? current.color : C.textSoft, fontWeight: 700, fontSize: 13 }}>{o.label}</div>
                </div>
              ))}
            </div>
            {data.tieneDeuda === true && (
              <Card>
                <Inp label="¿Qué deuda es?" value={data.deudaNombre} onChange={(v) => setData({ ...data, deudaNombre: v })} prefix="" type="text" placeholder="Ej: Tarjeta Visa" />
                <Inp label="¿Cuánto debés? ($)" value={data.deudaSaldo} onChange={(v) => setData({ ...data, deudaSaldo: v })} placeholder="Ej: 500000" />
                <Inp label="Tasa anual TNA (%)" value={data.deudaTNA} onChange={(v) => setData({ ...data, deudaTNA: v })} prefix="%" placeholder="Ej: 85" />
              </Card>
            )}
            {data.tieneDeuda === false && (
              <div style={{ background: C.green + "0D", border: `1px solid ${C.green}33`, borderRadius: 14, padding: "20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
                <div style={{ color: C.green, fontWeight: 700, fontSize: 15 }}>¡Excelente posición!</div>
              </div>
            )}
          </div>
        )}
        {current.type === "ingreso" && (
          <div>
            <Inp label="Ingreso mensual neto ($)" value={data.ingreso} onChange={(v) => setData({ ...data, ingreso: v })} placeholder="Ej: 900000" />
            {data.ingreso > 0 && (
              <Card>
                {[{ label: "🏠 Gastos fijos (50%)", value: data.ingreso * 0.5, color: C.blue }, { label: "🛍️ Variables (30%)", value: data.ingreso * 0.3, color: C.gold }, { label: "📈 Ahorro (20%)", value: data.ingreso * 0.2, color: C.green }].map((r) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.textSoft, fontSize: 13 }}>{r.label}</span>
                    <span style={{ color: r.color, fontWeight: 800 }}>{fmt(r.value)}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
        {current.type === "meta" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {METAS_OPCIONES.map((m) => (
              <div key={m.label} onClick={() => setData({ ...data, meta: m.label, metaIcono: m.icon })} style={{ padding: "18px 14px", background: data.meta === m.label ? C.blue + "18" : C.card, border: `2px solid ${data.meta === m.label ? C.blue : C.border}`, borderRadius: 14, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ color: data.meta === m.label ? C.blue : C.textSoft, fontWeight: 700, fontSize: 12 }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: "24px 24px 40px" }}>
        <Btn onClick={handleNext} color={canContinue() ? current.color : C.muted} disabled={!canContinue()}>
          {isLast ? "🚀 Ver mi dashboard" : "Continuar →"}
        </Btn>
        {step > 0 && <button onClick={() => setStep(step - 1)} style={{ width: "100%", background: "none", border: "none", color: C.muted, cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginTop: 14, padding: "8px" }}>← Volver</button>}
      </div>
    </div>
  );
}

const QUIZ_Q = [
  { q: "¿Cómo te sentís cuando pagás una deuda completa?", opts: [{ label: "🔥 Me re-energiza, necesito esa victoria", val: "nieve" }, { label: "😐 Bien, pero me importa más ahorrar plata", val: "avalancha" }] },
  { q: "¿Abandonaste algún plan financiero antes?", opts: [{ label: "😔 Sí, me cuesta sostenerlo", val: "nieve" }, { label: "💪 No, soy constante cuando me lo propongo", val: "avalancha" }] },
  { q: "¿Qué te importa más?", opts: [{ label: "🎉 Sentir que avanzo rápido", val: "nieve" }, { label: "💰 Pagar la menor cantidad de intereses", val: "avalancha" }] },
];

function QuizModal({ onClose, onResult }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const choose = (val) => {
    const next = [...answers, val];
    if (step < QUIZ_Q.length - 1) { setAnswers(next); setStep(step + 1); }
    else { onResult(next.filter(a => a === "nieve").length >= 2 ? "nieve" : "avalancha"); onClose(); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000CC", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 20, padding: 28, maxWidth: 400, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ color: C.gold, fontWeight: 700, fontSize: 12 }}>PREGUNTA {step + 1} DE {QUIZ_Q.length}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {QUIZ_Q.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? C.gold : C.border }} />)}
        </div>
        <div style={{ color: C.text, fontSize: 17, fontWeight: 700, lineHeight: 1.5, marginBottom: 24 }}>{QUIZ_Q[step].q}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {QUIZ_Q[step].opts.map((o) => (
            <button key={o.val} onClick={() => choose(o.val)} style={{ padding: "16px 18px", background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 14, color: C.text, textAlign: "left", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}>{o.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetodoCards({ selected, onSelect }) {
  const methods = [
    { id: "nieve", emoji: "❄️", name: "Bola de Nieve", tagline: "El método que motiva", color: C.snow, pasos: "Atacás primero la deuda más CHICA. Cada victoria te da impulso para la siguiente.", para: "Necesitás motivación constante o ya tiraste la toalla antes.", pros: ["Victoria rápida", "Reduce el estrés", "Más fácil de sostener"], contra: "Pagás más intereses en total" },
    { id: "avalancha", emoji: "⛰️", name: "Avalancha", tagline: "El método que ahorra", color: C.avalanche, pasos: "Atacás primero la deuda con la TASA MÁS ALTA. Cada peso extra reduce lo más caro.", para: "Sos disciplinado/a y querés pagar menos intereses.", pros: ["Ahorrás más plata", "Matemáticamente óptimo", "Salís antes"], contra: "Tardás más en ver la primera deuda caer" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
      {methods.map((m) => {
        const sel = selected === m.id;
        return (
          <div key={m.id} onClick={() => onSelect(m.id)} style={{ background: sel ? m.color + "12" : C.card, border: `2px solid ${sel ? m.color : C.border}`, borderRadius: 16, padding: "18px 20px", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>{m.emoji}</span>
                <div>
                  <div style={{ color: sel ? m.color : C.text, fontWeight: 800, fontSize: 15 }}>{m.name}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{m.tagline}</div>
                </div>
              </div>
              {sel && <Pill color={m.color}>ELEGIDO</Pill>}
            </div>
            <div style={{ color: C.textSoft, fontSize: 13, lineHeight: 1.6, paddingLeft: 36 }}>{m.pasos}</div>
            {sel && (
              <div style={{ paddingLeft: 36, marginTop: 12 }}>
                <div style={{ background: m.color + "15", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                  <div style={{ color: m.color, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>IDEAL PARA VOS SI...</div>
                  <div style={{ color: C.textSoft, fontSize: 13 }}>{m.para}</div>
                </div>
                {m.pros.map((p, i) => <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: C.green, fontSize: 12 }}>✓</span><span style={{ color: C.textSoft, fontSize: 13 }}>{p}</span></div>)}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}><span style={{ color: C.red, fontSize: 12 }}>✗</span><span style={{ color: C.textSoft, fontSize: 13 }}>{m.contra}</span></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  { id: "dashboard", label: "Inicio", icon: "◈" },
  { id: "deudas", label: "Deudas", icon: "💳" },
  { id: "presupuesto", label: "Presupuesto", icon: "📊" },
  { id: "hormiga", label: "Hormiga", icon: "🐜" },
  { id: "metas", label: "Metas", icon: "🎯" },
];

const ROL_CONFIG = {
  admin:   { label: "ADMIN",   color: C.gold },
  beta:    { label: "BETA",    color: C.purple },
  usuario: { label: "USUARIO", color: C.blue },
};

function DashboardTab({ user, data, onSignOut, rol = "usuario", nombre = "" }) {
  const totalDeuda = data.deudas.reduce((s, d) => s + d.saldo, 0);
  const totalHormiga = data.hormiga.reduce((s, h) => s + h.anual, 0);
  const metasPct = data.metas.length > 0 ? Math.round(data.metas.reduce((s, m) => s + pct(m.actual, m.objetivo), 0) / data.metas.length) : 0;
  const displayName = nombre || user?.displayName?.split(" ")[0] || user?.email?.split("@")[0];
  const rolCfg = ROL_CONFIG[rol] || ROL_CONFIG.usuario;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: 3 }}>SAL DE LAS DEUDAS · 2026</div>
            <span style={{ background: rolCfg.color + "22", color: rolCfg.color, border: `1px solid ${rolCfg.color}44`, borderRadius: 99, padding: "2px 8px", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{rolCfg.label}</span>
          </div>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>Hola, {displayName} 👋</h1>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>Tu panorama financiero</p>
        </div>
        <button onClick={onSignOut} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>Salir</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[
          { label: "DEUDA TOTAL", value: totalDeuda > 0 ? fmt(totalDeuda) : "Sin deudas ✓", color: totalDeuda > 0 ? C.red : C.green, icon: "💳", sub: `${data.deudas.length} deudas` },
          { label: "INGRESO / MES", value: data.presupuesto.ingreso > 0 ? fmt(data.presupuesto.ingreso) : "—", color: C.green, icon: "💰", sub: "mensual neto" },
          { label: "HORMIGA / AÑO", value: totalHormiga > 0 ? fmt(totalHormiga) : "—", color: C.gold, icon: "🐜", sub: "fugas silenciosas" },
          { label: "METAS", value: `${metasPct}%`, color: C.blue, icon: "🎯", sub: `${data.metas.length} activas` },
        ].map((s) => (
          <Card key={s.label} style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{s.label}</div>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
            </div>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 900 }}>{s.value}</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{s.sub}</div>
          </Card>
        ))}
      </div>
      {data.presupuesto.ingreso > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>DISTRIBUCIÓN DEL INGRESO</div>
          {[{ label: "Gastos fijos", value: data.presupuesto.fijos, color: C.blue }, { label: "Gastos variables", value: data.presupuesto.variables, color: C.gold }, { label: "Ahorro / Inversión", value: data.presupuesto.ahorro, color: C.green }].map((r) => (
            <div key={r.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: C.textSoft, fontSize: 13 }}>{r.label}</span>
                <span style={{ color: r.color, fontWeight: 700, fontSize: 13 }}>{fmt(r.value)}</span>
              </div>
              <Bar value={r.value} max={data.presupuesto.ingreso} color={r.color} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function DeudasTab({ data, onChange }) {
  const { deudas } = data;
  const [form, setForm] = useState({ nombre: "", saldo: 0, tna: 0, minimo: 0 });
  const [extra, setExtra] = useState(0);
  const [metodo, setMetodo] = useState("nieve");
  const [showQuiz, setShowQuiz] = useState(false);
  const setDeudas = (d) => onChange({ ...data, deudas: d });
  const addDeuda = () => { if (!form.nombre || form.saldo <= 0) return; setDeudas([...deudas, { ...form }]); setForm({ nombre: "", saldo: 0, tna: 0, minimo: 0 }); };
  const ordenadas = [...deudas].sort((a, b) => metodo === "nieve" ? a.saldo - b.saldo : b.tna - a.tna);
  const totalDeuda = deudas.reduce((s, d) => s + d.saldo, 0);
  const totalMinimos = deudas.reduce((s, d) => s + d.minimo, 0);
  return (
    <div>
      {showQuiz && <QuizModal onClose={() => setShowQuiz(false)} onResult={(r) => { setMetodo(r); setShowQuiz(false); }} />}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, marginBottom: 6 }}>MÓDULO 1</div>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>Mis Deudas</h2>
      </div>
      <InfoBanner icon="💡" title="¿Cómo funciona?" color={C.blue} text="Elegí un método o hacé el quiz. Cargá tus deudas con saldo, tasa y mínimo. La app te ordena cuál atacar primero." />
      <button onClick={() => setShowQuiz(true)} style={{ width: "100%", padding: "13px", background: C.purple + "22", border: `1px solid ${C.purple}55`, borderRadius: 12, color: C.purple, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", marginBottom: 20 }}>⚡ ¿No sabés cuál método usar? Hacé el quiz</button>
      <MetodoCards selected={metodo} onSelect={setMetodo} />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>AGREGAR DEUDA</div>
        <Inp label="Nombre" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} prefix="" type="text" placeholder="Ej: Tarjeta Visa" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="Saldo ($)" value={form.saldo} onChange={(v) => setForm({ ...form, saldo: v })} placeholder="Ej: 500000" />
          <Inp label="TNA (%)" value={form.tna} onChange={(v) => setForm({ ...form, tna: v })} prefix="%" placeholder="Ej: 85" />
        </div>
        <Inp label="Pago mínimo mensual ($)" value={form.minimo} onChange={(v) => setForm({ ...form, minimo: v })} placeholder="Ej: 15000" />
        <Btn onClick={addDeuda}>+ Agregar deuda</Btn>
      </Card>
      {deudas.length > 0 && (
        <>
          <Card style={{ marginBottom: 20 }}>
            <Inp label="Dinero EXTRA mensual ($)" value={extra} onChange={setExtra} placeholder="Ej: 30000" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[{ label: "TOTAL", value: fmt(totalDeuda), color: C.red }, { label: "MÍNIMOS", value: fmt(totalMinimos), color: C.gold }, { label: "EXTRA", value: fmt(extra), color: C.green }].map((s) => (
                <div key={s.label} style={{ textAlign: "center", padding: "12px 8px", background: C.surface, borderRadius: 10 }}>
                  <div style={{ color: C.muted, fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ color: s.color, fontWeight: 800, fontSize: 13 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>PLAN — {metodo === "nieve" ? "❄️ BOLA DE NIEVE" : "⛰️ AVALANCHA"}</div>
            {ordenadas.map((d, i) => {
              const pagoTotal = i === 0 ? d.minimo + extra : d.minimo;
              const meses = Math.ceil(d.saldo / Math.max(pagoTotal, 1));
              return (
                <div key={i} style={{ padding: "14px 0", borderBottom: i < ordenadas.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: i === 0 ? C.gold : C.surface, display: "flex", alignItems: "center", justifyContent: "center", color: i === 0 ? C.bg : C.muted, fontWeight: 900, fontSize: 13 }}>{i + 1}°</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: C.text, fontWeight: 700 }}>{d.nombre}</span>
                        {i === 0 ? <Pill color={C.gold}>FOCO</Pill> : <Pill color={C.muted}>ESPERA</Pill>}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{fmt(d.saldo)} · TNA {d.tna}%</div>
                      {i === 0 && extra > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><span style={{ color: C.gold, fontSize: 12 }}>Pagando {fmt(pagoTotal)}/mes</span><span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>~{meses} meses</span></div>}
                    </div>
                    <button onClick={() => setDeudas(deudas.filter((_, idx) => idx !== deudas.indexOf(d)))} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 20 }}>×</button>
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}
      {deudas.length === 0 && <Card style={{ textAlign: "center", padding: "40px" }}><div style={{ fontSize: 44, marginBottom: 14 }}>💳</div><div style={{ color: C.text, fontWeight: 700 }}>Agregá tu primera deuda</div></Card>}
    </div>
  );
}

function PresupuestoTab({ data, onChange }) {
  const { presupuesto } = data;
  const up = (key, val) => onChange({ ...data, presupuesto: { ...presupuesto, [key]: val } });
  const { ingreso, fijos, variables, ahorro } = presupuesto;
  const restante = ingreso - fijos - variables - ahorro;
  const rows = [
    { key: "fijos", label: "Gastos Fijos", icon: "🏠", target: ingreso * 0.5, color: C.blue, desc: "Alquiler, servicios, transporte, prepaga" },
    { key: "variables", label: "Gastos Variables", icon: "🛍️", target: ingreso * 0.3, color: C.gold, desc: "Salidas, delivery, ropa, entretenimiento" },
    { key: "ahorro", label: "Ahorro + Inversión", icon: "📈", target: ingreso * 0.2, color: C.green, desc: "FCI, plazo fijo UVA, dólar MEP" },
  ];
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, marginBottom: 6 }}>MÓDULO 2</div>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>Presupuesto 50/30/20</h2>
      </div>
      <InfoBanner icon="📖" title="¿Qué es la regla 50/30/20?" color={C.green} text="Dividís tu ingreso: 50% para necesidades, 30% para gustos y 20% para ahorro e inversión." />
      <Card style={{ marginBottom: 20 }}>
        <Inp label="Ingreso mensual neto ($)" value={ingreso} onChange={(v) => up("ingreso", v)} placeholder="Ej: 900000" />
        {ingreso > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[{ label: "50% FIJOS", value: ingreso * 0.5, color: C.blue }, { label: "30% VAR.", value: ingreso * 0.3, color: C.gold }, { label: "20% AHORRO", value: ingreso * 0.2, color: C.green }].map((s) => (
              <div key={s.label} style={{ textAlign: "center", padding: "10px 8px", background: C.surface, borderRadius: 10 }}>
                <div style={{ color: C.muted, fontSize: 9, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                <div style={{ color: s.color, fontWeight: 800, fontSize: 13 }}>{fmt(s.value)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {rows.map((r) => {
        const over = presupuesto[r.key] > r.target * 1.1;
        return (
          <Card key={r.key} style={{ marginBottom: 16, borderColor: over ? C.red + "55" : C.border }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div><div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{r.icon} {r.label}</div><div style={{ color: C.muted, fontSize: 12 }}>{r.desc}</div></div>
              {ingreso > 0 && <Pill color={over ? C.red : r.color}>{pct(presupuesto[r.key], ingreso)}%</Pill>}
            </div>
            <Inp label="Monto real este mes ($)" value={presupuesto[r.key]} onChange={(v) => up(r.key, v)} placeholder="Ej: 450000" />
            {ingreso > 0 && <>
              <Bar value={presupuesto[r.key]} max={ingreso} color={over ? C.red : r.color} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ color: C.muted, fontSize: 12 }}>Meta: {fmt(r.target)}</span>
                {over && <span style={{ color: C.red, fontSize: 12, fontWeight: 700 }}>⚠ +{fmt(presupuesto[r.key] - r.target)}</span>}
              </div>
            </>}
          </Card>
        );
      })}
      {ingreso > 0 && (
        <Card glow={restante >= 0 ? C.green : C.red}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: C.textSoft, fontSize: 11, fontWeight: 700 }}>RESTANTE DEL MES</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{restante >= 0 ? "✓ Sumalo a deudas o ahorro" : "✗ Estás gastando más de lo que entra"}</div>
            </div>
            <div style={{ color: restante >= 0 ? C.green : C.red, fontSize: 22, fontWeight: 900 }}>{fmt(restante)}</div>
          </div>
        </Card>
      )}
    </div>
  );
}

function HormigaTab({ data, onChange }) {
  const { hormiga } = data;
  const [form, setForm] = useState({ nombre: "", monto: 0, frecuencia: "semanal" });
  const FREC = [{ value: "diario", label: "Diario", mult: 365 }, { value: "semanal", label: "Semanal", mult: 52 }, { value: "mensual", label: "Mensual", mult: 12 }];
  const setHormiga = (h) => onChange({ ...data, hormiga: h });
  const addH = () => { if (!form.nombre || form.monto <= 0) return; const mult = FREC.find(f => f.value === form.frecuencia).mult; setHormiga([...hormiga, { ...form, anual: form.monto * mult }]); setForm({ nombre: "", monto: 0, frecuencia: "semanal" }); };
  const totalAnual = hormiga.reduce((s, h) => s + h.anual, 0);
  const ejemplos = [{ nombre: "☕ Café en cadena", monto: 5500, frecuencia: "semanal" }, { nombre: "🛵 Delivery", monto: 25000, frecuencia: "semanal" }, { nombre: "🚗 Uber corto", monto: 4500, frecuencia: "semanal" }, { nombre: "📱 App premium", monto: 5500, frecuencia: "mensual" }];
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, marginBottom: 6 }}>MÓDULO 3</div>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>Gastos Hormiga</h2>
      </div>
      <InfoBanner icon="🐜" title="¿Qué son los gastos hormiga?" color={C.gold} text="Son consumos pequeños y frecuentes. Un café de $5.500 tres veces por semana son $858.000 al año." />
      {totalAnual > 0 && (
        <div style={{ background: C.gold + "12", border: `1px solid ${C.gold}44`, borderRadius: 18, padding: "22px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ESTÁS PERDIENDO AL AÑO</div>
          <div style={{ color: C.gold, fontSize: 36, fontWeight: 900 }}>{fmt(totalAnual)}</div>
          <div style={{ color: C.textSoft, fontSize: 13, marginTop: 10 }}>{fmt(Math.round(totalAnual / 12))}/mes</div>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 10 }}>AGREGAR RÁPIDO</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ejemplos.map((e, i) => <button key={i} onClick={() => setForm(e)} style={{ background: C.surface, border: `1px solid ${C.borderLight}`, borderRadius: 99, color: C.textSoft, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{e.nombre}</button>)}
        </div>
      </div>
      <Card style={{ marginBottom: 20 }}>
        <Inp label="Nombre del gasto" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} prefix="" type="text" placeholder="Ej: Café en Starbucks" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="Monto ($)" value={form.monto} onChange={(v) => setForm({ ...form, monto: v })} placeholder="Ej: 5500" />
          <Sel label="Frecuencia" value={form.frecuencia} onChange={(v) => setForm({ ...form, frecuencia: v })} options={FREC.map(f => ({ value: f.value, label: f.label }))} />
        </div>
        {form.monto > 0 && (
          <div style={{ background: C.gold + "12", border: `1px solid ${C.gold}33`, borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 11 }}>Impacto anual estimado</div>
            <div style={{ color: C.gold, fontWeight: 900, fontSize: 20, marginTop: 4 }}>{fmt(form.monto * (FREC.find(f => f.value === form.frecuencia)?.mult || 52))}</div>
          </div>
        )}
        <Btn onClick={addH}>+ Registrar hormiga</Btn>
      </Card>
      {hormiga.length > 0 && (
        <Card>
          {hormiga.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < hormiga.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div><div style={{ color: C.text, fontWeight: 600 }}>{h.nombre}</div><div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{fmt(h.monto)} · {h.frecuencia}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ color: C.red, fontWeight: 800 }}>{fmt(h.anual)}/año</div>
                <button onClick={() => setHormiga(hormiga.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 20 }}>×</button>
              </div>
            </div>
          ))}
        </Card>
      )}
      {hormiga.length === 0 && <Card style={{ textAlign: "center", padding: "40px" }}><div style={{ fontSize: 44, marginBottom: 14 }}>🐜</div><div style={{ color: C.text, fontWeight: 700 }}>Registrá tus gastos hormiga</div></Card>}
    </div>
  );
}

function MetasTab({ data, onChange }) {
  const { metas } = data;
  const [form, setForm] = useState({ nombre: "", objetivo: 0, actual: 0, icono: "🎯" });
  const ICONOS = ["🎯", "🏖️", "🚗", "🏠", "📚", "💊", "💍", "✈️", "💻", "🛡️", "🐕", "🏋️"];
  const setMetas = (m) => onChange({ ...data, metas: m });
  const addMeta = () => { if (!form.nombre || form.objetivo <= 0) return; setMetas([...metas, { ...form }]); setForm({ nombre: "", objetivo: 0, actual: 0, icono: "🎯" }); };
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, marginBottom: 6 }}>MÓDULO 4</div>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>Mis Metas</h2>
      </div>
      <InfoBanner icon="🎯" title="¿Para qué sirven las metas?" color={C.green} text="Sin una meta concreta, el dinero que ahorrás se evapora. Definir metas te da un 'para qué' que sostiene el esfuerzo." />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {ICONOS.map((ic) => <button key={ic} onClick={() => setForm({ ...form, icono: ic })} style={{ width: 40, height: 40, fontSize: 20, background: form.icono === ic ? C.green + "22" : C.surface, border: `2px solid ${form.icono === ic ? C.green : C.border}`, borderRadius: 10, cursor: "pointer" }}>{ic}</button>)}
        </div>
        <Inp label="Nombre de la meta" value={form.nombre} onChange={(v) => setForm({ ...form, nombre: v })} prefix="" type="text" placeholder="Ej: Fondo de emergencia" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Inp label="Monto objetivo ($)" value={form.objetivo} onChange={(v) => setForm({ ...form, objetivo: v })} placeholder="Ej: 1500000" />
          <Inp label="Ya tengo ($)" value={form.actual} onChange={(v) => setForm({ ...form, actual: v })} placeholder="Ej: 200000" />
        </div>
        <Btn onClick={addMeta} color={C.green}>+ Agregar meta</Btn>
      </Card>
      {metas.map((m, i) => {
        const p = pct(m.actual, m.objetivo);
        return (
          <Card key={i} style={{ marginBottom: 16 }} glow={p >= 100 ? C.green : undefined}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 30 }}>{m.icono}</span>
                <div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{m.nombre}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{p >= 100 ? "🎉 ¡Meta alcanzada!" : `Falta ${fmt(m.objetivo - m.actual)}`}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Pill color={p >= 100 ? C.green : p > 50 ? C.gold : C.blue}>{p}%</Pill>
                <button onClick={() => setMetas(metas.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
            </div>
            <Bar value={m.actual} max={m.objetivo} color={p >= 100 ? C.green : C.blue} height={10} />
            <div style={{ display: "flex", justifyContent: "space-between", margin: "8px 0 14px" }}>
              <span style={{ color: C.muted, fontSize: 12 }}>{fmt(m.actual)} guardado</span>
              <span style={{ color: C.muted, fontSize: 12 }}>Meta: {fmt(m.objetivo)}</span>
            </div>
            <Inp label="Actualizar monto guardado ($)" value={m.actual} onChange={(v) => { const c = [...metas]; c[i] = { ...c[i], actual: v }; setMetas(c); }} placeholder="Ej: 300000" />
          </Card>
        );
      })}
      {metas.length === 0 && <Card style={{ textAlign: "center", padding: "40px" }}><div style={{ fontSize: 44, marginBottom: 14 }}>🎯</div><div style={{ color: C.text, fontWeight: 700 }}>Definí tus primeras metas</div></Card>}
    </div>
  );
}

function UnauthorizedScreen({ email, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif", padding: "24px 20px" }}>
      <div style={{ width: 72, height: 72, background: C.gold + "18", border: `1px solid ${C.gold}44`, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 24 }}>⏳</div>
      <h1 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: "0 0 12px", textAlign: "center" }}>Estás en la lista de espera</h1>
      <p style={{ color: C.textSoft, fontSize: 14, lineHeight: 1.7, textAlign: "center", maxWidth: 320, margin: "0 0 8px" }}>
        Tu cuenta <span style={{ color: C.gold, fontWeight: 700 }}>{email}</span> todavía no tiene acceso a Sal de las Deudas.
      </p>
      <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, textAlign: "center", maxWidth: 320, margin: "0 0 32px" }}>
        Escribinos para solicitar acceso y te avisamos cuando esté listo.
      </p>
      <button onClick={onBack} style={{ background: "none", border: `1px solid ${C.borderLight}`, borderRadius: 12, color: C.muted, padding: "12px 24px", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>← Volver al inicio</button>
    </div>
  );
}

function AdminTab() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ email: "", nombre: "", rol: "usuario" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const cargarUsuarios = async () => {
    const snap = await getDocs(collection(db, "autorizados"));
    setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => { cargarUsuarios(); }, []);

  const agregar = async () => {
    if (!form.email || !form.nombre) { setMsg("Completá email y nombre."); return; }
    setLoading(true); setMsg("");
    try {
      await addDoc(collection(db, "autorizados"), { email: form.email.trim().toLowerCase(), nombre: form.nombre.trim(), rol: form.rol });
      setForm({ email: "", nombre: "", rol: "usuario" });
      setMsg("✓ Usuario agregado");
      await cargarUsuarios();
    } catch (e) { setMsg("Error al agregar."); }
    setLoading(false);
  };

  const eliminar = async (id, email) => {
    if (!confirm(`¿Eliminar acceso de ${email}?`)) return;
    await deleteDoc(doc(db, "autorizados", id));
    await cargarUsuarios();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: C.gold, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, marginBottom: 6 }}>ADMIN</div>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 900, margin: "0 0 6px" }}>Usuarios Autorizados</h2>
      </div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>DAR ACCESO A ALGUIEN</div>
        <Inp label="Gmail" value={form.email} onChange={v => setForm({ ...form, email: v })} prefix="" type="email" placeholder="persona@gmail.com" />
        <Inp label="Nombre" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} prefix="" type="text" placeholder="Ej: María" />
        <Sel label="Rol" value={form.rol} onChange={v => setForm({ ...form, rol: v })} options={[{ value: "usuario", label: "Usuario" }, { value: "beta", label: "Beta" }, { value: "admin", label: "Admin" }]} />
        {msg && <div style={{ color: msg.startsWith("✓") ? C.green : C.red, fontSize: 13, marginBottom: 12 }}>{msg}</div>}
        <Btn onClick={agregar} disabled={loading}>{loading ? "Guardando..." : "+ Dar acceso"}</Btn>
      </Card>
      <Card>
        <div style={{ color: C.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>ACCESOS ACTIVOS ({usuarios.length})</div>
        {usuarios.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>No hay usuarios aún</div>}
        {usuarios.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{u.nombre}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{u.email}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Pill color={ROL_CONFIG[u.rol]?.color || C.blue}>{(u.rol || "usuario").toUpperCase()}</Pill>
              <button onClick={() => eliminar(u.id, u.email)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 20 }}>×</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [userRol, setUserRol] = useState("usuario");
  const [userNombre, setUserNombre] = useState("");
  const [appData, setAppData] = useState(DEFAULT_DATA);
  const [tab, setTab] = useState("dashboard");
  const [saving, setSaving] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const processing = useRef(false);

  // onAuthStateChanged es la ÚNICA fuente de verdad para transiciones de pantalla
  useEffect(() => {
    let unsub;

    const handleAuthState = async (u) => {
      if (processing.current) return;
      processing.current = true;
      try {
        if (u) {
          const authSnap = await getDocs(query(collection(db, "autorizados"), where("email", "==", u.email)));
          if (authSnap.empty) {
            await signOut(auth);
            setUser(null);
            setScreen("unauthorized");
            return;
          }
          const authData = authSnap.docs[0].data();
          setUserRol(authData.rol || "usuario");
          setUserNombre(authData.nombre || "");
          setUser(u);
          const snap = await getDoc(doc(db, "usuarios", u.uid));
          if (snap.exists()) {
            setAppData({ ...DEFAULT_DATA, ...snap.data() });
          } else {
            setIsNewUser(true);
          }
          setScreen(snap.exists() ? "app" : "wizard");
        } else {
          setScreen("slides");
        }
      } catch (e) {
        setUser(u);
        setScreen("app");
      } finally {
        processing.current = false;
      }
    };

    // Esperar resultado del redirect antes de suscribirse a onAuthStateChanged
    // Esto evita el doble disparo null→user que causa la pantalla en blanco
    getRedirectResult(auth)
      .catch(() => {})
      .finally(() => {
        unsub = onAuthStateChanged(auth, handleAuthState);
      });

    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!user) return;
    setSaving(true);
    const timer = setTimeout(async () => {
      await saveUserData(user.uid, appData);
      setSaving(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [appData, user]);

  // Después del popup o email login: mostrar spinner mientras onAuthStateChanged procesa
  const handleAuth = () => {
    setScreen("loading");
  };

  const handleWizardDone = (data) => {
    setAppData(data);
    setIsNewUser(false);
    setScreen("app");
  };

  const handleSignOut = () => {
    processing.current = false; // permitir que onAuthStateChanged procese el null del signOut
    signOut(auth);
    setUser(null);
    setAppData(DEFAULT_DATA);
  };

  if (screen === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "'Georgia', serif" }}>
        <div style={{ width: 56, height: 56, background: C.gold + "22", border: `1px solid ${C.gold}44`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🌿</div>
        <div style={{ color: C.muted, fontSize: 14 }}>Cargando...</div>
      </div>
    );
  }

  if (screen === "unauthorized") return <UnauthorizedScreen email={user?.email || ""} onBack={() => setScreen("slides")} />;
  if (screen === "slides") return <SlidesScreen onDone={() => setScreen("login")} />;
  if (screen === "login") return <LoginScreen onAuth={handleAuth} />;
  if (screen === "wizard") return <WizardScreen user={user} onDone={handleWizardDone} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Georgia', serif", color: C.text, maxWidth: 480, margin: "0 auto" }}>
      {saving && <div style={{ position: "fixed", top: 12, right: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 99, padding: "6px 14px", fontSize: 11, color: C.muted, zIndex: 50 }}>Guardando...</div>}
      <div style={{ padding: "28px 22px 96px" }}>
        {tab === "dashboard" && <DashboardTab user={user} data={appData} onSignOut={handleSignOut} rol={userRol} nombre={userNombre} />}
        {tab === "deudas" && <DeudasTab data={appData} onChange={setAppData} />}
        {tab === "presupuesto" && <PresupuestoTab data={appData} onChange={setAppData} />}
        {tab === "hormiga" && <HormigaTab data={appData} onChange={setAppData} />}
        {tab === "metas" && <MetasTab data={appData} onChange={setAppData} />}
        {tab === "admin" && <AdminTab />}
      </div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", padding: "10px 0 18px" }}>
        {[...TABS, ...(userRol === "admin" ? [{ id: "admin", label: "Admin", icon: "⚙️" }] : [])].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 0" }}>
            <div style={{ width: 40, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: tab === t.id ? C.gold + "22" : "transparent", transition: "all 0.2s" }}>
              <span style={{ fontSize: tab === t.id ? 22 : 19 }}>{t.icon}</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: tab === t.id ? C.gold : C.muted, fontFamily: "inherit" }}>{t.label.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}