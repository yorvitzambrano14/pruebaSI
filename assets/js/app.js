console.log("APP.JS CARGADO");

// STORAGE INTEGRADO
const STORAGE_DATA = 'inventarioData';
const STORAGE_BASE = 'inventarioBase';
const STORAGE_TRANSFERENCIAS = 'transferenciasData';
const STORAGE_PASSWORD = 'adminPassword'; // Contraseña encriptada

// 🔐 CONTRASEÑAS INDEPENDIENTES POR MÓDULO (CÁMBIALAS AQUÍ - MÁXIMO 20 CARACTERES)
// Ya NO comparten contraseña con el login principal ni entre sí.
const PASSWORD_REGISTRO = 'empresa2';        // ← Contraseña del módulo Registro
const PASSWORD_TRANSFERENCIAS = 'empresa4';  // ← Contraseña del módulo Transferencias
const PASSWORD_TOTALES = 'empresa3';         // ← Contraseña del módulo Totales
const PASSWORD_INVENTARIO = 'empresa2';      // ← Contraseña del módulo Inventario

// Mapa de vista -> contraseña, para no repetir lógica
const MODULE_PASSWORDS = {
    registro: PASSWORD_REGISTRO,
    transferencias: PASSWORD_TRANSFERENCIAS,
    inventarioTT: PASSWORD_TOTALES,
    inventario: PASSWORD_INVENTARIO
};

// Nombres bonitos para el modal, según el módulo
const MODULE_LABELS = {
    registro: '📝 Registro',
    transferencias: '🔄 Transferencias',
    inventarioTT: '📈 Totales',
    inventario: '📊 Inventario'
};

// 🔧 FUNCIÓN MEJORADA PARA GENERAR IDs ÚNICOS
function generarIdUnico() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9) + '_' + Math.floor(Math.random() * 1000);
}

// ✅ FUNCIÓN LOGOUT MEJORADA
function logout() {
    if(confirm('🚪 ¿Cerrar sesión y volver al login?')) {
        // Limpiar TODO
        localStorage.removeItem('loggedIn');
        sessionStorage.clear(); // ← LIMPIA las sesiones de Registro y Transferencias también
        window.location.href = 'login.html';
    }
}

// 🔐 SISTEMA DE CONTRASEÑA MEJORADO (independiente por módulo)
function requerirPassword(view) {
    const modal = document.getElementById('modal-password');
    const passwordInput = document.getElementById('password-input');
    const tituloModal = document.getElementById('password-modal-titulo');

    // Limpiar errores previos
    document.getElementById('password-error').style.display = 'none';

    // Personalizar el modal según el módulo
    if(tituloModal) {
        tituloModal.textContent = `🔐 Acceso a ${MODULE_LABELS[view] || 'módulo protegido'}`;
    }

    // Mostrar modal
    modal.style.display = 'flex';
    passwordInput.value = '';
    passwordInput.focus();
    
    // Guardar vista destino
    window.currentProtectedView = view;
}

function verificarPassword() {
    const password = document.getElementById('password-input').value;
    const errorDiv = document.getElementById('password-error');
    const view = window.currentProtectedView;
    const passwordCorrecta = MODULE_PASSWORDS[view];

    if(password === passwordCorrecta) {
        // ✅ CORRECTA - Guardar sesión TEMPORAL solo para ESTE módulo (mientras la pestaña esté abierta)
        sessionStorage.setItem('passwordSession_' + view, 'true');
        cerrarModalPassword();
        showView(view);
    } else {
        // ❌ INCORRECTA
        errorDiv.textContent = '❌ Contraseña incorrecta. Intenta de nuevo.';
        errorDiv.style.display = 'block';
        document.getElementById('password-input').style.borderColor = '#dc3545';
        setTimeout(() => {
            errorDiv.style.display = 'none';
            document.getElementById('password-input').style.borderColor = '#e9ecef';
        }, 3000);
    }
}

function cerrarModalPassword() {
    document.getElementById('modal-password').style.display = 'none';
}

// 🔍 VERIFICAR SESIÓN DE CONTRASEÑA PARA UN MÓDULO ESPECÍFICO (SOLO MIENTRAS PESTAÑA ABIERTA)
function checkPasswordSession(view) {
    // ✅ Solo sessionStorage (se borra al cerrar pestaña/navegador) y es exclusiva de cada módulo
    return sessionStorage.getItem('passwordSession_' + view) === 'true';
}

function saveData(data) {
    try {
        localStorage.setItem(STORAGE_DATA, JSON.stringify(data));
        return true;
    } catch(e) {
        console.error('Error saving data:', e);
        return false;
    }
}

