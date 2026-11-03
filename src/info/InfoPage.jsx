import { useState } from "react";

const APP_URL = "/";

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

const NAV = [
  { id: "que-es", label: "Qué es" },
  { id: "metodos", label: "Métodos" },
  { id: "presupuesto", label: "Presupuesto" },
  { id: "hormiga", label: "Gastos hormiga" },
  { id: "consejos", label: "Consejos" },
  { id: "faq", label: "Preguntas" },
];

const FEATURES = [
  { icon: "💳", color: "red", title: "Plan de deudas", text: "Cargás cada deuda con su saldo, tasa y pago mínimo. La app las ordena según el método que elijas y te dice cuál atacar primero." },
  { icon: "📊", color: "green", title: "Presupuesto 50/30/20", text: "Dividís tu ingreso en necesidades, gustos y ahorro para ver de un vistazo si tu plata está bien repartida." },
  { icon: "🐜", color: "purple", title: "Gastos hormiga", text: "Registrás esos consumos chiquitos y frecuentes y ves cuánto suman en un año. Suelen ser más de lo que pensás." },
  { icon: "🎯", color: "gold", title: "Metas", text: "Definís para qué ahorrás (fondo de emergencia, viaje, auto) y seguís tu avance con barras de progreso." },
];

const METODOS = [
  {
    id: "nieve", emoji: "❄️", name: "Bola de Nieve", tagline: "El método que motiva", tone: "snow",
    how: "Pagás el mínimo en todas tus deudas y todo lo extra va a la deuda de saldo más CHICO. Cuando la cancelás, sumás esa cuota a la siguiente.",
    ideal: "Necesitás ver avances rápido para no abandonar.",
    pros: ["Victorias rápidas", "Menos estrés", "Más fácil de sostener"],
    contra: "En total podés pagar algo más de intereses.",
  },
  {
    id: "avalancha", emoji: "⛰️", name: "Avalancha", tagline: "El método que ahorra", tone: "avalanche",
    how: "Pagás el mínimo en todas tus deudas y todo lo extra va a la deuda con la TASA más alta. Cada peso extra ataca lo más caro.",
    ideal: "Sos constante y querés pagar la menor cantidad de intereses.",
    pros: ["Ahorrás más plata", "Matemáticamente óptimo", "Salís antes"],
    contra: "Tardás más en ver caer la primera deuda.",
  },
];

const EJEMPLO = [
  { nombre: "Préstamo personal", saldo: 900000, tasa: 75 },
  { nombre: "Tarjeta de crédito", saldo: 450000, tasa: 120 },
  { nombre: "Cuotas de electrodoméstico", saldo: 120000, tasa: 60 },
];

const CONSEJOS = [
  { icon: "🔎", title: "Conocé tu situación real", text: "Hacé una lista con todas tus deudas: a quién le debés, cuánto, a qué tasa y cuál es el pago mínimo. Podés consultar gratis tu situación en la Central de Deudores del BCRA." },
  { icon: "⚠️", title: "Cuidado con el pago mínimo", text: "Pagar sólo el mínimo de la tarjeta hace que el saldo restante financie a tasas muy altas. Es la forma más cara de deber: tratá de pagar más del mínimo siempre que puedas." },
  { icon: "🧾", title: "Mirá el CFT, no sólo la TNA", text: "El Costo Financiero Total incluye intereses, impuestos y cargos. Es el número que te permite comparar de verdad un préstamo o una refinanciación con otra." },
  { icon: "🛟", title: "Armá un colchón de emergencia", text: "Aunque sea chico, un fondo para imprevistos evita que un gasto inesperado te obligue a endeudarte de nuevo." },
  { icon: "🤝", title: "Negociá antes de caer en mora", text: "Si ves que no llegás, hablá con el banco o la entidad antes de atrasarte. Muchas veces se puede refinanciar o conseguir un plan de pagos." },
  { icon: "🚫", title: "No tapes una deuda con otra", text: "Sacar un préstamo caro para pagar otra deuda sólo tiene sentido si la tasa nueva es claramente menor y no volvés a usar la tarjeta que cancelaste." },
];

const FAQ = [
  { q: "¿Sal de las Deudas es gratis?", a: "Sí. La app es una herramienta para organizarte: no cobra, no da préstamos y no vende productos financieros." },
  { q: "¿Cómo accedo a la app?", a: "Por ahora el acceso es por invitación. Si tu correo está habilitado, entrás con Google o con email y contraseña. Si no, pedile acceso a quien administra la app." },
  { q: "¿Mis datos están seguros?", a: "Tus datos se guardan asociados a tu cuenta y sólo vos los ves al iniciar sesión. La app no se conecta a tu banco ni pide tus claves bancarias: todo lo cargás vos." },
  { q: "¿Qué método me conviene, Bola de Nieve o Avalancha?", a: "Si te cuesta sostener un plan, Bola de Nieve te da victorias rápidas. Si sos constante y querés pagar menos intereses, Avalancha. Dentro de la app hay un quiz de tres preguntas que te ayuda a elegir." },
  { q: "¿Esto reemplaza a un asesor financiero?", a: "No. La información de esta página es educativa y general. Para decisiones importantes o situaciones complejas, consultá con un profesional." },
];

