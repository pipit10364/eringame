/* Pertanyaan pemulihan — dipakai index.html (membuat) dan celebration-chamber.html (memakai). */
(function(){
  const CFG = {
    apiKey: "AIzaSyDyfktOuIxMwtKfoniVHYvMgd55Ml95gP8",
    authDomain: "erin-game.firebaseapp.com",
    databaseURL: "https://erin-game-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "erin-game",
    storageBucket: "erin-game.firebasestorage.app",
    messagingSenderId: "303866378537",
    appId: "1:303866378537:web:f3844c701203391f4b5f38"
  };
  const FB = 'https://www.gstatic.com/firebasejs/10.13.0/';
  const KEY = u => 'eg_recovery_v1_' + u;
  let skipped = false;

  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  async function getDb(){
    if (!window.firebase) await load(FB + 'firebase-app-compat.js');
    if (!firebase.database) await load(FB + 'firebase-database-compat.js');
    if (!firebase.apps.length) firebase.initializeApp(CFG);
    return firebase.database();
  }
  const norm = a => String(a || '').toLowerCase().trim().replace(/\s+/g, ' ');
  async function hash(u, a){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('eg1:' + u + ':' + norm(a)));
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  if (!document.getElementById('egr-style')){
    const st = document.createElement('style'); st.id = 'egr-style';
    st.textContent = '.egr-ov{position:fixed;inset:0;z-index:2000;background:rgba(5,18,15,.72);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Nunito,system-ui,sans-serif}'
      + '.egr-card{background:#fff;color:#17332d;border-radius:20px;padding:22px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.4)}'
      + '.egr-card h2{font-size:1.25rem;margin-bottom:8px}.egr-card p{font-size:.9rem;color:#5d7a72;line-height:1.5;margin-bottom:12px}'
      + '.egr-q{font-weight:700;color:#17332d;background:#e3f4f1;border-radius:10px;padding:10px 12px;margin-bottom:10px;word-break:break-word}'
      + '.egr-in{width:100%;border:1px solid #e6e0d1;border-radius:12px;padding:11px 13px;font:600 .95rem Nunito,system-ui,sans-serif;color:#17332d;margin-bottom:10px}'
      + '.egr-row{display:flex;gap:8px;margin-top:4px}.egr-btn{flex:1;border:1px solid #0f9d8e;background:#0f9d8e;color:#fff;font:700 .9rem Nunito,system-ui,sans-serif;padding:11px;border-radius:12px;cursor:pointer}'
      + '.egr-in::placeholder{font-size:.8rem}'
      + '.egr-btn.g{background:#fff;color:#0b7a6e}.egr-btn:disabled{opacity:.5}.egr-msg{min-height:1.3em;font-size:.84rem;color:#b3413a;margin-bottom:6px}.egr-msg.ok{color:#0b7a6e}';
    document.head.appendChild(st);
  }
  function modal(inner){
    const ov = document.createElement('div'); ov.className = 'egr-ov';
    const card = document.createElement('div'); card.className = 'egr-card'; card.innerHTML = inner;
    ov.appendChild(card); document.body.appendChild(ov);
    return { ov, $: s => card.querySelector(s), close: () => ov.remove() };
  }

  // Dipanggil saat pemain masuk menu: tawarkan membuat pertanyaan pemulihan kalau belum ada.
  async function ensure(u){
    if (!u || skipped || localStorage.getItem(KEY(u))) return;
    let db;
    try {
      db = await getDb();
      if ((await db.ref('recoveryHints/' + u).once('value')).exists()){ localStorage.setItem(KEY(u), '1'); return; }
    } catch (e) { return; }
    const m = modal('<h2>Amankan hadiahmu 🔐</h2><p>Hari perayaan masih lama. Buat satu pertanyaan pemulihan dari kamu sendiri, supaya kalau lupa kunci misi kamu tetap bisa klaim hadiah. Jangan pakai data yang terlalu pribadi.</p>'
      + '<input class="egr-in" id="egq" maxlength="80" placeholder="Pertanyaanmu (mis. nama kucing)" autocomplete="off">'
      + '<input class="egr-in" id="ega" maxlength="40" placeholder="Jawabanmu (min. 5 karakter)" autocomplete="off">'
      + '<div class="egr-msg" id="egm"></div><div class="egr-row"><button class="egr-btn g" id="egs">Nanti saja</button><button class="egr-btn" id="egv">Simpan</button></div>');
    const say = (t, ok) => { const e = m.$('#egm'); e.textContent = t; e.className = 'egr-msg' + (ok ? ' ok' : ''); };
    m.$('#egs').onclick = () => { skipped = true; m.close(); };
    m.$('#egv').onclick = async () => {
      const q = m.$('#egq').value.trim(), a = m.$('#ega').value;
      if (q.length < 3 || norm(a).length < 5){ say('Pertanyaan minimal 3 karakter dan jawaban minimal 5 karakter ya.'); return; }
      if (norm(a) === q.toLowerCase()){ say('Jawabannya jangan sama dengan pertanyaannya ya.'); return; }
      m.$('#egv').disabled = true;
      try {
        const h = await hash(u, a), at = Date.now(), up = {};
        up['recovery/' + h] = { username: u, at };
        up['recoveryHints/' + u] = { q, at };
        await db.ref().update(up);
        localStorage.setItem(KEY(u), '1'); say('Tersimpan. Ingat jawabanmu ya!', true);
        setTimeout(m.close, 1100);
      } catch (e) {
        if (String(e.code || e.message).toUpperCase().includes('PERMISSION')){ localStorage.setItem(KEY(u), '1'); say('Username ini sudah punya pertanyaan pemulihan.', true); setTimeout(m.close, 1400); }
        else { say('Belum bisa menyimpan. Coba lagi sebentar.'); m.$('#egv').disabled = false; }
      }
    };
  }

  // Dipakai halaman klaim: kembalikan hash bukti kalau jawabannya benar, atau null.
  async function ask(u){
    let db, q = null;
    try { db = await getDb(); const s = await db.ref('recoveryHints/' + u).once('value'); q = s.val() && s.val().q; } catch (e) {}
    return new Promise(resolve => {
      if (!q){
        const m = modal('<h2>Belum ada pemulihan</h2><p>Username ini belum punya pertanyaan pemulihan. Hubungi admin ya.</p><div class="egr-row"><button class="egr-btn" id="egx">Tutup</button></div>');
        m.$('#egx').onclick = () => { m.close(); resolve(null); }; return;
      }
      const m = modal('<h2>Pulihkan kunci misi</h2><div class="egr-q" id="egq"></div><input class="egr-in" id="ega" maxlength="40" placeholder="Jawabanmu" autocomplete="off"><div class="egr-msg" id="egm"></div><div class="egr-row"><button class="egr-btn g" id="egx">Batal</button><button class="egr-btn" id="egv">Pulihkan</button></div>');
      m.$('#egq').textContent = q;
      m.$('#egx').onclick = () => { m.close(); resolve(null); };
      m.$('#egv').onclick = async () => {
        m.$('#egv').disabled = true;
        try {
          const h = await hash(u, m.$('#ega').value);
          const s = await db.ref('recovery/' + h).once('value');
          if (s.exists() && s.val().username === u){ m.close(); resolve(h); return; }
          m.$('#egm').textContent = 'Jawabannya belum tepat.';
        } catch (e) { m.$('#egm').textContent = 'Belum bisa memeriksa. Coba lagi sebentar.'; }
        m.$('#egv').disabled = false;
      };
    });
  }

  window.EgRecovery = { ensure, ask, hash };
})();
