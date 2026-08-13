
// VARIABLES GLOBALES

let imagenSeleccionada = null;   // File o blob de la imagen actual
let imagenBase64 = null;         // Base64 sin prefijo para la API
let streamCamara = null;         // Stream de la cámara
let historial = [];              // Array de registros

// Cargar historial al inicio si está logueado
document.addEventListener("DOMContentLoaded", () => {
  const userId = sessionStorage.getItem("usuario_id");
  if (sessionStorage.getItem("logueado") === "true" && userId) {
    fetch(`php/obtener_historial.php?usuario_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // FIX 1: convertir string ISO de la BD a objetos Date
          historial = data.data.map(r => ({
            ...r,
            fecha: new Date(r.fecha.replace(" ", "T"))
          }));
          renderizarHistorial();
        }
      })
      .catch(e => console.error("Error cargando historial:", e));
  }
});
let contadorHistorial = 1;
let enAnalisis = false;

const MOSTRAR_POR_PAGINA = 5;
let paginaActual = 1;


// REFERENCIAS AL DOM

const btnArchivo = document.getElementById("btnArchivo");
const fileInput = document.getElementById("fileInput");
const btnCamara = document.getElementById("btnCamara");
const capturar = document.getElementById("capturar");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const fileInfo = document.getElementById("fileInfo");
const uploadZone = document.getElementById("uploadZone");
const mensajeCarga = document.getElementById("mensajeCarga");
const nombreArchivo = document.getElementById("nombreArchivo");
const tamanoArchivo = document.getElementById("tamanoArchivo");
const analizarBtn = document.getElementById("analizarBtn");
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const spinner = document.getElementById("spinner");
const statusText = document.getElementById("statusText");
const statusSub = document.getElementById("statusSub");
const resultado = document.getElementById("resultado");
const confianza = document.getElementById("confianza");
const circleFill = document.getElementById("circleFill");
const descripcionResultado = document.getElementById("descripcionResultado");
const recomendacion = document.getElementById("recomendacion");
const fechaAnalisis = document.getElementById("fechaAnalisis");
const estadoResultado = document.getElementById("estadoResultado");
const estadoBadge = document.getElementById("estadoBadge");
const estadoTexto = document.getElementById("estadoTexto");
const historialBody = document.getElementById("historialBody");
const eliminarImagen = document.getElementById("eliminarImagen");
const nuevoAnalisis = document.getElementById("nuevoAnalisis");
const guardarDiagnostico = document.getElementById("guardarDiagnostico");
const searchInput = document.getElementById("searchInput");
const hamburger = document.getElementById("hamburger");
const sidebar = document.querySelector(".sidebar");
const navAnalisis = document.getElementById("navAnalisis");

const toast = document.getElementById("toast");

// USUARIO – declarados aquí para estar disponibles en todos los listeners
const logoutBtn = document.getElementById("logoutBtn");
const fotoUser = document.getElementById("fotoUser");
const nombreUsuario = document.getElementById("nombreUsuario");
const avatar = document.getElementById("userAvatar");

// Mostrar nombre guardado 
if (nombreUsuario) {
  nombreUsuario.textContent = sessionStorage.getItem("nombreUsuario") || "Administrador";
}

// Cargar foto de perfil 
(function cargarFotoInicial() {
  const fotoGuardada = sessionStorage.getItem("foto_perfil") || localStorage.getItem("foto_perfil");
  if (fotoGuardada && avatar) {
    avatar.textContent = "";
    avatar.style.backgroundImage = `url(${fotoGuardada})`;
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
  }
})();


if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    sessionStorage.clear();
    localStorage.removeItem("logueado");
    localStorage.removeItem("usuario_id");
    localStorage.removeItem("nombreUsuario");
    localStorage.removeItem("foto_perfil");
    localStorage.removeItem("recordar_usuario");
    window.location.replace("login.html");
  });
}

//Inicializar filtro de fechas cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", inicializarFiltroFecha);

// UTILIDADES

function mostrarToast(texto, esError = false) {
  toast.textContent = texto;
  toast.classList.remove("error");
  if (esError) toast.classList.add("error");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

// MODAL DE ADVERTENCIA – ANÁLISIS NO VÁLIDO

const warnModalOverlay = document.getElementById("warnModalOverlay");
const warnModalTitle   = document.getElementById("warnModalTitle");
const warnModalDesc    = document.getElementById("warnModalDesc");
const warnModalBtn     = document.getElementById("warnModalBtn");

function mostrarModalAdvertencia(mensaje, titulo = null) {
  if (titulo && warnModalTitle) warnModalTitle.textContent = titulo;
  else if (warnModalTitle) warnModalTitle.textContent = "No se pudo realizar el análisis";
  
  if (mensaje) warnModalDesc.textContent = mensaje;
  warnModalOverlay.classList.add("active");
  warnModalBtn.focus();
}

function cerrarModalAdvertencia() {
  warnModalOverlay.classList.remove("active");
}

if (warnModalBtn) {
  warnModalBtn.addEventListener("click", cerrarModalAdvertencia);
}
if (warnModalOverlay) {
  warnModalOverlay.addEventListener("click", (e) => {
    if (e.target === warnModalOverlay) cerrarModalAdvertencia();
  });
}

// MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
const deleteModalOverlay = document.getElementById("deleteModalOverlay");
const deleteModalCancelBtn = document.getElementById("deleteModalCancelBtn");
const deleteModalConfirmBtn = document.getElementById("deleteModalConfirmBtn");
let registroAEliminarId = null;

function abrirModalEliminar(id) {
  registroAEliminarId = id;
  deleteModalOverlay.classList.add("active");
}

function cerrarModalEliminar() {
  registroAEliminarId = null;
  deleteModalOverlay.classList.remove("active");
}

if(deleteModalCancelBtn) deleteModalCancelBtn.addEventListener("click", cerrarModalEliminar);
if(deleteModalOverlay) deleteModalOverlay.addEventListener("click", (e) => {
  if (e.target === deleteModalOverlay) cerrarModalEliminar();
});

function ejecutarEliminacion(id) {
  const userId = sessionStorage.getItem("usuario_id");
  if (userId) {
    fetch("php/eliminar_analisis.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `id=${id}&usuario_id=${userId}`
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          historial = historial.filter(r => r.id !== id);
          renderizarHistorial(searchInput.value);
          mostrarToast("Registro eliminado");
        } else {
          mostrarToast("Error al eliminar", true);
        }
      });
  }
}

if(deleteModalConfirmBtn) deleteModalConfirmBtn.addEventListener("click", () => {
  if(registroAEliminarId !== null) {
    ejecutarEliminacion(registroAEliminarId);
  }
  cerrarModalEliminar();
});

// MODAL DE DETALLES DEL ANÁLISIS
const detailsModalOverlay = document.getElementById("detailsModalOverlay");
const detailsModalCloseBtn = document.getElementById("detailsModalCloseBtn");
const detailsModalCloseIcon = document.getElementById("detailsModalCloseIcon");

function abrirModalDetalles(registro) {
  const img = document.getElementById("detailsModalImg");
  const placeholder = document.getElementById("detailsModalImgPlaceholder");
  if (registro.imgSrc) {
    img.src = registro.imgSrc;
    img.style.display = "block";
    placeholder.style.display = "none";
  } else {
    img.style.display = "none";
    placeholder.style.display = "block";
  }
  document.getElementById("detailsModalId").textContent = "Registro #" + registro.id;
  document.getElementById("detailsModalDiag").textContent = registro.diagnostico;
  document.getElementById("detailsModalConfText").textContent = registro.confianza + "%";
  
  // Create safe Date object for formatearFecha
  const rFecha = registro.fecha instanceof Date ? registro.fecha : new Date(registro.fecha);
  document.getElementById("detailsModalDate").textContent = formatearFecha(rFecha);
  
  const bar = document.getElementById("detailsModalConfBar");
  bar.style.width = registro.confianza + "%";
  
  const esSana = registro.tipo === "sana";
  const esEnfermedad = registro.tipo === "enfermedad";
  
  bar.style.backgroundColor = esSana ? "#2e7d32" : (esEnfermedad ? "#f57c00" : "#d32f2f");
  
  const badge = document.getElementById("detailsModalTypeBadge");
  badge.textContent = esSana ? "Sin problemas" : (esEnfermedad ? "Enfermedad detectada" : "Plaga detectada");
  badge.style.color = esSana ? "#2e7d32" : (esEnfermedad ? "#f57c00" : "#d32f2f");
  
  detailsModalOverlay.classList.add("active");
}

function cerrarModalDetalles() {
  detailsModalOverlay.classList.remove("active");
}

if(detailsModalCloseBtn) detailsModalCloseBtn.addEventListener("click", cerrarModalDetalles);
if(detailsModalCloseIcon) detailsModalCloseIcon.addEventListener("click", cerrarModalDetalles);
if(detailsModalOverlay) detailsModalOverlay.addEventListener("click", (e) => {
  if (e.target === detailsModalOverlay) cerrarModalDetalles();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (warnModalOverlay && warnModalOverlay.classList.contains("active")) cerrarModalAdvertencia();
    if (deleteModalOverlay && deleteModalOverlay.classList.contains("active")) cerrarModalEliminar();
    if (detailsModalOverlay && detailsModalOverlay.classList.contains("active")) cerrarModalDetalles();
  }
});

function setProgreso(porcentaje) {
  progressBar.style.width = porcentaje + "%";
  progressLabel.textContent = porcentaje + "%";
}

function setCirculo(porcentajePct) {
  // Circunferencia ≈ 163 (2πr con r=26)
  const offset = 163 - (163 * porcentajePct / 100);
  circleFill.style.strokeDashoffset = offset;
}

function formatearFecha(fecha = new Date()) {
  return fecha.toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}


// SIDEBAR HAMBURGER

hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});


// CARGA DE IMAGEN DESDE ARCHIVO

btnArchivo.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", function () {
  if (this.files[0]) cargarImagen(this.files[0]);
});

function cargarImagen(archivo) {
  const formatos = ["image/jpeg", "image/jpg", "image/png"];

  if (!formatos.includes(archivo.type)) {
    mostrarToast("Solo se permiten imágenes JPG y PNG", true);
    return;
  }

  if (archivo.size > 10 * 1024 * 1024) {
    mostrarToast("La imagen supera los 10 MB", true);
    return;
  }

  imagenSeleccionada = archivo;

  const reader = new FileReader();

  reader.onload = function (e) {
    const dataURL = e.target.result;
    // Guardar base64 sin el prefijo "data:image/xxx;base64,"
    imagenBase64 = dataURL.split(",")[1];

    previewImage.src = dataURL;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";

    nombreArchivo.textContent = "📄 " + archivo.name;
    tamanoArchivo.textContent = "Tamaño: " + (archivo.size / 1024 / 1024).toFixed(2) + " MB";

    fileInfo.style.display = "flex";
    mensajeCarga.style.display = "flex";
  };

  reader.readAsDataURL(archivo);
}

// DRAG AND DROP

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  const archivo = e.dataTransfer.files[0];
  if (archivo) cargarImagen(archivo);
});

uploadZone.addEventListener("click", () => fileInput.click());


// ELIMINAR IMAGEN

eliminarImagen.addEventListener("click", () => {
  limpiarImagen();
});

function limpiarImagen() {
  previewImage.src = "";
  previewImage.style.display = "none";
  previewPlaceholder.style.display = "flex";
  fileInfo.style.display = "none";
  mensajeCarga.style.display = "none";
  fileInput.value = "";
  imagenSeleccionada = null;
  imagenBase64 = null;
}


// CÁMARA

btnCamara.addEventListener("click", async () => {
  // Si ya hay cámara activa, cerrarla
  if (streamCamara) {
    cerrarCamara();
    return;
  }

  try {
    streamCamara = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = streamCamara;
    video.style.display = "block";
    capturar.style.display = "flex";
    btnCamara.textContent = "❌ Cerrar cámara";
  } catch (error) {
    mostrarToast("No se pudo acceder a la cámara", true);
  }
});

capturar.addEventListener("click", () => {
  if (!streamCamara) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataURL = canvas.toDataURL("image/png");
  imagenBase64 = dataURL.split(",")[1];
  imagenSeleccionada = true; // marca que hay imagen

  previewImage.src = dataURL;
  previewImage.style.display = "block";
  previewPlaceholder.style.display = "none";

  fileInfo.style.display = "none";
  mensajeCarga.style.display = "none";

  cerrarCamara();
  mostrarToast("Foto capturada correctamente ✓");
});

function cerrarCamara() {
  if (streamCamara) {
    streamCamara.getTracks().forEach(track => track.stop());
    streamCamara = null;
  }
  video.srcObject = null;
  video.style.display = "none";
  capturar.style.display = "none";
  btnCamara.textContent = "📷 Tomar fotografía";
}


// ANALIZAR IMAGEN 

analizarBtn.addEventListener("click", async () => {
  if (!imagenBase64) {
    mostrarModalAdvertencia("Por favor, selecciona o captura una imagen antes de continuar.", "No se detectó ningún archivo para analizar");
    return;
  }

  if (enAnalisis) return;
  enAnalisis = true;
  analizarBtn.disabled = true;

  // Animación de progreso
  setProgreso(0);
  spinner.classList.remove("done");
  spinner.classList.add("active");
  statusText.textContent = "Analizando imagen...";
  statusSub.textContent = "Esto puede tardar unos segundos.";

  let progreso = 0;
  const intervalo = setInterval(() => {
    if (progreso < 85) {
      progreso += Math.random() * 3;
      setProgreso(Math.min(Math.floor(progreso), 85));
    }
  }, 200);

  try {

    // AQUI VA MI IA
    const respuesta = await analizarConMiIA(imagenBase64);
    clearInterval(intervalo);

    // Llegar al 100%
    setProgreso(100);
    spinner.classList.remove("active");
    spinner.classList.add("done");
    statusText.textContent = "Análisis completado ✓";
    statusSub.textContent = "Resultado generado por IA.";

    mostrarResultado(respuesta);

  } catch (err) {
    clearInterval(intervalo);
    setProgreso(0);
    spinner.classList.remove("active", "done");
    statusText.textContent = "Error al analizar";
    statusSub.textContent = "Ocurrió un problema. Intenta de nuevo.";
    mostrarModalAdvertencia(err.message);
  }

  enAnalisis = false;
  analizarBtn.disabled = false;
});


// LLAMADA A LA IA REAL

async function analizarConMiIA(base64) {

  const respuesta = await fetch(
    "https://invernadero-inteligente-ia.onrender.com/predict",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        image: base64
      })
    }
  );


  const datos = await respuesta.json();


  if (!respuesta.ok || !datos.success) {

    throw new Error(
      datos.message ||
      "Error desconocido al analizar la imagen."
    );

  }


  return {

    diagnostico: datos.diagnostico,

    tipo: datos.tipo,

    confianza: datos.confianza,

    descripcion: datos.descripcion,

    recomendacion: datos.recomendacion

  };
}


// MOSTRAR RESULTADO EN TARJETA 4

function mostrarResultado(datos) {
  const esSana = datos.tipo === "sana";
  const pct = Math.min(Math.max(parseInt(datos.confianza) || 0, 0), 100);
  const fecha = new Date();

  // Badge de estado
  estadoResultado.style.display = "flex";
  estadoResultado.className = esSana ? "alert-green" : "alert-red";
  estadoBadge.textContent = esSana ? "✅" : "⚠️";
  estadoTexto.textContent = esSana ? "Planta en buen estado" : "Problema detectado";

  // Diagnóstico
  resultado.textContent = datos.diagnostico;
  resultado.className = "result-value" + (esSana ? " sano" : "");

  // Confianza circular
  confianza.textContent = pct + "%";
  confianza.style.color = esSana ? "#2e7d32" : "#c62828";
  circleFill.style.stroke = esSana ? "#2e7d32" : "#c62828";
  setCirculo(pct);

  // Fecha
  fechaAnalisis.textContent = "📅 " + formatearFecha(fecha);

  // Descripción
  descripcionResultado.textContent = datos.descripcion || "Sin descripción disponible.";

  // Recomendación
  recomendacion.innerHTML = `<strong>💡 Recomendación</strong> ${datos.recomendacion || "No disponible."}`;

  mostrarToast("Análisis completado ✓");

  // Guardar en la base de datos
  const userId = sessionStorage.getItem("usuario_id");
  if (sessionStorage.getItem("logueado") === "true" && userId) {
    fetch("php/guardar_analisis.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body:
        "usuario_id=" + encodeURIComponent(userId) +
        "&diagnostico=" + encodeURIComponent(datos.diagnostico) +
        "&confianza=" + encodeURIComponent(datos.confianza) +
        "&descripcion=" + encodeURIComponent(datos.descripcion) +
        "&recomendacion=" + encodeURIComponent(datos.recomendacion) +
        "&imagen=" + encodeURIComponent(previewImage.src)
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          // Agregar al historial con el ID real
          agregarAlHistorial({
            id: data.id,
            fecha: fecha,
            imgSrc: previewImage.src,
            diagnostico: datos.diagnostico,
            tipo: datos.tipo,
            confianza: pct
          });
        } else {
          console.error("Error al guardar historial:", data.message);
        }
      })
      .catch(e => console.error("Error de conexión al guardar historial:", e));
  } else {
    // Si no está logueado, usar id temporal
    agregarAlHistorial({
      id: contadorHistorial++,
      fecha: fecha,
      imgSrc: previewImage.src,
      diagnostico: datos.diagnostico,
      tipo: datos.tipo,
      confianza: pct
    });
  }
}


// HISTORIAL

function agregarAlHistorial(registro) {
  historial.unshift(registro); // más reciente primero
  renderizarHistorial();
}

function renderizarHistorial(filtro = "") {
  const filtrados = historial.filter(r => {
    // Filtro de texto
    const textoOk = !filtro ||
      r.diagnostico.toLowerCase().includes(filtro.toLowerCase()) ||
      formatearFecha(r.fecha instanceof Date ? r.fecha : new Date(r.fecha)).includes(filtro);

    // FIX 1: Filtro por rango de fechas
    const fecha = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
    const desdeOk = !filtroFechaDesde || fecha >= filtroFechaDesde;
    const hastaOk = !filtroFechaHasta || fecha <= filtroFechaHasta;

    return textoOk && desdeOk && hastaOk;
  });

  historialBody.innerHTML = "";

  if (filtrados.length === 0) {
    historialBody.innerHTML = `
      <tr id="emptyRow">
        <td colspan="7" style="text-align:center; color:#aaa; padding:30px;">
          ${filtro ? "Sin coincidencias para: " + filtro : "Sin registros aún. Analiza una imagen para comenzar."}
        </td>
      </tr>`;
    document.getElementById("seeMoreWrap").style.display = "none";
    return;
  }

  const visibles = filtrados.slice(0, paginaActual * MOSTRAR_POR_PAGINA);

  visibles.forEach((r) => {
    const esSana = r.tipo === "sana";
    const esEnfermedad = r.tipo === "enfermedad";

    const colorTexto = esSana ? "green-text" : esEnfermedad ? "orange-text" : "red-text";
    const colorBarra = esSana ? "green-fill" : esEnfermedad ? "orange-fill" : "red-fill";
    const badge = esSana
      ? '<span class="badge badge-green">Sin problemas</span>'
      : esEnfermedad
        ? '<span class="badge badge-orange">Enfermedad detectada</span>'
        : '<span class="badge badge-red">Plaga detectada</span>';

    const miniatura = r.imgSrc
      ? `<img src="${r.imgSrc}" class="thumb-preview" alt="miniatura">`
      : `<div class="thumb-placeholder">🌿</div>`;

    const fila = document.createElement("tr");
    fila.dataset.id = r.id;
    fila.innerHTML = `
      <td>${r.id}</td>
      <td>${formatearFecha(r.fecha)}</td>
      <td>${miniatura}</td>
      <td class="${colorTexto}" style="font-weight:600">${r.diagnostico}</td>
      <td>
        <div class="conf-bar">
          ${r.confianza}%
          <div class="conf-track"><div class="conf-fill ${colorBarra}" style="width:${r.confianza}%"></div></div>
        </div>
      </td>
      <td>${badge}</td>
      <td>
        <div class="actions-cell">
          <div class="icon-btn blue" title="Ver detalles" data-action="ver" data-id="${r.id}">👁️</div>
          <div class="icon-btn" title="Descargar imagen" data-action="descargar" data-id="${r.id}">⬇️</div>
          <div class="icon-btn red" title="Eliminar registro" data-action="eliminar" data-id="${r.id}">🗑️</div>
        </div>
      </td>
    `;
    historialBody.appendChild(fila);
  });

  // Botón "ver más"
  const seeMoreWrap = document.getElementById("seeMoreWrap");
  if (filtrados.length > visibles.length) {
    seeMoreWrap.style.display = "block";
  } else {
    seeMoreWrap.style.display = "none";
  }

  // Actualizar estadísticas si la sección está visible
  actualizarEstadisticas();
}

// Delegación de eventos en la tabla
historialBody.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const id = parseInt(btn.dataset.id);
  const accion = btn.dataset.action;
  const registro = historial.find(r => r.id === id);
  if (!registro) return;

  if (accion === "eliminar") {
    abrirModalEliminar(id);
  } else if (accion === "ver") {
    abrirModalDetalles(registro);
  } else if (accion === "descargar") {
    if (registro.imgSrc) {
      const a = document.createElement("a");
      a.href = registro.imgSrc;
      a.download = `albahaca_${registro.id}_${registro.diagnostico.replace(/\s/g, "_")}.png`;
      a.click();
    } else {
      mostrarToast("No hay imagen disponible para descargar", true);
    }
  }
});

// Ver más
document.getElementById("verMasBtn").addEventListener("click", () => {
  paginaActual++;
  renderizarHistorial(searchInput.value);
});

// Buscador en tiempo real
searchInput.addEventListener("input", () => {
  paginaActual = 1;
  renderizarHistorial(searchInput.value);
});


// FILTRO POR RANGO DE FECHAS

let filtroFechaDesde = null;
let filtroFechaHasta = null;

function inicializarFiltroFecha() {
  const btnFiltrar = document.getElementById("btnFiltrar");
  if (!btnFiltrar) return;

  // Crear panel desplegable si no existe
  if (!document.getElementById("panelFecha")) {
    const panel = document.createElement("div");
    panel.id = "panelFecha";
    panel.style.cssText = `
      display:none; position:absolute; right:0; top:calc(100% + 8px);
      background:#fff; border:1.5px solid #d1fae5; border-radius:12px;
      box-shadow:0 8px 24px rgba(0,0,0,.12); padding:16px 18px;
      z-index:999; min-width:260px;
    `;
    panel.innerHTML = `
      <div style="font-size:.82rem;color:#4a7a5a;font-weight:700;margin-bottom:10px;">📅 Filtrar por rango de fechas</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div>
          <label style="font-size:.78rem;color:#6b8c75;display:block;margin-bottom:3px;">Desde</label>
          <input type="date" id="fechaDesde" style="width:100%;padding:7px 10px;border:1.5px solid #d0e4d8;border-radius:8px;font-size:.88rem;outline:none;">
        </div>
        <div>
          <label style="font-size:.78rem;color:#6b8c75;display:block;margin-bottom:3px;">Hasta</label>
          <input type="date" id="fechaHasta" style="width:100%;padding:7px 10px;border:1.5px solid #d0e4d8;border-radius:8px;font-size:.88rem;outline:none;">
        </div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button id="btnAplicarFecha" style="flex:1;padding:8px;background:#2e7d32;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.86rem;font-weight:600;">Aplicar</button>
          <button id="btnLimpiarFecha" style="flex:1;padding:8px;background:#f1f5f9;color:#374151;border:1.5px solid #d1d5db;border-radius:8px;cursor:pointer;font-size:.86rem;">Limpiar</button>
        </div>
      </div>
    `;

    // Insertar relativo al botón
    btnFiltrar.parentElement.style.position = "relative";
    btnFiltrar.parentElement.appendChild(panel);

    // Botón aplicar
    document.getElementById("btnAplicarFecha").addEventListener("click", () => {
      const desde = document.getElementById("fechaDesde").value;
      const hasta = document.getElementById("fechaHasta").value;
      filtroFechaDesde = desde ? new Date(desde + "T00:00:00") : null;
      filtroFechaHasta = hasta ? new Date(hasta + "T23:59:59") : null;
      paginaActual = 1;
      renderizarHistorial(searchInput.value);
      panel.style.display = "none";
      // Indicar visualmente que hay filtro activo
      btnFiltrar.style.background = (filtroFechaDesde || filtroFechaHasta) ? "#d1fae5" : "";
      btnFiltrar.style.color = (filtroFechaDesde || filtroFechaHasta) ? "#065f46" : "";
    });

    // Botón limpiar
    document.getElementById("btnLimpiarFecha").addEventListener("click", () => {
      document.getElementById("fechaDesde").value = "";
      document.getElementById("fechaHasta").value = "";
      filtroFechaDesde = null;
      filtroFechaHasta = null;
      paginaActual = 1;
      renderizarHistorial(searchInput.value);
      panel.style.display = "none";
      btnFiltrar.style.background = "";
      btnFiltrar.style.color = "";
    });

    // Cerrar al hacer clic fuera
    document.addEventListener("click", (e) => {
      if (!btnFiltrar.contains(e.target) && !panel.contains(e.target)) {
        panel.style.display = "none";
      }
    });
  }

  // Alternar panel al hacer clic
  btnFiltrar.addEventListener("click", (e) => {
    e.stopPropagation();
    const panel = document.getElementById("panelFecha");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });
}



// GUARDAR DIAGNÓSTICO PDF

guardarDiagnostico.addEventListener("click", () => {
  if (!window.jspdf) {
    mostrarToast("La librería PDF no está cargada", true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margen = 20;
  let y = margen;


  const colorVerde = [46, 125, 50];
  const colorVerdeClaro = [240, 248, 240];
  const colorTexto = [60, 60, 60];
  const colorGris = [130, 130, 130];

  // 1. Logo y Título
  const logoEl = document.querySelector('.logo-img');
  if (logoEl && logoEl.complete) {
    try {
      pdf.addImage(logoEl, "PNG", margen, y - 2, 14, 14);
    } catch (e) {
      pdf.setFontSize(16);
      pdf.text("Invernadero Inteligente", margen, y + 8);
    }
  } else {
    pdf.setFontSize(16);
    pdf.text("Invernadero Inteligente", margen, y + 8);
  }

  pdf.setTextColor(colorVerde[0], colorVerde[1], colorVerde[2]);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Reporte de Análisis de Albahaca", margen + 18, y + 8);
  y += 20;

  // Línea divisoria suave
  pdf.setDrawColor(220, 235, 220);
  pdf.line(margen, y, W - margen, y);
  y += 8;

  // 2. Fecha, hora y número de análisis
  pdf.setTextColor(colorGris[0], colorGris[1], colorGris[2]);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const ahora = new Date().toLocaleString("es-MX");
  const numAnalisis = "ID-" + Math.floor(Math.random() * 90000 + 10000);

  pdf.text(`Fecha y hora: ${ahora}`, margen, y);
  pdf.text(`Análisis N°: ${numAnalisis}`, W - margen, y, { align: "right" });
  y += 10;

  // 3. Imagen de la planta y Resultado (Centro)
  // Caja de fondo
  pdf.setFillColor(colorVerdeClaro[0], colorVerdeClaro[1], colorVerdeClaro[2]);
  pdf.roundedRect(margen, y, W - margen * 2, 64, 4, 4, "F");

  // Imagen
  const imgPreview = document.getElementById("previewImage");
  if (imgPreview && imgPreview.src && imgPreview.style.display !== "none") {
    try {
      pdf.addImage(imgPreview, "JPEG", margen + 6, y + 6, 52, 52);
    } catch (e) {
      pdf.setTextColor(150, 150, 150);
      pdf.text("Sin imagen", margen + 20, y + 35);
    }
  } else {
    pdf.setTextColor(150, 150, 150);
    pdf.text("Sin imagen", margen + 20, y + 35);
  }

  // Resultado textual
  const diagnosticoTxt = document.getElementById("resultado").textContent || "Sin analizar";
  const confianzaTxt = document.getElementById("confianza").textContent || "0%";

  pdf.setTextColor(colorVerde[0], colorVerde[1], colorVerde[2]);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Diagnóstico de la IA", margen + 66, y + 16);

  pdf.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("Estado de la planta:", margen + 66, y + 26);

  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  if (diagnosticoTxt.toLowerCase().includes("sana") || diagnosticoTxt.toLowerCase().includes("saludable")) {
    pdf.setTextColor(46, 125, 50); // Verde sano
  } else if (diagnosticoTxt.toLowerCase().includes("sin analizar")) {
    pdf.setTextColor(150, 150, 150); // Gris
  } else {
    pdf.setTextColor(198, 40, 40); // Rojo plaga
  }
  pdf.text(diagnosticoTxt, margen + 66, y + 34);

  pdf.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Confianza del modelo: ${confianzaTxt}`, margen + 66, y + 48);

  y += 80;

  // 4. Recomendaciones
  pdf.setTextColor(colorVerde[0], colorVerde[1], colorVerde[2]);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Recomendaciones de cuidado", margen, y);
  y += 8;

  const recEl = document.getElementById("recomendacion");
  let recTxt = recEl ? recEl.innerText.replace("💡 Recomendación", "").trim() : "Sin recomendación.";
  if (recTxt === "" || recTxt.includes("Aún no disponible")) {
    recTxt = "Mantén las condiciones ideales de luz y humedad para tu albahaca. Revisa periódicamente las hojas para detectar cualquier anomalía a tiempo.";
  }

  pdf.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2]);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  const recLines = pdf.splitTextToSize(recTxt, W - margen * 2);
  pdf.text(recLines, margen, y);

  // 5. Pie de página
  const maxY = 280;
  pdf.setDrawColor(220, 235, 220);
  pdf.line(margen, maxY - 12, W - margen, maxY - 12);

  pdf.setTextColor(colorGris[0], colorGris[1], colorGris[2]);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "italic");
  pdf.text("Reporte generado por el Sistema Invernadero Inteligente UPALT", W / 2, maxY - 6, { align: "center" });

  // Guardar archivo
  const ts = new Date().toISOString().slice(0, 10);
  pdf.save(`Reporte_Albahaca_${ts}.pdf`);
  mostrarToast("Reporte PDF guardado ✓");
});