function getData() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_DATA)) || [];
    } catch(e) {
        return [];
    }
}

function saveInventarioBase(data) {
    try {
        localStorage.setItem(STORAGE_BASE, JSON.stringify(data));
        return true;
    } catch(e) {
        return false;
    }
}

function getInventarioBase() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_BASE)) || null;
    } catch(e) {
        return null;
    }
}

function saveTransferencias(data) {
    try {
        localStorage.setItem(STORAGE_TRANSFERENCIAS, JSON.stringify(data));
        return true;
    } catch(e) {
        return false;
    }
}

function getTransferencias() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_TRANSFERENCIAS)) || [];
    } catch(e) {
        return [];
    }
}

// ✅ VERIFICACIÓN DE SESIÓN AL INICIAR
document.addEventListener("DOMContentLoaded", function () {
    try {
        if (localStorage.getItem("loggedIn") !== "true") {
            window.location.href = "login.html";
            return;
        }

        init();

    } catch (error) {
        console.error("Error al iniciar la aplicación:", error);
        alert("Ocurrió un error al iniciar la aplicación. Revisa la consola (F12).");
    }
});

let currentTipo = 'PC';
let currentTipoTransferencia = 'INGRESO';
let cacheData = [];
let cacheTransferencias = [];
let inventarioBase = {};
let pdfCache = {};
let pdfCacheTransferencia = {};

const categorias = ['PC', 'Laptop', 'Impresora', 'Switch', 'Servidores', 'Comunicaciones'];
const departamentos = [
    "DTP Mantenimiento","DTP Secado","DTO Romana","DTO Servicio médico","DTO Seguridad laboral",
    "DTO Servicio financiero","DTO Contabilidad","DTO Asuntos legales","DTO Recepción","DTO Ventas",
    "DTO Recursos humano","DTO Tesorería","DTO Seguridad","DTO Molino","DTO Molino CCM5",
    "DTO Empaque","DTO Gelatinizado","DTO Sistema","DTO Planta","DTO Administración"
];

const sedes = ["Sede Central", "Planta Norte", "Planta Sur", "Sede Administrativa", "Almacén Regional"];

function calcularEstadisticas() {
    const conteoOcupados = {};
    const conteoIngresos = {};
    const conteoSalidas = {};

    categorias.forEach(cat => {
        conteoOcupados[cat] = 0;
        conteoIngresos[cat] = 0;
        conteoSalidas[cat] = 0;
    });

    cacheData.forEach(item => {
        if(categorias.includes(item.categoria)) {
            conteoOcupados[item.categoria]++;
        }
    });

    cacheTransferencias.forEach(item => {
        if(categorias.includes(item.categoria) && item.cantidad) {
            const qty = parseInt(item.cantidad);
            if(qty > 0) {
                if(item.tipo === 'INGRESO') {
                    conteoIngresos[item.categoria] += qty;
                } else if(item.tipo === 'SALIDA') {
                    conteoSalidas[item.categoria] += qty;
                }
            }
        }
    });

    const totalesVisuales = {};
    categorias.forEach(cat => {
        const base = inventarioBase[cat] || 0;
        totalesVisuales[cat] = Math.max(0, base + conteoIngresos[cat] - conteoSalidas[cat]);
    });

    const disponibles = {};
    categorias.forEach(cat => {
        disponibles[cat] = Math.max(0, totalesVisuales[cat] - conteoOcupados[cat]);
    });

    return {
        totalesVisuales,
        disponibles,
        ocupados: conteoOcupados,
        base: inventarioBase,
        ingresos: conteoIngresos,
        salidas: conteoSalidas
    };
}

function init() {
    cacheData = getData();
    cacheTransferencias = getTransferencias();
    inventarioBase = getInventarioBase() || {
        PC: 23, Laptop: 8, Impresora: 23, Switch: 19, Servidores: 20, Comunicaciones: 20
    };

    cacheData = cacheData.filter(item => item && item.id);
    cacheTransferencias = cacheTransferencias.filter(item => item && item.id);

    setTimeout(() => {
        Object.keys(inventarioBase).forEach(cat => {
            const input = document.getElementById(`edit${cat}`);
            if(input) {
                input.value = inventarioBase[cat];
                input.addEventListener('change', function() {
                    inventarioBase[cat] = parseInt(this.value) || 0;
                    saveInventarioBase(inventarioBase);
                    statsTotales();
                });
            }
        });
        statsTotales();
    }, 100);

    cambiarFormulario();
    render();
    setupFormValidation();
    renderTransferencias();
}

