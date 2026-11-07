/* ============================================================
   MIS ARCHIVOS - Portafolio Docente (Lic. Johan Beltre)
   Agrega a cada sección una galería de archivos, como un portafolio de Google:
   - Pega enlaces de Google Drive, Docs, Sheets, Slides, carpetas de Drive,
     YouTube o cualquier PDF/imagen y se ven dentro de la página.
   - También puedes subir un archivo de tu computadora (se guarda solo en tu
     navegador; para que otros lo vean, súbelo a Drive y pega el enlace).
   - Para agregar/editar/eliminar, pulsa "Editar página" (o "Nueva Evidencia").
   - Para publicar la lista: "Descargar lista" y sube data/archivos.json a GitHub.
   ============================================================ */
(function () {
  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  var TITULOS = {
    planificaciones: ['Mis planificaciones y actividades', 'Archivos, planificaciones, rúbricas y actividades de aula.'],
    evidencias: ['Mis evidencias profesionales', 'Documentos, fotos y videos que respaldan tu práctica docente.'],
    reflexiones: ['Mis reflexiones y registros', 'Diarios reflexivos, informes y registros de tu práctica.'],
    perfil: ['Mis títulos y certificaciones', 'Diplomas, certificados, constancias y currículum.']
  };
  if (!TITULOS[PAGE]) {      // en el Panel Principal solo se conecta el botón "Nueva Evidencia"
    document.addEventListener('DOMContentLoaded', function () {
      Array.prototype.forEach.call(document.querySelectorAll('aside button'), function (b) {
        if (/Nueva Evidencia/i.test(b.textContent)) b.addEventListener('click', function () { location.href = 'evidencias.html#nuevo'; });
      });
    });
    return;
  }

  var K = 'portafolio:archivos';
  var publicado = {};          // lo que ve cualquier visitante (data/archivos.json)
  var local = readLocal();     // lo que tú vas editando en este navegador
  var listaActual = [];
  var secEl, gridEl;

  function readLocal() { try { return JSON.parse(localStorage.getItem(K)) || {}; } catch (e) { return {}; } }
  function writeLocal() { try { localStorage.setItem(K, JSON.stringify(local)); } catch (e) { alert('No se pudo guardar en este navegador.'); } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function lista() { return (local[PAGE] !== undefined ? local[PAGE] : (publicado[PAGE] || [])); }

  /* ---------- IndexedDB (archivos subidos desde tu computadora) ---------- */
  function db() {
    return new Promise(function (ok, no) {
      var r = indexedDB.open('portafolio-archivos', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('f'); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); };
    });
  }
  function idb(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, no) {
        var tx = d.transaction('f', mode), st = tx.objectStore('f'), req = fn(st);
        tx.oncomplete = function () { ok(req && req.result); }; tx.onerror = function () { no(tx.error); };
      });
    });
  }

  /* ---------- Tipos y vista previa ---------- */
  function tipoDe(it) {
    var u = (it.url || '').toLowerCase(), m = (it.mime || '').toLowerCase(), n = (it.nombre || '').toLowerCase();
    if (/youtu\.be|youtube\.com/.test(u) || m.indexOf('video') === 0) return ['Video', 'smart_display'];
    if (/drive\.google\.com\/drive\/folders/.test(u)) return ['Carpeta de Drive', 'folder_open'];
    if (/docs\.google\.com\/document/.test(u)) return ['Documento', 'description'];
    if (/docs\.google\.com\/spreadsheets/.test(u)) return ['Hoja de cálculo', 'table_chart'];
    if (/docs\.google\.com\/presentation/.test(u)) return ['Presentación', 'slideshow'];
    if (/docs\.google\.com\/forms/.test(u)) return ['Formulario', 'checklist'];
    if (/\.pdf($|\?)/.test(u) || m === 'application/pdf' || /\.pdf$/.test(n)) return ['PDF', 'picture_as_pdf'];
    if (/\.(png|jpe?g|gif|webp|svg)($|\?)/.test(u) || m.indexOf('image') === 0) return ['Imagen', 'image'];
    if (/\.(docx?|odt)($|\?)/.test(u + n)) return ['Word', 'description'];
    if (/\.(pptx?|odp)($|\?)/.test(u + n)) return ['PowerPoint', 'slideshow'];
    if (/\.(xlsx?|csv|ods)($|\?)/.test(u + n)) return ['Excel', 'table_chart'];
    if (/drive\.google\.com\/file/.test(u)) return ['Archivo de Drive', 'attach_file'];
    return [it.local ? 'Archivo' : 'Enlace', it.local ? 'attach_file' : 'link'];
  }
  function embedDe(url) {
    var m;
    if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) return { k: 'iframe', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
    if ((m = url.match(/drive\.google\.com\/open\?id=([\w-]+)/))) return { k: 'iframe', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
    if ((m = url.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/))) return { k: 'iframe', src: 'https://drive.google.com/embeddedfolderview?id=' + m[1] + '#grid' };
    if ((m = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/)) && m[2] !== 'e') return { k: 'iframe', src: 'https://docs.google.com/' + m[1] + '/d/' + m[2] + '/preview' };
    if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/))) return { k: 'iframe', src: 'https://www.youtube.com/embed/' + m[1] };
    if (/\.pdf($|\?|#)/i.test(url)) return { k: 'iframe', src: url };
    if (/\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(url)) return { k: 'img', src: url };
    return null;
  }
  function normUrl(u) {
    u = (u || '').trim(); if (!u) return '';
    if (/^(https?:)?\/\//i.test(u) || /^(archivos|assets|data)\//.test(u)) return u;
    return /^www\./i.test(u) || /^[\w-]+(\.[\w-]+)+\//.test(u) ? 'https://' + u : u;
  }

  /* ---------- Estilos ---------- */
  var st = document.createElement('style');
  st.textContent =
    '.arch-admin{display:none!important}body.ed-on .arch-admin{display:inline-flex!important}body.ed-on div.arch-admin{display:flex!important}' +
    '#arch-modal,#arch-view{position:fixed;inset:0;z-index:100000;background:rgba(11,28,48,.55);display:none;align-items:center;justify-content:center;padding:16px}' +
    '#arch-modal.on,#arch-view.on{display:flex}' +
    '.arch-box{background:#fff;border-radius:16px;width:100%;max-width:560px;max-height:92vh;overflow:auto;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.3)}' +
    '.arch-box label{display:block;font-size:13px;font-weight:600;color:#0b1c30;margin:12px 0 4px}' +
    '.arch-box input[type=text],.arch-box input[type=url],.arch-box textarea{width:100%;border:1px solid #c5c5d3;border-radius:8px;padding:9px 11px;font-size:14px;font-family:inherit}' +
    '.arch-box small{display:block;color:#444651;font-size:12px;margin-top:4px}' +
    '.arch-btn{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;background:#1e3a8a;color:#fff;font-family:inherit}' +
    '.arch-btn.sec{background:#e5eeff;color:#00236f}.arch-btn.red{background:#ffdad6;color:#93000a}' +
    '#arch-view .arch-box{max-width:1100px;height:90vh;display:flex;flex-direction:column;padding:16px}' +
    '#arch-view iframe,#arch-view video{flex:1;width:100%;border:0;border-radius:8px;background:#f1f1f1}' +
    '#arch-view img{max-width:100%;max-height:100%;margin:auto;object-fit:contain}';
  document.head.appendChild(st);

  /* ---------- Sección en la página ---------- */
  function crearSeccion() {
    var main = document.querySelector('main'); if (!main) return;
    var c = main.firstElementChild; while (c && c.children.length === 1) c = c.firstElementChild;
    secEl = document.createElement('section');
    secEl.id = 'mis-archivos'; secEl.className = 'ed-ui w-full mb-space-lg';
    secEl.innerHTML =
      '<div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md" style="padding:20px">' +
      '<div class="flex flex-wrap items-center justify-between gap-space-sm" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">' +
      '<div><h2 class="font-headline-sm text-headline-sm text-primary" style="font-size:22px;font-weight:700;color:#00236f;margin:0">' + esc(TITULOS[PAGE][0]) + '</h2>' +
      '<p class="font-body-sm text-body-sm text-on-surface-variant" style="margin:2px 0 0;font-size:14px;color:#444651">' + esc(TITULOS[PAGE][1]) + '</p></div>' +
      '<div class="arch-admin" style="gap:8px;flex-wrap:wrap"><button class="arch-btn" data-a="add" type="button">＋ Agregar archivo</button>' +
      '<button class="arch-btn sec" data-a="export" type="button">⬇ Descargar lista para publicar</button></div></div>' +
      '<p class="arch-admin" style="margin:10px 0 0;font-size:12px;color:#444651">Para que todos vean tu lista: descarga <b>archivos.json</b> y súbelo a la carpeta <b>data</b> de tu repositorio en GitHub.</p>' +
      '<div id="arch-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:16px"></div></div>';
    var h1 = main.querySelector('h1'), ref = null;
    if (c && h1) { ref = h1; while (ref && ref.parentElement !== c) ref = ref.parentElement; }
    if (c && ref) c.insertBefore(secEl, ref.nextSibling);
    else if (c) c.insertBefore(secEl, c.firstChild);
    else main.appendChild(secEl);
    gridEl = secEl.querySelector('#arch-grid');
    secEl.addEventListener('click', onClick);
  }

  function render() {
    listaActual = lista();
    if (!listaActual.length) {
      gridEl.innerHTML = '<div style="grid-column:1/-1;padding:28px;text-align:center;border:2px dashed #c5c5d3;border-radius:12px;color:#444651;font-size:14px">' +
        'Aún no hay archivos en esta sección.<span class="arch-admin" style="display:none"> Pulsa <b>＋ Agregar archivo</b>.</span></div>';
      return;
    }
    gridEl.innerHTML = listaActual.map(function (it, i) {
      var t = tipoDe(it), puede = it.local || !!embedDe(it.url || '');
      return '<article style="background:#f8f9ff;border:1px solid #dce9ff;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px">' +
        '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<span class="material-symbols-outlined" style="background:#1e3a8a;color:#fff;border-radius:10px;padding:8px;font-size:24px;flex-shrink:0">' + t[1] + '</span>' +
        '<div style="min-width:0"><h3 style="margin:0;font-size:16px;font-weight:600;color:#0b1c30;word-break:break-word">' + esc(it.titulo) + '</h3>' +
        '<p style="margin:2px 0 0;font-size:12px;color:#904d00;font-weight:600;text-transform:uppercase;letter-spacing:.04em">' + esc(t[0]) + (it.categoria ? ' • ' + esc(it.categoria) : '') + '</p>' +
        (it.descripcion ? '<p style="margin:6px 0 0;font-size:13px;color:#444651;white-space:pre-line">' + esc(it.descripcion) + '</p>' : '') + '</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto">' +
        (puede ? '<button class="arch-btn" data-a="ver" data-i="' + i + '" type="button">👁 Ver</button>' : '') +
        (it.url ? '<button class="arch-btn sec" data-a="abrir" data-i="' + i + '" type="button">↗ Abrir</button>' : '') +
        (it.local ? '<button class="arch-btn sec" data-a="bajar" data-i="' + i + '" type="button">⬇ Descargar</button>' : '') +
        '<span class="arch-admin" style="gap:8px;flex-wrap:wrap"><button class="arch-btn sec" data-a="edit" data-i="' + i + '" type="button">✏️ Editar</button>' +
        '<button class="arch-btn red" data-a="del" data-i="' + i + '" type="button">🗑 Eliminar</button></span></div></article>';
    }).join('');
  }

  /* ---------- Acciones ---------- */
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a'), i = +b.getAttribute('data-i'), it = listaActual[i];
    if (a === 'add') openForm();
    else if (a === 'export') exportar();
    else if (a === 'edit') openForm(it, i);
    else if (a === 'del') { if (confirm('¿Eliminar "' + it.titulo + '"?')) { var l = lista().slice(); l.splice(i, 1); local[PAGE] = l; writeLocal(); if (it.fileId) idb('readwrite', function (s) { return s.delete(it.fileId); }); render(); } }
    else if (a === 'abrir') window.open(it.url, '_blank', 'noopener');
    else if (a === 'ver') ver(it);
    else if (a === 'bajar') bajar(it);
  }
  function blobDe(it) { return idb('readonly', function (s) { return s.get(it.fileId); }); }
  function bajar(it) {
    blobDe(it).then(function (bl) {
      if (!bl) return alert('Este archivo se subió desde otro navegador y no está aquí.');
      var a = document.createElement('a'); a.href = URL.createObjectURL(bl); a.download = it.nombre || it.titulo; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
  }
  function ver(it) {
    var v = document.getElementById('arch-view'), box = v.querySelector('.arch-body');
    function show(k, src) {
      box.innerHTML = k === 'img' ? '<img src="' + esc(src) + '" alt="">' : k === 'video' ? '<video controls src="' + esc(src) + '"></video>' : '<iframe src="' + esc(src) + '" allow="autoplay; fullscreen" allowfullscreen></iframe>';
      v.querySelector('.arch-ttl').textContent = it.titulo; v.classList.add('on');
    }
    if (it.local) {
      blobDe(it).then(function (bl) {
        if (!bl) return alert('Este archivo se subió desde otro navegador y no está aquí.');
        var u = URL.createObjectURL(bl), m = bl.type || '';
        show(m.indexOf('image') === 0 ? 'img' : m.indexOf('video') === 0 ? 'video' : 'iframe', u);
      });
    } else { var em = embedDe(it.url); if (em) show(em.k, em.src); else window.open(it.url, '_blank', 'noopener'); }
  }

  /* ---------- Formulario ---------- */
  function crearModales() {
    var m = document.createElement('div'); m.id = 'arch-modal'; m.className = 'ed-ui';
    m.innerHTML = '<form class="arch-box" autocomplete="off"><h3 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#00236f" id="arch-h"></h3>' +
      '<label>Título *</label><input type="text" id="f-titulo" required placeholder="Ej: Planificación Unidad 1 - Matemáticas">' +
      '<label>Categoría (opcional)</label><input type="text" id="f-cat" placeholder="Ej: Unidad 1, Rúbricas, 2026-2027">' +
      '<label>Descripción (opcional)</label><textarea id="f-desc" rows="3"></textarea>' +
      '<label>Enlace (Google Drive, Docs, YouTube, PDF…)</label><input type="text" id="f-url" placeholder="https://drive.google.com/…">' +
      '<small>En Google Drive: clic derecho en el archivo → Compartir → “Cualquier persona con el enlace” → Copiar enlace. También sirve una carpeta completa.</small>' +
      '<label>…o subir un archivo de mi computadora</label><input type="file" id="f-file">' +
      '<small>Un archivo subido aquí se guarda solo en este navegador (máx. 50 MB). Para que otros lo vean, sube el archivo a Drive y pega el enlace.</small>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px"><button type="button" class="arch-btn sec" id="f-cancel">Cancelar</button><button type="submit" class="arch-btn">Guardar</button></div></form>';
    document.body.appendChild(m);
    var v = document.createElement('div'); v.id = 'arch-view'; v.className = 'ed-ui';
    v.innerHTML = '<div class="arch-box"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px"><b class="arch-ttl" style="font-size:16px"></b><button type="button" class="arch-btn sec" id="v-close">✕ Cerrar</button></div><div class="arch-body" style="flex:1;display:flex;min-height:0"></div></div>';
    document.body.appendChild(v);
    v.addEventListener('click', function (e) { if (e.target === v) cerrarVer(); });
    v.querySelector('#v-close').addEventListener('click', cerrarVer);
    m.querySelector('#f-cancel').addEventListener('click', function () { m.classList.remove('on'); });
    m.querySelector('form').addEventListener('submit', guardar);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { m.classList.remove('on'); cerrarVer(); } });
  }
  function cerrarVer() { var v = document.getElementById('arch-view'); v.classList.remove('on'); v.querySelector('.arch-body').innerHTML = ''; }
  var editando = -1;
  function openForm(it, i) {
    var m = document.getElementById('arch-modal'); editando = it ? i : -1;
    m.querySelector('#arch-h').textContent = it ? 'Editar archivo' : 'Agregar archivo';
    m.querySelector('#f-titulo').value = it ? it.titulo : '';
    m.querySelector('#f-cat').value = it ? (it.categoria || '') : '';
    m.querySelector('#f-desc').value = it ? (it.descripcion || '') : '';
    m.querySelector('#f-url').value = it && !it.local ? (it.url || '') : '';
    m.querySelector('#f-file').value = '';
    m.classList.add('on'); m.querySelector('#f-titulo').focus();
  }
  function guardar(e) {
    e.preventDefault();
    var m = document.getElementById('arch-modal');
    var titulo = m.querySelector('#f-titulo').value.trim(), url = normUrl(m.querySelector('#f-url').value), file = m.querySelector('#f-file').files[0];
    if (!titulo) return;
    var prev = editando > -1 ? lista()[editando] : null;
    var it = { id: prev ? prev.id : uid(), titulo: titulo, categoria: m.querySelector('#f-cat').value.trim(), descripcion: m.querySelector('#f-desc').value.trim() };
    function fin() {
      var l = lista().slice(); if (editando > -1) l[editando] = it; else l.push(it);
      local[PAGE] = l; writeLocal(); m.classList.remove('on'); render();
    }
    if (file) {
      if (file.size > 50 * 1024 * 1024) return alert('El archivo pesa más de 50 MB. Súbelo a Google Drive y pega el enlace.');
      it.local = true; it.fileId = prev && prev.fileId ? prev.fileId : uid(); it.nombre = file.name; it.mime = file.type;
      idb('readwrite', function (s) { return s.put(file, it.fileId); }).then(fin, function () { alert('No se pudo guardar el archivo en este navegador.'); });
    } else if (url) { it.url = url; if (prev && prev.fileId) idb('readwrite', function (s) { return s.delete(prev.fileId); }); fin(); }
    else if (prev && prev.local) { it.local = true; it.fileId = prev.fileId; it.nombre = prev.nombre; it.mime = prev.mime; fin(); }
    else alert('Pega un enlace o elige un archivo de tu computadora.');
  }

  /* ---------- Publicar la lista ---------- */
  function exportar() {
    var todo = {}, omitidos = 0;
    Object.keys(TITULOS).forEach(function (p) {
      var l = (local[p] !== undefined ? local[p] : (publicado[p] || [])).filter(function (x) { if (x.local) { omitidos++; return false; } return true; });
      if (l.length) todo[p] = l;
    });
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(todo, null, 2)], { type: 'application/json' }));
    a.download = 'archivos.json'; a.className = 'ed-ui'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    if (omitidos) alert('Se descargó archivos.json.\n\n' + omitidos + ' archivo(s) subido(s) desde tu computadora NO se incluyen (solo existen en tu navegador). Súbelos a Google Drive y agrega su enlace para publicarlos.');
    else alert('Listo. Ahora sube el archivo archivos.json a la carpeta "data" de tu repositorio en GitHub.');
  }

  /* ---------- Botón "Nueva Evidencia" del menú ---------- */
  function botonNueva() {
    Array.prototype.forEach.call(document.querySelectorAll('button'), function (b) {
      if (/Nueva (Evidencia|Planificaci)/i.test(b.textContent) && !b.closest('.ed-ui')) b.addEventListener('click', function () {
        if (window.PortafolioEditor) window.PortafolioEditor.setEdit(true);
        if (secEl) { secEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); openForm(); }
        else location.href = 'evidencias.html#nuevo';
      });
    });
  }

  function init() {
    crearSeccion(); if (!gridEl) return;
    crearModales(); render(); botonNueva();
    if (location.hash === '#nuevo') { if (window.PortafolioEditor) window.PortafolioEditor.setEdit(true); openForm(); }
    fetch('data/archivos.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
      .then(function (j) { publicado = j || {}; render(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