// NUEVO ANÁLISIS

nuevoAnalisis.addEventListener("click", () => {
  limpiarImagen();

  resultado.textContent = "Sin analizar";
  resultado.className = "result-value";
  confianza.textContent = "0%";
  confianza.style.color = "#2e7d32";
  circleFill.style.strokeDashoffset = "163";
  circleFill.style.stroke = "#2e7d32";

  descripcionResultado.textContent = "Esperando análisis...";
  recomendacion.innerHTML = "<strong>💡 Recomendación</strong> Aún no disponible.";
  fechaAnalisis.textContent = "Sin análisis";
  estadoResultado.style.display = "none";

  setProgreso(0);
  spinner.classList.remove("active", "done");
  statusText.textContent = "Esperando imagen...";
  statusSub.textContent = "Carga una imagen y presiona Analizar para comenzar.";

  mostrarToast("Listo para un nuevo análisis");
});


// NAV MENU 


const navInicio = document.getElementById("navInicio");

if (navInicio) {
  navInicio.addEventListener("click", function (e) {
    e.preventDefault();
    window.location.href = "index.html";
  });
}

// Cambiar foto de perfil al hacer clic en el avatar (legacy)
if (fotoUser) fotoUser.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataURL = e.target.result;
    // Aplicar en pantalla
    avatar.textContent = "";
    avatar.style.backgroundImage = `url(${dataURL})`;
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";

    // Guardar en storage 
    sessionStorage.setItem("foto_perfil", dataURL);
    if (localStorage.getItem("logueado") === "true") {
      localStorage.setItem("foto_perfil", dataURL);
    }

    // Guardar en la BD
    const userId = sessionStorage.getItem("usuario_id");
    if (userId) {
      fetch("php/guardar_foto.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "usuario_id=" + encodeURIComponent(userId) + "&foto=" + encodeURIComponent(dataURL)
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            mostrarToast("Foto actualizada ✓");
          } else {
            mostrarToast("Error al guardar foto: " + data.message, true);
          }
        })
        .catch(() => mostrarToast("Error al guardar la foto", true));
    } else {
      mostrarToast("Foto actualizada ✓");
    }
  };
  reader.readAsDataURL(file);
});

