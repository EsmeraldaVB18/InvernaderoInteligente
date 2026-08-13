
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
    mostrarToast("Primero carga o captura una imagen", true);
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
    mostrarToast("Error al conectar con la IA: " + err.message, true);
  }

  enAnalisis = false;
  analizarBtn.disabled = false;
});


// LLAMADA REAL AL MODELO DE IA (vía php/analizar_ia.php -> inference_server.py)

async function analizarConMiIA(base64) {
  const respuesta = await fetch("php/analizar_ia.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "imagen_base64=" + encodeURIComponent(base64)
  });

  const datos = await respuesta.json();

  if (!datos.success) {
    throw new Error(datos.message || "El servidor de IA no pudo procesar la imagen");
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
    if (confirm("¿Eliminar este registro del historial?")) {
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
  } else if (accion === "ver") {
    alert(
      `Registro #${registro.id}\n` +
      `Fecha: ${formatearFecha(registro.fecha)}\n` +
      `Diagnóstico: ${registro.diagnostico}\n` +
      `Confianza: ${registro.confianza}%\n` +
      `Tipo: ${registro.tipo}`
    );
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

// Cambiar foto de perfil al hacer clic en el avatar
fotoUser.addEventListener("change", function () {
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

// Referencias DOM galería 
const navGaleria = document.getElementById("navGaleria");
const seccionAnalisis = document.querySelector(".cards-row");
const seccionHistorial = document.getElementById("seccionHistorial");
const seccionGaleria = document.getElementById("seccionGaleria");
const galeriaGrid = document.getElementById("galeriaGrid");
const galeriaEmpty = document.getElementById("galeriaEmpty");
const pageTitleEl = document.querySelector(".page-title");
const pageSubtitleEl = document.querySelector(".page-subtitle");

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
const HEADER_GALERIA = {
  title: "Galería de Diagnósticos",
  subtitle: "Historial visual de tus análisis realizados"
};

function mostrarSeccion(seccion) {
  const esGaleria = seccion === "galeria";

  // Sidebar active
  navAnalisis.classList.toggle("active", !esGaleria);
  navGaleria.classList.toggle("active", esGaleria);

  // Contenido
  if (seccionAnalisis) seccionAnalisis.style.display = esGaleria ? "none" : "";
  if (seccionHistorial) seccionHistorial.style.display = esGaleria ? "none" : "";
  if (seccionGaleria) seccionGaleria.style.display = esGaleria ? "" : "none";

  // Título del panel
  if (pageTitleEl) pageTitleEl.textContent = esGaleria ? HEADER_GALERIA.title : HEADER_ANALISIS.title;
  if (pageSubtitleEl) pageSubtitleEl.textContent = esGaleria ? HEADER_GALERIA.subtitle : HEADER_ANALISIS.subtitle;

  if (esGaleria) renderizarGaleria();
}

navGaleria && navGaleria.addEventListener("click", (e) => {
  e.preventDefault();
  mostrarSeccion("galeria");
});

navAnalisis && navAnalisis.addEventListener("click", (e) => {
  e.preventDefault();
  mostrarSeccion("analisis");
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