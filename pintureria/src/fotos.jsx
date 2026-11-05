import { useEffect, useState } from "react";
import { puedeSubirFotos, subirFoto, srcFoto } from "./store.js";
import { Icono } from "./visual.jsx";

function usePuedeSubir() {
  const [puede, setPuede] = useState(null);
  useEffect(() => {
    let vivo = true;
    puedeSubirFotos().then((v) => vivo && setPuede(v));
    return () => {
      vivo = false;
    };
  }, []);
  return puede;
}

// Botón para sacar o elegir fotos. Llama a onSubida con cada foto ya subida.
export function BotonFoto({ onSubida, texto = "Sacar o elegir foto", chico = false }) {
  const puede = usePuedeSubir();
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState("");

  if (puede === false)
    return <p className="ayuda">Para subir fotos necesitás permiso de Editor.</p>;

  const elegir = async (e) => {
    const archivos = [...e.target.files];
    e.target.value = "";
    setError("");
    for (const f of archivos) {
      setSubiendo((n) => n + 1);
      try {
        onSubida(await subirFoto(f));
      } catch (err) {
        setError(err.message);
      }
      setSubiendo((n) => n - 1);
    }
  };

  return (
    <div className="boton-foto">
      <label className={`btn secundario ${chico ? "chico" : ""} ${subiendo || puede === null ? "deshabilitado" : ""}`}>
        <Icono nombre="camara" tam={18} />
        {subiendo ? "Subiendo foto…" : texto}
        <input type="file" accept="image/*" multiple onChange={elegir} disabled={!!subiendo || puede === null} hidden />
      </label>
      {error && <p className="texto-error chico">{error}</p>}
    </div>
  );
}

export function Miniaturas({ fotos, onAbrir, onQuitar }) {
  if (!fotos?.length) return null;
  return (
    <div className="miniaturas">
      {fotos.map((f, idx) => (
        <div key={f.id || idx} className="miniatura">
          <button className="miniatura-img" onClick={() => onAbrir(idx)} aria-label={`Ver foto ${idx + 1}`}>
            <img src={srcFoto(f)} alt={`Foto ${idx + 1}`} loading="lazy" />
          </button>
          {onQuitar && (
            <button className="miniatura-quitar" onClick={() => onQuitar(idx)} aria-label={`Quitar foto ${idx + 1}`}>
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function VisorFotos({ fotos, inicial, onCerrar }) {
  const [i, setI] = useState(inicial);
  const f = fotos[i];
  if (!f) return null;
  return (
    <div className="modal-fondo visor-fondo" onClick={onCerrar}>
      <div className="visor" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <img src={srcFoto(f)} alt={`Foto ${i + 1} de ${fotos.length}`} />
        <div className="visor-barra">
          <button className="btn secundario chico" disabled={i === 0} onClick={() => setI(i - 1)}>
            Anterior
          </button>
          <span className="suave chico">
            {i + 1} de {fotos.length}
          </span>
          <button className="btn secundario chico" disabled={i === fotos.length - 1} onClick={() => setI(i + 1)}>
            Siguiente
          </button>
          <a className="btn secundario chico" href={srcFoto(f)} target="_blank" rel="noreferrer">
            Abrir grande
          </a>
          <button className="btn primario chico" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