const btnTema = document.getElementById("btnTema");
const temaNombreEl = document.getElementById("temaNombre");

const TEMAS = [
  { clave: "verde", clase: "tema-verde", label: "Verde" },
  { clave: "azul", clase: "tema-azul", label: "Azul" },
  { clave: "oscuro", clase: "tema-oscuro", label: "Oscuro" },
];

function aplicarTema(clave) {
  const t = TEMAS.find(x => x.clave === clave) || TEMAS[0];
  // Aplica en html Y en body para que las variables CSS estén disponibles
  // en ambos niveles (el script del <head> usa html, el runtime usa body)
  document.documentElement.className = t.clase;
  document.body.className = t.clase;
  if (temaNombreEl) temaNombreEl.textContent = t.label;
  localStorage.setItem("tema", t.clave);
}

// Aplicar tema guardado al cargar
aplicarTema(localStorage.getItem("tema") || "verde");

btnTema.addEventListener("click", () => {
  const actual = localStorage.getItem("tema") || "verde";
  const idx = TEMAS.findIndex(x => x.clave === actual);
  const siguiente = TEMAS[(idx + 1) % TEMAS.length];
  aplicarTema(siguiente.clave);
});

const leerResultadoBtn = document.getElementById("leerResultado");
let leyendo = false;

