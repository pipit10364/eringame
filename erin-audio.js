/* erin-audio.js: suara, musik latar, dan getar untuk semua game.
   - Klip suara Erin: assets/sfx/*.mp3
   - Musik latar: assets/music/*.mp3 (opening, closing, waiting-1/2/3/photobooth, museum, arena, vault).
     File yang tidak ada dilewati begitu saja (game tetap jalan tanpa musik).
   - Efek cling/buzz/dll dibuat langsung oleh browser (tanpa file).
   - Tombol 🔊/🔇 di pojok kanan atas; pilihannya diingat di browser. */
(function (w) {
  'use strict';
  var MUTE_KEY = 'eg_sound_muted_v1';
  var SFX_BASE = 'assets/sfx/', MUSIC_BASE = 'assets/music/';
  var MUSIC_VOL = 0.5;        // volume musik latar (0 sampai 1). Semua lagu sudah disamakan ke ±-17 LUFS
  var VOICE_COOLDOWN = 7000;  // jeda minimal antar suara Erin (ms)
  var VOICE = {
    start:  ['let-me-cook'],
    right:  ['got-first', 'safe'],
    wrong:  ['if-wrong', 'cant-stop'],
    streak: ['are-you-serious'],   // salah 3x berturut-turut
    idk:    ['kalo-ga-tau'],
    shy:    ['ssh'],
    win:    ['omg-enthusiastic'],
    prize:  ['omg']
  };

  var ctx = null, master, sfxBus, voiceBus, musicDuck, musicBus, noiseBuf;
  var muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}
  var buffers = {}, pending = {};
  var lastVoiceAt = 0, lastVoiceName = '', wrongStreak = 0;
  var musicCur = null, musicName = null, musicFailed = {}, pendingMusic = null, schedToken = 0, posTimer = null;
  var POS_KEY = 'eg_music_pos_v1';

  function ensure() {
    if (!ctx) {
      var AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
      voiceBus = ctx.createGain(); voiceBus.gain.value = 1; voiceBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = MUSIC_VOL; musicBus.connect(master);
      musicDuck = ctx.createGain(); musicDuck.gain.value = 1; musicDuck.connect(musicBus);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      Object.keys(VOICE).forEach(function (g) { VOICE[g].forEach(load); });
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  function decode(ab) {
    return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); });
  }
  function load(name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (pending[name]) return pending[name];
    pending[name] = fetch(SFX_BASE + name + '.mp3')
      .then(function (r) { if (!r.ok) throw new Error('404'); return r.arrayBuffer(); })
      .then(decode)
      .then(function (b) { buffers[name] = b; return b; })
      .catch(function () { pending[name] = null; return null; });
    return pending[name];
  }

  // ---------- suara Erin ----------
  function voice(group, o) {
    o = o || {};
    if (muted || !ensure()) return false;
    var now = Date.now();
    if (!o.force && now - lastVoiceAt < VOICE_COOLDOWN) return false;
    if (o.chance != null && Math.random() > o.chance) return false;
    var list = VOICE[group]; if (!list) return false;
    var pool = list.filter(function (n) { return n !== lastVoiceName; });
    if (!pool.length) pool = list;
    var name = pool[Math.floor(Math.random() * pool.length)];
    lastVoiceAt = now; lastVoiceName = name;
    load(name).then(function (buf) {
      if (!buf || muted) return;
      var s = ctx.createBufferSource(); s.buffer = buf; s.connect(voiceBus); s.start();
      duck(buf.duration);
    });
    return true;
  }
  function duck(sec) {
    if (!musicDuck) return;
    var t = ctx.currentTime;
    musicDuck.gain.cancelScheduledValues(t);
    musicDuck.gain.setTargetAtTime(0.35, t, 0.05);
    musicDuck.gain.setTargetAtTime(1, t + sec + 0.15, 0.3);
  }

  // ---------- efek buatan (tanpa file) ----------
  function tone(freq, at, dur, type, gain, slideTo) {
    var t = ctx.currentTime + (at || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(at, dur, gain, f0, f1) {
    var t = ctx.currentTime + (at || 0);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.05);
  }
  function sfx(fn) { if (muted || !ensure()) return; fn(); }
  function haptic(p) { if (muted) return; try { if (w.navigator && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  var FX = {
    cling:  function () { tone(1318.5, 0, 0.55, 'sine', 0.22); tone(1975.5, 0.02, 0.45, 'sine', 0.14); tone(2637, 0.04, 0.3, 'sine', 0.07); },
    buzz:   function () { tone(150, 0, 0.22, 'sawtooth', 0.16, 105); tone(158, 0, 0.22, 'square', 0.07, 110); },
    nope:   function () { tone(240, 0, 0.14, 'triangle', 0.14, 170); },
    tick:   function () { tone(1250, 0, 0.04, 'square', 0.05); },
    key:    function () { tone(1700, 0, 0.025, 'square', 0.025); },
    tap:    function () { tone(820, 0, 0.06, 'triangle', 0.10, 620); },
    pop:    function () { tone(520, 0, 0.1, 'sine', 0.16, 820); },
    rotate: function () { tone(700, 0, 0.05, 'triangle', 0.10, 480); tone(1400, 0, 0.02, 'square', 0.03); },
    lock:   function () { tone(300, 0, 0.09, 'triangle', 0.2, 190); tone(1000, 0.05, 0.05, 'square', 0.05); },
    door:   function () { tone(110, 0, 0.25, 'triangle', 0.22, 70); [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, 0.08 + i * 0.075, 0.35, 'sine', 0.14); }); },
    whoosh: function () { noise(0, 0.38, 0.16, 400, 2600); },
    fanfare: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { tone(f, i * 0.09, 0.3, 'triangle', 0.16); });
      [1046.5, 1318.5, 1568].forEach(function (f) { tone(f, 0.42, 0.9, 'sine', 0.12); });
      tone(2093, 0.55, 0.5, 'sine', 0.05); tone(2637, 0.65, 0.5, 'sine', 0.04);
    },
    chime:  function () { tone(784, 0, 0.35, 'sine', 0.14); tone(1046.5, 0.12, 0.5, 'sine', 0.12); }
  };
  var NOTES = { red: 261.63, blue: 329.63, green: 392.0, yellow: 523.25 };

  // ---------- musik latar (di-stream, hemat memori) ----------
  function readPos() { try { return JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch (e) { return null; } }
  function savePos() {
    if (!musicCur || !musicCur.el || musicCur.el.paused) return;
    try { localStorage.setItem(POS_KEY, JSON.stringify({ name: musicCur.name, t: musicCur.el.currentTime, at: Date.now() })); } catch (e) {}
  }
  function music(name) {
    schedToken++;                       // batalkan jadwal musik yang belum jalan
    if (musicFailed[name]) return;
    if (musicName === name) return;     // sudah main / sedang disiapkan
    if (!ensure()) return;
    startMusic(name);
  }
  function scheduleMusic(name, delay) {
    var tok = ++schedToken;
    setTimeout(function () { if (tok === schedToken) music(name); }, delay);
  }
  function startMusic(name) {
    killMusic(0.5);
    musicName = name;
    var a = new Audio();
    a.loop = true; a.preload = 'auto';
    a.src = MUSIC_BASE + name + '.mp3';
    var node = ctx.createMediaElementSource(a);
    var g = ctx.createGain(); g.gain.value = 0.0001;
    node.connect(g); g.connect(musicDuck);
    var cur = { el: a, node: node, gain: g, name: name };
    musicCur = cur;
    a.addEventListener('error', function () {
      musicFailed[name] = true;
      if (musicCur === cur) { musicCur = null; musicName = null; }
      if (pendingMusic === cur) { pendingMusic = null; hideHint(); }
      dispose(cur);
    });
    a.addEventListener('loadedmetadata', function () {
      var sp = readPos();
      if (sp && sp.name === name && Date.now() - sp.at < 20 * 60 * 1000 && a.duration > 5) { try { a.currentTime = sp.t % a.duration; } catch (e) {} }
    });
    a.addEventListener('playing', function () {
      if (pendingMusic === cur) { pendingMusic = null; hideHint(); }
      var t = ctx.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 1.8);
    });
    var p = a.play();
    if (p && p.catch) p.catch(function () { if (musicCur === cur) { pendingMusic = cur; showHint(); } });
    if (!posTimer) posTimer = setInterval(savePos, 2000);
  }
  function dispose(cur) {
    try { cur.el.pause(); cur.el.removeAttribute('src'); cur.el.load(); } catch (e) {}
    try { cur.node.disconnect(); cur.gain.disconnect(); } catch (e) {}
  }
  function killMusic(sec) {
    var cur = musicCur; musicCur = null; musicName = null;
    if (pendingMusic === cur) { pendingMusic = null; hideHint(); }
    if (!cur || !ctx) return;
    var t = ctx.currentTime;
    cur.gain.gain.cancelScheduledValues(t);
    cur.gain.gain.setValueAtTime(Math.max(cur.gain.gain.value, 0.0001), t);
    cur.gain.gain.linearRampToValueAtTime(0.0001, t + sec);
    setTimeout(function () { dispose(cur); }, sec * 1000 + 100);
  }
  function stopMusic(sec) { schedToken++; savePos(); killMusic(sec || 1.2); }

  // petunjuk "ketuk layar" (browser memblokir suara otomatis sebelum ada ketukan)
  function showHint() {
    if (muted || document.getElementById('eg-music-hint') || !document.body) return;
    var d = document.createElement('div');
    d.id = 'eg-music-hint'; d.textContent = '🎵 Ketuk layar untuk menyalakan musik';
    d.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:120;background:rgba(7,22,19,.88);color:#cfe9dc;border:1px solid rgba(126,224,181,.35);border-radius:999px;padding:9px 16px;font:600 .8rem system-ui,sans-serif;pointer-events:none;max-width:90vw;text-align:center';
    document.body.appendChild(d);
  }
  function hideHint() { var d = document.getElementById('eg-music-hint'); if (d) d.remove(); }
  function onGesture() {
    ensure();
    if (musicCur && musicCur.el.paused) { musicCur.el.play().catch(function () {}); }
  }

  // ---------- tombol bisu ----------
  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
    if (muted) { try { navigator.vibrate && navigator.vibrate(0); } catch (e) {} }
    renderBtn();
    if (muted) hideHint();
    try { w.dispatchEvent(new CustomEvent('eg-sound-change', { detail: { muted: muted } })); } catch (e) {}
  }
  function renderBtn() {
    var b = document.getElementById('eg-sound-btn'); if (!b) return;
    b.textContent = muted ? '🔇' : '🔊';
    b.setAttribute('aria-label', muted ? 'Suara dan getar mati. Ketuk untuk menyalakan' : 'Suara dan getar nyala. Ketuk untuk mematikan');
    b.title = muted ? 'Nyalakan suara' : 'Matikan suara';
  }
  function mountBtn() {
    if (document.getElementById('eg-sound-btn') || !document.body) return;
    var css = document.createElement('style');
    css.textContent = '.eg-sound-btn{position:fixed;top:14px;right:14px;z-index:110;width:40px;height:40px;border-radius:8px;border:1px solid rgba(126,224,181,.28);background:rgba(7,22,19,.8);color:#cfe9dc;font-size:1.05rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;padding:0}.eg-sound-btn:hover{border-color:rgba(126,224,181,.65)}';
    document.head.appendChild(css);
    var b = document.createElement('button');
    b.id = 'eg-sound-btn'; b.className = 'eg-sound-btn'; b.type = 'button';
    b.onclick = function () { var was = muted; ensure(); setMuted(!was); if (was) { FX.tap(); } };
    document.body.appendChild(b);
    renderBtn();
  }
  if (!w.EG_NO_SOUND_BTN) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBtn); else mountBtn(); }
  w.addEventListener('pagehide', savePos);

  // buka kunci audio di ketukan pertama (aturan browser)
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(function (ev) {
    w.addEventListener(ev, onGesture, true);
  });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) {
      savePos();
      if (musicCur) { try { musicCur.el.pause(); } catch (e) {} }
      try { ctx.suspend(); } catch (e) {}
    } else {
      try { ctx.resume(); } catch (e) {}
      if (musicCur) { musicCur.el.play().catch(function () {}); }
    }
  });

  // ---------- API ----------
  w.EgAudio = {
    isMuted: function () { return muted; },
    showButton: mountBtn,
    setMuted: setMuted,
    music: music, stopMusic: stopMusic,
    start: function (musicName) { sfx(FX.whoosh); haptic(20); voice('start', { force: true }); if (musicName) scheduleMusic(musicName, 500); else schedToken++; },
    right: function (o) { sfx(FX.cling); haptic(25); wrongStreak = 0; voice('right', { chance: (o && o.chance != null) ? o.chance : 0.5 }); },
    found: function () { this.right({ chance: 0.35 }); },
    wrong: function (o) {
      o = o || {};
      sfx(FX.buzz); haptic([70, 50, 70]);
      wrongStreak++;
      if (o.voice === false) return;
      if (wrongStreak >= 3) { if (voice('streak', { force: true })) wrongStreak = 0; }
      else if (o.voice) voice(o.voice, { force: true });
      else voice('wrong', { chance: 0.6 });
    },
    shy: function () { sfx(FX.tick); voice('shy', { force: true }); },
    win: function () { stopMusic(1); sfx(FX.fanfare); haptic([40, 40, 40, 40, 140]); setTimeout(function () { voice('win', { force: true }); }, 350); scheduleMusic('closing', 3200); },
    finish: function () { stopMusic(1); sfx(FX.chime); scheduleMusic('closing', 1800); },
    prize: function () { stopMusic(1); sfx(FX.fanfare); haptic([40, 40, 40, 40, 160]); setTimeout(function () { voice('prize', { force: true }); }, 300); },
    door: function () { sfx(FX.door); haptic([30, 30, 70]); },
    cling: function () { sfx(FX.cling); haptic(20); },
    nope: function () { sfx(FX.nope); },
    tap: function () { sfx(FX.tap); },
    tick: function () { sfx(FX.tick); },
    key: function () { sfx(FX.key); },
    pop: function () { sfx(FX.pop); },
    lock: function () { sfx(FX.lock); haptic(25); },
    rotate: function () { sfx(FX.rotate); },
    whoosh: function () { sfx(FX.whoosh); },
    note: function (color) { sfx(function () { tone(NOTES[color] || 440, 0, 0.3, 'triangle', 0.2); }); },
    _debug: function () { return { loaded: Object.keys(buffers), state: ctx && ctx.state, muted: muted, music: musicName, playing: !!(musicCur && !musicCur.el.paused), t: musicCur ? musicCur.el.currentTime : 0, pending: !!pendingMusic, failed: Object.keys(musicFailed) }; }
  };
})(window);