// ✅ SHOW VIEW CON PROTECCIÓN
function showView(v) {
    // 🔒 PROTECCIÓN PARA REGISTRO Y TRANSFERENCIAS
    if((v === 'registro' || v === 'transferencias' || v === 'inventarioTT' || v === 'inventario') && !checkPasswordSession(v)) {
        requerirPassword(v);
        return;
    }

    document.querySelectorAll("[id^='view-']").forEach(el => el.style.display = "none");
    const view = document.getElementById("view-" + v);
    if(view) view.style.display = "block";

    if(v === "inventarioTT") statsTotales();
    if(v === "transferencias") renderTransferencias();
    if(v === "inventario") render();
}

function setupFormValidation() {
    document.removeEventListener('input', handleInput);
    document.addEventListener('input', handleInput);
}

function handleInput(e) {
    if(e.target.closest('#form-dinamico')) validateForm();
    if(e.target.closest('#form-transferencia')) validateTransferencia();
    if(e.target.closest('#form-masa')) validateFormMasa();
    if(e.target.id === 'pdfFile') handlePdfUpload(e.target);
    if(e.target.id === 'pdfFileTransferencia') handlePdfTransferenciaUpload(e.target);
}

function validateForm() {
    const form = document.getElementById('form-dinamico');
    if(!form) return;

    const inputs = form.querySelectorAll('input[required], select[required]');
    const btn = document.getElementById('btnGuardar');
    if(!btn) return;

    const hasValue = Array.from(inputs).every(input => input.value.trim().length > 0);
    btn.disabled = !hasValue;
    btn.innerHTML = hasValue ? '💾 Guardar Registro' : '⚠️ Completa los campos';
}

function validateTransferencia() {
    const form = document.getElementById('form-transferencia');
    if(!form) return;

    const btn = document.getElementById('btnGuardarTransferencia');
    if(!btn) return;

    const modoMasa = form.querySelector('input[name="modoTransferencia"]:checked')?.value === 'masa';
    let isValid = false;

    if(modoMasa) {
        const detalle = document.getElementById('detalleMasa')?.value.trim();
        const tieneCantidad = categorias.some(cat => {
            const qty = parseInt(document.getElementById(`masa_${cat}`)?.value) || 0;
            return qty > 0;
        });
        isValid = detalle && tieneCantidad;
    } else {
        const inputs = form.querySelectorAll('#modoIndividual input[required], #modoIndividual select[required]');
        isValid = Array.from(inputs).every(input => input.value.trim().length > 0);
    }

    btn.disabled = !isValid;
    btn.innerHTML = isValid ? '💾 Registrar Movimiento' : '⚠️ Completa los campos';
}

function handlePdfUpload(input) {
    const file = input.files[0];
    const pdfNombre = document.getElementById('pdfNombre');

    if(file && file.type === 'application/pdf' && file.size < 5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = function(e) {
            pdfCache.tempPdf = e.target.result;
            pdfCache.tempFilename = file.name;
            if(pdfNombre) pdfNombre.textContent = `📄 ${file.name}`;
        };
        reader.readAsDataURL(file);
    } else {
        delete pdfCache.tempPdf;
        delete pdfCache.tempFilename;
        if(pdfNombre) pdfNombre.textContent = 'PDF inválido o muy grande';
        input.value = '';
    }
}

function handlePdfTransferenciaUpload(input) {
    const file = input.files[0];
    const pdfNombre = document.getElementById('pdfNombreTransferencia');

    if(file && file.type === 'application/pdf' && file.size < 5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = function(e) {
            pdfCacheTransferencia.tempPdf = e.target.result;
            pdfCacheTransferencia.tempFilename = file.name;
            if(pdfNombre) pdfNombre.textContent = `📄 ${file.name}`;
        };
        reader.readAsDataURL(file);
    } else {
        delete pdfCacheTransferencia.tempPdf;
        delete pdfCacheTransferencia.tempFilename;
        if(pdfNombre) pdfNombre.textContent = '';
        input.value = '';
    }
}

