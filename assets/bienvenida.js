// Saludo según la hora del día en la bienvenida del Panel Principal.
(function () {
  try {
    var el = document.getElementById('bv-saludo');
    if (!el) return;
    var h = new Date().getHours();
    var saludo = h < 12 ? 'Buenos días,' : (h < 19 ? 'Buenas tardes,' : 'Buenas noches,');
    el.textContent = saludo;
  } catch (e) { /* si falla, queda el texto "Bienvenido," */ }
})();
