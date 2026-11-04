/* Layar penuh + kunci orientasi (HP/tablet). Di iPhone Safari Fullscreen API tidak ada:
   di sana layar penuh hanya jalan lewat "Add to Home Screen" (lihat manifest + meta apple-mobile-web-app-capable). */
(function(){
  if (window.top !== window) return;                       // jangan aktif di dalam iframe (overlay hadiah)
  var coarse = matchMedia('(pointer:coarse)').matches;
  var installed = matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function lock(o){ try { screen.orientation && screen.orientation.lock && screen.orientation.lock(o).catch(function(){}); } catch(e){} }
  var EgFS = window.EgFS = {
    enter: function(orient){
      if (!coarse) return;
      if (installed || document.fullscreenElement){ if (orient) lock(orient); return; }
      var el = document.documentElement, rf = el.requestFullscreen || el.webkitRequestFullscreen; if (!rf) return;
      try { var p = rf.call(el, { navigationUI:'hide' }); if (p && p.then) p.then(function(){ if (orient) lock(orient); }).catch(function(){}); } catch(e){}
    },
    unlock: function(){ try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch(e){} }
  };
  if (coarse && !installed){ var tryFs = function(){ if (document.fullscreenElement || document.webkitFullscreenElement){ document.removeEventListener('pointerup', tryFs); return; } EgFS.enter(); }; document.addEventListener('pointerup', tryFs); }
})();
