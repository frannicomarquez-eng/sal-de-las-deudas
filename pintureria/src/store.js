// Capa de datos: Firestore (compartido entre sucursales) o localStorage (modo prueba).
// Para probar sin Firebase: `npm run dev:local`.
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

// Tres modos:
//  - "claude": página publicada en claude.ai, datos en la base compartida del artifact.
//  - "local": prueba, datos solo en este navegador.
//  - "firebase": app propia con Firestore.
export const modo =
  import.meta.env.VITE_PAGINA_CLAUDE === "1" ? "claude" : import.meta.env.VITE_MODO_LOCAL === "1" ? "local" : "firebase";
export const modoLocal = modo === "local";
export const modoClaude = modo === "claude";

export const SUCURSALES_DEFAULT = modoClaude ? [] : ["Casa Central", "Sucursal Norte", "Sucursal Sur"];

const firebaseConfig = {
  apiKey: "AIzaSyBesSvQBRKX8OufnWOranNIJsdx1d6FRTo",
  authDomain: "sal-de-las-deudas.firebaseapp.com",
  projectId: "sal-de-las-deudas",
  storageBucket: "sal-de-las-deudas.firebasestorage.app",
  messagingSenderId: "677707778904",
  appId: "1:677707778904:web:d4fe86e049de7b1282f32d",
};

const COL_PRESTAMOS = "pint_prestamos";
const DOC_CONFIG = ["pint_config", "general"];

let auth = null;
let db = null;
if (modo === "firebase") {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

/* ---------- Auth ---------- */

export function escucharUsuario(cb) {
  if (modoClaude) {
    cb({ uid: "claude", email: "", displayName: "" });
    return () => {};
  }
  if (modoLocal) {
    cb({ uid: "local", email: "local@prueba", displayName: "Modo prueba" });
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export function entrarConGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function salir() {
  if (modo !== "firebase") return Promise.resolve();
  return signOut(auth);
}

/* ---------- Modo local (localStorage) ---------- */

const LS_PRESTAMOS = "pint_prestamos";
const LS_CONFIG = "pint_config";
const oyentes = { prestamos: new Set(), config: new Set() };
const memoria = {};

function leerLS(clave, def) {
  if (clave in memoria) return memoria[clave];
  try {
    const v = localStorage.getItem(clave);
    memoria[clave] = v ? JSON.parse(v) : def;
  } catch {
    memoria[clave] = def;
  }
  return memoria[clave];
}
function escribirLS(clave, valor, canal) {
  memoria[clave] = valor;
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: queda en memoria */
  }
  oyentes[canal].forEach((fn) => fn(valor));
}
if (modoLocal && typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    delete memoria[e.key];
    if (e.key === LS_PRESTAMOS) oyentes.prestamos.forEach((fn) => fn(leerLS(LS_PRESTAMOS, [])));
    if (e.key === LS_CONFIG) oyentes.config.forEach((fn) => fn(leerLS(LS_CONFIG, {})));
  });
}

/* ---------- Base compartida de claude.ai ---------- */

const ERROR_SIN_BASE = "No se pudo conectar con la base compartida. Entrá con tu cuenta de Claude desde el link que te compartieron.";
let promesaDb = null;
function baseClaude() {
  if (!promesaDb) promesaDb = window.claude?.use ? window.claude.use("db") : Promise.resolve(null);
  return promesaDb;
}
async function dbOError() {
  const db = await baseClaude();
  if (!db) throw new Error(ERROR_SIN_BASE);
  return db;
}
const limpio = (o) => JSON.parse(JSON.stringify(o));

function suscribirClaude(armar, cb, onError) {
  let cancelado = false;
  let unsub = () => {};
  let llegó = false;
  const timer = setTimeout(() => {
    if (!llegó) onError?.({ code: "lento", message: "Todavía no se pudieron cargar los datos. Revisá la conexión." });
  }, 10000);
  baseClaude().then((db) => {
    if (cancelado) return;
    if (!db) {
      clearTimeout(timer);
      onError?.({ code: "sin_base", message: ERROR_SIN_BASE });
      return;
    }
    unsub = armar(db).onSnapshot(
      (snap) => {
        if (!snap.metadata.fromCache) {
          llegó = true;
          clearTimeout(timer);
        }
        cb(snap);
      },
      (e) => {
        clearTimeout(timer);
        onError?.(e);
      },
    );
  });
  return () => {
    cancelado = true;
    clearTimeout(timer);
    unsub();
  };
}

/* ---------- Préstamos ---------- */

export function suscribirPrestamos(cb, onError) {
  if (modoClaude)
    return suscribirClaude((db) => db.collection("prestamos"), (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onError);
  if (modoLocal) {
    oyentes.prestamos.add(cb);
    cb(leerLS(LS_PRESTAMOS, []));
    return () => oyentes.prestamos.delete(cb);
  }
  return onSnapshot(
    collection(db, COL_PRESTAMOS),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export async function crearPrestamo(datos) {
  if (modoClaude) {
    const ref = await (await dbOError()).collection("prestamos").add(limpio(datos));
    return ref.id;
  }
  if (modoLocal) {
    const lista = leerLS(LS_PRESTAMOS, []);
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    escribirLS(LS_PRESTAMOS, [...lista, { id, ...datos }], "prestamos");
    return id;
  }
  const ref = await addDoc(collection(db, COL_PRESTAMOS), datos);
  return ref.id;
}

export async function actualizarPrestamo(id, cambios) {
  if (modoClaude) {
    await (await dbOError()).doc("prestamos/" + id).update(limpio(cambios));
    return;
  }
  if (modoLocal) {
    const lista = leerLS(LS_PRESTAMOS, []).map((p) => (p.id === id ? { ...p, ...cambios } : p));
    escribirLS(LS_PRESTAMOS, lista, "prestamos");
    return;
  }
  await updateDoc(doc(db, COL_PRESTAMOS, id), cambios);
}

export async function eliminarPrestamo(id) {
  if (modoClaude) {
    await (await dbOError()).doc("prestamos/" + id).delete();
    return;
  }
  if (modoLocal) {
    escribirLS(LS_PRESTAMOS, leerLS(LS_PRESTAMOS, []).filter((p) => p.id !== id), "prestamos");
    return;
  }
  await deleteDoc(doc(db, COL_PRESTAMOS, id));
}

/* ---------- Configuración (lista de sucursales) ---------- */

export function suscribirConfig(cb) {
  if (modoClaude) return suscribirClaude((db) => db.doc("config/general"), (snap) => cb(snap.exists ? snap.data() : {}), () => {});
  if (modoLocal) {
    oyentes.config.add(cb);
    cb(leerLS(LS_CONFIG, {}));
    return () => oyentes.config.delete(cb);
  }
  return onSnapshot(
    doc(db, ...DOC_CONFIG),
    (snap) => cb(snap.exists() ? snap.data() : {}),
    () => cb({}),
  );
}

export async function guardarConfig(config) {
  if (modoClaude) {
    const ref = (await dbOError()).doc("config/general");
    const actual = await ref.get();
    await ref.set(limpio({ ...(actual.exists ? actual.data() : {}), ...config }));
    return;
  }
  if (modoLocal) {
    escribirLS(LS_CONFIG, { ...leerLS(LS_CONFIG, {}), ...config }, "config");
    return;
  }
  await setDoc(doc(db, ...DOC_CONFIG), config, { merge: true });
}