leerResultadoBtn.addEventListener("click", () => {

  if (leyendo) {
    speechSynthesis.cancel();
    leyendo = false;
    leerResultadoBtn.textContent = "🔊 Escuchar resultado";
    leerResultadoBtn.classList.remove("activo");
    return;
  }

  const texto =
    "Diagnóstico: " + resultado.textContent +
    ". Confianza: " + confianza.textContent +
    ". " + descripcionResultado.textContent;

  const voz = new SpeechSynthesisUtterance(texto);
  voz.lang = "es-MX";

  voz.onend = () => {
    leyendo = false;
    leerResultadoBtn.textContent = "🔊 Escuchar resultado";
    leerResultadoBtn.classList.remove("activo");
  };

  leyendo = true;
  leerResultadoBtn.textContent = "⏹ Detener";
  leerResultadoBtn.classList.add("activo");
  speechSynthesis.speak(voz);

});


// GALERÍA DE DIAGNÓSTICOS

// Referencias DOM galería y estadísticas
const navGaleria = document.getElementById("navGaleria");
const navEstadisticas = document.getElementById("navEstadisticas");
const seccionAnalisis = document.querySelector(".cards-row");
const seccionHistorial = document.getElementById("seccionHistorial");
const seccionGaleria = document.getElementById("seccionGaleria");
const seccionEstadisticas = document.getElementById("seccionEstadisticas");
const galeriaGrid = document.getElementById("galeriaGrid");
const galeriaEmpty = document.getElementById("galeriaEmpty");
const heroBanner = document.getElementById("heroBanner");

