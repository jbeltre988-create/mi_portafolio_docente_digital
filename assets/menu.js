// Marca en el menú lateral la página en la que estás (para que se vea "presionado").
(function () {
  try {
    var archivo = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (archivo === '') archivo = 'index.html';
    var clave = null;
    if (archivo === 'index.html') clave = 'panel-principal';
    else if (archivo === 'evidencias.html') clave = 'evidencias-profesionales';
    else if (archivo === 'planificaciones.html') clave = 'planificaciones-y-aula';
    else if (archivo === 'reflexiones.html') clave = 'reflexiones-pedagogicas';
    else if (archivo === 'perfil.html') {
      clave = location.hash === '#formacion' ? 'formacion-y-certificaciones' : 'perfil-docente-y-ajustes';
    }
    if (!clave) return;

    var enlaces = document.querySelectorAll('aside nav a[data-path]');
    enlaces.forEach(function (a) {
      if (a.getAttribute('data-path') === clave) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    // En perfil.html, al cambiar entre #formacion y el resto, actualizar la marca.
    window.addEventListener('hashchange', function () {
      if (archivo !== 'perfil.html') return;
      var k = location.hash === '#formacion' ? 'formacion-y-certificaciones' : 'perfil-docente-y-ajustes';
      enlaces.forEach(function (a) {
        if (a.getAttribute('data-path') === k) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    });
  } catch (e) { /* el menú sigue funcionando aunque falle esto */ }
})();