function cambiarFormulario() {
    const tipoSelect = document.getElementById("tipoRegistro");
    if(!tipoSelect) return;

    currentTipo = tipoSelect.value;
    const f = document.getElementById("form-dinamico");
    if(!f) return;

    const selectDep = `<select id="dep" required>
        <option value="">Selecciona departamento</option>
        ${departamentos.map(d => `<option value="${d}">${d}</option>`).join("")}
    </select>`;

    let html = '';

    if(currentTipo === 'PC') {
        html = `
            <div class="form-section">
                <h4>👤 Usuario</h4>
                ${selectDep}
                <input id="user" placeholder="Nombre completo" required>
            </div>
            <div class="form-section">
                <h4>🖥️ Equipo</h4>
                <input id="nombre" placeholder="Nombre PC" required>
                <input id="cpu" placeholder="CPU">
                <input id="monitor" placeholder="Monitor">
            </div>
            <div class="form-section">
                <h4>🔌 Periféricos</h4>
                <input id="teclado" placeholder="Teclado">
                <input id="mouse" placeholder="Mouse">
                <input id="ups" placeholder="UPS">
            </div>
            <div class="form-section full-width">
                <textarea id="obs" placeholder="Observaciones"></textarea>
            </div>
        `;
    } else if(currentTipo === 'Laptop') {
        html = `
            <div class="form-section full-width">
                <input id="user" placeholder="Usuario" required>
                <input id="modelo" placeholder="Modelo" required>
                <input id="serial" placeholder="Serial" required>
            </div>
        `;
    } else {
        html = `
            <div class="form-section">
                ${selectDep}
                <input id="user" placeholder="Responsable" required>
                <input id="nombre" placeholder="Nombre equipo" required>
                <input id="modelo" placeholder="Modelo" required>
            </div>
        `;
    }

    f.innerHTML = html;
    validateForm();
}

function guardarRegistro() {
    const form = document.getElementById("form-dinamico");
    const btnGuardar = document.getElementById('btnGuardar');

    if(!form || btnGuardar.disabled) {
        alert('❌ Completa todos los campos requeridos');
        return;
    }

    // 🔐 VERIFICAR CONTRASEÑA ANTES DE GUARDAR
    if(!checkPasswordSession('registro')) {
        alert('❌ Sesión de contraseña expirada. Accede nuevamente.');
        showView('registro');
        return;
    }

    const obj = {
        id: generarIdUnico(),
        categoria: currentTipo,
        fecha: new Date().toISOString(),
        timestamp: Date.now()
    };

    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if(input.value.trim() && input.id) {
            obj[input.id] = input.value.trim();
        }
    });

    if(pdfCache.tempPdf && pdfCache.tempFilename) {
        obj.pdfData = pdfCache.tempPdf;
        obj.pdfFilename = pdfCache.tempFilename;
    }

    delete pdfCache.tempPdf;
    delete pdfCache.tempFilename;
    const pdfNombre = document.getElementById('pdfNombre');
    const pdfFile = document.getElementById('pdfFile');
    if(pdfNombre) pdfNombre.textContent = '';
    if(pdfFile) pdfFile.value = '';

    cacheData.unshift(obj);
    saveData(cacheData);

    alert(`✅ ${currentTipo} registrado correctamente`);
    form.reset();
    validateForm();
    render();
    statsTotales();
}