// Modal
const galeriaModal = document.getElementById("galeriaModal");
const galeriaModalOverlay = document.getElementById("galeriaModalOverlay");
const galeriaModalClose = document.getElementById("galeriaModalClose");
const galeriaModalImg = document.getElementById("galeriaModalImg");
const galeriaModalDiag = document.getElementById("galeriaModalDiag");
const galeriaModalFecha = document.getElementById("galeriaModalFecha");
const galeriaModalConf = document.getElementById("galeriaModalConf");


const HEADER_ANALISIS = {
  title: "Análisis de Albahaca 🌿",
  subtitle: "Detecta enfermedades y plagas en tus plantas con inteligencia artificial"
};

function mostrarSeccion(seccion) {
  // Sidebar active
  if (navAnalisis) navAnalisis.classList.toggle("active", seccion === "analisis");
  if (navGaleria) navGaleria.classList.toggle("active", seccion === "galeria");
  if (navEstadisticas) navEstadisticas.classList.toggle("active", seccion === "estadisticas");

  // Contenido
  if (seccionAnalisis) seccionAnalisis.style.display = seccion === "analisis" ? "" : "none";
  if (seccionHistorial) seccionHistorial.style.display = seccion === "analisis" ? "" : "none";
  if (seccionGaleria) seccionGaleria.style.display = seccion === "galeria" ? "" : "none";
  if (seccionEstadisticas) seccionEstadisticas.style.display = seccion === "estadisticas" ? "" : "none";

  // Ocultar formularios de perfil
  const sPerfil = document.getElementById("seccionEditarPerfil");
  if (sPerfil) sPerfil.style.display = "none";
  const sPass = document.getElementById("seccionCambiarPass");
  if (sPass) sPass.style.display = "none";

  // Ocultar banner en otras secciones
  if (heroBanner) heroBanner.style.display = seccion === "analisis" ? "" : "none";

  if (seccion === "galeria") renderizarGaleria();
  if (seccion === "estadisticas") actualizarEstadisticas();
}

navGaleria && navGaleria.addEventListener("click", (e) => {
  e.preventDefault();
  mostrarSeccion("galeria");
});

navAnalisis && navAnalisis.addEventListener("click", (e) => {
  e.preventDefault();
  mostrarSeccion("analisis");
});

navEstadisticas && navEstadisticas.addEventListener("click", (e) => {
  e.preventDefault();
  mostrarSeccion("estadisticas");
});



//Estado de filtros de galería
let galeriaBusqueda = "";
let galeriaFiltro = "todos";