function Section({ id, eyebrow, title, intro, children }) {
  return (
    <section id={id} className="section">
      <div className="container">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="section-title">{title}</h2>
        {intro && <p className="section-intro">{intro}</p>}
        {children}
      </div>
    </section>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <div className="container header-inner">
        <a href="#top" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">🌿</span>
          <span>Sal de las Deudas</span>
        </a>
        <button className="menu-btn" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "✕" : "☰"}
        </button>
        <nav className={`nav ${open ? "nav-open" : ""}`}>
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`} onClick={() => setOpen(false)}>{n.label}</a>)}
          <a href={APP_URL} className="btn btn-small">Entrar a la app</a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="hero">
      <div className="hero-glow" />
      <div className="container hero-inner">
        <span className="pill pill-gold">Argentina 2026</span>
        <h1>Salí de las deudas<br /><span className="accent">con un plan.</span></h1>
        <p className="hero-sub">
          Información clara y herramientas simples para ordenar tu plata, elegir cómo atacar tus deudas
          y empezar a ahorrar — pensadas para la Argentina de hoy.
        </p>
        <div className="hero-ctas">
          <a href="#metodos" className="btn">Conocé los métodos</a>
          <a href={APP_URL} className="btn btn-outline">Entrar a la app →</a>
        </div>
      </div>
    </section>
  );
}

function QueEs() {
  return (
    <Section id="que-es" eyebrow="La app" title="Todo tu plan financiero en un solo lugar"
      intro="Sal de las Deudas es una app para organizar tus finanzas personales. No te presta plata ni te vende nada: te ayuda a ver dónde estás parado y qué hacer después.">
      <div className="grid grid-4">
        {FEATURES.map((f) => (
          <div key={f.title} className={`card tone-${f.color}`}>
            <div className="card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Metodos() {
  const [orden, setOrden] = useState("nieve");
  const ordenadas = [...EJEMPLO].sort((a, b) => (orden === "nieve" ? a.saldo - b.saldo : b.tasa - a.tasa));
  return (
    <Section id="metodos" eyebrow="Atacá tus deudas" title="Dos métodos probados"
      intro="Los dos empiezan igual: pagás el mínimo de todas tus deudas. La diferencia está en a cuál le das la plata que te sobra.">
      <div className="grid grid-2">
        {METODOS.map((m) => (
          <div key={m.id} className={`card method tone-${m.tone}`}>
            <div className="method-head">
              <span className="method-emoji">{m.emoji}</span>
              <div>
                <h3>{m.name}</h3>
                <div className="muted">{m.tagline}</div>
              </div>
            </div>
            <p>{m.how}</p>
            <div className="ideal">
              <div className="ideal-label">Ideal si…</div>
              <div>{m.ideal}</div>
            </div>
            <ul className="checks">
              {m.pros.map((p) => <li key={p}><span className="ok">✓</span>{p}</li>)}
              <li><span className="no">✗</span>{m.contra}</li>
            </ul>
          </div>
        ))}
      </div>

      <div className="card example">
        <div className="example-head">
          <h3>Probalo con un ejemplo</h3>
          <div className="toggle" role="tablist" aria-label="Elegí un método">
            <button role="tab" aria-selected={orden === "nieve"} className={orden === "nieve" ? "active" : ""} onClick={() => setOrden("nieve")}>❄️ Bola de Nieve</button>
            <button role="tab" aria-selected={orden === "avalancha"} className={orden === "avalancha" ? "active" : ""} onClick={() => setOrden("avalancha")}>⛰️ Avalancha</button>
          </div>
        </div>
        <p className="muted small">
          {orden === "nieve" ? "Ordenadas de menor a mayor saldo:" : "Ordenadas de mayor a menor tasa anual:"}
        </p>
        <ol className="debt-list">
          {ordenadas.map((d, i) => (
            <li key={d.nombre} className={i === 0 ? "first" : ""}>
              <span className="debt-rank">{i + 1}</span>
              <span className="debt-name">{d.nombre}{i === 0 && <span className="pill pill-gold tiny">Atacá primero</span>}</span>
              <span className={`debt-num ${orden === "nieve" ? "hl" : ""}`}>{fmt(d.saldo)}</span>
              <span className={`debt-num ${orden === "avalancha" ? "hl" : ""}`}>{d.tasa}% anual</span>
            </li>
          ))}
        </ol>
        <p className="muted small">Valores ilustrativos. En la app cargás tus deudas reales y el orden se calcula solo.</p>
      </div>
    </Section>
  );
}

function Presupuesto() {
  const [ingreso, setIngreso] = useState(1000000);
  const partes = [
    { label: "Necesidades", pct: 50, tone: "blue", text: "Alquiler, servicios, comida, transporte, pagos mínimos de deudas." },
    { label: "Gustos", pct: 30, tone: "purple", text: "Salidas, delivery, suscripciones, ropa que no es imprescindible." },
    { label: "Ahorro y deudas", pct: 20, tone: "green", text: "Fondo de emergencia, pagos extra a tus deudas e inversión." },
  ];
  return (
    <Section id="presupuesto" eyebrow="Ordená tu plata" title="La regla 50/30/20"
      intro="Una guía simple para repartir tu ingreso. No es una ley: si estás muy endeudado/a, conviene achicar los gustos y destinar más a pagar deudas.">
      <div className="card budget">
        <label className="field">
          <span className="field-label">Tu ingreso mensual</span>
          <span className="field-box">
            <span className="field-prefix">$</span>
            <input type="text" inputMode="numeric" value={ingreso ? ingreso.toLocaleString("es-AR") : ""}
              placeholder="0"
              onChange={(e) => setIngreso(Number(e.target.value.replace(/\D/g, "")) || 0)} />
          </span>
        </label>
        <div className="budget-bar" aria-hidden="true">
          {partes.map((p) => <div key={p.label} className={`seg tone-${p.tone}`} style={{ width: `${p.pct}%` }} />)}
        </div>
        <div className="grid grid-3">
          {partes.map((p) => (
            <div key={p.label} className={`budget-item tone-${p.tone}`}>
              <div className="budget-pct">{p.pct}%</div>
              <div className="budget-label">{p.label}</div>
              <div className="budget-amount">{fmt((ingreso * p.pct) / 100)}</div>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Hormiga() {
  const [precio, setPrecio] = useState(5500);
  const [veces, setVeces] = useState(3);
  const anual = precio * veces * 52;
  return (
    <Section id="hormiga" eyebrow="Lo que no se ve" title="Gastos hormiga"
      intro="Son consumos pequeños y frecuentes que, sumados, se llevan una parte enorme de tu ingreso: el café, el kiosco, el delivery, las apps que no usás.">
      <div className="grid grid-2 align-center">
        <div className="card">
          <label className="field">
            <span className="field-label">¿Cuánto cuesta?</span>
            <span className="field-box">
              <span className="field-prefix">$</span>
              <input type="text" inputMode="numeric" value={precio ? precio.toLocaleString("es-AR") : ""} placeholder="0"
                onChange={(e) => setPrecio(Number(e.target.value.replace(/\D/g, "")) || 0)} />
            </span>
          </label>
          <label className="field">
            <span className="field-label">Veces por semana: <strong>{veces}</strong></span>
            <input type="range" min="1" max="14" value={veces} onChange={(e) => setVeces(Number(e.target.value))} />
          </label>
        </div>
        <div className="card tone-purple hormiga-result">
          <div className="muted small">Al año gastás</div>
          <div className="big">{fmt(anual)}</div>
          <div className="muted small">o sea {fmt(anual / 12)} por mes</div>
          <p>Redirigir aunque sea una parte de ese gasto a tu deuda más cara (o más chica) puede acortar varios meses tu plan.</p>
        </div>
      </div>
    </Section>
  );
}

function Consejos() {
  return (
    <Section id="consejos" eyebrow="Para la Argentina de hoy" title="Consejos prácticos"
      intro="Algunas ideas para empezar hoy mismo, uses la app o no.">
      <div className="grid grid-3">
        {CONSEJOS.map((c) => (
          <div key={c.title} className="card tip">
            <div className="card-icon">{c.icon}</div>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </div>
        ))}
      </div>
      <div className="links">
        <a className="link-card" href="https://www.bcra.gob.ar/BCRAyVos/Situacion_Crediticia.asp" target="_blank" rel="noopener noreferrer">
          <span>🏦</span>
          <span>
            <strong>Central de Deudores (BCRA)</strong>
            <span className="muted small">Consultá gratis tu situación crediticia con tu CUIT/CUIL ↗</span>
          </span>
        </a>
      </div>
    </Section>
  );
}

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <Section id="faq" eyebrow="Dudas" title="Preguntas frecuentes">
      <div className="faq">
        {FAQ.map((f, i) => (
          <div key={f.q} className={`faq-item ${open === i ? "open" : ""}`}>
            <button className="faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{f.q}</span>
              <span className="chev">▾</span>
            </button>
            {open === i && <div className="faq-a">{f.a}</div>}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Cta() {
  return (
    <section className="section">
      <div className="container">
        <div className="cta">
          <h2>¿Listo/a para empezar?</h2>
          <p>Armá tu plan en minutos: cargá tus deudas, elegí un método y seguí tu progreso.</p>
          <a href={APP_URL} className="btn">Entrar a la app →</a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="brand"><span className="brand-mark">🌿</span><span>Sal de las Deudas</span></div>
        <p className="muted small">
          La información de este sitio es educativa y general; no constituye asesoramiento financiero, legal ni impositivo.
          Las tasas y montos de los ejemplos son ilustrativos.
        </p>
        <p className="muted small">© {new Date().getFullYear()} Sal de las Deudas</p>
      </div>
    </footer>
  );
}

export default function InfoPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <QueEs />
        <Metodos />
        <Presupuesto />
        <Hormiga />
        <Consejos />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