function cambiarFormularioTransferencia() {
    const tipoSelect = document.getElementById("tipoTransferencia");
    if(!tipoSelect) return;

    currentTipoTransferencia = tipoSelect.value;
    const f = document.getElementById("form-transferencia");
    if(!f) return;

    let html = '';

    if(currentTipoTransferencia === 'INGRESO') {
        html = `
            <div class="form-section">
                <h4>📥 Nuevo Ingreso</h4>
                <div class="mode-switch">
                    <label class="mode-option"><input type="radio" name="modoTransferencia" value="individual" checked><span>👤 Individual</span></label>
                    <label class="mode-option"><input type="radio" name="modoTransferencia" value="masa"><span>🚀 Masa</span></label>
                </div>
                <div id="modoIndividual">
                    <select id="categoria" required>
                        <option value="">Categoría</option>
                        ${categorias.map(c => `<option value="${c}">${c}</option>`).join("")}
                    </select>
                    <input id="detalle" placeholder="Detalle" required>
                    <select id="sedeOrigen">
                        <option value="">Sede origen</option>
                        ${sedes.map(s => `<option value="${s}">${s}</option>`).join("")}
                    </select>
                    <input id="cantidad" type="number" min="1" max="50" value="1" required>
                </div>
                <div id="modoMasa" style="display:none;">
                    <div class="masa-grid">
                        ${categorias.map(cat => `
                            <div class="masa-cat-card tipo-ingreso">
                                <label>${cat}</label>
                                <input type="number" id="masa_${cat}" min="0" max="50" value="0">
                            </div>
                        `).join('')}
                    </div>
                    <input id="detalleMasa" placeholder="Detalle común" required>
                    <select id="sedeOrigenMasa">
                        <option value="">Sede origen</option>
                        ${sedes.map(s => `<option value="${s}">${s}</option>`).join("")}
                    </select>
                </div>
                <textarea id="observaciones" placeholder="Observaciones"></textarea>
            </div>
        `;
    } else if(currentTipoTransferencia === 'TRASLADO') {
        html = `
            <div class="form-section">
                <h4>🔄 Traslado Interno</h4>
                <div class="mode-switch">
                    <label class="mode-option"><input type="radio" name="modoTransferencia" value="individual" checked><span>👤 Individual</span></label>
                    <label class="mode-option"><input type="radio" name="modoTransferencia" value="masa"><span>🚀 Masa</span></label>
                </div>
                <div id="modoIndividual">
                    <select id="categoria" required><option value="">Categoría</option>${categorias.map(c => `<option value="${c}">${c}</option>`).join("")}</select>
                    <input id="detalle" placeholder="Detalle" required>
                    <select id="departamentoOrigen" required><option value="">Origen</option>${departamentos.map(d => `<option value="${d}">${d}</option>`).join("")}</select>
                    <select id="departamentoDestino" required><option value="">Destino</option>${departamentos.map(d => `<option value="${d}">${d}</option>`).join("")}</select>
                </div>
                <div id="modoMasa" style="display:none;">
                    <div class="masa-grid">
                        ${categorias.map(cat => `
                            <div class="masa-cat-card tipo-traslado">
                                <label>${cat}</label>
                                <input type="number" id="masa_${cat}" min="0" max="50" value="0">
                            </div>
                        `).join('')}
                    </div>
                    <input id="detalleMasa" placeholder="Detalle común" required>
                    <select id="departamentoOrigenMasa" required><option value="">Origen</option>${departamentos.map(d => `<option value="${d}">${d}</option>`).join("")}</select>
                    <select id="departamentoDestinoMasa" required><option value="">Destino</option>${departamentos.map(d => `<option value="${d}">${d}</option>`).join("")}</select>
                </div>
                <textarea id="observaciones" placeholder="Observaciones"></textarea>
            </div>
        `;
    } else {
        html = `
            <div class="form-section">
                <h4>📤 Salida a Otra Sede</h4>
                <div class="mode-switch">
                    <label class="mode-option"><input type="radio" name="modoTransferencia" value="individual" checked><span>👤 Individual</span></label>
                    <label class="mode-option"><input type="radio" name="modoTransferencia" value="masa"><span>🚀 Masa</span></label>
                </div>
                <div id="modoIndividual">
                    <select id="categoria" required><option value="">Categoría</option>${categorias.map(c => `<option value="${c}">${c}</option>`).join("")}</select>
                    <input id="detalle" placeholder="Detalle" required>
                    <select id="sedeDestino" required><option value="">Sede destino</option>${sedes.map(s => `<option value="${s}">${s}</option>`).join("")}</select>
                    <input id="cantidad" type="number" min="1" max="50" value="1" required>
                </div>
                <div id="modoMasa" style="display:none;">
                    <div class="masa-grid">
                        ${categorias.map(cat => `
                            <div class="masa-cat-card tipo-salida">
                                <label>${cat}</label>
                                <input type="number" id="masa_${cat}" min="0" max="50" value="0">
                            </div>
                        `).join('')}
                    </div>
                    <input id="detalleMasa" placeholder="Detalle común" required>
                    <select id="sedeDestinoMasa" required><option value="">Sede destino</option>${sedes.map(s => `<option value="${s}">${s}</option>`).join("")}</select>
                </div>
                <textarea id="observaciones" placeholder="Motivo salida"></textarea>
            </div>
        `;
    }

    html += `
        <div class="file-upload">
            <label>📄 Factura/Comprobante (PDF máx. 5MB) <span id="pdfNombreTransferencia" style="color:#4facfe"></span></label>
            <input type="file" id="pdfFileTransferencia" accept="application/pdf" onchange="handlePdfTransferenciaUpload(this)">
        </div>
    `;

    f.innerHTML = html;

    const radios = f.querySelectorAll('input[name="modoTransferencia"]');
    radios.forEach(radio => {
        radio.addEventListener('change', function() {
            const individual = document.getElementById('modoIndividual');
            const masa = document.getElementById('modoMasa');
            individual.style.display = this.value === 'masa' ? 'none' : 'block';
            masa.style.display = this.value === 'masa' ? 'block' : 'none';
            validateTransferencia();
        });
    });

    validateTransferencia();
}

