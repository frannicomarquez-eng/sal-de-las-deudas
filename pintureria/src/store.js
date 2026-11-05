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

export const modoLocal = import.meta.env.VITE_MODO_LOCAL === "1";

export const SUCURSALES_DEFAULT = ["Casa Central", "Sucursal Norte", "Sucursal Sur"];

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
if (!modoLocal) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

/* ---------- Auth ---------- */

export function escucharUsuario(cb) {
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
  if (modoLocal) return Promise.resolve();
  return signOut(auth);
}

/* ---------- Modo local (localStorage) ---------- */

const LS_PRESTAMOS = "pint_prestamos";
const LS_CONFIG = "pint_config";
const oyentes = { prestamos: new Set(), config: new Set() };

function leerLS(clave, def) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}
function escribirLS(clave, valor, canal) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (e) {
    console.error(e);
  }
  oyentes[canal].forEach((fn) => fn(valor));
}
if (modoLocal && typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LS_PRESTAMOS) oyentes.prestamos.forEach((fn) => fn(leerLS(LS_PRESTAMOS, [])));
    if (e.key === LS_CONFIG) oyentes.config.forEach((fn) => fn(leerLS(LS_CONFIG, {})));
  });
}

/* ---------- Préstamos ---------- */

export function suscribirPrestamos(cb, onError) {
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
  if (modoLocal) {
    const lista = leerLS(LS_PRESTAMOS, []).map((p) => (p.id === id ? { ...p, ...cambios } : p));
    escribirLS(LS_PRESTAMOS, lista, "prestamos");
    return;
  }
  await updateDoc(doc(db, COL_PRESTAMOS, id), cambios);
}

export async function eliminarPrestamo(id) {
  if (modoLocal) {
    escribirLS(LS_PRESTAMOS, leerLS(LS_PRESTAMOS, []).filter((p) => p.id !== id), "prestamos");
    return;
  }
  await deleteDoc(doc(db, COL_PRESTAMOS, id));
}

/* ---------- Configuración (lista de sucursales) ---------- */

export function suscribirConfig(cb) {
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
  if (modoLocal) {
    escribirLS(LS_CONFIG, { ...leerLS(LS_CONFIG, {}), ...config }, "config");
    return;
  }
  await setDoc(doc(db, ...DOC_CONFIG), config, { merge: true });
}
