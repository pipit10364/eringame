/* Pengaturan jadwal bersama. Semua jam memakai WIB (+07:00).
   - TESTING_OPEN: true  = semua misi & game terbuka untuk semua orang (hanya untuk uji coba).
   - Mode admin: buka  index.html#admin  lalu masukkan sandi. Selama mode admin aktif di browser itu,
     semua misi, game, dan Prize terbuka kapan saja. Pemain biasa tetap mengikuti jadwal. */
/* SHA-256 sinkron (murni JS) untuk config.js */
function sha256hex(str){
  var K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  var H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var b=[],i,c;
  for(i=0;i<str.length;i++){c=str.charCodeAt(i);
    if(c<128)b.push(c);
    else if(c<2048)b.push(192|c>>6,128|c&63);
    else if(c>=0xd800&&c<0xdc00&&i+1<str.length){c=0x10000+((c&1023)<<10)+(str.charCodeAt(++i)&1023);b.push(240|c>>18,128|c>>12&63,128|c>>6&63,128|c&63);}
    else b.push(224|c>>12,128|c>>6&63,128|c&63);}
  var bl=b.length*8; b.push(128); while(b.length%64!==56)b.push(0);
  for(i=7;i>=0;i--)b.push(i>3?0:(bl>>>(i*8))&255);
  var w=new Array(64);
  for(var o=0;o<b.length;o+=64){
    for(i=0;i<16;i++)w[i]=(b[o+i*4]<<24)|(b[o+i*4+1]<<16)|(b[o+i*4+2]<<8)|b[o+i*4+3];
    for(i=16;i<64;i++){var s0=((w[i-15]>>>7)|(w[i-15]<<25))^((w[i-15]>>>18)|(w[i-15]<<14))^(w[i-15]>>>3);
      var s1=((w[i-2]>>>17)|(w[i-2]<<15))^((w[i-2]>>>19)|(w[i-2]<<13))^(w[i-2]>>>10);
      w[i]=(w[i-16]+s0+w[i-7]+s1)|0;}
    var a=H[0],bb=H[1],cc=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for(i=0;i<64;i++){
      var S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
      var ch=(e&f)^(~e&g);
      var t1=(h+S1+ch+K[i]+w[i])|0;
      var S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
      var mj=(a&bb)^(a&cc)^(bb&cc);
      var t2=(S0+mj)|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=cc;cc=bb;bb=a;a=(t1+t2)|0;}
    H[0]=(H[0]+a)|0;H[1]=(H[1]+bb)|0;H[2]=(H[2]+cc)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;}
  var out='';for(i=0;i<8;i++)out+=('00000000'+(H[i]>>>0).toString(16)).slice(-8);
  return out;
}

window.EG_CONFIG = {
  TESTING_OPEN: false,
  OPEN_AT: {
    photobooth: '2026-11-16T07:00:00+07:00',
    game1:      '2026-11-16T09:00:00+07:00',
    game2:      '2026-11-16T12:00:00+07:00',
    game3:      '2026-11-16T15:00:00+07:00',
    prize:      '2026-11-16T18:00:00+07:00'
  },
  // Verifikasi sandi admin: yang disimpan hanya hash dua lapis (sandinya tidak tertulis di mana pun).
  ADMIN_SALT: '377fe72131480d500df9fb43',
  ADMIN_HASH: 'c420414044b11e0e77f92f1e442b741ac1a89fd1e2eab271010da76b2360b8c5',
  _adminKey: 'eg_admin_v1',
  _derive: function(pw){
    var h = this.ADMIN_SALT + pw;
    for (var i = 0; i < 4000; i++) h = sha256hex(h + this.ADMIN_SALT);
    return h;
  },
  isAdmin: function(){
    try { var t = localStorage.getItem(this._adminKey); return !!t && sha256hex(t) === this.ADMIN_HASH; } catch (e) { return false; }
  },
  adminLogin: function(pw){
    var t = this._derive(String(pw || ''));
    if (sha256hex(t) !== this.ADMIN_HASH) return false;
    try { localStorage.setItem(this._adminKey, t); } catch (e) { return false; }
    return true;
  },
  adminLogout: function(){ try { localStorage.removeItem(this._adminKey); } catch (e) {} },
  // Untuk mengganti sandi: jalankan di Console browser  EG_CONFIG.makeAdminHash('sandi-baru')
  // lalu salin hasilnya ke ADMIN_HASH di atas.
  makeAdminHash: function(pw){ return sha256hex(this._derive(String(pw))); },
  bypass: function(){ return this.TESTING_OPEN || this.isAdmin(); },
  unlockDate: function(key){
    return this.bypass() ? new Date('2024-01-01T00:00:00+07:00') : new Date(this.OPEN_AT[key]);
  }
};