function guardarTransferencia() {
    // 🔐 VERIFICAR CONTRASEÑA ANTES DE GUARDAR
    if(!checkPasswordSession('transferencias')) {
        alert('❌ Sesión de contraseña expirada. Accede nuevamente.');
        showView('transferencias');
        return;
    }

    const form = document.getElementById("form-transferencia");
    if(!form) return;

    const modoMasa = form.querySelector('input[name="modoTransferencia"]:checked')?.value === 'masa';

    if(modoMasa) {
        guardarTransferenciaMasa();
    } else {
        const categoria = document.getElementById('categoria')?.value;
        const cantidadInput = document.getElementById('cantidad');
        const detalle = document.getElementById('detalle')?.value.trim();

        if(!categoria || !detalle) return alert('❌ Categoría y detalle requeridos');

        const cantidad = parseInt(cantidadInput?.value) || 1;
        if(cantidad < 1 || cantidad > 50) return alert('❌ Cantidad 1-50');

        const obj = {
            id: generarIdUnico(),
            tipo: currentTipoTransferencia,
            categoria,
            cantidad,
            detalle,
            fecha: new Date().toISOString(),
            timestamp: Date.now()
        };

        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            if(input.value.trim() && input.id && !['categoria','cantidad','detalle'].includes(input.id)) {
                obj[input.id] = input.value.trim();
            }
        });

        if(pdfCacheTransferencia.tempPdf && pdfCacheTransferencia.tempFilename) {
            obj.pdfData = pdfCacheTransferencia.tempPdf;
            obj.pdfFilename = pdfCacheTransferencia.tempFilename;
        }

        delete pdfCacheTransferencia.tempPdf;
        delete pdfCacheTransferencia.tempFilename;
        document.getElementById('pdfNombreTransferencia').textContent = '';
        document.getElementById('pdfFileTransferencia').value = '';

        cacheTransferencias.unshift(obj);
        saveTransferencias(cacheTransferencias);

        alert(`✅ ${cantidad} ${categoria} ${currentTipoTransferencia.toLowerCase()} registrado`);
        cambiarFormularioTransferencia();
        renderTransferencias();
        statsTotales();
    }
}

function guardarTransferenciaMasa() {
    const detalle = document.getElementById('detalleMasa')?.value.trim();
    if(!detalle) return alert('❌ Detalle común requerido');

    const totalMovimientos = [];
    let totalCantidad = 0;

    categorias.forEach(cat => {
        const cantidad = parseInt(document.getElementById(`masa_${cat}`)?.value) || 0;
        if(cantidad > 0 && cantidad <= 50) {
            totalCantidad += cantidad;
            const obj = {
                id: generarIdUnico(),
                tipo: currentTipoTransferencia,
                categoria: cat,
                cantidad,
                detalle,
                fecha: new Date().toISOString(),
                timestamp: Date.now() + categorias.indexOf(cat),
                modo: 'masa'
            };

            if(currentTipoTransferencia === 'INGRESO') {
                obj.sedeOrigen = document.getElementById('sedeOrigenMasa')?.value;
            } else if(currentTipoTransferencia === 'TRASLADO') {
                obj.departamentoOrigen = document.getElementById('departamentoOrigenMasa')?.value;
                obj.departamentoDestino = document.getElementById('departamentoDestinoMasa')?.value;
            } else {
                obj.sedeDestino = document.getElementById('sedeDestinoMasa')?.value;
            }

            obj.observaciones = document.getElementById('observaciones')?.value.trim();

            if(pdfCacheTransferencia.tempPdf && pdfCacheTransferencia.tempFilename) {
                obj.pdfData = pdfCacheTransferencia.tempPdf;
                obj.pdfFilename = pdfCacheTransferencia.tempFilename;
            }

            totalMovimientos.push(obj);
        }
    });

    if(totalMovimientos.length === 0) {
        return alert('❌ Marca al menos una categoría con cantidad > 0');
    }

    if(totalCantidad > 100) {
        return alert('❌ Máximo 100 equipos por operación');
    }

    cacheTransferencias.unshift(...totalMovimientos);
    saveTransferencias(cacheTransferencias);

    delete pdfCacheTransferencia.tempPdf;
    delete pdfCacheTransferencia.tempFilename;
    document.getElementById('pdfNombreTransferencia').textContent = '';
    document.getElementById('pdfFileTransferencia').value = '';

    alert(`✅ ${totalCantidad} equipos de ${totalMovimientos.length} categorías ${currentTipoTransferencia.toLowerCase()} 🚀`);
    cambiarFormularioTransferencia();
    renderTransferencias();
    statsTotales();
}

