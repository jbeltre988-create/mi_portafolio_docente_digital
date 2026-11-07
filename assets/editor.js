/* ============================================================
   MODO EDICIÓN - Portafolio Docente (Lic. Johan Beltre)
   Botón "Editar página" (abajo a la derecha):
   - Clic en cualquier texto para cambiarlo.
   - Clic en cualquier foto para cambiarla por una de tu computadora.
   - Nombre, área y foto de perfil se cambian en TODAS las páginas a la vez.
   - Los cambios se guardan en este navegador. Para dejarlos permanentes
     en internet, usa "Descargar página" y sube el archivo a GitHub.
   ============================================================ */
(function () {
  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  var K_PAGE = 'portafolio:' + PAGE;
  var K_PERFIL = 'portafolio:perfil';
  var SEL = 'h1,h2,h3,h4,h5,h6,p,li,td,th,label,a,button,span,div,small,strong,em,figcaption,summary';

  function load(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  function ownText(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) return true;
    }
    return false;
  }
  function textEls(root) {
    return Array.prototype.filter.call(root.querySelectorAll(SEL), function (el) {
      return !el.closest('.ed-ui') && !el.hasAttribute('data-perfil') &&
             !el.classList.contains('material-symbols-outlined') && ownText(el);
    });
  }
  function imgEls(root) {
    return Array.prototype.filter.call(root.querySelectorAll('img'), function (el) {
      return !el.hasAttribute('data-perfil');
    });
  }
  function cleanHTML(el) {
    var c = el.cloneNode(true);
    c.removeAttribute('contenteditable');
    Array.prototype.forEach.call(c.querySelectorAll('[contenteditable]'), function (x) { x.removeAttribute('contenteditable'); });
    Array.prototype.forEach.call(c.querySelectorAll('[data-ed]'), function (x) { x.removeAttribute('data-ed'); });
    c.removeAttribute('data-ed');
    return c.innerHTML;
  }

  /* ---------- Aplicar datos guardados ---------- */
  function applyPerfil(root, perfil) {
    ['nombre', 'area'].forEach(function (k) {
      if (perfil[k]) Array.prototype.forEach.call(root.querySelectorAll('[data-perfil="' + k + '"]'), function (e) { e.textContent = perfil[k]; });
    });
    if (perfil.foto) Array.prototype.forEach.call(root.querySelectorAll('[data-perfil="foto"]'), function (e) { e.setAttribute('src', perfil.foto); });
  }
  function applyPage(root, data) {
    var t = textEls(root), im = imgEls(root);
    t.forEach(function (el, i) { el.setAttribute('data-ed', i); });
    if (data.t) Object.keys(data.t).map(Number).sort(function (a, b) { return a - b; }).forEach(function (i) {
      var el = root.querySelector('[data-ed="' + i + '"]');
      if (el) el.innerHTML = data.t[i];
    });
    if (data.i) Object.keys(data.i).forEach(function (i) { if (im[i]) im[i].setAttribute('src', data.i[i]); });
    return { t: t, im: im };
  }

  var perfil = load(K_PERFIL), page = load(K_PAGE);
  if (!page.t) page.t = {};
  if (!page.i) page.i = {};
  var ctx;

  /* ---------- Interfaz ---------- */
  var css = document.createElement('style');
  css.className = 'ed-ui';
  css.textContent =
    '.ed-ui{font-family:Inter,system-ui,sans-serif}' +
    '#ed-bar{position:fixed;right:16px;bottom:16px;z-index:99999;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end;max-width:calc(100vw - 32px)}' +
    '#ed-bar button{border:0;border-radius:999px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);background:#1e3a8a;color:#fff}' +
    '#ed-bar button.sec{background:#fff;color:#1e3a8a;border:1px solid #1e3a8a}' +
    '#ed-bar button.warn{background:#fff;color:#ba1a1a;border:1px solid #ba1a1a}' +
    '#ed-msg{background:#fff;color:#0b1c30;border-radius:12px;padding:8px 12px;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,.25);max-width:340px}' +
    'body.ed-on [contenteditable=true]{outline:1px dashed #fe932c;outline-offset:2px;cursor:text}' +
    'body.ed-on [contenteditable=true]:focus{outline:2px solid #1e3a8a;background:rgba(254,147,44,.08)}' +
    'body.ed-on img{cursor:pointer;outline:2px dashed #fe932c;outline-offset:2px}';
  document.head.appendChild(css);

  var bar = document.createElement('div');
  bar.id = 'ed-bar'; bar.className = 'ed-ui';
  document.body.appendChild(bar);
  var fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none'; fileInput.className = 'ed-ui';
  document.body.appendChild(fileInput);

  function btn(txt, cls, fn) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls;
    b.addEventListener('click', fn); return b;
  }
  function msg(t) {
    var m = document.getElementById('ed-msg'); if (!m) return;
    m.textContent = t; clearTimeout(msg._t);
    msg._t = setTimeout(function () { if (m) m.textContent = 'Modo edición: haz clic en un texto o en una foto para cambiarlo.'; }, 2500);
  }
  function renderBar(on) {
    bar.innerHTML = '';
    if (!on) { bar.appendChild(btn('✏️ Editar página', '', function () { setEdit(true); })); return; }
    var m = document.createElement('div'); m.id = 'ed-msg';
    m.textContent = 'Modo edición: haz clic en un texto o en una foto para cambiarlo.';
    bar.appendChild(m);
    bar.appendChild(btn('⬇ Descargar página', '', download));
    bar.appendChild(btn('↺ Restablecer', 'warn', reset));
    bar.appendChild(btn('✔ Terminar', 'sec', function () { setEdit(false); }));
  }

  /* ---------- Activar / desactivar edición ---------- */
  function setEdit(on) {
    document.body.classList.toggle('ed-on', on);
    ctx.t.forEach(function (el) { if (on) el.setAttribute('contenteditable', 'true'); else el.removeAttribute('contenteditable'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-perfil="nombre"],[data-perfil="area"]'), function (el) {
      if (on) el.setAttribute('contenteditable', 'true'); else el.removeAttribute('contenteditable');
    });
    renderBar(on);
  }

  /* ---------- Guardado automático ---------- */
  document.addEventListener('input', function (e) {
    var el = e.target.closest && e.target.closest('[data-perfil="nombre"],[data-perfil="area"]');
    if (el) {
      perfil[el.getAttribute('data-perfil')] = el.textContent;
      save(K_PERFIL, perfil);
      Array.prototype.forEach.call(document.querySelectorAll('[data-perfil="' + el.getAttribute('data-perfil') + '"]'), function (o) {
        if (o !== el) o.textContent = el.textContent;
      });
      msg('Guardado ✓'); return;
    }
    var t = e.target.closest && e.target.closest('[data-ed][contenteditable]');
    if (t) { page.t[t.getAttribute('data-ed')] = cleanHTML(t); save(K_PAGE, page); msg('Guardado ✓'); }
  });

  /* ---------- Cambiar fotos ---------- */
  var pending = null;
  function shrink(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var im = new Image();
      im.onload = function () {
        var max = 700, s = Math.min(1, max / Math.max(im.width, im.height));
        var c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.85));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('ed-on')) return;
    var a = e.target.closest && e.target.closest('a');
    if (a && !a.closest('.ed-ui')) e.preventDefault();          // evita salir de la página mientras editas
    var img = e.target.closest && e.target.closest('img');
    if (img) { pending = img; fileInput.value = ''; fileInput.click(); }
  }, true);
  fileInput.addEventListener('change', function () {
    var f = fileInput.files[0]; if (!f || !pending) return;
    var target = pending; pending = null;
    shrink(f, function (data) {
      if (target.hasAttribute('data-perfil')) {
        perfil.foto = data;
        if (!save(K_PERFIL, perfil)) msg('La foto es muy pesada para guardarla.');
        applyPerfil(document, perfil);
      } else {
        var i = ctx.im.indexOf(target);
        target.setAttribute('src', data); page.i[i] = data; save(K_PAGE, page);
      }
      msg('Foto cambiada ✓');
    });
  });

  /* ---------- Descargar la página con los cambios ---------- */
  function build(doc) {
    var c = applyPage(doc, page);
    applyPerfil(doc, perfil);
    Array.prototype.forEach.call(doc.querySelectorAll('[data-ed]'), function (x) { x.removeAttribute('data-ed'); });
    Array.prototype.forEach.call(doc.querySelectorAll('.ed-ui'), function (x) { x.remove(); });
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }
  function save2file(html) {
    var a = document.createElement('a'); a.className = 'ed-ui';
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    a.download = PAGE + '.html'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    msg('Descargado: ' + PAGE + '.html. Súbelo a GitHub para publicarlo.');
  }
  function download() {
    fetch(location.pathname.split('/').pop() || 'index.html', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (t) { save2file(build(new DOMParser().parseFromString(t, 'text/html'))); })
      .catch(function () {
        var d = document.documentElement.cloneNode(true);
        var doc = document.implementation.createHTMLDocument(''); doc.replaceChild(doc.importNode(d, true), doc.documentElement);
        Array.prototype.forEach.call(doc.querySelectorAll('[contenteditable]'), function (x) { x.removeAttribute('contenteditable'); });
        doc.body.classList.remove('ed-on');
        Array.prototype.forEach.call(doc.querySelectorAll('.ed-ui'), function (x) { x.remove(); });
        save2file('<!DOCTYPE html>\n' + doc.documentElement.outerHTML);
      });
  }

  function reset() {
    if (!confirm('¿Borrar tus cambios y volver al diseño original en TODAS las páginas?')) return;
    try {
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf('portafolio:') === 0) localStorage.removeItem(k); });
    } catch (e) {}
    location.reload();
  }

  /* ---------- Inicio ---------- */
  function init() {
    ctx = applyPage(document, page);
    applyPerfil(document, perfil);
    renderBar(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