function renderizarGaleria() {
  if (!galeriaGrid) return;

  // Referencias a elementos del toolbar
  const counterNumEl = document.getElementById("galeriaCounterNum");
  const resultCountEl = document.getElementById("galeriaResultCount");
  const emptyIconEl = document.getElementById("galeriaEmptyIcon");
  const emptyTitleEl = document.getElementById("galeriaEmptyTitle");
  const emptySubEl = document.getElementById("galeriaEmptySub");

  // Ordenar de más reciente a más antigua 
  const todosOrdenados = [...historial]
    .filter(i => i.imgSrc && i.imgSrc.trim() !== "")
    .sort((a, b) => {
      const fa = a.fecha instanceof Date ? a.fecha : new Date(String(a.fecha).replace(" ", "T"));
      const fb = b.fecha instanceof Date ? b.fecha : new Date(String(b.fecha).replace(" ", "T"));
      return fb - fa;
    });

  // Actualizar contador total (siempre refleja la BD) 
  if (counterNumEl) counterNumEl.textContent = todosOrdenados.length;

  // Aplicar filtros 
  const busq = galeriaBusqueda.trim().toLowerCase();

  const filtrados = todosOrdenados.filter(item => {
    const diag = (item.diagnostico || "").toLowerCase().trim();

    // Filtro por tipo
    if (galeriaFiltro === "sana") {
      if (!(diag === "sana" || diag === "planta sana" || diag === "saludable")) return false;
    } else if (galeriaFiltro === "plaga") {
      if (diag === "sana" || diag === "planta sana" || diag === "saludable" || diag === "") return false;
    }

    // Filtro por texto
    if (busq && !diag.includes(busq)) return false;

    return true;
  });

  //  Mostrar contador de resultados
  const hayFiltroActivo = busq !== "" || galeriaFiltro !== "todos";
  if (resultCountEl) {
    if (hayFiltroActivo) {
      resultCountEl.textContent = `${filtrados.length} de ${todosOrdenados.length} resultado${filtrados.length !== 1 ? "s" : ""}`;
      resultCountEl.style.display = "block";
    } else {
      resultCountEl.style.display = "none";
    }
  }

  // Limpiar grid 
  galeriaGrid.innerHTML = "";

  //  Estado vacío 
  if (filtrados.length === 0) {
    galeriaEmpty.style.display = "block";
    galeriaGrid.style.display = "none";

    if (todosOrdenados.length === 0) {
      // Sin ningún diagnóstico en la BD
      if (emptyIconEl) emptyIconEl.textContent = "🌿";
      if (emptyTitleEl) emptyTitleEl.textContent = "Sin diagnósticos registrados";
      if (emptySubEl) emptySubEl.textContent = "Analiza una imagen de albahaca para ver tus resultados aquí.";
    } else {
      // Hay registros pero no coinciden con el filtro actual
      if (emptyIconEl) emptyIconEl.textContent = "🔍";
      if (emptyTitleEl) emptyTitleEl.textContent = "Sin resultados para esta búsqueda";
      if (emptySubEl) emptySubEl.textContent = "Prueba con otro diagnóstico o cambia el filtro de tipo.";
    }
    return;
  }

  galeriaEmpty.style.display = "none";
  galeriaGrid.style.display = "";

  //  Construir tarjetas 
  filtrados.forEach((item) => {
    const fecha = item.fecha instanceof Date
      ? item.fecha
      : new Date(String(item.fecha).replace(" ", "T"));

    const fechaStr = fecha.toLocaleString("es-MX", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

    // Determinar clase del badge
    const diag = (item.diagnostico || "").toLowerCase().trim();
    let badgeClass = "otro";
    if (diag === "sana" || diag === "planta sana" || diag === "saludable") {
      badgeClass = "sana";
    } else if (diag && diag !== "") {
      badgeClass = "plaga";
    }

    // Construir src de la imagen
    const imgSrc = item.imgSrc.startsWith("data:")
      ? item.imgSrc
      : `data:image/jpeg;base64,${item.imgSrc}`;

    const card = document.createElement("div");
    card.className = "galeria-card";
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Ver diagnóstico: ${item.diagnostico || "Sin diagnóstico"}, ${fechaStr}`);

    card.innerHTML = `
      <div class="galeria-img-wrap">
        <img class="galeria-img" src="${imgSrc}" alt="Diagnóstico ${item.diagnostico || ''}" loading="lazy">
      </div>
      <div class="galeria-info">
        <span class="galeria-fecha">${fechaStr}</span>
        <span class="galeria-badge ${badgeClass}">${item.diagnostico || "Sin diagnóstico"}</span>
      </div>
    `;

    card.addEventListener("click", () => abrirModalGaleria(item, imgSrc));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrirModalGaleria(item, imgSrc);
      }
    });

    galeriaGrid.appendChild(card);
  });
}

// Listeners del buscador y filtro 
(function inicializarToolbarGaleria() {
  const buscadorEl = document.getElementById("galeriaBuscador");
  const clearSearchEl = document.getElementById("galeriaClearSearch");
  const filtroEl = document.getElementById("galeriaFiltroTipo");

  if (buscadorEl) {
    buscadorEl.addEventListener("input", () => {
      galeriaBusqueda = buscadorEl.value;
      clearSearchEl && (clearSearchEl.style.display = galeriaBusqueda ? "inline" : "none");
      renderizarGaleria();
    });
  }

  if (clearSearchEl) {
    clearSearchEl.addEventListener("click", () => {
      galeriaBusqueda = "";
      if (buscadorEl) buscadorEl.value = "";
      clearSearchEl.style.display = "none";
      renderizarGaleria();
    });
  }

  if (filtroEl) {
    filtroEl.addEventListener("change", () => {
      galeriaFiltro = filtroEl.value;
      renderizarGaleria();
    });
  }
})();

// Modal visor 
function abrirModalGaleria(item, imgSrc) {
  const fecha = item.fecha instanceof Date
    ? item.fecha
    : new Date(String(item.fecha).replace(" ", "T"));

  const fechaStr = fecha.toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  galeriaModalImg.src = imgSrc;
  galeriaModalDiag.textContent = "📋 " + (item.diagnostico || "Sin diagnóstico");
  galeriaModalFecha.textContent = "🗓️ " + fechaStr;
  galeriaModalConf.textContent = item.confianza ? "Confianza: " + item.confianza + "%" : "";

  galeriaModal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Foco en el botón de cierre para accesibilidad
  setTimeout(() => galeriaModalClose && galeriaModalClose.focus(), 50);
}

function cerrarModalGaleria() {
  if (!galeriaModal) return;
  galeriaModal.style.display = "none";
  document.body.style.overflow = "";
  galeriaModalImg.src = "";
}

// Cerrar con botón X
galeriaModalClose && galeriaModalClose.addEventListener("click", cerrarModalGaleria);

// Cerrar al hacer clic en el overlay oscuro
galeriaModalOverlay && galeriaModalOverlay.addEventListener("click", cerrarModalGaleria);

// Cerrar con tecla Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && galeriaModal && galeriaModal.style.display !== "none") {
    cerrarModalGaleria();
  }
});

// ESTADÍSTICAS LOGIC

let myChartDistribucion = null;
let myChartPlagas = null;

function actualizarEstadisticas() {
  const seccionEstadisticas = document.getElementById("seccionEstadisticas");
  if (!seccionEstadisticas || seccionEstadisticas.style.display === "none") return;


  // ── 1. Calcular métricas desde el historial real ──────────────────────────
  let sanas = 0;
  let conPlagas = 0;
  let sumaConfianza = 0;
  const conteoPlagas = {};

  historial.forEach(r => {
    // El PHP ya normaliza el campo `tipo` a "sana" o "plaga"
    if (r.tipo === "sana") {
      sanas++;
    } else if (r.tipo === "plaga") {
      conPlagas++;
      const nombre = (r.diagnostico || "Desconocida").trim();
      conteoPlagas[nombre] = (conteoPlagas[nombre] || 0) + 1;
    }
    sumaConfianza += Number(r.confianza) || 0;
  });


  const total = historial.length;

  const pctSanas    = total > 0 ? Math.round((sanas    / total) * 100) : 0;

  const pctPlagas   = total > 0 ? Math.round((conPlagas / total) * 100) : 0;
  const confianzaPromedio = total > 0 ? Math.round(sumaConfianza / total) : 0;

  // Plaga más frecuente
  let plagaFrecuente = null;
  let maxConteo = 0;
  for (const [nombre, cnt] of Object.entries(conteoPlagas)) {
    if (cnt > maxConteo) { maxConteo = cnt; plagaFrecuente = nombre; }
  }

  // Datos del registro más reciente (historial ya viene ORDER BY fecha DESC)
  let ultimoDiag   = null;
  let ultimaFecha  = null;
  let ultimaConf   = 0;
  let ultimoEsSano = false;
  if (total > 0) {
    const r = historial[0];
    ultimoDiag   = (r.diagnostico || "").trim() || null;
    ultimaConf   = Number(r.confianza) || 0;
    ultimoEsSano = r.tipo === "sana";
    const f = r.fecha instanceof Date ? r.fecha : new Date(String(r.fecha).replace(" ", "T"));
    ultimaFecha  = isNaN(f) ? null : f.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  // ── 2. Helper para actualizar texto ───────────────────────────────────────
  const setText = (id, value, fallback = "Sin datos disponibles") => {
    const el = document.getElementById(id);
    if (el) el.textContent = (value !== null && value !== undefined && value !== "") ? String(value) : fallback;
  };

  // ── 3. Tarjetas superiores ────────────────────────────────────────────────
  if (total === 0) {
    setText("sm-total",      null);
    setText("sm-sanas",      null);
    setText("sm-sanas-pct",  null);
    setText("sm-plagas",     null);
    setText("sm-plagas-pct", null);
    setText("sm-confianza",  null);
  } else {
    setText("sm-total",      total);
    setText("sm-sanas",      sanas);
    setText("sm-sanas-pct",  `${pctSanas}% del total`);
    setText("sm-plagas",     conPlagas);
    setText("sm-plagas-pct", `${pctPlagas}% del total`);
    setText("sm-confianza",  `${confianzaPromedio}%`);
  }

  // ── 4. Leyenda de la dona ─────────────────────────────────────────────────
  if (total === 0) {
    setText("sm-dc-val",    null);
    setText("sm-leg-sanas", null);
    setText("sm-leg-plagas",null);
  } else {
    setText("sm-dc-val",    `${pctSanas}%`);
    setText("sm-leg-sanas", `${sanas} (${pctSanas}%)`);
    setText("sm-leg-plagas",`${conPlagas} (${pctPlagas}%)`);
  }

  // ── 5. Mensaje de estado dinámico ─────────────────────────────────────────
  const alertEstadoEl = document.getElementById("sm-alert-estado-text");
  if (alertEstadoEl) {
    if (total === 0) {
      alertEstadoEl.textContent = "Sin datos disponibles. Realiza un análisis para ver estadísticas.";
    } else if (pctSanas === 100) {
      alertEstadoEl.textContent = `El 100% de las plantas analizadas se encuentran sanas.`;
    } else if (pctSanas >= 80) {
      alertEstadoEl.textContent = `El ${pctSanas}% de las plantas están sanas. Monitorea las ${conPlagas} con problemas.`;
    } else if (pctSanas >= 50) {
      alertEstadoEl.textContent = `El ${pctSanas}% de las plantas están sanas. Se recomienda atención a las afectadas.`;
    } else {
      alertEstadoEl.textContent = `Atención: el ${pctPlagas}% de las plantas presentan plagas o enfermedades.`;
    }
  }

  // ── 6. Resumen general ────────────────────────────────────────────────────
  if (total === 0) {
    setText("sm-rl-total",     null);
    setText("sm-rl-sanas",     null);
    setText("sm-rl-plagas",    null);
    setText("sm-rl-frecuente", null);
    setText("sm-rl-confianza", null);
    setText("sm-rl-ultimo",    null);
  } else {
    setText("sm-rl-total",     total);
    setText("sm-rl-sanas",     `${sanas} (${pctSanas}%)`);
    setText("sm-rl-plagas",    `${conPlagas} (${pctPlagas}%)`);
    setText("sm-rl-frecuente", plagaFrecuente || "Ninguna");
    setText("sm-rl-confianza", `${confianzaPromedio}%`);
    // Formato: "DD/MM/AAAA - Diagnóstico"
    const partes = [];
    if (ultimaFecha) partes.push(ultimaFecha);
    if (ultimoDiag)  partes.push(ultimoDiag);
    setText("sm-rl-ultimo", partes.length ? partes.join(" - ") : null);
  }

  // ── 7. Tarjeta "Último diagnóstico" ───────────────────────────────────────
  const iconUd   = document.getElementById("sm-ud-icon");
  const alertUlt = document.getElementById("sm-alert-ultimo-text");

  if (total === 0) {
    setText("sm-ud-diag",      null);
    setText("sm-ud-fecha",     null);
    setText("sm-ud-confianza", null);
    if (iconUd) {
      iconUd.textContent      = "🌿";
      iconUd.style.color      = "#2e7d32";
      iconUd.style.background = "#e8f5e9";
    }
    const udTitle = document.getElementById("sm-ud-diag");
    if (udTitle) udTitle.style.color = "#2e7d32";
    if (alertUlt) alertUlt.textContent = "Realiza un análisis para ver el último diagnóstico aquí.";
  } else {
    setText("sm-ud-diag",      ultimoDiag  || "Sin datos");
    setText("sm-ud-fecha",     ultimaFecha || "Sin fecha");
    setText("sm-ud-confianza", `${ultimaConf}% de confianza`);

    if (iconUd) {
      iconUd.textContent      = ultimoEsSano ? "🌿" : "🐞";
      iconUd.style.color      = ultimoEsSano ? "#2e7d32" : "#d32f2f";
      iconUd.style.background = ultimoEsSano ? "#e8f5e9" : "#ffebee";
    }
    const udTitle = document.getElementById("sm-ud-diag");
    if (udTitle) udTitle.style.color = ultimoEsSano ? "#2e7d32" : "#d32f2f";

    if (alertUlt) {
      if (ultimoEsSano) {
        alertUlt.textContent = `¡Excelente! El último análisis muestra una planta sana con ${ultimaConf}% de confianza.`;
      } else {
        alertUlt.textContent = `Se detectó: "${ultimoDiag}" con ${ultimaConf}% de confianza. Revisa el plan de tratamiento.`;
      }
    }
  }

  // ── 8. Gráfica de dona ────────────────────────────────────────────────────
  const ctxDist = document.getElementById("smChartDistribucion");
  if (ctxDist) {
    if (myChartDistribucion) myChartDistribucion.destroy();

    if (window.Chart) {
      Chart.defaults.color       = "#666";
      Chart.defaults.font.family = "'Inter', 'Segoe UI', Arial, sans-serif";
    }

    const datosDona = total === 0 ? [1] : [sanas, conPlagas];
    const etiqsDona = total === 0 ? ["Sin datos"] : ["Sanas", "Con plagas"];
    const colDona   = total === 0 ? ["#e0e0e0"] : ["#4caf50", "#f44336"];

    myChartDistribucion = new Chart(ctxDist.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: etiqsDona,
        datasets: [{
          data: datosDona,
          backgroundColor: colDona,
          borderWidth: 0,
          cutout: "70%"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend:  { display: false },
          tooltip: { enabled: total > 0 }
        }
      }
    });
  }

  // ── 9. Gráfica de barras horizontales ─────────────────────────────────────
  const ctxPlagas = document.getElementById("smChartPlagas");
  if (ctxPlagas) {
    if (myChartPlagas) myChartPlagas.destroy();

    let labels  = [];
    let datos   = [];
    let colores = [];

    if (total === 0) {
      labels  = ["Sin datos disponibles"];
      datos   = [0];
      colores = ["#e0e0e0"];
    } else {
      // Primero las plagas ordenadas de mayor a menor
      Object.entries(conteoPlagas)
        .sort((a, b) => b[1] - a[1])
        .forEach(([nombre, cnt]) => {
          labels.push(nombre);
          datos.push(cnt);
          colores.push("#ef9a9a");
        });
      // Al final, barra "Sin plaga" (plantas sanas)
      if (sanas > 0) {
        labels.push("Sin plaga");
        datos.push(sanas);
        colores.push("#4caf50");
      }
    }

    myChartPlagas = new Chart(ctxPlagas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: datos,
          backgroundColor: colores,
          borderRadius: 4,
          barPercentage: 0.5
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
            grid:  { color: "#f0f0f0" },
            ticks: { stepSize: 1, precision: 0 }
          },
          y: { grid: { display: false } }
        },
        plugins: {
          legend:  { display: false },
          tooltip: { enabled: total > 0 }
        }
      }
    });
  }
}

// ══════════════════════════════════════════════════
// PERFIL — DROPDOWN + FULL-PAGE FORMS
// ══════════════════════════════════════════════════

// ── Compact dropdown ──────────────────────────────
const userDropdownTrigger = document.getElementById("userDropdownTrigger");
const userDropdownContainer = document.querySelector(".user-dropdown-container");
const userDropdownPanel = document.getElementById("userDropdownPanel");

// Open/close
if (userDropdownTrigger && userDropdownContainer) {
  userDropdownTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = userDropdownContainer.classList.toggle("open");
    if (isOpen) actualizarDropdownPerfil();
  });
}

// Close on outside click
document.addEventListener("click", (e) => {
  if (userDropdownContainer && !userDropdownContainer.contains(e.target)) {
    userDropdownContainer.classList.remove("open");
  }
});

// Don't close when clicking inside panel
if (userDropdownPanel) {
  userDropdownPanel.addEventListener("click", (e) => e.stopPropagation());
}

// Populate dropdown avatar + name from session/db
function actualizarDropdownPerfil() {
  const miniAvatar = document.getElementById("udpMiniAvatar");
  const nombreEl = document.getElementById("udpNombreDisplay");
  const usuarioEl = document.getElementById("udpUsuarioDisplay");

  const storedNombre = sessionStorage.getItem("nombreUsuario") || "Administrador";
  if (nombreEl) nombreEl.textContent = storedNombre;

  const userId = sessionStorage.getItem("usuario_id");
  if (!userId) return;

  fetch(`php/obtener_perfil.php?usuario_id=${userId}`)
    .then(r => r.json())
    .then(data => {
      if (data.success && data.data) {
        const u = data.data;
        if (nombreEl) nombreEl.textContent = (u.nombre || "") + " " + (u.apellido || "");
        if (usuarioEl) usuarioEl.textContent = "@" + (u.usuario || "usuario");

        if (miniAvatar) {
          if (u.foto_perfil) {
            miniAvatar.textContent = "";
            miniAvatar.style.backgroundImage = `url(${u.foto_perfil})`;
          } else {
            miniAvatar.textContent = "👤";
            miniAvatar.style.backgroundImage = "none";
          }
        }
      }
    })
    .catch(() => {});
}

// ── Navigation to full-page forms ──────────────────
const seccionEditarPerfil = document.getElementById("seccionEditarPerfil");
const seccionCambiarPass  = document.getElementById("seccionCambiarPass");

// Track which section was active before entering profile forms
let seccionAnterior = "analisis";

function navegarAFormPerfil(destino) {
  // Close dropdown
  if (userDropdownContainer) userDropdownContainer.classList.remove("open");

  // Remember what was visible
  if (seccionAnalisis && seccionAnalisis.style.display !== "none") seccionAnterior = "analisis";
  else if (seccionGaleria && seccionGaleria.style.display !== "none") seccionAnterior = "galeria";
  else if (seccionEstadisticas && seccionEstadisticas.style.display !== "none") seccionAnterior = "estadisticas";

  // Hide all main sections
  [seccionAnalisis, seccionHistorial, seccionGaleria, seccionEstadisticas, heroBanner].forEach(el => {
    if (el) el.style.display = "none";
  });

  // Show chosen form
  if (seccionEditarPerfil) seccionEditarPerfil.style.display = destino === "editar" ? "" : "none";
  if (seccionCambiarPass)  seccionCambiarPass.style.display  = destino === "pass"   ? "" : "none";

  // Load data for edit-profile form
  if (destino === "editar") cargarEditarPerfil();
}

function volverSeccionAnterior() {
  if (seccionEditarPerfil) seccionEditarPerfil.style.display = "none";
  if (seccionCambiarPass)  seccionCambiarPass.style.display  = "none";
  mostrarSeccion(seccionAnterior);
}

// Menu item buttons
const btnIrEditarPerfil = document.getElementById("btnIrEditarPerfil");
const btnIrCambiarPass  = document.getElementById("btnIrCambiarPass");

if (btnIrEditarPerfil) btnIrEditarPerfil.addEventListener("click", () => navegarAFormPerfil("editar"));
if (btnIrCambiarPass)  btnIrCambiarPass.addEventListener("click",  () => navegarAFormPerfil("pass"));

// Cancel buttons
const btnCancelarEditPerfil = document.getElementById("btnCancelarEditPerfil");
const btnCancelarPass       = document.getElementById("btnCancelarPass");

if (btnCancelarEditPerfil) btnCancelarEditPerfil.addEventListener("click", volverSeccionAnterior);
if (btnCancelarPass)       btnCancelarPass.addEventListener("click",       volverSeccionAnterior);

// ── Editar Perfil ────────────────────────────────--
let editFotoBase64 = null;

const editFotoInput    = document.getElementById("editFotoInput");
const editAvatarPreview = document.getElementById("editAvatarPreview");

if (editFotoInput) {
  editFotoInput.addEventListener("change", function () {
    if (!this.files[0]) return;
    const archivo = this.files[0];
    if (!["image/jpeg","image/jpg","image/png"].includes(archivo.type)) {
      mostrarToast("Solo JPG y PNG", true); return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      mostrarToast("La imagen supera los 5 MB", true); return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      editFotoBase64 = e.target.result;
      if (editAvatarPreview) {
        editAvatarPreview.textContent = "";
        editAvatarPreview.style.backgroundImage = `url(${editFotoBase64})`;
      }
    };
    reader.readAsDataURL(archivo);
  });
}

function cargarEditarPerfil() {
  const userId = sessionStorage.getItem("usuario_id");
  if (!userId) return;
  editFotoBase64 = null;

  fetch(`php/obtener_perfil.php?usuario_id=${userId}`)
    .then(r => r.json())
    .then(data => {
      if (data.success && data.data) {
        const u = data.data;
        const f = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
        f("editNombre", u.nombre);
        f("editApellido", u.apellido);
        f("editCorreo", u.correo);
        f("editUsuarioRO", u.usuario);

        const foto = u.foto_perfil || null;
        if (editAvatarPreview) {
          if (foto) {
            editAvatarPreview.textContent = "";
            editAvatarPreview.style.backgroundImage = `url(${foto})`;
          } else {
            editAvatarPreview.textContent = "👤";
            editAvatarPreview.style.backgroundImage = "none";
          }
        }
      }
    })
    .catch(e => console.error(e));
}

const btnGuardarEditPerfil = document.getElementById("btnGuardarEditPerfil");
if (btnGuardarEditPerfil) {
  btnGuardarEditPerfil.addEventListener("click", () => {
    const userId  = sessionStorage.getItem("usuario_id");
    const nombre  = document.getElementById("editNombre").value.trim();
    const apellido = document.getElementById("editApellido").value.trim();
    const correo  = document.getElementById("editCorreo").value.trim();

    if (!nombre || !apellido || !correo) {
      mostrarToast("Nombre, Apellido y Correo son obligatorios", true); return;
    }

    const fd = new URLSearchParams();
    fd.append("usuario_id", userId);
    fd.append("nombre", nombre);
    fd.append("apellido", apellido);
    fd.append("correo", correo);
    if (editFotoBase64) fd.append("foto_perfil", editFotoBase64);

    fetch("php/actualizar_perfil.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: fd.toString()
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        mostrarToast("Perfil actualizado correctamente ✓");
        // Sync topbar
        const nombreCompleto = nombre + " " + apellido;
        sessionStorage.setItem("nombreUsuario", nombre);
        if (localStorage.getItem("logueado") === "true") localStorage.setItem("nombreUsuario", nombre);
        const elNombre = document.getElementById("nombreUsuario");
        if (elNombre) elNombre.textContent = nombre;
        if (editFotoBase64) {
          sessionStorage.setItem("foto_perfil", editFotoBase64);
          if (localStorage.getItem("logueado") === "true") localStorage.setItem("foto_perfil", editFotoBase64);
          const av = document.getElementById("userAvatar");
          if (av) { av.textContent = ""; av.style.backgroundImage = `url(${editFotoBase64})`; }
        }
      } else {
        mostrarToast(data.message || "Error al actualizar", true);
      }
    })
    .catch(() => mostrarToast("Error de conexión", true));
  });
}

// ── Cambiar Contraseña ─────────────────────────────
const btnGuardarPass = document.getElementById("btnGuardarPass");
if (btnGuardarPass) {
  btnGuardarPass.addEventListener("click", () => {
    const userId    = sessionStorage.getItem("usuario_id");
    const passNueva = document.getElementById("passNueva").value;
    const passConf  = document.getElementById("passConfirmar").value;

    if (!passNueva || !passConf) {
      mostrarToast("Completa ambos campos", true); return;
    }
    if (passNueva !== passConf) {
      mostrarToast("Las contraseñas no coinciden", true); return;
    }
    if (passNueva.length < 6) {
      mostrarToast("Mínimo 6 caracteres", true); return;
    }

    // We reuse actualizar_perfil.php — send only password fields
    // But we need nombre/apellido/correo too, so fetch them first
    fetch(`php/obtener_perfil.php?usuario_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) { mostrarToast("Error al verificar usuario", true); return; }
        const u = data.data;
        const fd = new URLSearchParams();
        fd.append("usuario_id", userId);
        fd.append("nombre", u.nombre || "");
        fd.append("apellido", u.apellido || "");
        fd.append("correo", u.correo || "");
        fd.append("nueva_password", passNueva);
        return fetch("php/actualizar_perfil.php", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: fd.toString()
        });
      })
      .then(r => r && r.json())
      .then(data => {
        if (data && data.success) {
          mostrarToast("Contraseña cambiada correctamente ✓");
          document.getElementById("passNueva").value = "";
          document.getElementById("passConfirmar").value = "";
          volverSeccionAnterior();
        } else if (data) {
          mostrarToast(data.message || "Error al cambiar contraseña", true);
        }
      })
      .catch(() => mostrarToast("Error de conexión", true));
  });
}