function descargarPdfTransferencia(id) {
    const item = cacheTransferencias.find(x => x.id === id);
    if(!item?.pdfData) return alert('❌ No hay PDF');

    const link = document.createElement('a');
    link.href = item.pdfData;
    link.download = item.pdfFilename || `transferencia_${item.categoria}_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function eliminarTransferencia(id) {
    const item = cacheTransferencias.find(x => x.id === id);
    if(!item) return alert('❌ Item no encontrado');

    if(confirm(`¿Eliminar ${item.categoria} ${item.tipo} (${item.cantidad || 1})?`)) {
        cacheTransferencias = cacheTransferencias.filter(x => x.id !== id);
        saveTransferencias(cacheTransferencias);
        renderTransferencias();
        statsTotales();
        alert('✅ Eliminado y totales actualizados');
    }
}

function renderTransferencias() {
    const tabla = document.getElementById("tablaTransferencias");
    if(!tabla) return;

    if(!cacheTransferencias.length) {
        tabla.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:3rem;color:#999;font-style:italic">📭 Sin movimientos de transferencias</td></tr>';
        return;
    }

    tabla.innerHTML = cacheTransferencias.slice(0, 50).map(e => {
        const fecha = new Date(e.fecha).toLocaleDateString('es-ES');
        const tipoIcon = e.tipo === 'INGRESO' ? '📥' : e.tipo === 'TRASLADO' ? '🔄' : '📤';
        const ubicacion = (() => {
            if(e.tipo === 'INGRESO') return e.sedeOrigen || '-';
            if(e.tipo === 'TRASLADO') return `${e.departamentoOrigen || '-'} → ${e.departamentoDestino || '-'}`;
            return e.sedeDestino || '-';
        })();
        
        return `
            <tr style="border-bottom:1px solid #eee;">
                <td style="font-weight:600;">${tipoIcon} ${e.tipo}${e.modo === 'masa' ? ' (MASA)' : ''}</td>
                <td>${e.categoria}</td>
                <td><strong>${e.detalle}</strong> ${e.cantidad > 1 ? `<span style="color:#666">x${e.cantidad}</span>` : ''}</td>
                <td>${ubicacion}</td>
                <td>${fecha}</td>
                <td>
                    <button onclick="eliminarTransferencia('${e.id}')" class="btn-danger" title="Eliminar">🗑️</button>
                    ${e.pdfData ? `<button onclick="descargarPdfTransferencia('${e.id}')" class="btn-pdf" title="Descargar PDF">📥</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// 🎨 Iconos por categoría, para el dashboard
const iconosCategoria = {
    PC: '🖥️',
    Laptop: '💻',
    Impresora: '🖨️',
    Switch: '🔌',
    Servidores: '🖥️',
    Comunicaciones: '📡'
};

function statsTotales() {
    const stats = calcularEstadisticas();

    // ---- 1) RESUMEN GENERAL (sumas de todas las categorías) ----
    const sumar = (obj) => categorias.reduce((acc, cat) => acc + (obj[cat] || 0), 0);
    const totalGeneral = sumar(stats.totalesVisuales);
    const dispGeneral = sumar(stats.disponibles);
    const ocuGeneral = sumar(stats.ocupados);

    const resumenContainer = document.getElementById('dashboardResumen');
    if(resumenContainer) {
        resumenContainer.innerHTML = `
            <div class="summary-card summary-total">
                <span class="summary-icon">📦</span>
                <div class="summary-value">${totalGeneral}</div>
                <span class="summary-label">Total de equipos</span>
            </div>
            <div class="summary-card summary-disp">
                <span class="summary-icon">✅</span>
                <div class="summary-value">${dispGeneral}</div>
                <span class="summary-label">Disponibles</span>
            </div>
            <div class="summary-card summary-ocu">
                <span class="summary-icon">🔴</span>
                <div class="summary-value">${ocuGeneral}</div>
                <span class="summary-label">Ocupados</span>
            </div>
        `;
    }

    // ---- 2) DESGLOSE POR CATEGORÍA (una sola tarjeta por categoría, con sus 3 datos) ----
    const categoriasContainer = document.getElementById('dashboardCategorias');
    if(categoriasContainer) {
        categoriasContainer.innerHTML = categorias.map(cat => `
            <div class="category-card">
                <div class="category-header">
                    <span class="category-icon">${iconosCategoria[cat] || '📦'}</span>
                    <span class="category-name">${cat}</span>
                </div>
                <div class="category-body">
                    <div class="category-metric metric-total">
                        <span class="metric-value">${stats.totalesVisuales[cat] || 0}</span>
                        <span class="metric-label">Total</span>
                    </div>
                    <div class="category-metric metric-disp">
                        <span class="metric-value">${stats.disponibles[cat] || 0}</span>
                        <span class="metric-label">Disponible</span>
                    </div>
                    <div class="category-metric metric-ocu">
                        <span class="metric-value">${stats.ocupados[cat] || 0}</span>
                        <span class="metric-label">Ocupado</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function del(id) {
    const item = cacheData.find(x => x.id === id);
    if(!item) return alert('❌ Registro no encontrado');

    if(confirm(`¿Eliminar ${item.categoria} de ${item.user || item.nombre || 'usuario'}?`)) {
        cacheData = cacheData.filter(x => x.id !== id);
        saveData(cacheData);
        render();
        statsTotales();
        alert('✅ Eliminado y totales actualizados');
    }
}

function render() {
    const filtro = document.getElementById('filtroCategoria')?.value || '';
    const dataFiltrada = filtro ? cacheData.filter(item => item.categoria === filtro) : cacheData;
    renderTabla(dataFiltrada);
}

function renderTabla(data) {
    const tbody = document.getElementById("tablaBody");
    const thead = document.getElementById("thead");
    if(!tbody || !thead) return;

    if(!data?.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:4rem;color:#999;font-style:italic">📭 Sin registros en inventario</td></tr>';
        return;
    }

    const cols = ['categoria', 'user', 'dep', 'nombre', 'modelo', 'serial'];
    thead.innerHTML = `
        <tr style="background:#f8f9fa;font-weight:600;">
            ${cols.map(c => `<th style="padding:1rem 0.5rem;">${c.toUpperCase()}</th>`).join("")}
            <th style="padding:1rem 0.5rem;">FECHA</th>
            <th style="padding:1rem 0.5rem;">ACCIONES</th>
        </tr>`;

    tbody.innerHTML = data.slice(0, 100).map(e => {
        const fecha = new Date(e.fecha).toLocaleDateString('es-ES');
        return `
            <tr style="border-bottom:1px solid #eee;">
                ${cols.map(c => `<td style="padding:0.8rem 0.5rem;">${e[c] || '-'}</td>`).join("")}
                <td style="padding:0.8rem 0.5rem;color:#666;">${fecha}</td>
                <td style="padding:0.8rem 0.5rem;">
                    <button onclick="del('${e.id}')" class="btn-danger" style="margin-right:0.5rem;" title="Eliminar">🗑️</button>
                    ${e.pdfData ? `<button onclick="descargarPDF('${e.id}')" class="btn-pdf" title="PDF">📥</button>` : '<span style="color:#ccc;font-size:1.2rem;">📄</span>'}
                </td>
            </tr>
        `;
    }).join("");
}

function descargarPDF(id) {
    const item = cacheData.find(x => x.id === id);
    if(!item?.pdfData) return alert('❌ No hay PDF');

    const link = document.createElement('a');
    link.href = item.pdfData;
    link.download = item.pdfFilename || `inventario_${item.categoria}_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function guardarInventarioBase() {
    const nuevosTotales = {};
    categorias.forEach(cat => {
        const input = document.getElementById(`edit${cat}`);
        nuevosTotales[cat] = parseInt(input?.value) || 0;
    });

    inventarioBase = nuevosTotales;
    saveInventarioBase(nuevosTotales);
    statsTotales();
    alert('✅ Base de inventario actualizada');
}

function limpiarTodo() {
    if(confirm('⚠️ ¿LIMPIAR TODO? Esto borrará INVENTARIO, TRANSFERENCIAS y BASE')) {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
    }
}

function exportarDatos() {
    const data = {
        inventario: cacheData,
        transferencias: cacheTransferencias,
        base: inventarioBase,
        fecha: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${Date.now()}.json`;
    a.click();
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('📊 INVENTARIO COMPLETO', 20, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 35);
    
    const tableData = cacheData.slice(0, 50).map(item => [
        item.categoria || '',
        item.user || '',
        item.nombre || '',
        item.modelo || '',
        item.serial || '',
        new Date(item.fecha).toLocaleDateString('es-ES')
    ]);
    
    doc.autoTable({
        startY: 50,
        head: [['Categoría', 'Usuario', 'Equipo', 'Modelo', 'Serial', 'Fecha']],
        body: tableData,
        theme: 'grid'
    });
    
    doc.save(`inventario_${Date.now()}.pdf`);
}