/* Lencana admin + jendela masuk admin (dipakai semua halaman yang memuat config.js) */
(function(){
  var C = window.EG_CONFIG;
  function css(){
    if (document.getElementById('eg-admin-css')) return;
    var s = document.createElement('style'); s.id = 'eg-admin-css';
    s.textContent = '.eg-admin-badge{position:fixed;top:5px;left:50%;transform:translateX(-50%);z-index:130;background:rgba(231,196,111,.95);color:#2a2105;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;padding:5px 10px;border-radius:999px;display:flex;gap:8px;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,.35)}.eg-admin-badge button{all:unset;cursor:pointer;text-decoration:underline;font-weight:700}'
      + '.eg-admin-link{position:fixed;top:6px;left:50%;transform:translateX(-50%);z-index:130;background:rgba(7,22,19,.55);color:#9db8ab;border:1px solid rgba(126,224,181,.2);font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.06em;padding:5px 10px;border-radius:999px;cursor:pointer;opacity:.7}.eg-admin-link:hover{opacity:1;color:#e7c46f;border-color:#e7c46f}'
      + '.eg-admin-ov{position:fixed;inset:0;z-index:300;background:rgba(3,12,10,.78);display:flex;align-items:center;justify-content:center;padding:20px}.eg-admin-card{background:#0f221e;border:1px solid #5b4d27;border-radius:10px;padding:22px;max-width:360px;width:100%;color:#e8f3ec;font-family:system-ui,sans-serif}.eg-admin-card h2{font-size:1.1rem;margin:0 0 6px}.eg-admin-card p{margin:0 0 12px;color:#9db8ab;font-size:.85rem}.eg-admin-card input{width:100%;box-sizing:border-box;background:#071613;border:1px solid #2c4a42;border-radius:6px;padding:11px 12px;color:#fff;font:1rem ui-monospace,Menlo,monospace}.eg-admin-card .r{display:flex;gap:8px;margin-top:12px}.eg-admin-card button{flex:1;border-radius:6px;padding:10px;font-weight:700;cursor:pointer;border:1px solid #5b4d27;background:#e7c46f;color:#2a2105}.eg-admin-card button.g{background:transparent;color:#cfe9dc;border-color:#2c4a42}.eg-admin-msg{min-height:1.2em;margin-top:8px;font-size:.82rem;color:#e8827a}';
    document.head.appendChild(s);
  }
  C.promptAdmin = function(){
    css();
    if (document.getElementById('eg-admin-ov')) return;
    var o = document.createElement('div'); o.className = 'eg-admin-ov'; o.id = 'eg-admin-ov';
    o.innerHTML = '<div class="eg-admin-card"><h2>Mode admin</h2><p>Masukkan sandi admin untuk membuka semua misi dan game kapan saja.</p><input type="password" id="eg-admin-pw" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Sandi"><div class="eg-admin-msg" id="eg-admin-msg"></div><div class="r"><button class="g" id="eg-admin-cancel" type="button">Batal</button><button id="eg-admin-go" type="button">Masuk</button></div></div>';
    document.body.appendChild(o);
    var pw = o.querySelector('#eg-admin-pw'), msg = o.querySelector('#eg-admin-msg'), fails = 0, lockedUntil = 0;
    function close(){ o.remove(); if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search); }
    function go(){
      var now = Date.now();
      if (now < lockedUntil){ msg.textContent = 'Terlalu banyak percobaan. Tunggu sebentar.'; return; }
      msg.textContent = 'Memeriksa...';
      setTimeout(function(){
        if (C.adminLogin(pw.value)){ msg.style.color = '#7ee0b5'; msg.textContent = 'Berhasil. Memuat ulang...'; setTimeout(function(){ close(); location.reload(); }, 500); }
        else { fails++; pw.value = ''; msg.style.color = '#e8827a'; msg.textContent = 'Sandi salah.'; if (fails >= 5){ lockedUntil = Date.now() + 30000; fails = 0; } }
      }, 30);
    }
    o.querySelector('#eg-admin-go').onclick = go;
    o.querySelector('#eg-admin-cancel').onclick = close;
    pw.addEventListener('keydown', function(e){ if (e.key === 'Enter') go(); });
    setTimeout(function(){ pw.focus(); }, 50);
  };
  function ready(){
    if (C.isAdmin()){
      css();
      var b = document.createElement('div'); b.className = 'eg-admin-badge';
      b.innerHTML = '<span>ADMIN</span><button type="button">keluar</button>';
      b.querySelector('button').onclick = function(){ C.adminLogout(); location.reload(); };
      document.body.appendChild(b);
    } else {
      // tombol kecil "🔑 admin" di atas layar: ketuk, lalu ketik sandi (tanpa perlu mengetik alamat khusus)
      css();
      var a = document.createElement('button'); a.type = 'button'; a.className = 'eg-admin-link'; a.textContent = '🔑 admin';
      a.onclick = function(){ C.promptAdmin(); };
      document.body.appendChild(a);
    }
    if (location.hash === '#admin' && !C.isAdmin()) C.promptAdmin();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  window.addEventListener('hashchange', function(){ if (location.hash === '#admin' && !C.isAdmin()) C.promptAdmin(); });
})();
