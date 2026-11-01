/* analytics.js: Google Analytics 4 (satu ID untuk semua halaman).
   - Tidak pernah mengirim username, kunci, atau isi surat.
   - Browser yang sedang masuk mode admin TIDAK dihitung (supaya data uji coba tidak mengotori laporan).
   - Dari halaman lain, kejadian dikirim lewat:  EgTrack('nama_kejadian', { parameter: 'nilai' }) */
(function (w, d) {
  var ID = 'G-B9C1PS21YC';
  var admin = false;
  try { admin = !!localStorage.getItem('eg_admin_v1'); } catch (e) {}
  w.EgTrack = function (name, params) {
    if (admin || !w.gtag) return;
    try { w.gtag('event', name, params || {}); } catch (e) {}
  };
  if (admin) return;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function () { w.dataLayer.push(arguments); };
  w.gtag('js', new Date());
  w.gtag('config', ID);
  var s = d.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  d.head.appendChild(s);
})(window, document);
